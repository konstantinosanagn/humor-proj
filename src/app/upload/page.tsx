"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const API_BASE = "https://api.almostcrackd.ai";
const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic"];

type Status = "idle" | "uploading" | "registering" | "generating" | "done" | "error";
type CaptionRecord = { id: string; content: string; [key: string]: unknown };

export default function UploadPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [captions, setCaptions] = useState<CaptionRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setAccessToken(session.access_token);
    }
    checkAuth();
  }, [router]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && !ACCEPTED_TYPES.includes(selected.type)) {
      setErrorMessage(`Unsupported file type: ${selected.type}`);
      return;
    }
    setFile(selected);
    setErrorMessage(null);
    setCaptions([]);
    setStatus("idle");
    if (preview) URL.revokeObjectURL(preview);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }, [preview]);

  const handleUpload = useCallback(async () => {
    if (!file || !accessToken) return;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      // Step 1: Generate presigned URL
      setStatus("uploading");
      setErrorMessage(null);

      const presignedRes = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!presignedRes.ok) throw new Error(`Presigned URL failed: ${presignedRes.status} ${await presignedRes.text()}`);
      const { presignedUrl, cdnUrl } = await presignedRes.json();

      // Step 2: Upload image bytes
      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

      // Step 3: Register image URL
      setStatus("registering");
      const registerRes = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      });
      if (!registerRes.ok) throw new Error(`Register failed: ${registerRes.status} ${await registerRes.text()}`);
      const { imageId } = await registerRes.json();

      // Step 4: Generate captions
      setStatus("generating");
      const captionRes = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: "POST",
        headers,
        body: JSON.stringify({ imageId }),
      });
      if (!captionRes.ok) throw new Error(`Caption generation failed: ${captionRes.status} ${await captionRes.text()}`);
      const captionData = await captionRes.json();

      setCaptions(Array.isArray(captionData) ? captionData : []);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }, [file, accessToken]);

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl text-gray-500">Loading…</p>
      </div>
    );
  }

  const statusLabels: Record<Status, string> = {
    idle: "",
    uploading: "Uploading image…",
    registering: "Registering image…",
    generating: "Generating captions…",
    done: "Captions generated!",
    error: "Something went wrong",
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors no-underline"
          >
            ← Back to voting
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Upload Image</h1>
        </div>

        {/* File picker */}
        <div className="mb-6">
          <input
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-900 file:text-white hover:file:bg-gray-800 file:cursor-pointer"
          />
        </div>

        {/* Image preview */}
        {preview && (
          <div className="mb-6">
            <img
              src={preview}
              alt="Preview"
              className="max-w-full max-h-96 rounded-lg object-contain mx-auto"
            />
          </div>
        )}

        {/* Upload button */}
        {file && status === "idle" && (
          <button
            onClick={handleUpload}
            className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Upload & Generate Captions
          </button>
        )}

        {/* Progress indicator */}
        {status !== "idle" && status !== "done" && status !== "error" && (
          <div className="text-center py-4">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mb-2" />
            <p className="text-gray-600">{statusLabels[status]}</p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700 text-sm">{errorMessage}</p>
            <button
              onClick={handleUpload}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Generated captions */}
        {status === "done" && captions.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Generated Captions</h2>
            <ul className="space-y-3">
              {captions.map((caption, i) => (
                <li
                  key={caption.id ?? i}
                  className="bg-gray-50 rounded-lg p-4 text-gray-800"
                >
                  {caption.content ?? JSON.stringify(caption)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {status === "done" && captions.length === 0 && (
          <p className="text-center text-gray-500 mt-6">No captions were generated.</p>
        )}
      </div>
    </div>
  );
}

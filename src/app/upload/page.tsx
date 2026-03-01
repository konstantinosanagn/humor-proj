"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lexend_Mega } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const lexendMega = Lexend_Mega({ subsets: ["latin"] });

const API_BASE = "https://api.almostcrackd.ai";
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
];

type Status = "idle" | "uploading" | "registering" | "generating" | "done" | "error";
type CaptionRecord = { id: string; content: string; [key: string]: unknown };

function SmokeText({ text }: { text: string }): React.ReactElement | null {
  if (!text) return null;
  const words = text.split(/\s+/);
  let charIndex = 0;
  return (
    <>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="inline-block">
            {word.split("").map((char) => {
              const i = charIndex++;
              return (
                <span
                  key={i}
                  className="smoke-char"
                  style={{ "--char-index": i } as React.CSSProperties}
                >
                  {char}
                </span>
              );
            })}
          </span>
          {wi < words.length - 1 && " "}
        </Fragment>
      ))}
    </>
  );
}

function UploadIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-10 h-10"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function Cell({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={className}>{children}</div>;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "url">("file");
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [captions, setCaptions] = useState<CaptionRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Whether we have a colorful blurred backdrop (image selected) or plain light bg
  const hasImage = !!preview;

  // Dynamic color tokens based on backdrop
  const pill = hasImage ? "glass-pill" : "glass-pill-dark";
  const txt = {
    heading: hasImage ? "text-white/90" : "text-gray-900",
    body: hasImage ? "text-white/80" : "text-gray-700",
    muted: hasImage ? "text-white/50" : "text-gray-400",
    faint: hasImage ? "text-white/35" : "text-gray-300",
    nav: hasImage ? "text-white/80" : "text-gray-600",
    caption: hasImage ? "text-white/90" : "text-gray-900",
    error: hasImage ? "text-red-400/90" : "text-red-600",
    dotActive: hasImage ? "bg-white/70" : "bg-gray-700",
    dotInactive: hasImage ? "bg-white/20" : "bg-gray-300",
    stepActive: hasImage ? "text-white/70" : "text-gray-600",
    stepInactive: hasImage ? "text-white/30" : "text-gray-300",
    spinnerTrack: hasImage ? "border-white/20" : "border-gray-200",
    spinnerHead: hasImage ? "border-t-white/80" : "border-t-gray-700",
    avatarText: hasImage ? "text-white/90" : "text-gray-700",
    avatarBg: hasImage ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.08)",
    uploadIcon: hasImage ? "text-white/50" : "text-gray-400",
    zoneBorder: hasImage
      ? "border-white/30 hover:border-white/50"
      : "border-gray-300 hover:border-gray-400",
    errorBorder: hasImage ? "border-red-300/30" : "border-red-200",
  };

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setAccessToken(session.access_token);
      setUserEmail(session.user?.email ?? null);
    }
    checkAuth();
  }, [router]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
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
    },
    [preview]
  );

  const handleUpload = useCallback(async () => {
    if (!file || !accessToken) return;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      setStatus("uploading");
      setErrorMessage(null);

      const presignedRes = await fetch(
        `${API_BASE}/pipeline/generate-presigned-url`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ contentType: file.type }),
        }
      );
      if (!presignedRes.ok)
        throw new Error(
          `Presigned URL failed: ${presignedRes.status} ${await presignedRes.text()}`
        );
      const { presignedUrl, cdnUrl } = await presignedRes.json();

      const uploadRes = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok)
        throw new Error(`Upload failed: ${uploadRes.status}`);

      setStatus("registering");
      const registerRes = await fetch(
        `${API_BASE}/pipeline/upload-image-from-url`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
        }
      );
      if (!registerRes.ok)
        throw new Error(
          `Register failed: ${registerRes.status} ${await registerRes.text()}`
        );
      const { imageId } = await registerRes.json();

      setStatus("generating");
      const captionRes = await fetch(
        `${API_BASE}/pipeline/generate-captions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ imageId }),
        }
      );
      if (!captionRes.ok)
        throw new Error(
          `Caption generation failed: ${captionRes.status} ${await captionRes.text()}`
        );
      const captionData = await captionRes.json();

      setCaptions(Array.isArray(captionData) ? captionData : []);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }, [file, accessToken]);

  const handleUrlSubmit = useCallback(async () => {
    if (!imageUrl.trim() || !accessToken) return;

    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      setStatus("registering");
      setErrorMessage(null);
      setPreview(imageUrl.trim());

      const registerRes = await fetch(
        `${API_BASE}/pipeline/upload-image-from-url`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ imageUrl: imageUrl.trim(), isCommonUse: false }),
        }
      );
      if (!registerRes.ok)
        throw new Error(
          `Register failed: ${registerRes.status} ${await registerRes.text()}`
        );
      const { imageId } = await registerRes.json();

      setStatus("generating");
      const captionRes = await fetch(
        `${API_BASE}/pipeline/generate-captions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ imageId }),
        }
      );
      if (!captionRes.ok)
        throw new Error(
          `Caption generation failed: ${captionRes.status} ${await captionRes.text()}`
        );
      const captionData = await captionRes.json();

      setCaptions(Array.isArray(captionData) ? captionData : []);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
  }, [imageUrl, accessToken]);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  const handleReset = useCallback(() => {
    if (preview && file) URL.revokeObjectURL(preview);
    setFile(null);
    setImageUrl("");
    setInputMode("file");
    setPreview(null);
    setCaptions([]);
    setStatus("idle");
    setErrorMessage(null);
  }, [preview, file]);

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="featuredBg">
          <div className="featuredBgOverlay" />
        </div>
        <p className="relative z-10 text-xl text-gray-400">Loading…</p>
      </div>
    );
  }

  const isProcessing =
    status === "uploading" || status === "registering" || status === "generating";

  const statusLabels: Record<Status, string> = {
    idle: "",
    uploading: "Uploading image…",
    registering: "Registering image…",
    generating: "Generating captions…",
    done: "Captions generated!",
    error: "Something went wrong",
  };

  const stepIndex =
    status === "uploading" ? 0 : status === "registering" ? 1 : status === "generating" ? 2 : -1;

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Blurred ambient background */}
      <div className="featuredBg">
        {preview && (
          <img
            src={preview}
            alt=""
            aria-hidden="true"
            className="featuredBgImage"
          />
        )}
        <div className="featuredBgOverlay" />
      </div>

      {/* Sign-out pill */}
      <button
        onClick={handleSignOut}
        className={`${pill} fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-5 py-2.5 cursor-pointer`}
      >
        <span
          className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold tracking-wide ${txt.avatarText}`}
          style={{ background: txt.avatarBg }}
        >
          {(userEmail?.[0] ?? "?").toUpperCase()}
        </span>
        <span className={`text-sm font-medium ${txt.nav}`}>Sign out</span>
      </button>

      {/* Grid layout — same structure as homepage */}
      <div className="relative z-10 grid grid-cols-1 grid-rows-[auto_auto_auto] min-h-screen lg:grid-cols-[5rem_2fr_3fr_5rem] lg:grid-rows-[5rem_1fr_5rem]">
        {/* Spacer cells — desktop only */}
        <Cell className="hidden lg:block lg:col-start-1 lg:row-start-1" />
        <Cell className="hidden lg:block lg:col-start-4 lg:row-start-1" />
        <Cell className="hidden lg:block lg:col-start-1 lg:row-start-2" />
        <Cell className="hidden lg:block lg:col-start-4 lg:row-start-2" />
        <Cell className="hidden lg:block lg:col-start-1 lg:row-start-3" />
        <Cell className="hidden lg:block lg:col-start-2 lg:col-span-2 lg:row-start-3" />
        <Cell className="hidden lg:block lg:col-start-4 lg:row-start-3" />

        {/* Nav — top row */}
        <Cell className="flex items-center justify-center gap-3 px-4 py-4 lg:col-start-2 lg:col-span-2 lg:row-start-1 lg:justify-start">
          <Link
            href="/"
            className={`${pill} inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium ${txt.nav} no-underline`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            Back to voting
          </Link>
          <Link
            href="/list"
            className={`${pill} inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium ${txt.nav} no-underline`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.38l3.59 3.58a.75.75 0 11-1.06 1.06l-3.58-3.59A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            Explore Supabase
          </Link>
        </Cell>

        {/* Left column — toggle + image preview / upload zone / URL input */}
        <Cell className="flex flex-col items-center justify-center overflow-hidden p-4 gap-4 lg:col-start-2 lg:row-start-2">
          {/* Mode toggle — only shown when idle and nothing selected */}
          {!preview && status === "idle" && (
            <div className={`${pill} inline-flex rounded-full p-1 gap-0`}>
              <button
                onClick={() => setInputMode("file")}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                  inputMode === "file"
                    ? hasImage ? "bg-white/20 text-white/90" : "bg-black/10 text-gray-900"
                    : `${txt.muted}`
                }`}
              >
                File
              </button>
              <button
                onClick={() => setInputMode("url")}
                className={`rounded-full px-5 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                  inputMode === "url"
                    ? hasImage ? "bg-white/20 text-white/90" : "bg-black/10 text-gray-900"
                    : `${txt.muted}`
                }`}
              >
                URL
              </button>
            </div>
          )}

          <div className="relative w-full max-w-[min(100vw,450px)] aspect-square flex items-center justify-center overflow-hidden lg:w-[450px] lg:h-[450px] lg:max-w-none lg:aspect-auto">
            {preview ? (
              <img
                src={preview}
                alt="Selected image preview"
                className="object-contain w-full h-full rounded-2xl"
              />
            ) : inputMode === "file" ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`${pill} w-full h-full rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer border-2 border-dashed ${txt.zoneBorder} transition-all`}
              >
                <div className={txt.uploadIcon}>
                  <UploadIcon />
                </div>
                <p className={`${txt.muted} text-sm font-medium`}>
                  Choose an image
                </p>
                <p className={`${txt.faint} text-xs`}>
                  JPEG, PNG, WebP, GIF, HEIC
                </p>
              </button>
            ) : (
              <div
                className={`${pill} w-full h-full rounded-2xl flex flex-col items-center justify-center gap-6 border-2 border-dashed ${txt.zoneBorder}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`w-10 h-10 ${txt.uploadIcon}`}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <div className="flex flex-col items-center gap-3 w-full px-6">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => { setImageUrl(e.target.value); setPreview(e.target.value.trim() || null); }}
                    placeholder="https://example.com/image.jpg"
                    className={`${pill} w-full rounded-full px-5 py-2.5 text-sm ${txt.body} outline-none text-center`}
                  />
                  <p className={`${txt.faint} text-xs`}>
                    Paste an image URL
                  </p>
                </div>
              </div>
            )}
          </div>
        </Cell>

        {/* Right column — controls + captions */}
        <Cell
          className={`overflow-hidden p-0 flex flex-col items-center justify-center px-4 pb-8 pt-2 lg:col-start-3 lg:row-start-2 lg:justify-center lg:pb-0 lg:pt-0 ${lexendMega.className}`}
        >
          <div className="flex flex-col items-center justify-center text-center w-full max-w-[600px]">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Idle — no file or URL yet */}
            {!file && !imageUrl.trim() && status === "idle" && (
              <div className="flex flex-col items-center gap-3">
                <h1 className={`text-3xl font-semibold ${txt.heading} leading-snug sm:text-4xl lg:text-5xl`}>
                  Upload an image
                </h1>
                <p className={`text-base ${txt.muted} mt-1`}>
                  Select a file or paste an image link
                </p>
              </div>
            )}

            {/* Idle — file selected, ready to upload */}
            {file && status === "idle" && (
              <div className="flex flex-col items-center gap-5 w-full px-4">
                <p className={`text-lg font-medium ${txt.body} truncate max-w-full`}>
                  {file.name}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    className={`${pill} rounded-full px-8 py-3 text-sm font-semibold ${txt.heading} cursor-pointer`}
                  >
                    Upload & Generate Captions
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className={`${pill} rounded-full px-6 py-3 text-sm font-medium ${txt.muted} cursor-pointer`}
                  >
                    Change
                  </button>
                </div>
              </div>
            )}

            {/* Idle — URL entered, ready to submit */}
            {!file && imageUrl.trim() && status === "idle" && (
              <div className="flex flex-col items-center gap-5 w-full px-4">
                <p className={`text-sm font-medium ${txt.body} truncate max-w-full`}>
                  {imageUrl.trim()}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleUrlSubmit}
                    className={`${pill} rounded-full px-8 py-3 text-sm font-semibold ${txt.heading} cursor-pointer`}
                  >
                    Generate Captions
                  </button>
                  <button
                    onClick={() => { setImageUrl(""); setPreview(null); }}
                    className={`${pill} rounded-full px-6 py-3 text-sm font-medium ${txt.muted} cursor-pointer`}
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Processing — pipeline in progress */}
            {isProcessing && (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-8 h-8">
                  <div className={`absolute inset-0 border-2 ${txt.spinnerTrack} rounded-full`} />
                  <div className={`absolute inset-0 border-2 ${txt.spinnerHead} rounded-full animate-spin`} />
                </div>
                <p className={`text-xl font-semibold ${txt.body}`}>
                  {statusLabels[status]}
                </p>
                {/* Step dots */}
                <div className="flex gap-2">
                  {["Upload", "Register", "Generate"].map((label, i) => (
                    <div key={label} className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          i <= stepIndex
                            ? `${txt.dotActive} scale-110`
                            : txt.dotInactive
                        }`}
                      />
                      <span
                        className={`text-xs transition-colors duration-300 ${
                          i <= stepIndex ? txt.stepActive : txt.stepInactive
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error state */}
            {status === "error" && (
              <div className="flex flex-col items-center gap-4 w-full px-4">
                <div className={`${pill} rounded-2xl p-5 w-full ${txt.errorBorder} border`}>
                  <p className={`text-sm ${txt.error}`}>{errorMessage}</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleUpload}
                    className={`${pill} rounded-full px-8 py-3 text-sm font-semibold ${txt.heading} cursor-pointer`}
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleReset}
                    className={`${pill} rounded-full px-6 py-3 text-sm font-medium ${txt.muted} cursor-pointer`}
                  >
                    Start over
                  </button>
                </div>
              </div>
            )}

            {/* Done — show generated captions with smoke text */}
            {status === "done" && captions.length > 0 && (
              <div className="flex flex-col items-center gap-6 w-full px-4">
                {/* Success badge */}
                <div className={`${pill} inline-flex items-center gap-2 rounded-full px-5 py-2`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 ${hasImage ? "text-emerald-300" : "text-emerald-500"}`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className={`text-sm font-semibold ${hasImage ? "text-emerald-200" : "text-emerald-600"}`}>
                    Uploaded
                  </span>
                </div>
                <div className="space-y-4 w-full">
                  {captions.map((caption, i) => (
                    <div
                      key={caption.id ?? i}
                      className={`${pill} rounded-2xl p-5`}
                    >
                      <p className={`text-sm font-semibold ${txt.caption} leading-relaxed sm:text-base lg:text-lg`}>
                        <SmokeText text={caption.content ?? JSON.stringify(caption)} />
                      </p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleReset}
                  className={`${pill} rounded-full px-8 py-3 text-sm font-semibold ${txt.body} cursor-pointer`}
                >
                  Upload another
                </button>
              </div>
            )}

            {status === "done" && captions.length === 0 && (
              <div className="flex flex-col items-center gap-4">
                <p className={`text-xl ${txt.muted}`}>
                  No captions were generated.
                </p>
                <button
                  onClick={handleReset}
                  className={`${pill} rounded-full px-8 py-3 text-sm font-semibold ${txt.body} cursor-pointer`}
                >
                  Try another image
                </button>
              </div>
            )}
          </div>
        </Cell>
      </div>
    </div>
  );
}

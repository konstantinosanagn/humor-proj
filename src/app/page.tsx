"use client";

import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const inter = Inter({ subsets: ["latin"] });

type Caption = { id: string; content: string };
type MemeEntry = { id: string; url: string; captions: Caption[] };

function Cell({
  className = "",
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return <div className={`border border-gray-200 ${className}`}>{children}</div>;
}

export default function Home() {
  const [memes, setMemes] = useState<MemeEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMemeIndex, setActiveMemeIndex] = useState(0);
  const [prevMemeIndex, setPrevMemeIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);
  const [captionsVisible, setCaptionsVisible] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();

      const [{ data: { user } }, { data: images }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("images")
          .select("id, url, captions(id, content)")
          .eq("is_public", true),
      ]);

      setUserId(user?.id ?? null);

      const valid = (images ?? []).filter(
        (img): img is MemeEntry =>
          Array.isArray(img.captions) && img.captions.length > 0
      );
      setMemes(valid);
      setLoading(false);
    }
    load();
  }, []);

  const activeMeme = memes[activeMemeIndex];
  const captions = activeMeme?.captions ?? [];
  const currentCaption = captions[activeCaptionIndex];
  const isLastCaption = activeCaptionIndex === captions.length - 1;
  const isLastMeme = activeMemeIndex === memes.length - 1;

  const handleVote = useCallback(
    async (vote: "like" | "dislike") => {
      if (!activeMeme || !currentCaption) return;

      if (userId) {
        const supabase = createClient();
        await supabase.from("caption_votes").insert({
          caption_id: currentCaption.id,
          profile_id: userId,
          vote_value: vote === "like" ? 1 : -1,
        });
      }

      if (!isLastCaption) {
        setActiveCaptionIndex((i) => i + 1);
        return;
      }

      if (isLastMeme) return;

      setCaptionsVisible(false);
      setTimeout(() => {
        setPrevMemeIndex(activeMemeIndex);
        setActiveMemeIndex((i) => i + 1);
        setActiveCaptionIndex(0);
        setIsTransitioning(true);
        setTimeout(() => setCaptionsVisible(true), 200);
      }, 250);
      setTimeout(() => {
        setPrevMemeIndex(null);
        setIsTransitioning(false);
      }, 900);
    },
    [activeMeme, currentCaption, userId, isLastCaption, isLastMeme, activeMemeIndex]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl text-gray-500">Loading…</p>
      </div>
    );
  }

  if (memes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl text-gray-500">No memes found.</p>
      </div>
    );
  }

  const captionOpacity = captionsVisible ? "opacity-100" : "opacity-0";
  const imageAnimation = isTransitioning ? "animate-slideIn" : "";

  return (
    <div className="min-h-screen bg-white">
      <div className="grid grid-cols-[5rem_2fr_3fr_5rem] grid-rows-[5rem_1fr_5rem] min-h-screen">
        <Cell className="border-r-0" />
        <Cell className="col-span-2 border-r-0 border-l-0 flex items-center px-4">
          <Link href="/list" className="text-gray-600 hover:text-gray-900 font-medium">
            Captions from Supabase
          </Link>
        </Cell>
        <Cell className="border-l-0" />

        <Cell />
        <Cell className="flex items-center justify-center overflow-hidden p-4">
          <div className="relative w-[450px] h-[450px] flex items-center justify-center overflow-hidden">
            {prevMemeIndex !== null && (
              <Image
                key={`exit-${prevMemeIndex}`}
                src={memes[prevMemeIndex].url}
                alt="Meme"
                fill
                className="object-contain animate-slideOut"
                unoptimized
              />
            )}
            <Image
              key={`enter-${activeMemeIndex}`}
              src={activeMeme.url}
              alt="Meme"
              fill
              className={`object-contain ${imageAnimation}`}
              unoptimized
            />
          </div>
        </Cell>
        <Cell className={`overflow-hidden p-0 flex flex-col ${inter.className}`}>
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-200 ${captionOpacity}`}
          >
            <div className="max-w-[400px] w-full px-6 mb-8">
              <p className="text-3xl font-medium text-black leading-relaxed">
                {currentCaption?.content}
              </p>
            </div>

            <div className="flex gap-8">
              <button
                onClick={() => handleVote("like")}
                className="p-4 rounded-full hover:bg-red-50 transition-colors group"
                aria-label="Like"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-10 h-10 text-red-500 group-hover:fill-red-500 transition-all"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              <button
                onClick={() => handleVote("dislike")}
                className="p-4 rounded-full hover:bg-gray-100 transition-colors group"
                aria-label="Dislike"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-10 h-10 text-gray-500 group-hover:fill-gray-400 transition-all"
                >
                  <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                </svg>
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-400">
              {activeCaptionIndex + 1} / {captions.length}
            </div>
          </div>
        </Cell>
        <Cell />

        <Cell className="border-r-0" />
        <Cell className="col-span-2 border-r-0 border-l-0" />
        <Cell className="border-l-0" />
      </div>
    </div>
  );
}

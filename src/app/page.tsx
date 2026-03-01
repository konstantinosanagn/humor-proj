"use client";

import Image from "next/image";
import Link from "next/link";
import { Lexend_Mega } from "next/font/google";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const lexendMega = Lexend_Mega({ subsets: ["latin"] });

type Caption = { id: string; content: string };
type MemeEntry = { id: string; url: string; captions: Caption[] };

type CellProps = {
  className?: string;
  children?: React.ReactNode;
};

function Cell({ className = "", children }: CellProps): React.ReactElement {
  return <div className={className}>{children}</div>;
}

function HeartIcon(): React.ReactElement {
  return (
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
  );
}

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

function ThumbDownIcon(): React.ReactElement {
  return (
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
  );
}

export default function Home() {
  const router = useRouter();
  const [memes, setMemes] = useState<MemeEntry[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMemeIndex, setActiveMemeIndex] = useState(0);
  const [prevMemeIndex, setPrevMemeIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let stale = false;

    async function load() {
      const supabase = createClient();

      const [{ data: { user } }, { data: images }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
          .from("images")
          .select("id, url, captions(id, content)")
          .eq("is_public", true),
      ]);

      if (stale) return;

      const uid = user?.id ?? null;
      setUserId(uid);
      setUserEmail(user?.email ?? null);

      let votedCaptionIds = new Set<string>();
      if (uid) {
        const { data: votes } = await supabase
          .from("caption_votes")
          .select("caption_id")
          .eq("profile_id", uid);
        if (stale) return;
        votedCaptionIds = new Set(
          (votes ?? []).map((v: { caption_id: string }) => v.caption_id)
        );
      }

      const valid = (images ?? [])
        .map((img) => ({
          ...img,
          captions: (img.captions ?? []).filter(
            (c: Caption) => c.content != null && !votedCaptionIds.has(c.id)
          ),
        }))
        .filter((img): img is MemeEntry => img.captions.length > 0)
        .map((img): MemeEntry => ({
          ...img,
          captions: [img.captions[Math.floor(Math.random() * img.captions.length)]],
        }))
        .sort(() => Math.random() - 0.5);
      setMemes(valid);
      setLoading(false);
    }
    load();

    const timeouts = timeoutsRef.current;
    return () => {
      stale = true;
      timeouts.forEach(clearTimeout);
    };
  }, []);

  const activeMeme = memes[activeMemeIndex];
  const captions = activeMeme?.captions ?? [];
  const currentCaption = captions[activeCaptionIndex];
  const isLastCaption = activeCaptionIndex === captions.length - 1;
  const isLastMeme = activeMemeIndex === memes.length - 1;

  const handleVote = useCallback(
    async (vote: "like" | "dislike") => {
      if (!activeMeme || !currentCaption || isTransitioning) return;

      if (userId) {
        const supabase = createClient();
        const now = new Date().toISOString();
        const { error: voteError } = await supabase.from("caption_votes").upsert(
          {
            caption_id: currentCaption.id,
            profile_id: userId,
            vote_value: vote === "like" ? 1 : -1,
            created_datetime_utc: now,
            modified_datetime_utc: now,
          },
          { onConflict: "profile_id,caption_id" }
        );
        if (voteError) console.error("Vote insert failed:", voteError.message);
      }

      if (!isLastCaption) {
        setActiveCaptionIndex((i) => i + 1);
        return;
      }

      if (isLastMeme) return;

      // Orchestrate the crossfade: hide captions, swap meme image, then reveal captions
      setCaptionsVisible(false);

      const scheduleTimeout = (fn: () => void, ms: number) => {
        const id = setTimeout(fn, ms);
        timeoutsRef.current.push(id);
      };

      scheduleTimeout(() => {
        setPrevMemeIndex(activeMemeIndex);
        setActiveMemeIndex((i) => i + 1);
        setActiveCaptionIndex(0);
        setIsTransitioning(true);
        scheduleTimeout(() => setCaptionsVisible(true), 200);
      }, 250);

      scheduleTimeout(() => {
        setPrevMemeIndex(null);
        setIsTransitioning(false);
      }, 900);
    },
    [activeMeme, currentCaption, userId, isLastCaption, isLastMeme, activeMemeIndex, isTransitioning]
  );

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E0DE]">
        <p className="text-xl text-gray-500">Loading…</p>
      </div>
    );
  }

  if (!userId) {
    router.push("/login");
    return null;
  }

  if (memes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E0E0DE]">
        <p className="text-xl text-gray-500">No memes found.</p>
      </div>
    );
  }

  const captionOpacity = captionsVisible ? "opacity-100" : "opacity-0";
  const imageAnimation = isTransitioning ? "animate-slideIn" : "";

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Blurred ambient background — ::before handles the top white gradient */}
      <div className="featuredBg">
        <img
          key={`bg-${activeMemeIndex}`}
          src={activeMeme.url}
          alt=""
          aria-hidden="true"
          className="featuredBgImage"
        />
        {prevMemeIndex !== null && (
          <img
            src={memes[prevMemeIndex].url}
            alt=""
            aria-hidden="true"
            className="featuredBgImage animate-bgFadeOut"
          />
        )}
        <div className="featuredBgOverlay" />
      </div>

      <button
        onClick={handleSignOut}
        className="glass-pill fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-5 py-2.5 cursor-pointer"
      >
        <span
          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold tracking-wide text-white/90"
          style={{ background: "rgba(0, 0, 0, 0.2)" }}
        >
          {(userEmail?.[0] ?? "?").toUpperCase()}
        </span>
        <span className="text-sm font-medium text-white/80">Sign out</span>
      </button>

      <div className="relative z-10 grid grid-cols-1 grid-rows-[auto_auto_auto] min-h-screen lg:grid-cols-[5rem_2fr_3fr_5rem] lg:grid-rows-[5rem_1fr_5rem]">
        {/* Empty cells — desktop only, for grid spacing */}
        <Cell className="hidden lg:block lg:col-start-1 lg:row-start-1" />
        <Cell className="hidden lg:block lg:col-start-4 lg:row-start-1" />
        <Cell className="hidden lg:block lg:col-start-1 lg:row-start-2" />
        <Cell className="hidden lg:block lg:col-start-4 lg:row-start-2" />
        <Cell className="hidden lg:block lg:col-start-1 lg:row-start-3" />
        <Cell className="hidden lg:block lg:col-start-2 lg:col-span-2 lg:row-start-3" />
        <Cell className="hidden lg:block lg:col-start-4 lg:row-start-3" />

        {/* 1. Nav — top on mobile/tablet; row 1 col 2–3 on desktop */}
        <Cell className="flex items-center justify-center gap-3 px-4 py-4 lg:col-start-2 lg:col-span-2 lg:row-start-1 lg:justify-start">
          <Link
            href="/list"
            className="glass-pill inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white/80 no-underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.45 4.38l3.59 3.58a.75.75 0 11-1.06 1.06l-3.58-3.59A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
            Explore Supabase
          </Link>
          <Link
            href="/upload"
            className="glass-pill inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white/80 no-underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03L9.25 4.636v8.614z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Upload
          </Link>
        </Cell>

        {/* 2. Image — second on mobile/tablet; row 2 col 2 on desktop */}
        <Cell className="flex items-center justify-center overflow-hidden p-4 lg:col-start-2 lg:row-start-2">
          <div className="relative w-full max-w-[min(100vw,450px)] aspect-square flex items-center justify-center overflow-hidden lg:w-[450px] lg:h-[450px] lg:max-w-none lg:aspect-auto">
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

        {/* 3. Caption + like/dislike + counter — third on mobile/tablet; row 2 col 3 on desktop */}
        <Cell className={`overflow-hidden p-0 flex flex-col items-center justify-center px-4 pb-8 pt-2 lg:col-start-3 lg:row-start-2 lg:justify-center lg:pb-0 lg:pt-0 ${lexendMega.className}`}>
          <div
            className={`flex flex-col items-center justify-center text-center transition-opacity duration-200 ${captionOpacity}`}
          >
            <div className="max-w-[600px] w-full px-4 mb-6 lg:mb-8">
              <p key={currentCaption?.id} className="text-3xl font-semibold text-black leading-snug sm:text-4xl lg:text-5xl">
                <SmokeText text={currentCaption?.content ?? ""} />
              </p>
            </div>

            <div className="flex gap-8">
              <button
                onClick={() => handleVote("like")}
                className="p-4 rounded-full hover:bg-red-50 transition-colors group"
                aria-label="Like"
              >
                <HeartIcon />
              </button>

              <button
                onClick={() => handleVote("dislike")}
                className="p-4 rounded-full hover:bg-gray-100 transition-colors group"
                aria-label="Dislike"
              >
                <ThumbDownIcon />
              </button>
            </div>

            <div className="mt-6 text-sm text-gray-400">
              {activeCaptionIndex + 1} / {captions.length}
            </div>
          </div>
        </Cell>
      </div>
    </div>
  );
}

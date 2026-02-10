"use client";

import Image from "next/image";
import Link from "next/link";
import { Inter } from "next/font/google";
import { useState, useCallback } from "react";
import { MEMES_DB } from "./data/memes";

const inter = Inter({ subsets: ["latin"] });

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
  const [activeMemeIndex, setActiveMemeIndex] = useState(0);
  const [prevMemeIndex, setPrevMemeIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeCaptionIndex, setActiveCaptionIndex] = useState(0);
  const [captionsVisible, setCaptionsVisible] = useState(true);
  const isNavigatingRef = { current: false };

  const activeMeme = MEMES_DB[activeMemeIndex];
  const captions = activeMeme.captions;
  const currentCaption = captions[activeCaptionIndex];
  const isLastCaption = activeCaptionIndex === captions.length - 1;
  const isLastMeme = activeMemeIndex === MEMES_DB.length - 1;

  // Handle like/dislike button click
  const handleVote = useCallback((vote: "like" | "dislike") => {
    if (isNavigatingRef.current) return;
    
    // TODO: You can store the vote here if needed
    console.log(`Caption "${currentCaption}" received: ${vote}`);
    
    if (isLastCaption) {
      // Last caption of current meme - transition to next meme
      if (!isLastMeme) {
        isNavigatingRef.current = true;
        
        // Step 1: Hide captions (clear column 3)
        setCaptionsVisible(false);
        
        // Step 2: After captions fade out, start image transition
        setTimeout(() => {
          setPrevMemeIndex(activeMemeIndex);
          setActiveMemeIndex(activeMemeIndex + 1);
          setActiveCaptionIndex(0);
          setIsTransitioning(true);
          
          // Step 3: Show new captions after image starts transitioning
          setTimeout(() => {
            setCaptionsVisible(true);
          }, 200);
        }, 250);
        
        setTimeout(() => {
          setPrevMemeIndex(null);
          setIsTransitioning(false);
          isNavigatingRef.current = false;
        }, 900);
      }
    } else {
      // Not last caption - go to next caption
      setActiveCaptionIndex(activeCaptionIndex + 1);
    }
  }, [activeMemeIndex, activeCaptionIndex, currentCaption, isLastCaption, isLastMeme]);

  return (
    <div className="min-h-screen bg-white">
      {/* Row 1: navbar | Row 2: content | Row 3: footer. Cols: filler | 2/5 | 3/5 | filler */}
      <div className="grid grid-cols-[5rem_2fr_3fr_5rem] grid-rows-[5rem_1fr_5rem] min-h-screen">
        {/* Row 0 – navbar */}
        <Cell className="border-r-0" />
        <Cell className="col-span-2 border-r-0 border-l-0 flex items-center px-4">
          <Link href="/list" className="text-gray-600 hover:text-gray-900 font-medium">
            Captions from Supabase
          </Link>
        </Cell>
        <Cell className="border-l-0" />

        {/* Row 1 – content: col 2 = meme, col 3 = captions */}
        <Cell />
        <Cell className="flex items-center justify-center overflow-hidden p-4">
          {/* Fixed-size image container */}
          <div className="relative w-[450px] h-[450px] flex items-center justify-center overflow-hidden">
            {/* Exiting image (slides up) */}
            {prevMemeIndex !== null && (
              <Image
                key={`exit-${prevMemeIndex}`}
                src={MEMES_DB[prevMemeIndex].imageUrl}
                alt="Meme"
                fill
                className="object-contain animate-slideOut"
                unoptimized
              />
            )}
            {/* Entering image (slides up from bottom) */}
            <Image
              key={`enter-${activeMemeIndex}`}
              src={activeMeme.imageUrl}
              alt="Meme"
              fill
              className={`object-contain ${isTransitioning ? "animate-slideIn" : ""}`}
              unoptimized
            />
          </div>
        </Cell>
        <Cell className={`overflow-hidden p-0 flex flex-col ${inter.className}`}>
          <div
            className={`flex-1 flex flex-col items-center justify-center text-center px-4 transition-opacity duration-200 ${
              captionsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Current caption in container */}
            <div className="max-w-[400px] w-full px-6 mb-8">
              <p className="text-3xl font-medium text-black leading-relaxed">
                {currentCaption}
              </p>
            </div>
            
            {/* Heart and Dislike buttons */}
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
            
            {/* Caption progress indicator */}
            <div className="mt-6 text-sm text-gray-400">
              {activeCaptionIndex + 1} / {captions.length}
            </div>
          </div>
        </Cell>
        <Cell />

        {/* Row 2 – footer */}
        <Cell className="border-r-0" />
        <Cell className="col-span-2 border-r-0 border-l-0" />
        <Cell className="border-l-0" />
      </div>
    </div>
  );
}

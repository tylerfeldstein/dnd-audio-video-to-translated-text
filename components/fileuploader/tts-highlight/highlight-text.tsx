"use client";

import React, { useEffect, useRef, useState } from "react";
import { Timestamp } from "@/actions/kokoroTts/captionedTts";

// Define CSS keyframes for the highlight animation
const keyframes = ``;

interface HighlightTextProps {
  text: string;
  timestamps?: Timestamp[];
  isPlaying: boolean;
  currentTime: number;
  onWordClick?: (word: string, startTime: number) => void;
}

export function HighlightText({
  text,
  timestamps,
  isPlaying,
  currentTime,
  onWordClick,
}: HighlightTextProps) {
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);

  // Inject keyframes into the document
  useEffect(() => {
    // Create style element with a unique id
    const styleId = 'highlight-animation-keyframes';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    // If style element doesn't exist, create it
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.type = 'text/css';
      styleElement.innerHTML = keyframes;
      document.head.appendChild(styleElement);
    }
    
    // Clean up - only remove if we created it in this effect
    return () => {
      styleElement = document.getElementById(styleId) as HTMLStyleElement;
      if (styleElement) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);

  // Update the active word based on currentTime and timestamps
  useEffect(() => {
    if (!timestamps || timestamps.length === 0) {
      return;
    }

    console.log(`Checking currentTime: ${currentTime.toFixed(3)}s, isPlaying: ${isPlaying}`);

    // Find the current word based on currentTime
    let foundIndex = -1;
    
    // Loop through timestamps to find word at current time
    for (let i = 0; i < timestamps.length; i++) {
      const { start_time, end_time } = timestamps[i];
      // Use a small buffer (0.05s) to ensure we catch words even with small timing discrepancies
      if (currentTime >= start_time - 0.05 && currentTime <= end_time + 0.05) {
        console.log(`Found word "${timestamps[i].word}" at index ${i}, time ${start_time.toFixed(2)}-${end_time.toFixed(2)}`);
        foundIndex = i;
        break;
      }
    }
    
    // If we didn't find an exact match but audio is playing, 
    // find the closest upcoming word
    if (foundIndex === -1 && isPlaying) {
      let closestIndex = -1;
      let smallestDiff = Number.MAX_VALUE;
      
      for (let i = 0; i < timestamps.length; i++) {
        // Find the closest upcoming word
        if (timestamps[i].start_time > currentTime) {
          const diff = timestamps[i].start_time - currentTime;
          if (diff < smallestDiff) {
            smallestDiff = diff;
            closestIndex = i;
          }
        }
      }
      
      // If the closest word is less than 0.2 seconds away, highlight it
      if (closestIndex !== -1 && smallestDiff < 0.2) {
        foundIndex = closestIndex;
      }
    }

    if (foundIndex !== -1 && foundIndex !== activeWordIndex) {
      console.log(`Highlighting word: "${timestamps[foundIndex].word}" at time ${currentTime}s (${timestamps[foundIndex].start_time}-${timestamps[foundIndex].end_time})`);
      setActiveWordIndex(foundIndex);
      
      // Always scroll the active word into view
      if (wordRefs.current[foundIndex] && containerRef.current) {
        const word = wordRefs.current[foundIndex];
        
        if (word) {
          word.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center"
          });
        }
      }
    } else if (foundIndex === -1 && activeWordIndex !== -1) {
      // Reset if no word is active
      setActiveWordIndex(-1);
    }
  }, [currentTime, timestamps, isPlaying]);

  // Reset active word when playback stops
  useEffect(() => {
    if (!isPlaying) {
      setActiveWordIndex(-1);
    }
  }, [isPlaying]);

  if (!timestamps || timestamps.length === 0) {
    // If no timestamps are available, just render the text normally
    return (
      <div 
        ref={containerRef}
        className="max-h-[400px] overflow-y-auto p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-inner"
      >
        <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
          {text}
        </p>
      </div>
    );
  }

  // Initialize word refs array with the correct size
  wordRefs.current = wordRefs.current.slice(0, timestamps.length);

  return (
    <div 
      ref={containerRef}
      className="max-h-[400px] overflow-y-auto p-4 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-md shadow-inner"
    >
      <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed">
        {timestamps.map((timestamp, index) => (
          <React.Fragment key={`${timestamp.word}-${index}`}>
            <span
              ref={(el) => {
                wordRefs.current[index] = el;
              }}
              className={`relative cursor-pointer px-1 py-0.5 rounded transition-colors duration-100 ${
                index === activeWordIndex
                  ? "text-indigo-950 dark:text-white font-semibold z-10"
                  : "hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
              }`}
              onClick={() => onWordClick?.(timestamp.word, timestamp.start_time)}
              data-start-time={timestamp.start_time}
              data-end-time={timestamp.end_time}
            >
              {index === activeWordIndex && (
                <span 
                  className={`absolute inset-0 rounded-md -z-10`}
                  style={{
                    background: 'rgba(99,102,241,0.2)',
                    width: '100%',
                    height: '100%'
                  }}
                />
              )}
              {timestamp.word}
            </span>
            {/* Add space between words */}
            {index < timestamps.length - 1 && " "}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
} 
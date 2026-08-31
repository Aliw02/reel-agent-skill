"use client";

import React, { useCallback } from "react";
import { useEditorStore } from "../../store/useEditorStore";

interface ComparisonSliderProps {
  beforeUrl: string | null;
  children: React.ReactNode;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({
  beforeUrl,
  children,
}) => {
  const { currentPlaybackFrame } = useEditorStore();
  const [position, setPosition] = React.useState(50);

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPosition(Number(e.target.value));
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      let newPos = position;
      switch (e.key) {
        case "ArrowLeft":
          newPos = Math.max(0, position - 2);
          break;
        case "ArrowRight":
          newPos = Math.min(100, position + 2);
          break;
        case "Home":
          newPos = 0;
          break;
        case "End":
          newPos = 100;
          break;
        default:
          return;
      }
      e.preventDefault();
      setPosition(newPos);
    },
    [position]
  );

  if (!beforeUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
        No before video available
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Before layer (full width, underneath) */}
      <div className="absolute inset-0">
        <video
          src={beforeUrl}
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
          style={{ pointerEvents: "none" }}
        />
      </div>

      {/* After layer (clipped by position) */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        {children}
      </div>

      {/* Slider track line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${position}%` }}
      />

      {/* Slider handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-white border-2 border-zinc-700 shadow-xl flex items-center justify-center cursor-ew-resize"
        style={{ left: `${position}%` }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 6L1 6M1 6L3 4M1 6L3 8" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 6L11 6M11 6L9 4M11 6L9 8" stroke="#3f3f46" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      {/* Keyboard-operable range input */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={handleSliderChange}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
        aria-label="Comparison slider position"
      />

      {/* Frame counter */}
      <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-black/60 text-xs text-zinc-300 z-10 font-mono">
        Frame {Math.round(currentPlaybackFrame)}
      </div>
    </div>
  );
};

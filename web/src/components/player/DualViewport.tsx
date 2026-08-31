"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore, ViewMode } from "../../store/useEditorStore";
import { RemotionPreview } from "./RemotionPreview";
import { ComparisonSlider } from "./ComparisonSlider";

interface DualViewportProps {
  className?: string;
}

export const DualViewport: React.FC<DualViewportProps> = ({ className }) => {
  const { viewMode, setViewMode, beforeVideoUrl } = useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center gap-4 h-full ${className || ""}`}
    >
      {/* View Mode Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-900 border border-zinc-800 p-1 shrink-0">
        {(["split", "slider", "after"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => handleViewModeChange(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              viewMode === mode
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {mode === "split" ? "Split" : mode === "slider" ? "Slider" : "After"}
          </button>
        ))}
      </div>

      {/* Player Container - fixed 9:16 aspect ratio, capped by parent height */}
      <div
        className="relative rounded-lg overflow-hidden border border-zinc-800 w-full max-w-md flex-1 min-h-0"
        style={{ aspectRatio: "9/16", maxHeight: "calc(100vh - 160px)" }}
      >
        {viewMode === "split" && (
          <div className="flex w-full h-full">
            <div className="w-1/2 h-full overflow-hidden border-r border-zinc-700 relative">
              {beforeVideoUrl ? (
                <video
                  src={beforeVideoUrl}
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-500 text-sm">
                  Raw Footage
                </div>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-zinc-400 uppercase tracking-wider">
                Raw Footage
              </div>
            </div>

            <div className="w-1/2 h-full overflow-hidden relative">
              <RemotionPreview className="w-full h-full" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-zinc-400 uppercase tracking-wider">
                AI Edited Reel
              </div>
            </div>
          </div>
        )}

        {viewMode === "slider" && (
          <ComparisonSlider beforeUrl={beforeVideoUrl}>
            <RemotionPreview className="w-full h-full" />
          </ComparisonSlider>
        )}

        {viewMode === "after" && <RemotionPreview className="w-full h-full" />}
      </div>
    </div>
  );
};

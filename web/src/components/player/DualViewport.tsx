"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore, ViewMode } from "../../store/useEditorStore";
import { RemotionPreview } from "./RemotionPreview";
import { ComparisonSlider } from "./ComparisonSlider";

interface DualViewportProps {
  className?: string;
}

export const DualViewport: React.FC<DualViewportProps> = ({ className }) => {
  const { viewMode, setViewMode, beforeVideoUrl, afterVideoUrl } =
    useEditorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
    },
    [setViewMode]
  );

  // Calculate responsive 9:16 dimensions
  const maxHeight = containerSize.height || 800;
  const playerHeight = Math.min(maxHeight, maxHeight);
  const playerWidth = playerHeight * (9 / 16);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col items-center gap-4 ${className || ""}`}
    >
      {/* View Mode Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-900 border border-zinc-800 p-1">
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

      {/* Player Container */}
      <div
        className="relative rounded-lg overflow-hidden border border-zinc-800"
        style={{
          width: playerWidth,
          height: playerHeight,
          maxWidth: "100%",
        }}
      >
        {viewMode === "split" && (
          <div className="flex w-full h-full">
            {/* Before panel */}
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
                  Before
                </div>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-zinc-400 uppercase tracking-wider">
                Before
              </div>
            </div>

            {/* After panel */}
            <div className="w-1/2 h-full overflow-hidden relative">
              <RemotionPreview className="w-full h-full" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-zinc-400 uppercase tracking-wider">
                After
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

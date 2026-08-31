"use client";

import React, { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";

function formatTime(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.floor((totalSeconds % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

export default function VideoTimeline() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const {
    currentPlaybackFrame,
    updatePlaybackFrame,
    committedPlan,
    stageStatus,
  } = useEditorStore();

  const fps = committedPlan.fps || 30;
  const totalFrames = committedPlan.durationInFrames || 300;
  const currentTime = formatTime(currentPlaybackFrame, fps);
  const totalTime = formatTime(totalFrames, fps);
  const progress = totalFrames > 0 ? (currentPlaybackFrame / totalFrames) * 100 : 0;

  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const frame = Math.round((x / rect.width) * totalFrames);
      updatePlaybackFrame(frame);
    },
    [totalFrames, updatePlaybackFrame]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      seekToPosition(e.clientX);
    },
    [seekToPosition]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        seekToPosition(e.clientX);
      }
    },
    [isDragging, seekToPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const sceneMarkers = committedPlan.scenes.map((scene, i) => {
    const startFrame = scene.startFrame ?? 0;
    const endFrame = scene.endFrame ?? totalFrames;
    return {
      id: i,
      start: (startFrame / totalFrames) * 100,
      width: ((endFrame - startFrame) / totalFrames) * 100,
      label: scene.label || `Scene ${i + 1}`,
    };
  });

  const subtitleMarkers = committedPlan.subtitles.map((sub) => ({
    start: (sub.startFrame / totalFrames) * 100,
    width: ((sub.endFrame - sub.startFrame) / totalFrames) * 100,
  }));

  const stageColors: Record<number, string> = {
    1: "bg-emerald-500",
    2: "bg-blue-500",
    3: "bg-purple-500",
    4: "bg-amber-500",
  };

  return (
    <div className="w-full border-t border-zinc-800 bg-zinc-950 px-4 py-2 shrink-0">
      {/* Scene row */}
      <div className="flex gap-0.5 h-4 mb-1 rounded overflow-hidden">
        {sceneMarkers.map((scene) => (
          <div
            key={scene.id}
            className="bg-zinc-800 border border-zinc-700 rounded-sm flex items-center justify-center overflow-hidden"
            style={{ width: `${scene.width}%` }}
            title={scene.label}
          >
            <span className="text-[8px] text-zinc-500 truncate px-1">
              {scene.label}
            </span>
          </div>
        ))}
        {sceneMarkers.length === 0 && (
          <div className="w-full bg-zinc-800/50 rounded" />
        )}
      </div>

      {/* Subtitle markers row */}
      <div className="relative h-3 mb-1">
        <div className="absolute inset-0 bg-zinc-900 rounded" />
        {subtitleMarkers.map((sub, i) => (
          <div
            key={i}
            className="absolute top-0 h-full bg-blue-500/20 border-l border-r border-blue-500/40"
            style={{ left: `${sub.start}%`, width: `${sub.width}%` }}
          />
        ))}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        className="relative h-8 bg-zinc-900 rounded cursor-crosshair group"
      >
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full bg-blue-500/10 rounded-l"
          style={{ width: `${progress}%` }}
        />

        {/* Waveform placeholder */}
        <div className="absolute inset-0 flex items-center px-1 overflow-hidden">
          {Array.from({ length: 120 }).map((_, i) => {
            const height = 20 + Math.sin(i * 0.3) * 15 + Math.cos(i * 0.7) * 10;
            return (
              <div
                key={i}
                className="flex-shrink-0 bg-zinc-700/40 rounded-full mx-px"
                style={{
                  width: 2,
                  height: `${height}%`,
                  opacity: i / 120 < progress / 100 ? 1 : 0.3,
                }}
              />
            );
          })}
        </div>

        {/* Playhead */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.5)] z-10 pointer-events-none"
          style={{ left: `${progress}%` }}
        >
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-lg" />
        </div>

        {/* Hover indicator */}
        <div className="absolute -top-5 hidden group-hover:block bg-zinc-800 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded pointer-events-none z-20">
          Seek
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
            {currentTime}
          </span>
          <span className="text-[10px] text-zinc-600">/</span>
          <span className="text-[10px] text-zinc-500 font-mono tabular-nums">
            {totalTime}
          </span>
        </div>

        {/* Stage progress dots */}
        <div className="flex items-center gap-2">
          {([1, 2, 3, 4] as const).map((stage) => (
            <div
              key={stage}
              className={`w-1.5 h-1.5 rounded-full ${
                stageStatus[stage] === "approved"
                  ? stageColors[stage]
                  : stageStatus[stage] === "ready"
                  ? `${stageColors[stage]} animate-pulse`
                  : "bg-zinc-700"
              }`}
              title={`Stage ${stage}: ${stageStatus[stage]}`}
            />
          ))}
        </div>

        <div className="text-[10px] text-zinc-500 font-mono tabular-nums">
          {currentPlaybackFrame} / {totalFrames} frames
        </div>
      </div>
    </div>
  );
}

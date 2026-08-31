"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, PlayerRef } from "@remotion/player";
import type { EditPlanV3 } from "../../../../src/types/schema";
import { useEditorStore } from "../../store/useEditorStore";

let ReelComposition: React.FC<EditPlanV3> | null = null;
let compositionLoadPromise: Promise<void> | null = null;

function loadComposition() {
  if (ReelComposition) return Promise.resolve();
  if (compositionLoadPromise) return compositionLoadPromise;

  compositionLoadPromise = import("../../../../src/ReelComposition")
    .then((mod) => {
      ReelComposition = mod.ReelComposition;
    })
    .catch((err) => {
      console.error("Failed to load ReelComposition:", err);
      compositionLoadPromise = null;
    });

  return compositionLoadPromise;
}

interface RemotionPreviewProps {
  className?: string;
}

export const RemotionPreview: React.FC<RemotionPreviewProps> = ({
  className,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const beforeRef = useRef<HTMLVideoElement>(null);
  const [compositionReady, setCompositionReady] = useState(false);
  const syncingRef = useRef(false);

  const {
    committedPlan,
    draftPlan,
    beforeVideoUrl,
    currentPlaybackFrame,
    updatePlaybackFrame,
  } = useEditorStore();

  const activePlan = useMemo(() => {
    const hasDraftChanges =
      draftPlan.subtitles.length !== committedPlan.subtitles.length ||
      draftPlan.title !== committedPlan.title ||
      JSON.stringify(draftPlan.scenes) !== JSON.stringify(committedPlan.scenes);

    return hasDraftChanges ? draftPlan : committedPlan;
  }, [committedPlan, draftPlan]);

  const inputProps: EditPlanV3 = useMemo(
    () => ({
      ...activePlan,
      assetBaseUrl: activePlan.assetBaseUrl || "",
    }),
    [activePlan]
  );

  const fps = activePlan.fps || 30;
  const durationInFrames = activePlan.durationInFrames || 1;

  useEffect(() => {
    loadComposition().then(() => setCompositionReady(true));
  }, []);

  // Listen for frame updates from the Remotion Player
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleFrameUpdate = (e: { detail: { frame: number } }) => {
      if (!syncingRef.current) {
        updatePlaybackFrame(e.detail.frame);
      }
    };

    player.addEventListener("frameupdate", handleFrameUpdate);
    return () => {
      player.removeEventListener("frameupdate", handleFrameUpdate);
    };
  }, [compositionReady, updatePlaybackFrame]);

  // Sync Remotion frame -> Before HTML5 video
  useEffect(() => {
    if (!beforeRef.current || syncingRef.current) return;
    syncingRef.current = true;
    const targetTime = currentPlaybackFrame / fps;
    if (Math.abs(beforeRef.current.currentTime - targetTime) > 0.05) {
      beforeRef.current.currentTime = targetTime;
    }
    syncingRef.current = false;
  }, [currentPlaybackFrame, fps]);

  // Mirror play/pause from Remotion Player to Before video
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => {
      if (beforeRef.current && beforeRef.current.paused) {
        beforeRef.current.play().catch(() => {});
      }
    };

    const handlePause = () => {
      if (beforeRef.current && !beforeRef.current.paused) {
        beforeRef.current.pause();
      }
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, [compositionReady]);

  // Handle Before video seeking -> sync back to Remotion (with loop guard)
  useEffect(() => {
    const before = beforeRef.current;
    if (!before || !playerRef.current) return;

    const handleBeforeSeeked = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      const frame = Math.round(before.currentTime * fps);
      playerRef.current?.seekTo(frame);
      updatePlaybackFrame(frame);
      syncingRef.current = false;
    };

    before.addEventListener("seeked", handleBeforeSeeked);
    return () => before.removeEventListener("seeked", handleBeforeSeeked);
  }, [fps, compositionReady, updatePlaybackFrame]);

  if (!compositionReady || !ReelComposition) {
    return (
      <div
        className={`flex items-center justify-center bg-zinc-900 rounded-lg ${className || ""}`}
        style={{ aspectRatio: "9/16", maxHeight: "100%" }}
      >
        <div className="text-zinc-500 text-sm">Loading player...</div>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className || ""}`}>
      {/* Remotion After Composition */}
      <div className="absolute inset-0">
        <Player
          ref={playerRef}
          component={ReelComposition}
          inputProps={inputProps}
          compositionWidth={inputProps.width || 1080}
          compositionHeight={inputProps.height || 1920}
          fps={fps}
          durationInFrames={durationInFrames}
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </div>

      {/* Before HTML5 Video (hidden, used for sync) */}
      {beforeVideoUrl && (
        <video
          ref={beforeRef}
          src={beforeVideoUrl}
          muted
          playsInline
          preload="auto"
          className="hidden"
        />
      )}
    </div>
  );
};

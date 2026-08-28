import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ReelProps } from "./types/schema";
import { Subtitles } from "./components/Subtitles";
import { InfoCard } from "./components/InfoCard";
import { ProgressBar } from "./components/ProgressBar";

export const ReelComposition: React.FC<ReelProps> = ({
  videoSrc,
  subtitles = [],
  highlightColor = "#FFE600",
  infoCard,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Subtle dynamic zoom-in across the video duration for engagement
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.06], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A0A0E",
        overflow: "hidden",
      }}
    >
      {/* 1. Main Background Video */}
      {videoSrc ? (
        <AbsoluteFill
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center 40%",
          }}
        >
          <OffthreadVideo
            src={videoSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle, #1E1B4B 0%, #0F172A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontFamily: "system-ui",
              textAlign: "center",
            }}
          >
            🎬 Preview Placeholder
          </h1>
        </AbsoluteFill>
      )}

      {/* 2. Top & Bottom Cinematic Vignette for Text Contrast */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.85) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 3. Progress Bar */}
      <ProgressBar />

      {/* 4. Glassmorphic Info Card Overlay */}
      <InfoCard config={infoCard} />

      {/* 5. Kinetic Subtitles */}
      <Subtitles subtitles={subtitles} highlightColor={highlightColor} />
    </AbsoluteFill>
  );
};

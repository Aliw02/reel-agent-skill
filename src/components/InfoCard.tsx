import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { InfoCardProps } from "../types/schema";

export const InfoCard: React.FC<{ config?: InfoCardProps }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!config || !config.enabled) {
    return null;
  }

  const { startFrame, durationInFrames, text } = config;
  const endFrame = startFrame + durationInFrames;

  if (frame < startFrame || frame > endFrame) {
    return null;
  }

  // Entrance spring animation
  const entrance = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.6,
      stiffness: 140,
    },
  });

  // Exit animation (last 15 frames)
  const isExiting = frame > endFrame - 15;
  const exitProgress = isExiting
    ? interpolate(frame, [endFrame - 15, endFrame], [1, 0])
    : 1;

  const translateY = interpolate(entrance, [0, 1], [-120, 0]) * exitProgress;
  const opacity = interpolate(entrance, [0, 1], [0, 1]) * exitProgress;
  const scale = interpolate(entrance, [0, 1], [0.9, 1]);

  return (
    <div
      style={{
        position: "absolute",
        top: 180,
        left: 40,
        right: 40,
        display: "flex",
        justifyContent: "center",
        transform: `translateY(${translateY}px) scale(${scale})`,
        opacity,
        zIndex: 40,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.6) 100%)",
          backdropFilter: "blur(20px)",
          borderRadius: "28px",
          padding: "24px 36px",
          border: "1.5px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
          display: "flex",
          alignItems: "center",
          gap: "18px",
          maxWidth: 900,
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #00FFCC 0%, #0077FF 100%)",
            width: 52,
            height: 52,
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            boxShadow: "0 4px 15px rgba(0, 255, 204, 0.4)",
          }}
        >
          Info
        </div>

        <div
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 34,
            fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1.3,
            textShadow: "0 2px 8px rgba(0,0,0,0.8)",
          }}
        >
          {text}
        </div>
      </div>
    </div>
  );
};

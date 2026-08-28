import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = Math.min(100, Math.max(0, (frame / durationInFrames) * 100));

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "8px",
        background: "rgba(255, 255, 255, 0.15)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #FFE600 0%, #00FFCC 100%)",
          boxShadow: "0 0 12px rgba(255, 230, 0, 0.8)",
          transition: "width 0.05s linear",
        }}
      />
    </div>
  );
};

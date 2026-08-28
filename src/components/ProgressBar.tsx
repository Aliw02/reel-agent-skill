import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { ProgressBarConfig } from "../types/schema";

interface ProgressBarProps {
  config?: ProgressBarConfig;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ config }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  if (config && config.enabled === false) {
    return null;
  }

  const height = config?.height || 8;
  const position = config?.position || "top";
  const gradient = config?.gradientColors
    ? `linear-gradient(90deg, ${config.gradientColors[0]} 0%, ${config.gradientColors[1]} 100%)`
    : config?.color || "linear-gradient(90deg, #FFE600 0%, #00FFCC 100%)";

  const progress = Math.min(100, Math.max(0, (frame / durationInFrames) * 100));

  return (
    <div
      style={{
        position: "absolute",
        top: position === "top" ? 0 : undefined,
        bottom: position === "bottom" ? 0 : undefined,
        left: 0,
        right: 0,
        height: `${height}px`,
        background: "rgba(255, 255, 255, 0.15)",
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: gradient,
          boxShadow: "0 0 12px rgba(255, 230, 0, 0.8)",
          // Deterministic frame calculation: No CSS transition!
        }}
      />
    </div>
  );
};

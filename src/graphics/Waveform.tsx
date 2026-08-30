import React from "react";
import { useCurrentFrame } from "remotion";
import { WaveformConfig } from "../types/schema";

interface WaveformProps {
  config?: WaveformConfig;
}

export const Waveform: React.FC<WaveformProps> = ({ config }) => {
  const frame = useCurrentFrame();

  if (!config || !config.enabled) {
    return null;
  }

  const { color = "#00FFCC", barsCount = 20, position = "bottom" } = config;

  const bars = Array.from({ length: barsCount });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: position === "bottom" ? 50 : undefined,
        top: position === "top" ? 180 : undefined,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 5,
        zIndex: 25,
        pointerEvents: "none",
        opacity: 0.5,
      }}
    >
      {bars.map((_, i) => {
        // Procedural rhythmic wave animation
        const freq = 0.12;
        const phase = i * 0.45;
        const height = Math.abs(Math.sin(frame * freq + phase)) * 36 + 6;

        return (
          <div
            key={i}
            style={{
              width: 5,
              height,
              backgroundColor: color,
              borderRadius: 4,
              boxShadow: `0 0 10px ${color}88`,
              opacity: 0.85,
              transition: "height 0.05s ease",
            }}
          />
        );
      })}
    </div>
  );
};

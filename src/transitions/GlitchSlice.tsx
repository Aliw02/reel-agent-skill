import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface GlitchSliceProps {
  startFrame: number;
  durationInFrames: number;
  intensity?: number;
}

export const GlitchSlice: React.FC<GlitchSliceProps> = ({
  startFrame,
  durationInFrames,
  intensity = 0.8,
}) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame > startFrame + durationInFrames) {
    return null;
  }

  const localFrame = frame - startFrame;
  const progress = localFrame / durationInFrames;

  // Subtle cinematic chromatic punch
  const seed = Math.sin(localFrame * 999.0);
  const rgbShift = Math.sin(seed * 78.9) * 10 * intensity * (1 - progress);
  const flashOpacity = Math.abs(Math.sin(localFrame * 3.0)) * 0.15 * intensity;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 90,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Subtle Flash Overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `rgba(255, 255, 255, ${flashOpacity})`,
          mixBlendMode: "overlay",
        }}
      />

      {/* Micro RGB Chromatic Shift */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          boxShadow: `inset ${rgbShift}px 0 0 rgba(0, 255, 204, 0.2), inset ${-rgbShift}px 0 0 rgba(255, 0, 128, 0.2)`,
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
};

import React from "react";
import { interpolate, useCurrentFrame } from "remotion";

interface BlurWipeProps {
  startFrame: number;
  durationInFrames: number;
  direction?: "left" | "right" | "up" | "down";
}

export const BlurWipe: React.FC<BlurWipeProps> = ({
  startFrame,
  durationInFrames,
  direction = "left",
}) => {
  const frame = useCurrentFrame();

  if (frame < startFrame || frame > startFrame + durationInFrames) {
    return null;
  }

  const localFrame = frame - startFrame;
  const progress = localFrame / durationInFrames;

  const wipeTranslate = interpolate(progress, [0, 1], [-100, 100]);
  const blurVal = interpolate(progress, [0, 0.5, 1], [0, 20, 0]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 86,
        pointerEvents: "none",
        backdropFilter: `blur(${blurVal}px)`,
        background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
        transform: `translateX(${wipeTranslate}%)`,
      }}
    />
  );
};

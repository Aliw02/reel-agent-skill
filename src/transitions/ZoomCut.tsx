import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface ZoomCutProps {
  startFrame: number;
  durationInFrames: number;
}

export const ZoomCut: React.FC<ZoomCutProps> = ({
  startFrame,
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > startFrame + durationInFrames) {
    return null;
  }

  const localFrame = frame - startFrame;
  const progress = localFrame / durationInFrames;

  // Flash burst and scale impact
  const flash = interpolate(progress, [0, 0.3, 1], [0, 0.45, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: `rgba(255, 255, 255, ${flash})`,
        zIndex: 85,
        pointerEvents: "none",
        mixBlendMode: "screen",
      }}
    />
  );
};

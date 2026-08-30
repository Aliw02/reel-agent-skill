import React from "react";
import { TransitionConfig } from "../types/schema";
import { GlitchSlice } from "./GlitchSlice";
import { ZoomCut } from "./ZoomCut";
import { BlurWipe } from "./BlurWipe";

interface TransitionRendererProps {
  transitions?: TransitionConfig[];
}

export const TransitionRenderer: React.FC<TransitionRendererProps> = ({
  transitions = [],
}) => {
  if (!transitions || transitions.length === 0) return null;

  return (
    <>
      {transitions.map((t, idx) => {
        if (t.type === "glitch_slice" || t.type === "rgb_glitch") {
          return (
            <GlitchSlice
              key={idx}
              startFrame={t.startFrame}
              durationInFrames={t.durationInFrames || 12}
              intensity={t.intensity ?? 0.75}
            />
          );
        }

        if (t.type === "zoom_cut" || t.type === "flash") {
          return (
            <ZoomCut
              key={idx}
              startFrame={t.startFrame}
              durationInFrames={t.durationInFrames || 8}
            />
          );
        }

        if (t.type === "blur_wipe" || t.type === "whip_left" || t.type === "whip_right") {
          return (
            <BlurWipe
              key={idx}
              startFrame={t.startFrame}
              durationInFrames={t.durationInFrames || 10}
              direction={t.direction || "left"}
            />
          );
        }

        return null;
      })}
    </>
  );
};

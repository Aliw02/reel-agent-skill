import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AnimatedCounterConfig } from "../types/schema";

interface AnimatedCounterProps {
  config: AnimatedCounterConfig;
  startFrame?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  config,
  startFrame: propStartFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    startVal = 0,
    endVal = 100,
    prefix = "",
    suffix = "",
    decimals = 0,
    title,
    subtitle,
    beforeVal,
    durationInFrames = 40,
  } = config;

  const effectiveStart =
    propStartFrame !== undefined
      ? propStartFrame
      : (config as any).startFrame || 0;
  const localFrame = Math.max(0, frame - effectiveStart);

  // Spring animation for the count-up
  const progress = spring({
    frame: localFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.5,
      stiffness: 140,
    },
  });

  const currentVal = interpolate(progress, [0, 1], [startVal, endVal]);
  const formattedNumber = currentVal.toFixed(decimals);

  // Scale and glow bounce on entry
  const scale = interpolate(progress, [0, 0.8, 1], [0.85, 1.05, 1.0]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        transform: `scale(${scale})`,
        direction: "rtl",
      }}
    >
      {title && (
        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            color: "rgba(255, 255, 255, 0.85)",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            textShadow: "0 4px 15px rgba(0,0,0,0.8)",
            letterSpacing: "-0.5px",
          }}
        >
          {title}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {beforeVal && (
          <span
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: "rgba(255, 80, 80, 0.7)",
              textDecoration: "line-through",
              fontFamily: "system-ui, sans-serif",
              marginRight: 10,
            }}
          >
            {beforeVal}
          </span>
        )}

        <div
          style={{
            fontSize: 98,
            fontWeight: 900,
            color: "#FFE600",
            fontFamily: "system-ui, 'Cairo', sans-serif",
            textShadow:
              "0 0 35px rgba(255, 230, 0, 0.7), 0 10px 25px rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "baseline",
          }}
        >
          {prefix && <span style={{ fontSize: 68, marginRight: 4 }}>{prefix}</span>}
          <span>{formattedNumber}</span>
          {suffix && <span style={{ fontSize: 62, marginLeft: 4 }}>{suffix}</span>}
        </div>
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#00FFCC",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            padding: "4px 18px",
            background: "rgba(0, 255, 204, 0.12)",
            borderRadius: 16,
            border: "1px solid rgba(0, 255, 204, 0.3)",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};

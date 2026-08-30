import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CalloutItem } from "../types/schema";

interface CalloutsProps {
  callouts?: CalloutItem[];
}

export const Callouts: React.FC<CalloutsProps> = ({ callouts = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!callouts || callouts.length === 0) return null;

  const activeCallouts = callouts.filter(
    (c) =>
      frame >= c.startFrame && frame <= c.startFrame + c.durationInFrames
  );

  if (activeCallouts.length === 0) return null;

  return (
    <>
      {activeCallouts.map((c) => (
        <SingleCallout key={c.id} callout={c} frame={frame} fps={fps} />
      ))}
    </>
  );
};

const SingleCallout: React.FC<{
  callout: CalloutItem;
  frame: number;
  fps: number;
}> = ({ callout, frame, fps }) => {
  const {
    type,
    x,
    y,
    size = 64,
    color = "#FFE600",
    label,
    startFrame,
    durationInFrames,
  } = callout;

  const entrance = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 12, mass: 0.5, stiffness: 180 },
  });

  const endFrame = startFrame + durationInFrames;
  const exitProgress =
    frame > endFrame - 10
      ? interpolate(frame, [endFrame - 10, endFrame], [1, 0])
      : 1;

  const scale = interpolate(entrance, [0, 1], [0.3, 1]) * exitProgress;
  const opacity = interpolate(entrance, [0, 1], [0, 1]) * exitProgress;

  return (
    <div
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        zIndex: 50,
        pointerEvents: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      {type === "arrow" && (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 4V20M12 20L18 14M12 20L6 14"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {type === "circle" && (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            border: `4px solid ${color}`,
            boxShadow: `0 0 25px ${color}aa`,
          }}
        />
      )}

      {type === "checkmark" && (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#000",
            fontSize: size * 0.55,
            fontWeight: 900,
            boxShadow: `0 0 20px ${color}88`,
          }}
        >
          ✓
        </div>
      )}

      {label && (
        <div
          style={{
            padding: "4px 14px",
            backgroundColor: "rgba(10, 15, 30, 0.9)",
            border: `1.5px solid ${color}`,
            borderRadius: 14,
            color: "#FFFFFF",
            fontSize: 20,
            fontWeight: 800,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 15px rgba(0,0,0,0.7)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BackgroundTypographyConfig } from "../types/schema";

interface BackgroundTypographyProps {
  config: BackgroundTypographyConfig;
}

export const BackgroundTypography: React.FC<BackgroundTypographyProps> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const {
    text,
    subText,
    glowColor = "#FFE600",
    fontSize = 96,
    opacity = 0.85,
    animate = true,
  } = config;

  const entrance = spring({
    frame,
    fps,
    config: {
      damping: 14,
      mass: 0.7,
      stiffness: 140,
    },
  });

  const scale = animate ? interpolate(entrance, [0, 1], [0.88, 1.0]) : 1.0;
  const translateY = animate
    ? interpolate(entrance, [0, 1], [40, 0])
    : 0;

  // Gentle ambient floating
  const floatOffset = Math.sin(frame * 0.05) * 6;

  return (
    <div
      style={{
        position: "absolute",
        top: "22%",
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10,
        pointerEvents: "none",
        opacity: opacity * interpolate(entrance, [0, 1], [0, 1]),
        transform: `translateY(${translateY + floatOffset}px) scale(${scale})`,
        textAlign: "center",
        direction: "rtl",
      }}
    >
      <div
        style={{
          fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
          fontSize,
          fontWeight: 900,
          color: "#FFFFFF",
          lineHeight: 1.1,
          letterSpacing: "-1px",
          textShadow: `0 0 45px ${glowColor}99, 0 15px 35px rgba(0,0,0,0.85)`,
          padding: "0 24px",
          WebkitTextStroke: "1.5px rgba(255, 255, 255, 0.4)",
        }}
      >
        {text}
      </div>

      {subText && (
        <div
          style={{
            fontFamily: "system-ui, 'Cairo', sans-serif",
            fontSize: Math.round(fontSize * 0.32),
            fontWeight: 900,
            color: glowColor,
            letterSpacing: "6px",
            textTransform: "uppercase",
            marginTop: 8,
            textShadow: "0 4px 15px rgba(0,0,0,0.9)",
          }}
        >
          {subText}
        </div>
      )}
    </div>
  );
};

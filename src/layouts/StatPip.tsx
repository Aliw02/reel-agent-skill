import React from "react";
import {
  AbsoluteFill,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SceneItem } from "../types/schema";
import { AnimatedCounter } from "../graphics/AnimatedCounter";

interface StatPipProps {
  scene: SceneItem;
  videoSrc?: string;
}

const resolveMediaSrc = (src?: string): string => {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  const filename = src.replace(/\\/g, "/").split("/").pop() || src;
  try {
    return staticFile(filename);
  } catch (e) {
    return src;
  }
};

export const StatPip: React.FC<StatPipProps> = ({ scene, videoSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pipEntrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 160 },
  });

  const pipScale = interpolate(pipEntrance, [0, 1], [0.7, 1]);
  const pipOpacity = interpolate(pipEntrance, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 40%, #17153B 0%, #0C0A20 60%, #05040A 100%)",
        overflow: "hidden",
      }}
    >
      {/* 1. Subtle background grid animation */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          opacity: 0.8,
        }}
      />

      {/* 2. Speaker Rounded PIP Window */}
      {videoSrc && (
        <div
          style={{
            position: "absolute",
            top: "14%",
            left: "50%",
            transform: `translateX(-50%) scale(${pipScale})`,
            opacity: pipOpacity,
            width: 380,
            height: 480,
            borderRadius: "36px",
            overflow: "hidden",
            border: "3px solid rgba(255, 230, 0, 0.75)",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(255, 230, 0, 0.3)",
            zIndex: 25,
          }}
        >
          <Video
            src={resolveMediaSrc(videoSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 35%",
            }}
          />
        </div>
      )}

      {/* 3. Dominant Center Stat Card & Animated Counter */}
      <div
        style={{
          position: "absolute",
          top: "48%",
          left: 44,
          right: 44,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 30,
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(20, 15, 35, 0.75) 100%)",
          backdropFilter: "blur(24px)",
          border: "1.5px solid rgba(255, 230, 0, 0.35)",
          borderRadius: "32px",
          padding: "36px 28px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
        }}
      >
        {scene.animatedCounter && (
          <AnimatedCounter config={scene.animatedCounter} />
        )}
      </div>
    </AbsoluteFill>
  );
};

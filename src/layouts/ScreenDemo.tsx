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

interface ScreenDemoProps {
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

export const ScreenDemo: React.FC<ScreenDemoProps> = ({ scene, videoSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const roi = scene.screenRoi?.roiBox || [0.15, 0.20, 0.70, 0.60];
  const targetZoom = scene.screenRoi?.zoomLevel || 1.7;

  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.7, stiffness: 130 },
  });

  const zoom = interpolate(entrance, [0, 1], [1.0, targetZoom]);
  const focalX = (roi[0] + roi[2] / 2.0) * 100;
  const focalY = (roi[1] + roi[3] / 2.0) * 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#05050A",
        overflow: "hidden",
      }}
    >
      {/* 1. Main Screen Footage with Smooth ROI Focus */}
      {videoSrc && (
        <AbsoluteFill
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: `${focalX}% ${focalY}%`,
          }}
        >
          <Video
            src={resolveMediaSrc(videoSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              objectPosition: "center",
            }}
          />
        </AbsoluteFill>
      )}

      {/* 2. Top UI Badge Indicator */}
      {scene.screenRoi?.label && (
        <div
          style={{
            position: "absolute",
            top: 150,
            left: 44,
            padding: "8px 20px",
            background: "rgba(10, 15, 30, 0.85)",
            backdropFilter: "blur(16px)",
            borderRadius: "16px",
            border: "1px solid rgba(0, 255, 204, 0.5)",
            color: "#00FFCC",
            fontSize: 22,
            fontWeight: 800,
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            zIndex: 40,
            boxShadow: "0 8px 25px rgba(0,0,0,0.6)",
          }}
        >
          Focus: {scene.screenRoi.label}
        </div>
      )}
    </AbsoluteFill>
  );
};

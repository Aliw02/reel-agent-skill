import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { SceneItem } from "../types/schema";

interface FullscreenBrollProps {
  scene: SceneItem;
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

export const FullscreenBroll: React.FC<FullscreenBrollProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const brollSrc = scene.brollSrc || "";
  const isVideo = brollSrc.endsWith(".mp4") || brollSrc.endsWith(".webm");

  // Subtle cinematic slow-push
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.08], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#000000",
        overflow: "hidden",
      }}
    >
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        {brollSrc ? (
          isVideo ? (
            <OffthreadVideo
              src={resolveMediaSrc(brollSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <Img
              src={resolveMediaSrc(brollSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "radial-gradient(circle, #1E1B4B 0%, #0F172A 100%)",
            }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { SceneItem } from "../types/schema";

interface TalkingHeadFullProps {
  scene: SceneItem;
  videoSrc?: string;
  cameraScale?: number;
  focalPoint?: [number, number];
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

export const TalkingHeadFull: React.FC<TalkingHeadFullProps> = ({
  scene,
  videoSrc,
  cameraScale = 1.0,
  focalPoint = [0.5, 0.38],
}) => {
  const fx = focalPoint[0] * 100;
  const fy = focalPoint[1] * 100;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A0A0E",
        overflow: "hidden",
      }}
    >
      {videoSrc ? (
        <AbsoluteFill
          style={{
            transform: `scale(${cameraScale})`,
            transformOrigin: `${fx}% ${fy}%`,
          }}
        >
          <OffthreadVideo
            src={resolveMediaSrc(videoSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${fx}% ${fy}%`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle, #1E1B4B 0%, #0F172A 100%)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

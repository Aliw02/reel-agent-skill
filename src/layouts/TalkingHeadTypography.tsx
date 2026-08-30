import React from "react";
import { AbsoluteFill, Video, staticFile } from "remotion";
import { SceneItem } from "../types/schema";
import { BackgroundTypography } from "../graphics/BackgroundTypography";

interface TalkingHeadTypographyProps {
  scene: SceneItem;
  videoSrc?: string;
  cutoutVideoSrc?: string;
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

export const TalkingHeadTypography: React.FC<TalkingHeadTypographyProps> = ({
  scene,
  videoSrc,
  cameraScale = 1.05,
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
      {/* 1. Crisp Full Video Layer with Dynamic Camera Framing */}
      {videoSrc ? (
        <AbsoluteFill
          style={{
            transform: `scale(${cameraScale})`,
            transformOrigin: `${fx}% ${fy}%`,
          }}
        >
          <Video
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

      {/* 2. Sleek Floating Keyword Badge (Top Negative Space) */}
      {scene.backgroundTypography?.text && (
        <div
          style={{
            position: "absolute",
            top: 140,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              padding: "10px 28px",
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(20px)",
              border: "1.5px solid rgba(255, 230, 0, 0.5)",
              borderRadius: "20px",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 230, 0, 0.2)",
              color: "#FFE600",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              fontSize: 32,
              fontWeight: 900,
              textAlign: "center",
              letterSpacing: "0.5px",
            }}
          >
            {scene.backgroundTypography.text}
          </div>
          {scene.backgroundTypography.subText && (
            <div
              style={{
                marginTop: 6,
                color: "rgba(255, 255, 255, 0.85)",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "2px",
                textTransform: "uppercase",
                fontFamily: "'Cairo', sans-serif",
                textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              }}
            >
              {scene.backgroundTypography.subText}
            </div>
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

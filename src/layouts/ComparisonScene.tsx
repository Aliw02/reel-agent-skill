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

interface ComparisonSceneProps {
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

export const ComparisonScene: React.FC<ComparisonSceneProps> = ({
  scene,
  videoSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 150 },
  });

  const cardOffset = interpolate(entrance, [0, 1], [60, 0]);
  const cardOpacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 50% 30%, #161129 0%, #0A0814 60%, #030206 100%)",
        overflow: "hidden",
      }}
    >
      {/* 1. Subtle Background Ambient Glow */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "80%",
          height: "30%",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 230, 0, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* 2. Top Header Title */}
      <div
        style={{
          position: "absolute",
          top: 130,
          left: 44,
          right: 44,
          textAlign: "center",
          fontFamily: "'Cairo', 'Tajawal', sans-serif",
          fontSize: 38,
          fontWeight: 900,
          color: "#FFFFFF",
          textShadow: "0 4px 20px rgba(0,0,0,0.8)",
          zIndex: 20,
        }}
      >
        مقارنة النتائج والخيارات
      </div>

      {/* 3. Side-by-Side Comparison Container */}
      <div
        style={{
          position: "absolute",
          top: 240,
          bottom: 340,
          left: 40,
          right: 40,
          display: "flex",
          gap: 20,
          zIndex: 30,
          transform: `translateY(${cardOffset}px)`,
          opacity: cardOpacity,
        }}
      >
        {/* Left Option (Negative / Old) */}
        <div
          style={{
            flex: 1,
            borderRadius: "28px",
            background: "rgba(25, 15, 25, 0.75)",
            border: "1.5px solid rgba(255, 0, 122, 0.4)",
            backdropFilter: "blur(20px)",
            padding: "24px 18px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              padding: "6px 16px",
              borderRadius: "12px",
              background: "rgba(255, 0, 122, 0.2)",
              color: "#FF007A",
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "'Cairo', sans-serif",
              marginBottom: 20,
            }}
          >
            المونتاج التقليدي
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#A0A0B0",
              textAlign: "center",
              fontFamily: "'Tajawal', sans-serif",
              lineHeight: 1.5,
            }}
          >
            • وقت طويل جداً<br />
            • تكلفة إنتاج مرتفعة<br />
            • صعوبة التعديل
          </div>
        </div>

        {/* Right Option (Positive / AI V3) */}
        <div
          style={{
            flex: 1,
            borderRadius: "28px",
            background: "rgba(10, 30, 25, 0.8)",
            border: "2px solid #00FFCC",
            backdropFilter: "blur(20px)",
            padding: "24px 18px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 20px 50px rgba(0, 255, 204, 0.25)",
          }}
        >
          <div
            style={{
              padding: "6px 16px",
              borderRadius: "12px",
              background: "rgba(0, 255, 204, 0.25)",
              color: "#00FFCC",
              fontSize: 22,
              fontWeight: 800,
              fontFamily: "'Cairo', sans-serif",
              marginBottom: 20,
            }}
          >
            الذكاء الاصطناعي V3
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#E2E8F0",
              textAlign: "center",
              fontFamily: "'Tajawal', sans-serif",
              lineHeight: 1.5,
              fontWeight: 600,
            }}
          >
            • سرعة إنجاز فائقة<br />
            • توفير 85% من التكلفة<br />
            • جودة سينمائية 60FPS
          </div>
        </div>
      </div>

      {/* 4. Small Speaker PIP in Bottom Zone */}
      {videoSrc && (
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 190,
            height: 240,
            borderRadius: "24px",
            overflow: "hidden",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
            zIndex: 35,
          }}
        >
          <Video
            src={resolveMediaSrc(videoSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "50% 30%",
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

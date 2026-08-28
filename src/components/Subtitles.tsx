import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SubtitleChunk } from "../types/schema";

interface SubtitlesProps {
  subtitles: SubtitleChunk[];
  highlightColor?: string;
}

export const Subtitles: React.FC<SubtitlesProps> = ({
  subtitles,
  highlightColor = "#FFE600",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentChunk = subtitles.find(
    (chunk) => frame >= chunk.startFrame && frame <= chunk.endFrame
  );

  if (!currentChunk) {
    return null;
  }

  // Pop-in animation for the subtitle chunk
  const chunkProgress = spring({
    frame: frame - currentChunk.startFrame,
    fps,
    config: {
      damping: 12,
      mass: 0.5,
      stiffness: 180,
    },
  });

  const scale = interpolate(chunkProgress, [0, 1], [0.85, 1]);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 340,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 40px",
        textAlign: "center",
        transform: `scale(${scale})`,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          background: "rgba(0, 0, 0, 0.45)",
          backdropFilter: "blur(12px)",
          padding: "16px 28px",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 10px 35px rgba(0, 0, 0, 0.5)",
        }}
      >
        {currentChunk.words.map((w, idx) => {
          const isWordActive = frame >= w.startFrame && frame <= w.endFrame;

          return (
            <span
              key={idx}
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
                fontSize: 58,
                fontWeight: 900,
                color: isWordActive
                  ? highlightColor
                  : w.highlight
                  ? "#00FFCC"
                  : "#FFFFFF",
                textTransform: "uppercase",
                letterSpacing: "1px",
                textShadow: isWordActive
                  ? `0 0 20px ${highlightColor}, 0 4px 8px rgba(0,0,0,0.8)`
                  : "0 4px 10px rgba(0, 0, 0, 0.9)",
                transform: isWordActive ? "scale(1.12)" : "scale(1)",
                transition: "transform 0.05s ease-out",
                display: "inline-block",
              }}
            >
              {w.word}
            </span>
          );
        })}

        {currentChunk.emoji && (
          <span
            style={{
              fontSize: 64,
              filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.5))",
            }}
          >
            {currentChunk.emoji}
          </span>
        )}
      </div>
    </div>
  );
};

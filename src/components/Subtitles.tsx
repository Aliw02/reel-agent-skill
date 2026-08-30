import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { SubtitleChunk, CaptionStyleConfig, CaptionTheme } from "../types/schema";

interface SubtitlesProps {
  subtitles: SubtitleChunk[];
  styleConfig?: CaptionStyleConfig;
  highlightColor?: string; // backward compat
}

export const Subtitles: React.FC<SubtitlesProps> = ({
  subtitles = [],
  styleConfig,
  highlightColor: legacyHighlightColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Find active chunk
  const currentChunk = subtitles.find(
    (chunk) => frame >= chunk.startFrame && frame <= chunk.endFrame
  );

  if (!currentChunk) {
    return null;
  }

  // Theme & style resolution
  const theme: CaptionTheme = styleConfig?.theme || "box_glass";
  const direction = styleConfig?.direction || "rtl";
  const fontFamily =
    styleConfig?.fontFamily ||
    "'Cairo', 'Tajawal', 'Readex Pro', 'Noto Sans Arabic', system-ui, -apple-system, sans-serif";
  const fontSize = styleConfig?.fontSize || 56;
  const activeColor = styleConfig?.activeWordColor || "#00FFCC";
  const highlightColor =
    styleConfig?.highlightColor || legacyHighlightColor || "#FFE600";
  const inactiveColor = styleConfig?.inactiveWordColor || "#FFFFFF";
  const positionBottom = styleConfig?.positionBottom || 340;
  const isArabic = direction === "rtl";

  // Pop-in spring animation for the chunk (Frame-driven, deterministic)
  const chunkProgress = spring({
    frame: frame - currentChunk.startFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.5,
      stiffness: 200,
    },
  });

  const scale = interpolate(chunkProgress, [0, 1], [0.88, 1]);
  const opacity = interpolate(chunkProgress, [0, 0.4, 1], [0, 0.9, 1]);

  // Determine container styling based on theme
  const getContainerStyle = (): React.CSSProperties => {
    switch (theme) {
      case "neon":
        return {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          padding: "12px 24px",
          direction,
        };
      case "bold_yellow":
        return {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          background: "rgba(0, 0, 0, 0.85)",
          padding: "16px 28px",
          borderRadius: "18px",
          border: "2px solid #FFE600",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.8)",
          direction,
        };
      case "clean_white":
        return {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          padding: "10px 20px",
          direction,
        };
      case "cyber":
        return {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          background:
            "linear-gradient(135deg, rgba(20, 10, 40, 0.8) 0%, rgba(10, 30, 60, 0.8) 100%)",
          backdropFilter: "blur(16px)",
          padding: "16px 30px",
          borderRadius: "20px",
          border: "1.5px solid rgba(0, 255, 204, 0.4)",
          boxShadow: "0 10px 35px rgba(0, 255, 204, 0.2)",
          direction,
        };
      case "box_glass":
      default:
        return {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "14px",
          background: "rgba(0, 0, 0, 0.55)",
          backdropFilter: "blur(14px)",
          padding: "16px 30px",
          borderRadius: "24px",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.6)",
          direction,
        };
    }
  };

  const secondaryFontFamily =
    styleConfig?.secondaryFontFamily ||
    "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const secondaryFontSize = styleConfig?.secondaryFontSize || Math.round(fontSize * 0.58);
  const secondaryColor = styleConfig?.secondaryColor || "#94A3B8";

  return (
    <div
      style={{
        position: "absolute",
        bottom: positionBottom,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 40px",
        textAlign: "center",
        transform: `scale(${scale})`,
        opacity,
        zIndex: 50,
        direction,
        unicodeBidi: "isolate",
      }}
    >
      <div
        style={{
          ...getContainerStyle(),
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {/* Primary Line: Spoken Arabic with Active Word Glow */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "12px",
            direction,
          }}
        >
          {currentChunk.words.map((w, idx) => {
            const isWordActive = frame >= w.startFrame && frame <= w.endFrame;

            // Deterministic frame-based spring bounce for active word
            let wordScale = 1;
            if (isWordActive) {
              const wordProgress = spring({
                frame: frame - w.startFrame,
                fps,
                config: { damping: 12, mass: 0.3, stiffness: 220 },
              });
              wordScale = interpolate(wordProgress, [0, 1], [1.0, 1.12]);
            }

            // Determine word color
            let color = inactiveColor;
            if (isWordActive) {
              color = activeColor;
            } else if (w.highlight) {
              color = highlightColor;
            }

            // Determine text shadow per theme
            let textShadow = "0 3px 8px rgba(0, 0, 0, 0.9)";
            if (isWordActive) {
              textShadow = `0 0 24px ${activeColor}, 0 4px 10px rgba(0, 0, 0, 0.9)`;
            } else if (w.highlight) {
              textShadow = `0 0 16px ${highlightColor}, 0 3px 8px rgba(0, 0, 0, 0.8)`;
            }

            return (
              <span
                key={idx}
                dir="auto"
                style={{
                  fontFamily,
                  fontSize,
                  fontWeight: 900,
                  color,
                  textTransform: isArabic ? "none" : styleConfig?.uppercase ? "uppercase" : "none",
                  letterSpacing: isArabic ? "normal" : "0.5px",
                  lineHeight: 1.25,
                  textShadow,
                  transform: `scale(${wordScale})`,
                  display: "inline-block",
                  unicodeBidi: "plaintext",
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>

        {/* Secondary Line: Executive English Subtitle Translation (Zero Emojis) */}
        {currentChunk.translation && (
          <div
            style={{
              fontFamily: secondaryFontFamily,
              fontSize: secondaryFontSize,
              fontWeight: 600,
              color: secondaryColor,
              letterSpacing: "0.4px",
              lineHeight: 1.2,
              direction: "ltr",
              textShadow: "0 2px 6px rgba(0,0,0,0.8)",
              opacity: 0.9,
            }}
          >
            {currentChunk.translation}
          </div>
        )}
      </div>
    </div>
  );
};

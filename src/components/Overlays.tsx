import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { OverlayItem } from "../types/schema";

interface OverlaysProps {
  overlays?: OverlayItem[];
}

export const Overlays: React.FC<OverlaysProps> = ({ overlays = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!overlays || overlays.length === 0) {
    return null;
  }

  // Filter overlays visible in the current frame
  const activeOverlays = overlays.filter(
    (item) =>
      frame >= item.startFrame &&
      frame <= item.startFrame + item.durationInFrames
  );

  if (activeOverlays.length === 0) {
    return null;
  }

  return (
    <>
      {activeOverlays.map((item) => (
        <SingleOverlay key={item.id} item={item} frame={frame} fps={fps} />
      ))}
    </>
  );
};

interface SingleOverlayProps {
  item: OverlayItem;
  frame: number;
  fps: number;
}

const SingleOverlay: React.FC<SingleOverlayProps> = ({ item, frame, fps }) => {
  const {
    startFrame,
    durationInFrames,
    type,
    title,
    text,
    items,
    statNumber,
    statLabel,
    icon,
    position = "top",
    theme = "glass",
    codeSnippet,
    codeLanguage,
  } = item;

  const endFrame = startFrame + durationInFrames;

  // Entrance spring animation (deterministic)
  const entrance = spring({
    frame: frame - startFrame,
    fps,
    config: {
      damping: 14,
      mass: 0.6,
      stiffness: 150,
    },
  });

  // Exit animation (last 15 frames)
  const isExiting = frame > endFrame - 15;
  const exitProgress = isExiting
    ? interpolate(frame, [endFrame - 15, endFrame], [1, 0], {
        extrapolateRight: "clamp",
      })
    : 1;

  const translateY =
    position === "bottom"
      ? interpolate(entrance, [0, 1], [100, 0]) * exitProgress
      : interpolate(entrance, [0, 1], [-100, 0]) * exitProgress;

  const opacity = interpolate(entrance, [0, 1], [0, 1]) * exitProgress;
  const scale = interpolate(entrance, [0, 1], [0.92, 1]);

  // Position CSS
  const getPositionStyles = (): React.CSSProperties => {
    switch (position) {
      case "center":
        return {
          top: "40%",
          transform: `translateY(calc(-50% + ${translateY}px)) scale(${scale})`,
        };
      case "bottom":
        return {
          bottom: 220,
          transform: `translateY(${translateY}px) scale(${scale})`,
        };
      case "top":
      default:
        return {
          top: 180,
          transform: `translateY(${translateY}px) scale(${scale})`,
        };
    }
  };

  // Base card background by theme
  const getThemeBackground = (): React.CSSProperties => {
    switch (theme) {
      case "neon":
        return {
          background: "rgba(10, 15, 30, 0.88)",
          backdropFilter: "blur(20px)",
          border: "2px solid #00FFCC",
          boxShadow: "0 15px 45px rgba(0, 255, 204, 0.3)",
        };
      case "gradient":
        return {
          background:
            "linear-gradient(135deg, rgba(30, 20, 60, 0.9) 0%, rgba(15, 10, 30, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          border: "1.5px solid rgba(255, 230, 0, 0.4)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
        };
      case "minimal":
        return {
          background: "rgba(0, 0, 0, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
        };
      case "glass":
      default:
        return {
          background:
            "linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(0, 0, 0, 0.65) 100%)",
          backdropFilter: "blur(24px)",
          border: "1.5px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.65)",
        };
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 44,
        right: 44,
        display: "flex",
        justifyContent: "center",
        opacity,
        zIndex: 40,
        direction: "rtl",
        ...getPositionStyles(),
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          borderRadius: "28px",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          ...getThemeBackground(),
        }}
      >
        {/* Stat Type */}
        {type === "stat" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
            }}
          >
            <div>
              {title && (
                <div
                  style={{
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: 26,
                    fontWeight: 700,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  }}
                >
                  {title}
                </div>
              )}
              {statLabel && (
                <div
                  style={{
                    color: "#FFFFFF",
                    fontSize: 32,
                    fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  }}
                >
                  {statLabel}
                </div>
              )}
            </div>
            <div
              style={{
                fontFamily: "system-ui, sans-serif",
                fontSize: 64,
                fontWeight: 900,
                color: "#FFE600",
                textShadow: "0 0 25px rgba(255, 230, 0, 0.6)",
              }}
            >
              {statNumber}
            </div>
          </div>
        )}

        {/* Quote Type */}
        {type === "quote" && (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <span style={{ fontSize: 48, color: "#00FFCC", lineHeight: 1 }}>
              ❝
            </span>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: 32,
                  fontWeight: 800,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  lineHeight: 1.4,
                }}
              >
                {text}
              </div>
              {title && (
                <div
                  style={{
                    color: "#FFE600",
                    fontSize: 24,
                    fontWeight: 700,
                    marginTop: 8,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  }}
                >
                  — {title}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bullet List Type */}
        {type === "bullet_list" && (
          <div>
            {title && (
              <div
                style={{
                  color: "#FFE600",
                  fontSize: 32,
                  fontWeight: 900,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  marginBottom: 12,
                }}
              >
                {title}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items?.map((bullet, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 28,
                    fontWeight: 700,
                    color: "#FFFFFF",
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  }}
                >
                  <span
                    style={{
                      background: "#00FFCC",
                      color: "#000",
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    ✓
                  </span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Snippet Type */}
        {type === "code" && (
          <div>
            {title && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "rgba(255, 255, 255, 0.7)",
                  fontSize: 22,
                  fontFamily: "monospace",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                  paddingBottom: 8,
                  marginBottom: 10,
                }}
              >
                <span>{title}</span>
                {codeLanguage && <span>{codeLanguage}</span>}
              </div>
            )}
            <pre
              dir="ltr"
              style={{
                fontFamily: "'Fira Code', Consolas, Monaco, monospace",
                fontSize: 24,
                color: "#00FFCC",
                margin: 0,
                overflowX: "hidden",
                whiteSpace: "pre-wrap",
                lineHeight: 1.4,
              }}
            >
              <code>{codeSnippet || text}</code>
            </pre>
          </div>
        )}

        {/* Default Card / Lower Third */}
        {(type === "card" || type === "lower_third" || type === "badge") && (
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {icon && (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #00FFCC 0%, #0077FF 100%)",
                  width: 52,
                  height: 52,
                  borderRadius: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 28,
                  boxShadow: "0 4px 15px rgba(0, 255, 204, 0.4)",
                  flexShrink: 0,
                }}
              >
                {icon}
              </div>
            )}
            <div style={{ flex: 1 }}>
              {title && (
                <div
                  style={{
                    color: "#FFE600",
                    fontSize: 26,
                    fontWeight: 900,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    marginBottom: 4,
                  }}
                >
                  {title}
                </div>
              )}
              <div
                style={{
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  lineHeight: 1.35,
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                {text}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

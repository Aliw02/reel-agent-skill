import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ReelProps, ZoomEvent, ReframeEvent } from "./types/schema";
import { Subtitles } from "./components/Subtitles";
import { Overlays } from "./components/Overlays";
import { ProgressBar } from "./components/ProgressBar";

const resolveMediaSrc = (src?: string): string => {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  const filename = src.replace(/\\/g, "/").split("/").pop() || src;
  try {
    return staticFile(filename);
  } catch (e) {
    return src;
  }
};

export const ReelComposition: React.FC<ReelProps> = ({
  videoSrc,
  subtitles = [],
  overlays = [],
  zoomEvents = [],
  reframeEvents = [],
  mediaOverlays = [],
  audio,
  captionStyle,
  progressBar,
  hook,
  title,
  highlightColor,
  infoCard,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // 1. DYNAMIC SMART CAMERA CHOREOGRAPHY (Punch-ins, Slow Push/Pull, Snap, Shake)
  let currentZoom = 1.0;
  let originX = "50%";
  let originY = "40%";
  let shakeOffset = 0;

  if (zoomEvents && zoomEvents.length > 0) {
    for (const z of zoomEvents) {
      const zEnd = z.startFrame + (z.durationInFrames || (z.endFrame ? z.endFrame - z.startFrame : 60));
      if (frame >= z.startFrame && frame <= zEnd) {
        originX = z.originX || "50%";
        originY = z.originY || "40%";
        const targetScale = z.scale || 1.18;
        const eventDuration = zEnd - z.startFrame;
        const progress = (frame - z.startFrame) / Math.max(1, eventDuration);
        const mode = z.type || "punch_in";

        if (mode === "slow_zoom_in" || mode === "slow_zoom") {
          // Slow cinematic push-in
          currentZoom = interpolate(progress, [0, 1], [1.0, targetScale], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        } else if (mode === "slow_zoom_out") {
          // Slow cinematic pull-out
          currentZoom = interpolate(progress, [0, 1], [targetScale, 1.0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        } else if (mode === "snap") {
          // Hard instant punch cut
          currentZoom = targetScale;
        } else if (mode === "shake") {
          // High-energy impact shake
          currentZoom = targetScale;
          shakeOffset = Math.sin((frame - z.startFrame) * 1.5) * 8 * (1 - progress);
        } else {
          // Default: Spring Punch-in with smooth return
          const entranceFrames = Math.min(12, Math.floor(eventDuration * 0.25));
          const exitFrames = Math.min(12, Math.floor(eventDuration * 0.25));
          const holdEnd = zEnd - exitFrames;

          if (frame < z.startFrame + entranceFrames) {
            const p = spring({
              frame: frame - z.startFrame,
              fps,
              config: { damping: 12, mass: 0.4, stiffness: 200 },
            });
            currentZoom = interpolate(p, [0, 1], [1.0, targetScale]);
          } else if (frame > holdEnd) {
            const exitProgress = (frame - holdEnd) / exitFrames;
            currentZoom = interpolate(exitProgress, [0, 1], [targetScale, 1.0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
          } else {
            currentZoom = targetScale;
          }
        }
        break;
      }
    }
  } else {
    // Subtle baseline ambient breathing zoom (1.00 -> 1.03 over full duration)
    currentZoom = interpolate(frame, [0, durationInFrames], [1.0, 1.03], {
      extrapolateRight: "clamp",
    });
  }

  // 2. AUTO-REFRAME / SUBJECT CENTERING
  let focalX = 50;
  let focalY = 40;
  if (reframeEvents && reframeEvents.length > 0) {
    for (const r of reframeEvents) {
      if (frame >= r.startFrame && frame <= r.startFrame + r.durationInFrames) {
        focalX = r.centerX * 100;
        focalY = r.centerY * 100;
        break;
      }
    }
  }

  // 3. AUDIO ENGINE & DUCKING CALCULATION
  // Check if current frame coincides with active speech in subtitles
  const isSpeaking = subtitles.some(
    (sub) => frame >= sub.startFrame && frame <= sub.endFrame
  );

  const bgmBaseVol = audio?.bgmVolume ?? 0.15;
  const duckVol = audio?.duckingVolume ?? 0.04;
  const bgmVolume = isSpeaking ? duckVol : bgmBaseVol;

  // 4. ANIMATED HOOK / TITLE SEQUENCE (First 75 frames if enabled)
  const isHookActive = hook?.enabled !== false && (hook?.title || title);
  const hookDuration = hook?.durationInFrames || 75;
  const hookVisible = isHookActive && frame < hookDuration;

  let hookOpacity = 0;
  let hookTranslateY = 0;
  if (hookVisible) {
    const hookEntrance = spring({
      frame,
      fps,
      config: { damping: 14, mass: 0.5, stiffness: 180 },
    });
    const hookExitProgress =
      frame > hookDuration - 15
        ? interpolate(frame, [hookDuration - 15, hookDuration], [1, 0])
        : 1;

    hookOpacity = interpolate(hookEntrance, [0, 1], [0, 1]) * hookExitProgress;
    hookTranslateY =
      interpolate(hookEntrance, [0, 1], [-80, 0]) * hookExitProgress;
  }

  // Backward compatibility: Convert single legacy infoCard to overlays format if provided
  const combinedOverlays = [...overlays];
  if (infoCard && infoCard.enabled) {
    combinedOverlays.push({
      id: "legacy-info-card",
      type: "card",
      startFrame: infoCard.startFrame,
      durationInFrames: infoCard.durationInFrames,
      text: infoCard.text,
      icon: "💡",
      theme: "glass",
    });
  }

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0A0A0E",
        overflow: "hidden",
      }}
    >
      {/* 1. Main Talking-Head Video Layer with Smart Zoom & Reframe */}
      {videoSrc ? (
        <AbsoluteFill
          style={{
            transform: `scale(${currentZoom})`,
            transformOrigin: `${originX} ${originY}`,
          }}
        >
          <OffthreadVideo
            src={resolveMediaSrc(videoSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: `${focalX}% ${focalY}%`,
            }}
          />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill
          style={{
            background: "radial-gradient(circle, #1E1B4B 0%, #0F172A 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <h1
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontFamily: "'Cairo', system-ui, sans-serif",
              textAlign: "center",
            }}
          >
            🎬 Preview Placeholder
          </h1>
        </AbsoluteFill>
      )}

      {/* 2. Media / B-roll Overlays Layer & Visual Stickers */}
      {mediaOverlays.map((media) => {
        const isMediaActive =
          frame >= media.startFrame &&
          frame <= media.startFrame + media.durationInFrames;
        if (!isMediaActive) return null;

        const mediaSpring = spring({
          frame: frame - media.startFrame,
          fps,
          config: { damping: 12, mass: 0.4, stiffness: 200 },
        });

        // Compute positioning styles
        const isPip = media.position === "top-right" || media.position === "top-left" || media.position === "bottom-right" || media.position === "bottom-left" || media.top !== undefined || media.right !== undefined;
        
        let positionStyle: React.CSSProperties = {
          position: "absolute",
          zIndex: 35,
          opacity: interpolate(mediaSpring, [0, 1], [0, 1]),
          transform: `scale(${interpolate(mediaSpring, [0, 1], [0.8, 1])}) rotate(${interpolate(mediaSpring, [0, 1], [-8, 0])}deg)`,
        };

        if (media.position === "top-right" || (!media.position && media.right !== undefined)) {
          positionStyle = {
            ...positionStyle,
            top: media.top ?? "14%",
            right: media.right ?? "6%",
            width: media.width ?? 320,
          };
        } else if (media.position === "top-left" || (!media.position && media.left !== undefined)) {
          positionStyle = {
            ...positionStyle,
            top: media.top ?? "14%",
            left: media.left ?? "6%",
            width: media.width ?? 320,
          };
        } else if (media.position === "bottom-right") {
          positionStyle = {
            ...positionStyle,
            bottom: media.bottom ?? "20%",
            right: media.right ?? "6%",
            width: media.width ?? 300,
          };
        } else {
          // Centered full overlay
          return (
            <AbsoluteFill
              key={media.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                opacity: interpolate(mediaSpring, [0, 1], [0, 1]),
                transform: `scale(${interpolate(mediaSpring, [0, 1], [0.9, 1])})`,
                zIndex: 30,
              }}
            >
              {media.type === "video" ? (
                <OffthreadVideo
                  src={resolveMediaSrc(media.src)}
                  style={{
                    width: "90%",
                    maxHeight: "70%",
                    borderRadius: media.borderRadius || 24,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                    border: "2px solid rgba(255,255,255,0.2)",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Img
                  src={resolveMediaSrc(media.src)}
                  style={{
                    width: "90%",
                    maxHeight: "70%",
                    borderRadius: media.borderRadius || 24,
                    boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
                    border: "2px solid rgba(255,255,255,0.2)",
                    objectFit: "contain",
                  }}
                />
              )}
            </AbsoluteFill>
          );
        }

        return (
          <div key={media.id} style={positionStyle}>
            <div
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                filter: "drop-shadow(0 15px 35px rgba(0, 0, 0, 0.7))",
              }}
            >
              <Img
                src={resolveMediaSrc(media.src)}
                style={{
                  width: "100%",
                  height: "auto",
                  borderRadius: media.borderRadius || 24,
                  objectFit: "contain",
                }}
              />
              {media.label && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "6px 16px",
                    background: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(12px)",
                    borderRadius: 14,
                    border: "1px solid rgba(255, 230, 0, 0.4)",
                    color: "#FFE600",
                    fontSize: 22,
                    fontWeight: 800,
                    fontFamily: "'Cairo', 'Tajawal', sans-serif",
                    textAlign: "center",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
                  }}
                >
                  {media.label}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 3. Cinematic Contrast Vignette */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 65%, rgba(0,0,0,0.88) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* 4. Optional Top Progress Bar */}
      <ProgressBar config={progressBar} />

      {/* 5. Hook / Title Banner Overlay */}
      {hookVisible && (
        <div
          style={{
            position: "absolute",
            top: 140,
            left: 40,
            right: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: hookOpacity,
            transform: `translateY(${hookTranslateY}px)`,
            zIndex: 45,
            direction: "rtl",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 230, 0, 0.95) 0%, rgba(255, 170, 0, 0.95) 100%)",
              color: "#000000",
              padding: "16px 36px",
              borderRadius: "22px",
              fontWeight: 900,
              fontSize: 38,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              boxShadow: "0 15px 40px rgba(255, 230, 0, 0.5)",
              textAlign: "center",
            }}
          >
            {hook?.title || title}
          </div>
          {hook?.subtitle && (
            <div
              style={{
                color: "#FFFFFF",
                fontSize: 24,
                fontWeight: 700,
                marginTop: 8,
                textShadow: "0 2px 10px rgba(0,0,0,0.9)",
                fontFamily: "'Cairo', 'Tajawal', sans-serif",
              }}
            >
              {hook.subtitle}
            </div>
          )}
        </div>
      )}

      {/* 6. Multi-Overlay Timeline (Cards, Quotes, Stats, Bullet lists, Code) */}
      <Overlays overlays={combinedOverlays} />

      {/* 7. RTL Kinetic Subtitles */}
      <Subtitles
        subtitles={subtitles}
        styleConfig={captionStyle}
        highlightColor={highlightColor}
      />

      {/* 8. Background Music Layer with Automatic Ducking */}
      {audio?.bgmSrc && (
        <Audio
          src={resolveMediaSrc(audio.bgmSrc)}
          volume={bgmVolume}
          loop
        />
      )}

      {/* 9. Sound Effects (SFX) Triggers */}
      {audio?.sfxEvents?.map((sfx, idx) => {
        if (frame === sfx.startFrame) {
          return (
            <Audio
              key={idx}
              src={sfx.src}
              volume={sfx.volume ?? 0.5}
            />
          );
        }
        return null;
      })}
    </AbsoluteFill>
  );
};

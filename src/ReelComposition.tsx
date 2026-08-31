import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  Audio,
  Sequence,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ReelProps } from "./types/schema";
import { SceneRenderer } from "./scenes/SceneRenderer";
import { TransitionRenderer } from "./transitions/TransitionRenderer";
import { Callouts } from "./graphics/Callouts";
import { Waveform } from "./graphics/Waveform";
import { ColorTreatment } from "./color/ColorTreatment";
import { Subtitles } from "./components/Subtitles";
import { Overlays } from "./components/Overlays";
import { ProgressBar } from "./components/ProgressBar";

const resolveMediaSrc = (src?: string, assetBaseUrl?: string): string => {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src;
  }
  const filename = src.replace(/\\/g, "/").split("/").pop() || src;
  if (assetBaseUrl) {
    return assetBaseUrl + filename;
  }
  try {
    return staticFile(filename);
  } catch (e) {
    return src;
  }
};

export const ReelComposition: React.FC<ReelProps> = ({
  videoSrc,
  cutoutVideoSrc,
  subtitles = [],
  scenes = [],
  transitions = [],
  overlays = [],
  zoomEvents = [],
  reframeEvents = [],
  mediaOverlays = [],
  callouts = [],
  waveform,
  audio,
  color,
  captionStyle,
  progressBar,
  hook,
  title,
  highlightColor,
  infoCard,
  subjectTracking,
  assetBaseUrl,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  // 1. SMART CAMERA RIG CHOREOGRAPHY
  let currentZoom = 1.0;
  let originX = "50%";
  let originY = "40%";

  if (zoomEvents && zoomEvents.length > 0) {
    for (const z of zoomEvents) {
      const zEnd =
        z.startFrame +
        (z.durationInFrames || (z.endFrame ? z.endFrame - z.startFrame : 60));
      if (frame >= z.startFrame && frame <= zEnd) {
        originX = z.originX || "50%";
        originY = z.originY || "40%";
        const targetScale = z.scale || 1.18;
        const eventDuration = zEnd - z.startFrame;
        const progress = (frame - z.startFrame) / Math.max(1, eventDuration);
        const mode = z.type || "punch_in";

        if (mode === "slow_zoom_in" || mode === "slow_zoom") {
          currentZoom = interpolate(progress, [0, 1], [1.0, targetScale], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        } else if (mode === "slow_zoom_out") {
          currentZoom = interpolate(progress, [0, 1], [targetScale, 1.0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
        } else if (mode === "snap") {
          currentZoom = targetScale;
        } else {
          // Spring Punch-in
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
  }

  // 2. AUDIO ENGINE & DUCKING
  const isSpeaking = subtitles.some(
    (sub) => frame >= sub.startFrame && frame <= sub.endFrame
  );
  const bgmBaseVol = audio?.bgmVolume ?? 0.14;
  const duckVol = audio?.duckingVolume ?? audio?.duckedVolume ?? 0.035;
  const bgmVolume = isSpeaking ? duckVol : bgmBaseVol;

  // 3. HOOK BANNER
  const isHookActive = hook?.enabled !== false && (hook?.title || title);
  const hookDuration = hook?.durationInFrames || 85;
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

  // 4. OVERLAYS ADAPTER (Legacy backwards compatibility)
  const combinedOverlays = [...(overlays || [])];
  if (infoCard && infoCard.enabled) {
    combinedOverlays.push({
      id: "legacy-info-card",
      type: "card",
      startFrame: infoCard.startFrame,
      durationInFrames: infoCard.durationInFrames,
      text: infoCard.text,
      icon: "Info",
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
      {/* 1. SCENE ENGINE (Dynamic Layout Switcher) */}
      <AbsoluteFill
        style={{
          transform: `scale(${currentZoom})`,
          transformOrigin: `${originX} ${originY}`,
        }}
      >
        <SceneRenderer
          scenes={scenes}
          videoSrc={videoSrc}
          cutoutVideoSrc={cutoutVideoSrc}
          subjectTracking={subjectTracking}
        />
      </AbsoluteFill>

      {/* 2. TRANSITIONS LAYER (GlitchSlice, ZoomCut, BlurWipe) */}
      <TransitionRenderer transitions={transitions} />

      {/* 3. MEDIA OVERLAYS / FLOATING STICKERS */}
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

        const isPip =
          media.position === "top-right" ||
          media.position === "top-left" ||
          media.position === "bottom-right" ||
          media.position === "bottom-left" ||
          media.top !== undefined ||
          media.right !== undefined;

        let positionStyle: React.CSSProperties = {
          position: "absolute",
          zIndex: 35,
          opacity: interpolate(mediaSpring, [0, 1], [0, 1]),
          transform: `scale(${interpolate(mediaSpring, [0, 1], [0.8, 1])})`,
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
        } else {
          positionStyle = {
            ...positionStyle,
            top: "25%",
            left: "10%",
            right: "10%",
          };
        }

        return (
          <div key={media.id} style={positionStyle}>
            <Img
              src={resolveMediaSrc(media.src, assetBaseUrl)}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: media.borderRadius || 24,
                boxShadow: "0 15px 40px rgba(0,0,0,0.75)",
              }}
            />
          </div>
        );
      })}

      {/* 4. CALLOUTS & INTERACTIVE ARROWS */}
      <Callouts callouts={callouts} />

      {/* 5. AUDIO VISUALIZER WAVEFORM */}
      <Waveform config={waveform} />

      {/* 6. TOP PROGRESS BAR */}
      <ProgressBar config={progressBar} />

      {/* 7. HOOK BANNER OVERLAY */}
      {hookVisible && (
        <div
          style={{
            position: "absolute",
            top: 140,
            left: 44,
            right: 44,
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
              background: "rgba(10, 15, 25, 0.85)",
              backdropFilter: "blur(20px)",
              border: "1.5px solid rgba(255, 230, 0, 0.6)",
              color: "#FFE600",
              padding: "14px 36px",
              borderRadius: "24px",
              fontWeight: 900,
              fontSize: 34,
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              boxShadow: "0 15px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(255, 230, 0, 0.25)",
              textAlign: "center",
              letterSpacing: "0.5px",
            }}
          >
            {hook?.title && !hook.title.includes("????") ? hook.title : (subtitles[0]?.text || "ذكاء اصطناعي")}
          </div>
        </div>
      )}

      {/* 8. OVERLAYS TIMELINE (Cards, Quotes, Bullets, Code) */}
      <Overlays overlays={combinedOverlays} />

      {/* 9. RTL KINETIC SUBTITLES */}
      <Subtitles
        subtitles={subtitles}
        styleConfig={captionStyle}
        highlightColor={highlightColor}
      />

      {/* 10. COLOR TREATMENT & VIGNETTE */}
      <ColorTreatment config={color} />

      {/* 11. BGM & SFX ENGINE */}
      {audio?.bgmSrc && (
        <Audio
          src={resolveMediaSrc(audio.bgmSrc, assetBaseUrl)}
          volume={bgmVolume}
          loop
        />
      )}

      {audio?.sfxEvents?.map((sfx, idx) => {
        return (
          <Sequence key={`sfx-${idx}`} from={sfx.startFrame}>
            <Audio
              src={resolveMediaSrc(sfx.src, assetBaseUrl)}
              volume={sfx.volume ?? 0.5}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

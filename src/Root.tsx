import React from "react";
import { Composition, CalculateMetadataFunction } from "remotion";
import { ReelComposition } from "./ReelComposition";
import { ReelProps } from "./types/schema";

const defaultV3Props: ReelProps = {
  version: "3.0.0",
  videoSrc: "trimmed.mp4",
  cutoutVideoSrc: "cutout.mp4",
  durationInFrames: 300,
  fps: 60,
  width: 1080,
  height: 1920,
  title: "أتمتة الفيديوهات بالذكاء الاصطناعي",
  hook: {
    enabled: true,
    title: "أتمتة الفيديوهات بالذكاء الاصطناعي",
    subtitle: "AI Reel Director V3",
    durationInFrames: 80,
  },
  captionStyle: {
    theme: "box_glass",
    fontFamily: "'Cairo', 'Tajawal', 'Readex Pro', -apple-system, sans-serif",
    fontSize: 56,
    highlightColor: "#FFE600",
    activeWordColor: "#00FFCC",
    inactiveWordColor: "#FFFFFF",
    direction: "rtl",
    positionBottom: 320,
    uppercase: false,
    animation: "bounce",
  },
  waveform: {
    enabled: true,
    color: "#00FFCC",
    barsCount: 20,
    position: "bottom",
  },
  progressBar: {
    enabled: true,
    gradientColors: ["#FFE600", "#00FFCC"],
    height: 8,
    position: "top",
  },
  scenes: [
    {
      id: "scene_001_hook",
      startFrame: 0,
      endFrame: 90,
      layout: "talking_head_typography",
      intent: "hook",
      energy: "high",
      transitionIn: "hard_cut",
      transitionOut: "glitch_slice",
      backgroundTypography: {
        text: "ذكاء اصطناعي",
        subText: "NEXT-GEN VIDEO",
        glowColor: "#FFE600",
        fontSize: 88,
        opacity: 0.9,
      },
    },
    {
      id: "scene_002_stat",
      startFrame: 90,
      endFrame: 210,
      layout: "stat_pip",
      intent: "statistic",
      energy: "high",
      transitionIn: "zoom_cut",
      transitionOut: "hard_cut",
      animatedCounter: {
        startVal: 0,
        endVal: 10,
        suffix: "x",
        title: "سرعة الإنتاج",
        subtitle: "أسرع بـ 10 أضعاف مقارنة بالمونتاج اليدوي",
        durationInFrames: 60,
      },
    },
    {
      id: "scene_003_outro",
      startFrame: 210,
      endFrame: 300,
      layout: "talking_head_full",
      intent: "cta",
      energy: "medium",
      transitionIn: "hard_cut",
      transitionOut: "none",
    },
  ],
  transitions: [
    {
      type: "glitch_slice",
      startFrame: 82,
      durationInFrames: 12,
      intensity: 0.8,
    },
    {
      type: "zoom_cut",
      startFrame: 205,
      durationInFrames: 8,
    },
  ],
  subtitles: [
    {
      id: 1,
      startFrame: 0,
      endFrame: 85,
      text: "مرحباً بكم في محرر الفيديوهات الذكي V3",
      emoji: "👋",
      emphasisLevel: "high",
      words: [
        { word: "مرحباً", start: 0, end: 0.35, startFrame: 0, endFrame: 21, highlight: false },
        { word: "بكم", start: 0.35, end: 0.65, startFrame: 21, endFrame: 39, highlight: false },
        { word: "في", start: 0.65, end: 0.85, startFrame: 39, endFrame: 51, highlight: false },
        { word: "محرر", start: 0.85, end: 1.15, startFrame: 51, endFrame: 69, highlight: true },
        { word: "الذكاء", start: 1.15, end: 1.42, startFrame: 69, endFrame: 85, highlight: true },
      ],
    },
    {
      id: 2,
      startFrame: 90,
      endFrame: 205,
      text: "إنتاج محتوى احترافي بسرعة تفوق الخيال 🚀",
      emoji: "🤖",
      emphasisLevel: "punchline",
      words: [
        { word: "إنتاج", start: 1.5, end: 1.8, startFrame: 90, endFrame: 108, highlight: false },
        { word: "محتوى", start: 1.8, end: 2.1, startFrame: 108, endFrame: 126, highlight: true },
        { word: "احترافي", start: 2.1, end: 2.5, startFrame: 126, endFrame: 150, highlight: true },
        { word: "بسرعة", start: 2.5, end: 2.9, startFrame: 150, endFrame: 174, highlight: false },
        { word: "تفوق", start: 2.9, end: 3.2, startFrame: 174, endFrame: 192, highlight: false },
        { word: "الخيال", start: 3.2, end: 3.42, startFrame: 192, endFrame: 205, highlight: true },
      ],
    },
  ],
};

const calculateMetadata: CalculateMetadataFunction<ReelProps> = async ({
  props,
}) => {
  const durationInFrames =
    props?.durationInFrames && props.durationInFrames > 0
      ? props.durationInFrames
      : (props as any)?.totalFrames && (props as any).totalFrames > 0
      ? (props as any).totalFrames
      : defaultV3Props.durationInFrames;

  const fps = props?.fps && props.fps > 0 ? props.fps : 60;
  const width = props?.width && props.width > 0 ? props.width : 1080;
  const height = props?.height && props.height > 0 ? props.height : 1920;

  return {
    durationInFrames,
    fps,
    width,
    height,
    props,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReelComposition"
        component={ReelComposition}
        durationInFrames={300}
        fps={60}
        width={1080}
        height={1920}
        defaultProps={defaultV3Props}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};

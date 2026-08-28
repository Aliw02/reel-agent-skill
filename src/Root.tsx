import React from "react";
import { Composition, CalculateMetadataFunction } from "remotion";
import { ReelComposition } from "./ReelComposition";
import { ReelProps } from "./types/schema";

const defaultProps: ReelProps = {
  durationInFrames: 300,
  fps: 60,
  width: 1080,
  height: 1920,
  title: "أتمتة الفيديوهات بالذكاء الاصطناعي",
  hook: {
    enabled: true,
    title: "أتمتة الفيديوهات بالذكاء الاصطناعي",
    subtitle: "AI Reel Editor Pro",
    durationInFrames: 75,
  },
  captionStyle: {
    theme: "box_glass",
    fontFamily: "'Cairo', 'Tajawal', 'Readex Pro', -apple-system, sans-serif",
    fontSize: 56,
    highlightColor: "#FFE600",
    activeWordColor: "#00FFCC",
    inactiveWordColor: "#FFFFFF",
    direction: "rtl",
    positionBottom: 340,
    uppercase: false,
  },
  progressBar: {
    enabled: true,
    gradientColors: ["#FFE600", "#00FFCC"],
    height: 8,
    position: "top",
  },
  subtitles: [
    {
      id: 1,
      startFrame: 0,
      endFrame: 90,
      text: "مرحباً بكم في محرر الفيديوهات الذكي",
      emoji: "👋",
      emphasisLevel: "high",
      words: [
        { word: "مرحباً", start: 0, end: 0.4, startFrame: 0, endFrame: 24, highlight: false },
        { word: "بكم", start: 0.4, end: 0.7, startFrame: 24, endFrame: 42, highlight: false },
        { word: "في", start: 0.7, end: 0.9, startFrame: 42, endFrame: 54, highlight: false },
        { word: "محرر", start: 0.9, end: 1.2, startFrame: 54, endFrame: 72, highlight: true },
        { word: "الفيديوهات", start: 1.2, end: 1.5, startFrame: 72, endFrame: 90, highlight: true },
      ],
    },
    {
      id: 2,
      startFrame: 95,
      endFrame: 240,
      text: "ذكاء اصطناعي يفهم المحتوى ويمونتج باحتراف 🚀",
      emoji: "🤖",
      emphasisLevel: "punchline",
      words: [
        { word: "ذكاء", start: 1.6, end: 1.9, startFrame: 96, endFrame: 114, highlight: true },
        { word: "اصطناعي", start: 1.9, end: 2.3, startFrame: 114, endFrame: 138, highlight: true },
        { word: "يفهم", start: 2.3, end: 2.6, startFrame: 138, endFrame: 156, highlight: false },
        { word: "المحتوى", start: 2.6, end: 3.0, startFrame: 156, endFrame: 180, highlight: true },
        { word: "ويمونتج", start: 3.0, end: 3.5, startFrame: 180, endFrame: 210, highlight: false },
        { word: "باحتراف", start: 3.5, end: 4.0, startFrame: 210, endFrame: 240, emoji: "🚀", highlight: true },
      ],
    },
  ],
  overlays: [
    {
      id: "intro-card",
      type: "card",
      startFrame: 30,
      durationInFrames: 150,
      title: "نظام المونتاج الذكي",
      text: "تفريغ دقيق، زوم ذكي، طبقات توضيحية، وإخراج رأسي 9:16 احترافي",
      icon: "💡",
      theme: "glass",
    },
  ],
  zoomEvents: [
    {
      id: "zoom-1",
      startFrame: 95,
      durationInFrames: 60,
      scale: 1.14,
      originX: "50%",
      originY: "40%",
      type: "punch_in",
    },
  ],
};

const calculateMetadata: CalculateMetadataFunction<ReelProps> = async ({ props }) => {
  const durationInFrames =
    props?.durationInFrames && props.durationInFrames > 0
      ? props.durationInFrames
      : (props as any)?.totalFrames && (props as any).totalFrames > 0
      ? (props as any).totalFrames
      : defaultProps.durationInFrames;

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
        defaultProps={defaultProps}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};

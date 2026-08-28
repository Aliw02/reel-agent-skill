import React from "react";
import { Composition } from "remotion";
import { ReelComposition } from "./ReelComposition";
import { ReelProps } from "./types/schema";

const defaultProps: ReelProps = {
  durationInFrames: 300,
  fps: 60,
  title: "فيديو تجريبي",
  highlightColor: "#FFE600",
  subtitles: [
    {
      id: 1,
      startFrame: 0,
      endFrame: 90,
      text: "مرحباً بكم في الشرح",
      emoji: "👋",
      words: [
        { word: "مرحباً", start: 0, end: 0.5, startFrame: 0, endFrame: 30, highlight: false },
        { word: "بكم", start: 0.5, end: 0.9, startFrame: 30, endFrame: 54, highlight: false },
        { word: "في", start: 0.9, end: 1.1, startFrame: 54, endFrame: 66, highlight: false },
        { word: "الشرح", start: 1.1, end: 1.5, startFrame: 66, endFrame: 90, highlight: true },
      ],
    },
    {
      id: 2,
      startFrame: 95,
      endFrame: 220,
      text: "ذكاء اصطناعي يصنع فيديوهات 🚀",
      emoji: "🤖",
      words: [
        { word: "ذكاء", start: 1.6, end: 2.0, startFrame: 96, endFrame: 120, highlight: true },
        { word: "اصطناعي", start: 2.0, end: 2.5, startFrame: 120, endFrame: 150, highlight: true },
        { word: "يصنع", start: 2.5, end: 2.9, startFrame: 150, endFrame: 174, highlight: false },
        { word: "فيديوهات", start: 2.9, end: 3.5, startFrame: 174, endFrame: 210, emoji: "🚀", highlight: true },
      ],
    },
  ],
  infoCard: {
    enabled: true,
    text: "أتمتة الفيديوهات بالذكاء الاصطناعي مع Remotion و Whisper",
    startFrame: 30,
    durationInFrames: 180,
  },
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
      />
    </>
  );
};

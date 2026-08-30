import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { SceneItem, SubjectTrackingData } from "../types/schema";
import { TalkingHeadFull } from "../layouts/TalkingHeadFull";
import { TalkingHeadTypography } from "../layouts/TalkingHeadTypography";
import { StatPip } from "../layouts/StatPip";
import { ScreenDemo } from "../layouts/ScreenDemo";
import { ComparisonScene } from "../layouts/ComparisonScene";
import { FullscreenBroll } from "../layouts/FullscreenBroll";

interface SceneRendererProps {
  scenes?: SceneItem[];
  videoSrc?: string;
  cutoutVideoSrc?: string;
  subjectTracking?: SubjectTrackingData;
}

export const SceneRenderer: React.FC<SceneRendererProps> = ({
  scenes = [],
  videoSrc,
  cutoutVideoSrc,
  subjectTracking,
}) => {
  const frame = useCurrentFrame();

  // Find active scene for the current frame
  let activeScene: SceneItem | undefined = scenes.find(
    (s) => frame >= s.startFrame && frame <= s.endFrame
  );

  // Fallback to default full talking head if no scene matched
  if (!activeScene) {
    if (scenes.length > 0) {
      activeScene = scenes[0];
    } else {
      activeScene = {
        id: "default_scene",
        startFrame: 0,
        endFrame: 99999,
        layout: "talking_head_full",
      };
    }
  }

  // Get smoothed face center for active frame if available
  let focalPoint: [number, number] = activeScene.focalPoint || [0.5, 0.38];
  if (subjectTracking?.frames && subjectTracking.frames.length > 0) {
    const trackSample = subjectTracking.frames.find((f) => f.frame >= frame);
    if (trackSample?.faceCenter) {
      focalPoint = trackSample.faceCenter;
    }
  }

  switch (activeScene.layout) {
    case "talking_head_typography":
      return (
        <TalkingHeadTypography
          scene={activeScene}
          videoSrc={videoSrc}
          cutoutVideoSrc={cutoutVideoSrc}
          cameraScale={activeScene.cameraScale ?? 1.05}
          focalPoint={focalPoint}
        />
      );

    case "stat_pip":
      return <StatPip scene={activeScene} videoSrc={videoSrc} />;

    case "screen_demo":
      return <ScreenDemo scene={activeScene} videoSrc={videoSrc} />;

    case "comparison_scene":
      return <ComparisonScene scene={activeScene} videoSrc={videoSrc} />;

    case "fullscreen_broll":
      return <FullscreenBroll scene={activeScene} />;

    case "talking_head_full":
    default:
      return (
        <TalkingHeadFull
          scene={activeScene}
          videoSrc={videoSrc}
          cameraScale={activeScene.cameraScale ?? 1.0}
          focalPoint={focalPoint}
        />
      );
  }
};

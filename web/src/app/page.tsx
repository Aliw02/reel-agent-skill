"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { StageStepper } from "@/components/stages/StageStepper";
import { DualViewport } from "@/components/player/DualViewport";
import { SilenceTrimStage } from "@/components/stages/SilenceTrimStage";
import { BilingualSubtitleStage } from "@/components/stages/BilingualSubtitleStage";
import { MotionDirectorStage } from "@/components/stages/MotionDirectorStage";
import { AudioMasterStage } from "@/components/stages/AudioMasterStage";
import AiCopilotDrawer from "@/components/chat/AiCopilotDrawer";
import FileUploadZone from "@/components/upload/FileUploadZone";
import VideoTimeline from "@/components/player/VideoTimeline";

const STAGE_PANELS: Record<number, React.FC> = {
  1: SilenceTrimStage,
  2: BilingualSubtitleStage,
  3: MotionDirectorStage,
  4: AudioMasterStage,
};

export default function Home() {
  const activeStage = useEditorStore((s) => s.activeStage);
  const jobId = useEditorStore((s) => s.jobId);
  const loadJob = useEditorStore((s) => s.loadJob);

  const [copilotOpen, setCopilotOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const testJobId = params.get("jobId");
    const testRawUrl = params.get("rawUrl");
    if (testJobId && testRawUrl) {
      loadJob(testJobId, testRawUrl);
    }
  }, [loadJob]);

  const handleStageClick = useCallback(
    (stage: number) => {
      useEditorStore.setState({ activeStage: stage });
    },
    []
  );

  const ActivePanel = STAGE_PANELS[activeStage] ?? SilenceTrimStage;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col h-screen overflow-hidden">
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 shrink-0">
        <h1 className="text-lg font-bold tracking-tight">AI Reel Studio</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCopilotOpen((o) => !o)}
            className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            aria-label={copilotOpen ? "Close copilot" : "Open copilot"}
          >
            {copilotOpen ? "Close Copilot" : "Open Copilot"}
          </button>
        </div>
      </header>

      <nav className="border-b border-zinc-800 shrink-0 overflow-x-auto">
        <StageStepper onStageClick={handleStageClick} />
      </nav>

      {!jobId ? (
        /* Upload state */
        <div className="flex-1 flex items-center justify-center p-4">
          <FileUploadZone />
        </div>
      ) : (
        /* Editor state */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-0">
            <div className="relative flex items-center justify-center p-4 min-h-0">
              <DualViewport className="w-full h-full" />
            </div>

            <aside className="border-l border-zinc-800 overflow-y-auto">
              <ActivePanel />
            </aside>
          </div>

          <VideoTimeline />
        </div>
      )}

      <AiCopilotDrawer
        jobId={jobId}
        open={copilotOpen}
        onClose={() => setCopilotOpen(false)}
      />
    </div>
  );
}

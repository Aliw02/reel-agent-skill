import React from "react";
import { useEditorStore, type StageStatus } from "@/store/useEditorStore";

const STAGE_LABELS: Record<number, string> = {
  1: "Pacing & Trim",
  2: "Bilingual Captions",
  3: "Motion Design",
  4: "Audio & QC",
};

const STAGE_ICONS: Record<number, string> = {
  1: "✂",
  2: "T",
  3: "M",
  4: "A",
};

const STATUS_CLASSES: Record<StageStatus, string> = {
  pending: "bg-slate-700 text-slate-400",
  processing: "bg-blue-900 text-blue-300",
  ready: "bg-emerald-900 text-emerald-300",
  approved: "bg-emerald-600 text-white",
  failed: "bg-red-900 text-red-300",
};

const CONNECTOR_CLASSES: Record<StageStatus, string> = {
  pending: "bg-slate-700",
  processing: "bg-blue-500",
  ready: "bg-emerald-500",
  approved: "bg-emerald-400",
  failed: "bg-red-500",
};

function isStageLocked(stage: number, status: Record<1 | 2 | 3 | 4, StageStatus>): boolean {
  if (stage === 1) return false;
  const prevStage = (stage - 1) as 1 | 2 | 3 | 4;
  return status[prevStage] !== "approved";
}

interface StageStepperProps {
  onStageClick?: (stage: number) => void;
}

export function StageStepper({ onStageClick }: StageStepperProps) {
  const stageStatus = useEditorStore((s) => s.stageStatus);
  const activeStage = useEditorStore((s) => s.activeStage);

  return (
    <nav aria-label="Editing stages" className="flex items-center gap-1 px-4 py-3">
      {([1, 2, 3, 4] as const).map((stage, idx) => {
        const status = stageStatus[stage];
        const locked = isStageLocked(stage, stageStatus);
        const isActive = activeStage === stage;

        return (
          <React.Fragment key={stage}>
            {idx > 0 && (
              <div
                className={`h-0.5 flex-1 max-w-8 rounded ${CONNECTOR_CLASSES[stageStatus[stage as 1 | 2 | 3 | 4]]}`}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              disabled={locked}
              onClick={() => !locked && onStageClick?.(stage)}
              className={`
                flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                ${STATUS_CLASSES[status]}
                ${locked ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-110"}
                ${isActive ? "ring-2 ring-blue-400 ring-offset-1 ring-offset-slate-900" : ""}
              `}
              aria-label={`Stage ${stage}: ${STAGE_LABELS[stage]}${locked ? " (locked)" : ""}`}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                  ${status === "approved" ? "bg-emerald-400 text-slate-900" : "bg-slate-600 text-slate-200"}
                `}
                aria-hidden="true"
              >
                {status === "approved" ? "✓" : STAGE_ICONS[stage]}
              </span>
              <span className="hidden sm:inline">{STAGE_LABELS[stage]}</span>
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
}

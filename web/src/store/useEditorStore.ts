import { create } from "zustand";
import type { EditPlanV3 } from "../../../src/types/schema";

export type StageStatus = "pending" | "processing" | "ready" | "approved" | "failed";

export interface CopilotAction {
  type: string;
  [key: string]: unknown;
}

export interface ProgressLog {
  timestamp: string;
  message: string;
}

function stripEmoji(text: string): string {
  return text
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E0}-\u{1F1FF}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FAFF}]/gu,
      ""
    )
    .trim();
}

function defaultPlan(): EditPlanV3 {
  return {
    version: "3.0.0",
    durationInFrames: 0,
    fps: 30,
    title: "",
    subtitles: [],
    scenes: [],
  };
}

function defaultStageStatus(): Record<1 | 2 | 3 | 4, StageStatus> {
  return { 1: "pending", 2: "pending", 3: "pending", 4: "pending" };
}

export interface EditorState {
  jobId: string | null;
  rawVideoUrl: string | null;
  beforeVideoUrl: string | null;
  afterVideoUrl: string | null;
  activeStage: number;
  stageStatus: Record<1 | 2 | 3 | 4, StageStatus>;
  committedPlan: EditPlanV3;
  draftPlan: EditPlanV3;
  draftBaseVersion: string;
  currentPlaybackFrame: number;
  progressLogs: ProgressLog[];
  copilotTokens: string[];
  copilotActions: CopilotAction[];
  isProcessing: boolean;

  loadJob: (jobId: string, rawVideoUrl: string) => void;
  setPlan: (plan: EditPlanV3) => void;
  updateDraftPlan: (patch: Partial<EditPlanV3>) => void;
  applyCopilotAction: (action: CopilotAction) => void;
  updateSubtitleText: (id: number, text: string, translation?: string) => void;
  toggleKeywordHighlight: (wordIndex: number) => void;
  updateHookTitle: (title: string) => void;
  applyDraft: () => void;
  discardDraft: () => void;
  setStageStatus: (stage: number, status: StageStatus) => void;
  approveStage: (stage: number) => void;
  resetJob: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  jobId: null,
  rawVideoUrl: null,
  beforeVideoUrl: null,
  afterVideoUrl: null,
  activeStage: 1,
  stageStatus: defaultStageStatus(),
  committedPlan: defaultPlan(),
  draftPlan: defaultPlan(),
  draftBaseVersion: "",
  currentPlaybackFrame: 0,
  progressLogs: [],
  copilotTokens: [],
  copilotActions: [],
  isProcessing: false,

  loadJob: (jobId, rawVideoUrl) => {
    set({
      jobId,
      rawVideoUrl,
      beforeVideoUrl: null,
      afterVideoUrl: null,
      activeStage: 1,
      stageStatus: defaultStageStatus(),
      committedPlan: defaultPlan(),
      draftPlan: defaultPlan(),
      draftBaseVersion: "",
      currentPlaybackFrame: 0,
      progressLogs: [],
      copilotTokens: [],
      copilotActions: [],
      isProcessing: false,
    });
  },

  setPlan: (plan) => {
    set({
      committedPlan: structuredClone(plan),
      draftPlan: structuredClone(plan),
      draftBaseVersion: plan.version,
    });
  },

  updateDraftPlan: (patch) => {
    const current = get().draftPlan;
    const updated = { ...current, ...patch };
    set({ draftPlan: updated });
  },

  applyCopilotAction: (action) => {
    const draft = structuredClone(get().draftPlan);
    switch (action.type) {
      case "set_title":
        draft.title = action.title as string;
        break;
      case "update_subtitle": {
        const idx = draft.subtitles.findIndex((s) => s.id === action.id);
        if (idx !== -1) {
          draft.subtitles[idx].text = stripEmoji(action.text as string);
          draft.subtitles[idx].translation = action.translation as string | undefined;
          draft.subtitles[idx].emoji = null;
        }
        break;
      }
      case "set_hook":
        if (draft.hook) {
          draft.hook.title = stripEmoji(action.title as string);
          draft.hook.subtitle = action.subtitle as string | undefined;
        }
        break;
    }
    set((state) => ({
      draftPlan: draft,
      copilotActions: [...state.copilotActions, action],
    }));
  },

  updateSubtitleText: (id, text, translation) => {
    const draft = structuredClone(get().draftPlan);
    const idx = draft.subtitles.findIndex((s) => s.id === id);
    if (idx !== -1) {
      draft.subtitles[idx].text = stripEmoji(text);
      draft.subtitles[idx].translation = translation;
      draft.subtitles[idx].emoji = null;
    }
    set({ draftPlan: draft });
  },

  toggleKeywordHighlight: (wordIndex) => {
    const draft = structuredClone(get().draftPlan);
    const subtitleIdx = draft.subtitles.findIndex((s) =>
      s.words.some((_, i) => i === wordIndex)
    );
    if (subtitleIdx !== -1) {
      const sub = draft.subtitles[subtitleIdx];
      const localIdx = sub.words.findIndex((_, i) => i === wordIndex);
      if (localIdx !== -1) {
        sub.words[localIdx].highlight = !sub.words[localIdx].highlight;
      }
    }
    set({ draftPlan: draft });
  },

  updateHookTitle: (title) => {
    const draft = structuredClone(get().draftPlan);
    if (!draft.hook) {
      draft.hook = { enabled: true, title: stripEmoji(title) };
    } else {
      draft.hook.title = stripEmoji(title);
    }
    set({ draftPlan: draft });
  },

  applyDraft: () => {
    const draft = get().draftPlan;
    set({ committedPlan: structuredClone(draft) });
  },

  discardDraft: () => {
    const committed = get().committedPlan;
    set({ draftPlan: structuredClone(committed) });
  },

  setStageStatus: (stage, status) => {
    set((state) => ({
      stageStatus: { ...state.stageStatus, [stage]: status },
    }));
  },

  approveStage: (stage) => {
    const current = get().stageStatus[stage as 1 | 2 | 3 | 4];
    if (current === "ready") {
      set((state) => ({
        stageStatus: { ...state.stageStatus, [stage]: "approved" },
      }));
    }
  },

  resetJob: () => {
    set({
      jobId: null,
      rawVideoUrl: null,
      beforeVideoUrl: null,
      afterVideoUrl: null,
      activeStage: 1,
      stageStatus: defaultStageStatus(),
      committedPlan: defaultPlan(),
      draftPlan: defaultPlan(),
      draftBaseVersion: "",
      currentPlaybackFrame: 0,
      progressLogs: [],
      copilotTokens: [],
      copilotActions: [],
      isProcessing: false,
    });
  },
}));

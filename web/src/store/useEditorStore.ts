import { create } from "zustand";
import type { EditPlanV3 } from "../../../src/types/schema";

export type StageStatus = "pending" | "processing" | "ready" | "approved" | "failed";
export type ViewMode = "split" | "slider" | "after";

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

export interface RenderResult {
  videoUrl: string;
  durationSec: number;
}

export interface MasterResult {
  masteredVideoUrl: string;
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
  isStreaming: boolean;
  selectedProvider: string;
  selectedModel: string;
  viewMode: ViewMode;
  renderResult: RenderResult | null;
  masterResult: MasterResult | null;
  qcReport: Record<string, unknown> | null;

  loadJob: (jobId: string, rawVideoUrl: string) => void;
  setViewMode: (mode: ViewMode) => void;
  updatePlaybackFrame: (frame: number) => void;
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
  setRenderResult: (result: RenderResult | null) => void;
  setMasterResult: (result: MasterResult | null) => void;
  setQcReport: (report: Record<string, unknown> | null) => void;
  resetJob: () => void;
  setCopilotTokens: (tokens: string[]) => void;
  appendCopilotToken: (token: string) => void;
  clearCopilot: () => void;
  setCopilotModel: (provider: string, model: string) => void;
  setIsStreaming: (streaming: boolean) => void;
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
  isStreaming: false,
  selectedProvider: "",
  selectedModel: "",
  viewMode: "split",
  renderResult: null,
  masterResult: null,
  qcReport: null,

  loadJob: (jobId, rawVideoUrl) => {
    set({
      jobId,
      rawVideoUrl,
      beforeVideoUrl: rawVideoUrl,
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
      isStreaming: false,
      selectedProvider: "",
      selectedModel: "",
      viewMode: "split",
      renderResult: null,
      masterResult: null,
      qcReport: null,
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

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  updatePlaybackFrame: (frame) => {
    set({ currentPlaybackFrame: frame });
  },

  setRenderResult: (result) => {
    set({ renderResult: result });
  },

  setMasterResult: (result) => {
    set({ masterResult: result });
  },

  setQcReport: (report) => {
    set({ qcReport: report });
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
      isStreaming: false,
      selectedProvider: "",
      selectedModel: "",
      viewMode: "split",
      renderResult: null,
      masterResult: null,
      qcReport: null,
    });
  },

  setCopilotTokens: (tokens) => set({ copilotTokens: tokens }),

  appendCopilotToken: (token) =>
    set((state) => ({ copilotTokens: [...state.copilotTokens, token] })),

  clearCopilot: () =>
    set({ copilotTokens: [], copilotActions: [], isStreaming: false }),

  setCopilotModel: (provider, model) =>
    set({ selectedProvider: provider, selectedModel: model }),

  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
}));

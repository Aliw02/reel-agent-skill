import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { BilingualSubtitleStage } from "../BilingualSubtitleStage";
import { useEditorStore } from "@/store/useEditorStore";
import type { EditPlanV3 } from "../../../../../src/types/schema";

vi.mock("@/lib/api", () => ({
  transcribeJob: vi.fn().mockResolvedValue(undefined),
  getPlan: vi.fn().mockResolvedValue({
    version: "3.0.0",
    durationInFrames: 300,
    fps: 24,
    subtitles: [],
    scenes: [],
  }),
  commitPlan: vi.fn().mockResolvedValue(undefined),
  approveStageEndpoint: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/websocket", () => ({
  connectJobSocket: vi.fn().mockReturnValue({ close: vi.fn() }),
}));

function seedPlan(overrides?: Partial<EditPlanV3>) {
  const plan: EditPlanV3 = {
    version: "3.0.0",
    durationInFrames: 300,
    fps: 24,
    title: "Test",
    subtitles: [
      {
        id: 0,
        startFrame: 0,
        endFrame: 90,
        text: "مرحبا",
        translation: "Hello",
        emoji: null,
        words: [
          { word: "مرحبا", start: 0, end: 3, startFrame: 0, endFrame: 90 },
        ],
      },
      {
        id: 1,
        startFrame: 90,
        endFrame: 180,
        text: "عالم",
        translation: "World",
        emoji: null,
        words: [
          { word: "عالم", start: 3, end: 6, startFrame: 90, endFrame: 180 },
        ],
      },
    ],
    scenes: [],
    ...overrides,
  };
  useEditorStore.getState().setPlan(plan);
}

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useEditorStore.getState().resetJob();
  useEditorStore.getState().loadJob("job-test", "http://video.mp4");
});

describe("BilingualSubtitleStage", () => {
  it("locked Stage 2 shows prerequisite message before Stage 1 approval", () => {
    seedPlan();
    render(<BilingualSubtitleStage />);
    expect(screen.getByText(/stage 1 must be approved/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  });

  it("editing a translation persists translation while preserving word timing", () => {
    seedPlan();
    useEditorStore.getState().setStageStatus(1, "approved");
    render(<BilingualSubtitleStage />);
    const input = screen.getByRole("textbox", { name: /english translation for subtitle 0/i });
    fireEvent.change(input, { target: { value: "Hola" } });
    const state = useEditorStore.getState();
    expect(state.draftPlan.subtitles[0].translation).toBe("Hola");
    expect(state.draftPlan.subtitles[0].words[0].start).toBe(0);
    expect(state.draftPlan.subtitles[0].words[0].end).toBe(3);
    expect(state.draftPlan.subtitles[0].words[0].startFrame).toBe(0);
    expect(state.draftPlan.subtitles[0].words[0].endFrame).toBe(90);
  });

  it("invalid phrase bounds disable approval and show the specific invalid row", () => {
    seedPlan({
      subtitles: [
        {
          id: 0,
          startFrame: 100,
          endFrame: 50,
          text: "خطأ",
          translation: "Error",
          emoji: null,
          words: [],
        },
      ],
    });
    useEditorStore.getState().setStageStatus(1, "approved");
    render(<BilingualSubtitleStage />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Subtitle #0");
    const btn = screen.getByRole("button", { name: /approve bilingual captions/i });
    expect(btn).toBeDisabled();
  });

  it("the stage displays the actual fps from the job instead of 30", () => {
    seedPlan({ fps: 24 });
    useEditorStore.getState().setStageStatus(1, "approved");
    render(<BilingualSubtitleStage />);
    expect(screen.getByText("FPS:")).toBeDefined();
    expect(screen.getByText("24")).toBeDefined();
  });
});

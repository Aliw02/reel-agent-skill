import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore } from "../useEditorStore";

beforeEach(() => {
  useEditorStore.getState().resetJob();
});

function seedPlan() {
  const plan = {
    version: "3.0.0",
    durationInFrames: 300,
    fps: 30,
    title: "Original Title",
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
    scenes: [
      { id: "s1", startFrame: 0, endFrame: 180, layout: "talking_head_full" as const },
    ],
  };
  useEditorStore.getState().setPlan(plan);
}

describe("useEditorStore", () => {
  describe("updateSubtitleText", () => {
    it("updates one subtitle without changing unrelated plan fields", () => {
      seedPlan();
      const before = useEditorStore.getState().draftPlan.scenes;
      useEditorStore.getState().updateSubtitleText(1, "السلام عليكم", "Peace be upon you");
      const state = useEditorStore.getState();
      expect(state.draftPlan.subtitles[0].text).toBe("مرحبا");
      expect(state.draftPlan.subtitles[1].text).toBe("السلام عليكم");
      expect(state.draftPlan.subtitles[1].translation).toBe("Peace be upon you");
      expect(state.draftPlan.subtitles[1].emoji).toBeNull();
      expect(state.draftPlan.scenes).toEqual(before);
    });

    it("strips emoji from subtitle text", () => {
      seedPlan();
      useEditorStore.getState().updateSubtitleText(0, "مرحبا 👋", "Hello");
      const sub = useEditorStore.getState().draftPlan.subtitles[0];
      expect(sub.text).toBe("مرحبا");
      expect(sub.emoji).toBeNull();
    });
  });

  describe("applyCopilotAction", () => {
    it("previews a copilot action without changing the committed plan", () => {
      seedPlan();
      const committedTitle = useEditorStore.getState().committedPlan.title;
      useEditorStore.getState().applyCopilotAction({ type: "set_title", title: "New title" });
      expect(useEditorStore.getState().draftPlan.title).toBe("New title");
      expect(useEditorStore.getState().committedPlan.title).toBe(committedTitle);
    });

    it("removes emoji from copilot subtitle action", () => {
      seedPlan();
      useEditorStore.getState().applyCopilotAction({
        type: "update_subtitle",
        id: 0,
        text: "مرحبا 👋🌍",
        translation: "Hello World",
      });
      const sub = useEditorStore.getState().draftPlan.subtitles[0];
      expect(sub.text).toBe("مرحبا");
      expect(sub.emoji).toBeNull();
    });
  });

  describe("approveStage", () => {
    it("does not approve a stage that is not ready", () => {
      useEditorStore.getState().approveStage(2);
      expect(useEditorStore.getState().stageStatus[2]).toBe("pending");
    });

    it("approves a stage that is ready", () => {
      useEditorStore.getState().setStageStatus(2, "ready");
      useEditorStore.getState().approveStage(2);
      expect(useEditorStore.getState().stageStatus[2]).toBe("approved");
    });
  });

  describe("applyDraft / discardDraft", () => {
    it("applyDraft copies draft to committed", () => {
      seedPlan();
      useEditorStore.getState().updateDraftPlan({ title: "Modified" });
      useEditorStore.getState().applyDraft();
      expect(useEditorStore.getState().committedPlan.title).toBe("Modified");
    });

    it("discardDraft resets draft to committed", () => {
      seedPlan();
      useEditorStore.getState().updateDraftPlan({ title: "Changed" });
      useEditorStore.getState().discardDraft();
      expect(useEditorStore.getState().draftPlan.title).toBe("Original Title");
    });
  });

  describe("updateDraftPlan", () => {
    it("preserves unrelated fields", () => {
      seedPlan();
      const beforeSubs = useEditorStore.getState().draftPlan.subtitles;
      useEditorStore.getState().updateDraftPlan({ title: "New" });
      expect(useEditorStore.getState().draftPlan.title).toBe("New");
      expect(useEditorStore.getState().draftPlan.subtitles).toEqual(beforeSubs);
    });
  });

  describe("loadJob", () => {
    it("resets all state for a new job", () => {
      seedPlan();
      useEditorStore.getState().loadJob("job-123", "http://video.mp4");
      const s = useEditorStore.getState();
      expect(s.jobId).toBe("job-123");
      expect(s.rawVideoUrl).toBe("http://video.mp4");
      expect(s.stageStatus[1]).toBe("pending");
      expect(s.committedPlan.title).toBe("");
    });
  });
});

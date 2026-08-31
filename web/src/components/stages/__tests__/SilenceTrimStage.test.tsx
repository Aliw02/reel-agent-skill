import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { SilenceTrimStage } from "../SilenceTrimStage";
import { useEditorStore } from "@/store/useEditorStore";

vi.mock("@/lib/api", () => ({
  trimJob: vi.fn().mockResolvedValue({
    before_duration_s: 60,
    after_duration_s: 45,
    removed_s: 15,
  }),
  approveStageEndpoint: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/websocket", () => ({
  connectJobSocket: vi.fn().mockReturnValue({ close: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useEditorStore.getState().resetJob();
  useEditorStore.getState().loadJob("job-test", "http://video.mp4");
});

describe("SilenceTrimStage", () => {
  it("renders the trim stage with threshold slider and start button", () => {
    render(<SilenceTrimStage />);
    expect(screen.getByRole("button", { name: /start trim/i })).toBeDefined();
    expect(screen.getByLabelText(/silence threshold/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /approve pacing/i })).toBeDefined();
  });

  it("approve button is disabled before trim completes", () => {
    render(<SilenceTrimStage />);
    const btn = screen.getByRole("button", { name: /approve pacing/i });
    expect(btn).toBeDisabled();
  });
});

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import React from "react";
import { StageStepper } from "../StageStepper";
import { useEditorStore } from "@/store/useEditorStore";

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  useEditorStore.getState().resetJob();
  useEditorStore.getState().loadJob("job-test", "http://video.mp4");
});

describe("StageStepper", () => {
  it("renders all four stages", () => {
    render(<StageStepper />);
    expect(screen.getByRole("button", { name: /stage 1/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /stage 2/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /stage 3/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /stage 4/i })).toBeDefined();
  });

  it("locks Stage 2 before Stage 1 is approved", () => {
    render(<StageStepper />);
    const stage2Btn = screen.getByRole("button", { name: /stage 2/i });
    expect(stage2Btn).toBeDisabled();
    expect(stage2Btn.getAttribute("aria-label")).toContain("locked");
  });

  it("unlocks Stage 2 after Stage 1 is approved", () => {
    useEditorStore.getState().setStageStatus(1, "approved");
    render(<StageStepper />);
    const stage2Btn = screen.getByRole("button", { name: /stage 2/i });
    expect(stage2Btn).not.toBeDisabled();
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ModelContextMenu from "../ModelContextMenu";
import type { ProviderModelOption } from "../ModelContextMenu";

afterEach(() => {
  cleanup();
});

const mockModels: ProviderModelOption[] = [
  { providerID: "openai", modelID: "gpt-4", displayName: "GPT-4", providerName: "OpenAI" },
  { providerID: "openai", modelID: "gpt-3.5", displayName: "GPT-3.5", providerName: "OpenAI" },
  { providerID: "anthropic", modelID: "claude", displayName: "Claude", providerName: "Anthropic" },
];

describe("ModelContextMenu", () => {
  it("renders all models", () => {
    render(
      <ModelContextMenu
        models={mockModels}
        selectedProvider=""
        selectedModel=""
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const menu = screen.getByRole("menu");
    expect(menu).toBeDefined();
    expect(screen.getAllByText("GPT-4").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("GPT-3.5").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Claude").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onSelect when a model is clicked", () => {
    const onSelect = vi.fn();
    render(
      <ModelContextMenu
        models={mockModels}
        selectedProvider=""
        selectedModel=""
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );
    const gpt4Buttons = screen.getAllByText("GPT-4");
    const gpt4Btn = gpt4Buttons[gpt4Buttons.length - 1].closest("button");
    fireEvent.click(gpt4Btn!);
    expect(onSelect).toHaveBeenCalledWith("openai", "gpt-4");
  });

  it("calls onClose on Escape key", () => {
    const onClose = vi.fn();
    render(
      <ModelContextMenu
        models={mockModels}
        selectedProvider=""
        selectedModel=""
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("filters models by search input", () => {
    render(
      <ModelContextMenu
        models={mockModels}
        selectedProvider=""
        selectedModel=""
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const input = screen.getByLabelText("Search models");
    fireEvent.change(input, { target: { value: "Claude" } });
    expect(screen.getByText("Claude")).toBeDefined();
    expect(screen.queryAllByText("GPT-4").filter((el) => el.closest("[role=menu]")).length).toBe(0);
  });

  it("filters by provider", () => {
    render(
      <ModelContextMenu
        models={mockModels}
        selectedProvider=""
        selectedModel=""
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const anthropicBtns = screen.getAllByText("Anthropic");
    const anthropicFilterBtn = anthropicBtns[0].closest("button")!;
    fireEvent.click(anthropicFilterBtn);
    expect(screen.getByText("Claude")).toBeDefined();
    expect(screen.queryAllByText("GPT-4").filter((el) => el.closest("[role=menu]")).length).toBe(0);
  });

  it("marks selected model", () => {
    render(
      <ModelContextMenu
        models={mockModels}
        selectedProvider="openai"
        selectedModel="gpt-4"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    const gpt4Btns = screen.getAllByText("GPT-4");
    const gpt4Btn = gpt4Btns[gpt4Btns.length - 1].closest("button")!;
    expect(gpt4Btn.className).toContain("bg-zinc-700");
  });
});

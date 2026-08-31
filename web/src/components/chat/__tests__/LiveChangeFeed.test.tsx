import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import LiveChangeFeed from "../LiveChangeFeed";

afterEach(() => {
  cleanup();
});

describe("LiveChangeFeed", () => {
  it("renders streamed tokens", () => {
    render(<LiveChangeFeed tokens={["Hello", "world"]} actions={[]} />);
    expect(screen.getByText("Hello")).toBeDefined();
    expect(screen.getByText("world")).toBeDefined();
  });

  it("renders proposed actions", () => {
    const actions = [
      { type: "set_title", title: "New Title" },
      { type: "update_subtitle", id: 0, text: "Updated text" },
    ];
    render(<LiveChangeFeed tokens={[]} actions={actions} />);
    expect(screen.getByText('Set title: "New Title"')).toBeDefined();
    expect(screen.getByText('Update subtitle #0: "Updated text"')).toBeDefined();
  });

  it("renders empty state", () => {
    render(<LiveChangeFeed tokens={[]} actions={[]} />);
    expect(screen.getByRole("log")).toBeDefined();
  });

  it("handles set_hook action type", () => {
    const actions = [{ type: "set_hook", title: "Hook Title", subtitle: "Sub" }];
    render(<LiveChangeFeed tokens={[]} actions={actions} />);
    expect(screen.getByText('Set hook: "Hook Title"')).toBeDefined();
  });
});

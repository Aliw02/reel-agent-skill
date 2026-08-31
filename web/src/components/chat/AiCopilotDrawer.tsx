import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import LiveChangeFeed from "./LiveChangeFeed";
import ModelContextMenu from "./ModelContextMenu";
import type { ProviderModelOption } from "./ModelContextMenu";
import { fetchCopilotModels, applyCopilotDraft } from "@/lib/api";

interface AiCopilotDrawerProps {
  jobId: string;
  open: boolean;
  onClose: () => void;
}

export default function AiCopilotDrawer({ jobId, open, onClose }: AiCopilotDrawerProps) {
  const [prompt, setPrompt] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [models, setModels] = useState<ProviderModelOption[]>([]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const tokens = useEditorStore((s) => s.copilotTokens);
  const actions = useEditorStore((s) => s.copilotActions);
  const selectedProvider = useEditorStore((s) => s.selectedProvider);
  const selectedModel = useEditorStore((s) => s.selectedModel);
  const committedPlan = useEditorStore((s) => s.committedPlan);
  const draftBaseVersion = useEditorStore((s) => s.draftBaseVersion);

  const setCopilotTokens = useEditorStore((s) => s.setCopilotTokens);
  const appendCopilotToken = useEditorStore((s) => s.appendCopilotToken);
  const applyCopilotAction = useEditorStore((s) => s.applyCopilotAction);
  const clearCopilot = useEditorStore((s) => s.clearCopilot);
  const setCopilotModel = useEditorStore((s) => s.setCopilotModel);

  useEffect(() => {
    if (open) {
      fetchCopilotModels()
        .then((res) => setModels(res.models))
        .catch(() => {});
      inputRef.current?.focus();
    }
  }, [open]);

  const handleStart = useCallback(() => {
    if (!prompt.trim() || isStreaming) return;
    setError(null);
    clearCopilot();
    setIsStreaming(true);

    const baseUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    const ws = new WebSocket(`${baseUrl}/ws/jobs/${jobId}/copilot`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "start",
          prompt: prompt.trim(),
          providerID: selectedProvider || undefined,
          modelID: selectedModel || undefined,
          committedPlan,
          baseVersion: draftBaseVersion,
        })
      );
      setPrompt("");
    };

    ws.onmessage = (msg) => {
      try {
        const event = JSON.parse(msg.data);
        switch (event.event) {
          case "token":
            appendCopilotToken(event.text);
            break;
          case "action":
            applyCopilotAction(event.action);
            break;
          case "draft":
            break;
          case "done":
            setIsStreaming(false);
            ws.close();
            break;
          case "error":
            setError(event.detail || "Stream error");
            setIsStreaming(false);
            ws.close();
            break;
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed");
      setIsStreaming(false);
    };

    ws.onclose = () => {
      setIsStreaming(false);
      wsRef.current = null;
    };
  }, [
    prompt,
    isStreaming,
    jobId,
    selectedProvider,
    selectedModel,
    committedPlan,
    draftBaseVersion,
    appendCopilotToken,
    applyCopilotAction,
    clearCopilot,
  ]);

  const handleCancel = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "cancel" }));
      wsRef.current.close();
    }
    setIsStreaming(false);
  }, []);

  const handleApply = useCallback(async () => {
    if (actions.length === 0) return;
    try {
      await applyCopilotDraft(jobId, draftBaseVersion);
      clearCopilot();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("409")) {
        setError("Stale version. The plan was modified. Please refresh.");
      } else {
        setError(msg);
      }
    }
  }, [jobId, actions.length, draftBaseVersion, clearCopilot]);

  const handleDiscard = useCallback(() => {
    clearCopilot();
  }, [clearCopilot]);

  const handleSelectModel = useCallback(
    (providerID: string, modelID: string) => {
      setCopilotModel(providerID, modelID);
      if (jobId) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/jobs/${jobId}/copilot/model`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerID, modelID }),
        }).catch(() => {});
      }
    },
    [jobId, setCopilotModel]
  );

  if (!open) return null;

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 bg-zinc-900 border-l border-zinc-700 flex flex-col shadow-2xl z-50"
      role="dialog"
      aria-label="AI Copilot"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700">
        <h2 className="text-sm font-semibold text-zinc-200">Director Copilot</h2>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 text-lg"
          aria-label="Close copilot"
        >
          &times;
        </button>
      </div>

      <div className="px-4 py-2 border-b border-zinc-800 flex items-center gap-2 relative">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Model</span>
        <button
          onClick={() => setShowModelMenu(!showModelMenu)}
          className="text-xs text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded hover:bg-zinc-700"
        >
          {selectedModel || "Select model"}
        </button>
        {showModelMenu && (
          <ModelContextMenu
            models={models}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            onSelect={handleSelectModel}
            onClose={() => setShowModelMenu(false)}
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {error && (
          <div className="mb-2 px-2 py-1 text-xs bg-red-900/40 text-red-400 rounded">{error}</div>
        )}
        <LiveChangeFeed tokens={tokens} actions={actions} />
      </div>

      <div className="px-4 py-3 border-t border-zinc-700">
        {(isStreaming || actions.length > 0) && (
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleApply}
              disabled={actions.length === 0}
              className="flex-1 text-xs px-2 py-1.5 bg-emerald-600 text-white rounded disabled:opacity-40 hover:bg-emerald-500"
            >
              Apply
            </button>
            <button
              onClick={handleDiscard}
              className="flex-1 text-xs px-2 py-1.5 bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600"
            >
              Discard
            </button>
            {isStreaming && (
              <button
                onClick={handleCancel}
                className="text-xs px-2 py-1.5 bg-red-800 text-white rounded hover:bg-red-700"
              >
                Cancel
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleStart();
              }
            }}
            placeholder="Describe the edit you want..."
            rows={2}
            className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 outline-none focus:border-zinc-400 resize-none"
            disabled={isStreaming}
          />
          <button
            onClick={handleStart}
            disabled={!prompt.trim() || isStreaming}
            className="self-end px-3 py-2 bg-blue-600 text-white text-sm rounded disabled:opacity-40 hover:bg-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { trimJob, approveStageEndpoint } from "@/lib/api";
import { connectJobSocket } from "@/lib/websocket";

interface TrimResult {
  before_duration_s: number;
  after_duration_s: number;
  removed_s: number;
}

export function SilenceTrimStage() {
  const jobId = useEditorStore((s) => s.jobId);
  const stageStatus = useEditorStore((s) => s.stageStatus[1]);
  const rawVideoUrl = useEditorStore((s) => s.rawVideoUrl);
  const beforeVideoUrl = useEditorStore((s) => s.beforeVideoUrl);
  const afterVideoUrl = useEditorStore((s) => s.afterVideoUrl);
  const progressLogs = useEditorStore((s) => s.progressLogs);
  const isProcessing = useEditorStore((s) => s.isProcessing);

  const setStageStatus = useEditorStore((s) => s.setStageStatus);
  const approveStage = useEditorStore((s) => s.approveStage);

  const [silenceThreshold, setSilenceThreshold] = useState(-35);
  const [trimResult, setTrimResult] = useState<TrimResult | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const ws = connectJobSocket(jobId, (event) => {
      if (event.type === "progress_log") {
        const log = event.payload as { message: string; timestamp?: string };
        useEditorStore.setState((s) => ({
          progressLogs: [
            ...s.progressLogs,
            {
              timestamp: log.timestamp ?? new Date().toISOString(),
              message: log.message,
            },
          ],
        }));
      }
      if (event.type === "stage_update") {
        const update = event.payload as { stage: number; status: string };
        if (update.stage === 1) {
          setStageStatus(1, update.status as "pending" | "processing" | "ready" | "approved" | "failed");
        }
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [jobId, setStageStatus]);

  const handleTrim = useCallback(async () => {
    if (!jobId) return;
    useEditorStore.setState({ isProcessing: true, progressLogs: [] });
    setStageStatus(1, "processing");
    try {
      const result = await trimJob(jobId, silenceThreshold);
      setTrimResult(result);
      setStageStatus(1, "ready");
    } catch {
      setStageStatus(1, "failed");
    } finally {
      useEditorStore.setState({ isProcessing: false });
    }
  }, [jobId, silenceThreshold, setStageStatus]);

  const handleApprove = useCallback(async () => {
    if (!jobId) return;
    try {
      await approveStageEndpoint(jobId, 1);
      approveStage(1);
    } catch {
      setStageStatus(1, "failed");
    }
  }, [jobId, approveStage, setStageStatus]);

  const canApprove = stageStatus === "ready" && trimResult !== null;

  return (
    <section aria-label="Stage 1: Pacing and Trim" className="space-y-6 p-4">
      <h2 className="text-lg font-semibold text-white">Stage 1 — Silence Trim & Pacing</h2>

      <div className="space-y-3">
        <label htmlFor="silence-threshold" className="block text-sm text-slate-300">
          Silence Threshold (dB)
        </label>
        <div className="flex items-center gap-3">
          <input
            id="silence-threshold"
            type="range"
            min={-60}
            max={-10}
            step={1}
            value={silenceThreshold}
            onChange={(e) => setSilenceThreshold(Number(e.target.value))}
            className="flex-1 accent-blue-500"
            disabled={isProcessing}
          />
          <span className="w-14 text-right text-sm text-slate-400">{silenceThreshold} dB</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleTrim}
        disabled={isProcessing || !jobId}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Trimming..." : "Start Trim"}
      </button>

      {progressLogs.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-400 space-y-1" role="log" aria-live="polite">
          {progressLogs.map((log, i) => (
            <div key={i}>
              <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>{" "}
              {log.message}
            </div>
          ))}
        </div>
      )}

      {trimResult && (
        <div className="grid grid-cols-3 gap-4 text-sm" role="status" aria-label="Trim results">
          <div className="rounded bg-slate-800 p-3 text-center">
            <div className="text-slate-400">Original</div>
            <div className="text-lg font-mono text-white">{trimResult.before_duration_s.toFixed(1)}s</div>
          </div>
          <div className="rounded bg-slate-800 p-3 text-center">
            <div className="text-slate-400">Trimmed</div>
            <div className="text-lg font-mono text-white">{trimResult.after_duration_s.toFixed(1)}s</div>
          </div>
          <div className="rounded bg-emerald-900 p-3 text-center">
            <div className="text-emerald-300">Removed</div>
            <div className="text-lg font-mono text-emerald-200">{trimResult.removed_s.toFixed(1)}s</div>
          </div>
        </div>
      )}

      {(rawVideoUrl || beforeVideoUrl || afterVideoUrl) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded border border-slate-700 bg-slate-900 p-2">
            <div className="text-xs text-slate-500 mb-1">Before Trim</div>
            {(beforeVideoUrl ?? rawVideoUrl) && (
              <video
                src={beforeVideoUrl ?? rawVideoUrl ?? undefined}
                controls
                className="w-full rounded"
                aria-label="Video before trim"
              />
            )}
          </div>
          <div className="rounded border border-slate-700 bg-slate-900 p-2">
            <div className="text-xs text-slate-500 mb-1">After Trim</div>
            {afterVideoUrl ? (
              <video src={afterVideoUrl} controls className="w-full rounded" aria-label="Video after trim" />
            ) : (
              <div className="flex h-40 items-center justify-center text-slate-600 text-sm">
                Run trim to preview
              </div>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleApprove}
        disabled={!canApprove}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Approve Pacing"
      >
        Approve Pacing
      </button>
    </section>
  );
}

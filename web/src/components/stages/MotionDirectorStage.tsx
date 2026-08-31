"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { renderJob, approveStageEndpoint } from "@/lib/api";
import { connectJobSocket } from "@/lib/websocket";

export function MotionDirectorStage() {
  const jobId = useEditorStore((s) => s.jobId);
  const stage2Approved = useEditorStore((s) => s.stageStatus[2] === "approved");
  const stageStatus = useEditorStore((s) => s.stageStatus[3]);
  const renderResult = useEditorStore((s) => s.renderResult);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const progressLogs = useEditorStore((s) => s.progressLogs);

  const setStageStatus = useEditorStore((s) => s.setStageStatus);
  const approveStage = useEditorStore((s) => s.approveStage);
  const setRenderResult = useEditorStore((s) => s.setRenderResult);

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
        if (update.stage === 3) {
          setStageStatus(3, update.status as "pending" | "processing" | "ready" | "approved" | "failed");
        }
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [jobId, setStageStatus]);

  const handleRender = useCallback(async () => {
    if (!jobId) return;
    useEditorStore.setState({ isProcessing: true, progressLogs: [] });
    setStageStatus(3, "processing");
    try {
      const result = await renderJob(jobId);
      setRenderResult(result);
      setStageStatus(3, "ready");
    } catch {
      setStageStatus(3, "failed");
    } finally {
      useEditorStore.setState({ isProcessing: false });
    }
  }, [jobId, setStageStatus, setRenderResult]);

  const handleApprove = useCallback(async () => {
    if (!jobId) return;
    try {
      await approveStageEndpoint(jobId, 3);
      approveStage(3);
    } catch {
      setStageStatus(3, "failed");
    }
  }, [jobId, approveStage, setStageStatus]);

  if (!stage2Approved) {
    return (
      <section aria-label="Stage 3: Motion Design" className="p-4 text-slate-500 text-sm">
        Stage 2 must be approved before starting motion design.
      </section>
    );
  }

  const canApprove = stageStatus === "ready" && renderResult !== null;

  return (
    <section aria-label="Stage 3: Motion Design" className="space-y-6 p-4">
      <h2 className="text-lg font-semibold text-white">Stage 3 — Motion Design & 3D Layers</h2>

      <p className="text-sm text-slate-400">
        Choreograph punch-in zooms, 3D floating perspective cards, animated counters, and camera spring effects.
      </p>

      <button
        type="button"
        onClick={handleRender}
        disabled={isProcessing || !jobId}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Rendering Motion Layers..." : "Render Motion Design"}
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

      {renderResult && (
        <div className="grid grid-cols-2 gap-4 text-sm" role="status" aria-label="Render results">
          <div className="rounded bg-slate-800 p-3 text-center">
            <div className="text-slate-400">Video URL</div>
            <a
              href={renderResult.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline font-mono text-xs break-all"
            >
              {renderResult.videoUrl}
            </a>
          </div>
          <div className="rounded bg-slate-800 p-3 text-center">
            <div className="text-slate-400">Duration</div>
            <div className="text-lg font-mono text-white">{renderResult.durationSec.toFixed(1)}s</div>
          </div>
        </div>
      )}

      {renderResult?.videoUrl && (
        <div className="rounded border border-slate-700 bg-slate-900 p-2">
          <div className="text-xs text-slate-500 mb-1">Rendered Preview</div>
          <video src={renderResult.videoUrl} controls className="w-full rounded" aria-label="Rendered motion preview" />
        </div>
      )}

      <button
        type="button"
        onClick={handleApprove}
        disabled={!canApprove}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Approve Motion Design"
      >
        Approve Motion Design
      </button>
    </section>
  );
}

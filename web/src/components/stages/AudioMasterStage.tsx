"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { masterJob, approveStageEndpoint } from "@/lib/api";
import { connectJobSocket } from "@/lib/websocket";

export function AudioMasterStage() {
  const jobId = useEditorStore((s) => s.jobId);
  const stage3Approved = useEditorStore((s) => s.stageStatus[3] === "approved");
  const stageStatus = useEditorStore((s) => s.stageStatus[4]);
  const masterResult = useEditorStore((s) => s.masterResult);
  const qcReport = useEditorStore((s) => s.qcReport);
  const isProcessing = useEditorStore((s) => s.isProcessing);
  const progressLogs = useEditorStore((s) => s.progressLogs);

  const setStageStatus = useEditorStore((s) => s.setStageStatus);
  const approveStage = useEditorStore((s) => s.approveStage);
  const setMasterResult = useEditorStore((s) => s.setMasterResult);
  const setQcReport = useEditorStore((s) => s.setQcReport);

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
        if (update.stage === 4) {
          setStageStatus(4, update.status as "pending" | "processing" | "ready" | "approved" | "failed");
        }
      }
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [jobId, setStageStatus]);

  const handleMaster = useCallback(async () => {
    if (!jobId) return;
    useEditorStore.setState({ isProcessing: true, progressLogs: [] });
    setStageStatus(4, "processing");
    try {
      const result = await masterJob(jobId);
      setMasterResult({ masteredVideoUrl: result.masteredVideoUrl });
      if (result.qcReport) {
        setQcReport(result.qcReport);
      }
      setStageStatus(4, "ready");
    } catch {
      setStageStatus(4, "failed");
    } finally {
      useEditorStore.setState({ isProcessing: false });
    }
  }, [jobId, setStageStatus, setMasterResult, setQcReport]);

  const handleApprove = useCallback(async () => {
    if (!jobId) return;
    try {
      await approveStageEndpoint(jobId, 4);
      approveStage(4);
    } catch {
      setStageStatus(4, "failed");
    }
  }, [jobId, approveStage, setStageStatus]);

  if (!stage3Approved) {
    return (
      <section aria-label="Stage 4: Audio & QC" className="p-4 text-slate-500 text-sm">
        Stage 3 must be approved before starting audio mastering.
      </section>
    );
  }

  const canApprove = stageStatus === "ready" && masterResult !== null;
  const qcPassed = qcReport && (qcReport as Record<string, unknown>).passed === true;
  const qcErrors = qcReport ? ((qcReport as Record<string, unknown>).errors as string[] | undefined) ?? [] : [];
  const qcWarnings = qcReport ? ((qcReport as Record<string, unknown>).warnings as string[] | undefined) ?? [] : [];

  return (
    <section aria-label="Stage 4: Audio & QC" className="space-y-6 p-4">
      <h2 className="text-lg font-semibold text-white">Stage 4 — Audio Mastering & Quality Control</h2>

      <p className="text-sm text-slate-400">
        Level audio to -16 LUFS, add synchronized sound effects, render final 1080x1920 MP4, and run automated QC.
      </p>

      <button
        type="button"
        onClick={handleMaster}
        disabled={isProcessing || !jobId}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Mastering Audio & Running QC..." : "Master & Run QC"}
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

      {masterResult && (
        <div className="rounded bg-slate-800 p-3 text-sm" role="status" aria-label="Master result">
          <div className="text-slate-400 mb-1">Mastered Video</div>
          <a
            href={masterResult.masteredVideoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline font-mono text-xs break-all"
          >
            {masterResult.masteredVideoUrl}
          </a>
        </div>
      )}

      {masterResult?.masteredVideoUrl && (
        <div className="rounded border border-slate-700 bg-slate-900 p-2">
          <div className="text-xs text-slate-500 mb-1">Final Mastered Preview</div>
          <video src={masterResult.masteredVideoUrl} controls className="w-full rounded" aria-label="Mastered video preview" />
        </div>
      )}

      {qcReport && (
        <div className={`rounded border p-4 space-y-2 ${qcPassed ? "border-emerald-700 bg-emerald-950/30" : "border-red-700 bg-red-950/30"}`}>
          <h3 className="text-sm font-semibold text-white">QC Report</h3>
          <div className={`text-sm font-medium ${qcPassed ? "text-emerald-300" : "text-red-300"}`}>
            {qcPassed ? "All QC checks passed" : "QC checks failed — review errors below"}
          </div>
          {qcErrors.length > 0 && (
            <ul className="list-disc list-inside text-xs text-red-400 space-y-0.5">
              {qcErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
          {qcWarnings.length > 0 && (
            <ul className="list-disc list-inside text-xs text-yellow-400 space-y-0.5 mt-1">
              {qcWarnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleApprove}
        disabled={!canApprove}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Approve Final Reel"
      >
        Approve Final Reel
      </button>
    </section>
  );
}

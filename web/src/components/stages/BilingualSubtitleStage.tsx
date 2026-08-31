"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { transcribeJob, getPlan, commitPlan, approveStageEndpoint } from "@/lib/api";

const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E0}-\u{1F1FF}\u{E0020}-\u{E007F}\u{1FA00}-\u{1FAFF}]/gu;

function hasEmoji(text: string): boolean {
  return EMOJI_RE.test(text);
}

function validatePhraseBounds(
  sub: { startFrame: number; endFrame: number },
  fps: number,
  durationInFrames: number
): { valid: boolean; reason?: string } {
  const minFrame = 0;
  if (sub.startFrame < minFrame) {
    return { valid: false, reason: `startFrame ${sub.startFrame} is below minimum 0` };
  }
  if (sub.startFrame >= sub.endFrame) {
    return { valid: false, reason: `startFrame ${sub.startFrame} must be less than endFrame ${sub.endFrame}` };
  }
  if (sub.endFrame > durationInFrames) {
    return { valid: false, reason: `endFrame ${sub.endFrame} exceeds duration ${durationInFrames}` };
  }
  return { valid: true };
}

function frameToTime(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

interface ValidationIssue {
  subtitleId: number;
  reason: string;
}

export function BilingualSubtitleStage() {
  const jobId = useEditorStore((s) => s.jobId);
  const stage1Approved = useEditorStore((s) => s.stageStatus[1] === "approved");
  const stageStatus = useEditorStore((s) => s.stageStatus[2]);
  const draftPlan = useEditorStore((s) => s.draftPlan);
  const isProcessing = useEditorStore((s) => s.isProcessing);

  const setStageStatus = useEditorStore((s) => s.setStageStatus);
  const approveStage = useEditorStore((s) => s.approveStage);
  const setPlan = useEditorStore((s) => s.setPlan);
  const updateSubtitleText = useEditorStore((s) => s.updateSubtitleText);
  const toggleKeywordHighlight = useEditorStore((s) => s.toggleKeywordHighlight);

  const [highlightMode, setHighlightMode] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const fps = draftPlan.fps;
  const durationInFrames = draftPlan.durationInFrames;

  useEffect(() => {
    if (!jobId || !stage1Approved) return;
    let cancelled = false;
    (async () => {
      try {
        const plan = await getPlan(jobId);
        if (!cancelled) setPlan(plan);
      } catch {
        // ignore - plan may not exist yet
      }
    })();
    return () => { cancelled = true; };
  }, [jobId, stage1Approved, setPlan]);

  const handleTranscribe = useCallback(async () => {
    if (!jobId || !stage1Approved) return;
    setIsTranscribing(true);
    setStageStatus(2, "processing");
    try {
      await transcribeJob(jobId);
      const plan = await getPlan(jobId);
      setPlan(plan);
      setStageStatus(2, "ready");
    } catch {
      setStageStatus(2, "failed");
    } finally {
      setIsTranscribing(false);
    }
  }, [jobId, stage1Approved, setStageStatus, setPlan]);

  const validateAll = useCallback(() => {
    const issues: ValidationIssue[] = [];
    for (const sub of draftPlan.subtitles) {
      const result = validatePhraseBounds(sub, fps, durationInFrames);
      if (!result.valid && result.reason) {
        issues.push({ subtitleId: sub.id, reason: result.reason });
      }
    }
    setValidationIssues(issues);
    return issues;
  }, [draftPlan.subtitles, fps, durationInFrames]);

  useEffect(() => {
    validateAll();
  }, [validateAll]);

  const hasInvalidBounds = validationIssues.length > 0;
  const canApprove = stageStatus === "ready" && !hasInvalidBounds;

  const handleSave = useCallback(async () => {
    if (!jobId) return;
    setSaveError(null);
    try {
      await commitPlan(jobId, draftPlan);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save plan");
    }
  }, [jobId, draftPlan]);

  const handleApprove = useCallback(async () => {
    if (!jobId) return;
    const issues = validateAll();
    if (issues.length > 0) return;
    try {
      await commitPlan(jobId, draftPlan);
      await approveStageEndpoint(jobId, 2);
      approveStage(2);
    } catch {
      setStageStatus(2, "failed");
    }
  }, [jobId, draftPlan, validateAll, approveStage, setStageStatus]);

  const handleTranslationEdit = useCallback(
    (subtitleId: number, newTranslation: string) => {
      if (hasEmoji(newTranslation)) return;
      const sub = draftPlan.subtitles.find((s) => s.id === subtitleId);
      if (sub) {
        updateSubtitleText(subtitleId, sub.text, newTranslation);
      }
    },
    [draftPlan.subtitles, updateSubtitleText]
  );

  const handleTextEdit = useCallback(
    (subtitleId: number, newText: string) => {
      if (hasEmoji(newText)) return;
      const sub = draftPlan.subtitles.find((s) => s.id === subtitleId);
      if (sub) {
        updateSubtitleText(subtitleId, newText, sub.translation);
      }
    },
    [draftPlan.subtitles, updateSubtitleText]
  );

  const issueForSubtitle = useMemo(() => {
    const map = new Map<number, string>();
    for (const issue of validationIssues) {
      map.set(issue.subtitleId, issue.reason);
    }
    return map;
  }, [validationIssues]);

  if (!stage1Approved) {
    return (
      <section aria-label="Stage 2: Bilingual Captions" className="p-4 text-slate-500 text-sm">
        Stage 1 must be approved before starting transcription.
      </section>
    );
  }

  return (
    <section aria-label="Stage 2: Bilingual Captions" className="space-y-4 p-4">
      <h2 className="text-lg font-semibold text-white">Stage 2 — Bilingual Captions</h2>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTranscribe}
          disabled={isTranscribing || stageStatus === "processing"}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTranscribing ? "Transcribing..." : "Start Transcription"}
        </button>

        <button
          type="button"
          onClick={() => setHighlightMode((h) => !h)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            highlightMode ? "bg-yellow-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"
          }`}
          aria-label={highlightMode ? "Disable word highlight mode" : "Enable word highlight mode"}
        >
          {highlightMode ? "Highlight: ON" : "Highlight: OFF"}
        </button>
      </div>

      <div className="text-xs text-slate-500">
        FPS: <span className="font-mono text-slate-400">{fps}</span>
      </div>

      {hasInvalidBounds && (
        <div className="rounded border border-red-800 bg-red-950 p-3 text-sm text-red-300" role="alert">
          <div className="font-medium mb-1">Phrase bounds invalid:</div>
          <ul className="list-disc list-inside space-y-0.5">
            {validationIssues.map((issue) => (
              <li key={issue.subtitleId}>
                Subtitle #{issue.subtitleId}: {issue.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {draftPlan.subtitles.map((sub) => {
          const issue = issueForSubtitle.get(sub.id);
          const timeRange = `${frameToTime(sub.startFrame, fps)} → ${frameToTime(sub.endFrame, fps)}`;
          return (
            <div
              key={sub.id}
              className={`rounded-lg border p-3 space-y-2 ${
                issue ? "border-red-600 bg-red-950/30" : "border-slate-700 bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  #{sub.id} — {timeRange} (frames {sub.startFrame}–{sub.endFrame})
                </span>
                {issue && <span className="text-red-400">{issue}</span>}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor={`ar-${sub.id}`} className="block text-xs text-slate-500 mb-0.5">
                    Arabic
                  </label>
                  <input
                    id={`ar-${sub.id}`}
                    dir="rtl"
                    type="text"
                    value={sub.text}
                    onChange={(e) => handleTextEdit(sub.id, e.target.value)}
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label={`Arabic text for subtitle ${sub.id}`}
                  />
                </div>
                <div>
                  <label htmlFor={`en-${sub.id}`} className="block text-xs text-slate-500 mb-0.5">
                    English
                  </label>
                  <input
                    id={`en-${sub.id}`}
                    dir="ltr"
                    type="text"
                    value={sub.translation ?? ""}
                    onChange={(e) => handleTranslationEdit(sub.id, e.target.value)}
                    placeholder="Enter translation..."
                    className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    aria-label={`English translation for subtitle ${sub.id}`}
                  />
                </div>
              </div>

              {sub.words.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {sub.words.map((word, wIdx) => (
                    <button
                      key={wIdx}
                      type="button"
                      onClick={() => highlightMode && toggleKeywordHighlight(sub.id * 1000 + wIdx)}
                      className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                        word.highlight
                          ? "bg-yellow-500 text-black font-semibold"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      } ${highlightMode ? "cursor-pointer ring-1 ring-yellow-500/50" : "cursor-default"}`}
                      aria-label={`Word: ${word.word}${word.highlight ? " (highlighted)" : ""}`}
                      aria-pressed={word.highlight}
                    >
                      {word.word}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {saveError && (
        <div className="text-sm text-red-400" role="alert">{saveError}</div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
        <button
          type="button"
          onClick={handleSave}
          disabled={isProcessing}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50"
        >
          Save Draft
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={!canApprove}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Approve Bilingual Captions"
        >
          Approve Captions
        </button>
      </div>
    </section>
  );
}

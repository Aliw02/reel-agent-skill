import type { EditPlanV3 } from "../../../src/types/schema";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface JobResponse {
  job_id: string;
  status: string;
  raw_video_url: string;
  before_video_url?: string;
  after_video_url?: string;
}

export async function fetchJob(jobId: string): Promise<JobResponse> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}`);
  if (!res.ok) throw new Error(`Failed to fetch job: ${res.statusText}`);
  return res.json();
}

export async function createJob(file: File): Promise<JobResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/jobs`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Failed to create job: ${res.statusText}`);
  return res.json();
}

export async function approveStage(jobId: string, stage: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error(`Failed to approve stage: ${res.statusText}`);
}

export async function commitPlan(jobId: string, plan: EditPlanV3): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/plan`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error(`Failed to commit plan: ${res.statusText}`);
}

export async function trimJob(
  jobId: string,
  silenceThresholdDb: number
): Promise<{ before_duration_s: number; after_duration_s: number; removed_s: number }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/trim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ silence_threshold_db: silenceThresholdDb }),
  });
  if (!res.ok) throw new Error(`Failed to trim job: ${res.statusText}`);
  return res.json();
}

export async function transcribeJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/transcribe`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to transcribe job: ${res.statusText}`);
}

export async function getPlan(jobId: string): Promise<import("../../../src/types/schema").EditPlanV3> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/plan`);
  if (!res.ok) throw new Error(`Failed to fetch plan: ${res.statusText}`);
  return res.json();
}

export async function approveStageEndpoint(jobId: string, stage: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/stages/${stage}/approve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to approve stage ${stage}: ${res.statusText}`);
}

export async function sendCopilotMessage(
  jobId: string,
  message: string
): Promise<{ reply: string }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(`Copilot request failed: ${res.statusText}`);
  return res.json();
}

export async function renderJob(
  jobId: string
): Promise<{ videoUrl: string; durationSec: number }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/render`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to render job: ${res.statusText}`);
  return res.json();
}

export async function masterJob(
  jobId: string
): Promise<{ masteredVideoUrl: string; qcReport?: Record<string, unknown> }> {
  const res = await fetch(`${API_BASE}/api/jobs/${jobId}/master`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`Failed to master job: ${res.statusText}`);
  return res.json();
}

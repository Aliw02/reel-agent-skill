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

"use client";

import React, { useState } from "react";
import AiCopilotDrawer from "@/components/chat/AiCopilotDrawer";

export default function Home() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8">
      <header className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">AI Reel Studio</h1>
        <button
          onClick={() => setCopilotOpen(!copilotOpen)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
        >
          {copilotOpen ? "Close Copilot" : "Open Copilot"}
        </button>
      </header>

      {!jobId && (
        <div className="border-2 border-dashed border-zinc-700 rounded-lg p-12 text-center">
          <p className="text-zinc-400 mb-4">Upload a video to get started</p>
          <input
            type="file"
            accept="video/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const form = new FormData();
              form.append("file", file);
              try {
                const res = await fetch(
                  `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/jobs`,
                  { method: "POST", body: form }
                );
                if (res.ok) {
                  const data = await res.json();
                  setJobId(data.jobId);
                }
              } catch {
                // ignore
              }
            }}
            className="text-sm text-zinc-300"
          />
        </div>
      )}

      {jobId && (
        <div className="text-zinc-300">
          <p>
            Job loaded: <code className="text-emerald-400">{jobId}</code>
          </p>
        </div>
      )}

      {jobId && (
        <AiCopilotDrawer
          jobId={jobId}
          open={copilotOpen}
          onClose={() => setCopilotOpen(false)}
        />
      )}
    </main>
  );
}

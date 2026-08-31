"use client";

import React, { useCallback, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import { createJob } from "@/lib/api";

export default function FileUploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadJob = useEditorStore((s) => s.loadJob);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("video/") && !file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
        setError("Please upload a video file (MP4, MOV, AVI, MKV, WebM)");
        return;
      }
      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const fakeProgress = setInterval(() => {
          setUploadProgress((p) => Math.min(p + 10, 90));
        }, 200);

        const res = await createJob(file);
        clearInterval(fakeProgress);
        setUploadProgress(100);

        const videoUrl = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}${res.raw_video_url}`;
        loadJob(res.job_id, videoUrl);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setIsUploading(false);
      }
    },
    [loadJob]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={`
          relative w-full max-w-lg aspect-[4/3] rounded-xl border-2 border-dashed
          flex flex-col items-center justify-center gap-4 cursor-pointer
          transition-all duration-200
          ${isDragging
            ? "border-blue-500 bg-blue-500/10 scale-[1.02]"
            : "border-zinc-600 bg-zinc-900/50 hover:border-zinc-400 hover:bg-zinc-800/50"
          }
          ${isUploading ? "pointer-events-none opacity-70" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.mov,.avi,.mkv,.webm"
          onChange={handleChange}
          className="hidden"
        />

        {isUploading ? (
          <>
            <div className="w-16 h-16 rounded-full border-4 border-zinc-600 border-t-blue-500 animate-spin" />
            <div className="text-sm text-zinc-300">Uploading video...</div>
            <div className="w-48 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <svg
              className="w-12 h-12 text-zinc-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="text-center">
              <p className="text-sm font-medium text-zinc-200">
                Drop your raw footage here
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                or click to browse — MP4, MOV, AVI, MKV
              </p>
            </div>
            <div className="px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-400 hover:bg-zinc-700 transition-colors">
              Choose File
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="mt-3 px-4 py-2 rounded-lg bg-red-900/40 border border-red-800 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

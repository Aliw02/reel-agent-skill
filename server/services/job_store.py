from __future__ import annotations

import json
import os
import shutil
import uuid
from typing import Optional

from ..schemas import JobRecord

JOBS_ROOT = os.path.join(".temp", "jobs")

UPLOAD_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024  # 500 MB
ALLOWED_ARTIFACT_NAMES = {
    "trimmed.mp4",
    "transcript.json",
    "edit_plan.json",
    "director_trace.json",
    "media_analysis.json",
    "subject_track.json",
    "scene_analysis.json",
    "screen_roi.json",
    "mastered.mp4",
    "final.mp4",
}


def _job_dir(job_id: str) -> str:
    return os.path.join(JOBS_ROOT, job_id)


def _metadata_path(job_id: str) -> str:
    return os.path.join(_job_dir(job_id), "metadata.json")


def _probe_video(video_path: str) -> tuple[int, float]:
    try:
        file_size = os.path.getsize(video_path)
        if file_size < 1024 * 100:
            return 60, 0.0
        import cv2

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return 60, 0.0
        fps_val = cap.get(cv2.CAP_PROP_FPS) or 60.0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        duration = frame_count / fps_val if fps_val > 0 else 0.0
        cap.release()
        return round(fps_val), round(duration, 3)
    except Exception:
        return 60, 0.0


def _save_metadata(rec: JobRecord) -> None:
    os.makedirs(_job_dir(rec.job_id), exist_ok=True)
    with open(_metadata_path(rec.job_id), "w", encoding="utf-8") as f:
        json.dump(rec.model_dump(), f, ensure_ascii=False, indent=2)


def _load_metadata(job_id: str) -> Optional[JobRecord]:
    path = _metadata_path(job_id)
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return JobRecord(**data)


class JobStore:
    @staticmethod
    def create(upload_name: str, suffix: str) -> JobRecord:
        job_id = uuid.uuid4().hex[:12]
        ext = os.path.splitext(upload_name)[1].lower()
        if ext not in UPLOAD_EXTENSIONS:
            raise ValueError(f"Unsupported file extension: {ext}")
        base = os.path.join(_job_dir(job_id))
        os.makedirs(os.path.join(base, "raw"), exist_ok=True)
        os.makedirs(os.path.join(base, "artifacts"), exist_ok=True)
        rec = JobRecord(
            job_id=job_id,
            upload_name=upload_name,
            raw_filename=f"{uuid.uuid4().hex[:8]}{ext}",
        )
        _save_metadata(rec)
        return rec

    @staticmethod
    def get(job_id: str) -> Optional[JobRecord]:
        return _load_metadata(job_id)

    @staticmethod
    def save(rec: JobRecord) -> None:
        _save_metadata(rec)

    @staticmethod
    def validate_artifact_name(name: str) -> bool:
        return name in ALLOWED_ARTIFACT_NAMES

    @staticmethod
    def store_upload(job_id: str, upload_name: str, data: bytes) -> str:
        rec = _load_metadata(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        ext = os.path.splitext(upload_name)[1].lower()
        if ext not in UPLOAD_EXTENSIONS:
            raise ValueError(f"Unsupported file extension: {ext}")
        raw_dir = os.path.join(_job_dir(job_id), "raw")
        dest = os.path.join(raw_dir, rec.raw_filename)
        with open(dest, "wb") as f:
            f.write(data)
        _save_metadata(rec)
        return dest

    @staticmethod
    def probe_and_finalize(job_id: str) -> None:
        rec = _load_metadata(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        video_path = os.path.join(_job_dir(job_id), "raw", rec.raw_filename)
        fps, duration = _probe_video(video_path)
        if fps not in (30, 60):
            fps = 60
        rec.fps = fps
        rec.duration_sec = duration
        _save_metadata(rec)

    @staticmethod
    def get_raw_path(job_id: str) -> str:
        rec = _load_metadata(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        return os.path.join(_job_dir(job_id), "raw", rec.raw_filename)

    @staticmethod
    def get_artifact_path(job_id: str, name: str) -> str:
        return os.path.join(_job_dir(job_id), "artifacts", name)

    @staticmethod
    def validate_upload_size(size: int) -> None:
        if size > MAX_UPLOAD_BYTES:
            raise ValueError(f"Upload exceeds {MAX_UPLOAD_BYTES // (1024*1024)}MB limit")

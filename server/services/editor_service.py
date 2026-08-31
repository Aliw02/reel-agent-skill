from __future__ import annotations

import json
import os
import shutil
import sys
from typing import Any, Dict, Optional

from .job_store import JobStore

_SCRIPTS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

try:
    from cut_silence import cut_silence as _cut_silence
except ImportError:
    _cut_silence = None

try:
    from transcribe import transcribe_video as _transcribe_video
except ImportError:
    _transcribe_video = None

try:
    from analyze_media import analyze_media as _analyze_media
except ImportError:
    _analyze_media = None

try:
    from track_subject import track_subject as _track_subject
except ImportError:
    _track_subject = None

try:
    from scene_detect import detect_scenes as _detect_scenes
except ImportError:
    _detect_scenes = None

try:
    from analyze_screen import analyze_screen_roi as _analyze_screen_roi
except ImportError:
    _analyze_screen_roi = None

try:
    from director import create_edit_plan_file as _create_edit_plan_file
except ImportError:
    _create_edit_plan_file = None

try:
    from audio_processor import normalize_voice_loudness as _normalize_voice_loudness
except ImportError:
    _normalize_voice_loudness = None


class EditorService:
    @staticmethod
    def run_trim(job_id: str, threshold_db: int = -30) -> None:
        rec = JobStore.get(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        if _cut_silence is None:
            raise RuntimeError("cut_silence module not available")
        input_path = JobStore.get_raw_path(job_id)
        output_path = JobStore.get_artifact_path(job_id, "trimmed.mp4")
        _cut_silence(input_path, output_path, silence_thresh_db=threshold_db)

    @staticmethod
    def run_transcription(
        job_id: str, model: str = "turbo", language: str = "ar"
    ) -> None:
        rec = JobStore.get(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        if _transcribe_video is None:
            raise RuntimeError("transcribe module not available")
        video_path = JobStore.get_artifact_path(job_id, "trimmed.mp4")
        output_path = JobStore.get_artifact_path(job_id, "transcript.json")
        _transcribe_video(
            video_path=video_path,
            output_json=output_path,
            model_size=model,
            language=language,
            fps=rec.fps,
        )

    @staticmethod
    def run_analysis(job_id: str) -> None:
        rec = JobStore.get(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        video_path = JobStore.get_artifact_path(job_id, "trimmed.mp4")
        if _analyze_media is not None:
            _analyze_media(video_path, JobStore.get_artifact_path(job_id, "media_analysis.json"))
        if _track_subject is not None:
            _track_subject(video_path, fps=rec.fps, output_json=JobStore.get_artifact_path(job_id, "subject_track.json"))
        if _detect_scenes is not None:
            _detect_scenes(video_path, fps=rec.fps, output_json=JobStore.get_artifact_path(job_id, "scene_analysis.json"))
        if _analyze_screen_roi is not None:
            _analyze_screen_roi(video_path, fps=rec.fps, output_json=JobStore.get_artifact_path(job_id, "screen_roi.json"))

    @staticmethod
    def run_plan(job_id: str, title: Optional[str] = None) -> None:
        rec = JobStore.get(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        if _create_edit_plan_file is None:
            raise RuntimeError("director module not available")
        transcript_path = JobStore.get_artifact_path(job_id, "transcript.json")
        output_path = JobStore.get_artifact_path(job_id, "edit_plan.json")
        media_path = JobStore.get_artifact_path(job_id, "media_analysis.json")
        scene_path = JobStore.get_artifact_path(job_id, "scene_analysis.json")
        tracking_path = JobStore.get_artifact_path(job_id, "subject_track.json")
        screen_path = JobStore.get_artifact_path(job_id, "screen_roi.json")
        trace_path = JobStore.get_artifact_path(job_id, "director_trace.json")
        _create_edit_plan_file(
            transcript_json_path=transcript_path,
            output_edit_plan_path=output_path,
            media_analysis_path=media_path if os.path.exists(media_path) else None,
            scene_analysis_path=scene_path if os.path.exists(scene_path) else None,
            subject_tracking_path=tracking_path if os.path.exists(tracking_path) else None,
            screen_roi_path=screen_path if os.path.exists(screen_path) else None,
            trace_output_path=trace_path,
            title=title,
            fps=rec.fps,
        )

    @staticmethod
    def save_plan(job_id: str, plan: Dict[str, Any]) -> Dict[str, Any]:
        output_path = JobStore.get_artifact_path(job_id, "edit_plan.json")
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(plan, f, ensure_ascii=False, indent=2)
        return plan

    @staticmethod
    def load_plan(job_id: str) -> Dict[str, Any]:
        path = JobStore.get_artifact_path(job_id, "edit_plan.json")
        if not os.path.exists(path):
            raise FileNotFoundError(f"No plan found for job {job_id}")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    @staticmethod
    def run_master(job_id: str) -> None:
        rec = JobStore.get(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        if _normalize_voice_loudness is None:
            raise RuntimeError("audio_processor module not available")
        input_path = JobStore.get_artifact_path(job_id, "trimmed.mp4")
        output_path = JobStore.get_artifact_path(job_id, "mastered.mp4")
        _normalize_voice_loudness(input_path, output_path)

    @staticmethod
    def run_render(job_id: str) -> None:
        rec = JobStore.get(job_id)
        if rec is None:
            raise KeyError(f"Job {job_id} not found")
        mastered = JobStore.get_artifact_path(job_id, "mastered.mp4")
        final = JobStore.get_artifact_path(job_id, "final.mp4")
        shutil.copy2(mastered, final)

from __future__ import annotations

import json
import os
from unittest.mock import MagicMock, patch

import pytest

from server.schemas import JobRecord, StageName, StageStatus
from server.services.job_store import JobStore
from server.services import editor_service
from server.services.editor_service import EditorService


@pytest.fixture()
def _mock_scripts():
    with patch.object(editor_service, "_cut_silence") as mock_cut, \
         patch.object(editor_service, "_transcribe_video") as mock_transcribe, \
         patch.object(editor_service, "_analyze_media") as mock_analyze, \
         patch.object(editor_service, "_track_subject") as mock_track, \
         patch.object(editor_service, "_detect_scenes") as mock_scenes, \
         patch.object(editor_service, "_analyze_screen_roi") as mock_screen, \
         patch.object(editor_service, "_create_edit_plan_file") as mock_plan, \
         patch.object(editor_service, "_normalize_voice_loudness") as mock_master, \
         patch("server.services.editor_service.shutil") as mock_shutil:
        yield {
            "cut": mock_cut,
            "transcribe": mock_transcribe,
            "analyze": mock_analyze,
            "track": mock_track,
            "scenes": mock_scenes,
            "screen": mock_screen,
            "plan": mock_plan,
            "master": mock_master,
            "shutil": mock_shutil,
        }


def test_run_trim_calls_cut_silence(client, job_id, _mock_scripts):
    EditorService.run_trim(job_id, threshold_db=-30)
    _mock_scripts["cut"].assert_called_once()


def test_run_transcription_calls_transcribe(client, job_id, _mock_scripts):
    EditorService.run_transcription(job_id, model="turbo", language="ar")
    _mock_scripts["transcribe"].assert_called_once()


def test_run_plan_calls_director(client, job_id, _mock_scripts):
    EditorService.run_plan(job_id, title="Test")
    _mock_scripts["plan"].assert_called_once()


def test_run_master_calls_normalize(client, job_id, _mock_scripts):
    EditorService.run_master(job_id)
    _mock_scripts["master"].assert_called_once()


def test_run_analysis_calls_all_analyzers(client, job_id, _mock_scripts):
    EditorService.run_analysis(job_id)
    _mock_scripts["analyze"].assert_called_once()
    _mock_scripts["track"].assert_called_once()
    _mock_scripts["scenes"].assert_called_once()
    _mock_scripts["screen"].assert_called_once()


def test_save_plan_persists(client, job_id, _mock_scripts):
    plan = {"version": "3.0.0", "fps": 60, "scenes": [], "subtitles": []}
    result = EditorService.save_plan(job_id, plan)
    assert result["version"] == "3.0.0"
    path = JobStore.get_artifact_path(job_id, "edit_plan.json")
    assert os.path.exists(path)


def test_load_plan_returns_saved(client, job_id, _mock_scripts):
    plan = {"version": "3.0.0", "fps": 60, "scenes": [], "subtitles": []}
    EditorService.save_plan(job_id, plan)
    loaded = EditorService.load_plan(job_id)
    assert loaded["version"] == "3.0.0"


def test_run_render_copies_mastered(client, job_id, _mock_scripts):
    EditorService.run_render(job_id)
    _mock_scripts["shutil"].copy2.assert_called_once()

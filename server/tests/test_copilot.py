from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from server.schemas import JobRecord
from server.services.copilot_service import (
    compute_draft_plan,
    get_or_create_session,
    get_session,
    remove_session,
    stream_copilot,
    CopilotSession,
)
from server.services.llm_provider import (
    validate_action,
    validate_prompt,
    EMOJI_PATTERN,
    SHELL_PATTERNS,
    PATH_TRAVERSAL_PATTERN,
    VALID_ACTION_TYPES,
)


class TestPromptValidation:
    def test_rejects_shell_rm(self):
        with pytest.raises(ValueError, match="shell syntax"):
            validate_prompt("run rm -rf /")

    def test_rejects_shell_backtick(self):
        with pytest.raises(ValueError, match="shell syntax"):
            validate_prompt("execute `whoami`")

    def test_rejects_path_traversal(self):
        with pytest.raises(ValueError, match="path traversal"):
            validate_prompt("read ../../etc/passwd")

    def test_rejects_windows_path(self):
        with pytest.raises(ValueError, match="path traversal"):
            validate_prompt("open C:\\Windows\\system32")

    def test_rejects_long_prompt(self):
        with pytest.raises(ValueError, match="character limit"):
            validate_prompt("a" * 9000)

    def test_accepts_normal_prompt(self):
        result = validate_prompt("Change the title to Hello World")
        assert result == "Change the title to Hello World"


class TestActionValidation:
    def test_rejects_unknown_action_type(self):
        with pytest.raises(ValueError, match="Unknown action type"):
            validate_action({"type": "delete_scene"})

    def test_rejects_emoji_in_subtitle_text(self):
        with pytest.raises(ValueError, match="emoji"):
            validate_action({"type": "update_subtitle", "id": 0, "text": "Hello 🎉"})

    def test_rejects_emoji_in_title(self):
        with pytest.raises(ValueError, match="emoji"):
            validate_action({"type": "set_title", "title": "Title 🚀"})

    def test_rejects_emoji_in_hook_title(self):
        with pytest.raises(ValueError, match="emoji"):
            validate_action({"type": "set_hook", "title": "Hook 🔥"})

    def test_accepts_valid_set_title(self):
        result = validate_action({"type": "set_title", "title": "New Title"})
        assert result["type"] == "set_title"
        assert result["title"] == "New Title"

    def test_accepts_valid_update_subtitle(self):
        result = validate_action({"type": "update_subtitle", "id": 1, "text": "Updated"})
        assert result["type"] == "update_subtitle"

    def test_accepts_valid_set_hook(self):
        result = validate_action({"type": "set_hook", "title": "Hook Title"})
        assert result["type"] == "set_hook"


class TestComputeDraftPlan:
    def test_set_title(self):
        committed = {"version": "3.0.0", "title": "Old", "subtitles": []}
        actions = [{"type": "set_title", "title": "New"}]
        draft = compute_draft_plan(committed, actions)
        assert draft["title"] == "New"

    def test_update_subtitle(self):
        committed = {
            "version": "3.0.0",
            "subtitles": [
                {"id": 0, "text": "Hello", "translation": "Hi"},
                {"id": 1, "text": "World", "translation": "Globe"},
            ],
        }
        actions = [{"type": "update_subtitle", "id": 1, "text": "Universe"}]
        draft = compute_draft_plan(committed, actions)
        assert draft["subtitles"][0]["text"] == "Hello"
        assert draft["subtitles"][1]["text"] == "Universe"
        assert draft["subtitles"][1]["emoji"] is None

    def test_set_hook(self):
        committed = {"version": "3.0.0", "subtitles": []}
        actions = [{"type": "set_hook", "title": "Hook", "subtitle": "Sub"}]
        draft = compute_draft_plan(committed, actions)
        assert draft["hook"]["title"] == "Hook"
        assert draft["hook"]["subtitle"] == "Sub"
        assert draft["hook"]["enabled"] is True

    def test_does_not_mutate_committed(self):
        committed = {"version": "3.0.0", "title": "Old", "subtitles": []}
        actions = [{"type": "set_title", "title": "New"}]
        compute_draft_plan(committed, actions)
        assert committed["title"] == "Old"


class TestSessionManagement:
    def test_create_and_get_session(self):
        remove_session("test-job")
        session = get_or_create_session(
            "test-job", provider_id="openai", model_id="gpt-4"
        )
        assert session.job_id == "test-job"
        assert session.provider_id == "openai"
        assert get_session("test-job") is session
        remove_session("test-job")

    def test_remove_session(self):
        get_or_create_session("test-job-2")
        remove_session("test-job-2")
        assert get_session("test-job-2") is None

    def test_session_cancel(self):
        session = CopilotSession(job_id="cancel-test")
        assert not session.is_cancelled
        session.cancel()
        assert session.is_cancelled


class TestCopilotAPIRoutes:
    def test_list_models(self, client: TestClient):
        with patch("server.routers.chat.get_catalog") as mock_catalog:
            mock_catalog.return_value.fetch_providers.return_value = [
                {
                    "providerID": "openai",
                    "modelID": "gpt-4",
                    "displayName": "GPT-4",
                    "providerName": "OpenAI",
                }
            ]
            resp = client.get("/api/opencode/models")
            assert resp.status_code == 200
            body = resp.json()
            assert len(body["models"]) == 1
            assert body["models"][0]["providerID"] == "openai"

    def test_set_copilot_model(self, client: TestClient, job_id: str):
        resp = client.put(
            f"/api/jobs/{job_id}/copilot/model",
            json={"providerID": "openai", "modelID": "gpt-4"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_apply_draft_stale_version(self, client: TestClient, job_id: str):
        get_or_create_session(
            job_id,
            provider_id="openai",
            model_id="gpt-4",
            committed_plan={"version": "3.0.0", "subtitles": []},
            base_version="3.0.0",
        )
        resp = client.post(
            f"/api/jobs/{job_id}/copilot/apply",
            json={"baseVersion": "2.0.0"},
        )
        assert resp.status_code == 409
        remove_session(job_id)

    def test_apply_draft_no_session(self, client: TestClient, job_id: str):
        resp = client.post(
            f"/api/jobs/{job_id}/copilot/apply",
            json={"baseVersion": "3.0.0"},
        )
        assert resp.status_code == 404

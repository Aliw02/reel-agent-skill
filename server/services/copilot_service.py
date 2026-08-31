from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Dict, List, Optional

from .llm_provider import (
    LLMProvider,
    MAX_STREAM_DURATION,
    validate_action,
)


@dataclass
class CopilotSession:
    job_id: str
    provider_id: Optional[str] = None
    model_id: Optional[str] = None
    provider: Optional[LLMProvider] = field(default=None, init=False, repr=False)
    committed_plan: Dict[str, Any] = field(default_factory=dict)
    draft_actions: List[Dict[str, Any]] = field(default_factory=list)
    base_version: str = ""
    started_at: float = field(default_factory=time.monotonic)
    _cancelled: bool = field(default=False, init=False, repr=False)

    def cancel(self) -> None:
        self._cancelled = True

    @property
    def is_cancelled(self) -> bool:
        return self._cancelled


_sessions: Dict[str, CopilotSession] = {}


def get_or_create_session(
    job_id: str,
    provider_id: Optional[str] = None,
    model_id: Optional[str] = None,
    committed_plan: Optional[Dict[str, Any]] = None,
    base_version: str = "",
) -> CopilotSession:
    if job_id in _sessions:
        return _sessions[job_id]
    session = CopilotSession(
        job_id=job_id,
        provider_id=provider_id,
        model_id=model_id,
        committed_plan=committed_plan or {},
        base_version=base_version,
    )
    session.provider = LLMProvider(
        provider_id=provider_id,
        model_id=model_id,
    )
    _sessions[job_id] = session
    return session


def get_session(job_id: str) -> Optional[CopilotSession]:
    return _sessions.get(job_id)


def remove_session(job_id: str) -> None:
    _sessions.pop(job_id, None)


MAX_ACTIONS_PER_STREAM = 50


async def stream_copilot(
    session: CopilotSession,
    prompt: str,
    on_token: Callable[[str], Any],
    on_action: Callable[[Dict[str, Any]], Any],
    on_draft: Callable[[List[Dict[str, Any]]], Any],
) -> List[Dict[str, Any]]:
    assert session.provider is not None
    collected_actions: List[Dict[str, Any]] = []
    json_buffer = ""

    await session.provider.send_prompt(prompt)

    try:
        async for event in session.provider.stream_events():
            if session.is_cancelled:
                break
            elapsed = time.monotonic() - session.started_at
            if elapsed > MAX_STREAM_DURATION:
                break
            if len(collected_actions) >= MAX_ACTIONS_PER_STREAM:
                break

            event_type = event.get("type", "")
            if event_type == "text":
                text = event.get("text", "")
                if text:
                    await on_token(text)
            elif event_type == "result":
                result_data = event.get("result")
                if isinstance(result_data, str):
                    json_buffer += result_data
                elif isinstance(result_data, dict):
                    json_buffer = json.dumps(result_data)

                if json_buffer:
                    try:
                        parsed = json.loads(json_buffer)
                        actions = (
                            parsed if isinstance(parsed, list) else [parsed]
                        )
                        for raw_action in actions:
                            if len(collected_actions) >= MAX_ACTIONS_PER_STREAM:
                                break
                            try:
                                validated = validate_action(raw_action)
                                collected_actions.append(validated)
                                await on_action(validated)
                                await on_draft(collected_actions)
                            except ValueError:
                                continue
                        json_buffer = ""
                    except json.JSONDecodeError:
                        pass
    finally:
        await session.provider.close()

    return collected_actions


def compute_draft_plan(
    committed_plan: Dict[str, Any],
    actions: List[Dict[str, Any]],
) -> Dict[str, Any]:
    draft = dict(committed_plan)
    for action in actions:
        action_type = action.get("type")
        if action_type == "set_title":
            draft["title"] = action.get("title", "")
        elif action_type == "update_subtitle":
            subtitles = list(draft.get("subtitles", []))
            sub_id = action.get("id")
            for i, sub in enumerate(subtitles):
                if sub.get("id") == sub_id:
                    updated = dict(sub)
                    updated["text"] = action.get("text", sub.get("text", ""))
                    if "translation" in action:
                        updated["translation"] = action.get("translation")
                    updated["emoji"] = None
                    subtitles[i] = updated
                    break
            draft["subtitles"] = subtitles
        elif action_type == "set_hook":
            hook = dict(draft.get("hook", {}))
            hook["enabled"] = True
            hook["title"] = action.get("title", hook.get("title", ""))
            if "subtitle" in action:
                hook["subtitle"] = action.get("subtitle")
            draft["hook"] = hook
    return draft

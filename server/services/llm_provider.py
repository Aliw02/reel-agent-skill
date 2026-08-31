from __future__ import annotations

import asyncio
import json
import os
import re
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx


OPENCODE_BASE_URL = os.environ.get("STUDIO_OPENCODE_BASE_URL", "http://localhost:4096")
OPENCODE_API_KEY = os.environ.get("STUDIO_OPENCODE_API_KEY", "")
SESSION_TIMEOUT = 30.0
MAX_PROMPT_LENGTH = 8000
MAX_STREAM_DURATION = 120.0

SHELL_PATTERNS = re.compile(
    r"(\b(rm|del|shutdown|reboot|format|mkfs|dd|eval|exec|system|popen|__import__)\b"
    r"|`[^`]*`"
    r"|\$\([^)]*\)"
    r"|>[^>]"
    r";)"
)
PATH_TRAVERSAL_PATTERN = re.compile(r"(\.\.[\\/])|([/\\]etc[/\\]|[cC]:\\[Ww]indows)")
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001F9FF"
    "\U00002600-\U000027BF"
    "\U0000FE00-\U0000FE0F"
    "\U0000200D"
    "\U0001F1E0-\U0001F1FF"
    "\U0001FA00-\U0001FAFF"
    "]",
    flags=re.UNICODE,
)

VALID_ACTION_TYPES = {
    "set_title",
    "update_subtitle",
    "set_hook",
}


def validate_prompt(prompt: str) -> str:
    if len(prompt) > MAX_PROMPT_LENGTH:
        raise ValueError(f"Prompt exceeds {MAX_PROMPT_LENGTH} character limit")
    if SHELL_PATTERNS.search(prompt):
        raise ValueError("Prompt contains forbidden shell syntax")
    if PATH_TRAVERSAL_PATTERN.search(prompt):
        raise ValueError("Prompt contains path traversal patterns")
    return prompt


def validate_action(action: Dict[str, Any]) -> Dict[str, Any]:
    action_type = action.get("type")
    if action_type not in VALID_ACTION_TYPES:
        raise ValueError(f"Unknown action type: {action_type}")
    if action_type == "update_subtitle":
        text = action.get("text", "")
        if EMOJI_PATTERN.search(str(text)):
            raise ValueError("Caption text must not contain emoji")
    if action_type == "set_title":
        title = action.get("title", "")
        if EMOJI_PATTERN.search(str(title)):
            raise ValueError("Title text must not contain emoji")
    if action_type == "set_hook":
        hook_title = action.get("title", "")
        if EMOJI_PATTERN.search(str(hook_title)):
            raise ValueError("Hook title must not contain emoji")
    return action


@dataclass
class LLMProvider:
    base_url: str = OPENCODE_BASE_URL
    api_key: str = OPENCODE_API_KEY
    provider_id: Optional[str] = None
    model_id: Optional[str] = None
    _session_id: Optional[str] = field(default=None, init=False, repr=False)
    _client: Optional[httpx.AsyncClient] = field(default=None, init=False, repr=False)

    @property
    def _headers(self) -> Dict[str, str]:
        h: Dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=self._headers,
                timeout=httpx.Timeout(SESSION_TIMEOUT),
            )
        return self._client

    async def ensure_session(self) -> str:
        if self._session_id:
            return self._session_id
        client = await self._get_client()
        body: Dict[str, Any] = {"providerID": self.provider_id} if self.provider_id else {}
        if self.model_id:
            body["modelID"] = self.model_id
        resp = await client.post("/session", json=body)
        resp.raise_for_status()
        data = resp.json()
        self._session_id = data.get("id") or data.get("sessionID")
        if not self._session_id:
            raise RuntimeError("OpenCode did not return a session ID")
        return self._session_id

    async def stream_events(self) -> AsyncIterator[Dict[str, Any]]:
        client = await self._get_client()
        session_id = await self.ensure_session()
        url = f"/session/{session_id}/event"
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            buffer = ""
            async for chunk in resp.aiter_text():
                buffer += chunk
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line or line.startswith(":"):
                        continue
                    if line.startswith("data: "):
                        payload = line[6:]
                        try:
                            event = json.loads(payload)
                            yield event
                        except json.JSONDecodeError:
                            pass

    async def send_prompt(self, prompt: str, output_format: Optional[Dict[str, Any]] = None) -> None:
        validated = validate_prompt(prompt)
        client = await self._get_client()
        session_id = await self.ensure_session()
        body: Dict[str, Any] = {"content": validated}
        if output_format:
            body["outputFormat"] = output_format
        resp = await client.post(f"/session/{session_id}/prompt_async", json=body)
        resp.raise_for_status()

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

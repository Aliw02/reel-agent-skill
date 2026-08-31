from __future__ import annotations

import asyncio
from typing import Any, Dict

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self) -> None:
        self._connections: Dict[str, list[WebSocket]] = {}

    async def connect(self, job_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.setdefault(job_id, []).append(ws)

    def disconnect(self, job_id: str, ws: WebSocket) -> None:
        conns = self._connections.get(job_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, job_id: str, event: str, data: Dict[str, Any]) -> None:
        conns = self._connections.get(job_id, [])
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_json({"event": event, **data})
            except Exception:
                dead.append(ws)
        for ws in dead:
            conns.remove(ws)


manager = WebSocketManager()

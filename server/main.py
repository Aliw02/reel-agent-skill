from __future__ import annotations

import os
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .routers.pipeline import router as pipeline_router
from .services.websocket_manager import manager

app = FastAPI(title="AI Reel Studio", version="0.1.0")

_allowed = os.environ.get("STUDIO_ALLOWED_ORIGINS", "http://localhost:3001")
origins: List[str] = [o.strip() for o in _allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

app.include_router(pipeline_router)


@app.websocket("/ws/jobs/{job_id}")
async def ws_jobs(websocket: WebSocket, job_id: str):
    await manager.connect(job_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(job_id, websocket)

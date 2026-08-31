from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from ..schemas import (
    CopilotApplyRequest,
    CopilotModelRequest,
    ErrorResponse,
    JobRecord,
    ProviderListResponse,
    ProviderModel,
)
from ..services.copilot_service import (
    compute_draft_plan,
    get_or_create_session,
    get_session,
    remove_session,
    stream_copilot,
)
from ..services.job_store import JobStore
from ..services.opencode_catalog import get_catalog

router = APIRouter(prefix="/api", tags=["copilot"])


def _require_job(job_id: str) -> JobRecord:
    rec = JobStore.get(job_id)
    if rec is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return rec


@router.get("/opencode/models", response_model=ProviderListResponse)
async def list_models() -> ProviderListResponse:
    catalog = get_catalog()
    models_raw = catalog.fetch_providers()
    models = [ProviderModel(**m) for m in models_raw]
    return ProviderListResponse(models=models)


@router.put("/jobs/{job_id}/copilot/model")
async def set_copilot_model(job_id: str, body: CopilotModelRequest) -> Dict[str, str]:
    _require_job(job_id)
    session = get_session(job_id)
    if session:
        session.provider_id = body.provider_id
        session.model_id = body.model_id
    return {"status": "ok"}


@router.post("/jobs/{job_id}/copilot/apply")
async def apply_copilot_draft(job_id: str, body: CopilotApplyRequest) -> Dict[str, Any]:
    rec = _require_job(job_id)
    session = get_session(job_id)
    if session is None:
        raise HTTPException(status_code=404, detail="No active copilot session")

    if body.base_version != session.base_version:
        raise HTTPException(
            status_code=409,
            detail="Stale baseVersion; the plan has been modified since the stream started",
        )

    try:
        from ..services.editor_service import EditorService

        plan = EditorService.load_plan(job_id)
    except FileNotFoundError:
        plan = {"version": body.base_version, "fps": 30, "scenes": [], "subtitles": []}

    merged = compute_draft_plan(plan, session.draft_actions)
    EditorService.save_plan(job_id, merged)
    session.base_version = merged.get("version", body.base_version)
    session.committed_plan = merged
    session.draft_actions = []
    remove_session(job_id)
    return {"status": "applied", "version": merged.get("version", body.base_version)}


@router.websocket("/ws/jobs/{job_id}/copilot")
async def ws_copilot(websocket: WebSocket, job_id: str) -> None:
    await websocket.accept()
    rec = JobStore.get(job_id)
    if rec is None:
        await websocket.send_json({"event": "error", "detail": f"Job {job_id} not found"})
        await websocket.close()
        return

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "")

            if event_type == "start":
                prompt = data.get("prompt", "")
                provider_id = data.get("providerID")
                model_id = data.get("modelID")
                committed_plan = data.get("committedPlan", {})
                base_version = data.get("baseVersion", "")

                session = get_or_create_session(
                    job_id=job_id,
                    provider_id=provider_id,
                    model_id=model_id,
                    committed_plan=committed_plan,
                    base_version=base_version,
                )

                async def on_token(text: str) -> None:
                    await websocket.send_json({"event": "token", "text": text})

                async def on_action(action: Dict[str, Any]) -> None:
                    await websocket.send_json({"event": "action", "action": action})

                async def on_draft(actions: List[Dict[str, Any]]) -> None:
                    await websocket.send_json({"event": "draft", "actions": actions})

                try:
                    actions = await stream_copilot(
                        session, prompt, on_token, on_action, on_draft
                    )
                    await websocket.send_json({"event": "done"})
                except Exception as exc:
                    await websocket.send_json({"event": "error", "detail": str(exc)})
                finally:
                    remove_session(job_id)

            elif event_type == "cancel":
                session = get_session(job_id)
                if session:
                    session.cancel()
                await websocket.send_json({"event": "done"})

    except WebSocketDisconnect:
        remove_session(job_id)

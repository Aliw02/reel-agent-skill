from __future__ import annotations

import os
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..schemas import (
    APPROVED_BEFORE,
    STAGE_ORDER,
    ErrorResponse,
    JobCreatedResponse,
    JobRecord,
    JobStatusResponse,
    PlanResponse,
    StageName,
    StageResponse,
    StageStatus,
)
from ..services.editor_service import EditorService
from ..services.job_store import JobStore
from ..services.websocket_manager import manager

router = APIRouter(prefix="/api", tags=["jobs"])


def _require_job(job_id: str) -> JobRecord:
    rec = JobStore.get(job_id)
    if rec is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    return rec


def _require_stage_approval(rec: JobRecord, stage: StageName) -> None:
    required = APPROVED_BEFORE.get(stage)
    if required is not None and rec.get_stage(required) != StageStatus.approved:
        raise HTTPException(
            status_code=409,
            detail=f"Stage '{stage.value}' requires '{required.value}' to be approved first",
        )


def _set_processing(rec: JobRecord, stage: StageName) -> None:
    rec.set_stage(stage, StageStatus.processing)
    JobStore.save(rec)


def _set_ready(rec: JobRecord, stage: StageName) -> None:
    rec.set_stage(stage, StageStatus.ready)
    JobStore.save(rec)


def _set_failed(rec: JobRecord, stage: StageName, error: str) -> None:
    rec.set_stage(stage, StageStatus.failed)
    JobStore.save(rec)


@router.post("/jobs", response_model=JobCreatedResponse)
async def upload_job(
    file: UploadFile = File(...),
) -> JobCreatedResponse:
    content = await file.read()
    JobStore.validate_upload_size(len(content))
    suffix = os.path.splitext(file.filename or "upload.mp4")[1]
    rec = JobStore.create(file.filename or "upload.mp4", suffix)
    JobStore.store_upload(rec.job_id, file.filename or "upload.mp4", content)
    JobStore.probe_and_finalize(rec.job_id)
    rec = JobStore.get(rec.job_id)
    return JobCreatedResponse(
        jobId=rec.job_id,
        status="created",
        rawUrl=f"/api/jobs/{rec.job_id}/artifacts/{rec.raw_filename}",
        fps=rec.fps,
        durationSec=rec.duration_sec,
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job(job_id: str) -> JobStatusResponse:
    rec = _require_job(job_id)
    return JobStatusResponse(
        jobId=rec.job_id,
        status="active",
        rawUrl=f"/api/jobs/{rec.job_id}/artifacts/{rec.raw_filename}",
        fps=rec.fps,
        durationSec=rec.duration_sec,
        stages=rec.stages,
    )


@router.post("/jobs/{job_id}/trim", response_model=StageResponse, status_code=202)
async def trigger_trim(
    job_id: str,
    threshold_db: int = Form(default=-30),
    input_path: Optional[str] = Form(default=None),
) -> StageResponse:
    if input_path is not None:
        raise HTTPException(status_code=400, detail="Client-supplied paths are not accepted")
    rec = _require_job(job_id)
    _require_stage_approval(rec, StageName.trim)
    if rec.get_stage(StageName.trim) == StageStatus.processing:
        raise HTTPException(status_code=409, detail="Trim already in progress")
    _set_processing(rec, StageName.trim)
    await manager.broadcast(job_id, "stage_status", {"stage": "trim", "status": "processing"})
    try:
        EditorService.run_trim(job_id, threshold_db=threshold_db)
        _set_ready(rec, StageName.trim)
        await manager.broadcast(job_id, "stage_status", {"stage": "trim", "status": "ready"})
    except Exception as exc:
        _set_failed(rec, StageName.trim, str(exc))
        await manager.broadcast(job_id, "stage_error", {"stage": "trim", "error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Trim failed: {exc}")
    return StageResponse(jobId=job_id, stage="trim", status=StageStatus.ready)


@router.post("/jobs/{job_id}/transcribe", response_model=StageResponse, status_code=202)
async def trigger_transcribe(
    job_id: str, model: str = Form(default="turbo"), language: str = Form(default="ar")
) -> StageResponse:
    rec = _require_job(job_id)
    _require_stage_approval(rec, StageName.transcribe)
    if rec.get_stage(StageName.transcribe) == StageStatus.processing:
        raise HTTPException(status_code=409, detail="Transcription already in progress")
    _set_processing(rec, StageName.transcribe)
    await manager.broadcast(job_id, "stage_status", {"stage": "transcribe", "status": "processing"})
    try:
        EditorService.run_transcription(job_id, model=model, language=language)
        _set_ready(rec, StageName.transcribe)
        await manager.broadcast(job_id, "stage_status", {"stage": "transcribe", "status": "ready"})
    except Exception as exc:
        _set_failed(rec, StageName.transcribe, str(exc))
        await manager.broadcast(job_id, "stage_error", {"stage": "transcribe", "error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")
    return StageResponse(jobId=job_id, stage="transcribe", status=StageStatus.ready)


@router.post("/jobs/{job_id}/plan", response_model=StageResponse, status_code=202)
async def trigger_plan(job_id: str, title: Optional[str] = Form(default=None)) -> StageResponse:
    rec = _require_job(job_id)
    _require_stage_approval(rec, StageName.plan)
    if rec.get_stage(StageName.plan) == StageStatus.processing:
        raise HTTPException(status_code=409, detail="Plan generation already in progress")
    _set_processing(rec, StageName.plan)
    await manager.broadcast(job_id, "stage_status", {"stage": "plan", "status": "processing"})
    try:
        EditorService.run_analysis(job_id)
        EditorService.run_plan(job_id, title=title)
        _set_ready(rec, StageName.plan)
        await manager.broadcast(job_id, "stage_status", {"stage": "plan", "status": "ready"})
    except Exception as exc:
        _set_failed(rec, StageName.plan, str(exc))
        await manager.broadcast(job_id, "stage_error", {"stage": "plan", "error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {exc}")
    return StageResponse(jobId=job_id, stage="plan", status=StageStatus.ready)


@router.get("/jobs/{job_id}/plan", response_model=PlanResponse)
async def get_plan(job_id: str) -> PlanResponse:
    _require_job(job_id)
    try:
        plan = EditorService.load_plan(job_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Plan not found")
    return PlanResponse(plan=plan)


@router.put("/jobs/{job_id}/plan", response_model=PlanResponse)
async def put_plan(job_id: str, body: PlanResponse) -> PlanResponse:
    _require_job(job_id)
    saved = EditorService.save_plan(job_id, body.plan)
    return PlanResponse(plan=saved)


@router.post(
    "/jobs/{job_id}/stages/{stage_num}/approve", response_model=StageResponse
)
async def approve_stage(job_id: str, stage_num: int) -> StageResponse:
    rec = _require_job(job_id)
    if stage_num < 1 or stage_num > len(STAGE_ORDER):
        raise HTTPException(status_code=400, detail=f"Invalid stage number: {stage_num}")
    stage = STAGE_ORDER[stage_num - 1]
    current = rec.get_stage(stage)
    required = APPROVED_BEFORE.get(stage)
    prereq_met = required is None or rec.get_stage(required) == StageStatus.approved
    if not prereq_met:
        raise HTTPException(
            status_code=409,
            detail=f"Stage '{stage.value}' requires '{required.value}' to be approved first",
        )
    if current not in (StageStatus.ready, StageStatus.approved, StageStatus.pending):
        raise HTTPException(
            status_code=409, detail=f"Stage '{stage.value}' is '{current.value}', cannot approve"
        )
    rec.set_stage(stage, StageStatus.approved)
    JobStore.save(rec)
    await manager.broadcast(job_id, "stage_status", {"stage": stage.value, "status": "approved"})
    return StageResponse(jobId=job_id, stage=stage.value, status=StageStatus.approved)


@router.post("/jobs/{job_id}/master", response_model=StageResponse, status_code=202)
async def trigger_master(job_id: str) -> StageResponse:
    rec = _require_job(job_id)
    _require_stage_approval(rec, StageName.master)
    if rec.get_stage(StageName.master) == StageStatus.processing:
        raise HTTPException(status_code=409, detail="Mastering already in progress")
    _set_processing(rec, StageName.master)
    await manager.broadcast(job_id, "stage_status", {"stage": "master", "status": "processing"})
    try:
        EditorService.run_master(job_id)
        _set_ready(rec, StageName.master)
        await manager.broadcast(job_id, "stage_status", {"stage": "master", "status": "ready"})
    except Exception as exc:
        _set_failed(rec, StageName.master, str(exc))
        await manager.broadcast(job_id, "stage_error", {"stage": "master", "error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Mastering failed: {exc}")
    return StageResponse(jobId=job_id, stage="master", status=StageStatus.ready)


@router.post("/jobs/{job_id}/render", response_model=StageResponse, status_code=202)
async def trigger_render(job_id: str) -> StageResponse:
    rec = _require_job(job_id)
    _require_stage_approval(rec, StageName.render)
    if rec.get_stage(StageName.render) == StageStatus.processing:
        raise HTTPException(status_code=409, detail="Render already in progress")
    _set_processing(rec, StageName.render)
    await manager.broadcast(job_id, "stage_status", {"stage": "render", "status": "processing"})
    try:
        EditorService.run_render(job_id)
        _set_ready(rec, StageName.render)
        await manager.broadcast(job_id, "stage_status", {"stage": "render", "status": "ready"})
    except Exception as exc:
        _set_failed(rec, StageName.render, str(exc))
        await manager.broadcast(job_id, "stage_error", {"stage": "render", "error": str(exc)})
        raise HTTPException(status_code=500, detail=f"Render failed: {exc}")
    return StageResponse(jobId=job_id, stage="render", status=StageStatus.ready)


@router.get("/jobs/{job_id}/artifacts/{name}")
async def get_artifact(job_id: str, name: str):
    _require_job(job_id)
    if not JobStore.validate_artifact_name(name):
        raise HTTPException(status_code=400, detail=f"Unknown artifact: {name}")
    path = JobStore.get_artifact_path(job_id, name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Artifact '{name}' not found")
    return FileResponse(path, filename=name)

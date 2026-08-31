from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StageStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    approved = "approved"
    failed = "failed"


class StageName(str, Enum):
    trim = "trim"
    transcribe = "transcribe"
    plan = "plan"
    master = "master"
    render = "render"


STAGE_ORDER: list[StageName] = [
    StageName.trim,
    StageName.transcribe,
    StageName.plan,
    StageName.master,
    StageName.render,
]

APPROVED_BEFORE: dict[StageName, StageName | None] = {
    StageName.trim: None,
    StageName.transcribe: StageName.trim,
    StageName.plan: StageName.transcribe,
    StageName.master: StageName.plan,
    StageName.render: StageName.master,
}


class JobRecord(BaseModel):
    job_id: str
    upload_name: str
    raw_filename: str
    fps: int = 60
    duration_sec: float = 0.0
    stages: Dict[str, StageStatus] = Field(default_factory=lambda: {
        StageName.trim.value: StageStatus.pending,
        StageName.transcribe.value: StageStatus.pending,
        StageName.plan.value: StageStatus.pending,
        StageName.master.value: StageStatus.pending,
        StageName.render.value: StageStatus.pending,
    })

    def get_stage(self, name: StageName) -> StageStatus:
        return self.stages.get(name.value, StageStatus.pending)

    def set_stage(self, name: StageName, status: StageStatus) -> None:
        self.stages[name.value] = status


class JobCreatedResponse(BaseModel):
    job_id: str = Field(alias="jobId")
    status: str = "created"
    raw_url: str = Field(alias="rawUrl")
    fps: int
    duration_sec: float = Field(alias="durationSec")

    class Config:
        populate_by_name = True


class StageResponse(BaseModel):
    job_id: str = Field(alias="jobId")
    stage: str
    status: StageStatus

    class Config:
        populate_by_name = True


class JobStatusResponse(BaseModel):
    job_id: str = Field(alias="jobId")
    status: str
    raw_url: str = Field(alias="rawUrl")
    fps: int
    duration_sec: float = Field(alias="durationSec")
    stages: Dict[str, StageStatus]

    class Config:
        populate_by_name = True


class PlanResponse(BaseModel):
    plan: Dict[str, Any]


class ErrorResponse(BaseModel):
    detail: str


# --- Copilot schemas ---


class CopilotAction(BaseModel):
    type: str
    id: Optional[int] = None
    title: Optional[str] = None
    text: Optional[str] = None
    translation: Optional[str] = None
    subtitle: Optional[str] = None

    class Config:
        extra = "allow"


class CopilotTokenEvent(BaseModel):
    event: str = "token"
    text: str


class CopilotActionEvent(BaseModel):
    event: str = "action"
    action: CopilotAction


class CopilotDraftEvent(BaseModel):
    event: str = "draft"
    actions: List[CopilotAction]


class CopilotDoneEvent(BaseModel):
    event: str = "done"


class CopilotErrorEvent(BaseModel):
    event: str = "error"
    detail: str


class CopilotMessage(BaseModel):
    message: str


class CopilotApplyRequest(BaseModel):
    base_version: str = Field(alias="baseVersion")

    class Config:
        populate_by_name = True


class CopilotModelRequest(BaseModel):
    provider_id: str = Field(alias="providerID")
    model_id: str = Field(alias="modelID")

    class Config:
        populate_by_name = True


class ProviderModel(BaseModel):
    provider_id: str = Field(alias="providerID")
    model_id: str = Field(alias="modelID")
    display_name: str = Field(alias="displayName")
    provider_name: str = Field(default="", alias="providerName")

    class Config:
        populate_by_name = True


class ProviderListResponse(BaseModel):
    models: List[ProviderModel]

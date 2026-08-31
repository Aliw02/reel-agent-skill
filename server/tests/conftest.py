from __future__ import annotations

import io
import os
import shutil
import tempfile
from typing import Generator

import pytest
from fastapi.testclient import TestClient

from server.main import app
from server.services.job_store import JOBS_ROOT, JobStore
from server.schemas import JobRecord


@pytest.fixture(autouse=True)
def _clean_jobs(tmp_path: Generator) -> None:
    os.makedirs(JOBS_ROOT, exist_ok=True)
    yield
    if os.path.exists(JOBS_ROOT):
        shutil.rmtree(JOBS_ROOT, ignore_errors=True)


@pytest.fixture()
def client() -> Generator:
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def sample_video() -> bytes:
    return b"\x00" * 1024


@pytest.fixture()
def job_id(client: TestClient, sample_video: bytes) -> str:
    resp = client.post(
        "/api/jobs",
        files={"file": ("clip.mp4", sample_video, "video/mp4")},
    )
    assert resp.status_code == 200
    return resp.json()["jobId"]


@pytest.fixture()
def approved_job_id(client: TestClient, sample_video: bytes) -> str:
    resp = client.post(
        "/api/jobs",
        files={"file": ("clip.mp4", sample_video, "video/mp4")},
    )
    assert resp.status_code == 200
    return resp.json()["jobId"]

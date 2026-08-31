from __future__ import annotations

from fastapi.testclient import TestClient


def test_upload_returns_job_url(client: TestClient, sample_video: bytes) -> None:
    response = client.post(
        "/api/jobs",
        files={"file": ("clip.mp4", sample_video, "video/mp4")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["jobId"]
    assert body["rawUrl"].startswith("/api/jobs/")
    assert "raw_upload" not in body["rawUrl"]


def test_stage_order_is_enforced(client: TestClient, job_id: str) -> None:
    response = client.post(f"/api/jobs/{job_id}/transcribe")
    assert response.status_code == 409


def test_client_path_is_not_accepted(client: TestClient, job_id: str) -> None:
    response = client.post(
        f"/api/jobs/{job_id}/trim", data={"input_path": "C:/Windows/win.ini"}
    )
    assert response.status_code in {400, 422}


def test_get_job_returns_metadata(client: TestClient, job_id: str) -> None:
    response = client.get(f"/api/jobs/{job_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["jobId"] == job_id
    assert "stages" in body


def test_get_nonexistent_job_returns_404(client: TestClient) -> None:
    response = client.get("/api/jobs/nonexistent")
    assert response.status_code == 404


def test_approve_invalid_stage_returns_409(client: TestClient, job_id: str) -> None:
    response = client.post(f"/api/jobs/{job_id}/stages/2/approve")
    assert response.status_code == 409


def test_approve_valid_stage(client: TestClient, job_id: str) -> None:
    response = client.post(f"/api/jobs/{job_id}/stages/1/approve")
    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_artifact_not_found_returns_404(client: TestClient, job_id: str) -> None:
    response = client.get(f"/api/jobs/{job_id}/artifacts/trimmed.mp4")
    assert response.status_code == 404


def test_unknown_artifact_returns_400(client: TestClient, job_id: str) -> None:
    response = client.get(f"/api/jobs/{job_id}/artifacts/evil.exe")
    assert response.status_code == 400


def test_put_plan_and_get_plan(client: TestClient, job_id: str) -> None:
    plan = {"version": "3.0.0", "fps": 60, "scenes": [], "subtitles": []}
    put_resp = client.put(f"/api/jobs/{job_id}/plan", json={"plan": plan})
    assert put_resp.status_code == 200
    get_resp = client.get(f"/api/jobs/{job_id}/plan")
    assert get_resp.status_code == 200
    assert get_resp.json()["plan"]["version"] == "3.0.0"

"""Launch the AI Reel Studio backend and frontend processes."""

from __future__ import annotations

import os
import signal
import subprocess
import sys
import time
from typing import List

import httpx

API_PORT = int(os.environ.get("STUDIO_API_PORT", "8000"))
WEB_PORT = int(os.environ.get("STUDIO_WEB_PORT", "3001"))
OPENCODE_PORT = int(os.environ.get("STUDIO_OPENCODE_PORT", "4096"))
OPENCODE_BASE_URL = os.environ.get(
    "STUDIO_OPENCODE_BASE_URL", f"http://127.0.0.1:{OPENCODE_PORT}"
)
OPENCODE_AUTOSTART = os.environ.get("STUDIO_OPENCODE_AUTOSTART", "0") == "1"


def _log(msg: str) -> None:
    print(msg, flush=True)


def _wait_for_url(url: str, timeout: float = 30.0, interval: float = 0.5) -> bool:
    deadline = time.monotonic() + timeout
    with httpx.Client(timeout=2) as client:
        while time.monotonic() < deadline:
            try:
                r = client.get(url)
                if r.status_code < 500:
                    return True
            except httpx.HTTPError:
                pass
            except Exception:
                pass
            time.sleep(interval)
    return False


def _start_api_server() -> subprocess.Popen[bytes]:
    _log(f"Starting API server on port {API_PORT} ...")
    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "server.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(API_PORT),
            "--log-level",
            "info",
        ],
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    return proc


def _start_web_dev() -> subprocess.Popen[bytes]:
    _log(f"Starting web dev server on port {WEB_PORT} ...")
    web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    proc = subprocess.Popen(
        [npm_cmd, "run", "dev", "--", "-p", str(WEB_PORT)],
        cwd=web_dir,
    )
    return proc


def _start_opencode() -> subprocess.Popen[bytes] | None:
    if not OPENCODE_AUTOSTART:
        _log("OpenCode autostart disabled; expecting external instance.")
        return None
    _log(f"Starting OpenCode on port {OPENCODE_PORT} ...")
    opencode_bin = "opencode.cmd" if sys.platform == "win32" else "opencode"
    proc = subprocess.Popen(
        [
            opencode_bin,
            "serve",
            "--hostname",
            "127.0.0.1",
            "--port",
            str(OPENCODE_PORT),
        ],
    )
    return proc


def _verify_opencode() -> bool:
    url = f"{OPENCODE_BASE_URL}/health"
    _log(f"Checking OpenCode health at {url} ...")
    ok = _wait_for_url(url, timeout=15.0)
    if ok:
        _log("OpenCode is healthy.")
    else:
        _log("WARNING: OpenCode health check failed.")
    return ok


def _verify_port(label: str, port: int) -> bool:
    url = f"http://127.0.0.1:{port}"
    _log(f"Verifying {label} at {url} ...")
    ok = _wait_for_url(url, timeout=120.0)
    if ok:
        _log(f"{label} is up on port {port}.")
    else:
        _log(f"WARNING: {label} not reachable on port {port}.")
    return ok


def main() -> None:
    children: List[subprocess.Popen[bytes]] = []
    opencode_proc: subprocess.Popen[bytes] | None = None

    try:
        api_proc = _start_api_server()
        children.append(api_proc)

        web_proc = _start_web_dev()
        children.append(web_proc)

        opencode_proc = _start_opencode()
        if opencode_proc is not None:
            children.append(opencode_proc)

        _verify_opencode()

        if not _verify_port("API server", API_PORT):
            _log("API server failed to start.")
            sys.exit(1)

        if not _verify_port("Web dev server", WEB_PORT):
            _log("Web dev server failed to start.")
            sys.exit(1)

        _log("")
        _log("=" * 60)
        _log("  AI Reel Studio is running")
        _log(f"  Web UI:    http://localhost:{WEB_PORT}")
        _log(f"  API:       http://localhost:{API_PORT}")
        _log(f"  OpenCode:  {OPENCODE_BASE_URL}")
        _log("=" * 60)
        _log("")
        _log("Press Ctrl+C to stop.")

        # Wait for any child to exit (failure propagation)
        while True:
            for proc in children:
                if proc.poll() is not None:
                    code = proc.returncode
                    _log(f"Child process exited with code {code}.")
                    if code != 0:
                        _log("Forwarding failure to parent.")
                        sys.exit(code)
            time.sleep(1.0)

    except KeyboardInterrupt:
        _log("\nShutting down ...")
    finally:
        for proc in children:
            if proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=5.0)
                except Exception:
                    proc.kill()


if __name__ == "__main__":
    main()

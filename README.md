# AI Reel Studio

**Executive-grade AI video editing studio for producing 9:16 vertical reels (TikTok, Reels, Shorts).**

---

## Features

- **Stage 1 — Silence Trim & Pacing:** Remove dead air with speech-aware silence detection, preserve natural breathing pauses.
- **Stage 2 — Bilingual Captions:** Faster-Whisper Arabic transcription, dual-language subtitles (Arabic primary, English secondary), emoji-free validation.
- **Stage 3 — Motion Design & 3D Layers:** Punch-in zooms, 3D floating cards, animated counters, spring camera effects via Remotion.
- **Stage 4 — Audio Mastering & QC:** LUFS normalization, sound effects, automated QC validation (1080x1920, frame count, audio sync).
- **AI Copilot:** Chat-driven edit assistant with live streaming, model selection, and one-click draft apply.

---

## Installation

### Prerequisites

- [Python 3.9+](https://python.org)
- [Node.js 18+](https://nodejs.org)
- [FFmpeg](https://ffmpeg.org) (on PATH)

### Runtime dependencies

```bash
pip install -r requirements.txt
```

### Dev dependencies (for tests)

```bash
pip install -r requirements-dev.txt
```

### Web frontend dependencies

```bash
npm install --prefix web
```

---

## Provider Connection

The studio connects to an OpenCode instance for AI model access.

1. Start OpenCode (see below) or use an existing instance.
2. Open the **Copilot** panel in the studio.
3. Click **Connect** and enter the OpenCode base URL (default: `http://127.0.0.1:4096`).
4. Select a provider and model from the dropdown.

### Model Discovery

Use the `/provider` endpoint or the Copilot model menu to list available providers and models from the connected OpenCode instance.

---

## Launching the Studio

### One command (recommended)

```bash
python run_studio.py
```

Or via npm:

```bash
npm run studio
```

This starts:

| Process | Port | URL |
|---------|------|-----|
| API (Uvicorn) | 8000 | `http://localhost:8000` |
| Web (Next.js) | 3001 | `http://localhost:3001` |
| OpenCode (optional) | 4096 | `http://127.0.0.1:4096` |

### Optional: Auto-start OpenCode

```bash
STUDIO_OPENCODE_AUTOSTART=1 python run_studio.py
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STUDIO_API_PORT` | `8000` | Backend API port |
| `STUDIO_WEB_PORT` | `3001` | Next.js dev server port |
| `STUDIO_OPENCODE_PORT` | `4096` | OpenCode port |
| `STUDIO_OPENCODE_BASE_URL` | `http://127.0.0.1:4096` | OpenCode base URL |
| `STUDIO_OPENCODE_AUTOSTART` | `0` | Set to `1` to launch OpenCode |

---

## Supported FPS

| FPS | Use Case |
|-----|----------|
| 30  | Standard reels, faster rendering |
| 60  | High-motion content, smooth zooms |

---

## Approval Workflow

Each stage must be approved sequentially before the next unlocks:

1. **Stage 1 (Trim):** Run trim, review before/after durations, approve.
2. **Stage 2 (Captions):** Transcribe, review phrase bounds, edit translations, approve.
3. **Stage 3 (Motion):** Render motion layers, preview, approve.
4. **Stage 4 (Audio):** Master audio, review QC report, approve final reel.

The **StageStepper** visual indicator shows locked/unlocked status. Later stages are disabled until their predecessor is approved.

---

## Development

### Run unit tests

```bash
cd web && npm test
```

### Type-check

```bash
cd web && npm run typecheck
```

### Build

```bash
cd web && npm run build
```

### E2E tests (requires running studio)

```bash
cd web && npx playwright test
```

---

## License

MIT

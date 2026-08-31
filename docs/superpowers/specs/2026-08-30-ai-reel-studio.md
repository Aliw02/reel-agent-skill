# AI Reel Studio — Web App Specification

**Date:** 2026-08-30
**Status:** Draft
**Author:** AI Director Copilot

---

## Goals

1. Turn the local Remotion-based reel editor into a browser-viewable, human-in-the-loop studio web app.
2. Keep the creator in full control: every edit goes through an explicit approval gate before it reaches the render pipeline.
3. Expose a clean REST API so an AI Director agent (or any client) can propose plan edits and trigger previews.
4. Preserve the canonical `EditPlanV3` as the single source of truth; all UI and API interactions read/write this plan.

## Non-Goals

- Multi-user collaboration / concurrent editing.
- Cloud video storage or transcoding (assets stay on the local machine).
- Building a custom video codec or playback engine (we rely on Remotion + browser video).
- Real-time streaming of rendered frames (we use preview snapshots and staged renders).

---

## Four Approval Gates

### Stage 1 — Pacing & Trim
- Trim dead air (silence segments below a configurable threshold).
- Inspect total duration and segment pacing.
- **Output:** `.temp/trimmed.mp4` — user must approve before proceeding.

### Stage 2 — Bilingual Captions & Dialect
- Transcribe trimmed video (Arabic primary, English secondary).
- Review Arabic accuracy, word-level timing, and semantic phrase bounds.
- Add sleek English secondary subtitles.
- **Output:** Updated `subtitles[]` in the plan — user must approve before proceeding.

### Stage 3 — Motion Design, 3D Layers & Camera
- Choreograph punch-in zooms, 3D floating perspective cards, animated counters.
- Apply transition types, callouts, and overlay sequences.
- Launch Remotion Studio (`npm start`) for live preview.
- **Output:** Full `scenes[]`, `transitions[]`, `zoomEvents[]`, `overlays[]` — user must approve before proceeding.

### Stage 4 — Audio Mastering, SFX & QC
- Level audio to -16 LUFS.
- Add synchronized sound effects.
- Run quality checks (safe zones, subtitle legibility, color consistency).
- **Output:** Final 1080x1920 MP4 render — user must approve before release.

---

## API Contract

All routes are prefixed with `/api/v1`.

### `GET /api/v1/health`
Returns `200 OK` with `{"status": "ok", "version": "..."}`.

### `GET /api/v1/plans/current`
Returns the current `EditPlanV3` JSON for the active project.

### `PUT /api/v1/plans/current`
Body: full `EditPlanV3` JSON. Replaces the current plan. Returns the saved plan.

### `POST /api/v1/preview`
Body: `{ plan: EditPlanV3 }`. Triggers a Remotion preview render. Returns a preview URL or preview ID for polling.

### `POST /api/v1/render`
Body: `{ plan: EditPlanV3, output?: string }`. Triggers a full MP4 render. Returns a render job ID.

### `GET /api/v1/assets/{filename}`
Serves a static asset (video, image, audio) from the project's `public/` directory. Returns the file with appropriate `Content-Type`.

### `POST /api/v1/director/propose`
Body: `{ plan: EditPlanV3, instruction: string }`. Accepts a natural-language instruction from the AI Director and returns a proposed plan diff or updated plan.

---

## Asset Lifecycle

1. **Ingest:** Raw footage is placed in the project root or `public/` directory.
2. **Reference:** The plan's `videoSrc`, `bgmSrc`, `brollSrc`, etc. reference filenames (not full paths). The server resolves these via `staticFile()` or `assetBaseUrl`.
3. **Transform:** Stage 1 produces `.temp/trimmed.mp4`. Stage 4 produces `out/final_reel.mp4`.
4. **Serve:** The `/api/v1/assets/{filename}` route serves files to the browser for Remotion preview.
5. **Cleanup:** Temporary files in `.temp/` are cleaned between runs; final outputs in `out/` are preserved.

---

## Browser-Safe Remotion Contract

- `EditPlanV3` carries an optional `assetBaseUrl` field. When set, `resolveMediaSrc()` uses `assetBaseUrl + filename` for relative assets. When unset (Remotion CLI rendering), it falls back to `staticFile()`.
- Subtitles default to `positionBottom: 240` (above platform UI).
- Emoji in captions is set to `null` by default; all runtime emoji output is replaced with text labels or SVG icons.

---

## Accessibility Requirements

- WCAG 2.2 AA compliance.
- Keyboard navigation for all interactive controls.
- Visible focus states on all focusable elements.
- Sufficient color contrast (4.5:1 for text, 3:1 for large text).
- Descriptive `aria-label` attributes on buttons and controls.
- Screen-reader announcements for plan state changes and render progress.
- Reduced-motion mode: disable spring animations and use instant transitions when `prefers-reduced-motion: reduce`.

---

## Acceptance Tests

| ID | Test | Expected |
|----|------|----------|
| AT-01 | `GET /api/v1/health` returns 200 | `{"status":"ok"}` |
| AT-02 | `GET /api/v1/plans/current` returns valid `EditPlanV3` | JSON with `version`, `subtitles`, `fps`, `durationInFrames` |
| AT-03 | `PUT /api/v1/plans/current` with valid plan persists it | Plan is saved and retrievable |
| AT-04 | `POST /api/v1/preview` with plan returns preview job | Returns preview ID or URL |
| AT-05 | `POST /api/v1/render` with plan returns render job | Returns render job ID |
| AT-06 | `GET /api/v1/assets/{filename}` serves existing file | File returned with correct content type |
| AT-07 | `POST /api/v1/director/propose` with instruction returns updated plan | Plan contains changes reflecting the instruction |
| AT-08 | Remotion renders with `assetBaseUrl` set | Browser preview loads all assets correctly |
| AT-09 | Subtitles render at `positionBottom: 240` | Subtitle capsule positioned above platform UI |
| AT-10 | No emoji in default subtitle props | All `emoji` fields are `null` |
| AT-11 | `npx tsc --noEmit` passes | Zero type errors |

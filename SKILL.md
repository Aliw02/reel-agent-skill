---
name: reel-agent-skill
description: Use when editing, trimming, directing, or producing vertical 9:16 video reels (TikTok, Shorts, Reels) from raw footage, generating kinetic RTL Arabic or multilingual subtitles, orchestrating AI camera zooms, or adding motion graphics overlays.
---

# Reel Agent Skill: AI Video Editor & Motion Graphics Director

## Overview

Automated post-production engine for transforming raw talking-head footage into high-retention 9:16 vertical video reels. Orchestrates speech-aware silence cutting, word-level Whisper transcription, dialect auditing, dynamic camera choreography, contextual motion graphics, audio ducking, and 60FPS Remotion multi-layer rendering.

---

## Quick Reference Commands

| Task | Command | Primary Output | Completion Check |
| :--- | :--- | :--- | :--- |
| **All-in-One Pipeline** | `python scripts/pipeline.py --input "<raw.mp4>" --output "output/final.mp4"` | `output/final.mp4` | Video rendered & QC passed |
| **Silence Trimming** | `python scripts/cut_silence.py --input "<raw.mp4>" --output ".temp/trimmed.mp4"` | `.temp/trimmed.mp4` | Dead air cut, duration reduced |
| **Transcription** | `python scripts/transcribe.py --audio ".temp/trimmed.mp4" --output ".temp/captions.json"` | `.temp/captions.json` | Word-level timestamps generated |
| **Direct Edit Plan** | `python scripts/director.py --transcript ".temp/captions.json" --output ".temp/edit_plan.json"` | `.temp/edit_plan.json` | Valid `ReelProps` JSON assembled |
| **Remotion Render** | `npx remotion render src/index.ts ReelComposition output/final.mp4 --props=.temp/edit_plan.json --gl=angle` | `output/final.mp4` | 1080x1920 MP4 at 60FPS |
| **Quality Control** | `python scripts/qc.py --video "output/final.mp4" --edit-plan ".temp/edit_plan.json"` | `.temp/qc_report.json` | Resolution & audio verified |
| **Live Studio Preview** | `npm start` | Web UI at `localhost:3000` | Real-time timeline scrubbing |

---

## 6-Stage Execution Pipeline

```
[Raw Footage]
      │
      ▼
Stage 1: Silence Trimming (cut_silence.py)
      │
      ▼
Stage 2: Word-Level Transcription (transcribe.py)
      │
      ▼
Stage 3: Dialect & Semantic Caption Audit (Agent Review)
      │
      ▼
Stage 4: Autonomous Directing & Edit Planning (director.py -> edit_plan.json)
      │
      ▼
Stage 5: Remotion 60FPS Multi-Layer Render (remotion render)
      │
      ▼
Stage 6: Automated Quality Control (qc.py)
```

---

### Stage 1: Multimodal Ingestion & Speech-Aware Silence Trimming

1. **Multimodal Inspection**: Inspect raw footage (`view_file` on video asset) to determine the speaker's screen position (center, left, right) and locate open negative space for graphics.
2. **Execute Silence Trimming**:
   ```bash
   python scripts/cut_silence.py --input "template/raw_before.mp4" --output ".temp/trimmed.mp4" --silence-thresh -30
   ```
3. **Completion Criterion**: `.temp/trimmed.mp4` exists with valid video/audio streams and total duration shortened without clipping active speech.

---

### Stage 2: Word-Level Audio Transcription

1. **Execute Transcription**:
   ```bash
   python scripts/transcribe.py --audio ".temp/trimmed.mp4" --output ".temp/captions.json" --model "turbo" --language "ar" --fps 60
   ```
2. **Completion Criterion**: `.temp/captions.json` contains structured `subtitles` chunks with word-level millisecond `start`, `end`, `startFrame`, and `endFrame` timestamps.

---

### Stage 3: Dialect & Semantic Caption Audit

1. **Audit Dialect Accuracy**: Review the raw transcription against the spoken audio. Correct phonetic misinterpretations common in Arabic regional dialects (Iraqi, Levantine, Egyptian, Gulf) or technical jargon.
2. **Assign Emphasis Triggers**: Mark high-impact punchlines or key metrics with `highlight: true` or `emphasisLevel: "punchline"`.
3. **Save Audited Captions**:
   ```bash
   # Save verified captions to .temp/captions_reviewed.json
   ```
4. **Completion Criterion**: Audited caption file exists with accurate spellings, intact word timestamps, and identified emphasis markers.

---

### Stage 4: Autonomous Directing & Edit Plan Synthesis

Compile `.temp/edit_plan.json` conforming to [ReelProps](file:///d:/MyFolder/ProgrammingWith-Python/Ai/AiReelsEditor/src/types/schema.ts#L157-L179):

```bash
python scripts/director.py --transcript ".temp/captions_reviewed.json" --output ".temp/edit_plan.json" --theme "box_glass" --fps 60
```

#### Directorial Subsystems

1. **Hook Header (0–3 Seconds)**:
   - Configure attention-grabbing title banner (`hook.title` and `hook.subtitle`) with a 60–90 frame duration.
2. **Camera Choreography (`zoomEvents`)**:
   - `punch_in`: Quick spring push-in (scale 1.15–1.20) on high-energy words or punchlines.
   - `slow_zoom_in`: Gradual push-in (scale 1.05–1.12) to build tension or intimacy during explanations.
   - `slow_zoom_out`: Smooth pull-out returning to standard framing for scene transitions.
   - `snap`: Instant 1-frame punch cut on surprise statements.
   - `shake`: Sinusoidal camera oscillation on explosive impact moments.
3. **Contextual Motion Graphics & Media Overlays (`mediaOverlays` / `overlays`)**:
   - Place media cards and sticker graphics in open negative space quadrants (`top-right`, `top-left`, `bottom-right`), leaving the speaker's face and gestures unobstructed.
   - Apply spring entrance with subtle rotation ($-8^\circ \to 0^\circ$).
4. **Kinetic RTL Typography (`captionStyle`)**:
   - Themes: `box_glass` (glassmorphism), `neon` (cyber glow), `bold_yellow` (high contrast), `clean_white`, `cyber`.
   - Font stack: `'Tajawal', 'Cairo', 'Readex Pro', sans-serif`, `direction: "rtl"`.
5. **Smart Audio Ducking (`audio`)**:
   - Background music (`bgmVolume: 0.15`) smoothly attenuates (`duckingVolume: 0.04`) during active speech frames and swells during dramatic pauses.

**Completion Criterion**: `.temp/edit_plan.json` validates against the TypeScript schema with all referenced assets existing in `public/` or `.temp/`.

---

### Stage 5: Remotion 60FPS Multi-Layer Rendering

1. **Copy Assets to Public**: Ensure `trimmed.mp4` and any background audio/images are in `public/`.
2. **Execute Render**:
   ```bash
   npx remotion render src/index.ts ReelComposition output/final_reel.mp4 --props=.temp/edit_plan.json --gl=angle
   ```
3. **Completion Criterion**: `output/final_reel.mp4` generates successfully with 0 exit code.

---

### Stage 6: Automated Quality Control (QC)

1. **Run QC Validator**:
   ```bash
   python scripts/qc.py --video "output/final_reel.mp4" --edit-plan ".temp/edit_plan.json"
   ```
2. **Validation Rules**:
   - Resolution is exactly `1080x1920` (9:16 vertical ratio).
   - Audio stream exists with 44.1kHz or 48kHz sampling rate.
   - Video duration matches `edit_plan.json` total frame count ($\pm 2$ frames).
3. **Completion Criterion**: QC validator outputs `[SUCCESS]` and writes `.temp/qc_report.json` with zero critical errors.

---

## Directorial Rules & Placement Matrix

| Element | Placement / Value | Directorial Rule |
| :--- | :--- | :--- |
| **Hook Banner** | Top (`top: 140px`, centered) | Active for first 1.5–2.5 seconds; clean entrance spring. |
| **Subtitles** | Lower-third (`positionBottom: 320–380px`) | Placed above TikTok/Reels bottom UI buttons; RTL layout for Arabic. |
| **Media Stickers** | `top-right` / `top-left` (`top: 10%`, `margin: 5%`) | Positioned in empty negative space opposite speaker gaze. |
| **Punch Zooms** | Scale `1.14–1.20`, anchor `originY: "38–40%"` | Centered on speaker eyes; lasts 30–60 frames. |
| **Progress Bar** | Top or bottom (`height: 6–8px`) | Continuous 0% to 100% gradient fill indicating video progression. |

---

## Common Failure Modes & Fixes

| Symptom | Root Cause | Fix |
| :--- | :--- | :--- |
| **Overlapping stickers on speaker face** | Hardcoded sticker coordinates | Inspect speaker position first; set coordinates in negative space quadrants. |
| **Choppy or clipped words** | Overly aggressive silence threshold | Set `--silence-thresh -30` and ensure minimum silence length is $\ge 0.4$s. |
| **Remotion asset loading error** | Relative paths not in `public/` directory | Use `staticFile()` helper and copy all source media into `public/`. |
| **Subtitles out of sync with video** | Mismatch between trimmed video and transcription | Always transcribe the *trimmed* video (`.temp/trimmed.mp4`), never the raw pre-trim file. |
| **TypeScript schema mismatch** | Missing fields in `edit_plan.json` | Ensure `edit_plan.json` adheres to `ReelProps` in [schema.ts](file:///d:/MyFolder/ProgrammingWith-Python/Ai/AiReelsEditor/src/types/schema.ts). |

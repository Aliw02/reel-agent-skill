---
name: reel-agent-skill
description: Use when creating, editing, trimming, animating, or producing vertical 9:16 short-form video reels, TikToks, Shorts, with kinetic RTL Arabic/multilingual subtitles, AI punch-in zooms, speech ducking, and visual assets.
---

# 🎬 Reel Agent Skill (Autonomous AI Video Editor Pro)

## Overview

**Automates professional 9:16 vertical video post-production from raw talking-head footage to viral-ready Reels, TikToks, and YouTube Shorts.**

The engine combines speech-aware silence trimming, dialect-accurate RTL Arabic kinetic typography, an autonomous AI Director scheduling dynamic punch-in zooms and glassmorphic overlays, non-overlapping visual sticker positioning, background music ducking, 60FPS Remotion rendering, and automated Quality Control (QC).

---

## When to Use

### Triggers & Symptoms:
- You have raw talking-head MP4/MOV footage and need a finished vertical 9:16 reel.
- Video requires word-by-word highlighted kinetic subtitles in Arabic (with full RTL & dialect support) or English.
- Video contains dead air, long pauses, or stuttering that needs seamless jump-cut trimming.
- Need automated hook banners, tactical punch-in zooms, or floating stat/card overlays matching spoken concepts.
- Need to insert visual stickers or illustrations without obscuring the speaker's face.

### When NOT to Use:
- Horizontal 16:9 cinematic feature films or landscape multi-cam documentary editing.
- Silent videos with no spoken dialogue or audio cues.

---

## Master Production Pipeline

```
[Raw Talking-Head Footage]
          │
          ▼
1. ✂️ Silence Trimming (scripts/cut_silence.py)
   └─ Strips dead air with adaptive speech padding (trimmed.mp4)
          │
          ▼
2. 🎙️ Multimodal & Dialect Transcription (scripts/transcribe.py)
   └─ Word-level millisecond timestamps & Arabic normalization (captions.json)
          │
          ▼
3. 🧠 AI Director Synthesis (scripts/director.py)
   └─ Hooks, tactical punch-in zooms, overlays & stickers (edit_plan.json)
          │
          ▼
4. 🚀 60FPS Remotion Rendering (src/index.ts)
   └─ 1080x1920 multi-layer compositing & audio ducking (output.mp4)
          │
          ▼
5. 🔍 Automated Quality Control (scripts/qc.py)
   └─ Resolution, FPS, audio stream, & duration parity checks (qc_report.json)
          │
          ▼
[Viral High-Retention 9:16 Reel]
```

---

## Step-by-Step Production Recipe

### Stage 1: Speech-Aware Silence Trimming
Removes dead air while protecting conversational cadence and comedic/dramatic timing.
```bash
python scripts/cut_silence.py --input "template/raw.mp4" --output ".temp/trimmed.mp4" --silence-thresh -35 --min-silence-len 0.5
```
- **Completion Criteria**: `.temp/trimmed.mp4` generated with audio/video stream sync.

### Stage 2: Multimodal & Arabic Dialect Transcription
Generates word-level timestamps with Arabic letter normalization (unifying Alif/Yaa, stripping Tatweel/Tashkeel) and semantic phrase chunking.
```bash
python scripts/transcribe.py --audio ".temp/trimmed.mp4" --output ".temp/captions.json" --model "base" --language "ar"
```
- **Completion Criteria**: `.temp/captions.json` contains timestamped `chunks` and nested `words`.

### Stage 3: AI Director & Edit Plan Synthesis
Analyzes dialogue context, identifies opening hook (0-3s), schedules tactical punch-in zooms at high-emphasis words, positions contextual stickers (e.g. Einstein portrait, code snippets, stat badges), and compiles `edit_plan.json`.
```bash
python scripts/director.py --transcript ".temp/captions.json" --output ".temp/edit_plan.json" --theme "box_glass" --title "Hook Title"
```
- **Completion Criteria**: `.temp/edit_plan.json` validates against the TypeScript `EditPlan` schema.

### Stage 4: Remotion 60FPS Video Rendering
Compiles composition at 1080x1920 60FPS with spring animations, kinetic RTL text, positioned overlays, and automatic audio ducking.
```bash
npx remotion render src/index.ts ReelComposition output/final_reel.mp4 --props=.temp/edit_plan.json --gl=angle
```
- **Completion Criteria**: `output/final_reel.mp4` generated.

### Stage 5: Automated Quality Control (QC)
Verifies resolution ($1080 \times 1920$), frame rate (60 fps), audio stream integrity (AAC/stereo), file size, and duration parity.
```bash
python scripts/qc.py --video "output/final_reel.mp4" --edit-plan ".temp/edit_plan.json"
```
- **Completion Criteria**: All checks report `PASS`.

---

## Unified Master Pipeline Command

Execute the complete 5-stage pipeline in a single command:

```bash
python scripts/pipeline.py \
  --input "template/video_2026-08-28_16-30-00.mp4" \
  --output "output/final_reel.mp4" \
  --title "تجربة المونتاج الذكي" \
  --theme "box_glass" \
  --whisper-model "base" \
  --fps 60
```

---

## Visual Themes & Typography Reference

| Theme Key | Visual Style | Primary Colors | Best For |
| :--- | :--- | :--- | :--- |
| `box_glass` | Frosted glass card with glow outline | `#FFE600`, `#00FFCC`, Glass `rgba(15,23,42,0.85)` | Tech, Business, Tutorials |
| `neon` | Vibrant multi-color neon text shadows | `#00FFCC`, `#FF007A`, `#FFE600` | Gaming, Entertainment, Viral |
| `bold_yellow` | High-contrast black stroke & shadow | `#FFE600`, `#FFFFFF`, `#000000` | Alex Hormozi style, Motivation |
| `clean_white` | Minimalist elegant modern typography | `#FFFFFF`, Subtle `#38BDF8` highlight | Storytelling, Podcasts, Quotes |
| `cyber` | Futuristic cybernetic angular badge | `#00FFCC`, `#0F172A`, Electric Blue | AI, Crypto, Programming |

---

## Non-Overlapping Asset & Sticker Placement Rules

When placing visual assets, illustrations, or stickers (e.g. Einstein portrait, diagrams, charts):
1. **Analyze Speaker Bounding Box**: Identify the speaker's head/torso position (usually center or center-left).
2. **Target Negative Space**: Position stickers in empty background space (typically `top-right` at `top: 12%`, `right: 6%` or `top-left` at `top: 12%`, `left: 6%`).
3. **Gesture Synchronization**: Trigger the asset on the exact frame the speaker points, looks, or references the entity.
4. **Dimensions**: Restrict width to $280\text{px} - 340\text{px}$ to prevent crowding the 1080px canvas.
5. **Animation**: Apply a spring pop-in (`damping: 12, stiffness: 200`) with subtle $-8^\circ \to 0^\circ$ rotation.

---

## Interactive Live Studio

Launch the interactive Remotion Studio in the browser to scrub the timeline, inspect keyframes, and tune props live:

```bash
npm start
```

---

## Common Pitfalls & Red Flags

| Pitfall / Excuse | Reality & Mandatory Fix |
| :--- | :--- |
| **"Whisper misunderstood an Iraqi dialect word"** | Act as the AI Director: listen to the audio directly via multimodal inspection and correct the transcript in `edit_plan.json`. |
| **"Sticker covers the speaker's face"** | Set `position: "top-right"` with explicit `top: "12%"` and `right: "6%"` away from the subject center. |
| **"Static local files fail to load in Remotion"** | Place media assets in `public/` and resolve via `staticFile(filename)`. |
| **"Windows subprocess commands fail with error 2"** | Use `shell=True` and `npx.cmd` when invoking Remotion CLI from Python on Windows. |
| **"Output duration differs from expected"** | Pass `durationInFrames` dynamically in `calculateMetadata` inside `Root.tsx` matching `edit_plan.json`. |

---
name: reel-agent-skill
description: Automated AI Video Editor for Instagram Reels, TikTok, and YouTube Shorts. Transcribes Arabic & English audio with Faster-Whisper, performs smart silence trimming, utilizes an AI Director to schedule kinetic RTL subtitles, smart punch-in zooms, multi-layer cards/stats/quotes overlays, and renders high-retention 9:16 vertical videos with Remotion and automated Quality Control (QC).
---

# 🎬 Reel Agent Skill (AI Video Editor Pro)

Autonomous AI Video Editor designed specifically for short-form content creators (Reels, TikTok, Shorts). Built for seamless integration with AI Agents (Antigravity, Claude, Codex, OpenCode) and CLI workflows.

---

## ⚡ Core Capabilities

1. **✂️ Speech-Aware Silence Trimming (Jump-Cuts):**
   - Automatically detects dead air while preserving speech cadence and dramatic pauses with adaptive padding.
2. **🎙️ Faster-Whisper Kinetic Captions (Arabic & Dialects):**
   - High-accuracy word-level transcription with Iraqi & Modern Standard Arabic normalization (alif/yaa unification, tatweel removal).
   - Natural semantic phrase chunking (based on pauses and punctuation, replacing rigid 3-word chunks).
3. **🧠 AI Director / Edit Planner:**
   - Detects hooks in the first 1-3 seconds.
   - Schedules dynamic punch-in smart zooms at high-emphasis sentences.
   - Contextual emoji placement (sparse, high-impact).
   - Generates unified `edit_plan.json`.
4. **🎨 Multi-Theme RTL Typography:**
   - Full Right-to-Left (RTL) support with bidirectional text isolation (`unicodeBidi: isolate`).
   - Arabic font stack (Cairo, Tajawal, Readex Pro).
   - 5 Visual Themes: `box_glass`, `neon`, `bold_yellow`, `clean_white`, `cyber`.
5. **🎴 Dynamic Multi-Overlay Timeline:**
   - Pop-up glassmorphic explainer cards, metric stat callouts (e.g. `+150%`, `$50K`), quotes, bullet lists, and code snippets.
6. **🎵 Smart Audio Engine & Ducking:**
   - Multi-track background music support with automatic volume ducking during active speech frames.
7. **🔍 Automated Quality Control (QC Validator):**
   - Automated post-render verification of resolution (1080x1920), frame rate parity, audio tracks, and duration consistency.

---

## 🔄 End-to-End Pipeline Workflow

```
[Raw Talking-Head Video]
          │
          ▼
1. scripts/cut_silence.py   ──► Dead air removal with natural speech padding
          │
          ▼
2. scripts/transcribe.py    ──► Word-level timestamps & semantic phrase chunking (captions.json)
          │
          ▼
3. scripts/director.py      ──► Hook detection, punch zooms, overlay timeline (edit_plan.json)
          │
          ▼
4. Remotion Engine          ──► 1080x1920 60FPS multi-layer render with kinetic RTL captions
          │
          ▼
5. scripts/qc.py            ──► Post-render structural and media validation (qc_report.json)
          │
          ▼
[Final 9:16 Reel Video]
```

---

## 💻 Agent & CLI Usage

### 🚀 Standard Execution (Full Pipeline)

```bash
python scripts/pipeline.py --input "path/to/raw_video.mp4" --output "output/final_reel.mp4"
```

### 🎛️ Advanced Customization Options

```bash
python scripts/pipeline.py \
  --input "raw_video.mp4" \
  --output "output/reel.mp4" \
  --title "سر زيادة المشاهدات" \
  --theme "neon" \
  --whisper-model "turbo" \
  --lang "ar" \
  --bgm "assets/music.mp3" \
  --fps 60
```

### 🛠️ CLI Flags:
- `--input` (required): Path to raw input video.
- `--output`: Destination path for rendered MP4 (default: `output/final_reel.mp4`).
- `--title`: Custom hook title for the opening banner.
- `--theme`: Subtitle visual style (`box_glass`, `neon`, `bold_yellow`, `clean_white`, `cyber`).
- `--whisper-model`: Whisper model size (`base`, `small`, `medium`, `large-v3`, `turbo`).
- `--lang`: Audio language code (`ar`, `en`, `auto`).
- `--bgm`: Path to background audio track for auto-ducking.
- `--fps`: Output frame rate (default: `60`).
- `--skip-qc`: Skip automated QC validator step.

---

## 🖥️ Live Interactive Preview

To preview and interactively edit the Remotion timeline in your browser:
```bash
npm start
```

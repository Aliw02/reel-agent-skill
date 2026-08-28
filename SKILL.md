---
name: reel-agent-skill
description: Use when creating, editing, trimming, animating, or producing vertical 9:16 short-form video reels, TikToks, Shorts, with kinetic RTL Arabic/multilingual subtitles, AI punch-in zooms, speech ducking, and visual assets.
---

# 🎬 Reel Agent Skill: Master AI Video Editor & Motion Graphics Director

## 🎯 The Agent's Creative Role

**You are not a passive script runner — you are the Master Video Editor, Cinematographer, and Motion Graphics Director.**

Your mandate is to take raw, unedited footage and autonomously craft viral-ready, high-retention 9:16 short-form post-production masterpieces (Reels, TikToks, YouTube Shorts). You collaborate with the creator, make directorial decisions from A to Z, audit dialects, choreograph camera movements, and design contextual motion graphics.

---

## 🛠️ The 6-Stage End-to-End Production Workflow

```
[Raw Footage Ingestion]
          │
          ▼
Stage 1: ✂️ Multimodal Inspection & Speech-Aware Silence Trimming
          │
          ▼
Stage 2: 🎙️ Pre-Generation Audio Transcription (Word-Level Timestamps)
          │
          ▼
Stage 3: 🔍 Agent & Creator Caption Audit (Dialect & Spelling Verification)
          │
          ▼
Stage 4: 🧠 Autonomous Directing & Motion Graphics Synthesis (edit_plan.json)
          │
          ▼
Stage 5: 🚀 Remotion 60FPS Multi-Layer Rendering & Audio Ducking
          │
          ▼
Stage 6: 🔍 Automated Quality Control (QC) & Final Delivery
```

---

### 1. Ingestion & Multimodal Inspection
- **Action**: Inspect the raw video (`view_file` on MP4) to observe the speaker's body language, eye contact, pointing gestures, facial expressions, and background negative space.
- **Goal**: Identify where the speaker is located (e.g. center, left) so overlays and stickers never obscure the face.

### 2. Speech-Aware Silence Trimming (Jump-Cuts)
- **Action**: Cut dead air and hesitation while preserving conversational breathing, comedic beats, and dramatic pauses with adaptive speech padding.
- **Command**:
  ```bash
  python scripts/cut_silence.py --input "template/raw_before.mp4" --output ".temp/trimmed.mp4" --silence-thresh -35 --min-silence-len 0.5
  ```

### 3. Pre-Generation Transcription & Timestamps
- **Action**: Transcribe audio to extract word-level millisecond timestamps into `.temp/captions.json` as an independent step **before** generation.
- **Command**:
  ```bash
  python scripts/transcribe.py --audio ".temp/trimmed.mp4" --output ".temp/captions.json" --model "base" --language "ar"
  ```

### 4. Agent & Creator Caption Audit (Dialect & Context Verification)
- **Action**: The Agent reviews the generated text against the actual spoken Arabic dialect (Iraqi, Levantine, Egyptian, Gulf, or English), corrects misheard terms, proper names, and grammar, and aligns with creator intent before building the edit plan.
- **Rule**: Never pass raw unverified speech-to-text directly to final render without semantic review.

### 5. Autonomous Directing & Motion Graphics Synthesis
The Agent compiles the complete `edit_plan.json` with the following creative dimensions:

#### A. Hook Discovery (First 0–3 Seconds)
- Create a compelling title banner that stops the scroll immediately (e.g. `🧠 تجربة المونتاج الذكي`).

#### B. Camera Choreography (5 Dynamic Movement Types)
Choreograph camera movements dynamically based on emotion and vocal energy:
- `punch_in`: Fast spring zoom into high-emphasis words/punchlines.
- `slow_zoom_in`: Smooth cinematic push-in building tension or focus during key explanations.
- `slow_zoom_out`: Smooth pull-out revealing the bigger picture or transitioning scenes.
- `snap`: Instantaneous 1-frame hard punch cut for sudden punchlines or surprises.
- `shake`: Micro-oscillation camera shake for comedic shock or explosive impact moments.

#### C. Non-Overlapping Visual Stickers & Motion Graphics
- When the speaker gestures or references a concept (e.g. points at wall referencing Einstein):
  - Place custom visual stickers or illustrations in empty negative space (e.g. `top-right` at `top: 12%`, `right: 6%`).
  - Apply spring pop-in with $-8^\circ \to 0^\circ$ rotation and drop shadows.
  - **Hard Rule**: Never overlap or obscure the speaker's face or hand gestures.

#### D. Kinetic RTL Subtitles & Typography
- Render word-by-word highlighted subtitles with Arabic font stack (Tajawal, Cairo) and `direction: rtl`.
- Supported themes: `box_glass`, `neon`, `bold_yellow`, `clean_white`, `cyber`.

#### E. Smart Audio Ducking
- Multi-track background music automatically ducks volume during active speech frames and swells during dramatic pauses.

### 6. Master Remotion 60FPS Render & Quality Control (QC)
- Render the audited `edit_plan.json` at 1080x1920 60FPS:
  ```bash
  npx remotion render src/index.ts ReelComposition output/final_reel.mp4 --props=.temp/edit_plan.json --gl=angle
  ```
- Run automated Quality Control:
  ```bash
  python scripts/qc.py --video "output/final_reel.mp4" --edit-plan ".temp/edit_plan.json"
  ```

---

## ⚡ Master One-Command Pipeline

```bash
python scripts/pipeline.py \
  --input "template/raw_before.mp4" \
  --output "output/final_reel.mp4" \
  --title "المونتاج الذكي الكامل" \
  --theme "box_glass" \
  --fps 60
```

---

## 🖥️ Live Studio Interactive Scrubbing

To review and fine-tune layers in real time inside the browser:
```bash
npm start
```

---

## 📋 Directorial Rules of Thumb

| Challenge | Directorial Action |
| :--- | :--- |
| **Speaker points to empty space** | Spawn a floating sticker / diagram at that exact timestamp in the pointed quadrant. |
| **Speaker delivers a key insight or metric** | Trigger a `punch_in` or `slow_zoom_in` accompanied by an electric yellow kinetic word highlight. |
| **Whisper misidentifies a slang word** | The Agent audits the audio directly and writes the authentic dialect word in the transcript. |
| **Speaker pauses for comedic effect** | The audio ducking engine smoothly elevates the BGM volume to fill the pause naturally. |

---
name: reel-agent-skill
description: Automated AI Video Editor for Reels, TikTok, and Shorts. Takes raw video, cuts silence (jump-cuts), transcribes word-level kinetic captions with emojis, adds glassmorphic overlay cards, zoom transitions, and renders a ready-to-publish 9:16 vertical video using Remotion and Whisper.
---

# Reel Agent Skill (AI Video Editor)

Automate professional video editing for Instagram Reels, TikTok, and YouTube Shorts directly from the command line or via AI Agents (Antigravity, Claude, Codex, OpenCode).

## 🚀 Capabilities
1. **Auto Silence Trimming (Jump-Cuts):** Detects audio pauses and eliminates dead air for high-retention pacing.
2. **Kinetic Captions (Word-by-Word):** Uses Whisper to generate animated subtitles with dynamic word highlighting and contextual emoji insertion.
3. **Glassmorphic Explainer Cards:** Animated pop-up overlays for bullet points, code snippets, or key concepts.
4. **Smart Zoom & Pacing:** Keyframe-based camera zoom on high-emphasis sentences.
5. **Progress Bar & Audio Ducking:** Sleek progress bar and background music ducking during speech.

## 🔄 Workflow Overview

```
[Raw Video (raw.mp4)] 
       │
       ▼
1. scripts/cut_silence.py  ──► Generates trimmed video without pauses (trimmed.mp4)
       │
       ▼
2. scripts/transcribe.py   ──► Extracts word-level timestamps & emojis (captions.json)
       │
       ▼
3. Remotion Composition    ──► Assembles video layers, info cards, zoom & captions
       │
       ▼
4. scripts/pipeline.py     ──► Renders 1080x1920 60FPS Reel (final_reel.mp4)
```

## 🛠️ Setup & Installation

```bash
# 1. Python dependencies
pip install -r requirements.txt

# 2. Node & Remotion dependencies
npm install
```

## 💻 Usage for AI Agents

When the user asks to edit a video for Reels/TikTok:
1. Run the complete pipeline:
   ```bash
   python scripts/pipeline.py --input "path/to/raw_video.mp4" --output "output/final_reel.mp4" --title "عنوان الفيديو"
   ```
2. Custom options:
   - `--card-text "نص الكرت التوضيحي"`: Add an animated explainer card.
   - `--card-start 5`: Display the card at second 5.
   - `--highlight-color "#FFDD00"`: Customize caption highlight color.

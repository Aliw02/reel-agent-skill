---
name: reel-agent-skill
description: Use when editing, trimming, directing, or producing vertical 9:16 video reels (TikTok, Shorts, Reels) from raw footage with interactive step-by-step approval, bilingual kinetic subtitles, 3D motion graphics, or smart camera zooms.
---

# Reel Agent Skill: Hollywood-Tier Interactive AI Video Director

## Overview

Interactive post-production director and co-editor for transforming raw talking-head footage into high-retention 9:16 vertical video reels. Operates via **strict step-by-step visual approval gates**: every phase renders an observable preview asset, provides an artistic director critique, and halts for user review before proceeding.

---

## Core Invariants & Quality Standards

1. **Strict Interactive Approval Gates**: Never execute the entire pipeline in an unguided monolithic batch. Complete one stage, render an observable preview (`.mp4`, contact sheet, or Studio preview), critique the visual result, and obtain explicit user approval before moving to the next stage.
2. **Executive Bilingual Kinetic Subtitles (Zero Emojis)**:
   - **No Emojis**: Emojis are strictly prohibited to maintain an elite, executive creator aesthetic.
   - **Bilingual Stacking**: Primary spoken Arabic on top (bold, high contrast, active word spring glow), secondary English translation underneath (subtle `#94A3B8` platinum subtitle).
   - **Natural Phrase Units**: Group subtitles by semantic meaning (2–5 words per natural speech breath), never arbitrary mechanical word chops.
3. **Hollywood Motion Design & 3D Layering**:
   - **3D Floating Elements**: Tilt graphics with `perspective` and `rotateX/rotateY` to create depth.
   - **Numeric Counters**: Animate spoken figures, metrics, and percentages with dynamic counting up/down.
   - **Clean Full-Frame Video**: Keep the speaker unmasked and crisp (no artificial translucent egg masks).
4. **Dynamic Camera Choreography & Sound Design**:
   - **Smart Punch-in Zooms**: Spring zoom (1.12x–1.18x) centered on speaker eye level on emphasized sentences.
   - **Synchronized SFX**: Pair visual card entrances, zooms, and transitions with subtle whooshes, pops, and impacts.
   - **Mastered Audio**: Voice leveled to -16 LUFS with smooth dynamic background music ducking.

---

## 4-Stage Interactive Directorial Pipeline

```
[Raw Footage]
      │
      ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Pacing & Speech-Aware Silence Trimming             │
│ Output: .temp/trimmed.mp4                                   │
│ Gate: Review trimmed preview video & confirm timing         │
└──────────────────────────────┬──────────────────────────────┘
                               │ (User Approved)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Bilingual Caption Generation & Dialect Audit       │
│ Output: .temp/captions_reviewed.json                        │
│ Gate: Review Arabic text, English translation & phrase cuts │
└──────────────────────────────┬──────────────────────────────┘
                               │ (User Approved)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 3: 3D Motion Graphics, Camera Choreography & Preview  │
│ Output: .temp/edit_plan.json + Remotion Studio Live Preview │
│ Gate: Review 3D cards, punch zooms, counters & transitions  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (User Approved)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage 4: Audio Mastering, SFX & Master 60FPS/30FPS Render   │
│ Output: output/final_reel.mp4 + visual_qc_contact_sheet.jpg │
│ Gate: Verify QC report and inspect final rendered reel      │
└─────────────────────────────────────────────────────────────┘
```

---

### Stage 1: Speech-Aware Silence Trimming & Pacing

1. **Analyze Audio & Trim Dead Air**:
   ```bash
   python scripts/cut_silence.py --input "<raw_video.mp4>" --output ".temp/trimmed.mp4" --silence-thresh -30
   ```
2. **Present Visual Preview & Director Critique**:
   - Inspect `.temp/trimmed.mp4` duration and cuts.
   - Report cut duration, remaining length, and pacing quality to the user.
3. **Completion Criterion**: User reviews and approves `.temp/trimmed.mp4` before any transcription or graphics work begins.

---

### Stage 2: Bilingual Kinetic Captions & Semantic Dialect Audit

1. **Transcribe Spoken Speech**:
   ```bash
   python scripts/transcribe.py --audio ".temp/trimmed.mp4" --output ".temp/captions.json" --model "turbo" --language "ar" --fps 30
   ```
2. **Audit Arabic & Generate English Subtitle Translation**:
   - Correct phonetic nuances, regional dialects (Iraqi, Levantine, Egyptian, Gulf), and technical terms.
   - Translate each Arabic sentence chunk into a clean, modern English secondary line.
   - Ensure zero emojis are present across all chunks.
   - Save verified bilingual payload to `.temp/captions_reviewed.json`.
3. **Present Subtitle Review**:
   - Display each phrase with its Arabic primary text, English translation, and start/end time.
4. **Completion Criterion**: User approves the text accuracy, translation, and phrasing boundaries.

---

### Stage 3: 3D Motion Graphics, Camera Choreography & Studio Preview

1. **Synthesize Custom Edit Plan**:
   ```bash
   python scripts/director.py --transcript ".temp/captions_reviewed.json" --output ".temp/edit_plan.json" --theme "box_glass" --fps 30
   ```
2. **Directorial Additions**:
   - **Gestures & Negative Space**: Position 3D cards and badges opposite speaker eye gaze.
   - **Spoken Metrics**: Insert `AnimatedCounter` scenes or PIP cards for spoken numbers.
   - **Emphasis Zooms**: Add `punch_in` zoom events (scale 1.15x) anchored on `[0.50, 0.38]`.
   - **Transitions**: Apply clean `zoom_cut` or subtle chromatic micro-flashes (avoid heavy neon glitch bars).
3. **Launch & Direct Studio Preview**:
   - Copy assets to `public/` and instruct user to scrub timeline in `npm start` (`http://localhost:3000`).
   - Describe directorial choices (camera angles, card timings, color grade).
4. **Completion Criterion**: User verifies composition, graphics placement, and camera movement in Remotion Studio.

---

### Stage 4: Audio Mastering, SFX & Master Quality Render

1. **Master Loudness & Mix SFX**:
   - Level dialogue to -16 LUFS.
   - Bind SFX (`whoosh.mp3`, `pop.mp3`, `impact.mp3`) to transition and card entrance frames.
2. **Execute Master Multi-Layer Render**:
   ```bash
   node scripts/render_reel.js --plan .temp/edit_plan.json --output output/final_reel.mp4
   ```
3. **Automated Technical & Visual QC**:
   ```bash
   python scripts/qc.py --video "output/final_reel.mp4" --plan ".temp/edit_plan.json"
   ```
4. **Completion Criterion**: `output/final_reel.mp4` passes QC (`1080x1920`, exact duration, valid audio stream) and `.temp/visual_qc_contact_sheet.jpg` is presented to the user.

---

## Directorial Placement & Styling Matrix

| Element | Specification | Directorial Rule |
| :--- | :--- | :--- |
| **Top Hook Header** | `top: 130px`, dark glass pill capsule | Active for first 1.5–2.5s; font Cairo 800; no emojis. |
| **Primary Arabic Text** | Font: *Cairo* / *Readex Pro*, Size: 54px | High contrast white, glowing golden/cyan active word bounce. |
| **Secondary English Text**| Font: *Inter* / *Geist*, Size: 32px, Color: `#94A3B8` | Positioned directly underneath Arabic line. |
| **Subtitle Vertical Position**| `bottom: 220px`–`240px` | Clear of bottom platform UI overlays and clear of speaker chest. |
| **Punch-in Zooms** | Scale: 1.14x–1.18x, Origin: `[50%, 38%]` | 30–60 frame spring curves on high-energy speech sentences. |
| **3D Floating Cards** | Top-left / Top-right negative space | 3D perspective tilt (`rotateY: -8deg`), smooth spring pop-in. |
| **Color Grading** | Contrast: 1.05, Saturation: 1.08, Vignette: 0.35 | Clean, natural creator look without muddy darkness. |
| **Audio Ducking** | BGM: 0.14 $\to$ 0.035 during speech | Smooth volume attenuation over 8 frames. |

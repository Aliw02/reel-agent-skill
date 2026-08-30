# Reel Agent V3 — Reference-Quality AI Editing Requirements

**Repository:** `Aliw02/reel-agent-skill`  
**Target:** Upgrade the current reel pipeline from a template-driven automated editor into a content-aware, multimodal AI video director capable of producing edits with the visual language, pacing, layering, motion design, and scene composition quality of the supplied reference reel.

---

## 1. Product Goal

The system must accept raw footage and produce a finished vertical reel without requiring the user to manually specify every zoom, overlay, transition, card, B-roll item, or layout.

The editor must:

1. Understand what is being said.
2. Understand what is visually happening.
3. Detect the speaker, face, hands, screen regions, objects, and available negative space.
4. Classify the function of each spoken segment.
5. Decide whether that segment needs:
   - no effect,
   - a camera move,
   - a layout change,
   - motion graphics,
   - B-roll,
   - a cutout,
   - a stat/count animation,
   - a transition,
   - a screen crop,
   - typography,
   - an audio cue,
   - or a combination of these.
6. Build a structured edit plan.
7. Render the plan deterministically.
8. Inspect the rendered result and reject or correct bad compositions.

The target is **not more effects**.  
The target is **better editorial decisions**.

---

# 2. Current Repository Baseline

The current repository already contains a useful foundation and should not be rewritten from scratch.

## 2.1 Existing pipeline

Current core files:

- `scripts/cut_silence.py`
- `scripts/transcribe.py`
- `scripts/director.py`
- `scripts/pipeline.py`
- `scripts/qc.py`
- `src/ReelComposition.tsx`
- `src/Root.tsx`
- `src/components/Subtitles.tsx`
- `src/components/Overlays.tsx`
- `src/components/ProgressBar.tsx`
- `src/components/InfoCard.tsx`
- `src/types/schema.ts`

Current architecture is approximately:

```text
Raw Video
  -> Silence Trim
  -> Whisper Transcription
  -> Caption Review
  -> Heuristic Director
  -> edit_plan.json
  -> Remotion Renderer
  -> Technical QC
```

## 2.2 Existing useful capabilities

The current code already supports or partially supports:

- Faster-Whisper transcription.
- Arabic language processing.
- Word-level timestamps.
- Semantic subtitle chunking.
- RTL subtitle rendering.
- Multiple caption themes.
- Hook/title rendering.
- Dynamic video duration metadata.
- Zoom event rendering.
- Reframe event rendering.
- Media overlays.
- Image and video overlays.
- Cards.
- Quotes.
- Stats.
- Bullet lists.
- Code blocks.
- Lower thirds.
- Progress bars.
- Background music.
- Speech-based BGM ducking.
- SFX event schema.
- Remotion-based 9:16 rendering.
- Basic post-render technical QC.

These systems should be retained and extended where practical.

---

# 3. Current Critical Problems

The project currently has a stronger renderer than director.

The main limitation is not Remotion.  
The main limitation is that the system does not yet make sufficiently intelligent editorial decisions.

## P0.1 Pipeline runtime blocker

`pipeline.py` imports:

```python
from director import audit_and_correct_captions
```

but the currently checked-in `director.py` does not define that function.

### Required fix

Either:

- implement `audit_and_correct_captions`, or
- move caption auditing into a dedicated module and import it correctly.

The pipeline must run end-to-end from a clean checkout.

---

## P0.2 Missing CLI FPS argument

`pipeline.py` passes:

```python
fps=args.fps
```

but the CLI currently does not define `--fps`.

### Required fix

Add and validate:

```text
--fps
```

with a sensible default and source-FPS-aware mode.

---

## P0.3 Schema field mismatches

The director and renderer must use one canonical data contract.

Examples currently requiring cleanup include:

```text
durationFrames vs durationInFrames
duckedVolume vs duckingVolume
```

### Required fix

`src/types/schema.ts` must be the canonical contract.

Python should validate the final plan before render.

No renderer field may depend on accidental fallback defaults.

---

## P0.4 Director is heuristic, not semantic

The current director primarily detects emphasis using:

- numbers,
- word duration,
- existing highlight flags.

That can produce zooms, but it cannot understand why a scene should change.

### Required fix

The next director must be **multimodal and semantic**.

---

# 4. Reference Reel — Editing Language We Need to Reproduce

The supplied reference reel demonstrates a much richer editing grammar than the current output.

The goal is not to copy one design pixel-for-pixel.  
The goal is to give the agent the ability to make the same **class of editorial decisions**.

---

## 4.1 High-energy layered intro

The opening uses several simultaneous visual layers:

- talking-head video,
- large background typography,
- typography visually behind the speaker,
- foreground speaker,
- caption pill,
- active-word color treatment,
- waveform/motion element,
- top label,
- controlled visual hierarchy.

### Required capabilities

- subject segmentation,
- foreground/background compositing,
- layered typography,
- motion graphics,
- safe-zone-aware positioning,
- animated captions,
- waveform component,
- visual hierarchy rules.

---

## 4.2 Full layout transformation

The reference does not keep the speaker fullscreen for the entire video.

It changes the entire composition into a designed scene containing:

- light graphic background,
- speaker inside a rounded PIP frame,
- large headline,
- numeric price/stat treatment,
- animated value transition.

### Required capability

The system must support **scene layouts**, not only overlays.

Examples:

```text
TalkingHeadFull
TalkingHeadTypography
StatPip
SplitScreen
ScreenDemo
FullscreenBroll
ComparisonScene
QuoteScene
InfographicScene
ProductDemo
```

---

## 4.3 Animated numbers and statistics

The reference animates numerical values rather than showing static text.

### Required components

- numeric counter,
- currency counter,
- percentage counter,
- before/after value animation,
- strike-through or replacement animation,
- stat label,
- number formatting.

---

## 4.4 Glitch/slice transition

The reference contains a deliberate horizontal-slice/glitch transition.

### Required transition types

At minimum:

```text
hard_cut
zoom_cut
glitch_slice
rgb_glitch
blur_wipe
whip_left
whip_right
flash
push
mask_reveal
scale_morph
match_cut
```

The director must choose transitions contextually.

A transition must never be inserted only because a cut exists.

---

## 4.5 Intentional hard cuts

The reference sometimes uses no transition at all.

### Editorial rule

The director must explicitly support:

```text
transition = none
```

or:

```text
transition = hard_cut
```

when that produces better rhythm.

---

## 4.6 Screen-demo focus

During screen explanation sections, visual energy becomes calmer and the frame follows the area being discussed.

### Required capability

A dedicated **Screen Demo Director** must:

- detect screen content,
- detect cursor position if visible,
- detect hand/finger pointing if visible,
- detect salient UI region,
- identify the region being discussed,
- smoothly crop into that region,
- hold long enough for comprehension,
- return to wider context when necessary.

---

## 4.7 Variable visual density

The reference does not maintain maximum visual intensity for the whole reel.

Typical energy curve:

```text
Hook / First seconds: High
Core explanation: Medium
Detailed screen explanation: Low to Medium
Major claim / reveal: High
Closing: Medium
```

### Required rule

The director must control **visual density over time**.

---

# 5. Target Architecture

The final architecture should become:

```text
RAW VIDEO
    |
    v
Media Probe
    |
    +--> Audio Analysis
    +--> Scene Detection
    +--> Frame Sampling
    +--> Face / Person Detection
    +--> Subject Tracking
    +--> Screen / ROI Detection
    +--> Optional Subject Segmentation
    |
    v
Whisper Transcription
    |
    v
Caption / Dialect Audit
    |
    v
MULTIMODAL AI DIRECTOR
    |
    v
Creative Edit Plan
    |
    +--> Scene Planner
    +--> Camera Planner
    +--> Layout Planner
    +--> Graphics Planner
    +--> Asset Planner
    +--> Transition Planner
    +--> Audio Planner
    +--> Color Planner
    |
    v
Deterministic Edit Plan Validation
    |
    v
REMOTION COMPOSITOR
    |
    v
Audio Mix + Color Treatment
    |
    v
Render
    |
    v
VISUAL + TECHNICAL QC
    |
    v
FINAL REEL
```

---

# 6. Multimodal Analysis Requirements

## 6.1 Media probe

Before directing, collect:

- width,
- height,
- FPS,
- duration,
- audio sample rate,
- orientation,
- codec,
- loudness,
- source aspect ratio.

### Output

```text
media_analysis.json
```

---

## 6.2 Scene detection

Detect:

- hard cuts,
- major visual changes,
- screen-recording sections,
- talking-head sections,
- B-roll sections.

### Output example

```json
{
  "scenes": [
    {
      "startFrame": 0,
      "endFrame": 140,
      "type": "talking_head"
    },
    {
      "startFrame": 141,
      "endFrame": 920,
      "type": "screen_demo"
    }
  ]
}
```

---

## 6.3 Face and person detection

The analyzer must return per sampled frame:

- face bounding box,
- face center,
- person bounding box,
- confidence,
- optional pose/keypoints.

This data must be temporally smoothed.

---

## 6.4 Subject tracking

Do not independently detect a face on every render frame.

Track the subject over time and produce stable motion.

### Required result

```text
subject_track.json
```

with temporally stable coordinates.

---

## 6.5 Negative-space estimation

Detect visually safe regions for:

- captions,
- labels,
- images,
- cards,
- callouts,
- statistics.

The system should score quadrants or polygons by obstruction risk.

---

## 6.6 Screen ROI detection

For screen demonstrations detect:

- active cursor region,
- interaction target,
- changed UI region,
- large readable text,
- highlighted UI control.

---

## 6.7 Audio energy analysis

Extract useful signals such as:

- speech/non-speech,
- RMS/loudness,
- pause length,
- speaking rate,
- emphasis spikes,
- optional beat positions for music.

Audio signals must assist the director, not replace semantic understanding.

---

# 7. AI Director Requirements

The director is the highest-priority subsystem.

## 7.1 Director input

The director should receive a compact structured package containing:

- transcript,
- word timestamps,
- caption chunks,
- scene boundaries,
- sampled frame descriptions or images,
- face/person positions,
- screen ROI data,
- audio energy,
- available assets,
- target platform,
- selected style preset,
- reference style profile.

---

## 7.2 Segment classification

Each semantic segment should be classified into one or more roles:

```text
hook
setup
explanation
definition
number
statistic
comparison
person_reference
product_reference
website_reference
screen_demo
proof
example
punchline
warning
question
reveal
cta
transition_statement
```

---

## 7.3 Visual treatment decision

For each segment the director must choose among:

```text
none
camera_only
caption_only
background_typography
media_overlay
full_broll
subject_cutout
stat_scene
comparison_scene
pip_scene
screen_focus
quote_scene
infographic_scene
freeze_frame
layout_change
```

---

## 7.4 Reason field

Every major creative event should include a machine-readable reason.

Example:

```json
{
  "treatment": "stat_scene",
  "reason": "speaker introduces a strong numeric cost comparison"
}
```

This helps debugging and evaluation.

---

## 7.5 Restraint rules

The director must avoid over-editing.

Required rules:

- Do not add an effect to every sentence.
- Do not animate every word.
- Do not add a transition to every cut.
- Do not add an emoji only because a keyword matched.
- Do not show B-roll when the speaker's face is more useful.
- Do not obscure important gestures.
- Do not put graphics over faces.
- Avoid repeating the same transition too frequently.
- Avoid consecutive punch zooms unless deliberately building energy.
- Keep detailed explanations visually calmer.

---

# 8. Scene & Layout Engine

This is a major missing capability.

The renderer must support scene-level composition presets.

## Required layouts

### 8.1 TalkingHeadFull

Full-height talking head with optional camera movement.

### 8.2 TalkingHeadTypography

Speaker in foreground with large typography behind or around subject.

### 8.3 StatPip

Speaker inside a smaller rounded container with headline/stat graphics.

### 8.4 SplitScreen

Two primary visual regions.

### 8.5 ScreenDemo

Screen recording or screen crop becomes primary visual layer.

### 8.6 FullscreenBroll

B-roll takes the entire frame while source narration continues.

### 8.7 ComparisonScene

Before/after, A/B, price comparison, option comparison.

### 8.8 QuoteScene

Large quote with controlled subject placement.

### 8.9 InfographicScene

Structured bullets, metrics, diagram-like visual explanation.

### 8.10 ProductDemo

Product/UI visual dominates while speaker appears in PIP when useful.

---

# 9. Scene Timeline Model

The edit plan should move toward a scene-based model.

Recommended structure:

```json
{
  "scenes": [
    {
      "id": "scene_001",
      "startFrame": 0,
      "endFrame": 150,
      "layout": "talking_head_typography",
      "energy": "high",
      "transitionIn": "hard_cut",
      "transitionOut": "layout_morph"
    }
  ]
}
```

Each scene may contain:

- source video layer,
- subject cutout,
- typography,
- graphics,
- media,
- captions,
- camera events,
- audio events,
- effects.

---

# 10. Subject Segmentation & Depth Compositing

To achieve typography behind the person, the renderer needs a depth-aware layer stack.

## Required logical layers

```text
Background
Background Video Treatment
Background Typography
Background Graphics
Original Video
Isolated Subject
Midground Graphics
Foreground Graphics
Captions
UI-Safe Foreground Effects
```

---

## 10.1 Segmentation output

The analyzer must be able to produce:

- alpha video,
- per-frame mask,
- or keyed segmentation sequence.

The exact model is implementation-dependent.

Possible technologies may include:

- Robust Video Matting,
- MediaPipe,
- SAM-based workflows,
- other temporal person segmentation models.

Technology choice is secondary to stable temporal masks.

---

## 10.2 Quality constraints

Subject masks must avoid:

- strong edge flicker,
- disappearing hair,
- unstable shoulders,
- obvious frame-to-frame mask jumps.

If segmentation confidence is low, the director must fall back to a non-depth layout.

---

# 11. Smart Camera & Reframe Engine

The renderer already supports reframe events; the analysis and director must generate them intelligently.

## Required camera event types

```text
hold
micro_push
punch_in
slow_push
slow_pull
pan
reframe
snap
shake
reset
```

## Camera rules

- Center on face for talking head unless composition requires otherwise.
- Preserve eye line.
- Avoid excessive scale.
- Avoid cutting off chin/forehead.
- Avoid fighting with intentional source camera movement.
- Use camera changes to support meaning, not as random decoration.

---

# 12. Motion Graphics Library

The agent should choose from reliable reusable components rather than generating arbitrary CSS every time.

## Required components

### Typography

- kinetic headline,
- word emphasis,
- background typography,
- label,
- pill,
- underline,
- highlight block,
- strike-through,
- quote marks,
- callout.

### Numbers

- animated counter,
- currency counter,
- percentage counter,
- before/after number,
- odometer-like counter,
- number replacement.

### Visual indicators

- waveform,
- progress indicator,
- arrow,
- pointer,
- circle annotation,
- checkmark,
- cross,
- badge,
- icon label.

### Information layouts

- statistic card,
- comparison card,
- bullet card,
- quote block,
- code block,
- lower third,
- mini infographic.

---

# 13. Transition Engine

Create a dedicated transition system.

## Required transition schema

```json
{
  "type": "glitch_slice",
  "startFrame": 300,
  "durationInFrames": 12,
  "intensity": 0.7
}
```

## Minimum transition library

- hard cut,
- zoom cut,
- glitch slice,
- RGB glitch,
- blur wipe,
- whip left,
- whip right,
- flash,
- push,
- mask reveal,
- scale morph,
- match cut.

## Rules

- Default should not be a decorative transition.
- Hard cuts are valid and often preferred.
- Transition duration should generally remain short.
- Do not repeat specialty transitions excessively.
- Use glitch only where style/energy supports it.
- Avoid transitions during dense information delivery.

---

# 14. Typography & Caption System

The existing RTL work should remain, but typography must become scene-aware.

## Requirements

- Arabic RTL shaping.
- Mixed Arabic/English support.
- Avoid uppercase transformation for Arabic.
- No inappropriate letter spacing for Arabic.
- Safe line lengths.
- Responsive font size.
- Face-aware placement.
- UI-safe vertical placement.
- Configurable pill captions.
- Active-word highlighting.
- Phrase emphasis.
- Large one-word emphasis.
- Background typography.
- Subtitle hierarchy separate from headline hierarchy.

## Required text roles

```text
subtitle
headline
keyword
annotation
label
stat_label
quote
cta
```

---

# 15. Asset & B-Roll Intelligence

The agent must not simply place every supplied image as a rectangle.

## Asset pipeline

An asset may require:

- crop,
- background removal,
- subject cutout,
- perspective transform,
- color matching,
- shadow,
- border,
- mask,
- feather,
- grain,
- blur,
- entrance animation,
- exit animation.

## Director requirements

When a named entity or visual concept is mentioned, the director should be capable of deciding:

```text
no visual needed
existing asset
generated graphic
image overlay
cutout
full-screen B-roll
screen capture
```

Asset retrieval/generation should be provider-agnostic and optional.

---

# 16. Image Integration Requirements

A person/object image should not default to a full rectangular card.

Support:

- transparent cutout,
- circular crop,
- masked shape,
- floating sticker,
- full-bleed background,
- parallax element,
- framed PIP,
- background layer,
- foreground layer.

---

# 17. Audio Engine

The current BGM/ducking system should be expanded.

## Required audio processing

- source voice normalization,
- loudness target,
- limiter,
- clipping protection,
- optional noise reduction,
- optional EQ,
- BGM volume automation,
- speech-aware ducking,
- fade in/out,
- SFX timeline,
- optional music beat analysis.

## SFX categories

- whoosh,
- impact,
- pop,
- click,
- riser,
- glitch,
- transition accent.

## Audio restraint rules

- No SFX on every caption.
- No loud SFX over important speech.
- Use sound to reinforce major visual events.
- Keep voice intelligibility as highest priority.

---

# 18. Beat-Aware Editing

If music exists and beat analysis is enabled:

- detect beats/downbeats,
- allow major graphics to land near beats,
- allow scene changes to align when natural,
- do not distort speech timing merely to hit a beat.

Beat alignment is supportive, not mandatory.

---

# 19. Color Correction & Grading

Current vignette treatment is not enough.

## Required correction stage

- exposure,
- contrast,
- white balance,
- saturation,
- optional denoise,
- optional sharpening,
- skin-tone protection.

## Required creative grade stage

Use a style profile after technical correction.

Possible presets:

```text
clean_creator
warm_creator
modern_tech
minimal_documentary
cinematic_soft
high_energy_social
```

## Rule

Do not apply a heavy LUT blindly.

Correction must precede creative grading.

---

# 20. Speech-Aware Cutting & Pacing

Current silence detection should become pacing-aware.

## Required behavior

Distinguish:

```text
dead_air
breath
hesitation
intentional_pause
dramatic_pause
sentence_gap
```

## Cutting rules

- preserve meaningful pauses,
- shorten dead air,
- avoid cutting consonants or word tails,
- avoid robotic jump-cut rhythm,
- allow micro pauses for comprehension,
- support optional speed-up of selected low-energy segments.

---

# 21. Speed Ramping & Freeze Frames

Support optional:

- subtle speed-up,
- slowdown,
- freeze frame,
- hold frame,
- punch freeze,
- freeze + cutout composition.

Use only when semantically justified.

---

# 22. Screen Demo Director

This requires its own subsystem.

## Inputs

- screen frames,
- cursor trajectory,
- interaction region,
- transcript,
- UI saliency.

## Outputs

- ROI timeline,
- zoom timeline,
- crop timeline,
- callout timeline.

## Behaviors

- show wide context first when necessary,
- zoom into the relevant control,
- hold long enough to read,
- avoid excessive panning,
- return to wider view when context changes,
- allow speaker PIP when helpful.

---

# 23. Style Grammar

The target should not be one hardcoded visual template.

A style preset should define:

- colors,
- font families,
- caption style,
- headline style,
- transition preferences,
- corner radius,
- shadow language,
- motion speed,
- spring characteristics,
- preferred layout types,
- visual density,
- SFX intensity,
- color grade.

Example:

```json
{
  "id": "modern_arabic_creator",
  "motion": "fast_clean",
  "visualDensity": {
    "hook": "high",
    "body": "medium",
    "detail": "low"
  },
  "transitionBias": [
    "hard_cut",
    "zoom_cut",
    "glitch_slice"
  ]
}
```

---

# 24. Edit Plan Schema V3

`src/types/schema.ts` should evolve into a scene-first contract.

Suggested top-level shape:

```json
{
  "version": "3.0.0",
  "videoSrc": "trimmed.mp4",
  "fps": 30,
  "durationInFrames": 2000,
  "style": {},
  "analysis": {},
  "scenes": [],
  "captions": [],
  "audio": {},
  "color": {},
  "qc": {}
}
```

---

## 24.1 Scene object

Suggested fields:

```text
id
startFrame
endFrame
intent
energy
layout
source
camera
layers
graphics
media
transitionIn
transitionOut
audioEvents
colorTreatment
reason
```

---

## 24.2 Layer object

Suggested types:

```text
source_video
background
subject_cutout
text
image
video
shape
counter
waveform
card
caption
effect
```

---

## 24.3 Validation

Before render:

- validate required fields,
- reject missing assets,
- reject invalid frame ranges,
- reject overlapping impossible events,
- reject out-of-bounds coordinates,
- normalize old V2 fields when possible.

---

# 25. Renderer Refactor

`ReelComposition.tsx` is currently becoming too responsible for unrelated concerns.

Refactor toward:

```text
src/
  components/
  scenes/
  transitions/
  graphics/
  camera/
  audio/
  color/
  effects/
  layouts/
```

Suggested modules:

```text
src/scenes/SceneRenderer.tsx
src/layouts/TalkingHeadFull.tsx
src/layouts/TalkingHeadTypography.tsx
src/layouts/StatPip.tsx
src/layouts/ScreenDemo.tsx
src/layouts/ComparisonScene.tsx

src/transitions/TransitionRenderer.tsx
src/transitions/GlitchSlice.tsx
src/transitions/ZoomCut.tsx
src/transitions/BlurWipe.tsx

src/graphics/AnimatedCounter.tsx
src/graphics/Waveform.tsx
src/graphics/BackgroundTypography.tsx
src/graphics/Callout.tsx

src/camera/CameraRig.tsx
src/audio/AudioMixer.tsx
src/color/ColorTreatment.tsx
```

The director should create plans.  
The renderer should execute them.

---

# 26. Python Analysis Refactor

Suggested analysis modules:

```text
scripts/
  analyze_media.py
  scene_detect.py
  track_subject.py
  analyze_screen.py
  analyze_audio.py
  segment_subject.py
  caption_audit.py
  director.py
  validate_plan.py
  qc_visual.py
  pipeline.py
```

The exact filenames can change, but responsibilities should remain separate.

---

# 27. LLM / Vision Integration

The AI Director should be model-provider-agnostic.

## Requirements

- text-only fallback,
- vision-capable mode,
- structured JSON output,
- schema validation,
- retry on invalid JSON,
- deterministic low-temperature planning option,
- cached analysis,
- no direct rendering code generated by the LLM.

The LLM creates **plans**, not arbitrary React code.

---

# 28. Fallback Behavior

The system must degrade gracefully.

Examples:

### No vision model available

Use transcript + detected subject position + scene heuristics.

### Segmentation unavailable

Use PIP or non-depth layout.

### No B-roll assets

Use typography, camera, or graphic treatment instead.

### No BGM

Render clean voice-only output.

### Low-confidence screen ROI

Keep wider framing.

---

# 29. Visual Safety Rules

Never:

- cover a face with a card unless intentionally designed,
- place subtitles under platform UI,
- crop eyes out of frame,
- cut off important hand gestures,
- place tiny unreadable text,
- use low-contrast text,
- use more than one dominant visual focus unless the layout specifically requires comparison,
- add a foreground asset without checking overlap.

---

# 30. Platform Safe Zones

Support profiles for:

```text
TikTok
Instagram Reels
YouTube Shorts
Generic 9:16
```

Each profile should define:

- bottom UI exclusion zone,
- right-side controls exclusion zone,
- top UI exclusion zone,
- caption-safe zone.

---

# 31. Visual QC

Current technical QC should remain, but the system needs frame-level QC.

## Visual checks

- face obstruction,
- face crop,
- subtitle bounds,
- subtitle readability,
- overlay collision,
- empty/black frames,
- broken image assets,
- layout overflow,
- excessive visual clutter,
- segmentation failure,
- transition artifacts,
- duplicated overlay,
- incorrect z-index/depth order.

---

# 32. Semantic QC

The QC layer should verify:

- displayed number matches transcript,
- person/name label matches transcript,
- B-roll concept is relevant,
- caption text is not missing critical words,
- visual remains long enough to understand,
- effect timing corresponds to the intended statement.

---

# 33. Automated Preview Sampling

After render:

1. Sample frames around every:
   - scene boundary,
   - overlay entrance,
   - transition midpoint,
   - major caption event.
2. Generate a contact sheet.
3. Run visual inspection.
4. Re-render if critical issues are found.

---

# 34. Performance Requirements

The system should cache expensive analysis.

Cache:

- transcription,
- scene detection,
- face tracking,
- segmentation,
- frame descriptions,
- edit plan,
- asset preparation.

Changing only caption style should not force Whisper to run again.

Changing only color treatment should not force segmentation to run again.

---

# 35. Reproducibility

Every final output should preserve:

```text
captions.json
captions_reviewed.json
media_analysis.json
scene_analysis.json
subject_track.json
edit_plan.json
qc_report.json
```

Optional:

```text
visual_qc_contact_sheet.jpg
director_trace.json
```

---

# 36. Director Trace

For debugging, store major decisions:

```json
{
  "segmentId": "seg_12",
  "text": "example text",
  "intent": "statistic",
  "decision": "stat_pip",
  "reason": "numeric comparison should become a visual statistic",
  "confidence": 0.91
}
```

This is essential for improving the system.

---

# 37. Reference-Reel Acceptance Test

A dedicated acceptance video should test whether the engine can independently produce the following classes of behavior.

## Test A — Layered hook

Expected:

- speaker remains readable,
- large typography may appear behind the subject,
- high-energy opening,
- caption does not obscure face,
- visual hierarchy remains clear.

## Test B — Numeric comparison

Expected:

- director recognizes the number/comparison,
- switches to a stat-oriented layout,
- animates numeric value,
- speaker may move to PIP,
- transition into/out of scene is deliberate.

## Test C — Named person/object

Expected:

- director decides whether external visual support is useful,
- asset is integrated as a cutout or designed media element,
- raw rectangular image is not the default.

## Test D — Glitch-worthy energy change

Expected:

- glitch/slice can be selected where appropriate,
- effect is short,
- audio accent may accompany it,
- effect is not repeated unnecessarily.

## Test E — Screen explanation

Expected:

- relevant screen region becomes primary,
- crop/reframe follows explanation,
- motion is smooth,
- viewer can read the screen,
- captions remain out of the way.

---

# 38. Quality Metrics

The project should evaluate more than “render succeeded”.

Track:

## Technical

- render success rate,
- A/V sync,
- duration error,
- dropped/broken asset count.

## Composition

- face obstruction rate,
- caption obstruction rate,
- out-of-safe-zone rate,
- unreadable-text rate.

## Editorial

- irrelevant B-roll rate,
- repeated-effect rate,
- unnecessary-transition rate,
- meaningful-event coverage,
- manual correction count.

## User-level

- percentage of output accepted without manual timeline edits.

---

# 39. Implementation Phases

## Phase 0 — Make V2 reliable

Required before new creative systems:

- [ ] Implement/fix caption audit import.
- [ ] Add `--fps`.
- [ ] Canonicalize schema field names.
- [ ] Validate edit plan before render.
- [ ] Verify SFX timeline behavior.
- [ ] Add end-to-end smoke test.
- [ ] Ensure fresh clone can process one reel successfully.

---

## Phase 1 — Director V3 foundation

- [ ] Add media analysis.
- [ ] Add scene detection.
- [ ] Add frame sampling.
- [ ] Add face/person detection.
- [ ] Add negative-space analysis.
- [ ] Add semantic segment classification.
- [ ] Add multimodal director.
- [ ] Add director trace.
- [ ] Add Edit Plan V3 schema.

**Milestone:** Director decides scenes instead of only zoom events.

---

## Phase 2 — Scene/Layout Engine

- [ ] Scene renderer.
- [ ] TalkingHeadFull.
- [ ] TalkingHeadTypography.
- [ ] StatPip.
- [ ] SplitScreen.
- [ ] ScreenDemo.
- [ ] FullscreenBroll.
- [ ] ComparisonScene.
- [ ] Scene-level background system.

**Milestone:** A sentence can change the entire composition.

---

## Phase 3 — Reference Motion Language

- [ ] Animated counter.
- [ ] Currency/percentage animation.
- [ ] Background typography.
- [ ] Waveform.
- [ ] Callouts/arrows.
- [ ] Transition renderer.
- [ ] Glitch slice.
- [ ] Zoom cut.
- [ ] Blur/whip transitions.
- [ ] Freeze-frame support.

**Milestone:** Engine can reproduce the major visual mechanisms seen in the reference reel.

---

## Phase 4 — Tracking & Depth

- [ ] Subject tracking.
- [ ] Face-aware camera.
- [ ] Smart reframe generation.
- [ ] Subject segmentation.
- [ ] Depth-aware typography.
- [ ] Foreground/background graphics.
- [ ] Segmentation fallback.

**Milestone:** Text and graphics can exist naturally behind and in front of the speaker.

---

## Phase 5 — Screen Demo Intelligence

- [ ] Detect screen sections.
- [ ] Cursor tracking.
- [ ] ROI selection.
- [ ] UI saliency.
- [ ] Smooth crop timeline.
- [ ] PIP speaker mode.

**Milestone:** Screen explanation editing is intentional, not a generic zoom.

---

## Phase 6 — Audio & Color

- [ ] Voice loudness normalization.
- [ ] SFX director.
- [ ] Music beat analysis.
- [ ] Beat-aware optional timing.
- [ ] Technical color correction.
- [ ] Creative grade presets.
- [ ] Skin-tone protection.

---

## Phase 7 — Visual QC

- [ ] Frame sampling.
- [ ] Contact sheet.
- [ ] Face obstruction checks.
- [ ] Caption safe-zone checks.
- [ ] Overlay collision checks.
- [ ] Transition artifact checks.
- [ ] Semantic relevance checks.
- [ ] Automatic retry/replan for critical errors.

---

# 40. Priority Order

If development time is limited, implement in this order:

```text
1. P0 runtime fixes
2. Multimodal Director
3. Scene/Layout Engine
4. Motion Graphics Library
5. Transition Engine
6. Subject Tracking
7. Subject Segmentation / Depth
8. Screen Demo Director
9. Visual QC
10. Audio / Color polish
```

Do not spend the next development cycle adding many more caption themes before the Director and Scene Engine exist.

---

# 41. Definition of Done — V3

V3 is complete only when all of the following are true:

- [ ] Clean checkout runs end-to-end.
- [ ] No manual JSON editing is required for a normal reel.
- [ ] Director performs semantic segment classification.
- [ ] Director uses visual information, not transcript only.
- [ ] Director generates scene/layout changes.
- [ ] Renderer supports at least five scene layouts.
- [ ] Director can choose no effect when appropriate.
- [ ] Camera framing follows the subject.
- [ ] Captions avoid detected faces.
- [ ] Numeric statements can become animated statistic scenes.
- [ ] At least one depth composition supports typography behind subject.
- [ ] Glitch-slice transition is implemented.
- [ ] Hard cuts remain selectable.
- [ ] Screen-demo section can track/focus the relevant area.
- [ ] Audio ducking works.
- [ ] Voice loudness is normalized.
- [ ] Basic correction/grade is available.
- [ ] Technical QC passes.
- [ ] Visual QC checks sampled frames.
- [ ] Edit decisions are logged.
- [ ] Output no longer looks like “raw video + subtitles + rectangular overlay”.

---

# 42. Definition of Done — Reference-Quality Milestone

The reference-quality milestone is reached when the system can take a new raw video and, without a manually authored timeline:

1. create a high-energy layered opening,
2. intelligently change layouts when the meaning calls for it,
3. animate a numeric/statistical statement,
4. place typography behind a tracked subject,
5. integrate a named-person/object visual without defaulting to a pasted rectangle,
6. use at least one contextual specialty transition,
7. deliberately use hard cuts elsewhere,
8. follow a screen-demo region of interest,
9. reduce visual density during information-heavy sections,
10. maintain readable captions and safe composition throughout,
11. produce a result that feels intentionally edited rather than template-applied.

---

# 43. Non-Goals

The following are not required for the first V3 milestone:

- building a full nonlinear editor UI,
- replacing Remotion,
- training a custom foundation model,
- generating every graphic from scratch,
- adding hundreds of transitions,
- auto-posting to social platforms,
- copying the reference video's exact branding.

The focus is **editorial intelligence + compositional capability**.

---

# 44. Final Architectural Principle

The system should maintain a strict separation:

```text
Analysis decides what exists.
Director decides what should happen.
Edit Plan describes it.
Renderer executes it.
QC judges the result.
```

The renderer must not become the director.

The LLM must not generate arbitrary renderer code for every reel.

The final system should behave like a reusable AI editor with a visual grammar, not a one-off template.

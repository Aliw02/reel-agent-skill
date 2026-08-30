"""
AI Reel Editor — Master Pipeline Orchestrator (V3.0.0 Reference-Quality)
End-to-End Autonomous Pipeline:
1. Multimodal Media Probe & Audio Loudness Analysis (analyze_media.py)
2. Speech-Aware Silence Trimming (cut_silence.py)
3. Voice Loudness Normalization & Mastering (audio_processor.py)
4. Semantic Word-Level Whisper Transcription (transcribe.py)
5. Dialect & Caption Semantic Auditing (caption_audit.py)
6. Subject & Face Trajectory Tracking (track_subject.py)
7. Subject Segmentation & Depth Matting (segment_subject.py)
8. Scene & Visual Content Classification (scene_detect.py)
9. Multimodal AI Director Master Edit Planning (director.py -> edit_plan.json V3)
10. Pre-Render Deterministic Plan Validation (validate_plan.py)
11. Remotion Scene & Motion Compositor (1080x1920 60FPS)
12. Technical & Visual Quality Control (qc.py & qc_visual.py)
"""

import os
import sys
import json
import argparse
import subprocess
import shutil
from typing import Optional, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure scripts directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

# Route Hugging Face cache to Drive D (.temp/hf_cache) where there is plenty of disk space
HF_CACHE_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, ".temp", "hf_cache"))
os.makedirs(HF_CACHE_DIR, exist_ok=True)
os.environ["HF_HOME"] = HF_CACHE_DIR
os.environ["HUGGINGFACE_HUB_CACHE"] = HF_CACHE_DIR

from analyze_media import analyze_media
from cut_silence import cut_silence, get_video_duration
from audio_processor import normalize_voice_loudness
from transcribe import transcribe_video
from caption_audit import audit_and_correct_captions
from track_subject import track_subject
from segment_subject import segment_video_subject
from scene_detect import detect_scenes
from analyze_screen import analyze_screen_roi
from director import create_edit_plan_file
from validate_plan import validate_plan_file
from qc import run_quality_control

TEMP_DIR = ".temp"

def run_pipeline(
    input_video: str,
    output_video: str = "output/final_reel.mp4",
    title: Optional[str] = None,
    caption_theme: str = "box_glass",
    style_preset: str = "modern_tech",
    whisper_model: str = "turbo",
    whisper_device: str = "auto",
    language: str = "ar",
    silence_thresh_db: int = -30,
    fps: int = 60,
    enable_depth: bool = True,
    bgm_path: Optional[str] = None,
    skip_qc: bool = False,
    captions_path: Optional[str] = None,
    skip_transcribe: bool = False
) -> Dict[str, Any]:
    """
    Executes the autonomous Reel Agent V3 video production pipeline.
    """
    temp_dir = os.path.join(PROJECT_ROOT, ".temp")
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_video)), exist_ok=True)
    public_dir = os.path.join(PROJECT_ROOT, "public")
    os.makedirs(public_dir, exist_ok=True)
    
    media_analysis_json = os.path.join(temp_dir, "media_analysis.json")
    trimmed_video = os.path.join(temp_dir, "trimmed.mp4")
    mastered_video = os.path.join(temp_dir, "mastered.mp4")
    captions_json = captions_path if captions_path and os.path.exists(captions_path) else os.path.join(temp_dir, "captions.json")
    reviewed_captions_json = os.path.join(temp_dir, "captions_reviewed.json")
    tracking_json = os.path.join(temp_dir, "subject_track.json")
    scene_json = os.path.join(temp_dir, "scene_analysis.json")
    screen_roi_json = os.path.join(temp_dir, "screen_roi.json")
    cutout_video = os.path.join(temp_dir, "cutout.mp4")
    edit_plan_json = os.path.join(temp_dir, "edit_plan.json")
    director_trace_json = os.path.join(temp_dir, "director_trace.json")
    qc_report_json = os.path.join(temp_dir, "qc_report.json")
    contact_sheet_jpg = os.path.join(temp_dir, "visual_qc_contact_sheet.jpg")
    
    print("\n" + "=" * 70)
    print("🎬 [AI REEL DIRECTOR V3] Starting Reference-Quality Production Pipeline")
    print(f"📁 Input Video : {os.path.abspath(input_video)}")
    print(f"🎯 Output Target: {os.path.abspath(output_video)}")
    print(f"🎨 Theme & Grade: {caption_theme} | {style_preset}")
    print(f"⏱️ Target FPS   : {fps} fps")
    print("=" * 70)
    
    # -------------------------------------------------------------
    # Stage 1: Multimodal Media Probe
    # -------------------------------------------------------------
    print("\n🔍 [Stage 1/9] Probing media and audio characteristics...")
    media_analysis = analyze_media(input_video, output_json=media_analysis_json)
    
    # -------------------------------------------------------------
    # Stage 2: Silence Trimming & Audio Mastering
    # -------------------------------------------------------------
    print("\n✂️ [Stage 2/9] Trimming silence & mastering audio to -16 LUFS...")
    cut_silence(
        input_video=input_video,
        output_video=trimmed_video,
        silence_thresh_db=silence_thresh_db
    )
    normalize_voice_loudness(trimmed_video, mastered_video, target_i=-16.0)
    
    video_duration = get_video_duration(mastered_video)
    total_frames = int(video_duration * fps)
    print(f"⏱️ Active Duration: {video_duration:.2f}s ({total_frames} frames @ {fps}fps)")
    
    # Copy working video to public/ for Remotion HTTP access
    public_video = os.path.join(public_dir, "trimmed.mp4")
    shutil.copy2(mastered_video, public_video)

    # -------------------------------------------------------------
    # Stage 3: Whisper Semantic Transcription
    # -------------------------------------------------------------
    if captions_path and os.path.exists(captions_path):
        print(f"\n⏩ [Stage 3/9] Using pre-generated captions from '{captions_path}'...")
    elif skip_transcribe and os.path.exists(captions_json):
        print(f"\n⏩ [Stage 3/9] Skipping Whisper; reusing existing captions '{captions_json}'...")
    else:
        print("\n🎙️ [Stage 3/9] Transcribing word-level timestamps with Faster-Whisper...")
        transcribe_video(
            video_path=mastered_video,
            output_json=captions_json,
            model_size=whisper_model,
            device=whisper_device,
            language=language,
            fps=fps
        )

    # -------------------------------------------------------------
    # Stage 4: Caption & Dialect Audit
    # -------------------------------------------------------------
    print("\n🔍 [Stage 4/9] Auditing captions, Arabic dialect & semantic keywords...")
    with open(captions_json, "r", encoding="utf-8") as f:
        raw_captions = json.load(f)
    audited_captions = audit_and_correct_captions(raw_captions)
    with open(reviewed_captions_json, "w", encoding="utf-8") as f:
        json.dump(audited_captions, f, ensure_ascii=False, indent=2)

    # -------------------------------------------------------------
    # Stage 5: Vision Analysis (Subject Tracking, Segmentation, Scene Detect)
    # -------------------------------------------------------------
    print("\n👤 [Stage 5/9] Vision Analysis: Tracking face, segmenting subject & detecting scenes...")
    subject_tracking = track_subject(mastered_video, fps=fps, output_json=tracking_json)
    scene_analysis = detect_scenes(mastered_video, fps=fps, output_json=scene_json)
    screen_roi = analyze_screen_roi(mastered_video, fps=fps, output_json=screen_roi_json)
    
    if enable_depth:
        # Generate cutout foreground for depth typography behind speaker
        cutout_res = segment_video_subject(mastered_video, output_cutout_video=cutout_video, fps=fps)
        if cutout_res and os.path.exists(cutout_video):
            shutil.copy2(cutout_video, os.path.join(public_dir, "cutout.mp4"))

    # -------------------------------------------------------------
    # Stage 6: Multimodal AI Director Master Edit Planning
    # -------------------------------------------------------------
    print("\n🧠 [Stage 6/9] AI Director V3 synthesizing Scene-First edit plan & decisions trace...")
    edit_plan = create_edit_plan_file(
        transcript_json_path=reviewed_captions_json,
        output_edit_plan_path=edit_plan_json,
        media_analysis_path=media_analysis_json,
        scene_analysis_path=scene_json,
        subject_tracking_path=tracking_json,
        screen_roi_path=screen_roi_json,
        trace_output_path=director_trace_json,
        title=title,
        caption_theme=caption_theme,
        fps=fps
    )

    if bgm_path and os.path.exists(bgm_path):
        bgm_filename = os.path.basename(bgm_path)
        shutil.copy2(bgm_path, os.path.join(public_dir, bgm_filename))
        if "audio" not in edit_plan:
            edit_plan["audio"] = {}
        edit_plan["audio"]["bgmSrc"] = bgm_filename
        with open(edit_plan_json, "w", encoding="utf-8") as f:
            json.dump(edit_plan, f, ensure_ascii=False, indent=2)

    # -------------------------------------------------------------
    # Stage 7: Deterministic Plan Validation
    # -------------------------------------------------------------
    print("\n🛡️ [Stage 7/9] Pre-Render Plan Contract Validation...")
    plan_valid = validate_plan_file(edit_plan_json, project_root=PROJECT_ROOT)
    if not plan_valid:
        raise ValueError("Edit plan failed contract validation.")

    # -------------------------------------------------------------
    # Stage 8: Remotion High-Performance 9:16 Video Rendering
    # -------------------------------------------------------------
    print(f"\n🚀 [Stage 8/9] Rendering 1080x1920 {fps}FPS Reel with Remotion...")
    npx_bin = "npx.cmd" if sys.platform == "win32" else "npx"
    render_cmd = [
        npx_bin, "remotion", "render",
        "src/index.ts",
        "ReelComposition",
        os.path.abspath(output_video),
        f"--props={edit_plan_json}",
        "--gl=angle"
    ]
    
    try:
        subprocess.run(render_cmd, cwd=PROJECT_ROOT, check=True, shell=sys.platform == "win32")
    except Exception as e:
        print(f"❌ [Remotion] CLI render encountered an error: {e}")
        raise

    # -------------------------------------------------------------
    # Stage 9: Technical & Visual Quality Control
    # -------------------------------------------------------------
    qc_passed = True
    if not skip_qc:
        print("\n🔍 [Stage 9/9] Running Master Quality Control (QC) inspection...")
        qc_passed, qc_report = run_quality_control(
            video_path=output_video,
            edit_plan_path=edit_plan_json,
            expected_fps=fps,
            contact_sheet_path=contact_sheet_jpg
        )
        with open(qc_report_json, "w", encoding="utf-8") as f:
            json.dump(qc_report, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    if qc_passed:
        print("🎉 [SUCCESS] Reference-Quality AI Reel exported successfully!")
    else:
        print("⚠️ [COMPLETED WITH QC WARNINGS] Video exported, please review QC report.")
    print(f"🎬 Video Path   : {os.path.abspath(output_video)}")
    print(f"📋 Edit Plan    : {os.path.abspath(edit_plan_json)}")
    print(f"🧠 Director Log : {os.path.abspath(director_trace_json)}")
    print(f"🖼️ Contact Sheet: {os.path.abspath(contact_sheet_jpg)}")
    print("=" * 70 + "\n")

    return {
        "outputVideo": os.path.abspath(output_video),
        "editPlan": edit_plan,
        "qcPassed": qc_passed
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Reel Director Master Orchestrator V3")
    parser.add_argument("--input", required=True, help="Path to raw talking-head video")
    parser.add_argument("--output", default="output/final_reel.mp4", help="Path for rendered reel")
    parser.add_argument("--title", help="Custom video hook title banner")
    parser.add_argument("--theme", default="box_glass", choices=["box_glass", "neon", "bold_yellow", "clean_white", "cyber"], help="Caption styling theme")
    parser.add_argument("--style", default="modern_tech", choices=["modern_tech", "warm_creator", "clean_creator", "cinematic_soft", "high_energy_social", "none"], help="Color & grade style preset")
    parser.add_argument("--whisper-model", default="turbo", help="Whisper model (base, small, medium, large-v3, turbo)")
    parser.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"], help="Whisper inference device")
    parser.add_argument("--lang", default="ar", help="Speech language (ar, en, auto)")
    parser.add_argument("--fps", type=int, default=60, help="Output frame rate (e.g. 30 or 60)")
    parser.add_argument("--bgm", help="Optional path to background music MP3/WAV")
    parser.add_argument("--silence-thresh", type=int, default=-30, help="Silence threshold dB")
    parser.add_argument("--captions", help="Path to pre-generated captions.json (skips Whisper transcription)")
    parser.add_argument("--skip-transcribe", action="store_true", help="Skip Whisper and reuse existing .temp/captions.json")
    parser.add_argument("--no-depth", action="store_true", help="Disable subject depth segmentation")
    parser.add_argument("--skip-qc", action="store_true", help="Skip post-render QC validator")
    
    args = parser.parse_args()
    
    run_pipeline(
        input_video=args.input,
        output_video=args.output,
        title=args.title,
        caption_theme=args.theme,
        style_preset=args.style,
        whisper_model=args.whisper_model,
        whisper_device=args.device,
        language=args.lang,
        fps=args.fps,
        enable_depth=not args.no_depth,
        bgm_path=args.bgm,
        silence_thresh_db=args.silence_thresh,
        skip_qc=args.skip_qc,
        captions_path=args.captions,
        skip_transcribe=args.skip_transcribe
    )

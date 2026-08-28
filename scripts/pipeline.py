"""
AI Reel Editor — Master Pipeline Orchestrator (v2.0.0)
End-to-End Autonomous Pipeline:
1. Speech-Aware Silence Trimming (cut_silence.py)
2. Semantic Word-Level Whisper Transcription (transcribe.py)
3. AI Director Edit Planning (director.py -> edit_plan.json)
4. Dynamic 1080x1920 Remotion Render
5. Post-Render Quality Control (qc.py)
"""

import os
import sys
import json
import argparse
import subprocess
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

from cut_silence import cut_silence, get_video_duration
from transcribe import transcribe_video
from director import create_edit_plan_file
from qc import run_quality_control

TEMP_DIR = ".temp"

def run_pipeline(
    input_video: str,
    output_video: str = "output/final_reel.mp4",
    title: Optional[str] = None,
    caption_theme: str = "box_glass",
    whisper_model: str = "turbo",
    whisper_device: str = "auto",
    language: str = "ar",
    silence_thresh_db: int = -30,
    fps: int = 60,
    enable_hook: bool = True,
    enable_zooms: bool = True,
    enable_overlays: bool = True,
    bgm_path: Optional[str] = None,
    skip_qc: bool = False
) -> Dict[str, Any]:
    """
    Executes the full automated AI Reel editing pipeline.
    """
    temp_dir = os.path.join(PROJECT_ROOT, ".temp")
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_video)), exist_ok=True)
    
    trimmed_video = os.path.join(temp_dir, "trimmed.mp4")
    captions_json = os.path.join(temp_dir, "captions.json")
    edit_plan_json = os.path.join(temp_dir, "edit_plan.json")
    qc_report_json = os.path.join(temp_dir, "qc_report.json")
    
    print("\n" + "=" * 65)
    print("🎬 [AI REEL EDITOR] Starting Autonomous Video Production Pipeline")
    print(f"📁 Input Video : {os.path.abspath(input_video)}")
    print(f"🎯 Output Target: {os.path.abspath(output_video)}")
    print(f"🎨 Caption Theme: {caption_theme}")
    print(f"🎙️ Whisper Model: {whisper_model} ({language})")
    print("=" * 65)
    
    # -------------------------------------------------------------
    # Stage 1: Speech-Aware Silence Trimming
    # -------------------------------------------------------------
    print("\n✂️ [Stage 1/5] Cutting dead air and audio silences...")
    cut_silence(
        input_video=input_video,
        output_video=trimmed_video,
        silence_thresh_db=silence_thresh_db
    )
    
    video_duration = get_video_duration(trimmed_video)
    total_frames = int(video_duration * fps)
    print(f"⏱️ Trimmed Duration: {video_duration:.2f}s ({total_frames} frames @ {fps}fps)")
    
    # -------------------------------------------------------------
    # Stage 2: Kinetic Subtitle Transcription
    # -------------------------------------------------------------
    print("\n🎙️ [Stage 2/6] Transcribing word-level timestamps with Whisper...")
    subs_data = transcribe_video(
        video_path=trimmed_video,
        output_json=captions_json,
        model_size=whisper_model,
        device=whisper_device,
        language=language,
        fps=fps
    )
    
    # -------------------------------------------------------------
    # Stage 3: LLM / Agent Caption Review & Dialect Audit (Pre-Generation)
    # -------------------------------------------------------------
    print("\n🔍 [Stage 3/6] LLM / AI Director reviewing captions & dialect accuracy...")
    from director import audit_and_correct_captions
    with open(captions_json, "r", encoding="utf-8") as f:
        raw_captions = json.load(f)
        
    audited_captions = audit_and_correct_captions(raw_captions)
    reviewed_captions_json = os.path.join(TEMP_DIR, "captions_reviewed.json")
    with open(reviewed_captions_json, "w", encoding="utf-8") as f:
        json.dump(audited_captions, f, ensure_ascii=False, indent=2)
    print(f"✨ [AI Audit] Audited and verified subtitles saved -> {reviewed_captions_json}")

    # -------------------------------------------------------------
    # Stage 4: AI Director Master Edit Planning
    # -------------------------------------------------------------
    print("\n🧠 [Stage 4/6] AI Director analyzing pacing, hooks, zooms & overlays...")
    edit_plan = create_edit_plan_file(
        transcript_json_path=reviewed_captions_json,
        output_edit_plan_path=edit_plan_json,
        title=title,
        caption_theme=caption_theme,
        fps=fps
    )
    
    # Copy video & assets to public/ for Remotion staticFile HTTP resolution
    public_dir = os.path.join(PROJECT_ROOT, "public")
    os.makedirs(public_dir, exist_ok=True)
    public_video = os.path.join(public_dir, "trimmed.mp4")
    import shutil
    shutil.copy2(trimmed_video, public_video)
    
    edit_plan["videoSrc"] = "trimmed.mp4"
    if bgm_path and os.path.exists(bgm_path):
        bgm_filename = os.path.basename(bgm_path)
        shutil.copy2(bgm_path, os.path.join(public_dir, bgm_filename))
        if "audio" not in edit_plan:
            edit_plan["audio"] = {}
        edit_plan["audio"]["bgmSrc"] = bgm_filename
        
    with open(edit_plan_json, "w", encoding="utf-8") as f:
        json.dump(edit_plan, f, ensure_ascii=False, indent=2)
        
    # -------------------------------------------------------------
    # Stage 5: Remotion High-Performance 9:16 Video Rendering
    # -------------------------------------------------------------
    print("\n🚀 [Stage 5/6] Rendering 1080x1920 60FPS Video with Remotion...")
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
        print("💡 You can live-preview and debug using: 'npm start'")
        raise
        
    # -------------------------------------------------------------
    # Stage 6: Post-Render Quality Control (QC Validator)
    # -------------------------------------------------------------
    qc_passed = True
    if not skip_qc:
        print("\n🔍 [Stage 6/6] Running automated Quality Control (QC) inspection...")
        qc_passed, qc_report = run_quality_control(
            video_path=output_video,
            edit_plan_path=edit_plan_json
        )
        with open(qc_report_json, "w", encoding="utf-8") as f:
            json.dump(qc_report, f, ensure_ascii=False, indent=2)
            
    print("\n" + "=" * 65)
    if qc_passed:
        print("🎉 [SUCCESS] Professional AI Reel exported successfully!")
    else:
        print("⚠️ [COMPLETED WITH QC WARNINGS] Video exported, please review QC report.")
    print(f"🎬 Video Path : {os.path.abspath(output_video)}")
    print(f"📋 Edit Plan  : {os.path.abspath(edit_plan_json)}")
    print("=" * 65 + "\n")
    
    return {
        "outputVideo": os.path.abspath(output_video),
        "editPlan": edit_plan,
        "qcPassed": qc_passed
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Reel Editor Master Orchestrator")
    parser.add_argument("--input", required=True, help="Path to raw talking-head video")
    parser.add_argument("--output", default="output/final_reel.mp4", help="Path for rendered reel")
    parser.add_argument("--title", help="Custom video hook title banner")
    parser.add_argument("--theme", default="box_glass", choices=["box_glass", "neon", "bold_yellow", "clean_white", "cyber"], help="Caption styling theme")
    parser.add_argument("--whisper-model", default="turbo", help="Whisper model (base, small, medium, large-v3, turbo)")
    parser.add_argument("--lang", default="ar", help="Speech language (ar, en, auto)")
    parser.add_argument("--bgm", help="Optional path to background music MP3/WAV")
    parser.add_argument("--silence-thresh", type=int, default=-30, help="Silence threshold dB")
    parser.add_argument("--fps", type=int, default=60, help="Video frame rate (30 or 60)")
    parser.add_argument("--skip-qc", action="store_true", help="Skip post-render QC validator")
    
    args = parser.parse_args()
    
    run_pipeline(
        input_video=args.input,
        output_video=args.output,
        title=args.title,
        caption_theme=args.theme,
        whisper_model=args.whisper_model,
        language=args.lang,
        bgm_path=args.bgm,
        silence_thresh_db=args.silence_thresh,
        fps=args.fps,
        skip_qc=args.skip_qc
    )

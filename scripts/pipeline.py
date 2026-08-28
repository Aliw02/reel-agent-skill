"""
Master Reel Editing Pipeline Orchestrator
Executes: Silence Removal -> Kinetic Transcription -> Remotion Render -> Final 9:16 Video
"""

import os
import sys
import json
import argparse
import subprocess

def run_pipeline(
    input_video,
    output_video,
    title="فيديو جديد",
    card_text=None,
    card_start_sec=3.0,
    card_duration_sec=4.0,
    highlight_color="#FFE600",
    whisper_model="base",
    fps=60
):
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    temp_dir = os.path.join(project_root, ".temp")
    os.makedirs(temp_dir, exist_ok=True)
    os.makedirs(os.path.dirname(os.path.abspath(output_video)), exist_ok=True)
    
    trimmed_video = os.path.join(temp_dir, "trimmed.mp4")
    captions_json = os.path.join(temp_dir, "captions.json")
    props_json = os.path.join(temp_dir, "props.json")
    
    print("==================================================")
    print("🚀 [Reel Agent Skill] Starting Video Processing")
    print(f"📁 Input: {input_video}")
    print(f"🎯 Output: {output_video}")
    print("==================================================")
    
    # 1. Cut Silence
    print("\n[Step 1/3] Cutting dead air and silences...")
    from cut_silence import cut_silence, get_video_duration
    cut_silence(input_video, trimmed_video)
    
    total_duration = get_video_duration(trimmed_video)
    total_frames = int(total_duration * fps)
    
    # 2. Transcribe Subtitles
    print("\n[Step 2/3] Extracting kinetic subtitles with Whisper...")
    from transcribe import transcribe_video
    subs_data = transcribe_video(trimmed_video, captions_json, model_size=whisper_model, fps=fps)
    
    # 3. Generate Remotion Input Props
    remotion_props = {
        "videoSrc": os.path.abspath(trimmed_video),
        "durationInFrames": total_frames,
        "fps": fps,
        "title": title,
        "highlightColor": highlight_color,
        "subtitles": subs_data["subtitles"],
        "infoCard": {
            "enabled": bool(card_text),
            "text": card_text or "",
            "startFrame": int(card_start_sec * fps),
            "durationInFrames": int(card_duration_sec * fps)
        }
    }
    
    with open(props_json, "w", encoding="utf-8") as f:
        json.dump(remotion_props, f, ensure_ascii=False, indent=2)
        
    # 4. Render with Remotion
    print("\n[Step 3/3] Rendering 1080x1920 60FPS Video with Remotion...")
    render_cmd = [
        "npx", "remotion", "render",
        "src/index.ts",
        "ReelComposition",
        os.path.abspath(output_video),
        f"--props={props_json}",
        f"--gl=angle"
    ]
    
    try:
        subprocess.run(render_cmd, cwd=project_root, check=True)
        print("\n==================================================")
        print(f"🎉 [SUCCESS] Reel created successfully!")
        print(f"🎬 Video location: {os.path.abspath(output_video)}")
        print("==================================================")
    except Exception as e:
        print(f"⚠️ Remotion CLI render error: {e}")
        print("💡 Note: You can preview the video live using: 'npm start'")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Reel Editor Master Pipeline")
    parser.add_argument("--input", required=True, help="Path to raw video")
    parser.add_argument("--output", default="output/final_reel.mp4", help="Path to output video")
    parser.add_argument("--title", default="شرح احترافي", help="Video Title")
    parser.add_argument("--card-text", help="Text for pop-up explanation card")
    parser.add_argument("--card-start", type=float, default=3.0, help="Start time in seconds for info card")
    parser.add_argument("--card-duration", type=float, default=4.0, help="Duration in seconds for info card")
    parser.add_argument("--highlight-color", default="#FFE600", help="Hex color for subtitle highlights")
    parser.add_argument("--whisper-model", default="base", help="Whisper model size (base, small, medium)")
    
    args = parser.parse_args()
    
    run_pipeline(
        input_video=args.input,
        output_video=args.output,
        title=args.title,
        card_text=args.card_text,
        card_start_sec=args.card_start,
        card_duration_sec=args.card_duration,
        highlight_color=args.highlight_color,
        whisper_model=args.whisper_model
    )

"""
AI Director / Edit Planner Module
Dynamic, non-hardcoded editor engine.
Analyzes speech timing, duration variance, and acoustic rhythm to synthesize edit_plan.json.
Enables AI Agents and Creators to direct cuts, hooks, kinetic typography, zooms, and overlays dynamically.
"""

import os
import sys
import json
import re
import argparse
from typing import Dict, List, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def clean_token(word: str) -> str:
    """Normalize text token for comparison."""
    return re.sub(r'[^\w\s]', '', word.strip().lower())

def is_dynamic_emphasis(word_item: Dict[str, Any], avg_word_duration: float = 0.35) -> bool:
    """
    Dynamically detect vocal emphasis based on acoustic timing.
    Words held significantly longer than average speech cadence or containing numbers
    naturally indicate speaker emphasis without hardcoded wordlists.
    """
    start = word_item.get("start", 0.0)
    end = word_item.get("end", 0.0)
    duration = end - start
    word = word_item.get("word", "")
    
    # Numbers and percentages are always salient
    if any(c.isdigit() for c in word):
        return True
        
    # Words elongated in speech (> 1.4x average duration)
    if duration > (avg_word_duration * 1.4) and len(word) > 2:
        return True
        
    return False

def analyze_transcript_and_plan(
    transcript_data: Dict[str, Any],
    custom_title: Optional[str] = None,
    caption_theme: str = "box_glass",
    enable_hook: bool = True,
    enable_zooms: bool = True,
    enable_overlays: bool = True,
    fps: int = 60
) -> Dict[str, Any]:
    """
    Autonomous AI Director Engine.
    Processes transcription chunks and compiles an intelligent, dynamic edit plan.
    """
    subtitles = transcript_data.get("subtitles", [])
    total_duration = transcript_data.get("duration", 0.0)
    total_frames = int(total_duration * fps) if total_duration > 0 else 750
    
    # Calculate average word duration for dynamic acoustic emphasis
    all_durations = [
        (w.get("end", 0.0) - w.get("start", 0.0))
        for chunk in subtitles
        for w in chunk.get("words", [])
        if (w.get("end", 0.0) - w.get("start", 0.0)) > 0
    ]
    avg_duration = sum(all_durations) / len(all_durations) if all_durations else 0.35
    
    enhanced_subtitles = []
    emphasis_events = []
    
    for chunk in subtitles:
        chunk_text = chunk.get("text", "")
        chunk_words = chunk.get("words", [])
        
        enhanced_words = []
        chunk_has_emphasis = False
        
        for w in chunk_words:
            raw_w = w.get("word", "")
            is_highlight = w.get("highlight", False) or is_dynamic_emphasis(w, avg_duration)
            
            if is_highlight:
                chunk_has_emphasis = True
                
            start_f = w.get("startFrame", int(w.get("start", 0.0) * fps))
            end_f = w.get("endFrame", int(w.get("end", 0.0) * fps))
            
            enhanced_words.append({
                "word": raw_w,
                "start": w.get("start", 0.0),
                "end": w.get("end", 0.0),
                "startFrame": start_f,
                "endFrame": end_f,
                "highlight": is_highlight
            })
            
        start_f = chunk.get("startFrame", int(chunk.get("start", 0.0) * fps))
        end_f = chunk.get("endFrame", int(chunk.get("end", 0.0) * fps))
        
        if chunk_has_emphasis:
            emphasis_events.append({"startFrame": start_f, "endFrame": end_f, "text": chunk_text})
            
        enhanced_subtitles.append({
            "id": chunk.get("id", len(enhanced_subtitles)),
            "start": chunk.get("start", 0.0),
            "end": chunk.get("end", 0.0),
            "startFrame": start_f,
            "endFrame": end_f,
            "text": chunk_text,
            "highlight": chunk_has_emphasis,
            "words": enhanced_words
        })

    # Hook Strategy
    hook_title = custom_title or (subtitles[0].get("text", "Video") if subtitles else "Reel")
    hook_config = {
        "title": hook_title,
        "subtitle": "AI Post-Production",
        "durationFrames": min(120, int(total_frames * 0.2))
    } if enable_hook else None

    # Punch-in Zooms Strategy (Triggered on emphasis moments)
    zoom_events = []
    if enable_zooms and emphasis_events:
        for idx, emp in enumerate(emphasis_events[:4]):
            zoom_events.append({
                "id": idx + 1,
                "startFrame": max(0, emp["startFrame"] - 5),
                "endFrame": emp["endFrame"] + 10,
                "scale": 1.18 if idx % 2 == 0 else 1.12,
                "originX": "50%",
                "originY": "38%",
                "ease": "spring"
            })

    # Caption Style
    caption_style = {
        "theme": caption_theme,
        "preset": caption_theme,
        "fontFamily": "Tajawal, Cairo, sans-serif",
        "fontSize": 70,
        "highlightColor": "#FFE600",
        "position": "bottom",
        "showHighlight": True,
        "animation": "bounce"
    }

    # Audio Ducking Configuration
    audio_config = {
        "bgmSrc": None,
        "bgmVolume": 0.15,
        "duckedVolume": 0.04,
        "duckingEnabled": True
    }

    # Progress Bar
    progress_bar = {
        "enabled": True,
        "gradientColors": ["#FFE600", "#00FFCC", "#FF007A"],
        "height": 8,
        "position": "top"
    }

    # Assemble Unified Edit Plan
    edit_plan = {
        "version": "2.0.0",
        "durationInFrames": total_frames,
        "totalFrames": total_frames,
        "fps": fps,
        "title": hook_title,
        "hook": hook_config,
        "captionStyle": caption_style,
        "subtitles": enhanced_subtitles,
        "zoomEvents": zoom_events,
        "overlays": transcript_data.get("overlays", []),
        "mediaOverlays": transcript_data.get("mediaOverlays", []),
        "audio": audio_config,
        "progressBar": progress_bar
    }

    return edit_plan

def create_edit_plan_file(
    transcript_json_path: str,
    output_edit_plan_path: str,
    title: Optional[str] = None,
    caption_theme: str = "box_glass",
    fps: int = 60
) -> Dict[str, Any]:
    with open(transcript_json_path, "r", encoding="utf-8") as f:
        transcript_data = json.load(f)

    edit_plan = analyze_transcript_and_plan(
        transcript_data=transcript_data,
        custom_title=title,
        caption_theme=caption_theme,
        fps=fps
    )

    os.makedirs(os.path.dirname(os.path.abspath(output_edit_plan_path)), exist_ok=True)
    with open(output_edit_plan_path, "w", encoding="utf-8") as f:
        json.dump(edit_plan, f, ensure_ascii=False, indent=2)

    return edit_plan

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Director Edit Planner")
    parser.add_argument("--transcript", required=True, help="Path to captions.json")
    parser.add_argument("--output", default=".temp/edit_plan.json", help="Path to output edit_plan.json")
    parser.add_argument("--title", help="Custom hook title banner")
    parser.add_argument("--theme", default="box_glass", help="Caption theme")
    parser.add_argument("--fps", type=int, default=60, help="Frame rate")

    args = parser.parse_args()

    plan = create_edit_plan_file(
        transcript_json_path=args.transcript,
        output_edit_plan_path=args.output,
        title=args.title,
        caption_theme=args.theme,
        fps=args.fps
    )
    print(f"🎬 [AI Director] Synthesized dynamic edit plan -> {args.output}")

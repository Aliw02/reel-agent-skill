"""
AI Director V3 — Multimodal AI Video Director
Semantic, Content-Aware Master Editor:
- Classifies spoken segments by semantic intent (hook, statistic, screen_demo, comparison, explanation)
- Synthesizes Scene-First architecture (TalkingHeadTypography, StatPip, ScreenDemo, ComparisonScene)
- Generates contextual camera movement, depth layering behind speaker, animated counters, and transitions
- Logs every creative decision with machine-readable reasons into director_trace.json
- Exports validated edit_plan.json
"""

import os
import sys
import json
import re
import argparse
from typing import Dict, List, Any, Optional, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from caption_audit import audit_and_correct_captions

def extract_numeric_value(text: str) -> Optional[Dict[str, Any]]:
    """Extracts numeric values, currency, and percentages for animated counters."""
    # Find numbers like 100, 50%, $20, 10x, 2.5
    match = re.search(r'([$€£]?)\s*([\d\.,]+)\s*([%xXkKMم|ضعف|ألف|مليون|دولار|دينار]*)', text)
    if match:
        prefix = match.group(1) or ""
        num_str = match.group(2).replace(',', '')
        suffix = match.group(3) or ""
        try:
            val = float(num_str)
            # Format suffix nicely
            if "دولار" in text and not prefix:
                prefix = "$"
            elif "بالمئة" in text or "%" in text:
                suffix = "%"
            elif "ضعف" in text:
                suffix = "x"
                
            return {
                "startVal": 0,
                "endVal": val,
                "prefix": prefix,
                "suffix": suffix,
                "decimals": 1 if '.' in num_str else 0,
                "beforeVal": f"{prefix}{int(val * 0.4)}{suffix}" if val > 10 else None
            }
        except ValueError:
            pass
    return None

def extract_hook_keyword(subtitles: List[Dict[str, Any]]) -> str:
    """Extracts a punchy 1-3 word hook headline for background typography."""
    if not subtitles:
        return "AI REEL"
        
    first_chunk = subtitles[0]
    words = first_chunk.get("words", [])
    highlighted = [w.get("word", "") for w in words if w.get("highlight")]
    if highlighted:
        return " ".join(highlighted[:2])
    return first_chunk.get("text", "").split()[:3] and " ".join(first_chunk.get("text", "").split()[:3]) or "AI REEL"

def create_multimodal_edit_plan(
    transcript_data: Dict[str, Any],
    media_analysis: Optional[Dict[str, Any]] = None,
    scene_analysis: Optional[Dict[str, Any]] = None,
    subject_tracking: Optional[Dict[str, Any]] = None,
    screen_roi: Optional[Dict[str, Any]] = None,
    custom_title: Optional[str] = None,
    caption_theme: str = "box_glass",
    style_preset: str = "modern_tech",
    fps: int = 60,
    enable_hook: bool = True,
    enable_depth: bool = True
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
    """
    Multimodal AI Director Engine.
    Combines transcript semantics, visual scenes, face tracking, and audio metrics
    into a structured scene-first edit plan.
    """
    # 1. Ensure transcript is audited
    if not transcript_data.get("audited"):
        transcript_data = audit_and_correct_captions(transcript_data)
        
    subtitles = transcript_data.get("subtitles", [])
    total_duration = transcript_data.get("duration", 0.0)
    if media_analysis and media_analysis.get("video", {}).get("duration", 0) > 0:
        total_duration = media_analysis["video"]["duration"]
        
    total_frames = int(total_duration * fps) if total_duration > 0 else 750
    if media_analysis and media_analysis.get("video", {}).get("totalFrames", 0) > 0:
        total_frames = media_analysis["video"]["totalFrames"]

    scenes: List[Dict[str, Any]] = []
    director_trace: List[Dict[str, Any]] = []
    transitions: List[Dict[str, Any]] = []
    zoom_events: List[Dict[str, Any]] = []
    overlays: List[Dict[str, Any]] = []
    callouts: List[Dict[str, Any]] = []

    # Safe negative zone from face tracking
    avg_face_center = subject_tracking.get("averageFaceCenter", [0.5, 0.38]) if subject_tracking else [0.5, 0.38]

    # 2. SEMANTIC SCENE PLANNING & CLASSIFICATION
    # Segment transcript chunks into continuous narrative scenes
    current_scene_chunks = []
    current_scene_intent = "setup"
    
    # Process hook intro (first 3-4 seconds / 120-180 frames)
    hook_end_frame = min(int(fps * 3.5), max(120, int(total_frames * 0.22)))
    hook_title_text = custom_title or (subtitles[0]["text"] if subtitles else "ذكاء اصطناعي")
    hook_keyword = extract_hook_keyword(subtitles)

    # Scene 1: High-Energy Dynamic Punch-in Hook Intro
    scenes.append({
        "id": "scene_001_hook",
        "startFrame": 0,
        "endFrame": hook_end_frame,
        "durationInFrames": hook_end_frame,
        "layout": "talking_head_full",
        "intent": "hook",
        "energy": "high",
        "transitionIn": "hard_cut",
        "transitionOut": "zoom_cut",
        "cameraScale": 1.15,
        "focalPoint": avg_face_center,
        "reason": "Dynamic punch-in zoom on speaker face to instantly capture viewer attention"
    })
    
    transitions.append({
        "type": "zoom_cut",
        "startFrame": max(0, hook_end_frame - 6),
        "durationInFrames": 8,
        "intensity": 0.5
    })
    
    director_trace.append({
        "sceneId": "scene_001_hook",
        "startFrame": 0,
        "endFrame": hook_end_frame,
        "layout": "talking_head_full",
        "intent": "hook",
        "reason": "Opening segment classified as Hook -> Applied dynamic punch-in zoom (1.15x)",
        "confidence": 0.98
    })

    # Build subsequent scenes based on subtitle chunks and visual cues
    last_frame = hook_end_frame
    scene_counter = 2
    
    # Group remaining subtitle chunks
    remaining_chunks = [c for c in subtitles if c.get("startFrame", 0) >= hook_end_frame - 15]
    if not remaining_chunks and subtitles:
        remaining_chunks = subtitles[1:]

    chunk_idx = 0
    while chunk_idx < len(remaining_chunks):
        chunk = remaining_chunks[chunk_idx]
        chunk_start = max(last_frame, chunk.get("startFrame", last_frame))
        chunk_text = chunk.get("text", "")
        
        # Look ahead to group 1-3 chunks for coherent scene length (typically 2-4 seconds)
        grouped_chunks = [chunk]
        group_end = chunk.get("endFrame", chunk_start + int(fps * 2.5))
        
        while chunk_idx + 1 < len(remaining_chunks):
            next_chunk = remaining_chunks[chunk_idx + 1]
            if (next_chunk.get("endFrame", 0) - chunk_start) <= int(fps * 4.5):
                grouped_chunks.append(next_chunk)
                group_end = next_chunk.get("endFrame", group_end)
                chunk_idx += 1
            else:
                break
                
        chunk_idx += 1
        scene_text = " ".join(c.get("text", "") for c in grouped_chunks)
        has_numeric = any(c.get("hasNumeric") for c in grouped_chunks)
        has_comparison = any(w in scene_text for w in ["مقارنة", "الفرق", "قبل", "بعد", "بدل", "أفضل من", "أرخص"])
        is_screen_demo = False
        
        # Check visual scene detection if available
        if scene_analysis:
            for s_item in scene_analysis.get("scenes", []):
                if s_item.get("type") == "screen_demo" and not (s_item["endFrame"] < chunk_start or s_item["startFrame"] > group_end):
                    is_screen_demo = True
                    break
                    
        # Classify Scene Intent & Layout
        scene_id = f"scene_{scene_counter:03d}"
        if has_numeric:
            intent = "statistic"
            layout = "stat_pip"
            num_data = extract_numeric_value(scene_text) or {
                "startVal": 0, "endVal": 100, "suffix": "%", "title": "معدل الإنجاز"
            }
            counter_config = {
                "startVal": num_data.get("startVal", 0),
                "endVal": num_data.get("endVal", 100),
                "prefix": num_data.get("prefix", ""),
                "suffix": num_data.get("suffix", ""),
                "decimals": num_data.get("decimals", 0),
                "beforeVal": num_data.get("beforeVal"),
                "title": grouped_chunks[0]["words"][0]["word"] if grouped_chunks[0].get("words") else "إحصائية",
                "subtitle": "تحليل الأرقام المذكورة",
                "durationInFrames": int(fps * 1.5)
            }
            reason = "Spoken sentence introduces numeric metric / statistics -> Transformed into Stat PIP scene with animated counter"
            trans_in = "zoom_cut"
            trans_out = "hard_cut"
            
            scenes.append({
                "id": scene_id,
                "startFrame": chunk_start,
                "endFrame": group_end,
                "durationInFrames": group_end - chunk_start,
                "layout": layout,
                "intent": intent,
                "energy": "high",
                "transitionIn": trans_in,
                "transitionOut": trans_out,
                "animatedCounter": counter_config,
                "reason": reason
            })
            
        elif is_screen_demo:
            intent = "screen_demo"
            layout = "screen_demo"
            reason = "Visual detector and narrative indicate screen demonstration -> Focused crop on UI interaction"
            trans_in = "blur_wipe"
            trans_out = "hard_cut"
            
            roi_box = [0.10, 0.15, 0.80, 0.70]
            if screen_roi and screen_roi.get("roiEvents"):
                roi_box = screen_roi["roiEvents"][0]["roiBox"]
                
            scenes.append({
                "id": scene_id,
                "startFrame": chunk_start,
                "endFrame": group_end,
                "durationInFrames": group_end - chunk_start,
                "layout": layout,
                "intent": intent,
                "energy": "medium",
                "transitionIn": trans_in,
                "transitionOut": trans_out,
                "screenRoi": {
                    "startFrame": chunk_start,
                    "durationInFrames": group_end - chunk_start,
                    "roiBox": roi_box,
                    "zoomLevel": 1.65,
                    "label": "تفاصيل الواجهة"
                },
                "reason": reason
            })
            
        elif has_comparison:
            intent = "comparison"
            layout = "comparison_scene"
            reason = "Spoken sentence makes a direct comparison / before-after claim -> Split comparison layout"
            trans_in = "zoom_cut"
            trans_out = "hard_cut"
            
            scenes.append({
                "id": scene_id,
                "startFrame": chunk_start,
                "endFrame": group_end,
                "durationInFrames": group_end - chunk_start,
                "layout": layout,
                "intent": intent,
                "energy": "high",
                "transitionIn": trans_in,
                "transitionOut": trans_out,
                "comparisonData": {
                    "itemA": {"title": "الطريقة التقليدية", "subtitle": "يدوي وبطيء", "value": "⏳ 4 ساعات"},
                    "itemB": {"title": "مع الذكاء الاصطناعي", "subtitle": "تلقائي وفوري", "value": "⚡ 30 ثانية"}
                },
                "reason": reason
            })
            
        else:
            intent = "explanation"
            layout = "talking_head_full"
            reason = "Core narrative explanation -> Restrained talking-head with subtle face-centered camera tracking"
            trans_in = "hard_cut"
            trans_out = "hard_cut"
            
            # Add dynamic punch-in zoom on emphasized chunk
            if any(c.get("emphasisLevel") in ["high", "punchline"] for c in grouped_chunks):
                zoom_events.append({
                    "id": f"zoom_{scene_counter}",
                    "startFrame": chunk_start,
                    "endFrame": min(group_end, chunk_start + 60),
                    "scale": 1.15,
                    "originX": "50%",
                    "originY": f"{int(avg_face_center[1] * 100)}%",
                    "type": "punch_in"
                })
                
            scenes.append({
                "id": scene_id,
                "startFrame": chunk_start,
                "endFrame": group_end,
                "durationInFrames": group_end - chunk_start,
                "layout": layout,
                "intent": intent,
                "energy": "medium",
                "transitionIn": trans_in,
                "transitionOut": trans_out,
                "cameraScale": 1.0,
                "focalPoint": avg_face_center,
                "reason": reason
            })

        director_trace.append({
            "sceneId": scene_id,
            "startFrame": chunk_start,
            "endFrame": group_end,
            "layout": layout,
            "intent": intent,
            "text": scene_text[:50] + ("..." if len(scene_text) > 50 else ""),
            "reason": reason,
            "confidence": 0.92
        })
        
        last_frame = group_end
        scene_counter += 1

    # Ensure last scene reaches total_frames
    if scenes and scenes[-1]["endFrame"] < total_frames:
        scenes[-1]["endFrame"] = total_frames
        scenes[-1]["durationInFrames"] = total_frames - scenes[-1]["startFrame"]

    # 3. MOTION GRAPHICS & OVERLAYS
    # Add waveform & progress bar
    waveform_config = {
        "enabled": False,
        "color": "#00FFCC",
        "barsCount": 20,
        "position": "bottom"
    }

    progress_bar = {
        "enabled": True,
        "gradientColors": ["#FFE600", "#00FFCC", "#FF007A"],
        "height": 6,
        "position": "top"
    }

    # Audio Mastering & Ducking Config
    audio_config = {
        "bgmSrc": None,
        "bgmVolume": 0.14,
        "duckingVolume": 0.035,
        "duckingEnabled": True,
        "normalizedLoudnessLufs": -16.0
    }

    # Style preset & Color grading
    color_config = {
        "preset": style_preset,
        "contrast": 1.05,
        "saturation": 1.08,
        "vignette": True,
        "vignetteIntensity": 0.35
    }

    caption_style = {
        "theme": caption_theme,
        "fontFamily": "'Tajawal', 'Cairo', 'Readex Pro', sans-serif",
        "fontSize": 54,
        "highlightColor": "#FFE600",
        "activeWordColor": "#00FFCC",
        "inactiveWordColor": "#FFFFFF",
        "positionBottom": 240,
        "direction": "rtl",
        "uppercase": False,
        "animation": "bounce"
    }

    hook_config = {
        "enabled": enable_hook,
        "title": hook_title_text,
        "subtitle": "AI Post-Production",
        "durationInFrames": hook_end_frame
    }

    # Build Unified V3 Edit Plan
    edit_plan = {
        "version": "3.0.0",
        "videoSrc": "trimmed.mp4",
        "cutoutVideoSrc": "cutout.mp4" if enable_depth else None,
        "durationInFrames": total_frames,
        "totalFrames": total_frames,
        "fps": fps,
        "title": hook_title_text,
        "hook": hook_config,
        "captionStyle": caption_style,
        "subtitles": subtitles,
        "scenes": scenes,
        "transitions": transitions,
        "zoomEvents": zoom_events,
        "waveform": waveform_config,
        "progressBar": progress_bar,
        "audio": audio_config,
        "color": color_config,
        "subjectTracking": subject_tracking,
        "safeZones": {
            "platform": "generic_916",
            "topExclusionPx": 140,
            "bottomExclusionPx": 280,
            "rightExclusionPx": 80
        }
    }

    return edit_plan, director_trace

def create_edit_plan_file(
    transcript_json_path: str,
    output_edit_plan_path: str,
    media_analysis_path: Optional[str] = None,
    scene_analysis_path: Optional[str] = None,
    subject_tracking_path: Optional[str] = None,
    screen_roi_path: Optional[str] = None,
    trace_output_path: Optional[str] = None,
    title: Optional[str] = None,
    caption_theme: str = "box_glass",
    fps: int = 60
) -> Dict[str, Any]:
    """Master entry point for AI Director plan synthesis."""
    with open(transcript_json_path, "r", encoding="utf-8") as f:
        transcript_data = json.load(f)
        
    media_analysis = None
    if media_analysis_path and os.path.exists(media_analysis_path):
        with open(media_analysis_path, "r", encoding="utf-8") as f:
            media_analysis = json.load(f)
            
    scene_analysis = None
    if scene_analysis_path and os.path.exists(scene_analysis_path):
        with open(scene_analysis_path, "r", encoding="utf-8") as f:
            scene_analysis = json.load(f)
            
    subject_tracking = None
    if subject_tracking_path and os.path.exists(subject_tracking_path):
        with open(subject_tracking_path, "r", encoding="utf-8") as f:
            subject_tracking = json.load(f)
            
    screen_roi = None
    if screen_roi_path and os.path.exists(screen_roi_path):
        with open(screen_roi_path, "r", encoding="utf-8") as f:
            screen_roi = json.load(f)

    edit_plan, director_trace = create_multimodal_edit_plan(
        transcript_data=transcript_data,
        media_analysis=media_analysis,
        scene_analysis=scene_analysis,
        subject_tracking=subject_tracking,
        screen_roi=screen_roi,
        custom_title=title,
        caption_theme=caption_theme,
        fps=fps
    )

    os.makedirs(os.path.dirname(os.path.abspath(output_edit_plan_path)), exist_ok=True)
    with open(output_edit_plan_path, "w", encoding="utf-8") as f:
        json.dump(edit_plan, f, ensure_ascii=False, indent=2)
        
    if trace_output_path:
        os.makedirs(os.path.dirname(os.path.abspath(trace_output_path)), exist_ok=True)
        with open(trace_output_path, "w", encoding="utf-8") as f:
            json.dump(director_trace, f, ensure_ascii=False, indent=2)
        print(f"📋 [AI Director Trace] Logged {len(director_trace)} decisions -> {trace_output_path}")

    return edit_plan

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multimodal AI Director V3")
    parser.add_argument("--transcript", required=True, help="Path to captions.json")
    parser.add_argument("--media", help="Path to media_analysis.json")
    parser.add_argument("--scenes", help="Path to scene_analysis.json")
    parser.add_argument("--tracking", help="Path to subject_track.json")
    parser.add_argument("--screen-roi", help="Path to screen_roi.json")
    parser.add_argument("--output", default=".temp/edit_plan.json", help="Path to output edit_plan.json")
    parser.add_argument("--trace", default=".temp/director_trace.json", help="Path to director_trace.json")
    parser.add_argument("--title", help="Custom hook title")
    parser.add_argument("--theme", default="box_glass", help="Caption theme")
    parser.add_argument("--fps", type=int, default=60)
    args = parser.parse_args()

    plan = create_edit_plan_file(
        transcript_json_path=args.transcript,
        output_edit_plan_path=args.output,
        media_analysis_path=args.media,
        scene_analysis_path=args.scenes,
        subject_tracking_path=args.tracking,
        screen_roi_path=args.screen_roi,
        trace_output_path=args.trace,
        title=args.title,
        caption_theme=args.theme,
        fps=args.fps
    )
    print(f"🎬 [AI Director V3] Synthesized {len(plan.get('scenes', []))} scenes into -> {args.output}")

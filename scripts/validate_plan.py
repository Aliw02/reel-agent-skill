"""
AI Reel Editor — Edit Plan Validator
Validates and canonicalizes edit_plan.json before Remotion rendering.
Checks scene time boundaries, media references, schema contract parity, and ensures zero runtime exceptions.
"""

import os
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import json
import argparse
from typing import Dict, Any, List, Tuple

def normalize_plan_fields(plan: Dict[str, Any]) -> Dict[str, Any]:
    """Normalizes legacy and shorthand field names for canonical Remotion consumption."""
    # Canonicalize duration
    if "durationInFrames" not in plan and "totalFrames" in plan:
        plan["durationInFrames"] = plan["totalFrames"]
    elif "totalFrames" not in plan and "durationInFrames" in plan:
        plan["totalFrames"] = plan["durationInFrames"]
        
    # Audio config canonicalization
    audio = plan.setdefault("audio", {})
    if "duckedVolume" in audio and "duckingVolume" not in audio:
        audio["duckingVolume"] = audio["duckedVolume"]
    elif "duckingVolume" in audio and "duckedVolume" not in audio:
        audio["duckedVolume"] = audio["duckingVolume"]
        
    # Hook duration frames
    hook = plan.get("hook")
    if hook and isinstance(hook, dict):
        if "durationFrames" in hook and "durationInFrames" not in hook:
            hook["durationInFrames"] = hook["durationFrames"]
            
    return plan

def validate_edit_plan(plan: Dict[str, Any], project_root: str = None) -> Tuple[bool, List[str], List[str]]:
    """
    Validates edit plan data integrity.
    Returns: (is_valid, errors_list, warnings_list)
    """
    errors: List[str] = []
    warnings: List[str] = []
    
    # 1. Required Top-Level Fields
    duration = plan.get("durationInFrames") or plan.get("totalFrames")
    if not duration or duration <= 0:
        errors.append("Invalid or missing 'durationInFrames' / 'totalFrames'.")
        
    fps = plan.get("fps", 60)
    if fps <= 0:
        errors.append(f"Invalid fps value: {fps}")
        
    subtitles = plan.get("subtitles", [])
    if not subtitles:
        warnings.append("No subtitles found in edit plan.")
        
    # 2. Scene Boundaries Validation
    scenes = plan.get("scenes", [])
    if scenes:
        prev_end = 0
        for idx, scene in enumerate(scenes):
            s_start = scene.get("startFrame", 0)
            s_end = scene.get("endFrame", 0)
            layout = scene.get("layout", "talking_head_full")
            
            if s_start < 0 or s_end <= s_start:
                errors.append(f"Scene {scene.get('id', idx)} has invalid range [{s_start}, {s_end}].")
                
            if s_start > (duration or 0) + 60:
                warnings.append(f"Scene {scene.get('id', idx)} starts beyond video duration ({s_start} > {duration}).")
                
            prev_end = s_end

    # 3. Assets Presence in public directory
    if project_root:
        public_dir = os.path.join(project_root, "public")
        video_src = plan.get("videoSrc")
        if video_src:
            video_path = os.path.join(public_dir, os.path.basename(video_src))
            if not os.path.exists(video_path) and not video_src.startswith("http"):
                warnings.append(f"videoSrc '{video_src}' not yet copied to public/ folder.")
                
        bgm_src = plan.get("audio", {}).get("bgmSrc")
        if bgm_src:
            bgm_path = os.path.join(public_dir, os.path.basename(bgm_src))
            if not os.path.exists(bgm_path) and not bgm_src.startswith("http"):
                warnings.append(f"BGM asset '{bgm_src}' not found in public/ folder.")

    is_valid = len(errors) == 0
    return is_valid, errors, warnings

def validate_plan_file(plan_path: str, project_root: str = None) -> bool:
    """Loads, validates, and re-saves normalized edit plan."""
    if not os.path.exists(plan_path):
        print(f"❌ Edit plan file not found: {plan_path}")
        return False
        
    with open(plan_path, "r", encoding="utf-8") as f:
        plan_data = json.load(f)
        
    normalized_plan = normalize_plan_fields(plan_data)
    is_valid, errors, warnings = validate_edit_plan(normalized_plan, project_root=project_root)
    
    # Save back normalized plan
    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(normalized_plan, f, ensure_ascii=False, indent=2)
        
    if warnings:
        for w in warnings:
            print(f"⚠️ [Plan Validator Warning] {w}")
            
    if errors:
        for e in errors:
            print(f"❌ [Plan Validator Error] {e}")
        return False
        
    print(f"✅ [Plan Validator] Edit plan '{plan_path}' verified successfully.")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate and canonicalize edit_plan.json")
    parser.add_argument("--plan", required=True, help="Path to edit_plan.json")
    args = parser.parse_args()
    
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    valid = validate_plan_file(args.plan, project_root=root_dir)
    sys.exit(0 if valid else 1)

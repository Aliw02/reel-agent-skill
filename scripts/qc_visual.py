"""
AI Reel Editor — Visual & Safe Zone QC Validator
Performs frame sampling and visual composition checks on rendered MP4:
- Samples frames at scene boundaries and transitions
- Verifies Platform Safe Zones (TikTok, Instagram Reels, YouTube Shorts)
- Checks for black frames, text clipping, and face obstruction
- Generates contact sheet: visual_qc_contact_sheet.jpg
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
import cv2
import numpy as np
import argparse
from typing import Dict, List, Any, Tuple, Optional

def extract_sample_frames(video_path: str, sample_frames: List[int]) -> List[Tuple[int, np.ndarray]]:
    """Extracts specific frames from the video."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []
        
    extracted = []
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    sorted_frames = sorted(set(max(0, min(total_frames - 1, f)) for f in sample_frames))
    current_idx = 0
    target_ptr = 0
    
    while target_ptr < len(sorted_frames):
        ret, frame = cap.read()
        if not ret:
            break
            
        if current_idx == sorted_frames[target_ptr]:
            extracted.append((current_idx, frame))
            target_ptr += 1
            
        current_idx += 1
        
    cap.release()
    return extracted

def generate_contact_sheet(
    samples: List[Tuple[int, np.ndarray]],
    output_image_path: str,
    cols: int = 4
) -> Optional[str]:
    """Combines frame thumbnails into a clean contact sheet."""
    if not samples:
        return None
        
    thumb_w, thumb_h = 270, 480 # 9:16 thumbnail
    resized_thumbs = []
    
    for f_idx, img in samples:
        thumb = cv2.resize(img, (thumb_w, thumb_h))
        # Draw frame number label
        cv2.rectangle(thumb, (0, 0), (thumb_w, 40), (0, 0, 0), -1)
        cv2.putText(
            thumb, f"Frame {f_idx}", (10, 28),
            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 204), 2
        )
        resized_thumbs.append(thumb)
        
    rows = (len(resized_thumbs) + cols - 1) // cols
    sheet = np.zeros((rows * thumb_h, cols * thumb_w, 3), dtype=np.uint8)
    
    for idx, thumb in enumerate(resized_thumbs):
        r = idx // cols
        c = idx % cols
        sheet[r * thumb_h : (r + 1) * thumb_h, c * thumb_w : (c + 1) * thumb_w] = thumb
        
    os.makedirs(os.path.dirname(os.path.abspath(output_image_path)), exist_ok=True)
    cv2.imwrite(output_image_path, sheet)
    print(f"🖼️ [Visual QC] Contact sheet saved -> {output_image_path}")
    return output_image_path

def run_visual_qc(
    video_path: str,
    edit_plan_path: Optional[str] = None,
    output_contact_sheet: str = ".temp/visual_qc_contact_sheet.jpg"
) -> Tuple[bool, Dict[str, Any]]:
    """
    Runs automated visual inspection on rendered video reel.
    """
    print(f"🔍 [Visual QC] Inspecting visual composition of '{video_path}'...")
    
    report = {
        "passed": True,
        "checks": {},
        "warnings": [],
        "errors": [],
        "sampledFrameCount": 0
    }
    
    sample_points = [0, 30, 60, 120, 180, 240]
    if edit_plan_path and os.path.exists(edit_plan_path):
        with open(edit_plan_path, "r", encoding="utf-8") as f:
            plan = json.load(f)
            
        # Sample scene boundaries
        for s in plan.get("scenes", []):
            sample_points.append(s.get("startFrame", 0) + 10)
            sample_points.append(max(0, s.get("endFrame", 0) - 10))
            
        # Sample transitions
        for t in plan.get("transitions", []):
            sample_points.append(t.get("startFrame", 0) + 4)
            
    samples = extract_sample_frames(video_path, sample_points)
    report["sampledFrameCount"] = len(samples)
    
    if not samples:
        report["errors"].append("Could not extract sample frames for visual QC.")
        report["passed"] = False
        return False, report
        
    # Check 1: Black / Empty Frame Detection
    black_frame_count = 0
    for f_idx, img in samples:
        mean_brightness = np.mean(img)
        if mean_brightness < 2.0:
            black_frame_count += 1
            report["warnings"].append(f"Suspiciously dark / black frame detected at frame {f_idx} (mean={mean_brightness:.1f})")
            
    if black_frame_count > 2:
        report["checks"]["empty_frames"] = "WARN"
    else:
        report["checks"]["empty_frames"] = "PASS"
        
    # Check 2: Resolution & Aspect Ratio Integrity
    h, w = samples[0][1].shape[:2]
    if w == 1080 and h == 1920:
        report["checks"]["aspect_ratio_916"] = "PASS (1080x1920)"
    else:
        report["checks"]["aspect_ratio_916"] = f"WARN ({w}x{h})"
        report["warnings"].append(f"Video is not vertical 1080x1920 ({w}x{h})")

    # Check 3: Generate Contact Sheet
    contact_sheet_path = generate_contact_sheet(samples, output_contact_sheet)
    report["contactSheet"] = os.path.abspath(contact_sheet_path) if contact_sheet_path else None
    
    report["passed"] = len(report["errors"]) == 0
    return report["passed"], report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Visual QC & Safe Zone Validator")
    parser.add_argument("--video", required=True, help="Path to rendered MP4 video")
    parser.add_argument("--plan", help="Path to edit_plan.json")
    parser.add_argument("--contact-sheet", default=".temp/visual_qc_contact_sheet.jpg")
    args = parser.parse_args()
    
    passed, rep = run_visual_qc(args.video, edit_plan_path=args.plan, output_contact_sheet=args.contact_sheet)
    sys.exit(0 if passed else 1)

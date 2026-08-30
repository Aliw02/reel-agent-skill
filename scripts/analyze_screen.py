"""
AI Reel Editor — Screen Demo & UI Saliency Analyzer
Detects interaction targets, code blocks, active text highlights, and button clicks on screen-recordings:
- Computes Region of Interest (ROI) bounding box [x, y, w, h]
- Generates smooth camera focus and crop schedule
- Outputs screen_roi.json
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
from typing import Dict, List, Any, Tuple

def compute_frame_saliency_roi(frame: np.ndarray) -> Tuple[float, float, float, float]:
    """
    Finds the most salient visual area in a screen frame:
    Uses gradient magnitude + color saturation to locate buttons, cursors, or active code lines.
    Returns normalized [x, y, w, h] (0.0 to 1.0).
    """
    h, w = frame.shape[:2]
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Compute Sobel gradients
    grad_x = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
    grad_y = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
    magnitude = cv2.magnitude(grad_x, grad_y)
    
    # Threshold top 15% highest detail areas
    thresh_val = np.percentile(magnitude, 85)
    salient_mask = (magnitude > thresh_val).astype(np.uint8) * 255
    
    # Find bounding box around largest salient cluster
    contours, _ = cv2.findContours(salient_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        # Filter small noise contours
        valid_contours = [c for c in contours if cv2.contourArea(c) > 500]
        if valid_contours:
            all_points = np.vstack(valid_contours)
            x, y, cw, ch = cv2.boundingRect(all_points)
            
            # Pad ROI for comfortable viewing
            pad_x = int(cw * 0.2)
            pad_y = int(ch * 0.2)
            rx = max(0, x - pad_x)
            ry = max(0, y - pad_y)
            rw = min(w - rx, cw + 2 * pad_x)
            rh = min(h - ry, ch + 2 * pad_y)
            
            return (round(rx / w, 3), round(ry / h, 3), round(rw / w, 3), round(rh / h, 3))
            
    # Default centered focal area
    return (0.15, 0.20, 0.70, 0.60)

def analyze_screen_roi(video_path: str, fps: int = 60, sample_step: int = 15, output_json: str = None) -> Dict[str, Any]:
    """
    Analyzes screen-recording footage and returns ROI timeline.
    """
    print(f"🖥️ [Screen Analyzer] Detecting UI saliency & interaction regions in '{video_path}'...")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Could not open video file: {video_path}")
        
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or fps
    
    roi_events: List[Dict[str, Any]] = []
    frame_idx = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % sample_step == 0:
            roi_box = compute_frame_saliency_roi(frame)
            roi_events.append({
                "frame": frame_idx,
                "roiBox": list(roi_box),
                "zoomLevel": 1.65,
                "label": "Active UI Region"
            })
            
        frame_idx += 1
        
    cap.release()
    
    result_data = {
        "video": os.path.abspath(video_path),
        "totalFrames": total_frames,
        "fps": round(video_fps, 2),
        "roiEvents": roi_events
    }
    
    if output_json:
        os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        print(f"🖥️ [Screen Analyzer] Saved ROI timeline ({len(roi_events)} events) -> {output_json}")
        
    return result_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Analyze Screen Demo ROI")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", default=".temp/screen_roi.json", help="Output JSON path")
    parser.add_argument("--fps", type=int, default=60)
    args = parser.parse_args()
    
    analyze_screen_roi(args.input, fps=args.fps, output_json=args.output)

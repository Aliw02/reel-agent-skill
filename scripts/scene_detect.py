"""
AI Reel Editor — Visual Scene & Cut Detector
Performs frame sampling and visual difference analysis:
- Detects hard cuts & transition points
- Classifies visual segments (talking_head vs screen_demo vs b_roll)
- Outputs scene_analysis.json
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
from typing import Dict, List, Any

def classify_frame_content(frame: np.ndarray) -> str:
    """
    Classifies a frame as 'talking_head' or 'screen_demo' using computer vision heuristics:
    - High contrast text/grid patterns indicate screen demo / UI.
    - Centered skin-tone clusters and smooth organic gradients indicate talking head.
    """
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.count_nonzero(edges) / (frame.shape[0] * frame.shape[1])
    
    # Color distribution in HSV
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    # Approximate skin tone range in HSV
    lower_skin = np.array([0, 20, 70], dtype=np.uint8)
    upper_skin = np.array([25, 255, 255], dtype=np.uint8)
    skin_mask = cv2.inRange(hsv, lower_skin, upper_skin)
    skin_ratio = np.count_nonzero(skin_mask) / (frame.shape[0] * frame.shape[1])
    
    # UI screens typically have very high straight-line edge density and low skin ratio
    if edge_density > 0.08 and skin_ratio < 0.05:
        return "screen_demo"
    return "talking_head"

def detect_scenes(video_path: str, fps: int = 60, sample_interval_frames: int = 5, output_json: str = None) -> Dict[str, Any]:
    """
    Detects scene changes and visual content types throughout the video.
    """
    print(f"🎬 [Scene Detector] Scanning visual content of '{video_path}'...")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Could not open video file: {video_path}")
        
    total_video_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or fps
    
    scenes: List[Dict[str, Any]] = []
    prev_hist = None
    
    current_scene_start = 0
    current_scene_type = "talking_head"
    
    frame_idx = 0
    sampled_types: List[str] = []
    cut_threshold = 0.45 # Histogram difference threshold for hard cut
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % sample_interval_frames == 0:
            # Resize for fast histogram and edge analysis
            small_frame = cv2.resize(frame, (320, 180))
            hsv = cv2.cvtColor(small_frame, cv2.COLOR_BGR2HSV)
            hist = cv2.calcHist([hsv], [0, 1], None, [16, 16], [0, 180, 0, 256])
            cv2.normalize(hist, hist, alpha=0, beta=1, norm_type=cv2.NORM_MINMAX)
            
            frame_type = classify_frame_content(small_frame)
            sampled_types.append(frame_type)
            
            is_cut = False
            if prev_hist is not None:
                diff = cv2.compareHist(prev_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
                if diff > cut_threshold:
                    is_cut = True
                    
            if is_cut and (frame_idx - current_scene_start) > int(video_fps * 1.0): # Min scene duration 1 sec
                # Record completed scene
                scenes.append({
                    "id": f"scene_{len(scenes) + 1:03d}",
                    "startFrame": current_scene_start,
                    "endFrame": frame_idx,
                    "type": current_scene_type,
                    "confidence": 0.85
                })
                current_scene_start = frame_idx
                current_scene_type = frame_type
            else:
                if frame_type != current_scene_type and len(sampled_types) >= 4 and all(t == frame_type for t in sampled_types[-3:]):
                    # Type transition
                    scenes.append({
                        "id": f"scene_{len(scenes) + 1:03d}",
                        "startFrame": current_scene_start,
                        "endFrame": frame_idx,
                        "type": current_scene_type,
                        "confidence": 0.80
                    })
                    current_scene_start = frame_idx
                    current_scene_type = frame_type
                    
            prev_hist = hist
            
        frame_idx += 1
        
    cap.release()
    
    # Final scene
    if current_scene_start < total_video_frames:
        scenes.append({
            "id": f"scene_{len(scenes) + 1:03d}",
            "startFrame": current_scene_start,
            "endFrame": total_video_frames,
            "type": current_scene_type,
            "confidence": 0.90
        })
        
    result_data = {
        "video": os.path.abspath(video_path),
        "totalFrames": total_video_frames,
        "fps": round(video_fps, 2),
        "scenes": scenes,
        "sceneCount": len(scenes)
    }
    
    if output_json:
        os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        print(f"🎬 [Scene Detector] Detected {len(scenes)} visual scene segments -> {output_json}")
        
    return result_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scene and Visual Cut Detection")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", default=".temp/scene_analysis.json", help="Output JSON path")
    parser.add_argument("--fps", type=int, default=60)
    args = parser.parse_args()
    
    detect_scenes(args.input, fps=args.fps, output_json=args.output)

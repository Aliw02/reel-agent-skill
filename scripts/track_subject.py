"""
AI Reel Editor — Subject Tracking & Negative-Space Analyzer
Performs face and person detection across video frames:
- Computes face bounding box, center, and headroom
- Applies temporal smoothing to prevent camera/zoom jitter
- Computes safe negative space zones for overlays & text
- Outputs subject_track.json
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
from typing import Dict, List, Any, Optional, Tuple

def get_face_detector():
    """Initializes MediaPipe or OpenCV cascade face detector."""
    try:
        import mediapipe as mp
        mp_face = mp.solutions.face_detection
        detector = mp_face.FaceDetection(model_selection=1, min_detection_confidence=0.5)
        return "mediapipe", detector
    except Exception:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        detector = cv2.CascadeClassifier(cascade_path)
        return "opencv", detector

def detect_face_in_frame(frame: np.ndarray, detector_type: str, detector: Any) -> Optional[Tuple[float, float, float, float]]:
    """
    Detects the dominant face in a frame.
    Returns normalized [x, y, w, h] (0.0 to 1.0) or None.
    """
    h, w = frame.shape[:2]
    
    if detector_type == "mediapipe":
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = detector.process(rgb)
        if results.detections:
            # Pick detection with highest score / largest bbox
            best_det = max(results.detections, key=lambda d: d.score[0] if d.score else 0)
            bbox = best_det.location_data.relative_bounding_box
            return (
                max(0.0, float(bbox.xmin)),
                max(0.0, float(bbox.ymin)),
                min(1.0, float(bbox.width)),
                min(1.0, float(bbox.height))
            )
    else:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
        if len(faces) > 0:
            # Sort by area (largest face)
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            fx, fy, fw, fh = faces[0]
            return (float(fx / w), float(fy / h), float(fw / w), float(fh / h))
            
    return None

def determine_safe_negative_zone(face_box: Tuple[float, float, float, float]) -> str:
    """
    Calculates which quadrant has the least obstruction risk given face location.
    """
    fx, fy, fw, fh = face_box
    center_x = fx + fw / 2.0
    center_y = fy + fh / 2.0
    
    if center_x < 0.45:
        # Face on the left -> right side is clear
        return "top-right" if center_y > 0.4 else "bottom-right"
    elif center_x > 0.55:
        # Face on the right -> left side is clear
        return "top-left" if center_y > 0.4 else "bottom-left"
    else:
        # Face centered
        return "top-center" if center_y > 0.45 else "top-right"

def track_subject(video_path: str, fps: int = 60, sample_step: int = 4, output_json: str = None) -> Dict[str, Any]:
    """
    Tracks the speaker across frames and builds smooth subject coordinates.
    """
    print(f"👤 [Subject Tracker] Tracking speaker trajectory in '{video_path}'...")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise IOError(f"Could not open video file: {video_path}")
        
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or fps
    
    detector_type, detector = get_face_detector()
    
    raw_samples: List[Dict[str, Any]] = []
    frame_idx = 0
    
    last_known_face = (0.35, 0.25, 0.30, 0.30) # Default fallback center-top
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        if frame_idx % sample_step == 0:
            face_box = detect_face_in_frame(frame, detector_type, detector)
            if face_box:
                last_known_face = face_box
                confidence = 0.95
            else:
                face_box = last_known_face
                confidence = 0.50
                
            fx, fy, fw, fh = face_box
            cx = round(fx + fw / 2.0, 3)
            cy = round(fy + fh / 2.0, 3)
            safe_zone = determine_safe_negative_zone(face_box)
            
            raw_samples.append({
                "frame": frame_idx,
                "faceBox": [round(v, 3) for v in face_box],
                "faceCenter": [cx, cy],
                "headRoom": round(fy, 3),
                "safeNegativeZone": safe_zone,
                "confidence": confidence
            })
            
        frame_idx += 1
        
    cap.release()
    
    # Temporal smoothing (Exponential Moving Average)
    smoothed_frames: List[Dict[str, Any]] = []
    ema_alpha = 0.3
    smooth_cx = 0.5
    smooth_cy = 0.38
    
    for item in raw_samples:
        raw_cx, raw_cy = item["faceCenter"]
        smooth_cx = ema_alpha * raw_cx + (1 - ema_alpha) * smooth_cx
        smooth_cy = ema_alpha * raw_cy + (1 - ema_alpha) * smooth_cy
        
        smoothed_frames.append({
            **item,
            "faceCenter": [round(smooth_cx, 3), round(smooth_cy, 3)]
        })
        
    # Global average center
    avg_cx = sum(f["faceCenter"][0] for f in smoothed_frames) / max(1, len(smoothed_frames))
    avg_cy = sum(f["faceCenter"][1] for f in smoothed_frames) / max(1, len(smoothed_frames))
    
    result_data = {
        "video": os.path.abspath(video_path),
        "width": width,
        "height": height,
        "fps": round(video_fps, 2),
        "totalFrames": total_frames,
        "averageFaceCenter": [round(avg_cx, 3), round(avg_cy, 3)],
        "frames": smoothed_frames
    }
    
    if output_json:
        os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        print(f"👤 [Subject Tracker] Saved tracking data ({len(smoothed_frames)} samples) -> {output_json}")
        
    return result_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Track Subject & Estimate Negative Space")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", default=".temp/subject_track.json", help="Output JSON path")
    parser.add_argument("--fps", type=int, default=60)
    args = parser.parse_args()
    
    track_subject(args.input, fps=args.fps, output_json=args.output)

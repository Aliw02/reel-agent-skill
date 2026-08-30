"""
AI Reel Editor — Multimodal Media Probe Module
Analyzes raw video & audio streams:
- Resolution, aspect ratio, FPS, codec
- Audio sample rate, loudness (Integrated LUFS, True Peak, LRA)
- Produces media_analysis.json
"""

import os
import sys
import json
import shutil
import subprocess
import argparse
from typing import Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def get_ffmpeg_binary():
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def probe_video_stream(video_path: str) -> Dict[str, Any]:
    """Extracts video stream technical metadata using ffprobe with fallback."""
    ffprobe_bin = shutil.which("ffprobe")
    if ffprobe_bin:
        cmd = [
            ffprobe_bin, "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            video_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode == 0:
            return json.loads(res.stdout)

    # Fallback to ffmpeg -i parsing
    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [ffmpeg_bin, "-i", video_path, "-f", "null", "-"]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="ignore")
    return {"raw_stderr": res.stderr}

def analyze_audio_loudness(video_path: str) -> Dict[str, Any]:
    """Analyzes audio loudness according to EBU R128 (LUFS) using FFmpeg ebur128 filter."""
    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [
        ffmpeg_bin, "-i", video_path,
        "-af", "ebur128=peak=true",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="ignore")
    stderr = res.stderr
    
    loudness_info = {
        "integratedLufs": -24.0,
        "loudnessRange": 5.0,
        "truePeakDb": -1.0,
        "targetAdjustmentDb": 0.0
    }
    
    # Parse ebur128 output summary
    for line in stderr.splitlines():
        if "I:" in line and "LUFS" in line:
            parts = line.split("I:")[1].split("LUFS")[0].strip()
            try:
                loudness_info["integratedLufs"] = float(parts)
            except ValueError:
                pass
        elif "LRA:" in line and "LU" in line:
            parts = line.split("LRA:")[1].split("LU")[0].strip()
            try:
                loudness_info["loudnessRange"] = float(parts)
            except ValueError:
                pass
        elif "Peak:" in line and "dBFS" in line:
            parts = line.split("Peak:")[1].split("dBFS")[0].strip()
            try:
                loudness_info["truePeakDb"] = float(parts)
            except ValueError:
                pass
                
    # Target loudness for social media vertical reels is -14 to -16 LUFS
    target_lufs = -16.0
    loudness_info["targetAdjustmentDb"] = round(target_lufs - loudness_info["integratedLufs"], 2)
    return loudness_info

def analyze_media(video_path: str, output_json: str = None) -> Dict[str, Any]:
    """Full multimodal media probe combining video and audio metrics."""
    print(f"🔍 [Media Probe] Analyzing technical characteristics of '{video_path}'...")
    raw_probe = probe_video_stream(video_path)
    audio_loudness = analyze_audio_loudness(video_path)
    
    streams = raw_probe.get("streams", [])
    v_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})
    
    width = int(v_stream.get("width", 1080))
    height = int(v_stream.get("height", 1920))
    aspect_ratio = round(width / height, 3) if height > 0 else 0.562
    is_vertical = height >= width
    
    # Calculate FPS
    r_fps = v_stream.get("r_frame_rate", "60/1")
    if "/" in r_fps:
        n, d = map(float, r_fps.split("/"))
        fps = round(n / d) if d > 0 else 60
    else:
        fps = round(float(r_fps)) if r_fps else 60
        
    duration = float(raw_probe.get("format", {}).get("duration", v_stream.get("duration", 0.0)))
    total_frames = int(duration * fps) if duration > 0 else 0
    
    media_analysis = {
        "video": {
            "path": os.path.abspath(video_path),
            "width": width,
            "height": height,
            "aspectRatio": aspect_ratio,
            "isVertical": is_vertical,
            "fps": fps,
            "duration": round(duration, 3),
            "totalFrames": total_frames,
            "codec": v_stream.get("codec_name", "h264")
        },
        "audio": {
            "codec": a_stream.get("codec_name", "aac"),
            "sampleRate": int(a_stream.get("sample_rate", 48000)),
            "channels": int(a_stream.get("channels", 2)),
            "loudness": audio_loudness
        }
    }
    
    if output_json:
        os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(media_analysis, f, ensure_ascii=False, indent=2)
        print(f"📊 [Media Probe] Media metrics saved -> {output_json}")
        
    return media_analysis

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Multimodal Media Probe")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", default=".temp/media_analysis.json", help="Output JSON path")
    args = parser.parse_args()
    
    analyze_media(args.input, args.output)

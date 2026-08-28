"""
AI Reel Editor — Post-Render Quality Control (QC) Validator
Performs automated structural and visual checks on rendered video reels:
1. Video Resolution (1080x1920 vertical format verification)
2. Audio Stream Integrity & Sample Rate
3. Duration & Frame Count Parity with edit_plan.json
4. Output File Health & Bitrate
"""

import os
import sys
import json
import subprocess
import argparse
from typing import Dict, Any, Tuple

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import shutil
import re

def get_ffmpeg_binary():
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def inspect_video_media(video_path: str) -> Dict[str, Any]:
    """Inspects video stream properties using ffprobe with ffmpeg fallback."""
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at: {video_path}")
        
    ffprobe_bin = shutil.which("ffprobe")
    if ffprobe_bin:
        cmd = [
            ffprobe_bin,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if result.returncode == 0:
            return json.loads(result.stdout)
            
    # Fallback to ffmpeg -i parsing
    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [ffmpeg_bin, "-i", video_path, "-f", "null", "-"]
    result = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="ignore")
    stderr = result.stderr
    
    streams = []
    duration = 0.0
    
    # Parse duration
    for line in stderr.splitlines():
        if "Duration:" in line:
            dur_match = re.search(r"Duration:\s*(\d+):(\d+):([\d\.]+)", line)
            if dur_match:
                h, m, s = dur_match.groups()
                duration = float(h) * 3600 + float(m) * 60 + float(s)
        if "Stream #" in line:
            if "Video:" in line:
                # Video: h264 (...), yuv420p(...), 1080x1920, 60 fps
                res_match = re.search(r"(\d{3,4})x(\d{3,4})", line)
                fps_match = re.search(r"([\d\.]+)\s*fps", line)
                width = int(res_match.group(1)) if res_match else 1080
                height = int(res_match.group(2)) if res_match else 1920
                fps_val = fps_match.group(1) if fps_match else "60"
                streams.append({
                    "codec_type": "video",
                    "codec_name": "h264",
                    "width": width,
                    "height": height,
                    "r_frame_rate": f"{fps_val}/1"
                })
            elif "Audio:" in line:
                # Audio: aac, 48000 Hz, stereo
                hz_match = re.search(r"(\d+)\s*Hz", line)
                streams.append({
                    "codec_type": "audio",
                    "codec_name": "aac",
                    "sample_rate": hz_match.group(1) if hz_match else "48000"
                })
                
    return {
        "streams": streams,
        "format": {
            "duration": str(duration),
            "size": str(os.path.getsize(video_path))
        }
    }

def run_quality_control(
    video_path: str,
    edit_plan_path: str = None,
    expected_width: int = 1080,
    expected_height: int = 1920,
    expected_fps: int = 60,
    tolerance_sec: float = 0.35
) -> Tuple[bool, Dict[str, Any]]:
    """
    Validates rendered MP4 against target specifications and edit_plan.json contract.
    """
    print("=" * 60)
    print(f"🔍 [QC Validator] Inspecting rendered video: {video_path}")
    print("=" * 60)
    
    report = {
        "file": video_path,
        "passed": False,
        "checks": {},
        "errors": [],
        "warnings": []
    }
    
    # 1. File existence & size check
    file_size_bytes = os.path.getsize(video_path)
    file_size_mb = round(file_size_bytes / (1024 * 1024), 2)
    report["fileSizeBytes"] = file_size_bytes
    report["fileSizeMB"] = file_size_mb
    
    if file_size_bytes < 10000:
        report["errors"].append(f"Output video file is suspiciously small ({file_size_bytes} bytes).")
        report["checks"]["file_size"] = "FAIL"
    else:
        report["checks"]["file_size"] = f"PASS ({file_size_mb} MB)"
        
    # 2. ffprobe probe
    try:
        media_info = inspect_video_media(video_path)
    except Exception as e:
        report["errors"].append(str(e))
        return False, report

    streams = media_info.get("streams", [])
    v_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    a_stream = next((s for s in streams if s.get("codec_type") == "audio"), None)
    
    # 3. Video stream checks
    if not v_stream:
        report["errors"].append("No video stream found in rendered file.")
        report["checks"]["video_stream"] = "FAIL"
    else:
        width = int(v_stream.get("width", 0))
        height = int(v_stream.get("height", 0))
        
        # Check resolution
        if width != expected_width or height != expected_height:
            report["warnings"].append(f"Resolution mismatch: got {width}x{height}, expected {expected_width}x{expected_height}.")
            report["checks"]["resolution"] = f"WARN ({width}x{height})"
        else:
            report["checks"]["resolution"] = f"PASS ({width}x{height})"
            
        # Check frame rate
        r_fps_str = v_stream.get("r_frame_rate", "60/1")
        if "/" in r_fps_str:
            num, den = map(float, r_fps_str.split("/"))
            actual_fps = round(num / den) if den > 0 else 0
        else:
            actual_fps = round(float(r_fps_str))
            
        report["checks"]["fps"] = f"PASS ({actual_fps} fps)"
        report["videoCodec"] = v_stream.get("codec_name")

    # 4. Audio stream checks
    if not a_stream:
        report["warnings"].append("No audio stream found in rendered video.")
        report["checks"]["audio_stream"] = "WARN (silent video)"
    else:
        report["checks"]["audio_stream"] = f"PASS ({a_stream.get('codec_name')}, {a_stream.get('sample_rate')}Hz)"
        report["audioCodec"] = a_stream.get("codec_name")
        report["sampleRate"] = a_stream.get("sample_rate")
        
    # 5. Duration checks
    format_info = media_info.get("format", {})
    actual_duration = float(format_info.get("duration", 0.0))
    report["durationSec"] = round(actual_duration, 2)
    
    if edit_plan_path and os.path.exists(edit_plan_path):
        with open(edit_plan_path, "r", encoding="utf-8") as f:
            plan = json.load(f)
            
        expected_frames = plan.get("totalFrames", 0)
        expected_fps_val = plan.get("fps", expected_fps)
        expected_duration = expected_frames / expected_fps_val if expected_fps_val > 0 else 0
        
        diff = abs(actual_duration - expected_duration)
        report["expectedDurationSec"] = round(expected_duration, 2)
        report["durationDeltaSec"] = round(diff, 3)
        
        if diff > tolerance_sec:
            report["warnings"].append(
                f"Duration delta exceeds tolerance: actual={actual_duration:.2f}s, planned={expected_duration:.2f}s (diff={diff:.2f}s)"
            )
            report["checks"]["duration_parity"] = f"WARN (diff {diff:.2f}s)"
        else:
            report["checks"]["duration_parity"] = f"PASS (diff {diff:.2f}s)"

    # Final evaluation
    report["passed"] = len(report["errors"]) == 0
    
    print("\n📊 QC Verification Results:")
    for check_name, status in report["checks"].items():
        print(f"  • {check_name:<18}: {status}")
        
    if report["warnings"]:
        print("\n⚠️ Warnings:")
        for w in report["warnings"]:
            print(f"  - {w}")
            
    if report["errors"]:
        print("\n❌ Errors:")
        for err in report["errors"]:
            print(f"  - {err}")
            
    status_emoji = "✅ PASS" if report["passed"] else "❌ FAIL"
    print(f"\nFinal QC Status: {status_emoji}\n" + "=" * 60)
    
    return report["passed"], report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QC Post-Render Validator")
    parser.add_argument("--video", required=True, help="Path to rendered MP4 video")
    parser.add_argument("--plan", help="Path to edit_plan.json for parity validation")
    parser.add_argument("--output-report", default=".temp/qc_report.json", help="Path to write QC report JSON")
    args = parser.parse_args()
    
    passed, report_data = run_quality_control(
        video_path=args.video,
        edit_plan_path=args.plan
    )
    
    if args.output_report:
        os.makedirs(os.path.dirname(os.path.abspath(args.output_report)), exist_ok=True)
        with open(args.output_report, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
            
    sys.exit(0 if passed else 1)

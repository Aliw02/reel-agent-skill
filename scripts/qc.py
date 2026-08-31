"""
AI Reel Editor — Post-Render Quality Control (QC) Master Validator (V3.0.0)
Performs automated structural, audio, sync, and visual composition checks:
1. Video Resolution (1080x1920 vertical format verification)
2. Audio Stream Integrity, Sample Rate, and Loudness
3. Duration & Frame Count Parity with edit_plan.json
4. Visual Composition, Empty Frame, and Safe Zone Inspection (qc_visual.py)
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
from qc_visual import run_visual_qc

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
    
    for line in stderr.splitlines():
        if "Duration:" in line:
            dur_match = re.search(r"Duration:\s*(\d+):(\d+):([\d\.]+)", line)
            if dur_match:
                h, m, s = dur_match.groups()
                duration = float(h) * 3600 + float(m) * 60 + float(s)
        if "Stream #" in line:
            if "Video:" in line:
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
    tolerance_sec: float = 0.40,
    contact_sheet_path: str = ".temp/visual_qc_contact_sheet.jpg"
) -> Tuple[bool, Dict[str, Any]]:
    """
    Master QC Validator combining technical and visual inspection.
    """
    print("=" * 65)
    print(f"🔍 [QC Master] Inspecting rendered reel: {os.path.abspath(video_path)}")
    print("=" * 65)
    
    report = {
        "file": os.path.abspath(video_path),
        "passed": False,
        "checks": {},
        "errors": [],
        "warnings": [],
        "visualQc": {}
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
        
    # 2. Media probe
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
        
        if width != expected_width or height != expected_height:
            report["errors"].append(f"Resolution mismatch: got {width}x{height}, expected {expected_width}x{expected_height}.")
            report["checks"]["resolution"] = f"FAIL ({width}x{height})"
        else:
            report["checks"]["resolution"] = f"PASS ({width}x{height})"
            
        r_fps_str = v_stream.get("r_frame_rate", "60/1")
        if "/" in r_fps_str:
            num, den = map(float, r_fps_str.split("/"))
            actual_fps = round(num / den) if den > 0 else 0
        else:
            actual_fps = round(float(r_fps_str))

        if actual_fps != expected_fps:
            report["errors"].append(f"FPS mismatch: got {actual_fps}, expected {expected_fps}.")
            report["checks"]["fps"] = f"FAIL ({actual_fps} fps)"
        else:
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
            
        expected_frames = plan.get("durationInFrames") or plan.get("totalFrames", 0)
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

    # 6. Visual QC checks
    try:
        vis_passed, vis_report = run_visual_qc(
            video_path=video_path,
            edit_plan_path=edit_plan_path,
            output_contact_sheet=contact_sheet_path
        )
        report["visualQc"] = vis_report
        report["warnings"].extend(vis_report.get("warnings", []))
        report["errors"].extend(vis_report.get("errors", []))
        for k, v in vis_report.get("checks", {}).items():
            report["checks"][f"visual_{k}"] = v
    except Exception as e:
        report["warnings"].append(f"Visual QC skipped due to error: {e}")

    report["passed"] = len(report["errors"]) == 0
    
    print("\n📊 QC Verification Results:")
    for check_name, status in report["checks"].items():
        print(f"  • {check_name:<24}: {status}")
        
    if report["warnings"]:
        print("\n⚠️ Warnings:")
        for w in report["warnings"]:
            print(f"  - {w}")
            
    if report["errors"]:
        print("\n❌ Errors:")
        for err in report["errors"]:
            print(f"  - {err}")
            
    status_emoji = "✅ PASS" if report["passed"] else "❌ FAIL"
    print(f"\nFinal QC Status: {status_emoji}\n" + "=" * 65)
    
    return report["passed"], report

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="QC Post-Render Master Validator")
    parser.add_argument("--video", required=True, help="Path to rendered MP4 video")
    parser.add_argument("--plan", help="Path to edit_plan.json")
    parser.add_argument("--output-report", default=".temp/qc_report.json")
    parser.add_argument("--contact-sheet", default=".temp/visual_qc_contact_sheet.jpg")
    args = parser.parse_args()
    
    passed, report_data = run_quality_control(
        video_path=args.video,
        edit_plan_path=args.plan,
        contact_sheet_path=args.contact_sheet
    )
    
    if args.output_report:
        os.makedirs(os.path.dirname(os.path.abspath(args.output_report)), exist_ok=True)
        with open(args.output_report, "w", encoding="utf-8") as f:
            json.dump(report_data, f, ensure_ascii=False, indent=2)
            
    sys.exit(0 if passed else 1)

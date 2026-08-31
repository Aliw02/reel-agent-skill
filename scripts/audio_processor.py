"""
AI Reel Editor — Audio Mastering & Loudness Normalizer
Performs EBU R128 voice loudness normalization to target -16 LUFS for vertical reels:
- Two-pass or integrated loudnorm filter
- Clipping protection & True Peak limiting (-1.0 dBFS)
- Dynamic background audio ducking calculation
"""

import os
import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import shutil
import subprocess
import argparse
from typing import Optional

def get_ffmpeg_binary():
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def normalize_voice_loudness(
    input_video: str,
    output_video: str,
    target_i: float = -16.0,
    target_tp: float = -1.0,
    target_lra: float = 7.0
) -> str:
    """
    Normalizes audio track to target broadcast/social standards (-16 LUFS)
    using FFmpeg's loudnorm filter while copying the video stream losslessly.
    """
    print(f"🔊 [Audio Master] Normalizing voice loudness to {target_i} LUFS in '{input_video}'...")
    ffmpeg_bin = get_ffmpeg_binary()
    
    os.makedirs(os.path.dirname(os.path.abspath(output_video)), exist_ok=True)
    
    cmd = [
        ffmpeg_bin, "-y", "-i", input_video,
        "-c:v", "copy",
        "-af", f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}",
        "-c:a", "aac", "-b:a", "192k",
        output_video
    ]
    
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        stderr_msg = res.stderr.decode('utf-8', 'ignore')[:500]
        raise RuntimeError(
            f"FFmpeg normalization failed (exit {res.returncode}): {stderr_msg}"
        )

    print(f"✨ [Audio Master] Mastered audio saved -> {output_video}")
    return output_video


def measure_loudness(video_path: str) -> dict:
    """Measures integrated loudness, true peak, and LRA of the audio track.

    Returns a dict with keys: integrated_lufs, true_peak_db, lra.
    Raises RuntimeError if ffprobe/loudnorm analysis fails.
    """
    ffmpeg_bin = get_ffmpeg_binary()

    # Two-pass loudnorm measurement: first pass analyzes, second pass would apply.
    # We run only the analysis pass (prints JSON stats to stderr).
    cmd = [
        ffmpeg_bin, "-i", video_path,
        "-af", "loudnorm=print_format=json",
        "-f", "null", "-"
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    stderr_text = res.stderr.decode('utf-8', 'ignore')

    # Parse the JSON block that loudnorm prints on the second-to-last brace group
    import json
    import re
    json_match = re.search(r'\{[^{}]*"input_i"[^{}]*\}', stderr_text)
    if not json_match:
        raise RuntimeError(
            f"Could not parse loudness stats from ffmpeg output: {stderr_text[:300]}"
        )

    stats = json.loads(json_match.group())
    return {
        "integrated_lufs": float(stats.get("input_i", 0)),
        "true_peak_db": float(stats.get("input_tp", 0)),
        "lra": float(stats.get("input_lra", 0)),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Normalize Voice Loudness to -16 LUFS")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", required=True, help="Output video file path")
    parser.add_argument("--target-lufs", type=float, default=-16.0)
    args = parser.parse_args()
    
    normalize_voice_loudness(args.input, args.output, target_i=args.target_lufs)

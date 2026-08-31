"""
Automated Silence Removal & Jump-Cut Generator
Detects silent sections in the audio track and trims them to produce fast-paced video clips.
"""

import os
import sys
import subprocess
import argparse
import numpy as np

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

import shutil

def get_ffmpeg_binary():
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

def detect_silence_ffmpeg(video_path, silence_thresh_db=-30, min_silence_sec=0.4):
    """
    Uses ffmpeg silencedetect filter to find start and end times of silent intervals.
    """
    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [
        ffmpeg_bin, "-i", video_path,
        "-af", f"silencedetect=noise={silence_thresh_db}dB:d={min_silence_sec}",
        "-f", "null", "-"
    ]
    
    result = subprocess.run(cmd, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="ignore")
    output = result.stderr
    
    silences = []
    current_start = None
    
    for line in output.splitlines():
        if "silence_start:" in line:
            parts = line.split("silence_start:")
            current_start = float(parts[1].strip().split()[0])
        elif "silence_end:" in line and current_start is not None:
            parts = line.split("silence_end:")
            silence_end = float(parts[1].strip().split()[0])
            silences.append((current_start, silence_end))
            current_start = None
            
    return silences

def get_video_duration(video_path):
    ffmpeg_bin = get_ffmpeg_binary()
    cmd = [ffmpeg_bin, "-i", video_path, "-f", "null", "-"]
    res = subprocess.run(cmd, stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True, errors="ignore")
    for line in res.stderr.splitlines():
        if "Duration:" in line:
            dur_str = line.split("Duration:")[1].split(",")[0].strip()
            parts = dur_str.split(":")
            if len(parts) == 3:
                h, m, s = parts
                return float(h) * 3600 + float(m) * 60 + float(s)
    return 0.0

def cut_silence(input_video, output_video, silence_thresh_db=-30, min_silence_sec=0.4, padding=0.08):
    """
    Cuts out silent intervals from the video, keeping active speech segments with slight padding.
    """
    print(f"🎬 [Auto-Cut] Analyzing audio for silence in: {input_video}")
    duration = get_video_duration(input_video)
    silences = detect_silence_ffmpeg(input_video, silence_thresh_db, min_silence_sec)
    
    ffmpeg_bin = get_ffmpeg_binary()
    if not silences:
        print("⚡ No long silences found. Copying input to output...")
        cmd = [ffmpeg_bin, "-y", "-i", input_video, "-c", "copy", output_video]
        subprocess.run(cmd, check=True)
        return output_video
    
    # Invert silences to get speech chunks
    speech_chunks = []
    last_end = 0.0
    for s_start, s_end in silences:
        chunk_start = max(0.0, last_end)
        chunk_end = max(0.0, s_start + padding)
        if chunk_end - chunk_start > 0.2:
            speech_chunks.append((chunk_start, chunk_end))
        last_end = max(0.0, s_end - padding)
        
    if last_end < duration:
        speech_chunks.append((last_end, duration))
        
    print(f"✂️ [Auto-Cut] Found {len(silences)} pauses. Retaining {len(speech_chunks)} speech segments.")
    
    # Generate ffmpeg filter complex for concatenation
    filter_parts = []
    concat_inputs = []
    for idx, (start, end) in enumerate(speech_chunks):
        filter_parts.append(f"[0:v]trim=start={start:.3f}:end={end:.3f},setpts=PTS-STARTPTS[v{idx}];")
        filter_parts.append(f"[0:a]atrim=start={start:.3f}:end={end:.3f},asetpts=PTS-STARTPTS[a{idx}];")
        concat_inputs.append(f"[v{idx}][a{idx}]")
        
    filter_complex = "".join(filter_parts) + "".join(concat_inputs) + f"concat=n={len(speech_chunks)}:v=1:a=1[outv][outa]"
    
    cmd = [
        ffmpeg_bin, "-y", "-i", input_video,
        "-filter_complex", filter_complex,
        "-map", "[outv]", "-map", "[outa]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k",
        output_video
    ]
    
    subprocess.run(cmd, check=True)
    print(f"✅ [Auto-Cut] Trimmed video saved to: {output_video}")
    return output_video

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Auto Silence Removal for Reels")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", required=True, help="Output trimmed video file path")
    parser.add_argument("--thresh", type=int, default=-30, help="Silence threshold in dB")
    parser.add_argument("--min-silence", type=float, default=0.4, help="Minimum silence duration in seconds")
    parser.add_argument("--padding", type=float, default=0.08, help="Speech padding in seconds")
    args = parser.parse_args()
    
    cut_silence(args.input, args.output, silence_thresh_db=args.thresh, min_silence_sec=args.min_silence, padding=args.padding)

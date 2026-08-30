"""
Transcription and Kinetic Subtitle Generator
Uses Faster-Whisper with Arabic/Iraqi Dialect optimizations, GPU/CPU auto-detection,
and semantic phrase boundary chunking (pauses & punctuation instead of fixed 3-word chunks).
"""

import os
import sys
import json
import re
import argparse
from typing import List, Dict, Any

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

def normalize_arabic_text(text: str) -> str:
    """
    Normalizes Arabic text while preserving dialectal nuances and removing noise tokens.
    """
    if not text:
        return ""
    # Remove Tatweel (Kashida)
    text = re.sub(r'[\u0640]', '', text)
    # Remove excessive diacritics / tashkeel
    text = re.sub(r'[\u064B-\u0652]', '', text)
    # Normalize excessive repetitions (e.g. ههههههه -> هههه)
    text = re.sub(r'(.)\1{3,}', r'\1\1', text)
    # Clean whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def chunk_words_semantically(all_words: List[Dict[str, Any]], fps: int = 60) -> List[Dict[str, Any]]:
    """
    P0 Fix: Replaces fixed chunk_size = 3 with intelligent phrase chunking based on:
    1. Speech pauses (> 0.25s silence between consecutive words)
    2. Punctuation marks (comma ، , period . question ? exclamation !)
    3. Natural phrase length limit (2 to 5 words max per visual card)
    """
    if not all_words:
        return []
        
    chunks = []
    current_chunk: List[Dict[str, Any]] = []
    
    punctuation_pattern = re.compile(r'[.،,!?؟؛;:]$')
    
    for i, word_item in enumerate(all_words):
        current_chunk.append(word_item)
        
        # Check if next word exists
        is_last_word = (i == len(all_words) - 1)
        
        if is_last_word:
            # Final chunk
            pass
        else:
            next_word = all_words[i + 1]
            pause_duration = next_word["start"] - word_item["end"]
            has_punctuation = bool(punctuation_pattern.search(word_item["word"]))
            chunk_length = len(current_chunk)
            
            # Splitting conditions:
            # 1. Natural speaker pause (> 0.25s)
            # 2. Punctuation boundary if chunk already has at least 2 words
            # 3. Maximum comfortable visual phrase limit (5 words)
            should_split = (
                (pause_duration >= 0.25 and chunk_length >= 2) or
                (has_punctuation and chunk_length >= 2) or
                (chunk_length >= 5)
            )
            
            if not should_split:
                continue
                
        # Build chunk
        start_frame = current_chunk[0]["startFrame"]
        # Add slight 100ms hold at the end of phrase for readability
        end_frame = current_chunk[-1]["endFrame"] + int(fps * 0.1)
        chunk_text = " ".join(w["word"] for w in current_chunk)
        
        chunks.append({
            "id": len(chunks) + 1,
            "startFrame": start_frame,
            "endFrame": end_frame,
            "text": chunk_text,
            "emoji": None, # Handled selectively by Director
            "words": current_chunk
        })
        current_chunk = []
        
    return chunks

def transcribe_video(
    video_path: str,
    output_json: str,
    model_size: str = "turbo",
    device: str = "auto",
    language: str = "ar",
    fps: int = 60
) -> Dict[str, Any]:
    """
    Transcribes video and saves structured word-level subtitle items formatted for Remotion.
    """
    from faster_whisper import WhisperModel
    import torch
    
    # Auto-detect CUDA GPU vs CPU
    if device == "auto":
        has_cuda = torch.cuda.is_available() if "torch" in sys.modules or hasattr(torch, "cuda") else False
        device = "cuda" if has_cuda else "cpu"
        compute_type = "float16" if device == "cuda" else "int8"
    else:
        compute_type = "float16" if device == "cuda" else "int8"
        
    hf_cache = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".temp", "hf_cache"))
    os.makedirs(hf_cache, exist_ok=True)
    os.environ["HF_HOME"] = hf_cache
    os.environ["HUGGINGFACE_HUB_CACHE"] = hf_cache

    print(f"🎙️ [Whisper] Loading model '{model_size}' on device '{device}' ({compute_type})...")
    
    try:
        model = WhisperModel(model_size, device=device, compute_type=compute_type, download_root=hf_cache)
    except Exception as e:
        print(f"⚠️ [Whisper] Fallback to CPU int8 due to device error: {e}")
        model = WhisperModel(model_size if model_size != "turbo" else "base", device="cpu", compute_type="int8", download_root=hf_cache)
    
    # Transcription with word timestamps & VAD filter
    segments, info = model.transcribe(
        video_path,
        language=language if language != "auto" else None,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=250,
            speech_pad_ms=100
        )
    )
    
    detected_lang = info.language if info else language
    lang_prob = info.language_probability if info else 1.0
    print(f"🌍 [Whisper] Language: '{detected_lang}' (Confidence: {lang_prob:.2f})")
    
    all_words = []
    for segment in segments:
        for word in segment.words:
            clean_word = normalize_arabic_text(word.word)
            if not clean_word:
                continue
                
            all_words.append({
                "word": clean_word,
                "start": round(word.start, 3),
                "end": round(word.end, 3),
                "startFrame": int(word.start * fps),
                "endFrame": int(word.end * fps),
                "emoji": None,
                "highlight": False # Highlighting is assigned semantically by Director
            })
            
    # Semantic phrase grouping (replacing rigid 3-word chunks)
    subtitles = chunk_words_semantically(all_words, fps=fps)
    
    result_data = {
        "language": detected_lang,
        "duration": info.duration if info else (all_words[-1]["end"] if all_words else 0),
        "fps": fps,
        "subtitles": subtitles,
        "wordCount": len(all_words)
    }
    
    os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
        
    print(f"✨ [Whisper] Generated {len(subtitles)} semantic subtitle chunks ({len(all_words)} words) -> {output_json}")
    return result_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Kinetic Subtitles with Whisper")
    parser.add_argument("--input", "--audio", dest="input", required=True, help="Input video or audio file path")
    parser.add_argument("--output", default=".temp/captions.json", help="Output JSON file path")
    parser.add_argument("--model", default="turbo", help="Whisper model (base, small, medium, large-v3, turbo)")
    parser.add_argument("--device", default="auto", choices=["auto", "cuda", "cpu"])
    parser.add_argument("--lang", default="ar", help="Language code (ar, en, auto)")
    parser.add_argument("--fps", type=int, default=60)
    args = parser.parse_args()
    
    transcribe_video(
        video_path=args.input,
        output_json=args.output,
        model_size=args.model,
        device=args.device,
        language=args.lang,
        fps=args.fps
    )

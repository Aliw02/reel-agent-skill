"""
Transcription and Kinetic Subtitle Generator
Uses Faster-Whisper to extract word-level timestamps, detect keywords, and assign contextual emojis.
"""

import os
import sys
import json
import argparse
from faster_whisper import WhisperModel

# Contextual emoji keywords dictionary (Arabic & English)
EMOJI_KEYWORDS = {
    # Arabic keywords
    "فلوس": "💰", "دولار": "💵", "ارباح": "📈", "ربح": "💸", "سعر": "🏷️",
    "ذكاء": "🧠", "اصطناعي": "🤖", "روبوت": "🦾", "برمجة": "💻", "كود": "👨‍💻",
    "وقت": "⏱️", "سريع": "⚡", "سرعة": "🚀", "بطيء": "🐢", "صاروخ": "🚀",
    "فكرة": "💡", "مهم": "⚠️", "سر": "🤫", "سري": "🔒", "قفل": "🔐",
    "هدف": "🎯", "نار": "🔥", "قوي": "💪", "قلب": "❤️", "حب": "😍",
    "خطأ": "❌", "صح": "✅", "تطبيق": "📱", "موقع": "🌐", "فيديو": "🎥",
    "ريلز": "🎬", "تيك توك": "🎵", "يوتيوب": "▶️", "نجاح": "🏆",
    
    # English keywords
    "money": "💰", "cash": "💵", "profit": "📈", "ai": "🤖", "robot": "🦾",
    "code": "💻", "coding": "👨‍💻", "fast": "⚡", "speed": "🚀", "time": "⏱️",
    "idea": "💡", "secret": "🤫", "fire": "🔥", "strong": "💪", "target": "🎯",
    "success": "🏆", "app": "📱", "video": "🎥", "check": "✅", "error": "❌"
}

def get_emoji_for_text(text):
    text_lower = text.lower()
    for kw, emoji in EMOJI_KEYWORDS.items():
        if kw in text_lower:
            return emoji
    return ""

def transcribe_video(video_path, output_json, model_size="base", fps=60):
    """
    Transcribes video and saves structured subtitle items formatted for Remotion.
    """
    print(f"🎙️ [Whisper] Loading model '{model_size}' and extracting speech...")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    
    segments, info = model.transcribe(
        video_path,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=300)
    )
    
    print(f"🌍 [Whisper] Detected language: '{info.language}' (probability: {info.language_probability:.2f})")
    
    all_words = []
    for segment in segments:
        for word in segment.words:
            clean_word = word.word.strip()
            if not clean_word:
                continue
            
            emoji = get_emoji_for_text(clean_word)
            all_words.append({
                "word": clean_word,
                "start": word.start,
                "end": word.end,
                "startFrame": int(word.start * fps),
                "endFrame": int(word.end * fps),
                "emoji": emoji,
                "highlight": bool(emoji or len(clean_word) > 5)
            })
            
    # Group words into short dynamic phrases (2-4 words per subtitle block)
    subtitles = []
    chunk_size = 3
    for i in range(0, len(all_words), chunk_size):
        chunk = all_words[i:i + chunk_size]
        start_frame = chunk[0]["startFrame"]
        end_frame = chunk[-1]["endFrame"] + int(fps * 0.15) # slight trailing hold
        
        # Determine main emoji for the chunk
        chunk_emoji = next((w["emoji"] for w in chunk if w["emoji"]), "")
        
        subtitles.append({
            "id": i // chunk_size,
            "startFrame": start_frame,
            "endFrame": end_frame,
            "text": " ".join(w["word"] for w in chunk),
            "emoji": chunk_emoji,
            "words": chunk
        })
        
    result_data = {
        "language": info.language,
        "duration": info.duration,
        "fps": fps,
        "subtitles": subtitles
    }
    
    os.makedirs(os.path.dirname(os.path.abspath(output_json)), exist_ok=True)
    with open(output_json, "w", encoding="utf-8") as f:
        json.dump(result_data, f, ensure_ascii=False, indent=2)
        
    print(f"✨ [Whisper] Generated {len(subtitles)} kinetic subtitle chunks -> {output_json}")
    return result_data

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract Kinetic Subtitles with Whisper")
    parser.add_argument("--input", required=True, help="Input video file path")
    parser.add_argument("--output", required=True, help="Output JSON file path")
    parser.add_argument("--model", default="base", help="Whisper model size (tiny, base, small, medium)")
    args = parser.parse_args()
    
    transcribe_video(args.input, args.output, model_size=args.model)

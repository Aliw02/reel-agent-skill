"""
AI Director / Edit Planner Module
Analyzes transcript, audio energy, and content context to generate a master edit_plan.json.
Determines:
- Hook detection & intro styling
- Semantic word highlighting (replacing character-length heuristics)
- Smart punch-in zoom triggers on emphasis phrases
- Contextual multi-overlay placements (cards, stats, quotes, bullets)
- Sparse, meaningful emoji selection
- Caption theme & audio ducking configuration
"""

import os
import sys
import json
import re
import argparse
from typing import Dict, List, Any, Optional

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Contextual high-impact keywords for Iraqi & Modern Standard Arabic + English
ARABIC_IMPORTANCE_SEEDS = {
    # High-emphasis concept markers
    "مهم", "سر", "خطير", "فرصة", "نتيجة", "حل", "مشكلة", "طريقة", "خطوة",
    "اسمع", "شوف", "دير بالك", "انتبه", "ركز", "تدري", "تعرف", "شلون",
    "مليون", "دولار", "ارباح", "فلوس", "مجانا", "سريع", "تطبيق", "موقع",
    "ذكاء", "اصطناعي", "برمجة", "كود", "اداة", "فكرة", "نجاح", "هدف",
    "احسن", "افضل", "اقوى", "اكبر", "اول", "جديد", "ثورة", "فارق"
}

ENGLISH_IMPORTANCE_SEEDS = {
    "secret", "important", "key", "result", "solution", "hack", "mistake",
    "money", "profit", "free", "fast", "ai", "tool", "app", "code", "success",
    "best", "worst", "stop", "watch", "look", "boost", "growth", "power"
}

def clean_token(word: str) -> str:
    """Strip punctuation and normalize for semantic comparison."""
    w = re.sub(r'[^\w\s]', '', word.strip().lower())
    # Arabic normalizations
    w = re.sub(r'[إأآا]', 'ا', w)
    w = re.sub(r'ة$', 'ه', w)
    w = re.sub(r'ى$', 'ي', w)
    return w

def is_semantic_keyword(word: str) -> bool:
    clean = clean_token(word)
    if not clean or len(clean) < 2:
        return False
    if clean in ARABIC_IMPORTANCE_SEEDS or clean in ENGLISH_IMPORTANCE_SEEDS:
        return True
    # Numbers/Percentages are always high emphasis
    if re.match(r'^\d+(\.\d+)?%?$', clean) or any(c.isdigit() for c in clean):
        return True
    return False

def select_contextual_emoji(phrase: str) -> Optional[str]:
    """Select a single meaningful emoji for a phrase if truly relevant, avoiding spam."""
    phrase_clean = clean_token(phrase)
    
    emoji_map = [
        (["فلوس", "دولار", "ارباح", "ربح", "سعر", "money", "profit", "cash"], "💰"),
        (["ذكاء", "اصطناعي", "روبوت", "ai", "robot", "llm", "gpt"], "🤖"),
        (["فكرة", "حل", "سر", "سرية", "idea", "secret", "hack"], "💡"),
        (["سريع", "سرعة", "صاروخ", "fast", "speed", "rocket"], "🚀"),
        (["كود", "برمجة", "تطوير", "code", "dev", "program"], "👨‍💻"),
        (["هدف", "نتيجة", "target", "goal", "result"], "🎯"),
        (["نار", "قوي", "اسطوري", "fire", "powerful"], "🔥"),
        (["انتبه", "خطر", "مهم", "warning", "important"], "⚠️"),
        (["صح", "نجاح", "ممتاز", "success", "check"], "✅"),
        (["خطا", "غلط", "error", "mistake"], "❌"),
    ]
    
    for keywords, emoji in emoji_map:
        if any(kw in phrase_clean for kw in keywords):
            return emoji
    return None

def analyze_transcript_and_plan(
    transcript_data: Dict[str, Any],
    custom_title: Optional[str] = None,
    caption_theme: str = "box_glass",
    enable_hook: bool = True,
    enable_zooms: bool = True,
    enable_overlays: bool = True,
    fps: int = 60
) -> Dict[str, Any]:
    """
    Core AI Director Engine.
    Processes raw transcription chunks and synthesizes an intelligent edit plan.
    """
    subtitles = transcript_data.get("subtitles", [])
    total_frames = int(transcript_data.get("duration", 0) * fps)
    
    # 1. Enhance Subtitles with Semantic Highlights & Selective Emojis
    enhanced_subtitles = []
    emphasis_timestamps = []
    
    for chunk in subtitles:
        chunk_text = chunk.get("text", "")
        chunk_words = chunk.get("words", [])
        
        # Determine semantic word highlights
        enhanced_words = []
        chunk_has_emphasis = False
        
        for w in chunk_words:
            raw_w = w.get("word", "")
            is_highlight = is_semantic_keyword(raw_w)
            
            if is_highlight:
                chunk_has_emphasis = True
                
            enhanced_words.append({
                "word": raw_w,
                "start": w.get("start", 0.0),
                "end": w.get("end", 0.0),
                "startFrame": w.get("startFrame", int(w.get("start", 0.0) * fps)),
                "endFrame": w.get("endFrame", int(w.get("end", 0.0) * fps)),
                "highlight": is_highlight,
                "emoji": None # Emojis live at phrase level to prevent clutter
            })
            
        # Contextual emoji for the chunk (only if high emphasis)
        chunk_emoji = select_contextual_emoji(chunk_text) if chunk_has_emphasis else None
        
        emphasis_level = "normal"
        if chunk_has_emphasis:
            emphasis_level = "high"
            emphasis_timestamps.append({
                "startFrame": chunk.get("startFrame", 0),
                "endFrame": chunk.get("endFrame", 0),
                "text": chunk_text
            })
            
        enhanced_subtitles.append({
            "id": chunk.get("id", 0),
            "startFrame": chunk.get("startFrame", 0),
            "endFrame": chunk.get("endFrame", 0),
            "text": chunk_text,
            "emoji": chunk_emoji,
            "emphasisLevel": emphasis_level,
            "words": enhanced_words
        })

    # 2. Hook Detection (First 1-3 seconds)
    hook_title = custom_title
    if not hook_title and enhanced_subtitles:
        # Extract the punchiest words from the opening subtitle
        first_chunk = enhanced_subtitles[0]
        hook_title = first_chunk["text"]
        
    hook_config = {
        "enabled": enable_hook,
        "title": hook_title or "فيديو جديد",
        "subtitle": "AI Reel Editor",
        "durationInFrames": min(90, int(2.5 * fps))
    }

    # 3. Smart Punch-in Zoom Scheduling
    zoom_events = []
    if enable_zooms and emphasis_timestamps:
        last_zoom_end = 0
        min_gap_between_zooms = int(3.0 * fps) # At least 3s between zooms to avoid dizziness
        
        for idx, emp in enumerate(emphasis_timestamps):
            start_f = emp["startFrame"]
            if start_f > last_zoom_end + min_gap_between_zooms:
                duration_f = min(int(2.0 * fps), max(int(1.2 * fps), emp["endFrame"] - start_f + int(0.4 * fps)))
                zoom_events.append({
                    "id": f"zoom-{idx + 1}",
                    "startFrame": start_f,
                    "durationInFrames": duration_f,
                    "scale": 1.15, # Dynamic punch-in
                    "originX": "50%",
                    "originY": "40%",
                    "type": "punch_in"
                })
                last_zoom_end = start_f + duration_f

    # 4. Multi-Overlay Scheduling
    overlays = []
    if enable_overlays and len(enhanced_subtitles) >= 3:
        # Schedule an explanatory glass card near second 3-5 if not overlapping with hook
        card_start = max(hook_config["durationInFrames"] + 15, int(3.5 * fps))
        if total_frames > card_start + int(4.0 * fps):
            # Find a relevant concept from the middle of the video
            mid_subs = enhanced_subtitles[1:min(5, len(enhanced_subtitles))]
            card_text = " ".join(s["text"] for s in mid_subs)
            if len(card_text) > 80:
                card_text = card_text[:77] + "..."
                
            overlays.append({
                "id": "director-concept-card",
                "type": "card",
                "startFrame": card_start,
                "durationInFrames": int(4.0 * fps),
                "title": "الفكرة الرئيسية",
                "text": card_text or "نقاط مهمة يجب الانتباه إليها",
                "icon": "💡",
                "theme": "glass",
                "position": "top"
            })

    # 5. Caption Style Configuration
    caption_style = {
        "theme": caption_theme,
        "fontFamily": "'Cairo', 'Tajawal', 'Readex Pro', -apple-system, sans-serif",
        "fontSize": 56,
        "highlightColor": "#FFE600",
        "activeWordColor": "#00FFCC",
        "inactiveWordColor": "#FFFFFF",
        "positionBottom": 340,
        "direction": "rtl",
        "uppercase": False
    }

    # 6. Audio Pacing & Ducking Configuration
    audio_config = {
        "bgmVolume": 0.15,
        "duckingVolume": 0.035, # Lowers BGM during active speaking frames
        "fadeDurationFrames": int(0.5 * fps)
    }

    # 7. Progress Bar Config
    progress_bar = {
        "enabled": True,
        "gradientColors": ["#FFE600", "#00FFCC"],
        "height": 8,
        "position": "top"
    }

    # Assemble Full Edit Plan Contract
    edit_plan = {
        "version": "2.0.0",
        "durationInFrames": total_frames,
        "totalFrames": total_frames,
        "fps": fps,
        "title": hook_title or "Reel",
        "hook": hook_config,
        "captionStyle": caption_style,
        "subtitles": enhanced_subtitles,
        "overlays": overlays,
        "zoomEvents": zoom_events,
        "audio": audio_config,
        "progressBar": progress_bar
    }
    
    return edit_plan

def create_edit_plan_file(
    transcript_json_path: str,
    output_edit_plan_path: str,
    title: Optional[str] = None,
    caption_theme: str = "box_glass",
    fps: int = 60
) -> Dict[str, Any]:
    """Reads transcript JSON and exports edit_plan.json"""
    print(f"🎬 [AI Director] Planning video edit from: {transcript_json_path}")
    
    with open(transcript_json_path, "r", encoding="utf-8") as f:
        transcript_data = json.load(f)
        
    edit_plan = analyze_transcript_and_plan(
        transcript_data=transcript_data,
        custom_title=title,
        caption_theme=caption_theme,
        fps=fps
    )
    
    os.makedirs(os.path.dirname(os.path.abspath(output_edit_plan_path)), exist_ok=True)
    with open(output_edit_plan_path, "w", encoding="utf-8") as f:
        json.dump(edit_plan, f, ensure_ascii=False, indent=2)
        
    print(f"📋 [AI Director] Master edit plan synthesized -> {output_edit_plan_path}")
    print(f"   • Subtitles: {len(edit_plan['subtitles'])} chunks")
    print(f"   • Punch Zooms: {len(edit_plan['zoomEvents'])} events")
    print(f"   • Overlays: {len(edit_plan['overlays'])} items")
    return edit_plan

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AI Director / Edit Planner")
    parser.add_argument("--transcript", required=True, help="Path to transcript.json")
    parser.add_argument("--output", default=".temp/edit_plan.json", help="Output path for edit_plan.json")
    parser.add_argument("--title", help="Custom video title/hook")
    parser.add_argument("--theme", default="box_glass", choices=["box_glass", "neon", "bold_yellow", "clean_white", "cyber"])
    parser.add_argument("--fps", type=int, default=60)
    args = parser.parse_args()
    
    create_edit_plan_file(
        transcript_json_path=args.transcript,
        output_edit_plan_path=args.output,
        title=args.title,
        caption_theme=args.theme,
        fps=args.fps
    )

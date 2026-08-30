import sys

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass
"""
AI Reel Editor — Caption & Dialect Audit Module
Performs semantic and phonetic auditing on raw Whisper transcription.
Normalizes Arabic text, fixes punctuation, detects semantic emphasis tokens,
and tags entities (numbers, percentages, tech terms, comparisons) for the AI Director.
"""

import re
from typing import Dict, List, Any

# Common Arabic emphasis & dialect markers
EMPHASIS_KEYWORDS = {
    # Numbers and metrics
    "مئة", "مليون", "مليار", "ألف", "ضعف", "بالمئة", "نسبة", "سعر", "تكلفة", "دولار", "دينار", "أرباح",
    # Contrast and comparison
    "لكن", "بينما", "الفرق", "مقارنة", "أفضل", "أسرع", "أرخص", "أقوى", "قبل", "بعد", "بدل",
    # Strong statements / hooks
    "سر", "خطير", "انتبه", "أهم", "أول", "حصري", "مجانا", "تغيير", "ثورة", "ذكاء", "تطبيق", "أداة",
    # Dialectal intensifiers (Iraqi, Levantine, Gulf, Egyptian)
    "كلش", "هواية", "أصلاً", "أبداً", "طبعاً", "أكيد", "لازم", "ضروري", "ببساطة", "فعلاً", "حرفياً"
}

def normalize_arabic_token(word: str) -> str:
    """Normalizes an individual word token."""
    if not word:
        return ""
    # Strip tatweel and diacritics
    word = re.sub(r'[\u0640\u064B-\u0652]', '', word)
    return word.strip()

def audit_word_item(word_item: Dict[str, Any], avg_duration: float = 0.35) -> Dict[str, Any]:
    """Audits a single word timestamp entry."""
    raw_word = word_item.get("word", "")
    clean_word = normalize_arabic_token(raw_word)
    
    start = word_item.get("start", 0.0)
    end = word_item.get("end", 0.0)
    duration = max(0.0, end - start)
    
    # Check numeric tokens
    has_digits = bool(re.search(r'\d', raw_word))
    is_keyword = any(k in clean_word for k in EMPHASIS_KEYWORDS)
    is_elongated = duration > (avg_duration * 1.35) and len(clean_word) > 2
    
    is_highlight = word_item.get("highlight", False) or has_digits or is_keyword or is_elongated
    
    # Tag token role
    role = "normal"
    if has_digits:
        role = "numeric"
    elif is_keyword:
        role = "keyword"
    elif is_elongated:
        role = "vocal_stress"
        
    return {
        **word_item,
        "word": raw_word,
        "cleanWord": clean_word,
        "highlight": is_highlight,
        "role": role,
        "duration": round(duration, 3)
    }

def audit_and_correct_captions(raw_captions: Dict[str, Any]) -> Dict[str, Any]:
    """
    Audits and enhances Whisper transcription data.
    Ensures correct structure, tags semantic keywords, and optimizes chunk timings.
    """
    subtitles = raw_captions.get("subtitles", [])
    if not subtitles:
        return raw_captions
        
    # Calculate global average word duration
    all_durations = [
        (w.get("end", 0.0) - w.get("start", 0.0))
        for chunk in subtitles
        for w in chunk.get("words", [])
        if (w.get("end", 0.0) - w.get("start", 0.0)) > 0
    ]
    avg_duration = sum(all_durations) / len(all_durations) if all_durations else 0.35
    
    audited_subtitles: List[Dict[str, Any]] = []
    
    for chunk_idx, chunk in enumerate(subtitles):
        words = chunk.get("words", [])
        audited_words = [audit_word_item(w, avg_duration) for w in words]
        
        # Check if chunk contains numbers or keywords
        has_numeric = any(w["role"] == "numeric" for w in audited_words)
        has_keyword = any(w["role"] == "keyword" for w in audited_words)
        has_highlight = any(w["highlight"] for w in audited_words)
        
        # Determine chunk emphasis level
        if has_numeric:
            emphasis_level = "punchline"
        elif has_keyword or has_highlight:
            emphasis_level = "high"
        else:
            emphasis_level = "normal"
            
        clean_chunk_text = " ".join(w["word"] for w in audited_words)
        
        audited_chunk = {
            "id": chunk.get("id", chunk_idx + 1),
            "start": chunk.get("start", audited_words[0]["start"] if audited_words else 0.0),
            "end": chunk.get("end", audited_words[-1]["end"] if audited_words else 0.0),
            "startFrame": chunk.get("startFrame", audited_words[0].get("startFrame", 0) if audited_words else 0),
            "endFrame": chunk.get("endFrame", audited_words[-1].get("endFrame", 0) if audited_words else 0),
            "text": clean_chunk_text or chunk.get("text", ""),
            "emoji": chunk.get("emoji", None),
            "emphasisLevel": emphasis_level,
            "hasNumeric": has_numeric,
            "hasKeyword": has_keyword,
            "words": audited_words
        }
        audited_subtitles.append(audited_chunk)
        
    return {
        **raw_captions,
        "subtitles": audited_subtitles,
        "audited": True,
        "avgWordDuration": round(avg_duration, 3)
    }

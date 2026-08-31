from __future__ import annotations

from typing import Any, Dict, List


class TranslationService:
    @staticmethod
    def prefill(subtitles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        result: List[Dict[str, Any]] = []
        for sub in subtitles:
            out = dict(sub)
            if "translation" not in out:
                out["translation"] = ""
            result.append(out)
        return result

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx

OPENCODE_BASE_URL = os.environ.get("STUDIO_OPENCODE_BASE_URL", "http://localhost:4096")
OPENCODE_API_KEY = os.environ.get("STUDIO_OPENCODE_API_KEY", "")
CATALOG_TIMEOUT = 10.0


class OpenCodeCatalog:
    def __init__(
        self,
        base_url: str = OPENCODE_BASE_URL,
        api_key: str = OPENCODE_API_KEY,
    ) -> None:
        self.base_url = base_url
        self.api_key = api_key

    def _headers(self) -> Dict[str, str]:
        h: Dict[str, str] = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    def fetch_providers(self) -> List[Dict[str, Any]]:
        try:
            with httpx.Client(
                base_url=self.base_url,
                headers=self._headers(),
                timeout=CATALOG_TIMEOUT,
            ) as client:
                resp = client.get("/provider")
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []

        all_providers: List[Dict[str, Any]] = data.get("all", [])
        connected: List[str] = data.get("connected", [])
        connected_set = set(connected) if connected else {p.get("id", "") for p in all_providers}

        results: List[Dict[str, Any]] = []
        for provider in all_providers:
            pid = provider.get("id", "")
            if pid not in connected_set:
                continue
            models: List[Dict[str, Any]] = provider.get("models", [])
            for model in models:
                mid = model.get("id", "")
                display = model.get("name") or f"{provider.get('name', pid)} / {mid}"
                results.append(
                    {
                        "providerID": pid,
                        "modelID": mid,
                        "displayName": display,
                        "providerName": provider.get("name", pid),
                    }
                )
        return results


_catalog_instance: Optional[OpenCodeCatalog] = None


def get_catalog() -> OpenCodeCatalog:
    global _catalog_instance
    if _catalog_instance is None:
        _catalog_instance = OpenCodeCatalog()
    return _catalog_instance

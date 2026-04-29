import json
import logging
from pathlib import Path
from typing import Optional

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)
_LOCAL_FILE = Path("./data/app_settings.json")


class AppSettingsRepository:
    TABLE = "app_settings"

    def __init__(self):
        self._db = get_supabase()

    def _read_local(self) -> Optional[dict]:
        try:
            if _LOCAL_FILE.exists():
                return json.loads(_LOCAL_FILE.read_text(encoding="utf-8"))
        except Exception:
            logger.warning("Could not read local settings file")
        return None

    def _write_local(self, data: dict) -> None:
        try:
            _LOCAL_FILE.parent.mkdir(parents=True, exist_ok=True)
            _LOCAL_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except Exception:
            logger.warning("Could not write local settings file")

    async def get(self) -> Optional[dict]:
        if not self._db:
            return self._read_local()
        result = self._db.table(self.TABLE).select("*").eq("id", True).limit(1).execute()
        return result.data[0] if result.data else None

    async def upsert(self, provider: str, model: str, audio: dict | None = None) -> dict:
        payload = {
            "id": True,
            "default_llm_provider": provider,
            "default_llm_model": model,
        }
        if audio is not None:
            payload["audio"] = audio
        if not self._db:
            existing = self._read_local() or {}
            merged = {**existing, **payload}
            self._write_local(merged)
            return merged
        result = self._db.table(self.TABLE).upsert(payload).execute()
        return result.data[0] if result.data else payload


app_settings_repo = AppSettingsRepository()

from typing import Optional

from app.db.supabase_client import get_supabase


class AppSettingsRepository:
    TABLE = "app_settings"

    def __init__(self):
        self._db = get_supabase()

    async def get(self) -> Optional[dict]:
        if not self._db:
            return None
        result = self._db.table(self.TABLE).select("*").eq("id", True).limit(1).execute()
        return result.data[0] if result.data else None

    async def upsert(self, provider: str, model: str) -> dict:
        if not self._db:
            return {
                "id": True,
                "default_llm_provider": provider,
                "default_llm_model": model,
            }
        payload = {
            "id": True,
            "default_llm_provider": provider,
            "default_llm_model": model,
        }
        result = self._db.table(self.TABLE).upsert(payload).execute()
        return result.data[0] if result.data else payload


app_settings_repo = AppSettingsRepository()

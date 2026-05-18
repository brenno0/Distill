import asyncio
import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)
_client: Optional[Client] = None


_PLACEHOLDER_HOSTS = {"your-project.supabase.co"}


def _is_placeholder(url: str) -> bool:
    try:
        from urllib.parse import urlparse
        return urlparse(url).hostname in _PLACEHOLDER_HOSTS
    except Exception:
        return True


def get_supabase() -> Optional[Client]:
    """
    Singleton do cliente Supabase.
    Retorna None com aviso se credenciais não estiverem configuradas ou forem placeholder,
    permitindo que o app rode em modo degradado sem banco (doc §2.3).
    """
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_anon_key or _is_placeholder(settings.supabase_url):
            logger.warning("Supabase not configured — running without persistence")
            return None
        _client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _client


class TranscriptionRepository:
    """
    CRUD para a tabela 'transcriptions' no Supabase.
    Encapsula toda interação com o banco para que serviços não
    precisem conhecer a estrutura da tabela (doc §2.3).
    """

    TABLE = "transcriptions"

    def __init__(self):
        self._db = get_supabase()

    async def create(self, data: dict) -> dict:
        if not self._db:
            return data
        result = await asyncio.to_thread(
            lambda: self._db.table(self.TABLE).insert(data).execute()
        )
        return result.data[0] if result.data else data

    async def get(self, transcription_id: str) -> Optional[dict]:
        if not self._db:
            return None
        result = await asyncio.to_thread(
            lambda: self._db.table(self.TABLE).select("*").eq("id", transcription_id).execute()
        )
        return result.data[0] if result.data else None

    async def list(self, limit: int = 50, q: str | None = None) -> list[dict]:
        if not self._db:
            return []
        def _query():
            q_builder = (
                self._db.table(self.TABLE)
                .select("id,title,transcription_type,status,summary,created_at")
                .order("created_at", desc=True)
                .limit(limit)
            )
            if q:
                term = f"%{q}%"
                q_builder = q_builder.or_(f"title.ilike.{term},text.ilike.{term}")
            return q_builder.execute()
        result = await asyncio.to_thread(_query)
        return result.data or []

    async def update(self, transcription_id: str, data: dict) -> Optional[dict]:
        if not self._db:
            return data
        from datetime import datetime
        data["updated_at"] = datetime.utcnow().isoformat()
        result = await asyncio.to_thread(
            lambda: self._db.table(self.TABLE).update(data).eq("id", transcription_id).execute()
        )
        return result.data[0] if result.data else None

    async def delete(self, transcription_id: str) -> bool:
        if not self._db:
            return True
        result = await asyncio.to_thread(
            lambda: self._db.table(self.TABLE).delete().eq("id", transcription_id).execute()
        )
        return bool(result.data)


transcription_repo = TranscriptionRepository()

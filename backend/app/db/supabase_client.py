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
        result = self._db.table(self.TABLE).insert(data).execute()
        return result.data[0] if result.data else data

    async def get(self, transcription_id: str) -> Optional[dict]:
        if not self._db:
            return None
        result = (
            self._db.table(self.TABLE)
            .select("*")
            .eq("id", transcription_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def list(self, limit: int = 50) -> list[dict]:
        if not self._db:
            return []
        result = (
            self._db.table(self.TABLE)
            .select("id,title,transcription_type,status,summary,created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def update(self, transcription_id: str, data: dict) -> Optional[dict]:
        if not self._db:
            return data
        from datetime import datetime
        data["updated_at"] = datetime.utcnow().isoformat()
        result = (
            self._db.table(self.TABLE)
            .update(data)
            .eq("id", transcription_id)
            .execute()
        )
        return result.data[0] if result.data else None


transcription_repo = TranscriptionRepository()

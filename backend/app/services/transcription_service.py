import logging
from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.services.summary_service import summary_service
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo
from app.db import library_repository
from app.models.transcription import TranscriptionStatus

logger = logging.getLogger(__name__)


class TranscriptionService:
    """
    Pipeline completo de transcrição: Whisper → ChromaDB → Supabase (doc §3.2, §3.7).
    Isola toda a lógica de negócio e acesso ao banco dos endpoints.
    """

    async def process(self, transcription_id: str, audio_path: str) -> None:
        async def send(event: str, data: dict):
            await ws_manager.send(transcription_id, event, data)

        try:
            await transcription_repo.update(
                transcription_id, {"status": TranscriptionStatus.PROCESSING}
            )
            result = await whisper_processor.transcribe(
                audio_path=audio_path,
                transcription_id=transcription_id,
                progress_callback=send,
            )
            await kb_manager.ingest_transcription(
                transcription_id=transcription_id,
                text=result["text"],
                metadata={"type": "meeting", "audio_path": audio_path},
            )
            summary = ""
            try:
                summary = await summary_service.generate(result["text"])
            except Exception:
                logger.exception("Summary generation failed for %s", transcription_id)

            payload = {"status": TranscriptionStatus.COMPLETED, "text": result["text"]}
            if summary:
                payload["summary"] = summary
            await transcription_repo.update(
                transcription_id,
                payload,
            )
            record = await transcription_repo.get(transcription_id)
            await library_repository.library_repo.upsert_item_for_transcription(
                transcription_id=transcription_id,
                display_name=record.get("title") or transcription_id,
                thumbnail_url=record.get("thumbnail_url"),
            )
            await send("pipeline_complete", {"transcription_id": transcription_id})
        except Exception as e:
            await transcription_repo.update(
                transcription_id, {"status": TranscriptionStatus.FAILED}
            )
            await send("pipeline_error", {"transcription_id": transcription_id, "error": str(e)})

    async def get(self, transcription_id: str) -> dict | None:
        return await transcription_repo.get(transcription_id)

    async def list(self, limit: int = 50) -> list[dict]:
        return await transcription_repo.list(limit=limit)

    async def delete(self, transcription_id: str) -> dict:
        chunks = kb_manager.delete_transcription(transcription_id)
        deleted = await transcription_repo.delete(transcription_id)
        return {"deleted_chunks": chunks, "deleted": deleted}


transcription_service = TranscriptionService()

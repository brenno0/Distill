from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo
from app.models.transcription import TranscriptionStatus


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
            await transcription_repo.update(
                transcription_id,
                {"status": TranscriptionStatus.COMPLETED, "text": result["text"]},
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
        await transcription_repo.update(transcription_id, {"status": "deleted"})
        return {"deleted_chunks": chunks}


transcription_service = TranscriptionService()

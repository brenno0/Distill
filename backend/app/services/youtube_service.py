import logging
import uuid
from app.services.youtube_processor import youtube_processor
from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.services.summary_service import summary_service
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo
from app.db.library_repository import library_repo
from app.models.transcription import TranscriptionType, TranscriptionStatus


class YouTubeService:
    """
    Pipeline YouTube: yt-dlp → Whisper → ChromaDB → Supabase (doc §3.6, §4 Fluxo 2).
    Isola toda a lógica de negócio e acesso ao banco dos endpoints.
    """

    async def create_job(self, url: str) -> str:
        """Cria o registro no banco antes de iniciar o processamento background."""
        transcription_id = str(uuid.uuid4())
        await transcription_repo.create({
            "id": transcription_id,
            "title": f"YouTube {transcription_id[:8]}",
            "transcription_type": TranscriptionType.YOUTUBE,
            "status": TranscriptionStatus.PENDING,
            "metadata": {"url": url},
        })
        return transcription_id

    async def process(self, url: str, transcription_id: str) -> None:
        async def send(event: str, data: dict):
            await ws_manager.send(transcription_id, event, data)

        try:
            audio_info = await youtube_processor.extract_audio(url, progress_callback=send)
            result = await whisper_processor.transcribe(
                audio_path=audio_info["audio_path"],
                transcription_id=transcription_id,
                progress_callback=send,
            )

            # Save text immediately — KB/summary failures must not block this
            await transcription_repo.update(
                transcription_id,
                {
                    "status": TranscriptionStatus.COMPLETED,
                    "text": result["text"],
                    "title": audio_info["title"],
                },
            )

            try:
                await kb_manager.ingest_transcription(
                    transcription_id=transcription_id,
                    text=result["text"],
                    metadata={"type": "youtube", "url": url, "title": audio_info["title"]},
                )
            except Exception:
                logging.exception("KB ingestion failed for %s", transcription_id)

            summary = ""
            try:
                summary = await summary_service.generate(result["text"])
            except Exception:
                logging.exception("Summary generation failed for %s", transcription_id)

            if summary:
                await transcription_repo.update(transcription_id, {"summary": summary})

            try:
                await library_repo.upsert_item_for_transcription(
                    transcription_id=transcription_id,
                    display_name=audio_info["title"],
                    thumbnail_url=audio_info.get("thumbnail_url"),
                )
            except Exception:
                logging.exception("Library upsert failed for %s", transcription_id)

            await send("pipeline_complete", {"transcription_id": transcription_id})
        except Exception as e:
            logging.exception("YouTube pipeline error for %s", transcription_id)
            await transcription_repo.update(
                transcription_id, {"status": TranscriptionStatus.FAILED}
            )
            await send("pipeline_error", {"error": str(e)})


youtube_service = YouTubeService()

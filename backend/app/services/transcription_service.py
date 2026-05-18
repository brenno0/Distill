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
            record = await transcription_repo.get(transcription_id)
            existing_metadata = (record or {}).get("metadata") or {}
            metadata = dict(existing_metadata)
            
            # For meetings with mic/monitor paths, transcribe separately
            if (
                record
                and record.get("transcription_type") == "meeting"
                and metadata.get("mic_audio_path")
                and metadata.get("monitor_audio_path")
            ):
                try:
                    mic_result = await whisper_processor.transcribe(
                        audio_path=metadata["mic_audio_path"],
                        transcription_id=transcription_id,
                        progress_callback=None,
                    )
                    monitor_result = await whisper_processor.transcribe(
                        audio_path=metadata["monitor_audio_path"],
                        transcription_id=transcription_id,
                        progress_callback=None,
                    )
                    
                    mic_speaker = metadata.get("mic_speaker_name", "Brenno")
                    monitor_speaker = metadata.get("monitor_speaker_name", "Outros")
                    
                    mic_segments = [
                        {**s, "speaker": mic_speaker, "speaker_type": "local"}
                        for s in mic_result.get("segments", [])
                    ]
                    monitor_segments = [
                        {**s, "speaker": monitor_speaker, "speaker_type": "remote"}
                        for s in monitor_result.get("segments", [])
                    ]
                    
                    merged = sorted(mic_segments + monitor_segments, key=lambda s: s.get("start", 0))
                    full_text = " ".join(s.get("text", "").strip() for s in merged)
                    
                    result = {
                        "text": full_text,
                        "segments": merged,
                        "language": mic_result.get("language", "pt"),
                    }
                except Exception as e:
                    logger.exception("Mic/monitor transcription failed, falling back to mixed: %s", e)
                    result = await whisper_processor.transcribe(
                        audio_path=audio_path,
                        transcription_id=transcription_id,
                        progress_callback=send,
                    )
            else:
                result = await whisper_processor.transcribe(
                    audio_path=audio_path,
                    transcription_id=transcription_id,
                    progress_callback=send,
                )
            
            metadata["segments"] = result.get("segments", [])

            warnings: list[str] = []

            # Save text immediately — KB/summary failures must not block this
            await transcription_repo.update(
                transcription_id,
                {
                    "status": TranscriptionStatus.COMPLETED,
                    "text": result["text"],
                    "metadata": metadata,
                },
            )

            try:
                await kb_manager.ingest_transcription(
                    transcription_id=transcription_id,
                    text=result["text"],
                    metadata={"type": "meeting", "audio_path": audio_path},
                )
            except Exception:
                logger.exception("KB ingestion failed for %s", transcription_id)
                warnings.append("kb_failed")

            summary = ""
            try:
                summary = await summary_service.generate(result["text"])
            except Exception:
                logger.exception("Summary generation failed for %s", transcription_id)
                warnings.append("summary_failed")

            if summary:
                await transcription_repo.update(transcription_id, {"summary": summary})

            try:
                await library_repository.library_repo.upsert_item_for_transcription(
                    transcription_id=transcription_id,
                    display_name=(record or {}).get("title") or transcription_id,
                    thumbnail_url=(record or {}).get("thumbnail_url"),
                )
            except Exception:
                logger.exception("Library upsert failed for %s", transcription_id)
                warnings.append("library_failed")

            if warnings:
                await transcription_repo.update(
                    transcription_id, {"metadata": {**metadata, "post_processing_warnings": warnings}}
                )

            await send("pipeline_complete", {"transcription_id": transcription_id, "warnings": warnings})
        except Exception as e:
            from datetime import datetime as _dt
            record = await transcription_repo.get(transcription_id)
            existing_meta = (record or {}).get("metadata") or {}
            error_log = list(existing_meta.get("error_log") or [])
            error_log.append({
                "timestamp": _dt.utcnow().isoformat(),
                "error": str(e),
            })
            await transcription_repo.update(
                transcription_id,
                {
                    "status": TranscriptionStatus.FAILED,
                    "metadata": {**existing_meta, "error_message": str(e), "error_log": error_log},
                },
            )
            await send("pipeline_error", {"transcription_id": transcription_id, "error": str(e)})

    async def retry(self, transcription_id: str, audio_path: str) -> None:
        record = await transcription_repo.get(transcription_id)
        existing_meta = (record or {}).get("metadata") or {}
        cleaned_meta = {k: v for k, v in existing_meta.items() if k not in ("error_message",)}
        await transcription_repo.update(
            transcription_id,
            {"status": TranscriptionStatus.PENDING, "metadata": cleaned_meta},
        )
        await self.process(transcription_id, audio_path)

    async def get(self, transcription_id: str) -> dict | None:
        record = await transcription_repo.get(transcription_id)
        if not record:
            return None
        metadata = record.get("metadata") or {}
        segments = metadata.get("segments") if isinstance(metadata, dict) else None
        if segments is not None:
            return {**record, "segments": segments}
        return record

    async def update(self, transcription_id: str, data: dict) -> dict | None:
        return await transcription_repo.update(transcription_id, data)

    async def list(self, limit: int = 50, q: str | None = None) -> list[dict]:
        return await transcription_repo.list(limit=limit, q=q)

    async def delete(self, transcription_id: str) -> dict:
        chunks = kb_manager.delete_transcription(transcription_id)
        deleted = await transcription_repo.delete(transcription_id)
        return {"deleted_chunks": chunks, "deleted": deleted}


transcription_service = TranscriptionService()

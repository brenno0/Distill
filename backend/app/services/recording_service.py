import asyncio
import uuid
from app.services.audio_recorder import AudioRecorder
from app.services.streaming_transcriber import streaming_transcriber
from app.db.supabase_client import transcription_repo
from app.db.app_settings_repository import app_settings_repo
from app.models.transcription import TranscriptionType, TranscriptionStatus


class RecordingService:
    """
    Orquestra AudioRecorder + TranscriptionRepository (doc §3.1).
    Isola a lógica de negócio e acesso ao banco dos endpoints.
    """

    def __init__(self) -> None:
        self._recorder: AudioRecorder | None = None
        self._transcription_id: str | None = None
        self._background_tasks: dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()

    async def start(self) -> dict:
        async with self._lock:
            if self._recorder is not None:
                raise RuntimeError("Already recording")
            transcription_id = str(uuid.uuid4())
            input_device = None
            monitor_source_name = None
            mic_speaker_name = "Você"
            try:
                persisted = await app_settings_repo.get()
                audio_cfg = (persisted or {}).get("audio", {}) or {}
                input_device = audio_cfg.get("input_device")
                monitor_source_name = audio_cfg.get("monitor_source_name")
                mic_speaker_name = audio_cfg.get("mic_speaker_name") or "Você"
            except Exception:
                pass
            self._recorder = AudioRecorder(
                input_device=input_device,
                monitor_source_name=monitor_source_name,
            )
            self._transcription_id = transcription_id
            audio_path = self._recorder.start_recording()
            streaming_transcriber.start(
                recorder=self._recorder,
                transcription_id=transcription_id,
                mic_speaker=mic_speaker_name,
                monitor_speaker="Remoto",
            )
            await transcription_repo.create({
                "id": transcription_id,
                "title": f"Recording {transcription_id[:8]}",
                "transcription_type": TranscriptionType.MEETING,
                "status": TranscriptionStatus.PENDING,
                "audio_path": audio_path,
            })
            return {
                "transcription_id": transcription_id,
                "audio_path": audio_path,
                "message": "Recording started",
            }

    async def stop(self) -> dict:
        async with self._lock:
            if not self._recorder:
                raise RuntimeError("Not recording")
            transcription_id = self._transcription_id
            audio_path = self._recorder.stop_recording()
            streaming_transcriber.stop()

            mic_path = self._recorder.get_mic_output_path()
            monitor_path = self._recorder.get_monitor_output_path()

            metadata = {}
            if mic_path:
                metadata["mic_audio_path"] = mic_path
            if monitor_path:
                metadata["monitor_audio_path"] = monitor_path

            persisted = await app_settings_repo.get()
            audio_cfg = (persisted or {}).get("audio", {}) or {}
            mic_speaker_name = audio_cfg.get("mic_speaker_name") or "Você"

            if metadata:
                metadata["mic_speaker_name"] = mic_speaker_name
                metadata["monitor_speaker_name"] = "Outros"
                await transcription_repo.update(transcription_id, {"metadata": metadata})

            self._recorder = None
            self._transcription_id = None

            if transcription_id and audio_path:
                from app.services.transcription_service import transcription_service
                task = asyncio.create_task(
                    transcription_service.process(transcription_id, audio_path),
                    name=f"transcription-{transcription_id}",
                )
                self._background_tasks[transcription_id] = task
                task.add_done_callback(lambda t: self._background_tasks.pop(transcription_id, None))

            return {"audio_path": audio_path, "message": "Recording stopped"}

    def level(self) -> dict:
        if not self._recorder:
            return {"level": 0.0, "mic_level": 0.0, "monitor_level": 0.0}
        mic = self._recorder.get_audio_level()
        mon = self._recorder.get_monitor_level()
        return {"level": mic, "mic_level": mic, "monitor_level": mon}

    async def shutdown(self) -> None:
        """Cancel all pending transcription tasks on app shutdown."""
        for task in list(self._background_tasks.values()):
            task.cancel()
        if self._background_tasks:
            await asyncio.gather(*self._background_tasks.values(), return_exceptions=True)
        self._background_tasks.clear()


recording_service = RecordingService()

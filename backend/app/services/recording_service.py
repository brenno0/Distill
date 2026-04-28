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

    _recorder: AudioRecorder | None = None
    _transcription_id: str | None = None
    _background_tasks: set = set()

    async def start(self) -> dict:
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
        mic_speaker_name = audio_cfg.get("mic_speaker_name") or "Brenno"
        
        if metadata:
            metadata["mic_speaker_name"] = mic_speaker_name
            metadata["monitor_speaker_name"] = "Outros"
            await transcription_repo.update(transcription_id, {"metadata": metadata})
        
        self._recorder = None
        self._transcription_id = None
        if transcription_id and audio_path:
            from app.services.transcription_service import transcription_service
            task = asyncio.create_task(transcription_service.process(transcription_id, audio_path))
            self._background_tasks.add(task)
            task.add_done_callback(self._background_tasks.discard)
        return {"audio_path": audio_path, "message": "Recording stopped"}

    def level(self) -> dict:
        if not self._recorder:
            return {"level": 0.0, "mic_level": 0.0, "monitor_level": 0.0}
        mic = self._recorder.get_audio_level()
        mon = self._recorder.get_monitor_level()
        return {"level": mic, "mic_level": mic, "monitor_level": mon}


recording_service = RecordingService()

import uuid
from app.services.audio_recorder import AudioRecorder
from app.db.supabase_client import transcription_repo
from app.db.app_settings_repository import app_settings_repo
from app.models.transcription import TranscriptionType, TranscriptionStatus


class RecordingService:
    """
    Orquestra AudioRecorder + TranscriptionRepository (doc §3.1).
    Isola a lógica de negócio e acesso ao banco dos endpoints.
    """

    _recorder: AudioRecorder | None = None

    async def start(self) -> dict:
        transcription_id = str(uuid.uuid4())
        input_device = None
        try:
            persisted = await app_settings_repo.get()
            audio_cfg = persisted.get("audio", {}) or {}
            input_device = audio_cfg.get("input_device")
        except Exception:
            pass
        self._recorder = AudioRecorder(input_device=input_device)
        audio_path = self._recorder.start_recording()
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
        audio_path = self._recorder.stop_recording()
        self._recorder = None
        return {"audio_path": audio_path, "message": "Recording stopped"}

    def level(self) -> dict:
        if not self._recorder:
            return {"level": 0.0}
        return {"level": self._recorder.get_audio_level()}


recording_service = RecordingService()

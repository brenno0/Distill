import uuid
from app.services.audio_recorder import audio_recorder
from app.db.supabase_client import transcription_repo
from app.models.transcription import TranscriptionType, TranscriptionStatus


class RecordingService:
    """
    Orquestra AudioRecorder + TranscriptionRepository (doc §3.1).
    Isola a lógica de negócio e acesso ao banco dos endpoints.
    """

    async def start(self) -> dict:
        transcription_id = str(uuid.uuid4())
        audio_path = audio_recorder.start_recording()
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
        audio_path = audio_recorder.stop_recording()
        return {"audio_path": audio_path, "message": "Recording stopped"}

    def level(self) -> dict:
        return {"level": audio_recorder.get_audio_level()}


recording_service = RecordingService()

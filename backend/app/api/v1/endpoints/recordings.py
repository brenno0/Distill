from fastapi import APIRouter, HTTPException
from app.services.recording_service import recording_service
from app.models.transcription import StartRecordingResponse

router = APIRouter()


@router.post("/start", response_model=StartRecordingResponse)
async def start_recording():
    try:
        return await recording_service.start()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/stop")
async def stop_recording():
    try:
        return await recording_service.stop()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/level")
async def audio_level():
    return recording_service.level()

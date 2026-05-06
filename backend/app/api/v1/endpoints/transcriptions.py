from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from app.models.transcription import ProcessRequest, TranscriptionListItem
from app.services.transcription_service import transcription_service

router = APIRouter()


class RenameRequest(BaseModel):
    title: str


@router.post("/process")
async def process_transcription(request: ProcessRequest, background_tasks: BackgroundTasks):
    record = await transcription_service.get(request.transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    background_tasks.add_task(
        transcription_service.process,
        transcription_id=request.transcription_id,
        audio_path=record.get("audio_path", ""),
    )
    return {"message": "Transcription started", "transcription_id": request.transcription_id}


@router.post("/{transcription_id}/retry")
async def retry_transcription(transcription_id: str, background_tasks: BackgroundTasks):
    record = await transcription_service.get(transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    if record.get("status") != "failed":
        raise HTTPException(status_code=409, detail="Only failed transcriptions can be retried")
    audio_path = record.get("audio_path", "")
    background_tasks.add_task(
        transcription_service.retry,
        transcription_id=transcription_id,
        audio_path=audio_path,
    )
    return {"message": "Retry started", "transcription_id": transcription_id}


@router.get("/", response_model=list[TranscriptionListItem])
async def list_transcriptions(limit: int = 50):
    return await transcription_service.list(limit=limit)


@router.get("/{transcription_id}")
async def get_transcription(transcription_id: str):
    record = await transcription_service.get(transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return record


@router.patch("/{transcription_id}")
async def rename_transcription(transcription_id: str, request: RenameRequest):
    record = await transcription_service.update(transcription_id, {"title": request.title.strip()})
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return record


@router.delete("/{transcription_id}")
async def delete_transcription(transcription_id: str):
    return await transcription_service.delete(transcription_id)

from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.transcription import YouTubeProcessRequest
from app.services.youtube_processor import youtube_processor
from app.services.youtube_service import youtube_service

router = APIRouter()


@router.post("/process")
async def process_youtube(request: YouTubeProcessRequest, background_tasks: BackgroundTasks):
    if not youtube_processor.validate_url(request.url):
        raise HTTPException(status_code=422, detail="Invalid YouTube URL")
    transcription_id = await youtube_service.create_job(request.url)
    background_tasks.add_task(youtube_service.process, request.url, transcription_id)
    return {"transcription_id": transcription_id, "message": "YouTube processing started"}

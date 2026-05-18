import os
import mimetypes
from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from app.models.transcription import ProcessRequest, TranscriptionListItem
from app.services.transcription_service import transcription_service

router = APIRouter()


class SegmentUpdate(BaseModel):
    text: str
    start: float
    end: float
    speaker: str | None = None


class UpdateTranscriptionRequest(BaseModel):
    title: str | None = None
    speaker_map: dict[str, str] | None = None
    segments: list[SegmentUpdate] | None = None


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
async def list_transcriptions(limit: int = 50, q: str | None = None):
    return await transcription_service.list(limit=limit, q=q)


@router.get("/{transcription_id}")
async def get_transcription(transcription_id: str):
    record = await transcription_service.get(transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return record


@router.patch("/{transcription_id}")
async def update_transcription(transcription_id: str, request: UpdateTranscriptionRequest):
    existing = await transcription_service.get(transcription_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Transcription not found")
    data: dict = {}
    if request.title is not None:
        data["title"] = request.title.strip()
    if request.speaker_map is not None or request.segments is not None:
        existing_meta = existing.get("metadata") or {}
        meta_update: dict = {**existing_meta}
        if request.speaker_map is not None:
            meta_update["speaker_map"] = request.speaker_map
        if request.segments is not None:
            meta_update["segments"] = [s.model_dump() for s in request.segments]
        data["metadata"] = meta_update
    if not data:
        return existing
    record = await transcription_service.update(transcription_id, data)
    return record


@router.get("/{transcription_id}/audio")
async def get_transcription_audio(transcription_id: str, request: Request):
    record = await transcription_service.get(transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    audio_path = record.get("audio_path") or (record.get("metadata") or {}).get("audio_path")
    if not audio_path or not os.path.isfile(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")

    file_size = os.path.getsize(audio_path)
    mime = mimetypes.guess_type(audio_path)[0] or "audio/mpeg"
    range_header = request.headers.get("range")

    if range_header:
        try:
            start_str, end_str = range_header.replace("bytes=", "").split("-")
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
        except ValueError:
            raise HTTPException(status_code=416, detail="Invalid Range header")
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iter_file():
            with open(audio_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(65536, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=mime,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "audio",
                "Content-Length": str(chunk_size),
            },
        )

    def iter_full():
        with open(audio_path, "rb") as f:
            while chunk := f.read(65536):
                yield chunk

    return StreamingResponse(
        iter_full(),
        media_type=mime,
        headers={"Accept-Ranges": "audio", "Content-Length": str(file_size)},
    )


@router.delete("/{transcription_id}")
async def delete_transcription(transcription_id: str):
    return await transcription_service.delete(transcription_id)

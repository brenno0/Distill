from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid


class TranscriptionType(str, Enum):
    MEETING = "meeting"
    YOUTUBE = "youtube"


class TranscriptionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Transcription(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    transcription_type: TranscriptionType
    status: TranscriptionStatus = TranscriptionStatus.PENDING
    text: Optional[str] = None
    summary: Optional[str] = None
    audio_path: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict = Field(default_factory=dict)


class TranscriptionListItem(BaseModel):
    id: str
    title: str
    transcription_type: TranscriptionType
    status: TranscriptionStatus
    summary: Optional[str] = None
    created_at: datetime


class StartRecordingResponse(BaseModel):
    transcription_id: str
    audio_path: str
    message: str


class ProcessRequest(BaseModel):
    transcription_id: str
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"
    integrations: list[str] = Field(default_factory=list)


class YouTubeProcessRequest(BaseModel):
    url: str
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"
    integrations: list[str] = Field(default_factory=list)


class AgentChatRequest(BaseModel):
    message: str
    transcription_id: Optional[str] = None
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"


class AgentChatResponse(BaseModel):
    response: str
    steps: list[dict] = Field(default_factory=list)

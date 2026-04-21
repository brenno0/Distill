# Distill Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o backend Python (FastAPI) do Distill — app desktop de gravação, transcrição com Whisper, resumo com LLMs e RAG sobre transcrições persistidas.

**Architecture:** FastAPI expondo REST + WebSocket em `localhost:8000`. Electron spawna o uvicorn ao abrir o app e mata ao fechar. Supabase/PostgreSQL para metadados de transcrições **e todas as configurações do usuário, incluindo API keys** — o usuário configura tudo pela interface do app. ChromaDB local para embeddings RAG. Poetry para gerenciamento de dependências e ambiente virtual. `.env` contém apenas as credenciais bootstrap do Supabase (URL + anon key) e configs de infraestrutura que não mudam em runtime (Whisper model, temp dir).

**Tech Stack:** Python 3.11+, Poetry, FastAPI, uvicorn, supabase-py, chromadb, openai-whisper, sounddevice, yt-dlp (subprocess), langchain, langgraph, ollama SDK, openai SDK, anthropic SDK, google-generativeai, pydantic-settings

**Fonte da arquitetura:** `docs/Documentos do projeto/Estrutura da arquitetura.md` e `Documentação de arquitetura.md`

---

## Estrutura de Arquivos (fiel à documentação)

```
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── recordings.py         # POST /start, /stop, GET /level
│   │   │   │   ├── transcriptions.py     # POST /process, GET /list, GET /{id}
│   │   │   │   ├── youtube.py            # POST /process
│   │   │   │   ├── ollama.py             # GET /status, /models, POST /start, /stop
│   │   │   │   ├── agent.py              # POST /chat
│   │   │   │   ├── settings.py           # GET /, PUT /
│   │   │   │   └── ws.py                 # WebSocket /ws/{client_id}
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                     # pydantic-settings + keyring
│   │   └── ws_manager.py                 # WebSocket connection manager
│   ├── services/
│   │   ├── __init__.py
│   │   ├── audio_recorder.py             # sounddevice — doc §3.1
│   │   ├── whisper_processor.py          # Whisper large-v3 CUDA — doc §3.2
│   │   ├── llm_manager.py                # Multi-provider LLM — doc §3.3
│   │   ├── ollama_service_manager.py     # Ciclo de vida Ollama — doc §3.4
│   │   ├── agent_orchestrator.py         # LangChain/LangGraph — doc §3.5
│   │   ├── integration_manager.py        # Tools: Obsidian/Notion/Slack/Email/Whisper/YTDLP — doc §3.5
│   │   ├── youtube_processor.py          # yt-dlp subprocess — doc §3.6
│   │   └── knowledge_base_manager.py     # ChromaDB RAG — doc §3.7
│   ├── models/
│   │   ├── __init__.py
│   │   ├── transcription.py
│   │   └── settings.py
│   ├── db/
│   │   ├── __init__.py
│   │   └── supabase_client.py
│   ├── __init__.py
│   └── main.py
├── tests/
│   ├── unit/
│   │   ├── __init__.py
│   │   ├── test_config.py
│   │   ├── test_llm_manager.py
│   │   ├── test_ollama_service_manager.py
│   │   ├── test_whisper_processor.py
│   │   ├── test_youtube_processor.py
│   │   ├── test_knowledge_base_manager.py
│   │   └── test_integration_manager.py
│   ├── integration/
│   │   ├── __init__.py
│   │   └── test_api.py
│   └── __init__.py
├── pyproject.toml
├── .env.example
└── Dockerfile
```

---

## Task 1: Estrutura do projeto + Poetry

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: todos os `__init__.py`

- [ ] **Step 1: Criar estrutura de diretórios**

```bash
cd '/run/media/brennor/799656b0-7b4f-416b-b13f-b344b5a61d3b/@home/brenno/Documentos/Trabalho/Pessoais/Whisper transcriptor'
mkdir -p backend/app/api/v1/endpoints
mkdir -p backend/app/core
mkdir -p backend/app/services
mkdir -p backend/app/models
mkdir -p backend/app/db
mkdir -p backend/tests/unit
mkdir -p backend/tests/integration
touch backend/app/__init__.py
touch backend/app/api/__init__.py
touch backend/app/api/v1/__init__.py
touch backend/app/api/v1/endpoints/__init__.py
touch backend/app/core/__init__.py
touch backend/app/services/__init__.py
touch backend/app/models/__init__.py
touch backend/app/db/__init__.py
touch backend/tests/__init__.py
touch backend/tests/unit/__init__.py
touch backend/tests/integration/__init__.py
```

- [ ] **Step 2: Instalar Poetry (se não tiver)**

```bash
curl -sSL https://install.python-poetry.org | python3 -
# Verificar:
poetry --version
# Expected: Poetry (version 1.8.x ou superior)
```

- [ ] **Step 3: Inicializar projeto Poetry**

```bash
cd backend
poetry init --no-interaction \
  --name "distill-backend" \
  --version "1.0.0" \
  --description "Distill AI backend — transcription, summarization and RAG" \
  --python "^3.11"
```

- [ ] **Step 4: Adicionar dependências via Poetry**

```bash
# Framework e API
poetry add fastapi uvicorn[standard] websockets pydantic pydantic-settings

# Banco de dados
poetry add supabase

# IA e transcrição
poetry add openai-whisper torch torchaudio --source pytorch

# Áudio
poetry add sounddevice soundfile numpy

# Provedores LLM
poetry add ollama openai anthropic google-generativeai

# LangChain / Agente
poetry add langchain langchain-community langchain-ollama langchain-openai langchain-anthropic langchain-google-genai langgraph

# Vector DB
poetry add chromadb

# Integrações
poetry add notion-client slack-sdk

# Segurança
poetry add keyring secretstorage

# Utilitários
poetry add httpx python-dotenv

# Dev / Testes
poetry add --group dev pytest pytest-asyncio pytest-mock
```

> **Nota:** Para torch com CUDA no Arch Linux, pode ser necessário instalar manualmente:
> `poetry run pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121`

- [ ] **Step 5: Criar .env.example**

```bash
cat > .env.example << 'EOF'
# App
APP_ENV=development
TEMP_DIR=/tmp/distill

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Whisper
WHISPER_MODEL=large-v3
WHISPER_DEVICE=cuda

# Ollama
OLLAMA_BASE_URL=http://localhost:11434

# ChromaDB (local)
CHROMA_PERSIST_DIR=./data/chroma

# Paths
OBSIDIAN_VAULT_PATH=

# Integrações não-sensíveis
NOTION_DATABASE_ID=
SLACK_DEFAULT_CHANNEL=
SMTP_SERVER=
SMTP_PORT=587
SMTP_USERNAME=
EMAIL_RECIPIENTS=

# LLM padrão
DEFAULT_LLM_PROVIDER=ollama
DEFAULT_LLM_MODEL=llama3.1:8b

# API Keys — prefira keyring; .env é fallback de desenvolvimento
OPENAI_API_KEY=
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=
NOTION_API_KEY=
SLACK_BOT_TOKEN=
SMTP_PASSWORD=
EOF
```

- [ ] **Step 6: Verificar ambiente**

```bash
poetry run python --version
# Expected: Python 3.11.x
poetry run python -c "import fastapi; print(fastapi.__version__)"
# Expected: versão do fastapi instalada
```

- [ ] **Step 7: Commit**

```bash
cd backend
git init
git add .
git commit -m "feat: init backend project with poetry and directory structure"
```

---

## Task 2: core/config.py + core/ws_manager.py

**Files:**
- Create: `backend/app/core/config.py`
- Create: `backend/app/core/ws_manager.py`
- Test: `backend/tests/unit/test_config.py`

- [ ] **Step 1: Escrever teste que falha**

```python
# backend/tests/unit/test_config.py
from app.core.config import settings

def test_settings_has_bootstrap_fields():
    assert hasattr(settings, "supabase_url")
    assert hasattr(settings, "supabase_anon_key")
    assert hasattr(settings, "whisper_model")
    assert hasattr(settings, "whisper_device")
    assert hasattr(settings, "ollama_base_url")
    assert hasattr(settings, "temp_dir")
    assert hasattr(settings, "chroma_persist_dir")

def test_whisper_defaults():
    assert settings.whisper_model == "large-v3"
    assert settings.whisper_device == "cuda"

def test_ollama_default_url():
    assert settings.ollama_base_url == "http://localhost:11434"
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_config.py -v
# Expected: ModuleNotFoundError (app.core.config não existe ainda)
```

- [ ] **Step 3: Criar config.py**

```python
# backend/app/core/config.py
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Configurações bootstrap lidas do .env — apenas o que não muda em runtime
    e é necessário antes de conectar ao Supabase.
    Tudo que o usuário configura pela UI (API keys, integrações, LLM padrão)
    é armazenado no Supabase e lido via AppSettingsRepository.
    """

    # App
    app_env: str = "development"
    temp_dir: str = "/tmp/distill"

    # Supabase (bootstrap — necessário para conectar e ler o restante)
    supabase_url: str = ""
    supabase_anon_key: str = ""

    # Whisper (fixo em runtime — não muda via UI)
    whisper_model: str = "large-v3"
    whisper_device: str = "cuda"

    # Ollama base URL (pode ser overridden via UI mas tem default aqui)
    ollama_base_url: str = "http://localhost:11434"

    # ChromaDB local
    chroma_persist_dir: str = "./data/chroma"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
```

- [ ] **Step 4: Criar ws_manager.py**

```python
# backend/app/core/ws_manager.py
from fastapi import WebSocket
from typing import Dict


class WebSocketManager:
    """
    Gerencia conexões WebSocket ativas por client_id.
    Singleton compartilhado por todos os serviços para envio de progresso
    em tempo real ao frontend (doc §2.1 — WebSocket para feedback em tempo real).
    """

    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        self._connections[client_id] = websocket

    def disconnect(self, client_id: str) -> None:
        self._connections.pop(client_id, None)

    async def send(self, client_id: str, event: str, data: dict) -> None:
        """
        Envia evento para cliente específico.
        Silenciosamente remove conexões mortas para evitar acúmulo de estado.
        """
        ws = self._connections.get(client_id)
        if ws:
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, event: str, data: dict) -> None:
        dead = []
        for cid, ws in self._connections.items():
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                dead.append(cid)
        for cid in dead:
            self.disconnect(cid)


ws_manager = WebSocketManager()
```

- [ ] **Step 5: Rodar testes — confirmar verde**

```bash
poetry run pytest tests/unit/test_config.py -v
# Expected: 5 passed
```

- [ ] **Step 6: Commit**

```bash
git add app/core/ tests/unit/test_config.py
git commit -m "feat: add config with keyring support and websocket manager"
```

---

## Task 3: Pydantic models + Supabase client

**Files:**
- Create: `backend/app/models/transcription.py`
- Create: `backend/app/models/settings.py`
- Create: `backend/app/db/supabase_client.py`

- [ ] **Step 1: Criar models/transcription.py**

```python
# backend/app/models/transcription.py
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


# --- Request/Response models para endpoints ---

class StartRecordingResponse(BaseModel):
    transcription_id: str
    audio_path: str
    message: str


class ProcessRequest(BaseModel):
    transcription_id: str
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"
    # integrações a executar após transcrição: ["obsidian", "email", "slack", "notion"]
    integrations: list[str] = Field(default_factory=list)


class YouTubeProcessRequest(BaseModel):
    url: str
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"
    integrations: list[str] = Field(default_factory=list)


class AgentChatRequest(BaseModel):
    message: str
    # transcription_id filtra o RAG para uma transcrição específica (doc §3.7)
    transcription_id: Optional[str] = None
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"


class AgentChatResponse(BaseModel):
    response: str
    steps: list[dict] = Field(default_factory=list)
```

- [ ] **Step 2: Criar models/settings.py**

```python
# backend/app/models/settings.py
from pydantic import BaseModel
from typing import Optional


class LLMConfig(BaseModel):
    # doc §2.1.4 — configuração de provedor/modelo/contexto
    provider: str = "ollama"
    model: str = "llama3.1:8b"
    context_size: int = 16384


class IntegrationsConfig(BaseModel):
    # doc §2.4 — todas as integrações configuráveis pelo usuário via UI
    obsidian_vault_path: Optional[str] = None
    notion_database_id: Optional[str] = None
    slack_default_channel: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    email_recipients: list[str] = []


class SecretsConfig(BaseModel):
    """
    API keys configuradas pelo usuário via UI e armazenadas no Supabase.
    Campos opcionais: None significa não configurado.
    """
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    notion_api_key: Optional[str] = None
    slack_bot_token: Optional[str] = None
    smtp_password: Optional[str] = None


class AppSettingsUpdate(BaseModel):
    llm: Optional[LLMConfig] = None
    integrations: Optional[IntegrationsConfig] = None
    secrets: Optional[SecretsConfig] = None
    theme: Optional[str] = None  # "auto" | "dark" | "light"


class AppSettingsResponse(BaseModel):
    """
    Retorna a configuração completa para o frontend exibir/editar na tela de Settings.
    Inclui os valores das API keys — o frontend precisa deles para pre-popular os campos.
    """
    llm: LLMConfig
    integrations: IntegrationsConfig
    secrets: SecretsConfig
    theme: str = "auto"
```

- [ ] **Step 3: Criar db/supabase_client.py**

```python
# backend/app/db/supabase_client.py
import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)
_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    """
    Singleton do cliente Supabase.
    Retorna None com aviso se credenciais não estiverem configuradas,
    permitindo que o app rode em modo degradado sem banco (doc §2.3).
    """
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_anon_key:
            logger.warning("Supabase not configured — running without persistence")
            return None
        _client = create_client(settings.supabase_url, settings.supabase_anon_key)
    return _client


class TranscriptionRepository:
    """
    CRUD para a tabela 'transcriptions' no Supabase.
    Encapsula toda interação com o banco para que serviços não
    precisem conhecer a estrutura da tabela (doc §2.3).
    """

    TABLE = "transcriptions"

    def __init__(self):
        self._db = get_supabase()

    async def create(self, data: dict) -> dict:
        if not self._db:
            return data
        result = self._db.table(self.TABLE).insert(data).execute()
        return result.data[0] if result.data else data

    async def get(self, transcription_id: str) -> Optional[dict]:
        if not self._db:
            return None
        result = (
            self._db.table(self.TABLE)
            .select("*")
            .eq("id", transcription_id)
            .execute()
        )
        return result.data[0] if result.data else None

    async def list(self, limit: int = 50) -> list[dict]:
        if not self._db:
            return []
        result = (
            self._db.table(self.TABLE)
            .select("id,title,transcription_type,status,summary,created_at")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def update(self, transcription_id: str, data: dict) -> Optional[dict]:
        if not self._db:
            return data
        from datetime import datetime
        data["updated_at"] = datetime.utcnow().isoformat()
        result = (
            self._db.table(self.TABLE)
            .update(data)
            .eq("id", transcription_id)
            .execute()
        )
        return result.data[0] if result.data else None


transcription_repo = TranscriptionRepository()
```

- [ ] **Step 4: Commit**

```bash
git add app/models/ app/db/
git commit -m "feat: add pydantic models and supabase repository"
```

---

## Task 4: services/audio_recorder.py

**Doc ref:** §3.1 — `sounddevice`, captura 16kHz mono, notifica WebSocket

**Files:**
- Create: `backend/app/services/audio_recorder.py`
- Test: `backend/tests/unit/test_audio_recorder.py` (implícito — sem mock de hardware é suficiente testar a interface)

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_audio_recorder.py
import pytest
import numpy as np
from unittest.mock import patch, MagicMock
from app.services.audio_recorder import AudioRecorder


def test_start_returns_wav_path():
    recorder = AudioRecorder()
    mock_stream = MagicMock()
    with patch("sounddevice.InputStream", return_value=mock_stream):
        path = recorder.start_recording()
    assert path.endswith(".wav")
    assert "meeting_" in path


def test_cannot_start_while_recording():
    recorder = AudioRecorder()
    with patch("sounddevice.InputStream", return_value=MagicMock()):
        recorder.start_recording()
        with pytest.raises(RuntimeError, match="Already recording"):
            recorder.start_recording()


def test_cannot_stop_if_not_recording():
    recorder = AudioRecorder()
    with pytest.raises(RuntimeError, match="Not recording"):
        recorder.stop_recording()


def test_audio_level_zero_without_frames():
    recorder = AudioRecorder()
    assert recorder.get_audio_level() == 0.0
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_audio_recorder.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar audio_recorder.py**

```python
# backend/app/services/audio_recorder.py
import uuid
import os
import numpy as np
import sounddevice as sd
import soundfile as sf
from pathlib import Path
from app.core.config import settings


class AudioRecorder:
    """
    Grava áudio do microfone a 16kHz mono via sounddevice (doc §3.1).
    16kHz mono é o formato nativo do Whisper large-v3 — evita resampling
    e reduz uso de VRAM durante a inferência.
    """

    SAMPLE_RATE = 16000
    CHANNELS = 1

    def __init__(self):
        self.is_recording = False
        self._frames: list[np.ndarray] = []
        self._stream: sd.InputStream | None = None
        self._output_path: str = ""

    def start_recording(self) -> str:
        """
        Inicia stream contínuo via callback.
        Retorna o caminho onde o WAV será salvo ao chamar stop_recording().
        """
        if self.is_recording:
            raise RuntimeError("Already recording")

        self.is_recording = True
        self._frames = []
        Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
        self._output_path = os.path.join(
            settings.temp_dir, f"meeting_{uuid.uuid4().hex[:8]}.wav"
        )

        def _callback(indata: np.ndarray, frames: int, time, status) -> None:
            if self.is_recording:
                self._frames.append(indata.copy())

        self._stream = sd.InputStream(
            samplerate=self.SAMPLE_RATE,
            channels=self.CHANNELS,
            callback=_callback,
            dtype=np.float32,
        )
        self._stream.start()
        return self._output_path

    def stop_recording(self) -> str:
        """
        Para o stream, concatena todos os frames gravados e salva WAV.
        Retorna o caminho do arquivo final.
        """
        if not self.is_recording:
            raise RuntimeError("Not recording")

        self.is_recording = False
        self._stream.stop()
        self._stream.close()
        self._stream = None

        if self._frames:
            audio_data = np.concatenate(self._frames, axis=0)
            sf.write(self._output_path, audio_data, self.SAMPLE_RATE)

        return self._output_path

    def get_audio_level(self) -> float:
        """Nível RMS do frame mais recente — usado pelo VU meter do frontend."""
        if not self._frames:
            return 0.0
        return float(np.sqrt(np.mean(self._frames[-1] ** 2)))


audio_recorder = AudioRecorder()
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_audio_recorder.py -v
# Expected: 4 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/audio_recorder.py tests/unit/test_audio_recorder.py
git commit -m "feat: add audio recorder with sounddevice (doc §3.1)"
```

---

## Task 5: services/whisper_processor.py

**Doc ref:** §3.2 — Whisper large-v3, GPU CUDA, progresso via WebSocket, envia para knowledge_base_manager após transcrição

**Files:**
- Create: `backend/app/services/whisper_processor.py`
- Test: `backend/tests/unit/test_whisper_processor.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_whisper_processor.py
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.whisper_processor import WhisperProcessor


@pytest.mark.asyncio
async def test_transcribe_returns_expected_keys():
    processor = WhisperProcessor()
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {
        "text": "Olá mundo",
        "segments": [],
        "language": "pt",
    }
    with patch.object(processor, "_load_model", return_value=mock_model):
        result = await processor.transcribe("/tmp/test.wav", "id123")

    assert result["text"] == "Olá mundo"
    assert result["id"] == "id123"
    assert result["language"] == "pt"
    assert "transcribed_at" in result


@pytest.mark.asyncio
async def test_transcribe_fires_progress_callbacks():
    processor = WhisperProcessor()
    mock_model = MagicMock()
    mock_model.transcribe.return_value = {"text": "ok", "segments": [], "language": "pt"}
    events: list[str] = []

    async def cb(event: str, data: dict):
        events.append(event)

    with patch.object(processor, "_load_model", return_value=mock_model):
        await processor.transcribe("/tmp/test.wav", "id1", progress_callback=cb)

    assert "transcription_start" in events
    assert "transcription_complete" in events


def test_model_is_not_loaded_at_init():
    processor = WhisperProcessor()
    assert processor._model is None
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_whisper_processor.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar whisper_processor.py**

```python
# backend/app/services/whisper_processor.py
import whisper
from datetime import datetime
from typing import Callable, Optional, Awaitable
from app.core.config import settings


class WhisperProcessor:
    """
    Encapsula o Whisper large-v3 rodando na GPU via CUDA (doc §3.2).
    Carregamento lazy: o modelo (~6GB VRAM) só é carregado na primeira
    chamada a transcribe(), não na inicialização do servidor.
    """

    def __init__(self):
        self._model: whisper.Whisper | None = None

    def _load_model(self) -> whisper.Whisper:
        """Carrega e cacheia o modelo Whisper. Chamadas subsequentes reutilizam."""
        if self._model is None:
            self._model = whisper.load_model(
                settings.whisper_model,
                device=settings.whisper_device,
            )
        return self._model

    async def transcribe(
        self,
        audio_path: str,
        transcription_id: str,
        progress_callback: Optional[Callable[[str, dict], Awaitable[None]]] = None,
    ) -> dict:
        """
        Transcreve áudio para texto e retorna resultado com metadados.
        fp16=True na GPU reduz VRAM pela metade sem perda perceptível de qualidade.
        O progress_callback envia eventos ao WebSocket do frontend (doc §3.2).
        """
        model = self._load_model()

        if progress_callback:
            await progress_callback(
                "transcription_start",
                {"id": transcription_id, "progress": 0},
            )

        result = model.transcribe(
            audio_path,
            fp16=(settings.whisper_device == "cuda"),
            verbose=False,
        )

        if progress_callback:
            await progress_callback(
                "transcription_complete",
                {
                    "id": transcription_id,
                    "progress": 100,
                    "preview": result["text"][:200],
                },
            )

        return {
            "id": transcription_id,
            "text": result["text"],
            "segments": result.get("segments", []),
            "language": result.get("language", "pt"),
            "transcribed_at": datetime.utcnow().isoformat(),
        }


whisper_processor = WhisperProcessor()
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_whisper_processor.py -v
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/whisper_processor.py tests/unit/test_whisper_processor.py
git commit -m "feat: add whisper processor with lazy GPU loading (doc §3.2)"
```

---

## Task 6: services/llm_manager.py

**Doc ref:** §3.3 — interface unificada para Ollama/Gemini/OpenAI/Anthropic, seleção dinâmica de provedor/modelo

**Files:**
- Create: `backend/app/services/llm_manager.py`
- Test: `backend/tests/unit/test_llm_manager.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_llm_manager.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.llm_manager import LLMManager, OllamaProvider


def test_get_provider_raises_for_unknown_provider():
    mgr = LLMManager()
    with pytest.raises(ValueError, match="not supported"):
        mgr.get_provider("unknown", "model")


def test_get_provider_returns_ollama_instance():
    mgr = LLMManager()
    provider = mgr.get_provider("ollama", "llama3.1:8b")
    assert isinstance(provider, OllamaProvider)
    assert provider.model == "llama3.1:8b"


def test_get_provider_uses_context_size():
    mgr = LLMManager()
    provider = mgr.get_provider("ollama", "llama3.1:8b", context_size=32768)
    assert provider.context_size == 32768


def test_list_providers():
    mgr = LLMManager()
    providers = mgr.list_providers()
    assert set(providers) == {"ollama", "openai", "gemini", "anthropic"}


@pytest.mark.asyncio
async def test_ollama_generate():
    provider = OllamaProvider(model="llama3.1:8b")
    mock_response = MagicMock()
    mock_response.message.content = "Resposta gerada"
    with patch.object(provider._client, "chat", new=AsyncMock(return_value=mock_response)):
        result = await provider.generate("Olá")
    assert result == "Resposta gerada"
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_llm_manager.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar llm_manager.py**

```python
# backend/app/services/llm_manager.py
from typing import AsyncGenerator
from app.core.config import settings, get_secret


class LLMProvider:
    """
    Interface base que todos os provedores implementam (doc §3.3).
    Garante que o agent_orchestrator e outros serviços possam trocar
    de provedor sem mudanças de código.
    """

    async def generate(self, prompt: str, system: str = "") -> str:
        raise NotImplementedError

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        raise NotImplementedError
        yield  # torna a função um gerador assíncrono válido

    def get_available_models(self) -> list[str]:
        raise NotImplementedError


class OllamaProvider(LLMProvider):
    """
    Provedor Ollama local (doc §3.3).
    context_size é configurável por request — doc §2.1.4 exige que o usuário
    possa definir num_ctx para modelos como llama3.1:8b (padrão 16384).
    """

    def __init__(self, model: str, context_size: int = 16384):
        import ollama
        self._client = ollama.AsyncClient(host=settings.ollama_base_url)
        self.model = model
        self.context_size = context_size

    def _messages(self, prompt: str, system: str) -> list[dict]:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        return msgs

    async def generate(self, prompt: str, system: str = "") -> str:
        response = await self._client.chat(
            model=self.model,
            messages=self._messages(prompt, system),
            options={"num_ctx": self.context_size},
        )
        return response.message.content

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        async for chunk in await self._client.chat(
            model=self.model,
            messages=self._messages(prompt, system),
            stream=True,
            options={"num_ctx": self.context_size},
        ):
            if chunk.message.content:
                yield chunk.message.content

    def get_available_models(self) -> list[str]:
        return []  # lista dinâmica via ollama_service_manager.list_models()


class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o", api_key: str = ""):
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=api_key or get_secret("OPENAI_API_KEY"))
        self.model = model

    async def generate(self, prompt: str, system: str = "") -> str:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        resp = await self._client.chat.completions.create(model=self.model, messages=msgs)
        return resp.choices[0].message.content

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        async for chunk in await self._client.chat.completions.create(
            model=self.model, messages=msgs, stream=True
        ):
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_available_models(self) -> list[str]:
        return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]


class GeminiProvider(LLMProvider):
    def __init__(self, model: str = "gemini-2.0-flash", api_key: str = ""):
        import google.generativeai as genai
        genai.configure(api_key=api_key or get_secret("GOOGLE_API_KEY"))
        self._genai = genai
        self.model = model

    async def generate(self, prompt: str, system: str = "") -> str:
        m = self._genai.GenerativeModel(self.model, system_instruction=system or None)
        resp = await m.generate_content_async(prompt)
        return resp.text

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        m = self._genai.GenerativeModel(self.model, system_instruction=system or None)
        async for chunk in await m.generate_content_async(prompt, stream=True):
            if chunk.text:
                yield chunk.text

    def get_available_models(self) -> list[str]:
        return ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"]


class AnthropicProvider(LLMProvider):
    def __init__(self, model: str = "claude-sonnet-4-6", api_key: str = ""):
        import anthropic
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key or get_secret("ANTHROPIC_API_KEY")
        )
        self.model = model

    async def generate(self, prompt: str, system: str = "") -> str:
        resp = await self._client.messages.create(
            model=self.model,
            max_tokens=8096,
            system=system or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        async with self._client.messages.stream(
            model=self.model,
            max_tokens=8096,
            system=system or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        ) as s:
            async for text in s.text_stream:
                yield text

    def get_available_models(self) -> list[str]:
        return ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]


class LLMManager:
    """
    Fábrica central de provedores LLM (doc §3.3).
    Ponto único de criação para que o restante do sistema não importe SDKs diretamente.
    """

    _PROVIDERS = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
        "anthropic": AnthropicProvider,
    }

    def get_provider(
        self,
        provider: str,
        model: str,
        context_size: int = 16384,
        api_key: str = "",
    ) -> LLMProvider:
        if provider not in self._PROVIDERS:
            raise ValueError(
                f"Provider '{provider}' not supported. Choose from: {list(self._PROVIDERS.keys())}"
            )
        if provider == "ollama":
            return OllamaProvider(model=model, context_size=context_size)
        return self._PROVIDERS[provider](model=model, api_key=api_key)

    def list_providers(self) -> list[str]:
        return list(self._PROVIDERS.keys())


llm_manager = LLMManager()
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_llm_manager.py -v
# Expected: 5 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/llm_manager.py tests/unit/test_llm_manager.py
git commit -m "feat: add multi-provider LLM manager with unified interface (doc §3.3)"
```

---

## Task 7: services/ollama_service_manager.py

**Doc ref:** §3.4 — iniciar/parar `ollama serve`, listar modelos locais, carregar modelos

**Files:**
- Create: `backend/app/services/ollama_service_manager.py`
- Test: `backend/tests/unit/test_ollama_service_manager.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_ollama_service_manager.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ollama_service_manager import OllamaServiceManager


@pytest.mark.asyncio
async def test_is_running_true_when_200():
    mgr = OllamaServiceManager()
    mock_resp = MagicMock(status_code=200)
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient", return_value=mock_client):
        assert await mgr.is_running() is True


@pytest.mark.asyncio
async def test_is_running_false_on_connection_error():
    mgr = OllamaServiceManager()
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(side_effect=Exception("refused"))
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient", return_value=mock_client):
        assert await mgr.is_running() is False


@pytest.mark.asyncio
async def test_list_models_returns_structured_list():
    mgr = OllamaServiceManager()
    mock_resp = MagicMock()
    mock_resp.json.return_value = {
        "models": [
            {"name": "llama3.1:8b", "size": 4661224960},
            {"name": "qwen2.5-coder:7b-instruct", "size": 4685829120},
        ]
    }
    mock_client = AsyncMock()
    mock_client.get = AsyncMock(return_value=mock_resp)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with patch("httpx.AsyncClient", return_value=mock_client):
        models = await mgr.list_models()

    assert len(models) == 2
    assert models[0]["name"] == "llama3.1:8b"
    assert "size_gb" in models[0]
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_ollama_service_manager.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar ollama_service_manager.py**

```python
# backend/app/services/ollama_service_manager.py
import subprocess
import asyncio
import httpx
from app.core.config import settings


class OllamaServiceManager:
    """
    Gerencia o processo ollama serve e a listagem de modelos locais (doc §3.4).
    httpx é usado para verificar saúde do serviço porque o SDK ollama-python
    não expõe health check sem fazer uma inferência real.
    """

    async def is_running(self) -> bool:
        """Verifica se o serviço Ollama está respondendo."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.ollama_base_url}/api/tags", timeout=2.0
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def start(self) -> bool:
        """
        Inicia ollama serve como processo background.
        Polling de 1s por até 15s para confirmar que o serviço subiu.
        """
        if await self.is_running():
            return True

        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        for _ in range(15):
            await asyncio.sleep(1)
            if await self.is_running():
                return True
        return False

    async def stop(self) -> bool:
        """Para o serviço via SIGTERM."""
        subprocess.run(["pkill", "-f", "ollama serve"], capture_output=True)
        await asyncio.sleep(1)
        return not await self.is_running()

    async def list_models(self) -> list[dict]:
        """
        Lista modelos baixados localmente (doc §2.1.3 — detecção dinâmica).
        Retorna lista vazia se o serviço estiver parado — evita crash no frontend.
        """
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.ollama_base_url}/api/tags", timeout=5.0
                )
                data = resp.json()
                return [
                    {
                        "name": m["name"],
                        "size_gb": round(m.get("size", 0) / 1e9, 1),
                    }
                    for m in data.get("models", [])
                ]
        except Exception:
            return []


ollama_manager = OllamaServiceManager()
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_ollama_service_manager.py -v
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/ollama_service_manager.py tests/unit/test_ollama_service_manager.py
git commit -m "feat: add ollama service manager (doc §3.4)"
```

---

## Task 8: services/youtube_processor.py

**Doc ref:** §3.6 — yt-dlp via subprocess, WAV temporário em /tmp/

**Files:**
- Create: `backend/app/services/youtube_processor.py`
- Test: `backend/tests/unit/test_youtube_processor.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_youtube_processor.py
import pytest
from unittest.mock import patch, MagicMock
from app.services.youtube_processor import YouTubeProcessor


def test_validate_url_accepts_youtube_formats():
    p = YouTubeProcessor()
    assert p.validate_url("https://www.youtube.com/watch?v=dQw4w9WgXcQ") is True
    assert p.validate_url("https://youtu.be/dQw4w9WgXcQ") is True


def test_validate_url_rejects_non_youtube():
    p = YouTubeProcessor()
    assert p.validate_url("https://vimeo.com/123") is False
    assert p.validate_url("not-a-url") is False


@pytest.mark.asyncio
async def test_extract_audio_raises_on_invalid_url():
    p = YouTubeProcessor()
    with pytest.raises(ValueError, match="Invalid YouTube URL"):
        await p.extract_audio("https://vimeo.com/123")


@pytest.mark.asyncio
async def test_extract_audio_raises_on_ytdlp_failure():
    p = YouTubeProcessor()
    mock_result = MagicMock(returncode=1, stderr="Video unavailable")
    with patch("subprocess.run", return_value=mock_result):
        with pytest.raises(RuntimeError, match="yt-dlp failed"):
            await p.extract_audio("https://www.youtube.com/watch?v=test")
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_youtube_processor.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar youtube_processor.py**

```python
# backend/app/services/youtube_processor.py
import subprocess
import uuid
import os
import re
from pathlib import Path
from typing import Callable, Optional, Awaitable
from app.core.config import settings


class YouTubeProcessor:
    """
    Extrai áudio de vídeos YouTube via yt-dlp subprocess (doc §3.6).
    yt-dlp é chamado como processo externo pois a API Python não é estável.
    O postprocessor converte para WAV 16kHz mono na mesma chamada,
    formato direto para o Whisper sem processamento adicional.
    """

    _YT_PATTERN = re.compile(
        r"(https?://)?(www\.)?(youtube\.com/watch\?v=|youtu\.be/)[\w\-]+"
    )

    def validate_url(self, url: str) -> bool:
        return bool(self._YT_PATTERN.match(url))

    async def extract_audio(
        self,
        url: str,
        progress_callback: Optional[Callable[[str, dict], Awaitable[None]]] = None,
    ) -> dict:
        """
        Extrai áudio e retorna dict com audio_path, title e transcription_id.
        transcription_id é gerado aqui para rastrear toda a cadeia de processamento.
        """
        if not self.validate_url(url):
            raise ValueError(f"Invalid YouTube URL: {url}")

        Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
        uid = uuid.uuid4().hex[:8]
        template = os.path.join(settings.temp_dir, f"youtube_{uid}.%(ext)s")
        output_wav = os.path.join(settings.temp_dir, f"youtube_{uid}.wav")

        if progress_callback:
            await progress_callback("youtube_download_start", {"url": url, "progress": 0})

        result = subprocess.run(
            [
                "yt-dlp",
                "--extract-audio",
                "--audio-format", "wav",
                "--audio-quality", "0",
                "--postprocessor-args", "ffmpeg:-ar 16000 -ac 1",
                "--output", template,
                "--no-playlist",
                url,
            ],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp failed: {result.stderr}")

        if progress_callback:
            await progress_callback(
                "youtube_download_complete", {"progress": 100, "path": output_wav}
            )

        title_result = subprocess.run(
            ["yt-dlp", "--get-title", "--no-playlist", url],
            capture_output=True,
            text=True,
        )
        title = title_result.stdout.strip() or f"YouTube Video {uid}"

        return {
            "audio_path": output_wav,
            "title": title,
            "url": url,
            "transcription_id": uid,
        }


youtube_processor = YouTubeProcessor()
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_youtube_processor.py -v
# Expected: 4 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/youtube_processor.py tests/unit/test_youtube_processor.py
git commit -m "feat: add youtube audio extractor via yt-dlp (doc §3.6)"
```

---

## Task 9: services/knowledge_base_manager.py

**Doc ref:** §3.7 — ChromaDB, embeddings Ollama (nomic-embed-text), filtragem por transcription_id

**Files:**
- Create: `backend/app/services/knowledge_base_manager.py`
- Test: `backend/tests/unit/test_knowledge_base_manager.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_knowledge_base_manager.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.knowledge_base_manager import KnowledgeBaseManager


@pytest.mark.asyncio
async def test_ingest_returns_positive_chunk_count():
    mgr = KnowledgeBaseManager()
    mock_col = MagicMock()
    mock_col.add = MagicMock()
    mock_emb = MagicMock()
    mock_emb.aembed_documents = AsyncMock(return_value=[[0.1] * 768] * 3)

    with patch.object(mgr, "_get_collection", return_value=mock_col):
        with patch.object(mgr, "_get_embeddings", return_value=mock_emb):
            count = await mgr.ingest_transcription(
                "t1", "texto longo. " * 200, {"type": "meeting"}
            )

    assert count > 0
    assert mock_col.add.called


@pytest.mark.asyncio
async def test_query_filters_by_transcription_id():
    mgr = KnowledgeBaseManager()
    mock_col = MagicMock()
    mock_col.query.return_value = {
        "documents": [["trecho relevante"]],
        "metadatas": [[{"transcription_id": "t1"}]],
        "distances": [[0.15]],
    }
    mock_emb = MagicMock()
    mock_emb.aembed_query = AsyncMock(return_value=[0.1] * 768)

    with patch.object(mgr, "_get_collection", return_value=mock_col):
        with patch.object(mgr, "_get_embeddings", return_value=mock_emb):
            results = await mgr.query("pergunta", transcription_id="t1")

    where_arg = mock_col.query.call_args[1]["where"]
    assert where_arg == {"transcription_id": "t1"}
    assert results[0]["text"] == "trecho relevante"
    assert results[0]["score"] == pytest.approx(0.85, abs=0.01)


@pytest.mark.asyncio
async def test_query_without_filter_passes_none():
    mgr = KnowledgeBaseManager()
    mock_col = MagicMock()
    mock_col.query.return_value = {
        "documents": [[]], "metadatas": [[]], "distances": [[]]
    }
    mock_emb = MagicMock()
    mock_emb.aembed_query = AsyncMock(return_value=[0.1] * 768)

    with patch.object(mgr, "_get_collection", return_value=mock_col):
        with patch.object(mgr, "_get_embeddings", return_value=mock_emb):
            await mgr.query("busca global")

    where_arg = mock_col.query.call_args[1]["where"]
    assert where_arg is None
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_knowledge_base_manager.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar knowledge_base_manager.py**

```python
# backend/app/services/knowledge_base_manager.py
import chromadb
from typing import Optional
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from app.core.config import settings


class KnowledgeBaseManager:
    """
    Armazenamento e recuperação semântica de transcrições via ChromaDB (doc §3.7).
    OllamaEmbeddings usa nomic-embed-text local — sem dependência de API externa.
    A filtragem por transcription_id é o mecanismo do RAG contextualizado (doc §3.5):
    permite responder sobre uma gravação específica sem misturar contexto de outras.
    chunk_size=1000 / overlap=200: balanceia contexto preservado vs. tamanho de embedding.
    """

    def __init__(self):
        self._client: chromadb.PersistentClient | None = None
        self._collection: chromadb.Collection | None = None
        self._embeddings: OllamaEmbeddings | None = None
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def _get_collection(self) -> chromadb.Collection:
        if self._client is None:
            self._client = chromadb.PersistentClient(path=settings.chroma_persist_dir)
            self._collection = self._client.get_or_create_collection(
                name="transcriptions",
                metadata={"hnsw:space": "cosine"},
            )
        return self._collection

    def _get_embeddings(self) -> OllamaEmbeddings:
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                model="nomic-embed-text",
                base_url=settings.ollama_base_url,
            )
        return self._embeddings

    async def ingest_transcription(
        self, transcription_id: str, text: str, metadata: dict
    ) -> int:
        """
        Divide transcrição em chunks, gera embeddings e persiste no ChromaDB.
        O transcription_id nos metadados de cada chunk é o que permite filtragem posterior.
        """
        collection = self._get_collection()
        embedder = self._get_embeddings()
        chunks = self._splitter.split_text(text)

        ids = [f"{transcription_id}_c{i}" for i in range(len(chunks))]
        metas = [
            {**metadata, "transcription_id": transcription_id, "chunk_index": i}
            for i in range(len(chunks))
        ]
        embeddings = await embedder.aembed_documents(chunks)
        collection.add(ids=ids, documents=chunks, embeddings=embeddings, metadatas=metas)
        return len(chunks)

    async def query(
        self,
        query_text: str,
        transcription_id: Optional[str] = None,
        n_results: int = 5,
    ) -> list[dict]:
        """
        Busca por similaridade de cosseno.
        where=None retorna resultado global; where={"transcription_id": id} filtra por sessão.
        """
        collection = self._get_collection()
        embedder = self._get_embeddings()
        query_embedding = await embedder.aembed_query(query_text)

        where = {"transcription_id": transcription_id} if transcription_id else None
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where,
            include=["documents", "metadatas", "distances"],
        )

        return [
            {
                "text": doc,
                "metadata": meta,
                "score": round(1 - dist, 4),
            }
            for doc, meta, dist in zip(
                results["documents"][0],
                results["metadatas"][0],
                results["distances"][0],
            )
        ]

    def delete_transcription(self, transcription_id: str) -> int:
        """Remove todos os chunks de uma transcrição do ChromaDB."""
        collection = self._get_collection()
        existing = collection.get(where={"transcription_id": transcription_id})
        if existing["ids"]:
            collection.delete(ids=existing["ids"])
        return len(existing["ids"])


kb_manager = KnowledgeBaseManager()
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_knowledge_base_manager.py -v
# Expected: 3 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/knowledge_base_manager.py tests/unit/test_knowledge_base_manager.py
git commit -m "feat: add chromadb knowledge base with per-transcription RAG (doc §3.7)"
```

---

## Task 10: services/integration_manager.py

**Doc ref:** §3.5 Tools — ObsidianTool, NotionTool, SlackTool, EmailTool, **WhisperTool**, **YTDLPTool**, KnowledgeBaseQueryTool

**Files:**
- Create: `backend/app/services/integration_manager.py`
- Test: `backend/tests/unit/test_integration_manager.py`

- [ ] **Step 1: Escrever testes**

```python
# backend/tests/unit/test_integration_manager.py
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.integration_manager import ObsidianTool, EmailTool


def test_obsidian_saves_markdown_file(tmp_path):
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.obsidian_vault_path = str(tmp_path)
        tool = ObsidianTool()
        result = tool._run(title="Reunião de Planejamento", content="# Resumo\nDecisão tomada.")

    assert "Saved to Obsidian" in result
    files = list(tmp_path.glob("**/*.md"))
    assert len(files) == 1
    assert files[0].read_text() == "# Resumo\nDecisão tomada."


def test_obsidian_returns_error_when_vault_not_configured():
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.obsidian_vault_path = ""
        tool = ObsidianTool()
        result = tool._run(title="Test", content="content")

    assert "Error" in result


def test_email_returns_error_when_smtp_not_configured():
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.smtp_server = ""
        tool = EmailTool()
        result = tool._run(subject="Test", body="Body")

    assert "Error" in result


@pytest.mark.asyncio
async def test_obsidian_arun_works(tmp_path):
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.obsidian_vault_path = str(tmp_path)
        tool = ObsidianTool()
        result = await tool._arun(title="Async", content="conteúdo")

    assert "Saved to Obsidian" in result
```

- [ ] **Step 2: Rodar — confirmar falha**

```bash
poetry run pytest tests/unit/test_integration_manager.py -v
# Expected: ModuleNotFoundError
```

- [ ] **Step 3: Implementar integration_manager.py**

```python
# backend/app/services/integration_manager.py
"""
Tools do agente LangChain (doc §3.5).
Inclui as 6 tools especificadas na documentação:
ObsidianTool, NotionTool, SlackTool, EmailTool,
WhisperTool, YTDLPTool (+ KnowledgeBaseQueryTool no agent_orchestrator).
"""
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional, Type

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.core.config import settings, get_secret


# --- Input Schemas ---

class ObsidianInput(BaseModel):
    title: str = Field(description="Note title")
    content: str = Field(description="Markdown content to save")
    folder: str = Field(default="Distill", description="Subfolder within Obsidian vault")


class NotionInput(BaseModel):
    title: str = Field(description="Page title")
    content: str = Field(description="Page content")
    database_id: str = Field(default="", description="Notion database ID (uses default if empty)")


class SlackInput(BaseModel):
    message: str = Field(description="Message text (supports mrkdwn)")
    channel: str = Field(default="", description="Channel name or ID")


class EmailInput(BaseModel):
    subject: str = Field(description="Email subject")
    body: str = Field(description="Email body plain text")
    recipients: list[str] = Field(default_factory=list, description="Recipient emails")


class WhisperInput(BaseModel):
    audio_path: str = Field(description="Path to the audio WAV file to transcribe")
    transcription_id: str = Field(description="Unique ID for this transcription")


class YTDLPInput(BaseModel):
    url: str = Field(description="YouTube video URL to extract audio from")


# --- Tool Implementations ---

class ObsidianTool(BaseTool):
    """
    Salva conteúdo Markdown no Obsidian Vault configurado (doc §3.5 ObsidianTool).
    Timestamp no nome do arquivo evita colisões entre gravações do mesmo dia.
    """
    name: str = "obsidian_save"
    description: str = "Save a summary or note as a Markdown file in the user's Obsidian vault"
    args_schema: Type[BaseModel] = ObsidianInput

    def _run(self, title: str, content: str, folder: str = "Distill") -> str:
        if not settings.obsidian_vault_path:
            return "Error: Obsidian vault path not configured in settings"

        target = Path(settings.obsidian_vault_path) / folder
        target.mkdir(parents=True, exist_ok=True)

        safe = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)
        ts = datetime.now().strftime("%Y%m%d_%H%M")
        path = target / f"{ts}_{safe}.md"
        path.write_text(content, encoding="utf-8")
        return f"Saved to Obsidian: {path}"

    async def _arun(self, title: str, content: str, folder: str = "Distill") -> str:
        return self._run(title, content, folder)


class NotionTool(BaseTool):
    """
    Cria páginas no Notion (doc §3.5 NotionTool).
    Quebra conteúdo em blocos respeitando limite de 2000 chars da API Notion.
    """
    name: str = "notion_create_page"
    description: str = "Create a new page in Notion with the given title and content"
    args_schema: Type[BaseModel] = NotionInput

    def _run(self, title: str, content: str, database_id: str = "") -> str:
        from notion_client import Client
        token = get_secret("NOTION_API_KEY")
        if not token:
            return "Error: Notion API key not configured"

        db_id = database_id or settings.notion_database_id
        if not db_id:
            return "Error: Notion database ID not configured"

        client = Client(auth=token)
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        children = [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": p[:2000]}}]
                },
            }
            for p in paragraphs[:50]
        ]

        page = client.pages.create(
            parent={"database_id": db_id},
            properties={"title": {"title": [{"text": {"content": title}}]}},
            children=children,
        )
        return f"Notion page created: {page['url']}"

    async def _arun(self, title: str, content: str, database_id: str = "") -> str:
        return self._run(title, content, database_id)


class SlackTool(BaseTool):
    """
    Envia mensagens para canais Slack (doc §3.5 SlackTool).
    mrkdwn=True habilita formatação Markdown básica do Slack.
    """
    name: str = "slack_send_message"
    description: str = "Send a message to a Slack channel"
    args_schema: Type[BaseModel] = SlackInput

    def _run(self, message: str, channel: str = "") -> str:
        from slack_sdk import WebClient
        token = get_secret("SLACK_BOT_TOKEN")
        if not token:
            return "Error: Slack bot token not configured"

        target = channel or settings.slack_default_channel
        if not target:
            return "Error: Slack channel not specified"

        client = WebClient(token=token)
        resp = client.chat_postMessage(channel=target, text=message, mrkdwn=True)
        return f"Slack message sent to {target} (ts={resp['ts']})"

    async def _arun(self, message: str, channel: str = "") -> str:
        return self._run(message, channel)


class EmailTool(BaseTool):
    """
    Envia e-mails via SMTP com TLS (doc §3.5 EmailTool).
    Suporta 2-3 endereços destinatários apontando para a mesma caixa (doc §2.4.4).
    Senha SMTP recuperada do keyring — nunca armazenada em texto puro.
    """
    name: str = "email_send"
    description: str = "Send an email with the given subject and body"
    args_schema: Type[BaseModel] = EmailInput

    def _run(self, subject: str, body: str, recipients: list[str] = []) -> str:
        if not settings.smtp_server:
            return "Error: SMTP server not configured"

        to_list = recipients or settings.email_recipients_list
        if not to_list:
            return "Error: No email recipients configured"

        smtp_password = get_secret("SMTP_PASSWORD")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_username
        msg["To"] = ", ".join(to_list)
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, smtp_password)
            server.sendmail(settings.smtp_username, to_list, msg.as_string())

        return f"Email sent to: {', '.join(to_list)}"

    async def _arun(self, subject: str, body: str, recipients: list[str] = []) -> str:
        return self._run(subject, body, recipients)


class WhisperTool(BaseTool):
    """
    Tool para o agente acionar transcrição diretamente (doc §3.5 WhisperTool).
    Permite que o agente transcreva um arquivo de áudio já existente como parte
    de um fluxo de trabalho complexo orquestrado.
    """
    name: str = "whisper_transcribe"
    description: str = "Transcribe an audio file to text using Whisper large-v3"
    args_schema: Type[BaseModel] = WhisperInput

    async def _arun(self, audio_path: str, transcription_id: str) -> str:
        from app.services.whisper_processor import whisper_processor
        result = await whisper_processor.transcribe(
            audio_path=audio_path,
            transcription_id=transcription_id,
        )
        return f"Transcribed {len(result['text'])} chars. Preview: {result['text'][:300]}"

    def _run(self, audio_path: str, transcription_id: str) -> str:
        raise NotImplementedError("Use async _arun for WhisperTool")


class YTDLPTool(BaseTool):
    """
    Tool para o agente extrair áudio de URLs YouTube (doc §3.5 YTDLPTool).
    Retorna o audio_path para uso pelo WhisperTool em sequência.
    """
    name: str = "ytdlp_extract_audio"
    description: str = "Extract audio from a YouTube URL and save as WAV for transcription"
    args_schema: Type[BaseModel] = YTDLPInput

    async def _arun(self, url: str) -> str:
        from app.services.youtube_processor import youtube_processor
        result = await youtube_processor.extract_audio(url)
        return f"Audio extracted: {result['audio_path']} | Title: {result['title']} | ID: {result['transcription_id']}"

    def _run(self, url: str) -> str:
        raise NotImplementedError("Use async _arun for YTDLPTool")
```

- [ ] **Step 4: Rodar testes**

```bash
poetry run pytest tests/unit/test_integration_manager.py -v
# Expected: 4 passed
```

- [ ] **Step 5: Commit**

```bash
git add app/services/integration_manager.py tests/unit/test_integration_manager.py
git commit -m "feat: add all 6 agent tools including WhisperTool and YTDLPTool (doc §3.5)"
```

---

## Task 11: services/agent_orchestrator.py

**Doc ref:** §3.5 — LangChain/LangGraph, recebe intenção + provedor/modelo, usa tools, inclui KnowledgeBaseQueryTool

**Files:**
- Create: `backend/app/services/agent_orchestrator.py`

- [ ] **Step 1: Implementar agent_orchestrator.py**

```python
# backend/app/services/agent_orchestrator.py
from typing import Optional
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.tools import StructuredTool

from app.core.config import settings, get_secret
from app.services.integration_manager import (
    ObsidianTool, NotionTool, SlackTool, EmailTool, WhisperTool, YTDLPTool
)
from app.services.knowledge_base_manager import kb_manager

# Prompt base do agente — multilíngue, responde no idioma do usuário
SYSTEM_PROMPT = """You are Distill, a personal AI assistant for capturing and organizing knowledge from meetings and videos.

Available capabilities:
- Search through stored transcriptions to answer questions (knowledge_base_query)
- Save notes to Obsidian vault (obsidian_save)
- Create Notion pages (notion_create_page)
- Send Slack messages (slack_send_message)
- Send emails (email_send)
- Transcribe audio files (whisper_transcribe)
- Extract YouTube audio (ytdlp_extract_audio)

Always respond in the same language as the user's message.
When summarizing: capture key decisions, action items, and important facts. Be concise.
When tools fail: clearly report the error and continue with remaining tasks.
"""


class AgentOrchestrator:
    """
    Cria e executa agentes LangChain com as tools definidas em integration_manager (doc §3.5).
    Instancia um novo AgentExecutor por request — garante isolamento de histórico entre conversas.
    Usa LangChain's tool-calling agents que funcionam com todos os 4 provedores suportados.
    KnowledgeBaseQueryTool é construída inline com o transcription_id da sessão atual,
    implementando o RAG contextualizado descrito em doc §3.7.
    """

    def _get_lc_llm(self, provider: str, model: str, api_key: str = ""):
        """
        Mapeia provider/model para a classe LangChain correspondente.
        Separado do LLMManager porque LangChain exige suas próprias classes
        para integração com o framework de agentes (create_tool_calling_agent).
        """
        if provider == "ollama":
            return ChatOllama(
                model=model,
                base_url=settings.ollama_base_url,
                num_ctx=16384,
            )
        elif provider == "openai":
            return ChatOpenAI(
                model=model,
                api_key=api_key or get_secret("OPENAI_API_KEY"),
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model=model,
                api_key=api_key or get_secret("ANTHROPIC_API_KEY"),
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key or get_secret("GOOGLE_API_KEY"),
            )
        raise ValueError(f"Unknown provider: {provider}")

    def _build_tools(self, transcription_id: Optional[str] = None) -> list:
        """
        Constrói lista de tools incluindo KnowledgeBaseQueryTool contextualizada.
        transcription_id é capturado no closure para filtrar buscas no ChromaDB
        à transcrição específica selecionada pelo usuário (doc §3.7 Recuperação Contextual).
        """
        async def kb_query(query: str) -> str:
            results = await kb_manager.query(query, transcription_id=transcription_id)
            if not results:
                return "No relevant content found in the knowledge base."
            return "\n\n---\n\n".join(r["text"] for r in results)

        kb_tool = StructuredTool.from_function(
            coroutine=kb_query,
            name="knowledge_base_query",
            description=(
                "Search through stored transcriptions to answer questions about meetings and videos. "
                "Use this when the user asks about content from a specific recording."
            ),
        )

        return [
            ObsidianTool(),
            NotionTool(),
            SlackTool(),
            EmailTool(),
            WhisperTool(),
            YTDLPTool(),
            kb_tool,
        ]

    async def process(
        self,
        user_message: str,
        provider: str,
        model: str,
        transcription_id: Optional[str] = None,
        api_key: str = "",
    ) -> dict:
        """
        Executa o agente com a mensagem/intenção do usuário (doc §3.5).
        Retorna a resposta final e os passos intermediários (tool calls + resultados).
        max_iterations=10 previne loops infinitos em caso de tool failures consecutivos.
        """
        llm = self._get_lc_llm(provider, model, api_key)
        tools = self._build_tools(transcription_id)

        prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{input}"),
            MessagesPlaceholder("agent_scratchpad"),
        ])

        agent = create_tool_calling_agent(llm, tools, prompt)
        executor = AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=False,
            max_iterations=10,
            return_intermediate_steps=True,
            handle_parsing_errors=True,
        )

        result = await executor.ainvoke({"input": user_message})

        return {
            "response": result["output"],
            "steps": [
                {
                    "tool": step[0].tool,
                    "input": step[0].tool_input,
                    "output": str(step[1]),
                }
                for step in result.get("intermediate_steps", [])
            ],
        }


agent_orchestrator = AgentOrchestrator()
```

- [ ] **Step 2: Commit**

```bash
git add app/services/agent_orchestrator.py
git commit -m "feat: add langchain agent orchestrator with all 7 tools (doc §3.5)"
```

---

## Task 12: API Endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/recordings.py`
- Create: `backend/app/api/v1/endpoints/transcriptions.py`
- Create: `backend/app/api/v1/endpoints/youtube.py`
- Create: `backend/app/api/v1/endpoints/ollama.py`
- Create: `backend/app/api/v1/endpoints/agent.py`
- Create: `backend/app/api/v1/endpoints/settings.py`
- Create: `backend/app/api/v1/endpoints/ws.py`

- [ ] **Step 1: Criar recordings.py**

```python
# backend/app/api/v1/endpoints/recordings.py
import uuid
from fastapi import APIRouter, HTTPException
from app.services.audio_recorder import audio_recorder
from app.models.transcription import StartRecordingResponse, TranscriptionType, TranscriptionStatus
from app.db.supabase_client import transcription_repo

router = APIRouter()


@router.post("/start", response_model=StartRecordingResponse)
async def start_recording():
    """
    Inicia gravação de áudio. Cria registro no Supabase antes de gravar
    para garantir rastreabilidade mesmo se o app fechar durante a gravação.
    """
    try:
        transcription_id = str(uuid.uuid4())
        audio_path = audio_recorder.start_recording()
        await transcription_repo.create({
            "id": transcription_id,
            "title": f"Recording {transcription_id[:8]}",
            "transcription_type": TranscriptionType.MEETING,
            "status": TranscriptionStatus.PENDING,
            "audio_path": audio_path,
        })
        return StartRecordingResponse(
            transcription_id=transcription_id,
            audio_path=audio_path,
            message="Recording started",
        )
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/stop")
async def stop_recording():
    try:
        audio_path = audio_recorder.stop_recording()
        return {"audio_path": audio_path, "message": "Recording stopped"}
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/level")
async def audio_level():
    """Nível RMS atual — frontend faz polling a ~100ms para o VU meter."""
    return {"level": audio_recorder.get_audio_level()}
```

- [ ] **Step 2: Criar transcriptions.py**

```python
# backend/app/api/v1/endpoints/transcriptions.py
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.transcription import ProcessRequest, TranscriptionListItem, TranscriptionStatus
from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo

router = APIRouter()


async def _transcription_pipeline(transcription_id: str, audio_path: str):
    """
    Pipeline background: transcrição Whisper → ingestão ChromaDB → update Supabase.
    Progresso enviado via WebSocket usando transcription_id como client_id (doc §4 Fluxo 1).
    """
    async def send(event: str, data: dict):
        await ws_manager.send(transcription_id, event, data)

    try:
        await transcription_repo.update(transcription_id, {"status": TranscriptionStatus.PROCESSING})

        result = await whisper_processor.transcribe(
            audio_path=audio_path,
            transcription_id=transcription_id,
            progress_callback=send,
        )

        # doc §3.2: após transcrição, envia para knowledge_base_manager
        await kb_manager.ingest_transcription(
            transcription_id=transcription_id,
            text=result["text"],
            metadata={"type": "meeting", "audio_path": audio_path},
        )

        await transcription_repo.update(
            transcription_id,
            {"status": TranscriptionStatus.COMPLETED, "text": result["text"]},
        )
        await send("pipeline_complete", {"transcription_id": transcription_id})

    except Exception as e:
        await transcription_repo.update(transcription_id, {"status": TranscriptionStatus.FAILED})
        await send("pipeline_error", {"transcription_id": transcription_id, "error": str(e)})


@router.post("/process")
async def process_transcription(request: ProcessRequest, background_tasks: BackgroundTasks):
    """Inicia pipeline de transcrição em background. Progresso via WebSocket."""
    record = await transcription_repo.get(request.transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")

    background_tasks.add_task(
        _transcription_pipeline,
        transcription_id=request.transcription_id,
        audio_path=record.get("audio_path", ""),
    )
    return {"message": "Transcription started", "transcription_id": request.transcription_id}


@router.get("/", response_model=list[TranscriptionListItem])
async def list_transcriptions(limit: int = 50):
    return await transcription_repo.list(limit=limit)


@router.get("/{transcription_id}")
async def get_transcription(transcription_id: str):
    record = await transcription_repo.get(transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    return record


@router.delete("/{transcription_id}")
async def delete_transcription(transcription_id: str):
    chunks = kb_manager.delete_transcription(transcription_id)
    await transcription_repo.update(transcription_id, {"status": "deleted"})
    return {"deleted_chunks": chunks}
```

- [ ] **Step 3: Criar youtube.py**

```python
# backend/app/api/v1/endpoints/youtube.py
import uuid
from fastapi import APIRouter, HTTPException, BackgroundTasks
from app.models.transcription import YouTubeProcessRequest, TranscriptionType, TranscriptionStatus
from app.services.youtube_processor import youtube_processor
from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo

router = APIRouter()


async def _youtube_pipeline(url: str, transcription_id: str):
    """Pipeline YouTube: download yt-dlp → transcrição Whisper → ingestão KB (doc §4 Fluxo 2)."""
    async def send(event: str, data: dict):
        await ws_manager.send(transcription_id, event, data)

    try:
        audio_info = await youtube_processor.extract_audio(url, progress_callback=send)
        result = await whisper_processor.transcribe(
            audio_path=audio_info["audio_path"],
            transcription_id=transcription_id,
            progress_callback=send,
        )
        await kb_manager.ingest_transcription(
            transcription_id=transcription_id,
            text=result["text"],
            metadata={"type": "youtube", "url": url, "title": audio_info["title"]},
        )
        await transcription_repo.update(
            transcription_id,
            {
                "status": TranscriptionStatus.COMPLETED,
                "text": result["text"],
                "title": audio_info["title"],
            },
        )
        await send("pipeline_complete", {"transcription_id": transcription_id})
    except Exception as e:
        await transcription_repo.update(transcription_id, {"status": TranscriptionStatus.FAILED})
        await send("pipeline_error", {"error": str(e)})


@router.post("/process")
async def process_youtube(request: YouTubeProcessRequest, background_tasks: BackgroundTasks):
    if not youtube_processor.validate_url(request.url):
        raise HTTPException(status_code=422, detail="Invalid YouTube URL")

    transcription_id = str(uuid.uuid4())
    await transcription_repo.create({
        "id": transcription_id,
        "title": f"YouTube {transcription_id[:8]}",
        "transcription_type": TranscriptionType.YOUTUBE,
        "status": TranscriptionStatus.PENDING,
        "metadata": {"url": request.url},
    })
    background_tasks.add_task(_youtube_pipeline, request.url, transcription_id)
    return {"transcription_id": transcription_id, "message": "YouTube processing started"}
```

- [ ] **Step 4: Criar ollama.py**

```python
# backend/app/api/v1/endpoints/ollama.py
from fastapi import APIRouter
from app.services.ollama_service_manager import ollama_manager

router = APIRouter()


@router.get("/status")
async def ollama_status():
    return {"running": await ollama_manager.is_running()}


@router.post("/start")
async def start_ollama():
    success = await ollama_manager.start()
    return {"success": success, "running": success}


@router.post("/stop")
async def stop_ollama():
    success = await ollama_manager.stop()
    return {"success": success, "running": not success}


@router.get("/models")
async def list_models():
    """Lista modelos Ollama disponíveis para o frontend popular o dropdown (doc §2.1.3)."""
    return {"models": await ollama_manager.list_models()}
```

- [ ] **Step 5: Criar agent.py**

```python
# backend/app/api/v1/endpoints/agent.py
from fastapi import APIRouter, HTTPException
from app.models.transcription import AgentChatRequest, AgentChatResponse
from app.services.agent_orchestrator import agent_orchestrator

router = APIRouter()


@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest):
    """
    Chat com o agente RAG (doc §4 Fluxo 3).
    Se transcription_id fornecido, o KB filtra para aquela transcrição específica.
    """
    try:
        result = await agent_orchestrator.process(
            user_message=request.message,
            provider=request.llm_provider,
            model=request.llm_model,
            transcription_id=request.transcription_id,
        )
        return AgentChatResponse(response=result["response"], steps=result["steps"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
```

- [ ] **Step 6: Criar settings.py**

```python
# backend/app/api/v1/endpoints/settings.py
from fastapi import APIRouter
from app.models.settings import AppSettingsUpdate, AppSettingsResponse, LLMConfig, IntegrationsConfig
from app.core.config import settings as app_settings, set_secret, get_secret

router = APIRouter()


@router.get("/", response_model=AppSettingsResponse)
async def get_settings():
    """
    Retorna configurações. API keys retornam apenas flag de presença (bool),
    nunca o valor — previne exposição via devtools ou logs (doc §3.4 Segurança).
    """
    return AppSettingsResponse(
        llm=LLMConfig(
            provider=app_settings.default_llm_provider,
            model=app_settings.default_llm_model,
        ),
        integrations=IntegrationsConfig(
            obsidian_vault_path=app_settings.obsidian_vault_path or None,
            notion_database_id=app_settings.notion_database_id or None,
            slack_default_channel=app_settings.slack_default_channel or None,
            smtp_server=app_settings.smtp_server or None,
            smtp_port=app_settings.smtp_port,
            smtp_username=app_settings.smtp_username or None,
            email_recipients=app_settings.email_recipients_list,
        ),
        has_openai_key=bool(get_secret("OPENAI_API_KEY")),
        has_google_key=bool(get_secret("GOOGLE_API_KEY")),
        has_anthropic_key=bool(get_secret("ANTHROPIC_API_KEY")),
        has_notion_key=bool(get_secret("NOTION_API_KEY")),
        has_slack_token=bool(get_secret("SLACK_BOT_TOKEN")),
    )


@router.put("/")
async def update_settings(body: AppSettingsUpdate):
    """
    Credenciais vão para o keyring. Configurações não-sensíveis atualizam
    o objeto settings em memória (persistem enquanto o servidor rodar).
    """
    if body.secrets:
        key_map = {
            "openai_api_key": "OPENAI_API_KEY",
            "google_api_key": "GOOGLE_API_KEY",
            "anthropic_api_key": "ANTHROPIC_API_KEY",
            "notion_api_key": "NOTION_API_KEY",
            "slack_bot_token": "SLACK_BOT_TOKEN",
            "smtp_password": "SMTP_PASSWORD",
        }
        for field, keyring_key in key_map.items():
            value = getattr(body.secrets, field, None)
            if value:
                set_secret(keyring_key, value)

    if body.integrations:
        for field, value in body.integrations.model_dump(exclude_none=True).items():
            if hasattr(app_settings, field):
                setattr(app_settings, field, value)

    if body.llm:
        app_settings.default_llm_provider = body.llm.provider
        app_settings.default_llm_model = body.llm.model

    return {"message": "Settings updated"}
```

- [ ] **Step 7: Criar ws.py**

```python
# backend/app/api/v1/endpoints/ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.ws_manager import ws_manager

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Endpoint WebSocket para progresso em tempo real (doc §2.1 WebSocket).
    O frontend conecta usando transcription_id como client_id
    para receber eventos específicos de cada operação em andamento.
    """
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            await websocket.receive_text()  # mantém conexão; recebe pings do cliente
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
```

- [ ] **Step 8: Commit**

```bash
git add app/api/
git commit -m "feat: add all REST and WebSocket endpoints"
```

---

## Task 13: main.py + Dockerfile

**Files:**
- Create: `backend/app/main.py`
- Create: `backend/Dockerfile`

- [ ] **Step 1: Criar main.py**

```python
# backend/app/main.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import recordings, transcriptions, youtube, ollama, agent, settings
from app.api.v1.endpoints.ws import router as ws_router
from app.core.config import settings as app_settings

app = FastAPI(
    title="Distill API",
    version="1.0.0",
    description="Backend para o Distill — transcrição, resumo e RAG de reuniões e vídeos",
)

# CORS aberto para localhost: o renderer do Electron opera em origem local
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recordings.router,      prefix="/api/v1/recordings",     tags=["recordings"])
app.include_router(transcriptions.router,  prefix="/api/v1/transcriptions",  tags=["transcriptions"])
app.include_router(youtube.router,         prefix="/api/v1/youtube",         tags=["youtube"])
app.include_router(ollama.router,          prefix="/api/v1/ollama",          tags=["ollama"])
app.include_router(agent.router,           prefix="/api/v1/agent",           tags=["agent"])
app.include_router(settings.router,        prefix="/api/v1/settings",        tags=["settings"])
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    """Garante que o diretório de arquivos temporários existe ao iniciar."""
    Path(app_settings.temp_dir).mkdir(parents=True, exist_ok=True)


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
```

- [ ] **Step 2: Criar Dockerfile**

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    libportaudio2 \
    portaudio19-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instala Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -
ENV PATH="/root/.local/bin:$PATH"

COPY pyproject.toml poetry.lock* ./
RUN poetry install --no-root --no-dev

COPY . .

EXPOSE 8000
CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

- [ ] **Step 3: Testar que o servidor sobe**

```bash
cd backend
cp .env.example .env
poetry run uvicorn app.main:app --port 8000 --reload
# Verificar: http://localhost:8000/health → {"status":"ok","version":"1.0.0"}
# Verificar: http://localhost:8000/docs → Swagger com todos os endpoints
```

- [ ] **Step 4: Rodar suite completa de testes**

```bash
poetry run pytest tests/ -v
# Expected: todos os testes passando
```

- [ ] **Step 5: Commit final**

```bash
git add app/main.py Dockerfile
git commit -m "feat: complete distill backend — all services, endpoints and docker"
```

---

## Supabase — Schema SQL

Execute no SQL Editor do seu projeto Supabase:

```sql
CREATE TABLE transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    transcription_type TEXT NOT NULL
        CHECK (transcription_type IN ('meeting', 'youtube')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'deleted')),
    text TEXT,
    summary TEXT,
    audio_path TEXT DEFAULT '',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transcriptions_created_at ON transcriptions(created_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transcriptions_updated_at
    BEFORE UPDATE ON transcriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

---

## REVISÃO ARQUITETURAL — Service Layer (2026-04-18)

**Problema identificado:** O plano original colocava chamadas ao `TranscriptionRepository` diretamente
nos endpoints (controllers), violando o princípio de separação de responsabilidades:
Controller → Repository (sem service no meio).

**Regra:** Transações de banco devem ficar isoladas da controller.
A camada correta é: **Controller → Service → Repository**.

**Impacto:** Tasks 4 (recordings), 12 (endpoints) e partes de transcriptions/youtube precisam de
serviços orquestradores que encapsulam lógica de negócio + DB antes de chegar aos endpoints.

### Novos arquivos (inserir entre Task 11 e Task 12)

#### Task 11b: services/recording_service.py

**Responsabilidade:** Orquestra `AudioRecorder` + `TranscriptionRepository`.
O endpoint só chama `recording_service.start()` e recebe o resultado pronto.

```python
# backend/app/services/recording_service.py
import uuid
from app.services.audio_recorder import audio_recorder
from app.db.supabase_client import transcription_repo
from app.models.transcription import TranscriptionType, TranscriptionStatus


class RecordingService:
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
```

#### Task 11c: services/transcription_service.py

**Responsabilidade:** Pipeline Whisper → ChromaDB → Supabase, notificações WebSocket.
Os endpoints só disparam a task e retornam 202.

```python
# backend/app/services/transcription_service.py
from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo
from app.models.transcription import TranscriptionStatus


class TranscriptionService:
    async def process(self, transcription_id: str, audio_path: str) -> None:
        async def send(event: str, data: dict):
            await ws_manager.send(transcription_id, event, data)

        try:
            await transcription_repo.update(
                transcription_id, {"status": TranscriptionStatus.PROCESSING}
            )
            result = await whisper_processor.transcribe(
                audio_path=audio_path,
                transcription_id=transcription_id,
                progress_callback=send,
            )
            await kb_manager.ingest_transcription(
                transcription_id=transcription_id,
                text=result["text"],
                metadata={"type": "meeting", "audio_path": audio_path},
            )
            await transcription_repo.update(
                transcription_id,
                {"status": TranscriptionStatus.COMPLETED, "text": result["text"]},
            )
            await send("pipeline_complete", {"transcription_id": transcription_id})
        except Exception as e:
            await transcription_repo.update(
                transcription_id, {"status": TranscriptionStatus.FAILED}
            )
            await send("pipeline_error", {"transcription_id": transcription_id, "error": str(e)})

    async def get(self, transcription_id: str) -> dict | None:
        return await transcription_repo.get(transcription_id)

    async def list(self, limit: int = 50) -> list[dict]:
        return await transcription_repo.list(limit=limit)

    async def delete(self, transcription_id: str) -> dict:
        chunks = kb_manager.delete_transcription(transcription_id)
        await transcription_repo.update(transcription_id, {"status": "deleted"})
        return {"deleted_chunks": chunks}


transcription_service = TranscriptionService()
```

#### Task 11d: services/youtube_service.py

**Responsabilidade:** Pipeline yt-dlp → Whisper → ChromaDB → Supabase.

```python
# backend/app/services/youtube_service.py
import uuid
from app.services.youtube_processor import youtube_processor
from app.services.whisper_processor import whisper_processor
from app.services.knowledge_base_manager import kb_manager
from app.core.ws_manager import ws_manager
from app.db.supabase_client import transcription_repo
from app.models.transcription import TranscriptionType, TranscriptionStatus


class YouTubeService:
    async def create_job(self, url: str) -> str:
        transcription_id = str(uuid.uuid4())
        await transcription_repo.create({
            "id": transcription_id,
            "title": f"YouTube {transcription_id[:8]}",
            "transcription_type": TranscriptionType.YOUTUBE,
            "status": TranscriptionStatus.PENDING,
            "metadata": {"url": url},
        })
        return transcription_id

    async def process(self, url: str, transcription_id: str) -> None:
        async def send(event: str, data: dict):
            await ws_manager.send(transcription_id, event, data)

        try:
            audio_info = await youtube_processor.extract_audio(url, progress_callback=send)
            result = await whisper_processor.transcribe(
                audio_path=audio_info["audio_path"],
                transcription_id=transcription_id,
                progress_callback=send,
            )
            await kb_manager.ingest_transcription(
                transcription_id=transcription_id,
                text=result["text"],
                metadata={"type": "youtube", "url": url, "title": audio_info["title"]},
            )
            await transcription_repo.update(
                transcription_id,
                {
                    "status": TranscriptionStatus.COMPLETED,
                    "text": result["text"],
                    "title": audio_info["title"],
                },
            )
            await send("pipeline_complete", {"transcription_id": transcription_id})
        except Exception as e:
            await transcription_repo.update(
                transcription_id, {"status": TranscriptionStatus.FAILED}
            )
            await send("pipeline_error", {"error": str(e)})


youtube_service = YouTubeService()
```

### Endpoints revisados (thin controllers)

```python
# recordings.py
@router.post("/start")
async def start_recording():
    try:
        return await recording_service.start()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))

# transcriptions.py
@router.post("/process")
async def process_transcription(request: ProcessRequest, background_tasks: BackgroundTasks):
    record = await transcription_service.get(request.transcription_id)
    if not record:
        raise HTTPException(status_code=404, detail="Transcription not found")
    background_tasks.add_task(transcription_service.process, ...)
    return {"message": "Transcription started"}

# youtube.py
@router.post("/process")
async def process_youtube(request: YouTubeProcessRequest, background_tasks: BackgroundTasks):
    if not youtube_processor.validate_url(request.url):
        raise HTTPException(status_code=422, detail="Invalid YouTube URL")
    transcription_id = await youtube_service.create_job(request.url)
    background_tasks.add_task(youtube_service.process, request.url, transcription_id)
    return {"transcription_id": transcription_id, "message": "YouTube processing started"}
```

---

## Resumo da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/recordings/start` | Inicia gravação |
| `POST` | `/api/v1/recordings/stop` | Para gravação |
| `GET` | `/api/v1/recordings/level` | Nível de áudio (VU meter) |
| `POST` | `/api/v1/transcriptions/process` | Inicia pipeline de transcrição |
| `GET` | `/api/v1/transcriptions/` | Lista transcrições |
| `GET` | `/api/v1/transcriptions/{id}` | Detalhe |
| `DELETE` | `/api/v1/transcriptions/{id}` | Remove |
| `POST` | `/api/v1/youtube/process` | Processa vídeo YouTube |
| `GET` | `/api/v1/ollama/status` | Status Ollama |
| `GET` | `/api/v1/ollama/models` | Modelos locais |
| `POST` | `/api/v1/ollama/start` | Inicia Ollama |
| `POST` | `/api/v1/ollama/stop` | Para Ollama |
| `POST` | `/api/v1/agent/chat` | Chat com agente RAG |
| `GET` | `/api/v1/settings/` | Lê configurações |
| `PUT` | `/api/v1/settings/` | Atualiza configurações |
| `WS` | `/ws/{client_id}` | Progresso em tempo real |

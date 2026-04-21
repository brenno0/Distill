---
name: distill-backend
description: Use when working on, debugging, or extending the Distill backend (FastAPI Python). Covers architecture, conventions, file structure, and how to run tests.
---

# Distill Backend

## Overview

FastAPI backend do Distill — app desktop de gravação, transcrição local com WhisperX, resumo com LLMs e RAG sobre transcrições. Roda em `localhost:8000`, spawned pelo Electron.

## Stack

- **Runtime:** Python 3.11+, Poetry, FastAPI, uvicorn
- **Transcrição:** WhisperX (local, GPU CUDA) — sem API externa
- **LLMs:** Ollama (local, padrão) + OpenAI / Gemini / Anthropic (cloud, via keyring)
- **DB:** Supabase/PostgreSQL (metadados) + ChromaDB local (embeddings RAG)
- **Agente:** LangChain + LangGraph com 7 tools

## Arquitetura — Regra fundamental

```
Controller (endpoint) → Service → Repository (DB)
```

**Nunca** colocar chamadas de banco ou lógica de negócio direto nos endpoints.

## Estrutura de arquivos

```
backend/
├── app/
│   ├── api/v1/endpoints/   # Controllers thin — só HTTP
│   │   ├── recordings.py   → recording_service
│   │   ├── transcriptions.py → transcription_service
│   │   ├── youtube.py      → youtube_service
│   │   ├── ollama.py       → ollama_manager
│   │   ├── agent.py        → agent_orchestrator
│   │   ├── settings.py     → keyring + settings in-memory
│   │   └── ws.py           → ws_manager
│   ├── core/
│   │   ├── config.py       # pydantic-settings + get_secret/set_secret (keyring)
│   │   └── ws_manager.py   # WebSocket singleton
│   ├── services/
│   │   ├── recording_service.py      # Orquestra AudioRecorder + repo
│   │   ├── transcription_service.py  # Pipeline Whisper → ChromaDB → Supabase
│   │   ├── youtube_service.py        # Pipeline yt-dlp → Whisper → ChromaDB → Supabase
│   │   ├── audio_recorder.py         # sounddevice 16kHz mono
│   │   ├── whisper_processor.py      # WhisperX lazy load (batching + align + diarize)
│   │   ├── llm_manager.py            # Fábrica: ollama/openai/gemini/anthropic
│   │   ├── ollama_service_manager.py # Ciclo de vida ollama serve
│   │   ├── agent_orchestrator.py     # LangChain agent com 7 tools
│   │   ├── integration_manager.py    # Tools: Obsidian/Notion/Slack/Email/Whisper/YTDLP
│   │   └── knowledge_base_manager.py # ChromaDB RAG (nomic-embed-text via Ollama)
│   ├── models/
│   │   ├── transcription.py  # Pydantic models + request/response schemas
│   │   └── settings.py       # LLMConfig, IntegrationsConfig, SecretsConfig
│   ├── db/
│   │   └── supabase_client.py  # TranscriptionRepository CRUD
│   └── main.py
└── tests/unit/   # 33 testes — rodar com: poetry run pytest tests/unit/ -v
```

## Providers LLM

| Provider | Onde roda | Configuração |
|----------|-----------|--------------|
| `ollama` | Local (GPU) | `OLLAMA_BASE_URL` no `.env` |
| `openai` | Cloud | keyring `OPENAI_API_KEY` |
| `gemini` | Cloud (inclui Gemma via API) | keyring `GOOGLE_API_KEY` |
| `anthropic` | Cloud | keyring `ANTHROPIC_API_KEY` |

Troca de provider/model via `PUT /api/v1/settings` — persiste em memória (e keyring para secrets).

## WhisperX

Import lazy — não falha se não instalado. Instalação manual necessária:
```bash
poetry run pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu121
poetry run pip install whisperx
```

Configurado via `.env`: `WHISPER_MODEL`, `WHISPER_DEVICE`, `WHISPER_COMPUTE_TYPE`, `WHISPER_BATCH_SIZE`, `WHISPER_ALIGN`, `WHISPER_DIARIZE`, `HF_TOKEN`.

## Secrets

API keys nunca em texto puro. Fluxo: UI → `PUT /api/v1/settings` → keyring do sistema.
Fallback de dev: campos no `.env` (nunca commitar).

## Comandos

```bash
# Testes
poetry run pytest tests/unit/ -v

# Servidor
cp .env.example .env  # preencher SUPABASE_URL + SUPABASE_ANON_KEY
poetry run uvicorn app.main:app --port 8000 --reload

# Health check
curl http://localhost:8000/health
```

## Supabase — Schema

Tabela `transcriptions` com trigger `update_updated_at`. Schema no final do plano em `docs/superpowers/plans/2026-04-17-distill-backend.md`.

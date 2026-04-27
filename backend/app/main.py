from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import recordings, transcriptions, youtube, ollama, agent, settings, library, audio, llm
from app.api.v1.endpoints.ws import router as ws_router
from app.core.config import settings as app_settings

app = FastAPI(
    title="Distill API",
    version="1.0.0",
    description="Backend para o Distill — transcrição, resumo e RAG de reuniões e vídeos",
)

# Electron renderer (production: file://, dev: Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:47822", "http://localhost:47823"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recordings.router,     prefix="/api/v1/recordings",     tags=["recordings"])
app.include_router(transcriptions.router, prefix="/api/v1/transcriptions", tags=["transcriptions"])
app.include_router(youtube.router,        prefix="/api/v1/youtube",        tags=["youtube"])
app.include_router(ollama.router,         prefix="/api/v1/ollama",         tags=["ollama"])
app.include_router(agent.router,          prefix="/api/v1/agent",          tags=["agent"])
app.include_router(settings.router,       prefix="/api/v1/settings",       tags=["settings"])
app.include_router(library.router,        prefix="/api/v1/library",        tags=["library"])
app.include_router(audio.router,        prefix="/api/v1/audio",        tags=["audio"])
app.include_router(llm.router,          prefix="/api/v1/llm",          tags=["llm"])
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    Path(app_settings.temp_dir).mkdir(parents=True, exist_ok=True)
    try:
        from app.db.migrations import run_migrations
        from app.db.app_settings_repository import app_settings_repo
        run_migrations(app_settings.database_url)
        persisted = await app_settings_repo.get()
        if persisted:
            if persisted.get("default_llm_provider"):
                app_settings.default_llm_provider = persisted["default_llm_provider"]
            if persisted.get("default_llm_model"):
                app_settings.default_llm_model = persisted["default_llm_model"]
    except Exception:
        pass  # DB not available — API still serves OpenAPI spec


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

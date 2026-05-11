import sounddevice as sd
from fastapi import APIRouter, HTTPException
from app.models.settings import AppSettingsUpdate, AppSettingsResponse, LLMConfig, IntegrationsConfig, AudioConfig
from app.core.config import settings as app_settings, set_secret, get_secret
from app.db.app_settings_repository import app_settings_repo
from app.services.whisper_processor import whisper_processor


def _validate_audio_devices(audio: AudioConfig) -> None:
    try:
        all_devs = sd.query_devices()
        valid_input_ids = {i for i, d in enumerate(all_devs) if d.get("max_input_channels", 0) > 0}
        valid_output_ids = {i for i, d in enumerate(all_devs) if d.get("max_output_channels", 0) > 0}
    except Exception:
        return  # sounddevice unavailable — skip validation

    if audio.input_device is not None and audio.input_device not in valid_input_ids:
        raise HTTPException(status_code=422, detail=f"input_device {audio.input_device} not found")
    if audio.output_device is not None and audio.output_device not in valid_output_ids:
        raise HTTPException(status_code=422, detail=f"output_device {audio.output_device} not found")

router = APIRouter()


async def _build_response() -> AppSettingsResponse:
    persisted = await app_settings_repo.get()
    audio_cfg = AudioConfig()
    if persisted and persisted.get("audio"):
        raw = persisted["audio"]
        audio_cfg = AudioConfig(
            input_device=raw.get("input_device"),
            output_device=raw.get("output_device"),
            input_device_name=raw.get("input_device_name"),
            output_device_name=raw.get("output_device_name"),
            monitor_source_name=raw.get("monitor_source_name"),
            mic_speaker_name=raw.get("mic_speaker_name"),
        )
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
        audio=audio_cfg,
    )


@router.get("/", response_model=AppSettingsResponse)
async def get_settings():
    """
    Retorna configurações. API keys retornam apenas flag de presença (bool),
    nunca o valor — previne exposição via devtools ou logs.
    """
    return await _build_response()


@router.get("/cuda")
async def get_cuda_memory():
    """CUDA memory stats. Returns zeros if CUDA unavailable or model not loaded."""
    try:
        import torch
        if not torch.cuda.is_available():
            return {"available": False, "used_mb": 0, "total_mb": 0, "free_mb": 0}
        used = torch.cuda.memory_allocated() / 1024 ** 2
        reserved = torch.cuda.memory_reserved() / 1024 ** 2
        total = torch.cuda.get_device_properties(0).total_memory / 1024 ** 2
        free = total - reserved
        return {
            "available": True,
            "used_mb": round(used),
            "reserved_mb": round(reserved),
            "total_mb": round(total),
            "free_mb": round(free),
            "model_loaded": whisper_processor._model is not None,
        }
    except Exception as e:
        return {"available": False, "used_mb": 0, "total_mb": 0, "free_mb": 0, "error": str(e)}


@router.post("/cuda/clear")
async def clear_cuda_memory():
    """Unload Whisper model and free CUDA memory."""
    whisper_processor.unload()
    return {"message": "CUDA memory cleared"}


@router.put("/", response_model=AppSettingsResponse)
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

    if body.audio is not None:
        _validate_audio_devices(body.audio)
    audio_data = body.audio.model_dump() if body.audio is not None else None

    if body.llm:
        await app_settings_repo.upsert(
            provider=body.llm.provider,
            model=body.llm.model,
            audio=audio_data,
        )
        app_settings.default_llm_provider = body.llm.provider
        app_settings.default_llm_model = body.llm.model
    elif audio_data is not None:
        persisted = await app_settings_repo.get()
        await app_settings_repo.upsert(
            provider=persisted.get("default_llm_provider", "ollama") if persisted else "ollama",
            model=persisted.get("default_llm_model", "llama3.1:8b") if persisted else "llama3.1:8b",
            audio=audio_data,
        )

    return await _build_response()

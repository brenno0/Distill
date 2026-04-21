from fastapi import APIRouter
from app.models.settings import AppSettingsUpdate, AppSettingsResponse, LLMConfig, IntegrationsConfig
from app.core.config import settings as app_settings, set_secret, get_secret

router = APIRouter()


@router.get("/", response_model=AppSettingsResponse)
async def get_settings():
    """
    Retorna configurações. API keys retornam apenas flag de presença (bool),
    nunca o valor — previne exposição via devtools ou logs.
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

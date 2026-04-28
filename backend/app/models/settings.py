from pydantic import BaseModel
from typing import Optional


class AudioConfig(BaseModel):
    input_device: int | None = None
    output_device: int | None = None
    input_device_name: str | None = None
    output_device_name: str | None = None
    monitor_source_name: str | None = None


class LLMConfig(BaseModel):
    provider: str = "ollama"
    model: str = "llama3.1:8b"
    context_size: int = 16384


class IntegrationsConfig(BaseModel):
    obsidian_vault_path: Optional[str] = None
    notion_database_id: Optional[str] = None
    slack_default_channel: Optional[str] = None
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    email_recipients: list[str] = []


class SecretsConfig(BaseModel):
    """API keys enviadas pelo usuário via UI para salvar no keyring."""
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
    audio: Optional[AudioConfig] = None


class AppSettingsResponse(BaseModel):
    """
    Retorna configuração para o frontend exibir/editar na tela de Settings.
    API keys retornam apenas flag de presença — nunca o valor bruto.
    """
    llm: LLMConfig
    integrations: IntegrationsConfig
    theme: str = "auto"
    has_openai_key: bool = False
    has_google_key: bool = False
    has_anthropic_key: bool = False
    has_notion_key: bool = False
    has_slack_token: bool = False
    audio: AudioConfig = AudioConfig()

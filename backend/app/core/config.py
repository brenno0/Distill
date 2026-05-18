import keyring
from pydantic_settings import BaseSettings, SettingsConfigDict


SERVICE_NAME = "distill"


def get_secret(key: str) -> str:
    return keyring.get_password(SERVICE_NAME, key) or ""


def set_secret(key: str, value: str) -> None:
    keyring.set_password(SERVICE_NAME, key, value)


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

    # Conexão direta ao Postgres (necessário para migrations)
    # Formato: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
    database_url: str = ""

    # WhisperX (fixo em runtime — não muda via UI)
    whisper_model: str = "large-v3"
    whisper_device: str = "cuda"
    whisper_compute_type: str = "float16"  # float16 | int8 | int8_float16
    whisper_batch_size: int = 8
    whisper_align: bool = True             # timestamps word-level
    whisper_diarize: bool = False          # requer hf_token
    hf_token: str = ""                     # HuggingFace token para diarização

    # Ollama base URL
    ollama_base_url: str = "http://localhost:11434"

    # ChromaDB local
    chroma_persist_dir: str = "./data/chroma"

    # LLM padrão (mutável em runtime via /api/v1/settings)
    default_llm_provider: str = "ollama"
    default_llm_model: str = "llama3.1:8b"

    # Integrações (mutável em runtime via /api/v1/settings)
    obsidian_vault_path: str = ""
    notion_database_id: str = ""
    slack_default_channel: str = ""
    smtp_server: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    email_recipients: str = ""  # CSV, ex: "a@b.com,c@d.com"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def email_recipients_list(self) -> list[str]:
        if not self.email_recipients:
            return []
        return [e.strip() for e in self.email_recipients.split(",") if e.strip()]


settings = Settings()

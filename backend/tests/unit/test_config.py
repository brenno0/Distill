from app.core.config import settings, Settings


def test_settings_has_bootstrap_fields():
    assert hasattr(settings, "supabase_url")
    assert hasattr(settings, "supabase_anon_key")
    assert hasattr(settings, "whisper_model")
    assert hasattr(settings, "whisper_device")
    assert hasattr(settings, "ollama_base_url")
    assert hasattr(settings, "temp_dir")
    assert hasattr(settings, "chroma_persist_dir")


def test_whisper_defaults():
    defaults = Settings(_env_file=None)
    assert defaults.whisper_model == "large-v3"
    assert defaults.whisper_device == "cuda"


def test_ollama_default_url():
    assert settings.ollama_base_url == "http://localhost:11434"


def test_default_llm_provider_is_ollama():
    assert settings.default_llm_provider == "ollama"


def test_email_recipients_list_empty_when_not_set():
    original = settings.email_recipients
    settings.email_recipients = ""
    assert settings.email_recipients_list == []
    settings.email_recipients = original


def test_email_recipients_list_parses_csv():
    original = settings.email_recipients
    settings.email_recipients = "a@b.com, c@d.com"
    assert settings.email_recipients_list == ["a@b.com", "c@d.com"]
    settings.email_recipients = original

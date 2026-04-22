from app.api.v1.endpoints import settings as settings_endpoint
from app.models.settings import AppSettingsUpdate, LLMConfig, SecretsConfig


class _FakeSettingsRepo:
    def __init__(self):
        self.calls = []

    async def upsert(self, provider: str, model: str):
        self.calls.append((provider, model))
        return {
            "id": True,
            "default_llm_provider": provider,
            "default_llm_model": model,
        }


async def test_update_settings_persists_llm_and_returns_llm_response(monkeypatch):
    fake_repo = _FakeSettingsRepo()
    monkeypatch.setattr(settings_endpoint, "app_settings_repo", fake_repo)
    monkeypatch.setattr(settings_endpoint, "get_secret", lambda _k: "")
    monkeypatch.setattr(settings_endpoint, "set_secret", lambda _k, _v: None)

    original_provider = settings_endpoint.app_settings.default_llm_provider
    original_model = settings_endpoint.app_settings.default_llm_model

    try:
        result = await settings_endpoint.update_settings(
            AppSettingsUpdate(llm=LLMConfig(provider="gemini", model="gemini-2.5-flash"))
        )
        assert fake_repo.calls == [("gemini", "gemini-2.5-flash")]
        assert result.llm.provider == "gemini"
        assert result.llm.model == "gemini-2.5-flash"
    finally:
        settings_endpoint.app_settings.default_llm_provider = original_provider
        settings_endpoint.app_settings.default_llm_model = original_model


async def test_update_settings_writes_provider_secret_to_keyring(monkeypatch):
    saved = []
    monkeypatch.setattr(settings_endpoint, "app_settings_repo", _FakeSettingsRepo())
    monkeypatch.setattr(settings_endpoint, "get_secret", lambda _k: "")
    monkeypatch.setattr(settings_endpoint, "set_secret", lambda key, value: saved.append((key, value)))

    await settings_endpoint.update_settings(
        AppSettingsUpdate(secrets=SecretsConfig(google_api_key="gk-test"))
    )

    assert saved == [("GOOGLE_API_KEY", "gk-test")]

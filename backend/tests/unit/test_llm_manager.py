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

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

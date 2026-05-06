import pytest
from unittest.mock import AsyncMock, patch
from app.services.action_items_service import ActionItemsService


@pytest.mark.asyncio
async def test_extract_returns_structured_items():
    service = ActionItemsService()
    mock_json = '[{"text": "Send report", "responsible": "Maria", "deadline": "Friday"}]'

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(return_value=mock_json)
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Maria will send the report by Friday.")

    assert len(result) == 1
    assert result[0]["text"] == "Send report"
    assert result[0]["responsible"] == "Maria"
    assert result[0]["deadline"] == "Friday"
    assert result[0]["completed"] is False
    assert "id" in result[0]


@pytest.mark.asyncio
async def test_extract_empty_text_returns_empty_list():
    service = ActionItemsService()
    result = await service.extract("")
    assert result == []


@pytest.mark.asyncio
async def test_extract_invalid_json_returns_empty_list():
    service = ActionItemsService()

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(return_value="not valid json")
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Some transcript text.")

    assert result == []


@pytest.mark.asyncio
async def test_extract_filters_items_with_empty_text():
    service = ActionItemsService()
    mock_json = '[{"text": "", "responsible": null, "deadline": null}, {"text": "Valid action", "responsible": null, "deadline": null}]'

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(return_value=mock_json)
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Some transcript.")

    assert len(result) == 1
    assert result[0]["text"] == "Valid action"


@pytest.mark.asyncio
async def test_extract_llm_exception_returns_empty_list():
    service = ActionItemsService()

    with patch("app.services.action_items_service.llm_manager") as mock_mgr:
        mock_provider = AsyncMock()
        mock_provider.generate = AsyncMock(side_effect=RuntimeError("LLM down"))
        mock_mgr.get_provider.return_value = mock_provider

        result = await service.extract("Some transcript.")

    assert result == []

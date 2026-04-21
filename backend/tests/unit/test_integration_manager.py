import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.services.integration_manager import ObsidianTool, EmailTool


def test_obsidian_saves_markdown_file(tmp_path):
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.obsidian_vault_path = str(tmp_path)
        tool = ObsidianTool()
        result = tool._run(title="Reunião de Planejamento", content="# Resumo\nDecisão tomada.")

    assert "Saved to Obsidian" in result
    files = list(tmp_path.glob("**/*.md"))
    assert len(files) == 1
    assert files[0].read_text() == "# Resumo\nDecisão tomada."


def test_obsidian_returns_error_when_vault_not_configured():
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.obsidian_vault_path = ""
        tool = ObsidianTool()
        result = tool._run(title="Test", content="content")

    assert "Error" in result


def test_email_returns_error_when_smtp_not_configured():
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.smtp_server = ""
        tool = EmailTool()
        result = tool._run(subject="Test", body="Body")

    assert "Error" in result


@pytest.mark.asyncio
async def test_obsidian_arun_works(tmp_path):
    with patch("app.services.integration_manager.settings") as mock_s:
        mock_s.obsidian_vault_path = str(tmp_path)
        tool = ObsidianTool()
        result = await tool._arun(title="Async", content="conteúdo")

    assert "Saved to Obsidian" in result

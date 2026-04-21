"""
Tools do agente LangChain (doc §3.5).
Inclui as 6 tools especificadas na documentação:
ObsidianTool, NotionTool, SlackTool, EmailTool,
WhisperTool, YTDLPTool (+ KnowledgeBaseQueryTool no agent_orchestrator).
"""
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Optional, Type

from langchain.tools import BaseTool
from pydantic import BaseModel, Field

from app.core.config import settings, get_secret


# --- Input Schemas ---

class ObsidianInput(BaseModel):
    title: str = Field(description="Note title")
    content: str = Field(description="Markdown content to save")
    folder: str = Field(default="Distill", description="Subfolder within Obsidian vault")


class NotionInput(BaseModel):
    title: str = Field(description="Page title")
    content: str = Field(description="Page content")
    database_id: str = Field(default="", description="Notion database ID (uses default if empty)")


class SlackInput(BaseModel):
    message: str = Field(description="Message text (supports mrkdwn)")
    channel: str = Field(default="", description="Channel name or ID")


class EmailInput(BaseModel):
    subject: str = Field(description="Email subject")
    body: str = Field(description="Email body plain text")
    recipients: list[str] = Field(default_factory=list, description="Recipient emails")


class WhisperInput(BaseModel):
    audio_path: str = Field(description="Path to the audio WAV file to transcribe")
    transcription_id: str = Field(description="Unique ID for this transcription")


class YTDLPInput(BaseModel):
    url: str = Field(description="YouTube video URL to extract audio from")


# --- Tool Implementations ---

class ObsidianTool(BaseTool):
    """
    Salva conteúdo Markdown no Obsidian Vault configurado (doc §3.5 ObsidianTool).
    Timestamp no nome do arquivo evita colisões entre gravações do mesmo dia.
    """
    name: str = "obsidian_save"
    description: str = "Save a summary or note as a Markdown file in the user's Obsidian vault"
    args_schema: Type[BaseModel] = ObsidianInput

    def _run(self, title: str, content: str, folder: str = "Distill") -> str:
        if not settings.obsidian_vault_path:
            return "Error: Obsidian vault path not configured in settings"

        target = Path(settings.obsidian_vault_path) / folder
        target.mkdir(parents=True, exist_ok=True)

        safe = "".join(c if c.isalnum() or c in " -_" else "_" for c in title)
        ts = datetime.now().strftime("%Y%m%d_%H%M")
        path = target / f"{ts}_{safe}.md"
        path.write_text(content, encoding="utf-8")
        return f"Saved to Obsidian: {path}"

    async def _arun(self, title: str, content: str, folder: str = "Distill") -> str:
        return self._run(title, content, folder)


class NotionTool(BaseTool):
    """
    Cria páginas no Notion (doc §3.5 NotionTool).
    Quebra conteúdo em blocos respeitando limite de 2000 chars da API Notion.
    """
    name: str = "notion_create_page"
    description: str = "Create a new page in Notion with the given title and content"
    args_schema: Type[BaseModel] = NotionInput

    def _run(self, title: str, content: str, database_id: str = "") -> str:
        from notion_client import Client
        token = get_secret("NOTION_API_KEY")
        if not token:
            return "Error: Notion API key not configured"

        db_id = database_id or settings.notion_database_id
        if not db_id:
            return "Error: Notion database ID not configured"

        client = Client(auth=token)
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        children = [
            {
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": p[:2000]}}]
                },
            }
            for p in paragraphs[:50]
        ]

        page = client.pages.create(
            parent={"database_id": db_id},
            properties={"title": {"title": [{"text": {"content": title}}]}},
            children=children,
        )
        return f"Notion page created: {page['url']}"

    async def _arun(self, title: str, content: str, database_id: str = "") -> str:
        return self._run(title, content, database_id)


class SlackTool(BaseTool):
    """
    Envia mensagens para canais Slack (doc §3.5 SlackTool).
    mrkdwn=True habilita formatação Markdown básica do Slack.
    """
    name: str = "slack_send_message"
    description: str = "Send a message to a Slack channel"
    args_schema: Type[BaseModel] = SlackInput

    def _run(self, message: str, channel: str = "") -> str:
        from slack_sdk import WebClient
        token = get_secret("SLACK_BOT_TOKEN")
        if not token:
            return "Error: Slack bot token not configured"

        target = channel or settings.slack_default_channel
        if not target:
            return "Error: Slack channel not specified"

        client = WebClient(token=token)
        resp = client.chat_postMessage(channel=target, text=message, mrkdwn=True)
        return f"Slack message sent to {target} (ts={resp['ts']})"

    async def _arun(self, message: str, channel: str = "") -> str:
        return self._run(message, channel)


class EmailTool(BaseTool):
    """
    Envia e-mails via SMTP com TLS (doc §3.5 EmailTool).
    Suporta múltiplos destinatários configurados via UI (doc §2.4.4).
    Senha SMTP recuperada do keyring — nunca armazenada em texto puro.
    """
    name: str = "email_send"
    description: str = "Send an email with the given subject and body"
    args_schema: Type[BaseModel] = EmailInput

    def _run(self, subject: str, body: str, recipients: list[str] = []) -> str:
        if not settings.smtp_server:
            return "Error: SMTP server not configured"

        to_list = recipients or settings.email_recipients_list
        if not to_list:
            return "Error: No email recipients configured"

        smtp_password = get_secret("SMTP_PASSWORD")
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_username
        msg["To"] = ", ".join(to_list)
        msg.attach(MIMEText(body, "plain", "utf-8"))

        with smtplib.SMTP(settings.smtp_server, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, smtp_password)
            server.sendmail(settings.smtp_username, to_list, msg.as_string())

        return f"Email sent to: {', '.join(to_list)}"

    async def _arun(self, subject: str, body: str, recipients: list[str] = []) -> str:
        return self._run(subject, body, recipients)


class WhisperTool(BaseTool):
    """
    Tool para o agente acionar transcrição diretamente (doc §3.5 WhisperTool).
    Permite que o agente transcreva um arquivo de áudio já existente como parte
    de um fluxo de trabalho complexo orquestrado.
    """
    name: str = "whisper_transcribe"
    description: str = "Transcribe an audio file to text using Whisper large-v3"
    args_schema: Type[BaseModel] = WhisperInput

    async def _arun(self, audio_path: str, transcription_id: str) -> str:
        from app.services.whisper_processor import whisper_processor
        result = await whisper_processor.transcribe(
            audio_path=audio_path,
            transcription_id=transcription_id,
        )
        return f"Transcribed {len(result['text'])} chars. Preview: {result['text'][:300]}"

    def _run(self, audio_path: str, transcription_id: str) -> str:
        raise NotImplementedError("Use async _arun for WhisperTool")


class YTDLPTool(BaseTool):
    """
    Tool para o agente extrair áudio de URLs YouTube (doc §3.5 YTDLPTool).
    Retorna o audio_path para uso pelo WhisperTool em sequência.
    """
    name: str = "ytdlp_extract_audio"
    description: str = "Extract audio from a YouTube URL and save as WAV for transcription"
    args_schema: Type[BaseModel] = YTDLPInput

    async def _arun(self, url: str) -> str:
        from app.services.youtube_processor import youtube_processor
        result = await youtube_processor.extract_audio(url)
        return f"Audio extracted: {result['audio_path']} | Title: {result['title']} | ID: {result['transcription_id']}"

    def _run(self, url: str) -> str:
        raise NotImplementedError("Use async _arun for YTDLPTool")

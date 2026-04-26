from typing import Optional
from langgraph.prebuilt import create_react_agent
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import StructuredTool

from app.core.config import settings, get_secret
from app.services.integration_manager import (
    ObsidianTool, NotionTool, SlackTool, EmailTool, WhisperTool, YTDLPTool
)
from app.services.knowledge_base_manager import kb_manager

SYSTEM_PROMPT = """You are Distill, a personal AI assistant for capturing and organizing knowledge from meetings and videos.

Available capabilities:
- Search through stored transcriptions to answer questions (knowledge_base_query)
- Save notes to Obsidian vault (obsidian_save)
- Create Notion pages (notion_create_page)
- Send Slack messages (slack_send_message)
- Send emails (email_send)
- Transcribe audio files (whisper_transcribe)
- Extract YouTube audio (ytdlp_extract_audio)

Always respond in the same language as the user's message.
When summarizing: capture key decisions, action items, and important facts. Be concise.
When tools fail: clearly report the error and continue with remaining tasks.
"""


class AgentOrchestrator:
    """
    Cria e executa agentes LangChain com as tools definidas em integration_manager (doc §3.5).
    Instancia um novo AgentExecutor por request — garante isolamento de histórico entre conversas.
    Usa LangChain's tool-calling agents que funcionam com todos os 4 provedores suportados.
    KnowledgeBaseQueryTool é construída inline com o transcription_id da sessão atual,
    implementando o RAG contextualizado descrito em doc §3.7.
    """

    def _get_lc_llm(self, provider: str, model: str, api_key: str = ""):
        """
        Mapeia provider/model para a classe LangChain correspondente.
        Separado do LLMManager porque LangChain exige suas próprias classes
        para integração com o framework de agentes (create_tool_calling_agent).
        """
        if provider == "ollama":
            return ChatOllama(
                model=model,
                base_url=settings.ollama_base_url,
                num_ctx=16384,
            )
        elif provider == "openai":
            return ChatOpenAI(
                model=model,
                api_key=api_key or get_secret("OPENAI_API_KEY"),
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model=model,
                api_key=api_key or get_secret("ANTHROPIC_API_KEY"),
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model=model,
                google_api_key=api_key or get_secret("GOOGLE_API_KEY"),
            )
        raise ValueError(f"Unknown provider: {provider}")

    def _build_tools(self, transcription_id: Optional[str] = None) -> list:
        """
        Constrói lista de tools incluindo KnowledgeBaseQueryTool contextualizada.
        transcription_id é capturado no closure para filtrar buscas no ChromaDB
        à transcrição específica selecionada pelo usuário (doc §3.7 Recuperação Contextual).
        """
        async def kb_query(query: str) -> str:
            results = await kb_manager.query(query, transcription_id=transcription_id)
            if not results:
                return "No relevant content found in the knowledge base."
            return "\n\n---\n\n".join(r["text"] for r in results)

        kb_tool = StructuredTool.from_function(
            coroutine=kb_query,
            name="knowledge_base_query",
            description=(
                "Search through stored transcriptions to answer questions about meetings and videos. "
                "Use this when the user asks about content from a specific recording."
            ),
        )

        return [
            ObsidianTool(),
            NotionTool(),
            SlackTool(),
            EmailTool(),
            WhisperTool(),
            YTDLPTool(),
            kb_tool,
        ]

    async def _get_transcript_context(self, transcription_id: str) -> str:
        """Fetch transcript text from DB for direct context injection."""
        try:
            from app.db.supabase_client import transcription_repo
            record = await transcription_repo.get(transcription_id)
            if record and record.get("text"):
                text = record["text"]
                title = record.get("title", transcription_id)
                if len(text) > 24000:
                    text = f"{text[:16000]}\n...[truncated]...\n{text[-8000:]}"
                return f"Title: {title}\n\n{text}"
        except Exception:
            pass
        return ""

    async def process(
        self,
        user_message: str,
        provider: str,
        model: str,
        transcription_id: Optional[str] = None,
        api_key: str = "",
    ) -> dict:
        """
        Executa o agente com a mensagem/intenção do usuário (doc §3.5).
        Retorna a resposta final e os passos intermediários (tool calls + resultados).
        max_iterations=10 previne loops infinitos em caso de tool failures consecutivos.
        """
        llm = self._get_lc_llm(provider, model, api_key)
        tools = self._build_tools(transcription_id)

        agent = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT)

        # Inject transcript text directly so LLM can answer even when KB is empty
        augmented_message = user_message
        if transcription_id:
            context = await self._get_transcript_context(transcription_id)
            if context:
                augmented_message = (
                    f"[TRANSCRIPT CONTEXT]\n{context}\n\n"
                    f"[USER QUESTION]\n{user_message}"
                )

        result = await agent.ainvoke({"messages": [("human", augmented_message)]})

        def _extract_text(content) -> str:
            if isinstance(content, str):
                return content
            if isinstance(content, list):
                parts = []
                for block in content:
                    if isinstance(block, str):
                        parts.append(block)
                    elif isinstance(block, dict):
                        parts.append(block.get("text") or block.get("content") or "")
                return "\n".join(p for p in parts if p)
            return str(content)

        messages = result.get("messages", [])
        final_response = ""
        steps = []
        for msg in messages:
            if hasattr(msg, "tool_calls") and msg.tool_calls:
                for tc in msg.tool_calls:
                    steps.append({"tool": tc["name"], "input": tc["args"], "output": ""})
            elif hasattr(msg, "content") and msg.content and not getattr(msg, "tool_calls", None):
                final_response = _extract_text(msg.content)

        return {
            "response": final_response,
            "steps": steps,
        }


agent_orchestrator = AgentOrchestrator()

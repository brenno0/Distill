from app.core.config import settings
from app.services.llm_manager import llm_manager


class SummaryService:
    """
    Gera resumo automático após conclusão da transcrição usando o
    provedor/modelo padrão configurado em settings.
    """

    _SYSTEM_PROMPT = (
        "You are a meeting and video summarizer. Return concise markdown in Portuguese "
        "with sections: 'Resumo', 'Pontos principais', 'Ações'. "
        "Use bullet points where helpful and avoid hallucinations."
    )

    async def generate(self, text: str) -> str:
        transcript = (text or "").strip()
        if not transcript:
            return ""

        # Evita prompts gigantes mantendo começo e fim da transcrição.
        if len(transcript) > 36000:
            transcript = f"{transcript[:20000]}\n...\n{transcript[-16000:]}"

        provider = llm_manager.get_provider(
            provider=settings.default_llm_provider,
            model=settings.default_llm_model,
        )
        prompt = (
            "Gere um resumo fiel da transcrição abaixo.\n"
            "Inclua decisões, fatos importantes e próximos passos.\n\n"
            f"Transcrição:\n{transcript}"
        )
        summary = await provider.generate(prompt=prompt, system=self._SYSTEM_PROMPT)
        return (summary or "").strip()


summary_service = SummaryService()

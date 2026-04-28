from typing import AsyncGenerator
from app.core.config import settings, get_secret


class LLMProvider:
    """
    Interface base que todos os provedores implementam (doc §3.3).
    Garante que o agent_orchestrator e outros serviços possam trocar
    de provedor sem mudanças de código.
    """

    async def generate(self, prompt: str, system: str = "") -> str:
        raise NotImplementedError

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        raise NotImplementedError
        yield  # torna a função um gerador assíncrono válido

    def get_available_models(self) -> list[str]:
        raise NotImplementedError


class OllamaProvider(LLMProvider):
    """
    Provedor Ollama local (doc §3.3).
    Suporta qualquer modelo disponível localmente — Llama, Gemma, Mistral, etc.
    context_size configurável por request (doc §2.1.4).
    """

    def __init__(self, model: str, context_size: int = 16384):
        import ollama
        self._client = ollama.AsyncClient(host=settings.ollama_base_url)
        self.model = model
        self.context_size = context_size

    def _messages(self, prompt: str, system: str) -> list[dict]:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        return msgs

    async def generate(self, prompt: str, system: str = "") -> str:
        response = await self._client.chat(
            model=self.model,
            messages=self._messages(prompt, system),
            options={"num_ctx": self.context_size},
        )
        return response.message.content

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        async for chunk in await self._client.chat(
            model=self.model,
            messages=self._messages(prompt, system),
            stream=True,
            options={"num_ctx": self.context_size},
        ):
            if chunk.message.content:
                yield chunk.message.content

    def get_available_models(self) -> list[str]:
        return []  # lista dinâmica via ollama_service_manager.list_models()


class OpenAIProvider(LLMProvider):
    def __init__(self, model: str = "gpt-4o", api_key: str = ""):
        from openai import AsyncOpenAI
        self._client = AsyncOpenAI(api_key=api_key or get_secret("OPENAI_API_KEY"))
        self.model = model

    async def generate(self, prompt: str, system: str = "") -> str:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        resp = await self._client.chat.completions.create(model=self.model, messages=msgs)
        return resp.choices[0].message.content

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt})
        async for chunk in await self._client.chat.completions.create(
            model=self.model, messages=msgs, stream=True
        ):
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    def get_available_models(self) -> list[str]:
        return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"]


class GeminiProvider(LLMProvider):
    """
    Provedor Google Gemini/Gemma via API (doc §3.3).
    Suporta modelos Gemma (gemma-3-27b-it) e Gemini (gemini-2.0-flash etc.)
    conforme disponibilidade na Google AI API.
    """

    def __init__(self, model: str = "gemini-2.0-flash", api_key: str = ""):
        from google import genai
        self._client = genai.Client(api_key=api_key or get_secret("GOOGLE_API_KEY"))
        self.model = model

    async def generate(self, prompt: str, system: str = "") -> str:
        from google.genai import types
        config = types.GenerateContentConfig(system_instruction=system) if system else None
        resp = await self._client.aio.models.generate_content(
            model=self.model, contents=prompt, config=config
        )
        return resp.text

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        from google.genai import types
        config = types.GenerateContentConfig(system_instruction=system) if system else None
        async for chunk in self._client.aio.models.generate_content_stream(
            model=self.model, contents=prompt, config=config
        ):
            if chunk.text:
                yield chunk.text

    def get_available_models(self) -> list[str]:
        return [
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
            "gemma-3-27b-it",
            "gemma-3-12b-it",
        ]


class AnthropicProvider(LLMProvider):
    def __init__(self, model: str = "claude-sonnet-4-6", api_key: str = ""):
        import anthropic
        self._client = anthropic.AsyncAnthropic(
            api_key=api_key or get_secret("ANTHROPIC_API_KEY")
        )
        self.model = model

    async def generate(self, prompt: str, system: str = "") -> str:
        resp = await self._client.messages.create(
            model=self.model,
            max_tokens=8096,
            system=system or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    async def stream(self, prompt: str, system: str = "") -> AsyncGenerator[str, None]:
        async with self._client.messages.stream(
            model=self.model,
            max_tokens=8096,
            system=system or "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        ) as s:
            async for text in s.text_stream:
                yield text

    def get_available_models(self) -> list[str]:
        return ["claude-opus-4-7", "claude-sonnet-4-6", "claude-haiku-4-5-20251001"]


class LLMManager:
    """
    Fábrica central de provedores LLM (doc §3.3).
    Ponto único de criação para que o restante do sistema não importe SDKs diretamente.
    """

    _PROVIDERS = {
        "ollama": OllamaProvider,
        "openai": OpenAIProvider,
        "gemini": GeminiProvider,
        "anthropic": AnthropicProvider,
    }

    def get_provider(
        self,
        provider: str,
        model: str,
        context_size: int = 16384,
        api_key: str = "",
    ) -> LLMProvider:
        if provider not in self._PROVIDERS:
            raise ValueError(
                f"Provider '{provider}' not supported. Choose from: {list(self._PROVIDERS.keys())}"
            )
        if provider == "ollama":
            return OllamaProvider(model=model, context_size=context_size)
        return self._PROVIDERS[provider](model=model, api_key=api_key)

    def list_providers(self) -> list[str]:
        return list(self._PROVIDERS.keys())


llm_manager = LLMManager()

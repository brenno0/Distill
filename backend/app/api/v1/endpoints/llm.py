import httpx
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(tags=["llm"])

PROVIDER_MODELS = {
    "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    "anthropic": [
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-haiku-20240307",
    ],
    "gemini": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
}


@router.get("/providers")
async def list_providers():
    return ["ollama", "openai", "anthropic", "gemini"]


@router.get("/providers/{provider}/models")
async def list_models(provider: str):
    if provider == "ollama":
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{settings.ollama_base_url}/api/tags")
                models = resp.json().get("models", [])
                return [{"id": m["name"], "name": m["name"]} for m in models]
        except Exception:
            return []
    return [{"id": m, "name": m} for m in PROVIDER_MODELS.get(provider, [])]

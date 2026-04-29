import subprocess
import asyncio
import httpx
from app.core.config import settings


class OllamaServiceManager:
    """
    Gerencia o processo ollama serve e a listagem de modelos locais (doc §3.4).
    httpx é usado para verificar saúde do serviço porque o SDK ollama-python
    não expõe health check sem fazer uma inferência real.
    """

    async def is_running(self) -> bool:
        """Verifica se o serviço Ollama está respondendo."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.ollama_base_url}/api/tags", timeout=0.5
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def start(self) -> bool:
        """
        Inicia ollama serve como processo background.
        Polling de 1s por até 15s para confirmar que o serviço subiu.
        """
        if await self.is_running():
            return True

        subprocess.Popen(
            ["ollama", "serve"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        for _ in range(15):
            await asyncio.sleep(1)
            if await self.is_running():
                return True
        return False

    async def stop(self) -> bool:
        """Para o serviço via SIGTERM."""
        subprocess.run(["pkill", "-f", "ollama serve"], capture_output=True)
        await asyncio.sleep(1)
        return not await self.is_running()

    async def list_models(self) -> list[dict]:
        """
        Lista modelos baixados localmente (doc §2.1.3 — detecção dinâmica).
        Retorna lista vazia se o serviço estiver parado — evita crash no frontend.
        """
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.ollama_base_url}/api/tags", timeout=5.0
                )
                data = resp.json()
                return [
                    {
                        "name": m["name"],
                        "size_gb": round(m.get("size", 0) / 1e9, 1),
                    }
                    for m in data.get("models", [])
                ]
        except Exception:
            return []


ollama_manager = OllamaServiceManager()

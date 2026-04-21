from fastapi import APIRouter
from app.services.ollama_service_manager import ollama_manager

router = APIRouter()


@router.get("/status")
async def ollama_status():
    return {"running": await ollama_manager.is_running()}


@router.post("/start")
async def start_ollama():
    success = await ollama_manager.start()
    return {"success": success, "running": success}


@router.post("/stop")
async def stop_ollama():
    success = await ollama_manager.stop()
    return {"success": success, "running": not success}


@router.get("/models")
async def list_models():
    """Lista modelos Ollama disponíveis para o frontend popular o dropdown (doc §2.1.3)."""
    return {"models": await ollama_manager.list_models()}

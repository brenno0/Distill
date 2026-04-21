from fastapi import APIRouter, HTTPException
from app.models.transcription import AgentChatRequest, AgentChatResponse
from app.services.agent_orchestrator import agent_orchestrator

router = APIRouter()


@router.post("/chat", response_model=AgentChatResponse)
async def agent_chat(request: AgentChatRequest):
    """
    Chat com o agente RAG (doc §4 Fluxo 3).
    Se transcription_id fornecido, o KB filtra para aquela transcrição específica.
    """
    try:
        result = await agent_orchestrator.process(
            user_message=request.message,
            provider=request.llm_provider,
            model=request.llm_model,
            transcription_id=request.transcription_id,
        )
        return AgentChatResponse(response=result["response"], steps=result["steps"])
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")

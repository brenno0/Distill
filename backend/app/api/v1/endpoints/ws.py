from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.ws_manager import ws_manager

router = APIRouter()


@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    Endpoint WebSocket para progresso em tempo real (doc §2.1 WebSocket).
    O frontend conecta usando transcription_id como client_id
    para receber eventos específicos de cada operação em andamento.
    """
    await ws_manager.connect(websocket, client_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)

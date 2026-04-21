from fastapi import WebSocket
from typing import Dict


class WebSocketManager:
    """
    Gerencia conexões WebSocket ativas por client_id.
    Singleton compartilhado por todos os serviços para envio de progresso
    em tempo real ao frontend (doc §2.1 — WebSocket para feedback em tempo real).
    """

    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, client_id: str) -> None:
        await websocket.accept()
        self._connections[client_id] = websocket

    def disconnect(self, client_id: str) -> None:
        self._connections.pop(client_id, None)

    async def send(self, client_id: str, event: str, data: dict) -> None:
        ws = self._connections.get(client_id)
        if ws:
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                self.disconnect(client_id)

    async def broadcast(self, event: str, data: dict) -> None:
        dead = []
        for cid, ws in self._connections.items():
            try:
                await ws.send_json({"event": event, "data": data})
            except Exception:
                dead.append(cid)
        for cid in dead:
            self.disconnect(cid)


ws_manager = WebSocketManager()

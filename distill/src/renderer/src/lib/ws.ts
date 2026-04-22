export type WsEvent = {
  type: string
  data: Record<string, unknown>
}

type WsCallback = (event: WsEvent) => void

class WsManager {
  private connections = new Map<string, WebSocket>()

  connect(transcriptionId: string, onEvent: WsCallback): WebSocket {
    if (this.connections.has(transcriptionId)) {
      return this.connections.get(transcriptionId)!
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/${transcriptionId}`)

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WsEvent
        onEvent(event)
        if (event.type === 'pipeline_complete' || event.type === 'pipeline_error') {
          this.disconnect(transcriptionId)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      onEvent({ type: 'pipeline_error', data: { error: 'WebSocket error' } })
      this.disconnect(transcriptionId)
    }

    this.connections.set(transcriptionId, ws)
    return ws
  }

  disconnect(transcriptionId: string) {
    const ws = this.connections.get(transcriptionId)
    if (ws) {
      ws.close()
      this.connections.delete(transcriptionId)
    }
  }
}

export const wsManager = new WsManager()

export type WsEvent = {
  event: string
  data: Record<string, unknown>
}

type WsCallback = (event: WsEvent) => void

class WsManager {
  private connections = new Map<string, WebSocket>()
  private callbacks = new Map<string, WsCallback>()

  connect(transcriptionId: string, onEvent: WsCallback): WebSocket {
    this.callbacks.set(transcriptionId, onEvent)

    if (this.connections.has(transcriptionId)) {
      return this.connections.get(transcriptionId)!
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/${transcriptionId}`)

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WsEvent
        this.callbacks.get(transcriptionId)?.(event)
        if (event.event === 'pipeline_complete' || event.event === 'pipeline_error') {
          this.disconnect(transcriptionId)
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onerror = () => {
      this.callbacks.get(transcriptionId)?.({ event: 'pipeline_error', data: { error: 'WebSocket error' } })
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
      this.callbacks.delete(transcriptionId)
    }
  }
}

export const wsManager = new WsManager()

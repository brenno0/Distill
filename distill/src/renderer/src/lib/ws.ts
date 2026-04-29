export type WsEvent = {
  event: string
  data: Record<string, unknown>
}

type WsCallback = (event: WsEvent) => void

const MAX_RETRIES = 5
const BASE_DELAY_MS = 1000

class WsManager {
  private connections = new Map<string, WebSocket>()
  private callbacks = new Map<string, WsCallback>()
  private retries = new Map<string, number>()
  private closed = new Set<string>()
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>()

  connect(transcriptionId: string, onEvent: WsCallback): void {
    this.callbacks.set(transcriptionId, onEvent)
    this.retries.set(transcriptionId, 0)
    this.closed.delete(transcriptionId)
    this._open(transcriptionId)
  }

  private _open(transcriptionId: string): void {
    if (this.closed.has(transcriptionId)) return

    const ws = new WebSocket(`ws://localhost:47821/ws/${transcriptionId}`)
    this.connections.set(transcriptionId, ws)

    ws.onopen = () => {
      this.retries.set(transcriptionId, 0)
    }

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WsEvent
        this.callbacks.get(transcriptionId)?.(event)
        if (event.event === 'pipeline_complete' || event.event === 'pipeline_error') {
          this.disconnect(transcriptionId)
        }
      } catch (err) {
        console.warn('[ws] malformed message:', err)
      }
    }

    ws.onerror = () => {
      // onclose fires after onerror — reconnect logic lives there
    }

    ws.onclose = () => {
      if (this.closed.has(transcriptionId)) return

      const attempt = this.retries.get(transcriptionId) ?? 0
      if (attempt >= MAX_RETRIES) {
        console.error(`[ws] max retries (${MAX_RETRIES}) reached for ${transcriptionId}`)
        this.callbacks.get(transcriptionId)?.({
          event: 'pipeline_error',
          data: { error: 'WebSocket connection lost' },
        })
        this.disconnect(transcriptionId)
        return
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      console.warn(`[ws] reconnecting in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`)
      this.retries.set(transcriptionId, attempt + 1)
      const timer = setTimeout(() => this._open(transcriptionId), delay)
      this.retryTimers.set(transcriptionId, timer)
    }
  }

  disconnect(transcriptionId: string): void {
    this.closed.add(transcriptionId)
    const timer = this.retryTimers.get(transcriptionId)
    if (timer) {
      clearTimeout(timer)
      this.retryTimers.delete(transcriptionId)
    }
    const ws = this.connections.get(transcriptionId)
    if (ws) {
      ws.close()
      this.connections.delete(transcriptionId)
    }
    this.callbacks.delete(transcriptionId)
    this.retries.delete(transcriptionId)
    setTimeout(() => this.closed.delete(transcriptionId), 5000)
  }
}

export const wsManager = new WsManager()

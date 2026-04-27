import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { ipcMain } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

export type BackendStatus = 'starting' | 'ready' | 'error' | 'fatal'

export class BackendManager extends EventEmitter {
  status: BackendStatus = 'starting'
  private process: ChildProcess | null = null
  private restartCount = 0
  private readonly maxRestarts = 3
  private healthTimer: NodeJS.Timeout | null = null

  setStatus(s: BackendStatus): void {
    this.status = s
    this.emit('status', s)
  }

  constructor() {
    super()
    ipcMain.handle('backend:port', () => 47821)
  }

  private resolveBackendPath(): string {
    if (process.env.BACKEND_PATH) return process.env.BACKEND_PATH

    const candidates = [
      // out/main -> out -> distill -> project-root/backend
      join(__dirname, '../../../backend'),
      // fallback when running from distill/ (npm run dev)
      join(process.cwd(), '../backend'),
      join(process.cwd(), 'backend')
    ]

    return candidates.find((path) => existsSync(path)) ?? candidates[0]
  }

  start(webContents?: Electron.WebContents): void {
    const backendPath = this.resolveBackendPath()

    this.setStatus('starting')
    webContents?.send('backend:status', 'starting')

    this.process = spawn('poetry', ['run', 'uvicorn', 'app.main:app', '--port', '47821'], {
      cwd: backendPath,
      stdio: 'pipe'
    })

    this.process.on('error', (err) => {
      console.error('[backend] spawn error:', err)
      this.handleCrash(webContents)
    })

    this.process.stdout?.on('data', (chunk) => {
      const message = chunk.toString().trim()
      if (message) console.log(`[backend] ${message}`)
    })

    this.process.stderr?.on('data', (chunk) => {
      const message = chunk.toString().trim()
      if (message) console.error(`[backend] ${message}`)
    })

    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        this.handleCrash(webContents)
      }
    })

    this.pollHealth(webContents)
  }

  private async pollHealth(webContents?: Electron.WebContents, elapsed = 0): Promise<void> {
    if (elapsed > 30000) {
      this.setStatus('error')
      webContents?.send('backend:status', 'error')
      return
    }

    try {
      const res = await fetch('http://localhost:47821/health')
      if (res.ok) {
        const payload = (await res.json()) as { status?: string; version?: string }
        if (payload.status !== 'ok') {
          throw new Error('Unexpected /health payload')
        }
        this.setStatus('ready')
        webContents?.send('backend:status', 'ready')
        return
      }
    } catch {
      // not ready yet
    }

    this.healthTimer = setTimeout(() => this.pollHealth(webContents, elapsed + 500), 500)
  }

  private handleCrash(webContents?: Electron.WebContents): void {
    this.restartCount++
    if (this.restartCount >= this.maxRestarts) {
      this.setStatus('fatal')
      webContents?.send('backend:fatal')
      return
    }
    this.setStatus('starting')
    webContents?.send('backend:status', 'starting')
    this.start(webContents)
  }

  stop(): void {
    if (this.healthTimer) clearTimeout(this.healthTimer)
    if (this.process) {
      this.process.kill('SIGTERM')
      const proc = this.process
      setTimeout(() => {
        if (proc && !proc.killed) proc.kill('SIGKILL')
      }, 3000)
    }
  }
}

export const backendManager = new BackendManager()

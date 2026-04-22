import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  onBackendStatus: (cb: (status: string) => void) =>
    ipcRenderer.on('backend:status', (_event, status) => cb(status)),
  onBackendFatal: (cb: () => void) =>
    ipcRenderer.on('backend:fatal', () => cb()),
  getBackendPort: () => ipcRenderer.invoke('backend:port'),
})

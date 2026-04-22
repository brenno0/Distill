export {}

declare global {
  interface Window {
    electron: {
      onBackendStatus: (cb: (status: string) => void) => void
      onBackendFatal: (cb: () => void) => void
      getBackendPort: () => Promise<number>
    }
  }
}

export {}

declare global {
  interface Window {
    electron: {
      onBackendStatus: (cb: (status: string) => void) => void
      onBackendFatal: (cb: () => void) => void
      getBackendPort: () => Promise<number>
      exportSummaryPDF: (data: {
        markdown: string
        title: string
        date?: string
      }) => Promise<{ success: boolean; canceled?: boolean; error?: string }>
    }
  }
}

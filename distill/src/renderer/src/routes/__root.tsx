import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useBackendStore } from "@renderer/stores/useBackendStore"
import { useEffect, useRef } from "react"
import { SidebarProvider, SidebarInset } from "@renderer/components/ui/sidebar"
import { AppSidebar } from "@renderer/components/app-sidebar"
import { useRecordingStore } from "@renderer/stores/useRecordingStore"
import { axiosInstance } from "@renderer/lib/axios"

function RecordingProvider() {
  const isRecording = useRecordingStore((s) => s.isRecording)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const levelRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!isRecording) return

    const { tickElapsed, setAudioLevel, setMonitorLevel } = useRecordingStore.getState()

    timerRef.current = setInterval(tickElapsed, 1000)
    levelRef.current = setInterval(async () => {
      try {
        const data = await axiosInstance<{ level: number; mic_level: number; monitor_level: number }>(
          { url: '/api/v1/recordings/level', method: 'GET' }
        )
        setAudioLevel((data as any).mic_level ?? (data as any).level ?? 0)
        setMonitorLevel((data as any).monitor_level ?? 0)
      } catch {
        // ignore
      }
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (levelRef.current) clearInterval(levelRef.current)
    }
  }, [isRecording])

  return null
}

function RootLayout() {
  const setStatus = useBackendStore((s) => s.setStatus)
  const status = useBackendStore((s) => s.status)

  useEffect(() => {
    window.electron.onBackendStatus((s) => setStatus(s as any))
    window.electron.onBackendFatal(() => setStatus("fatal"))
  }, [setStatus])

  return (
    <SidebarProvider>
      <RecordingProvider />
      <AppSidebar />
      <SidebarInset className="bg-background relative h-svh overflow-hidden">
        {status !== "ready" ? (
          <BackendOverlay status={status} />
        ) : (
          <div className="h-full overflow-hidden">
            <Outlet />
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

function BackendOverlay({ status }: { status: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="text-center space-y-3">
        {status === "fatal" ? (
          <>
            <p className="text-destructive font-medium">Backend crashed</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition-opacity"
            >
              Restart
            </button>
          </>
        ) : status === "error" ? (
          <p className="text-yellow-400 text-sm">Backend error — check logs</p>
        ) : (
          <p className="text-sm text-muted-foreground">Starting backend…</p>
        )}
      </div>
    </div>
  )
}

export const Route = createRootRoute({ component: RootLayout })

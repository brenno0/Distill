import { createRootRoute, Outlet } from "@tanstack/react-router"
import { useBackendStore } from "@renderer/stores/useBackendStore"
import { useEffect } from "react"
import { SidebarProvider, SidebarInset } from "@renderer/components/ui/sidebar"
import { AppSidebar } from "@renderer/components/app-sidebar"

function RootLayout() {
  const setStatus = useBackendStore((s) => s.setStatus)
  const status = useBackendStore((s) => s.status)

  useEffect(() => {
    window.electron.onBackendStatus((s) => setStatus(s as any))
    window.electron.onBackendFatal(() => setStatus("fatal"))
  }, [setStatus])

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background relative h-svh overflow-hidden">
        {status !== "ready" ? (
          <BackendOverlay status={status} />
        ) : (
          <div className="flex-1 min-h-0">
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

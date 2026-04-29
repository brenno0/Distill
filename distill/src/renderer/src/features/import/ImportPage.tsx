import { Suspense, useRef, useEffect } from "react"
import { gsap } from "gsap"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { useImport } from "./hooks/useImport"
import { ImportPageSkeleton } from "./components/ImportPageSkeleton"
import { ImportProgressSkeleton } from "./components/ImportProgressSkeleton"

const STATUS_LABELS: Record<string, string> = {
  downloading: "Baixando vídeo…",
  transcribing: "Transcrevendo áudio…",
}

const PHASE_LABELS: Record<string, string> = {
  downloading: "Etapa 1/2",
  transcribing: "Etapa 2/2",
}

function ImportPageContent() {
  const { url, setUrl, urlError, submit, progress, status, isPending } = useImport()
  const headerRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tl = gsap.timeline()
    tl.fromTo(headerRef.current, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" })
      .fromTo(formRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.3")
  }, [])

  const isActive = status !== "idle" && status !== "failed"
  const showProgressSkeleton = isPending && status === "idle"
  const showProgress = isActive
  const isIndeterminate = status === "transcribing" || (status === "downloading" && progress <= 0)
  const pct = Math.round(progress * 100)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center" ref={headerRef}>
          <h1 className="text-4xl font-bold text-foreground mb-2">Importar do YouTube</h1>
          <p className="text-lg text-muted-foreground">Cole um link do YouTube para baixar e transcrever</p>
        </div>

        <div className="space-y-4" ref={formRef}>
          <div className="flex gap-2">
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              disabled={isPending}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <Button onClick={submit} disabled={isPending || !url} className="bg-primary hover:bg-primary/90">
              Importar
            </Button>
          </div>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>

        {showProgressSkeleton && <ImportProgressSkeleton />}

        {showProgress && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-muted-foreground">{PHASE_LABELS[status] ?? ""} · </span>
                <span className="text-sm font-medium text-foreground">{STATUS_LABELS[status] ?? status}</span>
              </div>
              {!isIndeterminate && (
                <span className="text-sm tabular-nums text-muted-foreground">{pct}%</span>
              )}
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              {isIndeterminate ? (
                <div className="h-full w-2/5 bg-primary rounded-full animate-pulse" />
              ) : (
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              )}
            </div>
          </div>
        )}

        {status === "failed" && (
          <p className="text-sm text-destructive text-center">Algo deu errado. Verifique se o yt-dlp está instalado.</p>
        )}
      </div>
    </div>
  )
}

export function ImportPage() {
  return (
    <Suspense fallback={<ImportPageSkeleton />}>
      <ImportPageContent />
    </Suspense>
  )
}

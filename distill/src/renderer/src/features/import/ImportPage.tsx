import { Suspense, useRef, useEffect } from "react"
import { gsap } from "gsap"
import { AlertCircle, Download, PlayCircle } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
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
      <div className="w-full max-w-lg flex flex-col gap-6">
        <div className="text-center" ref={headerRef}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/15">
              <PlayCircle className="size-5 text-red-400" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight leading-none text-foreground mb-2">
            Importar do YouTube
          </h1>
          <p className="text-muted-foreground">
            Cole um link para baixar e transcrever automaticamente
          </p>
        </div>

        <div
          ref={formRef}
          className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              URL do vídeo
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <PlayCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-red-400/70" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  disabled={isPending}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 disabled:opacity-50 transition-all"
                />
              </div>
              <Button
                onClick={submit}
                disabled={isPending || !url}
                className="gap-2 shrink-0"
              >
                <Download className="size-4" />
                Importar
              </Button>
            </div>
            {urlError && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5" />
                {urlError}
              </p>
            )}
          </div>

          {showProgressSkeleton && <ImportProgressSkeleton />}

          {showProgress && (
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {PHASE_LABELS[status] ?? ""}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {STATUS_LABELS[status] ?? status}
                  </span>
                </div>
                {!isIndeterminate && (
                  <span className="text-sm tabular-nums font-semibold text-primary">{pct}%</span>
                )}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
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
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Algo deu errado</p>
                <p className="text-xs text-destructive/70 mt-0.5">
                  Verifique se o yt-dlp está instalado e o link é válido.
                </p>
              </div>
            </div>
          )}
        </div>
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

import { Suspense, useRef, useEffect } from "react"
import { gsap } from "gsap"
import { Button } from "@renderer/components/ui/button"
import { Input } from "@renderer/components/ui/input"
import { useImport } from "./hooks/useImport"
import { ImportPageSkeleton } from "./components/ImportPageSkeleton"
import { ImportProgressSkeleton } from "./components/ImportProgressSkeleton"

const STATUS_LABELS: Record<string, string> = {
  downloading: "Downloading video…",
  transcribing: "Transcribing audio…",
  failed: "Import failed",
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

  const isPipelineActive = status !== "idle" && status !== "failed"
  const showProgressSkeleton = (isPending && status === "idle") || (isPipelineActive && progress <= 0)
  const showProgress = isPipelineActive && !showProgressSkeleton

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center" ref={headerRef}>
          <h1 className="text-4xl font-bold text-foreground mb-2">Import from YouTube</h1>
          <p className="text-lg text-muted-foreground">Paste a YouTube URL to download and transcribe</p>
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
              Import
            </Button>
          </div>
          {urlError && <p className="text-xs text-destructive">{urlError}</p>}
        </div>

        {showProgressSkeleton && <ImportProgressSkeleton />}

        {showProgress && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{STATUS_LABELS[status] ?? status}</p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-right">{Math.round(progress * 100)}%</p>
          </div>
        )}

        {status === "failed" && (
          <p className="text-sm text-destructive text-center">Something went wrong. Check that yt-dlp is installed.</p>
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

import { memo } from "react"

export const LiveTranscriptPreview = memo(function LiveTranscriptPreview({
  transcriptionId,
}: {
  transcriptionId: string | null
}) {
  if (!transcriptionId) return null

  return (
    <div className="w-full max-w-xl mt-8 p-6 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Live Transcription</span>
      </div>
      <div className="space-y-3 text-foreground">
        <p className="opacity-60">Transcribing your audio in real-time...</p>
        <span className="inline-block w-2 h-5 bg-primary animate-pulse" />
      </div>
    </div>
  )
})

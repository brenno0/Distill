import { memo, useEffect, useRef, useState } from "react"
import { wsManager, type WsEvent } from "@renderer/lib/ws"
import { cn } from "@renderer/lib/utils"

type LiveSegment = {
  id: string
  speaker: string
  speakerType: string
  text: string
  elapsed: number
}

const MAX_SEGMENTS = 200

export const LiveTranscriptPreview = memo(function LiveTranscriptPreview({
  transcriptionId,
}: {
  transcriptionId: string | null
}) {
  const [segments, setSegments] = useState<LiveSegment[]>([])
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSegments([])
  }, [transcriptionId])

  useEffect(() => {
    if (!transcriptionId) return

    const handleEvent = (event: WsEvent) => {
      if (event.event !== "live_segment") return
      const data = event.data as Record<string, unknown>
      const text = String(data?.text ?? "").trim()
      if (!text) return

      const speaker = String(data?.speaker ?? "Speaker")
      const speakerType = String(data?.speaker_type ?? "remote")
      const elapsed = typeof data?.elapsed === "number" ? data.elapsed : 0

      setSegments((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.speaker === speaker && last.speakerType === speakerType) {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...last,
            text: `${last.text} ${text}`.trim(),
          }
          return updated
        }
        const next: LiveSegment = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          speaker,
          speakerType,
          text,
          elapsed,
        }
        const merged = [...prev, next]
        return merged.length > MAX_SEGMENTS ? merged.slice(-MAX_SEGMENTS) : merged
      })
    }

    wsManager.connect(transcriptionId, handleEvent)
    return () => wsManager.disconnect(transcriptionId)
  }, [transcriptionId])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [segments])

  if (!transcriptionId) return null

  return (
    <div className="w-full max-w-xl mt-8 p-6 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-2 rounded-full bg-primary animate-pulse" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">Live Transcription</span>
      </div>
      <div ref={listRef} className="max-h-72 overflow-y-auto pr-1 space-y-3 text-foreground">
        {segments.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Aguardando fala...
            <span className="inline-block w-2 h-4 ml-2 bg-primary animate-pulse align-middle" />
          </div>
        ) : (
          segments.map((segment) => {
            const isLocal = segment.speakerType === "local"
            return (
              <div key={segment.id} className={cn("flex", isLocal ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
                    isLocal ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  )}
                >
                  <div className={cn("text-[11px] mb-1 uppercase tracking-wide", isLocal ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {segment.speaker}
                  </div>
                  <div>{segment.text}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
})

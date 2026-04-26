import { memo, useMemo } from 'react'
import { Copy, Loader2 } from 'lucide-react'

interface Segment { text: string; start: number; end: number; speaker?: string }
interface SegmentBlock { text: string; start: number; end: number; speaker?: string }

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export const TranscriptPanel = memo(function TranscriptPanel({
  segments,
  fullText,
  status,
  progress,
}: {
  segments: Segment[]
  fullText?: string
  status?: string
  progress?: number | null
}) {
  const blocks = useMemo<SegmentBlock[]>(() => {
    if (segments.length === 0) return []
    const sorted = [...segments].sort((a, b) => a.start - b.start)
    const out: SegmentBlock[] = []
    for (const seg of sorted) {
      if (!seg.text?.trim()) continue
      const prev = out[out.length - 1]
      const gap = prev ? Math.max(0, seg.start - prev.end) : 0
      const sameSpeaker = prev?.speaker === seg.speaker
      const canMerge = Boolean(prev) && gap <= 2.5 && sameSpeaker && prev.text.length < 700
      if (canMerge && prev) {
        prev.text = `${prev.text} ${seg.text.trim()}`
        prev.end = seg.end
      } else {
        out.push({
          text: seg.text.trim(),
          start: seg.start,
          end: seg.end,
          speaker: seg.speaker,
        })
      }
    }
    return out
  }, [segments])

  const textParagraphs = useMemo(() => {
    if (!fullText?.trim()) return []
    const normalized = fullText.replace(/\r/g, '').trim()
    if (/\n{2,}/.test(normalized)) {
      return normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    }
    const sentences = normalized.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
    const grouped: string[] = []
    for (let i = 0; i < sentences.length; i += 3) {
      grouped.push(sentences.slice(i, i + 3).join(' '))
    }
    return grouped.length > 0 ? grouped : [normalized]
  }, [fullText])

  const hasSegments = blocks.length > 0
  const hasFullText = Boolean(fullText?.trim())

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-medium">Transcript</h2>
        {fullText && (
          <button
            onClick={() => navigator.clipboard.writeText(fullText)}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <Copy size={12} strokeWidth={1.5} /> Copy all
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {hasSegments
          ? blocks.map((block, i) => (
              <div key={i} className="py-2 px-3 rounded hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-[var(--font-mono)] text-xs text-white/30">
                    {fmt(block.start)} - {fmt(block.end)}
                  </span>
                  {block.speaker && (
                    <span className="text-xs text-[var(--color-accent)]/70">{block.speaker}</span>
                  )}
                </div>
                <p className="font-[var(--font-mono)] text-sm text-white/80 leading-relaxed">
                  {block.text}
                </p>
              </div>
            ))
          : hasFullText
            ? (
                <div className="px-3 py-2 space-y-3">
                  {textParagraphs.map((paragraph, i) => (
                    <p key={i} className="font-[var(--font-mono)] text-sm text-white/80 leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )
            : (status === 'pending' || status === 'processing')
            ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-white/40 py-16">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm">Transcribing…</p>
                  {progress != null && (
                    <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-accent)] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            : status === 'failed'
            ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
                  <p className="text-sm text-red-400">Transcription failed</p>
                  <p className="text-xs text-white/30">Check the backend logs for details</p>
                </div>
              )
            : <p className="text-sm text-white/30 text-center mt-8">No transcript available</p>}
      </div>
    </div>
  )
})

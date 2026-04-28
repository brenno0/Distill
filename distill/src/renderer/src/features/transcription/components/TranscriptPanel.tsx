import { memo, useMemo } from 'react'
import { Copy, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback } from '@renderer/components/ui/avatar'

interface Segment { text: string; start: number; end: number; speaker?: string }
interface SegmentBlock { text: string; start: number; end: number; speaker?: string }

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

type TranscriptPanelProps = {
  segments: Segment[]
  fullText?: string
  status?: string
  progress?: number | null
  transcriptionType?: string
}

export const TranscriptPanel = memo(function TranscriptPanel({
  segments,
  fullText,
  status,
  progress,
  transcriptionType,
}: TranscriptPanelProps) {
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
  const hasCompleteSpeakers = segments.length > 0 && segments.every((seg) => Boolean(seg.speaker?.trim()))
  const shouldRenderBubbles = transcriptionType !== 'youtube' && hasCompleteSpeakers
  const speakerSides = useMemo(() => {
    const map = new Map<string, 'left' | 'right'>()
    if (!shouldRenderBubbles) return map
    let index = 0
    for (const block of blocks) {
      const speaker = block.speaker?.trim()
      if (!speaker || map.has(speaker)) continue
      map.set(speaker, index % 2 === 0 ? 'left' : 'right')
      index += 1
    }
    return map
  }, [blocks, shouldRenderBubbles])

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
          ? shouldRenderBubbles
            ? blocks.map((block, i) => {
                const speaker = block.speaker?.trim() ?? ''
                const isRight = speakerSides.get(speaker) === 'right'
                const initials = speaker
                  .split(' ')
                  .slice(0, 2)
                  .map((word) => word[0]?.toUpperCase() || '')
                  .join('')
                return (
                  <div key={i} className={`flex ${isRight ? 'justify-end' : 'justify-start'} gap-2 mb-3 items-start`}>
                    {!isRight && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs font-bold bg-white/10 text-white/70">
                          {initials || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        isRight ? 'bg-[var(--color-accent)] text-white' : 'bg-white/5 text-white/80'
                      }`}
                    >
                      <div
                        className={`text-[11px] mb-1 flex items-center gap-2 ${
                          isRight ? 'text-white/70' : 'text-white/40'
                        }`}
                      >
                        <span className="font-[var(--font-mono)]">
                          {fmt(block.start)} - {fmt(block.end)}
                        </span>
                        <span className="uppercase tracking-wide">{block.speaker}</span>
                      </div>
                      <div className="font-[var(--font-mono)]">{block.text}</div>
                    </div>
                    {isRight && (
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs font-bold bg-[var(--color-accent)]/20 text-white">
                          {initials || '?'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
              })
            : blocks.map((block, i) => (
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

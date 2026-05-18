import { memo } from 'react'

interface Segment {
  text: string
  start: number
  end: number
  speaker?: string
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

export const TranscriptLine = memo(function TranscriptLine({ segment }: { segment: Segment }) {
  return (
    <div className="py-2 px-3 rounded hover:bg-accent transition-colors">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="font-[var(--font-mono)] text-xs text-muted-foreground">{fmt(segment.start)}</span>
        {segment.speaker && (
          <span className="text-xs text-primary font-medium">{segment.speaker}</span>
        )}
      </div>
      <p className="font-[var(--font-mono)] text-sm text-foreground leading-relaxed">{segment.text}</p>
    </div>
  )
})

import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { Copy, Loader2, RefreshCw, ChevronDown, ChevronUp, AlertCircle, MessageSquareText, Search, X, Download, Pencil } from 'lucide-react'
import { exportAsTxt, exportAsSrt, exportAsVtt } from '../utils/exportTranscript'
import { axiosInstance } from '@renderer/lib/axios'
import { AudioPlayer, AudioPlayerHandle } from './AudioPlayer'

interface Segment { text: string; start: number; end: number; speaker?: string }
interface SegmentBlock { text: string; start: number; end: number; speaker?: string }

const SPEAKER_PALETTE = [
  { text: 'text-blue-400',    bg: 'bg-blue-400' },
  { text: 'text-violet-400',  bg: 'bg-violet-400' },
  { text: 'text-emerald-400', bg: 'bg-emerald-400' },
  { text: 'text-orange-400',  bg: 'bg-orange-400' },
  { text: 'text-pink-400',    bg: 'bg-pink-400' },
] as const

function fmt(s: number) {
  const m = Math.floor(s / 60)
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-primary/35 text-foreground rounded-sm px-0.5">{part}</mark>
      : part
  )
}

interface SpeakerLabelProps {
  raw: string
  palette: { text: string; bg: string }
  colorOverride?: string
  className?: string
  editingSpeaker: string | null
  editValue: string
  speakerEditRef: React.RefObject<HTMLInputElement | null>
  onChangeEditValue: (v: string) => void
  onCommit: (raw: string) => void
  onCancel: () => void
  onStart: (raw: string) => void
  resolveSpeaker: (raw: string) => string
}

const SpeakerLabel = memo(function SpeakerLabel({
  raw, palette, colorOverride, className,
  editingSpeaker, editValue, speakerEditRef,
  onChangeEditValue, onCommit, onCancel, onStart, resolveSpeaker,
}: SpeakerLabelProps) {
  const isEditing = editingSpeaker === raw
  const colorClass = colorOverride ?? palette.text
  if (isEditing) {
    return (
      <input
        ref={speakerEditRef}
        value={editValue}
        onChange={e => onChangeEditValue(e.target.value)}
        onBlur={() => onCommit(raw)}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(raw); if (e.key === 'Escape') onCancel() }}
        className={`text-[10px] font-semibold uppercase tracking-wider bg-transparent border-b border-current outline-none w-24 ${colorClass} ${className ?? ''}`}
      />
    )
  }
  return (
    <button
      onClick={() => onStart(raw)}
      title="Rename speaker"
      className={`group/sp flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${colorClass} hover:opacity-80 transition-opacity ${className ?? ''}`}
    >
      {resolveSpeaker(raw)}
      <Pencil size={8} className="opacity-0 group-hover/sp:opacity-60 transition-opacity" />
    </button>
  )
})

type TranscriptPanelProps = {
  segments: Segment[]
  fullText?: string
  title?: string
  transcriptionId?: string
  audioPath?: string
  speakerMap?: Record<string, string>
  status?: string
  progress?: number | null
  transcriptionType?: string
  errorMessage?: string
  errorLog?: Array<{ timestamp: string; error: string }>
  onRetry?: () => void
  isRetrying?: boolean
}

export const TranscriptPanel = memo(function TranscriptPanel({
  segments,
  fullText,
  title = 'transcript',
  transcriptionId,
  speakerMap: initialSpeakerMap,
  status,
  progress,
  transcriptionType,
  errorMessage,
  errorLog = [],
  onRetry,
  isRetrying,
}: TranscriptPanelProps) {
  const [showLog, setShowLog] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)
  const [localSpeakerMap, setLocalSpeakerMap] = useState<Record<string, string>>(initialSpeakerMap ?? {})
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const speakerEditRef = useRef<HTMLInputElement>(null)
  const [localSegments, setLocalSegments] = useState<Segment[]>(segments)
  const [playerTime, setPlayerTime] = useState<number | null>(null)
  const audioPlayerRef = useRef<AudioPlayerHandle>(null)
  const [editingBlockStart, setEditingBlockStart] = useState<number | null>(null)
  const [blockEditValue, setBlockEditValue] = useState('')
  const blockEditRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!showExport) return
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showExport])

  useEffect(() => {
    setLocalSpeakerMap(initialSpeakerMap ?? {})
  }, [initialSpeakerMap])

  useEffect(() => {
    if (editingSpeaker && speakerEditRef.current) speakerEditRef.current.focus()
  }, [editingSpeaker])

  const startEditSpeaker = useCallback((rawSpeaker: string) => {
    setEditingSpeaker(rawSpeaker)
    setEditValue(localSpeakerMap[rawSpeaker] ?? rawSpeaker)
  }, [localSpeakerMap])

  const commitEditSpeaker = useCallback(async (rawSpeaker: string) => {
    const newName = editValue.trim()
    setEditingSpeaker(null)
    if (!newName || newName === (localSpeakerMap[rawSpeaker] ?? rawSpeaker)) return
    const next = { ...localSpeakerMap, [rawSpeaker]: newName }
    setLocalSpeakerMap(next)
    if (transcriptionId) {
      try {
        await axiosInstance({ url: `/api/v1/transcriptions/${transcriptionId}`, method: 'PATCH', headers: { 'Content-Type': 'application/json' }, data: { speaker_map: next } })
      } catch {
        setLocalSpeakerMap(localSpeakerMap)
      }
    }
  }, [editValue, localSpeakerMap, transcriptionId])

  const blocks = useMemo<SegmentBlock[]>(() => {
    if (localSegments.length === 0) return []
    const sorted = [...localSegments].sort((a, b) => a.start - b.start)
    const out: SegmentBlock[] = []
    for (const seg of sorted) {
      if (!seg.text?.trim()) continue
      const prev = out[out.length - 1]
      const gap = prev ? Math.max(0, seg.start - prev.end) : 0
      const sameSpeaker = prev?.speaker === seg.speaker
      if (Boolean(prev) && gap <= 2.5 && sameSpeaker && prev!.text.length < 700) {
        prev!.text = `${prev!.text} ${seg.text.trim()}`
        prev!.end = seg.end
      } else {
        out.push({ text: seg.text.trim(), start: seg.start, end: seg.end, speaker: seg.speaker })
      }
    }
    return out
  }, [localSegments])

  const speakerColors = useMemo(() => {
    const map = new Map<string, typeof SPEAKER_PALETTE[number]>()
    let i = 0
    for (const block of blocks) {
      const sp = block.speaker?.trim()
      if (sp && !map.has(sp)) map.set(sp, SPEAKER_PALETTE[i++ % SPEAKER_PALETTE.length])
    }
    return map
  }, [blocks])

  const filteredBlocks = useMemo(() => {
    if (!search.trim()) return blocks
    const q = search.toLowerCase()
    return blocks.filter(b => b.text.toLowerCase().includes(q) || b.speaker?.toLowerCase().includes(q))
  }, [blocks, search])

  const textParagraphs = useMemo(() => {
    if (!fullText?.trim()) return []
    const normalized = fullText.replace(/\r/g, '').trim()
    if (/\n{2,}/.test(normalized)) return normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    const sentences = normalized.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean)
    const grouped: string[] = []
    for (let i = 0; i < sentences.length; i += 3) grouped.push(sentences.slice(i, i + 3).join(' '))
    return grouped.length > 0 ? grouped : [normalized]
  }, [fullText])

  const hasSegments = blocks.length > 0
  const hasFullText = Boolean(fullText?.trim())
  const hasCompleteSpeakers = localSegments.length > 0 && localSegments.every(s => Boolean(s.speaker?.trim()))
  const shouldRenderBubbles = transcriptionType !== 'youtube' && hasCompleteSpeakers
  const totalDuration = blocks[blocks.length - 1]?.end ?? 0

  const speakerSides = useMemo(() => {
    const map = new Map<string, 'left' | 'right'>()
    if (!shouldRenderBubbles) return map
    let idx = 0
    for (const block of blocks) {
      const sp = block.speaker?.trim()
      if (sp && !map.has(sp)) map.set(sp, idx++ % 2 === 0 ? 'left' : 'right')
    }
    return map
  }, [blocks, shouldRenderBubbles])

  useEffect(() => { setLocalSegments(segments) }, [segments])

  useEffect(() => {
    if (editingBlockStart !== null && blockEditRef.current) {
      blockEditRef.current.focus()
      blockEditRef.current.selectionStart = blockEditRef.current.value.length
    }
  }, [editingBlockStart])

  const commitBlockEdit = useCallback(async (blockStart: number, blockEnd: number, originalText: string) => {
    const newText = blockEditValue.trim()
    setEditingBlockStart(null)
    if (!newText || newText === originalText) return
    const next = localSegments.map(s =>
      s.start === blockStart && s.end === blockEnd ? { ...s, text: newText } : s
    )
    setLocalSegments(next)
    if (transcriptionId) {
      try {
        await axiosInstance({ url: `/api/v1/transcriptions/${transcriptionId}`, method: 'PATCH', headers: { 'Content-Type': 'application/json' }, data: { segments: next } })
      } catch {
        setLocalSegments(localSegments)
      }
    }
  }, [blockEditValue, localSegments, transcriptionId])

  const resolveSpeaker = useCallback((raw: string) => localSpeakerMap[raw] ?? raw, [localSpeakerMap])
  const cancelEditSpeaker = useCallback(() => setEditingSpeaker(null), [])

  return (
    <div className="flex flex-col h-full overflow-hidden border-t-2 border-t-blue-400/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-5 items-center justify-center rounded bg-blue-400/15 shrink-0">
            <MessageSquareText className="size-3 text-blue-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transcript</span>
          {hasSegments && (
            <span className="text-[10px] text-muted-foreground/40 tabular-nums shrink-0">
              {blocks.length} seg · {fmt(totalDuration)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {hasSegments && (
            <button
              onClick={() => { setShowSearch(v => !v); if (showSearch) setSearch('') }}
              className={`p-1.5 rounded-md transition-colors ${showSearch ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
              title="Search"
            >
              <Search size={12} />
            </button>
          )}
          {fullText && (
            <button
              onClick={() => navigator.clipboard.writeText(fullText)}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Copy all"
            >
              <Copy size={12} strokeWidth={1.5} />
            </button>
          )}
          {(hasSegments || fullText) && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExport(v => !v)}
                className={`p-1.5 rounded-md transition-colors ${showExport ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'}`}
                title="Export"
              >
                <Download size={12} />
              </button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[130px] bg-card border border-border rounded-lg shadow-xl py-1 text-xs">
                  <button
                    onClick={() => { exportAsTxt(localSegments, fullText, title); setShowExport(false) }}
                    className="w-full text-left px-3 py-1.5 hover:bg-accent text-foreground transition-colors"
                  >
                    Export as .txt
                  </button>
                  {localSegments.length > 0 && (
                    <>
                      <button
                        onClick={() => { exportAsSrt(localSegments, title); setShowExport(false) }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-foreground transition-colors"
                      >
                        Export as .srt
                      </button>
                      <button
                        onClick={() => { exportAsVtt(localSegments, title); setShowExport(false) }}
                        className="w-full text-left px-3 py-1.5 hover:bg-accent text-foreground transition-colors"
                      >
                        Export as .vtt
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="px-3 py-2 border-b border-border shrink-0 bg-muted/10">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search transcript…"
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={11} />
              </button>
            )}
          </div>
          {search && (
            <p className="text-[10px] text-muted-foreground mt-1.5">{filteredBlocks.length} / {blocks.length} segments</p>
          )}
        </div>
      )}

      {transcriptionId && transcriptionType !== 'youtube' && (
        <AudioPlayer ref={audioPlayerRef} transcriptionId={transcriptionId} onTimeUpdate={setPlayerTime} />
      )}

      <div className="flex-1 overflow-y-auto scrollbar-hover">
        {hasSegments
          ? shouldRenderBubbles
            /* ── Bubble / chat mode ── */
            ? (
              <div className="px-3 py-3 space-y-3">
                {filteredBlocks.map((block, i) => {
                  const speaker = block.speaker?.trim() ?? ''
                  const isRight = speakerSides.get(speaker) === 'right'
                  const palette = speakerColors.get(speaker) ?? SPEAKER_PALETTE[0]
                  const displayName = resolveSpeaker(speaker)
                  const initials = displayName.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('')
                  return (
                    <div key={i} className={`flex items-end gap-2 ${isRight ? 'justify-end' : 'justify-start'}`}>
                      {!isRight && (
                        <div className={`size-7 rounded-full bg-card border border-border flex items-center justify-center shrink-0 text-[9px] font-bold ${palette.text}`}>
                          {initials || '?'}
                        </div>
                      )}
                      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                        isRight
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-card border border-border text-foreground rounded-bl-sm'
                      }`}>
                        <div className={`flex items-center gap-2 mb-1.5`}>
                          <button
                            className={`text-[10px] font-mono ${isRight ? 'text-primary-foreground/55 hover:text-primary-foreground' : 'text-muted-foreground hover:text-primary'} transition-colors`}
                            onClick={() => audioPlayerRef.current?.seekTo(block.start)}
                            title="Seek to this segment"
                          >
                            {fmt(block.start)}
                          </button>
                          {block.speaker && (
                            <SpeakerLabel
                              raw={block.speaker}
                              palette={palette}
                              colorOverride={isRight ? 'text-primary-foreground/75' : undefined}
                              editingSpeaker={editingSpeaker}
                              editValue={editValue}
                              speakerEditRef={speakerEditRef}
                              onChangeEditValue={setEditValue}
                              onCommit={commitEditSpeaker}
                              onCancel={cancelEditSpeaker}
                              onStart={startEditSpeaker}
                              resolveSpeaker={resolveSpeaker}
                            />
                          )}
                        </div>
                        <p className="text-sm leading-relaxed">{highlightText(block.text, search)}</p>
                      </div>
                      {isRight && (
                        <div className="size-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 text-[9px] font-bold text-primary">
                          {initials || '?'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
            /* ── Timeline / list mode ── */
            : (
              <div className="relative py-2">
                {filteredBlocks.length > 1 && (
                  <div className="absolute left-[27px] top-6 bottom-6 w-px bg-border/50 pointer-events-none" />
                )}
                {filteredBlocks.map((block, i) => {
                  const palette = block.speaker
                    ? (speakerColors.get(block.speaker.trim()) ?? SPEAKER_PALETTE[0])
                    : { text: 'text-muted-foreground', bg: 'bg-border' }
                  const isActive = playerTime !== null && playerTime >= block.start && playerTime <= block.end
                  return (
                    <div key={i} className={`group relative flex items-start gap-3 px-4 py-2.5 rounded-lg transition-colors cursor-default mx-1 ${isActive ? 'bg-primary/10' : 'hover:bg-accent/30'}`}>
                      <div className={`mt-[7px] size-2.5 rounded-full ${palette.bg} ring-2 ring-background z-10 shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <button
                            className="text-[10px] font-mono text-muted-foreground/70 bg-muted rounded px-1.5 py-0.5 shrink-0 hover:bg-primary/20 hover:text-primary transition-colors"
                            onClick={() => audioPlayerRef.current?.seekTo(block.start)}
                            title="Seek to this segment"
                          >
                            {fmt(block.start)}
                          </button>
                          {block.speaker && (
                            <SpeakerLabel
                              raw={block.speaker}
                              palette={palette}
                              editingSpeaker={editingSpeaker}
                              editValue={editValue}
                              speakerEditRef={speakerEditRef}
                              onChangeEditValue={setEditValue}
                              onCommit={commitEditSpeaker}
                              onCancel={cancelEditSpeaker}
                              onStart={startEditSpeaker}
                              resolveSpeaker={resolveSpeaker}
                            />
                          )}
                        </div>
                        {editingBlockStart === block.start
                          ? (
                            <textarea
                              ref={blockEditRef}
                              value={blockEditValue}
                              onChange={e => setBlockEditValue(e.target.value)}
                              onBlur={() => commitBlockEdit(block.start, block.end, block.text)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitBlockEdit(block.start, block.end, block.text) }
                                if (e.key === 'Escape') setEditingBlockStart(null)
                              }}
                              rows={3}
                              className="w-full text-sm text-foreground leading-relaxed bg-background border border-primary/40 rounded-md px-2 py-1 outline-none resize-none focus:ring-1 focus:ring-primary/40"
                            />
                          )
                          : (
                            <p
                              className="text-sm text-foreground/90 leading-relaxed pr-6 cursor-text hover:text-foreground transition-colors"
                              onClick={() => { setEditingBlockStart(block.start); setBlockEditValue(block.text) }}
                              title="Click to edit"
                            >
                              {highlightText(block.text, search)}
                            </p>
                          )
                        }
                      </div>
                      <button
                        onClick={() => navigator.clipboard.writeText(block.text)}
                        className="absolute right-2.5 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
                        title="Copy"
                      >
                        <Copy size={10} strokeWidth={1.5} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          : hasFullText
            ? (
              <div className="px-5 py-4 space-y-3">
                {textParagraphs.map((p, i) => (
                  <p key={i} className="text-sm text-foreground/90 leading-relaxed">{p}</p>
                ))}
              </div>
            )
            : (status === 'pending' || status === 'processing')
            ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 py-16">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground/40" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Transcribing…</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This may take a few minutes</p>
                </div>
                {progress != null && (
                  <div className="w-44 h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
            )
            : status === 'failed'
            ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 px-6 py-16">
                <div className="flex size-12 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Transcription failed</p>
                  {errorMessage && (
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs font-mono break-all">{errorMessage}</p>
                  )}
                </div>
                {onRetry && (
                  <button
                    onClick={() => onRetry()}
                    disabled={isRetrying}
                    className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                    {isRetrying ? 'Retrying…' : 'Try again'}
                  </button>
                )}
                {errorLog.length > 0 && (
                  <div className="w-full max-w-sm">
                    <button
                      onClick={() => setShowLog(v => !v)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center"
                    >
                      {showLog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {showLog ? 'Hide' : 'Show'} error log ({errorLog.length})
                    </button>
                    {showLog && (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {[...errorLog].reverse().map((entry, i) => (
                          <div key={i} className="rounded-lg bg-card border border-border px-3 py-2 text-xs">
                            <p className="text-muted-foreground font-mono mb-1">{new Date(entry.timestamp).toLocaleString()}</p>
                            <p className="text-red-400/80 font-mono break-all">{entry.error}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
            : (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-16">
                <MessageSquareText className="size-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No transcript available</p>
              </div>
            )}
      </div>
    </div>
  )
})

import { Suspense, useState } from 'react'
import { useParams } from '@tanstack/react-router'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { FileText, Columns3, LayoutPanelLeft, Focus, Sparkles, BookOpen, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useTranscription } from './hooks/useTranscription'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SummaryPanel } from './components/SummaryPanel'
import { ChatPanel } from './components/ChatPanel'
import { TranscriptionPageSkeleton } from './components/TranscriptionPageSkeleton'

type Layout = 'panels' | 'reading' | 'focus'
type SidebarTab = 'summary' | 'chat'

const STATUS_BADGE: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  processing: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  pending:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  failed:     'bg-red-500/15 text-red-400 border-red-500/25',
}

const LAYOUT_BUTTONS: { id: Layout; icon: React.ReactNode; title: string }[] = [
  { id: 'panels',  icon: <Columns3 size={13} />,       title: 'Panel view — three resizable columns' },
  { id: 'reading', icon: <LayoutPanelLeft size={13} />, title: 'Reading view — transcript + sidebar tabs' },
  { id: 'focus',   icon: <Focus size={13} />,           title: 'Focus view — full transcript + floating chat' },
]

function TranscriptionContent() {
  const { id } = useParams({ from: '/transcription/$id' })
  const { transcription, isLoading, progress, status, errorMessage, errorLog, retry, isRetrying } = useTranscription(id)
  const [layout, setLayout] = useState<Layout>('panels')
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('summary')
  const [focusChat, setFocusChat] = useState(false)

  const t = transcription as any
  const segments = (t.segments ?? []) as Array<{ text: string; start: number; end: number; speaker?: string }>
  const transcriptionType = t.transcription_type as string | undefined
  const title = t.title ?? t.display_name ?? 'Transcription'

  if (isLoading) return <TranscriptionPageSkeleton />

  const speakerMap = (t.metadata as any)?.speaker_map as Record<string, string> | undefined
  const audioPath = t.audio_path as string | undefined
  const transcriptProps = { segments, fullText: t.text, title, transcriptionId: id, audioPath, speakerMap, status, progress, transcriptionType, errorMessage, errorLog, onRetry: retry, isRetrying }
  const summaryProps   = { summary: t.summary ?? undefined, isCompleted: t.status === 'completed', title, date: t.created_at as string | undefined }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0">
        <div className="flex size-6 items-center justify-center rounded bg-blue-400/15 shrink-0">
          <FileText className="size-3.5 text-blue-400" />
        </div>
        <h1 className="text-sm font-semibold text-foreground truncate flex-1 tracking-tight">{title}</h1>
        {status && (
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0', STATUS_BADGE[status] ?? 'bg-muted text-muted-foreground border-border')}>
            {status}
          </span>
        )}

        {/* Layout switcher */}
        <div className="flex items-center gap-0.5 pl-2 border-l border-border ml-1">
          {LAYOUT_BUTTONS.map(({ id: lid, icon, title: t2 }) => (
            <button
              key={lid}
              onClick={() => { setLayout(lid); setFocusChat(false) }}
              title={t2}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                layout === lid ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              )}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── PANELS layout ── */}
      {layout === 'panels' && (
        <Group orientation="horizontal" className="flex-1 min-h-0">
          <Panel defaultSize={40} minSize={25} className="min-h-0">
            <TranscriptPanel {...transcriptProps} />
          </Panel>
          <Separator className="w-1.5 cursor-col-resize bg-border/40 hover:bg-primary/25 transition-colors duration-150" />
          <Panel defaultSize={25} minSize={15} className="min-h-0">
            <SummaryPanel {...summaryProps} />
          </Panel>
          <Separator className="w-1.5 cursor-col-resize bg-border/40 hover:bg-primary/25 transition-colors duration-150" />
          <Panel defaultSize={35} minSize={20} className="min-h-0">
            <ChatPanel transcriptionId={id} />
          </Panel>
        </Group>
      )}

      {/* ── READING layout ── */}
      {layout === 'reading' && (
        <div className="flex flex-1 min-h-0">
          {/* Wide transcript */}
          <div className="flex-[3] min-h-0 min-w-0 border-r border-border">
            <TranscriptPanel {...transcriptProps} />
          </div>

          {/* Sidebar with tabs */}
          <div className="flex flex-col w-80 shrink-0 min-h-0">
            {/* Tab bar */}
            <div className="flex border-b border-border shrink-0">
              <button
                onClick={() => setSidebarTab('summary')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2',
                  sidebarTab === 'summary'
                    ? 'text-teal-400 border-teal-400'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                )}
              >
                <BookOpen size={11} /> Summary
              </button>
              <button
                onClick={() => setSidebarTab('chat')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2',
                  sidebarTab === 'chat'
                    ? 'text-primary border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:border-border'
                )}
              >
                <Sparkles size={11} /> AI Chat
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden">
              {sidebarTab === 'summary'
                ? <SummaryPanel {...summaryProps} hideHeader />
                : <ChatPanel transcriptionId={id} hideHeader />
              }
            </div>
          </div>
        </div>
      )}

      {/* ── FOCUS layout ── */}
      {layout === 'focus' && (
        <div className="relative flex-1 min-h-0 overflow-hidden">
          <TranscriptPanel {...transcriptProps} />

          {/* Floating AI button */}
          {!focusChat && (
            <button
              onClick={() => setFocusChat(true)}
              className="absolute bottom-5 right-5 flex items-center gap-2 px-3.5 py-2.5 bg-primary text-primary-foreground rounded-full shadow-xl hover:opacity-90 transition-opacity text-xs font-semibold z-10"
            >
              <Sparkles size={13} />
              Ask AI
            </button>
          )}

          {/* Slide-up chat drawer */}
          {focusChat && (
            <div className="absolute inset-x-0 bottom-0 h-[42%] bg-background border-t-2 border-t-primary/30 border-border flex flex-col shadow-2xl z-10">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <div className="flex size-5 items-center justify-center rounded bg-primary/15">
                    <Sparkles className="size-3 text-primary" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Chat</span>
                </div>
                <button
                  onClick={() => setFocusChat(false)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ChatPanel transcriptionId={id} hideHeader />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TranscriptionPage() {
  return (
    <Suspense fallback={<TranscriptionPageSkeleton />}>
      <TranscriptionContent />
    </Suspense>
  )
}

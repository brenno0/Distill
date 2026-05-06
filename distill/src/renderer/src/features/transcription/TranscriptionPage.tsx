import { Suspense } from 'react'
import { useParams } from '@tanstack/react-router'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { useTranscription } from './hooks/useTranscription'
import { TranscriptPanel } from './components/TranscriptPanel'
import { SummaryPanel } from './components/SummaryPanel'
import { ChatPanel } from './components/ChatPanel'
import { TranscriptionPageSkeleton } from './components/TranscriptionPageSkeleton'

function TranscriptionContent() {
  const { id } = useParams({ from: '/transcription/$id' })
  const { transcription, isLoading, progress, status, errorMessage, errorLog, retry, isRetrying } = useTranscription(id)
  const t = transcription as any
  const segments = (t.segments ?? []) as Array<{
    text: string; start: number; end: number; speaker?: string
  }>
  const transcriptionType = t.transcription_type as string | undefined

  if (isLoading) {
    return <TranscriptionPageSkeleton />
  }

  return (
    <Group orientation="horizontal" className="h-full min-h-0">
      <Panel defaultSize={40} minSize={25} className="min-h-0">
        <TranscriptPanel
          segments={segments}
          fullText={t.text}
          status={status}
          progress={progress}
          transcriptionType={transcriptionType}
          errorMessage={errorMessage}
          errorLog={errorLog}
          onRetry={retry}
          isRetrying={isRetrying}
        />
      </Panel>
      <Separator className="w-1 bg-white/5 hover:bg-[var(--color-accent)]/30 transition-colors cursor-col-resize" />
      <Panel defaultSize={25} minSize={15} className="min-h-0">
        <SummaryPanel
          summary={t.summary ?? undefined}
          isCompleted={t.status === 'completed'}
        />
      </Panel>
      <Separator className="w-1 bg-white/5 hover:bg-[var(--color-accent)]/30 transition-colors cursor-col-resize" />
      <Panel defaultSize={35} minSize={20} className="min-h-0">
        <ChatPanel transcriptionId={id} />
      </Panel>
    </Group>
  )
}

export function TranscriptionPage() {
  return (
    <Suspense
      fallback={
        <TranscriptionPageSkeleton />
      }
    >
      <TranscriptionContent />
    </Suspense>
  )
}

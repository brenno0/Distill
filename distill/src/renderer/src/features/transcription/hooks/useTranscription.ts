import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getTranscriptions } from '@renderer/lib/api/generated/transcriptions/transcriptions'
import { wsManager } from '@renderer/lib/ws'

const transcriptionsApi = getTranscriptions()

const TERMINAL_STATUSES = new Set(['completed', 'failed'])

export function useTranscription(id: string) {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['transcription', id],
    queryFn: () => transcriptionsApi.getTranscriptionApiV1TranscriptionsTranscriptionIdGet(id),
    retry: false,
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status
      return TERMINAL_STATUSES.has(status) ? false : 3000
    },
  })

  const status = (data as any)?.status

  useEffect(() => {
    if (!id || TERMINAL_STATUSES.has(status)) {
      setProgress(null)
      return
    }

    wsManager.connect(id, (event) => {
      const p = (event.data as any)?.progress
      if (typeof p === 'number') setProgress(p)
      queryClient.invalidateQueries({ queryKey: ['transcription', id] })
    })

    return () => wsManager.disconnect(id)
  }, [id, status, queryClient])

  return { transcription: data ?? {}, isLoading, progress, status }
}

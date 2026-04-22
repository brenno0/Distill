import { useQuery } from '@tanstack/react-query'
import { getTranscriptions } from '@renderer/lib/api/generated/transcriptions/transcriptions'

const transcriptionsApi = getTranscriptions()

export function useTranscription(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['transcription', id],
    queryFn: () => transcriptionsApi.getTranscriptionApiV1TranscriptionsTranscriptionIdGet(id),
    retry: false,
  })
  return { transcription: data ?? {}, isLoading }
}

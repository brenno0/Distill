import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTranscriptions } from '@renderer/lib/api/generated/transcriptions/transcriptions'
import { getOllama } from '@renderer/lib/api/generated/ollama/ollama'

const transcriptionsApi = getTranscriptions()
const ollamaApi = getOllama()

export function useDashboard() {
  const queryClient = useQueryClient()

  const { data: transcriptions, isLoading: isTranscriptionsLoading } = useQuery({
    queryKey: ['transcriptions'],
    queryFn: () => transcriptionsApi.listTranscriptionsApiV1TranscriptionsGet(),
    retry: false,
  })

  const { data: ollamaStatus, isLoading: isOllamaStatusLoading } = useQuery({
    queryKey: ['ollama', 'status'],
    queryFn: () => ollamaApi.ollamaStatusApiV1OllamaStatusGet(),
    refetchInterval: 5000,
    retry: false,
  })

  const startOllama = useMutation({
    mutationFn: ollamaApi.startOllamaApiV1OllamaStartPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ollama'] }),
  })

  const stopOllama = useMutation({
    mutationFn: ollamaApi.stopOllamaApiV1OllamaStopPost,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ollama'] }),
  })

  const list = transcriptions ?? []
  const completed = list.filter((t) => t.status === 'completed')
  const totalHours = completed.reduce((acc, t) => acc + ((t as any).duration ?? 0), 0) / 3600
  const recentRecordings = [...list]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return {
    totalRecordings: list.length,
    totalHours: Math.round(totalHours * 10) / 10,
    completedCount: completed.length,
    recentRecordings,
    ollamaRunning: (ollamaStatus as any)?.running ?? false,
    startOllama: () => startOllama.mutate(),
    stopOllama: () => stopOllama.mutate(),
    isLoading: isTranscriptionsLoading || isOllamaStatusLoading,
  }
}

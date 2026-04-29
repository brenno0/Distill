import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useRef } from 'react'
import { getRecordings } from '@renderer/lib/api/generated/recordings/recordings'
import { useRecordingStore } from '@renderer/stores/useRecordingStore'
import { axiosInstance } from '@renderer/lib/axios'

const recordingsApi = getRecordings()

export function useRecording() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isRecording = useRecordingStore((s) => s.isRecording)
  const transcriptionId = useRecordingStore((s) => s.transcriptionId)
  const audioLevel = useRecordingStore((s) => s.audioLevel)
  const monitorLevel = useRecordingStore((s) => s.monitorLevel)
  const elapsedSeconds = useRecordingStore((s) => s.elapsedSeconds)
  const { startRecording, stopRecording } = useRecordingStore.getState()
  const pendingTitleRef = useRef('')

  const startMutation = useMutation({
    mutationFn: recordingsApi.startRecordingApiV1RecordingsStartPost,
    onSuccess: async (data: any) => {
      startRecording(data.transcription_id)
      const title = pendingTitleRef.current.trim()
      if (title) {
        try {
          await axiosInstance({ url: `/api/v1/transcriptions/${data.transcription_id}`, method: 'PATCH', data: { title } })
        } catch { /* ignore — title stays as default */ }
      }
      pendingTitleRef.current = ''
    },
  })

  const stopMutation = useMutation({
    mutationFn: recordingsApi.stopRecordingApiV1RecordingsStopPost,
    onSuccess: () => {
      const id = transcriptionId
      stopRecording()
      queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
      if (id) navigate({ to: '/transcription/$id', params: { id } })
    },
  })

  const start = (title = '') => {
    pendingTitleRef.current = title
    startMutation.mutate()
  }

  return {
    isRecording,
    elapsedSeconds,
    audioLevel,
    monitorLevel,
    transcriptionId,
    start,
    stop: stopMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  }
}

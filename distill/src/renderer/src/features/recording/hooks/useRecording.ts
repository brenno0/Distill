import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
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
  const elapsedSeconds = useRecordingStore((s) => s.elapsedSeconds)
  const { startRecording, stopRecording, setAudioLevel, tickElapsed } = useRecordingStore.getState()
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startMutation = useMutation({
    mutationFn: recordingsApi.startRecordingApiV1RecordingsStartPost,
    onSuccess: (data: any) => {
      startRecording(data.transcription_id)
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

  useEffect(() => {
    if (!isRecording) return

    timerRef.current = setInterval(tickElapsed, 1000)
    levelIntervalRef.current = setInterval(async () => {
      try {
        const data = await axiosInstance<{ level: number }>({ url: '/api/v1/recordings/level', method: 'GET' })
        setAudioLevel((data as any).level ?? 0)
      } catch {
        // ignore
      }
    }, 100)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (levelIntervalRef.current) clearInterval(levelIntervalRef.current)
    }
  }, [isRecording, tickElapsed, setAudioLevel])

  return {
    isRecording,
    elapsedSeconds,
    audioLevel,
    transcriptionId,
    start: startMutation.mutate,
    stop: stopMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
  }
}

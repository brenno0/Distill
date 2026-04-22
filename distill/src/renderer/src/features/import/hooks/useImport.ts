import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getYoutube } from '@renderer/lib/api/generated/youtube/youtube'
import { useTranscriptionStore } from '@renderer/stores/useTranscriptionStore'
import { wsManager } from '@renderer/lib/ws'

const youtubeApi = getYoutube()

const YT_REGEX = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/

export function useImport() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const { setCurrentId, setStatus, setProgress, reset } = useTranscriptionStore.getState()
  const progress = useTranscriptionStore((s) => s.progress)
  const status = useTranscriptionStore((s) => s.status)

  const importMutation = useMutation({
    mutationFn: () => youtubeApi.processYoutubeApiV1YoutubeProcessPost({ url }),
    onSuccess: (data: any) => {
      const id = data.transcription_id as string
      setCurrentId(id)
      setStatus('downloading')

      wsManager.connect(id, (event) => {
        if (event.type === 'youtube_download_start') setStatus('downloading')
        if (event.type === 'transcription_start') setStatus('transcribing')
        if (event.type === 'transcription_progress') setProgress((event.data.progress as number) ?? 0)
        if (event.type === 'pipeline_complete') {
          queryClient.invalidateQueries({ queryKey: ['transcriptions'] })
          navigate({ to: '/transcription/$id', params: { id } })
          reset()
        }
        if (event.type === 'pipeline_error') setStatus('failed')
      })
    },
  })

  const submit = () => {
    if (!YT_REGEX.test(url)) {
      setUrlError('Please enter a valid YouTube URL')
      return
    }
    setUrlError(null)
    importMutation.mutate()
  }

  return { url, setUrl, urlError, submit, progress, status, isPending: importMutation.isPending }
}

import { createFileRoute } from '@tanstack/react-router'
import { TranscriptionPage } from '@renderer/features/transcription/TranscriptionPage'

export const Route = createFileRoute('/transcription/$id')({ component: TranscriptionPage })

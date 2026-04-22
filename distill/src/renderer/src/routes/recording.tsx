import { createFileRoute } from '@tanstack/react-router'
import { RecordingPage } from '@renderer/features/recording/RecordingPage'

export const Route = createFileRoute('/recording')({ component: RecordingPage })

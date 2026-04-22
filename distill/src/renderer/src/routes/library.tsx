import { createFileRoute } from '@tanstack/react-router'
import { LibraryPage } from '@renderer/features/library/LibraryPage'

export const Route = createFileRoute('/library')({ component: LibraryPage })

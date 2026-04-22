import { createFileRoute } from '@tanstack/react-router'
import { ImportPage } from '@renderer/features/import/ImportPage'

export const Route = createFileRoute('/import')({ component: ImportPage })

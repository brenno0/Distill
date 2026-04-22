import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage } from '@renderer/features/dashboard/DashboardPage'

export const Route = createFileRoute('/')({ component: DashboardPage })

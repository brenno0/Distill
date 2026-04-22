import { Skeleton } from './skeleton'

export function PageLoadingSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} data-testid="page-skeleton-row" className="h-20 w-full rounded-lg" />
      ))}
    </div>
  )
}
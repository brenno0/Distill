import { Skeleton } from '@renderer/components/ui/skeleton'

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div className="space-y-3">
        <Skeleton className="h-10 w-56 bg-white/10" />
        <Skeleton className="h-5 w-96 max-w-full bg-white/10" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-11 w-44 rounded-lg bg-white/10" />
        <Skeleton className="h-11 w-36 rounded-lg bg-white/10" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-28 w-full rounded-xl bg-white/10" />
        <Skeleton className="h-28 w-full rounded-xl bg-white/10" />
        <Skeleton className="h-28 w-full rounded-xl bg-white/10" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-6 w-40 bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-lg bg-white/10" />
          <Skeleton className="h-14 w-full rounded-lg bg-white/10" />
          <Skeleton className="h-14 w-full rounded-lg bg-white/10" />
        </div>
      </div>
    </div>
  )
}

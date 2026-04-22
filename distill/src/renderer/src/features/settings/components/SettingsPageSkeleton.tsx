import { Skeleton } from '@renderer/components/ui/skeleton'

export function SettingsPageSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-44 shrink-0 border-r border-white/5 p-4 space-y-2">
        <Skeleton className="h-8 w-full rounded-lg bg-white/10" />
        <Skeleton className="h-8 w-full rounded-lg bg-white/10" />
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <Skeleton className="h-6 w-48 bg-white/10" />
        <Skeleton className="h-4 w-20 bg-white/10" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full max-w-md bg-white/10" />
          <Skeleton className="h-10 w-full max-w-md bg-white/10" />
          <Skeleton className="h-10 w-24 bg-white/10" />
        </div>
      </div>
    </div>
  )
}

export function SettingsStatusSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border border-white/8 bg-white/3 space-y-3">
        <Skeleton className="h-4 w-24 bg-white/10" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-full bg-white/10" />
          <Skeleton className="h-8 w-full bg-white/10" />
        </div>
      </div>
    </div>
  )
}

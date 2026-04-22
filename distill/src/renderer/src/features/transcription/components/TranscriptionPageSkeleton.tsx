import { Skeleton } from '@renderer/components/ui/skeleton'

function PanelSkeleton() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <Skeleton className="h-4 w-24 bg-white/10" />
      </div>
      <div className="flex-1 p-3 space-y-3">
        <Skeleton className="h-4 w-full bg-white/10" />
        <Skeleton className="h-4 w-[92%] bg-white/10" />
        <Skeleton className="h-4 w-[78%] bg-white/10" />
        <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
      </div>
    </div>
  )
}

export function TranscriptionPageSkeleton() {
  return (
    <div className="flex h-full min-h-0">
      <div className="basis-[40%] min-h-0">
        <PanelSkeleton />
      </div>
      <div className="w-1 bg-white/5" />
      <div className="basis-[25%] min-h-0">
        <PanelSkeleton />
      </div>
      <div className="w-1 bg-white/5" />
      <div className="basis-[35%] min-h-0">
        <PanelSkeleton />
      </div>
    </div>
  )
}

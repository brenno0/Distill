import { Skeleton } from "@renderer/components/ui/skeleton"

export function LibraryPageSkeleton() {
  return (
    <div className="flex flex-col h-full min-h-0 p-6 overflow-hidden space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-52 bg-white/10" />
        <Skeleton className="h-5 w-80 max-w-full bg-white/10" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-10 max-w-md flex-1 bg-white/10" />
          <Skeleton className="h-10 w-10 bg-white/10" />
        </div>
        <Skeleton className="h-10 w-24 bg-white/10" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-44 w-full rounded-xl bg-white/10" />
        ))}
      </div>
    </div>
  )
}

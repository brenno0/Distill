import { Skeleton } from '@renderer/components/ui/skeleton'

export function ChatPendingSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="bg-white/5 rounded-xl px-3 py-2 space-y-2 min-w-48">
        <Skeleton className="h-3 w-full bg-white/10" />
        <Skeleton className="h-3 w-[80%] bg-white/10" />
      </div>
    </div>
  )
}

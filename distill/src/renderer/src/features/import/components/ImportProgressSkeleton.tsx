import { Skeleton } from "@renderer/components/ui/skeleton"

export function ImportProgressSkeleton() {
  return (
    <div className="space-y-2" aria-live="polite">
      <p className="text-sm text-muted-foreground">Preparing import…</p>
      <Skeleton className="h-1.5 w-full rounded-full bg-white/10" />
      <Skeleton className="h-3 w-10 ml-auto bg-white/10" />
    </div>
  )
}

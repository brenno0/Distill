import { Skeleton } from "@renderer/components/ui/skeleton"

export function ImportPageSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center space-y-3">
          <Skeleton className="h-10 w-80 max-w-full mx-auto bg-white/10" />
          <Skeleton className="h-6 w-96 max-w-full mx-auto bg-white/10" />
        </div>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1 bg-white/10" />
            <Skeleton className="h-10 w-24 bg-white/10" />
          </div>
          <Skeleton className="h-3 w-44 bg-white/10" />
        </div>
      </div>
    </div>
  )
}

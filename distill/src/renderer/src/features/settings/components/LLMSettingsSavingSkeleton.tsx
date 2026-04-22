import { Skeleton } from '@renderer/components/ui/skeleton'

export function LLMSettingsSavingSkeleton() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <Skeleton className="h-4 w-28 bg-white/10" />
      <Skeleton className="h-10 w-full max-w-md bg-white/10" />
    </div>
  )
}

import { memo } from "react"

export const VUMeter = memo(function VUMeter({ level }: { level: number }) {
  const bars = 12
  const filledBars = Math.round(level * bars)
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 rounded-sm transition-all duration-75 ${
            i < filledBars ? "bg-primary" : "bg-muted"
          }`}
          style={{ height: `${40 + i * 5}%` }}
        />
      ))}
    </div>
  )
})

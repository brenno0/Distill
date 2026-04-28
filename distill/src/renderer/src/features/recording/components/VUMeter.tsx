import { memo } from "react"

interface VUMeterProps {
  level: number
  label?: string
}

// RMS range: ~0.001 (silence) to ~0.3 (loud)
// Map to dB, normalize over -60dB..0dB window
function scaledBars(level: number, bars: number): number {
  if (level < 0.001) return 0
  const db = 20 * Math.log10(level)
  const normalized = Math.max(0, Math.min(1, (db + 60) / 60))
  return Math.round(normalized * bars)
}

export const VUMeter = memo(function VUMeter({ level, label }: VUMeterProps) {
  const bars = 12
  const filledBars = scaledBars(level, bars)
  return (
    <div className="flex flex-col items-center gap-1">
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
      <div className="flex items-end gap-0.5 h-8">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-sm transition-all duration-75 ${
              i < filledBars
                ? i < bars * 0.6
                  ? "bg-primary"
                  : i < bars * 0.85
                    ? "bg-yellow-400"
                    : "bg-red-500"
                : "bg-muted"
            }`}
            style={{ height: `${40 + i * 5}%` }}
          />
        ))}
      </div>
    </div>
  )
})

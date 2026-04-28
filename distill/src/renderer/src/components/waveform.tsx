import { useEffect, useRef } from "react"
import { animate, stagger, JSAnimation } from "animejs"
import { cn } from "@renderer/lib/utils"

interface WaveformProps {
  isAnimating?: boolean
  audioLevel?: number
  className?: string
  barCount?: number
}

function dbScale(level: number): number {
  if (level < 0.001) return 0
  const db = 20 * Math.log10(level)
  return Math.max(0, Math.min(1, (db + 60) / 60))
}

export function Waveform({
  isAnimating = true,
  audioLevel,
  className,
  barCount = 7
}: WaveformProps) {
  const barsRef = useRef<HTMLDivElement[]>([])
  const idleAnimRef = useRef<JSAnimation | null>(null)
  const hasLevel = audioLevel !== undefined

  // Idle loop animation (when no live level data)
  useEffect(() => {
    if (!isAnimating || hasLevel) return

    idleAnimRef.current = animate(barsRef.current, {
      height: [
        { value: "20%", duration: 300 },
        { value: "80%", duration: 300 },
        { value: "40%", duration: 300 },
        { value: "60%", duration: 300 },
      ],
      delay: stagger(80),
      loop: true,
      direction: "alternate",
      easing: "easeInOutSine",
    })

    return () => {
      idleAnimRef.current?.pause()
    }
  }, [isAnimating, hasLevel])

  // Reactive animation driven by actual audio level
  useEffect(() => {
    if (!hasLevel || !isAnimating || barsRef.current.length === 0) return

    const scaled = dbScale(audioLevel!)
    const minH = 8
    const maxH = 90

    animate(
      barsRef.current,
      {
        height: barsRef.current.map((_, i) => {
          // Organic variation per bar: centre bars taller
          const wave = 0.65 + Math.sin((i / (barCount - 1)) * Math.PI) * 0.35
          const h = minH + scaled * (maxH - minH) * wave
          return `${h}%`
        }),
        duration: 80,
        easing: "easeOutQuad",
      }
    )
  }, [audioLevel, isAnimating, hasLevel, barCount])

  return (
    <div className={cn("flex items-center justify-center gap-1 h-8", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) barsRef.current[i] = el
          }}
          className="w-1 rounded-full bg-primary"
          style={{ height: "8%" }}
        />
      ))}
    </div>
  )
}

export function WaveformStatic({ className }: { className?: string }) {
  const heights = [30, 60, 45, 80, 55, 70, 40]
  const barsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    animate(barsRef.current, {
      scaleY: [1, 1.1, 1],
      delay: stagger(50),
      duration: 1500,
      loop: true,
      direction: "alternate",
      easing: "easeInOutSine",
    })
  }, [])

  return (
    <div className={cn("flex items-end justify-center gap-1 h-16", className)}>
      {heights.map((height, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) barsRef.current[i] = el
          }}
          className="w-1.5 rounded-full bg-primary/60 origin-bottom"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  )
}

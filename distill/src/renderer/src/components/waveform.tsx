import { useEffect, useRef } from "react"
import { animate, stagger, JSAnimation } from "animejs"
import { cn } from "@renderer/lib/utils"

interface WaveformProps {
  isAnimating?: boolean
  className?: string
  barCount?: number
}

export function Waveform({
  isAnimating = true,
  className,
  barCount = 7
}: WaveformProps) {
  const barsRef = useRef<HTMLDivElement[]>([])
  const animationRef = useRef<JSAnimation | null>(null)

  useEffect(() => {
    if (isAnimating && barsRef.current.length > 0) {
      animationRef.current = animate(barsRef.current, {
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
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.pause()
      }
    }
  }, [isAnimating])

  return (
    <div className={cn("flex items-center justify-center gap-1 h-8", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) barsRef.current[i] = el
          }}
          className="w-1 rounded-full bg-primary"
          style={{
            height: isAnimating ? "40%" : `${Math.random() * 60 + 20}%`,
          }}
        />
      ))}
    </div>
  )
}

export function WaveformStatic({ className }: { className?: string }) {
  const heights = [30, 60, 45, 80, 55, 70, 40]
  const barsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    // Subtle idle animation
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

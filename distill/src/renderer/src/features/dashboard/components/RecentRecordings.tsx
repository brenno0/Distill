import { useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { animate, stagger } from "animejs"
import { gsap } from "gsap"
import { Play, MoreHorizontal } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@renderer/components/ui/card"
import { WaveformStatic } from "@renderer/components/waveform"
import { cn } from "@renderer/lib/utils"

interface Recording {
  id: string
  title?: string
  created_at: string
  status: string
}

interface Props {
  recordings: Recording[]
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-green-500/15 text-green-400 border-green-500/20",
  processing: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
}

export function RecentRecordings({ recordings }: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  useEffect(() => {
    if (cardsRef.current.length === 0) return
    animate(cardsRef.current, {
      opacity: [0, 1],
      translateY: [30, 0],
      delay: stagger(100, { start: 700 }),
      duration: 500,
      easing: "easeOutCubic",
    })
  }, [recordings.length])

  const handleHover = (index: number, isEntering: boolean) => {
    const card = cardsRef.current[index]
    if (card) {
      gsap.to(card, {
        scale: isEntering ? 1.02 : 1,
        y: isEntering ? -4 : 0,
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recent Recordings</h2>
        <p className="text-muted-foreground text-sm">No recordings yet. Start your first recording!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Recent Recordings</h2>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground">
          <Link to="/library">View All →</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recordings.map((recording, index) => (
          <Card
            key={recording.id}
            ref={(el) => { if (el) cardsRef.current[index] = el }}
            onMouseEnter={() => handleHover(index, true)}
            onMouseLeave={() => handleHover(index, false)}
            className="group bg-card border-border hover:border-primary/40 transition-colors cursor-pointer"
          >
            <Link to="/transcription/$id" params={{ id: recording.id }} className="block">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-semibold tracking-tight text-foreground truncate">
                      {recording.title ?? "Untitled Recording"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(recording.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border font-medium capitalize",
                      STATUS_BADGE[recording.status] ?? "bg-muted text-muted-foreground border-border"
                    )}
                  >
                    {recording.status}
                  </span>
                  <div className="flex items-center gap-2">
                    {recording.status === "processing" ? (
                      <span className="flex gap-0.5 items-end h-5">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className="waveform-bar w-1 h-full"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </span>
                    ) : (
                      <WaveformStatic className="w-20 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-primary hover:bg-primary/10"
                      onClick={(e) => e.preventDefault()}
                    >
                      <Play className="size-3.5 fill-current" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}

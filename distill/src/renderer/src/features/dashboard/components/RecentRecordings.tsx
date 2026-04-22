import { useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { animate, stagger } from "animejs"
import { gsap } from "gsap"
import { Play, MoreHorizontal } from "lucide-react"
import { Button } from "@renderer/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@renderer/components/ui/card"
import { Avatar, AvatarFallback } from "@renderer/components/ui/avatar"
import { WaveformStatic } from "@renderer/components/waveform"

interface Recording {
  id: string
  title?: string
  created_at: string
  status: string
}

interface Props {
  recordings: Recording[]
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
        <h2 className="text-2xl font-semibold text-foreground">Recent Recordings</h2>
        <p className="text-muted-foreground text-sm">No recordings yet. Start your first recording!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Recent Recordings</h2>
        <Button variant="ghost" asChild>
          <Link to="/library">View All</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {recordings.map((recording, index) => (
          <Card
            key={recording.id}
            ref={(el) => { if (el) cardsRef.current[index] = el }}
            onMouseEnter={() => handleHover(index, true)}
            onMouseLeave={() => handleHover(index, false)}
            className="group bg-card border-border hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Link to="/transcription/$id" params={{ id: recording.id }} className="block">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-foreground truncate">
                      {recording.title ?? "Untitled Recording"}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground mt-1">
                      {new Date(recording.created_at).toLocaleDateString()} · {recording.status}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.preventDefault()}>
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <Avatar className="size-7 border-2 border-card">
                      <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">R</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center gap-3">
                    {recording.status === "processing" ? (
                      <span className="text-sm text-muted-foreground">Processing...</span>
                    ) : (
                      <WaveformStatic className="w-20 h-6 opacity-60 group-hover:opacity-100 transition-opacity" />
                    )}
                    <Button variant="ghost" size="icon" className="text-primary" onClick={(e) => e.preventDefault()}>
                      <Play className="size-4 fill-current" />
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

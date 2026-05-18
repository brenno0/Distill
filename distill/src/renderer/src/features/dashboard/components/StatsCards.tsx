import { useRef, useEffect } from "react"
import { animate, stagger } from "animejs"
import { gsap } from "gsap"
import { Mic, Clock, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@renderer/components/ui/card"
import { cn } from "@renderer/lib/utils"

interface Props {
  total: number
  hours: number
  completed: number
}

export function StatsCards({ total, hours, completed }: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  const stats = [
    {
      title: "Total Recordings",
      value: String(total),
      icon: Mic,
      iconClass: "text-coral bg-coral/15",
      accentClass: "border-l-coral",
    },
    {
      title: "Hours Recorded",
      value: String(hours),
      icon: Clock,
      iconClass: "text-teal-400 bg-teal-400/15",
      accentClass: "border-l-teal-400",
    },
    {
      title: "Transcriptions",
      value: String(completed),
      icon: FileText,
      iconClass: "text-blue-400 bg-blue-400/15",
      accentClass: "border-l-blue-400",
    },
    {
      title: "Key Insights",
      value: "—",
      icon: TrendingUp,
      iconClass: "text-green-400 bg-green-400/15",
      accentClass: "border-l-green-400",
    },
  ]

  useEffect(() => {
    animate(cardsRef.current, {
      opacity: [0, 1],
      translateY: [40, 0],
      scale: [0.9, 1],
      delay: stagger(80, { start: 400 }),
      duration: 600,
      easing: "easeOutCubic",
    })
  }, [])

  const handleHover = (index: number, isEntering: boolean) => {
    const card = cardsRef.current[index]
    if (card) {
      gsap.to(card, {
        scale: isEntering ? 1.03 : 1,
        boxShadow: isEntering
          ? "0 10px 30px rgba(0,0,0,0.35)"
          : "0 1px 3px rgba(0,0,0,0.2)",
        duration: 0.3,
        ease: "power2.out",
      })
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card
          key={stat.title}
          className={cn(
            "bg-card border-border border-l-2 overflow-hidden cursor-pointer",
            stat.accentClass
          )}
          ref={(el) => { if (el) cardsRef.current[index] = el }}
          onMouseEnter={() => handleHover(index, true)}
          onMouseLeave={() => handleHover(index, false)}
        >
          <CardHeader className="pb-2 pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {stat.title}
              </p>
              <span className={cn("p-1.5 rounded-md", stat.iconClass)}>
                <stat.icon className="size-3.5" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-5">
            <span className="text-4xl font-bold tracking-tight text-foreground">
              {stat.value}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

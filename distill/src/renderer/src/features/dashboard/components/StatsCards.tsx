import { useRef, useEffect } from "react"
import { animate, stagger } from "animejs"
import { gsap } from "gsap"
import { Mic, Clock, FileText, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardDescription } from "@renderer/components/ui/card"

interface Props {
  total: number
  hours: number
  completed: number
}

export function StatsCards({ total, hours, completed }: Props) {
  const cardsRef = useRef<HTMLDivElement[]>([])

  const stats = [
    { title: "Total Recordings", value: String(total), icon: Mic },
    { title: "Hours Recorded", value: String(hours), icon: Clock },
    { title: "Transcriptions", value: String(completed), icon: FileText },
    { title: "Key Insights", value: "—", icon: TrendingUp },
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
        boxShadow: isEntering ? "0 10px 30px rgba(0,0,0,0.12)" : "0 1px 3px rgba(0,0,0,0.1)",
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
          className="bg-card border-border cursor-pointer"
          ref={(el) => { if (el) cardsRef.current[index] = el }}
          onMouseEnter={() => handleHover(index, true)}
          onMouseLeave={() => handleHover(index, false)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-muted-foreground">{stat.title}</CardDescription>
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-foreground">{stat.value}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

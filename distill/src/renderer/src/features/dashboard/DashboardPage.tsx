import { useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import { Mic, FileText } from "lucide-react"
import { gsap } from "gsap"
import { Button } from "@renderer/components/ui/button"
import { useDashboard } from "./hooks/useDashboard"
import { StatsCards } from "./components/StatsCards"
import { RecentRecordings } from "./components/RecentRecordings"
import { OllamaStatusBadge } from "./components/OllamaStatusBadge"
import { DashboardPageSkeleton } from "./components/DashboardPageSkeleton"

function DashboardContent() {
  const {
    totalRecordings,
    totalHours,
    completedCount,
    recentRecordings,
    ollamaRunning,
    startOllama,
    stopOllama,
    isLoading,
  } = useDashboard()

  const headerRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLoading) return
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { opacity: 0, y: -30 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" })
    }
    if (actionsRef.current) {
      gsap.fromTo(
        actionsRef.current.children,
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: "back.out(1.5)", delay: 0.3 }
      )
    }
  }, [isLoading])

  if (isLoading) {
    return <DashboardPageSkeleton />
  }

  return (
    <div className="flex flex-col gap-8 p-6 md:p-8">
      <div className="flex flex-col gap-2" ref={headerRef}>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold text-foreground">Dashboard</h1>
          <OllamaStatusBadge running={ollamaRunning} onStart={startOllama} onStop={stopOllama} />
        </div>
        <p className="text-lg text-muted-foreground">Visão geral das suas gravações e atividade.</p>
      </div>

      <div className="flex flex-wrap gap-3" ref={actionsRef}>
        <Button asChild size="lg" className="gap-2 transition-transform hover:scale-105">
          <Link to="/recording">
            <Mic className="size-5" />
            Gravar
          </Link>
        </Button>
        <Button variant="outline" size="lg" className="gap-2 transition-transform hover:scale-105" asChild>
          <Link to="/import">
            <FileText className="size-5" />
            Importar Áudio
          </Link>
        </Button>
      </div>

      <StatsCards total={totalRecordings} hours={totalHours} completed={completedCount} />
      <RecentRecordings recordings={recentRecordings} />
    </div>
  )
}

export function DashboardPage() {
  return <DashboardContent />
}

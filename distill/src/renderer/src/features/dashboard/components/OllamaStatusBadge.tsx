import { Badge } from "@renderer/components/ui/badge"
import { Button } from "@renderer/components/ui/button"

interface Props {
  running: boolean
  onStart: () => void
  onStop: () => void
}

export function OllamaStatusBadge({ running, onStart, onStop }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant={running ? "default" : "secondary"} className="gap-1.5">
        <span className={`size-1.5 rounded-full ${running ? "bg-green-400" : "bg-muted-foreground"}`} />
        Ollama {running ? "Running" : "Stopped"}
      </Badge>
      <Button variant="outline" size="sm" onClick={running ? onStop : onStart}>
        {running ? "Stop" : "Start"}
      </Button>
    </div>
  )
}

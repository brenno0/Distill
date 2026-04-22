import { memo } from "react"
import { Mic, Square } from "lucide-react"
import { Button } from "@renderer/components/ui/button"

interface Props {
  isRecording: boolean
  isStarting: boolean
  isStopping: boolean
  elapsedSeconds: number
  onStart: () => void
  onStop: () => void
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
}

export const RecordingControls = memo(function RecordingControls({
  isRecording, isStarting, isStopping, elapsedSeconds, onStart, onStop,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl text-foreground font-mono tabular-nums">{formatTime(elapsedSeconds)}</span>
      <div className="flex items-center gap-4">
        {!isRecording ? (
          <Button
            size="lg"
            className="h-14 px-8 gap-3 text-lg bg-primary hover:bg-primary/90"
            onClick={onStart}
            disabled={isStarting}
          >
            <Mic className="size-6" />
            {isStarting ? "Starting..." : "Start Recording"}
          </Button>
        ) : (
          <Button
            variant="destructive"
            size="lg"
            className="h-12 px-6 gap-2 transition-transform hover:scale-105"
            onClick={onStop}
            disabled={isStopping}
          >
            <Square className="size-5 fill-current" />
            {isStopping ? "Stopping..." : "Stop Recording"}
          </Button>
        )}
      </div>
    </div>
  )
})

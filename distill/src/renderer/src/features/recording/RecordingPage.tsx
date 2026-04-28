import { useRef, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import { animate } from "animejs"
import { Mic } from "lucide-react"
import { cn } from "@renderer/lib/utils"
import { useRecording } from "./hooks/useRecording"
import { Waveform } from "./components/Waveform"
import { VUMeter } from "./components/VUMeter"
import { RecordingControls } from "./components/RecordingControls"
import { LiveTranscriptPreview } from "./components/LiveTranscriptPreview"

export function RecordingPage() {
  const navigate = useNavigate()
  const { isRecording, elapsedSeconds, audioLevel, monitorLevel, transcriptionId, start, stop, isStarting, isStopping } =
    useRecording()

  const containerRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (titleRef.current) animate(titleRef.current, { opacity: [0, 1], translateY: [-30, 0], duration: 600, easing: "easeOutCubic" })
    if (indicatorRef.current) animate(indicatorRef.current, { opacity: [0, 1], scale: [0.5, 1], duration: 800, easing: "easeOutBack", delay: 300 })
    if (controlsRef.current) animate(controlsRef.current, { opacity: [0, 1], translateY: [30, 0], duration: 500, easing: "easeOutQuad", delay: 500 })
  }, [])

  useEffect(() => {
    if (transcriptionId && !isRecording && containerRef.current) {
      animate(containerRef.current, {
        opacity: [1, 0],
        scale: [1, 0.95],
        duration: 400,
        easing: "easeInQuad",
        complete: () => navigate({ to: "/transcription/$id", params: { id: transcriptionId } }),
      })
    }
  }, [transcriptionId, isRecording, navigate])

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center min-h-screen bg-background p-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-xl">
        <div className="text-center" ref={titleRef}>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            {isRecording ? "Recording..." : "Ready to Record"}
          </h1>
          <p className="text-lg text-muted-foreground">
            {isRecording ? "Your audio is being captured in real-time" : "Start a new recording"}
          </p>
        </div>

        <div ref={indicatorRef} className="relative flex items-center justify-center w-48 h-48 rounded-full">
          <div className={cn(
            "absolute inset-0 rounded-full transition-all duration-500",
            isRecording ? "bg-primary/20" : "bg-muted/20"
          )} />
          <div className={cn(
            "relative flex items-center justify-center w-36 h-36 rounded-full transition-all duration-300",
            isRecording ? "bg-primary/30" : "bg-muted/30"
          )}>
            {isRecording ? (
              <Waveform audioLevel={audioLevel} isRecording={isRecording} />
            ) : (
              <Mic className="size-16 text-muted-foreground" />
            )}
          </div>
        </div>

        {isRecording && (
          <div className="flex items-end gap-6">
            <VUMeter level={audioLevel} label="Microfone" />
            <VUMeter level={monitorLevel} label={monitorLevel > 0 ? "Fone de ouvido" : "Fone de ouvido (inativo)"} />
          </div>
        )}

        <div ref={controlsRef}>
          <RecordingControls
            isRecording={isRecording}
            isStarting={isStarting}
            isStopping={isStopping}
            elapsedSeconds={elapsedSeconds}
            onStart={start}
            onStop={stop}
          />
        </div>

        <LiveTranscriptPreview transcriptionId={transcriptionId} />
      </div>
    </div>
  )
}

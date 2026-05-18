import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

export interface AudioPlayerHandle {
  seekTo: (time: number) => void
}

interface AudioPlayerProps {
  transcriptionId: string
  onTimeUpdate?: (time: number) => void
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const AudioPlayer = forwardRef<AudioPlayerHandle, AudioPlayerProps>(function AudioPlayer(
  { transcriptionId, onTimeUpdate },
  ref
) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [current, setCurrent] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState(false)
  const src = `http://localhost:47821/api/v1/transcriptions/${transcriptionId}/audio`

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      const el = audioRef.current
      if (!el) return
      el.currentTime = time
      el.play()
    }
  }))

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    const onMeta = () => setDuration(el.duration || 0)
    const onTime = () => {
      setCurrent(el.currentTime)
      onTimeUpdate?.(el.currentTime)
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => setError(true)
    el.addEventListener('loadedmetadata', onMeta)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('error', onError)
    return () => {
      el.removeEventListener('loadedmetadata', onMeta)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('error', onError)
    }
  }, [onTimeUpdate])

  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    playing ? el.pause() : el.play()
  }, [playing])

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = audioRef.current
      if (!el || !duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      el.currentTime = ((e.clientX - rect.left) / rect.width) * duration
    },
    [duration]
  )

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [speed])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      if (audioRef.current) audioRef.current.muted = !m
      return !m
    })
  }, [])

  const fmt = (s: number) => {
    if (!isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60)
      .toString()
      .padStart(2, '0')}`
  }

  if (error) return null

  const pct = duration > 0 ? (current / duration) * 100 : 0

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 border-b border-border bg-card/50 shrink-0">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
      >
        {playing ? (
          <Pause size={13} className="fill-current" />
        ) : (
          <Play size={13} className="fill-current ml-0.5" />
        )}
      </button>

      {/* Time */}
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-9 text-right tabular-nums">
        {fmt(current)}
      </span>

      {/* Scrubber */}
      <div
        className="flex-1 h-1.5 bg-muted rounded-full cursor-pointer relative overflow-hidden group"
        onClick={seek}
      >
        <div
          className="h-full bg-primary rounded-full transition-none"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute inset-y-0 -left-1 group-hover:opacity-100 opacity-0 transition-opacity"
          style={{ left: `${pct}%` }}
        >
          <div className="size-3 -mt-[3px] rounded-full bg-primary" />
        </div>
      </div>

      {/* Duration */}
      <span className="text-[10px] font-mono text-muted-foreground shrink-0 w-9 tabular-nums">
        {fmt(duration)}
      </span>

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors w-7 text-center shrink-0"
        title="Playback speed"
      >
        {speed}×
      </button>

      {/* Mute */}
      <button
        onClick={toggleMute}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
      </button>
    </div>
  )
})

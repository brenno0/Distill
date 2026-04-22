import { memo } from "react"
import { Waveform as SharedWaveform } from "@renderer/components/waveform"

export const Waveform = memo(function Waveform({
  audioLevel: _audioLevel,
  isRecording,
}: {
  audioLevel: number
  isRecording: boolean
}) {
  return <SharedWaveform isAnimating={isRecording} barCount={7} className="w-24" />
})

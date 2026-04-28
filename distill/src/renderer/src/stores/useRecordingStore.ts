import { create } from 'zustand'

interface RecordingStore {
  isRecording: boolean
  transcriptionId: string | null
  audioLevel: number
  monitorLevel: number
  elapsedSeconds: number
  startRecording: (transcriptionId: string) => void
  stopRecording: () => void
  setAudioLevel: (level: number) => void
  setMonitorLevel: (level: number) => void
  tickElapsed: () => void
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  isRecording: false,
  transcriptionId: null,
  audioLevel: 0,
  monitorLevel: 0,
  elapsedSeconds: 0,
  startRecording: (transcriptionId) =>
    set({ isRecording: true, transcriptionId, elapsedSeconds: 0 }),
  stopRecording: () =>
    set({ isRecording: false, transcriptionId: null, audioLevel: 0, monitorLevel: 0, elapsedSeconds: 0 }),
  setAudioLevel: (audioLevel) => set({ audioLevel }),
  setMonitorLevel: (monitorLevel) => set({ monitorLevel }),
  tickElapsed: () => set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 })),
}))

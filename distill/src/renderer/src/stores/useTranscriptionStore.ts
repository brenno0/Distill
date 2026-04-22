import { create } from 'zustand'

export type TranscriptionStatus = 'idle' | 'downloading' | 'transcribing' | 'completed' | 'failed'

interface TranscriptionStore {
  currentId: string | null
  status: TranscriptionStatus
  progress: number
  setCurrentId: (id: string | null) => void
  setStatus: (status: TranscriptionStatus) => void
  setProgress: (progress: number) => void
  reset: () => void
}

export const useTranscriptionStore = create<TranscriptionStore>((set) => ({
  currentId: null,
  status: 'idle',
  progress: 0,
  setCurrentId: (currentId) => set({ currentId }),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  reset: () => set({ currentId: null, status: 'idle', progress: 0 }),
}))

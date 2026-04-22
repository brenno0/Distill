import { create } from 'zustand'

export type BackendStatus = 'starting' | 'ready' | 'error' | 'fatal'

interface BackendStore {
  status: BackendStatus
  setStatus: (status: BackendStatus) => void
}

export const useBackendStore = create<BackendStore>((set) => ({
  status: 'starting',
  setStatus: (status) => set({ status }),
}))

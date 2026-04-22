import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  provider: string
  model: string
  theme: 'light' | 'dark' | 'auto'
  setProvider: (provider: string) => void
  setModel: (model: string) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      provider: 'ollama',
      model: 'llama3.1:8b',
      theme: 'auto',
      setProvider: (provider) => set({ provider }),
      setModel: (model) => set({ model }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'distill-settings-store' },
  ),
)

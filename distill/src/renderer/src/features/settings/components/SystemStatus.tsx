import { memo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOllama } from '@renderer/lib/api/generated/ollama/ollama'
import { useBackendStore } from '@renderer/stores/useBackendStore'
import { axiosInstance } from '@renderer/lib/axios'

const ollamaApi = getOllama()

const Row = memo(function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-white/60">{label}</span>
      <span className={`text-sm font-mono ${ok ? 'text-green-400' : 'text-red-400'}`}>{value}</span>
    </div>
  )
})

function OllamaRow() {
  const { data } = useQuery({
    queryKey: ['ollama', 'status'],
    queryFn: ollamaApi.ollamaStatusApiV1OllamaStatusGet,
    refetchInterval: 5000,
    retry: false,
  })
  const status = (data as any)?.status ?? 'unknown'
  return <Row label="Ollama" value={status} ok={status === 'running'} />
}

function CudaSection() {
  const queryClient = useQueryClient()
  const [cleared, setCleared] = useState(false)

  const { data } = useQuery({
    queryKey: ['cuda', 'memory'],
    queryFn: () => axiosInstance<{
      available: boolean
      used_mb: number
      reserved_mb: number
      total_mb: number
      free_mb: number
      model_loaded: boolean
    }>({ url: '/api/v1/settings/cuda', method: 'GET' }),
    refetchInterval: 3000,
    retry: false,
  })

  const clearMutation = useMutation({
    mutationFn: () =>
      axiosInstance({ url: '/api/v1/settings/cuda/clear', method: 'POST' }),
    onSuccess: () => {
      setCleared(true)
      setTimeout(() => setCleared(false), 2000)
      queryClient.invalidateQueries({ queryKey: ['cuda', 'memory'] })
    },
  })

  if (!data?.available) {
    return (
      <div className="bg-white/3 rounded-xl p-4 border border-white/8">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">CUDA / GPU</h3>
        <p className="text-sm text-white/40">CUDA not available</p>
      </div>
    )
  }

  const usedPct = Math.round((data.reserved_mb / data.total_mb) * 100)
  const barColor = usedPct > 85 ? 'bg-red-500' : usedPct > 60 ? 'bg-yellow-500' : 'bg-green-500'

  return (
    <div className="bg-white/3 rounded-xl p-4 border border-white/8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs text-white/40 uppercase tracking-wider">CUDA / GPU</h3>
        <button
          onClick={() => clearMutation.mutate()}
          disabled={clearMutation.isPending || !data.model_loaded}
          className="text-xs px-2 py-1 rounded-md border border-white/10 text-white/50 hover:text-white hover:border-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {cleared ? 'Cleared' : clearMutation.isPending ? 'Clearing…' : 'Clear VRAM'}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-white/50 mb-1">
            <span>VRAM usage</span>
            <span className="font-mono">{data.reserved_mb} / {data.total_mb} MB ({usedPct}%)</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/5">
          <span className="text-sm text-white/60">Whisper model</span>
          <span className={`text-sm font-mono ${data.model_loaded ? 'text-yellow-400' : 'text-white/30'}`}>
            {data.model_loaded ? 'loaded' : 'unloaded'}
          </span>
        </div>

        <div className="flex items-center justify-between py-1 border-t border-white/5">
          <span className="text-sm text-white/60">Allocated</span>
          <span className="text-sm font-mono text-white/60">{data.used_mb} MB</span>
        </div>
      </div>
    </div>
  )
}

export const SystemStatus = memo(function SystemStatus() {
  const backendStatus = useBackendStore((s) => s.status)

  return (
    <div className="space-y-4">
      <div className="bg-white/3 rounded-xl p-4 border border-white/8">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Services</h3>
        <Row label="Backend" value={backendStatus} ok={backendStatus === 'ready'} />
        <OllamaRow />
      </div>
      <CudaSection />
    </div>
  )
})

import { memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getOllama } from '@renderer/lib/api/generated/ollama/ollama'
import { useBackendStore } from '@renderer/stores/useBackendStore'

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

export const SystemStatus = memo(function SystemStatus() {
  const backendStatus = useBackendStore((s) => s.status)

  return (
    <div className="space-y-4">
      <div className="bg-white/3 rounded-xl p-4 border border-white/8">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-3">Services</h3>
        <Row label="Backend" value={backendStatus} ok={backendStatus === 'ready'} />
        <OllamaRow />
      </div>
    </div>
  )
})

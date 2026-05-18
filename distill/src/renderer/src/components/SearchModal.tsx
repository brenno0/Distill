import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Search, X, FileText, Loader2 } from 'lucide-react'
import { axiosInstance } from '@renderer/lib/axios'

interface SearchResult {
  id: string
  title: string
  transcription_type: string
  status: string
  created_at: string
}

const STATUS_DOT: Record<string, string> = {
  completed: 'bg-green-500',
  processing: 'bg-blue-500 animate-pulse',
  pending: 'bg-yellow-500 animate-pulse',
  failed: 'bg-destructive',
}

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await axiosInstance<SearchResult[]>({ url: '/api/v1/transcriptions/', method: 'GET', params: { q: query.trim(), limit: 20 } })
        setResults(data ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  if (!open) return null

  const handleSelect = (id: string) => {
    onClose()
    navigate({ to: '/transcription/$id', params: { id } })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search recordings..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading
            ? <Loader2 className="size-4 text-muted-foreground animate-spin shrink-0" />
            : query && <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>
          }
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto scrollbar-hover py-1">
            {results.map(r => (
              <li key={r.id}>
                <button
                  onClick={() => handleSelect(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left"
                >
                  <div className="flex size-7 items-center justify-center rounded bg-blue-400/10 shrink-0">
                    <FileText className="size-3.5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{r.title}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`size-2 rounded-full shrink-0 ${STATUS_DOT[r.status] ?? 'bg-muted-foreground'}`} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {query && !loading && results.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for "{query}"</div>
        )}

        <div className="px-4 py-2 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">ESC to close</span>
          {results.length > 0 && <span className="text-[11px] text-muted-foreground">{results.length} result{results.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  )
}

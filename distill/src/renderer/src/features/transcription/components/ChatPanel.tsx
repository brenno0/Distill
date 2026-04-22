import { useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useAgentChat } from '../hooks/useAgentChat'
import { ChatMessage } from './ChatMessage'
import { ChatPendingSkeleton } from './ChatPendingSkeleton'

export function ChatPanel({ transcriptionId }: { transcriptionId: string }) {
  const { messages, input, setInput, send, isPending } = useAgentChat(transcriptionId)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-medium">AI Chat</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-xs text-white/30 text-center mt-8">Ask anything about this transcription</p>
        )}
        {messages.map((msg, i) => <ChatMessage key={i} message={msg} />)}
        {isPending && (
          <ChatPendingSkeleton />
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 border-t border-white/5 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about this transcription…"
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm outline-none focus:border-[var(--color-accent)]/50 disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={isPending || !input.trim()}
            className="p-2 bg-[var(--color-accent)] text-white rounded-lg disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Send size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

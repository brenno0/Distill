import { useRef, useEffect } from 'react'
import { Send, Sparkles, Trash2 } from 'lucide-react'
import { useAgentChat } from '../hooks/useAgentChat'
import { ChatMessage } from './ChatMessage'
import { ChatPendingSkeleton } from './ChatPendingSkeleton'

const EXAMPLE_PROMPTS = [
  'Summarize the key points',
  'What were the main topics?',
  'List any action items',
]

export function ChatPanel({ transcriptionId, hideHeader = false }: { transcriptionId: string; hideHeader?: boolean }) {
  const { messages, input, setInput, send, clearMessages, isPending } = useAgentChat(transcriptionId)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isPending])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isPending && input.trim()) {
        send()
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleSend = () => {
    if (!isPending && input.trim()) {
      send()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }

  const handlePrompt = (prompt: string) => {
    setInput(prompt)
    setTimeout(() => {
      if (textareaRef.current) textareaRef.current.focus()
    }, 0)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border-t-2 border-t-primary/30">
      {/* Header */}
      {!hideHeader && <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-primary/15">
            <Sparkles className="size-3 text-primary" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI Chat</span>
          {messages.length > 0 && (
            <span className="text-xs text-muted-foreground/50 tabular-nums">
              {messages.length} msg{messages.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Clear conversation"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 bg-gradient-to-b from-background via-background to-muted/10 scrollbar-hover">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-12 px-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-5 text-primary/70" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground mb-1">Ask about this transcription</p>
              <p className="text-xs text-muted-foreground/60">Shift+Enter for new line</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePrompt(prompt)}
                  className="text-left text-xs px-3 py-2 rounded-lg bg-card border border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isFirstInGroup = i === 0 || messages[i - 1].role !== msg.role
          return <ChatMessage key={i} message={msg} isFirstInGroup={isFirstInGroup} />
        })}
        {isPending && <ChatPendingSkeleton />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask about this transcription…"
            disabled={isPending}
            rows={1}
            className="flex-1 resize-none px-3 py-2 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 disabled:opacity-50 transition-all"
            style={{ minHeight: '36px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={isPending || !input.trim()}
            className="shrink-0 p-2 bg-primary text-primary-foreground rounded-xl disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Send size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  )
}

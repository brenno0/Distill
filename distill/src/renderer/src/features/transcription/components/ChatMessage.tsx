import { memo } from 'react'
import { Sparkles } from 'lucide-react'
import type { ChatMessage as ChatMessageType } from '../hooks/useAgentChat'
import ReactMarkdown from 'react-markdown'

export const ChatMessage = memo(function ChatMessage({
  message,
  isFirstInGroup = true,
}: {
  message: ChatMessageType
  isFirstInGroup?: boolean
}) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-1' : 'mt-0.5'}`}>
      {/* AI avatar — shown only on first in group */}
      {!isUser && (
        <div className={`shrink-0 mt-0.5 ${isFirstInGroup ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="size-6 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles className="size-3 text-primary" />
          </div>
        </div>
      )}

      <div className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-sm'
          : 'bg-card border border-border border-l-2 border-l-primary/25 text-foreground rounded-2xl rounded-bl-sm'
      }`}>
        {isUser ? (
          <span className="whitespace-pre-wrap">{message.content}</span>
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground/85 leading-relaxed">{children}</p>,
              h1: ({ children }) => <h1 className="text-sm font-bold mb-2 mt-3 first:mt-0 text-foreground">{children}</h1>,
              h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5 mt-3 first:mt-0 text-foreground">{children}</h2>,
              h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-foreground">{children}</h3>,
              ul: ({ children }) => <ul className="pl-0 mb-2 space-y-1 list-none">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1 text-foreground/85">{children}</ol>,
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-foreground/85 leading-relaxed">
                  <span className="text-primary/60 mt-1.5 shrink-0 text-[10px]">▸</span>
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              em: ({ children }) => <em className="italic text-muted-foreground">{children}</em>,
              code: ({ children, className }) => (
                <code className={`font-mono text-xs bg-muted border border-border/50 px-1.5 py-0.5 rounded text-foreground ${className ?? ''}`}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted border border-border/50 rounded-lg p-3 overflow-x-auto text-xs font-mono mb-2">{children}</pre>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:opacity-80">
                  {children}
                </a>
              ),
              hr: () => <hr className="border-border/60 my-3" />,
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/30 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
})

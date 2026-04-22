import { memo } from 'react'
import type { ChatMessage as ChatMessageType } from '../hooks/useAgentChat'
import ReactMarkdown from 'react-markdown'

export const ChatMessage = memo(function ChatMessage({ message }: { message: ChatMessageType }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed overflow-x-auto ${
          isUser ? 'bg-[var(--color-accent)] text-white' : 'bg-white/5 text-white/80'
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              code: ({ children, className }) => (
                <code className={`font-[var(--font-mono)] text-xs bg-black/30 px-1 py-0.5 rounded ${className ?? ''}`}>
                  {children}
                </code>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] underline">
                  {children}
                </a>
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

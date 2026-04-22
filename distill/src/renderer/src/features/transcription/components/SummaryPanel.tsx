import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

export const SummaryPanel = memo(function SummaryPanel({
  summary,
  isCompleted,
}: {
  summary?: string
  isCompleted: boolean
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 shrink-0">
        <h2 className="text-sm font-medium">Summary</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {summary ? (
          <div className="text-sm text-white/80 leading-relaxed overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeHighlight]}
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
                ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                pre: ({ children }) => (
                  <pre className="mb-3 rounded-md bg-black/40 p-3 overflow-x-auto">{children}</pre>
                ),
                code: ({ className, children }) => (
                  <code className={`font-[var(--font-mono)] text-xs ${className ?? ''}`}>{children}</code>
                ),
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] underline">
                    {children}
                  </a>
                ),
              }}
            >
              {summary}
            </ReactMarkdown>
          </div>
        ) : isCompleted ? (
          <p className="text-sm text-white/30">No summary generated</p>
        ) : (
          <p className="text-sm text-white/30">Processing…</p>
        )}
      </div>
    </div>
  )
})

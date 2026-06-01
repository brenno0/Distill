import { memo, useMemo, useState } from 'react'
import { BookOpen, Loader2, Clock, Download } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'

export const SummaryPanel = memo(function SummaryPanel({
  summary,
  isCompleted,
  hideHeader = false,
  title,
  date,
}: {
  summary?: string
  isCompleted: boolean
  hideHeader?: boolean
  title?: string
  date?: string
}) {
  const [exporting, setExporting] = useState(false)

  const readingTime = useMemo(() => {
    if (!summary) return null
    const words = summary.split(/\s+/).filter(Boolean).length
    return Math.max(1, Math.round(words / 200))
  }, [summary])

  async function handleExport() {
    if (!summary || exporting) return
    setExporting(true)
    try {
      await window.electron.exportSummaryPDF({
        markdown: summary,
        title: title ?? 'Summary',
        date,
      })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden border-t-2 border-t-teal-400/30">
      {!hideHeader && <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex size-5 items-center justify-center rounded bg-teal-400/15">
            <BookOpen className="size-3 text-teal-400" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</span>
        </div>
        <div className="flex items-center gap-2">
          {readingTime && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
              <Clock className="size-2.5" />
              <span>{readingTime}m read</span>
            </div>
          )}
          {summary && (
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Export as PDF"
              className="flex items-center justify-center size-5 rounded text-muted-foreground/50 hover:text-teal-400 hover:bg-teal-400/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting
                ? <Loader2 className="size-3 animate-spin" />
                : <Download className="size-3" />
              }
            </button>
          )}
        </div>
      </div>}

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hover">
        {summary ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children }) => (
                <p className="mb-3 last:mb-0 text-sm text-muted-foreground leading-relaxed">{children}</p>
              ),
              h1: ({ children }) => (
                <h1 className="text-base font-bold text-foreground tracking-tight mb-3 mt-5 first:mt-0 pb-2 border-b border-border">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <div className="mt-5 first:mt-0 mb-2.5">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-teal-400 mb-0">
                    {children}
                  </h2>
                  <div className="h-px bg-teal-400/20 mt-1" />
                </div>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="mb-3 space-y-2 list-none pl-0">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-3 space-y-2 list-decimal pl-5 text-sm text-muted-foreground">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <span className="text-teal-400/70 mt-1.5 shrink-0 text-xs">▸</span>
                  <span>{children}</span>
                </li>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-muted-foreground">{children}</em>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-teal-400/40 pl-3 my-3 text-muted-foreground italic bg-teal-400/5 py-2 rounded-r-md">
                  {children}
                </blockquote>
              ),
              pre: ({ children }) => (
                <pre className="mb-3 rounded-lg bg-muted border border-border p-3 overflow-x-auto text-xs">{children}</pre>
              ),
              code: ({ className, children }) => (
                <code className={`font-mono text-xs bg-muted border border-border/60 px-1.5 py-0.5 rounded ${className ?? ''}`}>
                  {children}
                </code>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-teal-400 underline underline-offset-2 hover:opacity-80">
                  {children}
                </a>
              ),
              hr: () => <hr className="border-border my-4" />,
            }}
          >
            {summary}
          </ReactMarkdown>
        ) : isCompleted ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <BookOpen className="size-7 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No summary available</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="relative">
              <div className="size-10 rounded-full bg-teal-400/10 flex items-center justify-center">
                <Loader2 className="size-5 text-teal-400/60 animate-spin" />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Generating summary</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI is processing your transcript…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

interface Segment {
  text: string
  start: number
  end: number
  speaker?: string
}

function srtTime(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.floor(s % 60)
  const ms = Math.round((s % 1) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function vttTime(s: number): string {
  return srtTime(s).replace(',', '.')
}

export function exportAsTxt(segments: Segment[], fullText?: string, title = 'transcript'): void {
  let content: string
  if (segments.length > 0) {
    const lines: string[] = []
    for (const seg of segments) {
      const prefix = seg.speaker ? `${seg.speaker}: ` : ''
      lines.push(`${prefix}${seg.text.trim()}`)
    }
    content = lines.join('\n\n')
  } else {
    content = fullText ?? ''
  }
  downloadFile(`${title}.txt`, content, 'text/plain')
}

export function exportAsSrt(segments: Segment[], title = 'transcript'): void {
  if (segments.length === 0) return
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const lines: string[] = []
  sorted.forEach((seg, i) => {
    lines.push(String(i + 1))
    lines.push(`${srtTime(seg.start)} --> ${srtTime(seg.end)}`)
    const prefix = seg.speaker ? `${seg.speaker}: ` : ''
    lines.push(`${prefix}${seg.text.trim()}`)
    lines.push('')
  })
  downloadFile(`${title}.srt`, lines.join('\n'), 'text/srt')
}

export function exportAsVtt(segments: Segment[], title = 'transcript'): void {
  if (segments.length === 0) return
  const sorted = [...segments].sort((a, b) => a.start - b.start)
  const lines = ['WEBVTT', '']
  sorted.forEach((seg, i) => {
    lines.push(`NOTE ${i + 1}`)
    lines.push(`${vttTime(seg.start)} --> ${vttTime(seg.end)}`)
    const prefix = seg.speaker ? `<v ${seg.speaker}>` : ''
    lines.push(`${prefix}${seg.text.trim()}`)
    lines.push('')
  })
  downloadFile(`${title}.vtt`, lines.join('\n'), 'text/vtt')
}

function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

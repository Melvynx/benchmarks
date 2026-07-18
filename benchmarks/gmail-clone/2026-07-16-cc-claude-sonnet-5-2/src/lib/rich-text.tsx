import type { ReactNode } from 'react'

const INLINE_PATTERN = /(\*\*[^*\n]+\*\*|_[^_\n]+_|\[[^\]]+\]\([^)]+\))/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_PATTERN).filter((p) => p !== undefined && p !== '')
  return parts.map((part, i) => {
    const key = `${keyPrefix}-${i}`
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part)
    if (linkMatch) {
      return (
        <a
          key={key}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-accent underline underline-offset-2 hover:text-accent/80"
          onClick={(e) => e.preventDefault()}
        >
          {linkMatch[1]}
        </a>
      )
    }
    return <span key={key}>{part}</span>
  })
}

export function RichText({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: ReactNode[] = []
  let listBuffer: string[] = []
  let quoteBuffer: string[] = []

  function flushList(key: string) {
    if (listBuffer.length === 0) return
    blocks.push(
      <ul key={key} className="my-1 list-disc pl-5">
        {listBuffer.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </ul>,
    )
    listBuffer = []
  }

  function flushQuote(key: string) {
    if (quoteBuffer.length === 0) return
    blocks.push(
      <blockquote key={key} className="my-1 border-l-2 border-border-strong pl-3 text-muted-foreground">
        {quoteBuffer.map((line, i) => (
          <p key={i}>{renderInline(line, `${key}-q-${i}`)}</p>
        ))}
      </blockquote>,
    )
    quoteBuffer = []
  }

  lines.forEach((line, i) => {
    const quoteMatch = /^>\s?(.*)$/.exec(line)
    if (quoteMatch) {
      quoteBuffer.push(quoteMatch[1])
      return
    }
    flushQuote(`quote-${i}`)

    const bulletMatch = /^[-*]\s+(.*)$/.exec(line)
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1])
      return
    }
    flushList(`list-${i}`)
    if (line.trim() === '') {
      blocks.push(<br key={`br-${i}`} />)
    } else {
      blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>)
    }
  })
  flushList('list-end')
  flushQuote('quote-end')

  return <div className="space-y-0.5">{blocks}</div>
}

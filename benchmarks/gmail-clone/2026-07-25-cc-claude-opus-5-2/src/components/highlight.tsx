import { useMemo } from 'react'
import { escapeRegExp } from '@/lib/utils'

/** Wraps every occurrence of `terms` in <mark>, case-insensitively. */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
  const parts = useMemo(() => {
    if (!terms.length || !text) return null
    const re = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'ig')
    const chunks = text.split(re)
    if (chunks.length < 2) return null
    return chunks
  }, [text, terms])

  if (!parts) return <>{text}</>

  const lower = terms.map((t) => t.toLowerCase())
  return (
    <>
      {parts.map((chunk, i) =>
        lower.includes(chunk.toLowerCase()) ? (
          <mark key={i}>{chunk}</mark>
        ) : (
          <span key={i}>{chunk}</span>
        ),
      )}
    </>
  )
}

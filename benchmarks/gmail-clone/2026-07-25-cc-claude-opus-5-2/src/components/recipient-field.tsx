import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Address } from '@/lib/types'
import { cn, isEmail, parseAddress } from '@/lib/utils'
import { useMail } from '@/store/mail-store'
import { Avatar } from './ui/bits'

interface RecipientFieldProps {
  label: string
  value: Address[]
  onChange: (next: Address[]) => void
  autoFocus?: boolean
  /** Rendered at the right edge of the row, e.g. the Cc/Bcc toggles. */
  trailing?: React.ReactNode
}

export function RecipientField({
  label,
  value,
  onChange,
  autoFocus,
  trailing,
}: RecipientFieldProps) {
  const { data } = useMail()
  const inputRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [highlight, setHighlight] = useState(0)
  const [focused, setFocused] = useState(false)

  const taken = new Set(value.map((a) => a.email.toLowerCase()))
  const q = text.trim().toLowerCase()
  const suggestions = q
    ? data.contacts
        .filter(
          (c) =>
            !taken.has(c.email.toLowerCase()) &&
            (c.name.toLowerCase().includes(q) ||
              c.email.toLowerCase().includes(q) ||
              (c.company ?? '').toLowerCase().includes(q)),
        )
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 6)
    : []

  const add = (a: Address | null) => {
    if (!a || taken.has(a.email.toLowerCase())) {
      setText('')
      return
    }
    onChange([...value, a])
    setText('')
    setHighlight(0)
  }

  /**
   * Adds every parseable part in one `onChange` (adding them one at a time
   * would drop all but the last), and leaves anything unparseable in the
   * input so a typo is visible rather than silently swallowed.
   */
  const commitParts = (parts: string[]) => {
    const additions: Address[] = []
    const leftovers: string[] = []
    const seen = new Set(taken)
    for (const part of parts) {
      if (!part.trim()) continue
      const parsed = parseAddress(part)
      if (!parsed) leftovers.push(part.trim())
      else if (!seen.has(parsed.email.toLowerCase())) {
        seen.add(parsed.email.toLowerCase())
        additions.push(parsed)
      }
    }
    if (additions.length) onChange([...value, ...additions])
    setText(leftovers.join(', '))
    setHighlight(0)
  }

  const commitText = () => {
    if (text.trim()) commitParts(text.split(/[,;]/))
  }

  return (
    <div className="relative">
      <div
        className={cn(
          'flex min-h-[2.5rem] flex-wrap items-center gap-1 border-b border-line-soft px-4 py-1.5 transition-colors',
          focused && 'border-line',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="shrink-0 pr-1 text-[13px] text-ink-3">{label}</span>
        {value.map((a, i) => (
          <span
            key={`${a.email}-${i}`}
            title={a.email}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1 text-[13px]',
              isEmail(a.email) ? 'bg-surface-3 text-ink' : 'bg-danger/12 text-danger',
            )}
          >
            <Avatar name={a.name} email={a.email} size={20} />
            <span className="truncate">{a.name || a.email}</span>
            <button
              type="button"
              aria-label={`Remove ${a.email}`}
              onClick={(e) => {
                e.stopPropagation()
                onChange(value.filter((_, idx) => idx !== i))
              }}
              className="rounded-full p-0.5 text-ink-3 hover:bg-line hover:text-ink"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={text}
          autoFocus={autoFocus}
          aria-label={label}
          onChange={(e) => {
            setText(e.target.value)
            setHighlight(0)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120)
            commitText()
          }}
          onPaste={(e) => {
            const pasted = e.clipboardData.getData('text')
            if (/[,;\n]/.test(pasted)) {
              e.preventDefault()
              commitParts(pasted.split(/[,;\n]/))
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && suggestions.length) {
              e.preventDefault()
              setHighlight((h) => (h + 1) % suggestions.length)
            } else if (e.key === 'ArrowUp' && suggestions.length) {
              e.preventDefault()
              setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length)
            } else if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',' || e.key === ';') {
              if (suggestions.length && text.trim() && e.key !== 'Tab') {
                e.preventDefault()
                add(suggestions[highlight])
              } else if (text.trim()) {
                if (e.key !== 'Tab') e.preventDefault()
                commitText()
              }
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          className="min-w-[8rem] flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-ink-4"
        />
        {trailing && <span className="ml-auto shrink-0 pl-2">{trailing}</span>}
      </div>

      {focused && suggestions.length > 0 && (
        <ul className="absolute inset-x-2 top-full z-[75] mt-1 overflow-hidden rounded-lg border border-line-soft bg-elevated py-1 shadow-pop">
          {suggestions.map((c, i) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  add({ name: c.name, email: c.email })
                  inputRef.current?.focus()
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2 text-left',
                  highlight === i ? 'bg-surface-2' : 'hover:bg-surface-2',
                )}
              >
                <Avatar name={c.name} email={c.email} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink">{c.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">{c.email}</span>
                </span>
                {c.company && (
                  <span className="hidden shrink-0 text-[11px] text-ink-4 sm:block">{c.company}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

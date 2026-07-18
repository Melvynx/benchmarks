import { useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Contact } from '@/lib/types'
import { CONTACTS, ME } from '@/lib/seed-data'
import { initialsFor } from '@/lib/format'
import { cn } from '@/lib/utils'

const ALL_CONTACTS: Contact[] = Object.values(CONTACTS).filter((c) => c.id !== ME.id)

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function RecipientInput({
  label,
  value,
  onChange,
  autoFocus,
}: {
  label: string
  value: Contact[]
  onChange: (contacts: Contact[]) => void
  autoFocus?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return ALL_CONTACTS.filter(
      (c) =>
        !value.some((v) => v.id === c.id) &&
        (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    ).slice(0, 6)
  }, [query, value])

  function addContact(contact: Contact) {
    onChange([...value, contact])
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  function commitFreeText() {
    const trimmed = query.trim().replace(/,$/, '')
    if (!trimmed) return
    if (isValidEmail(trimmed)) {
      const existing = ALL_CONTACTS.find((c) => c.email.toLowerCase() === trimmed.toLowerCase())
      addContact(
        existing ?? {
          id: trimmed,
          name: trimmed.split('@')[0],
          email: trimmed,
          color: '#5f6368',
        },
      )
    } else {
      setQuery('')
    }
  }

  return (
    <div className="relative flex flex-wrap items-center gap-1.5 border-b border-border px-1 py-1.5">
      <span className="pl-2 text-[13px] text-muted-foreground">{label}</span>
      {value.map((contact) => (
        <span
          key={contact.id}
          className="flex items-center gap-1.5 rounded-full bg-muted py-1 pl-1 pr-2 text-[13px]"
        >
          <span
            className="flex size-5 items-center justify-center rounded-full text-[9px] font-medium text-white"
            style={{ backgroundColor: contact.color }}
          >
            {initialsFor(contact.name)}
          </span>
          {contact.name}
          <button
            onClick={() => onChange(value.filter((c) => c.id !== contact.id))}
            aria-label={`Remove ${contact.name}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            if (suggestions[0]) addContact(suggestions[0])
            else commitFreeText()
          } else if (e.key === 'Backspace' && query === '' && value.length > 0) {
            onChange(value.slice(0, -1))
          }
        }}
        className="min-w-[120px] flex-1 bg-transparent px-1 py-1 text-[14px] outline-none"
      />

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-lg">
          {suggestions.map((contact) => (
            <button
              key={contact.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addContact(contact)}
              className={cn(
                'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-surface-hover',
              )}
            >
              <span
                className="flex size-7 items-center justify-center rounded-full text-[10px] font-medium text-white"
                style={{ backgroundColor: contact.color }}
              >
                {initialsFor(contact.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{contact.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{contact.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

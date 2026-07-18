import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Underline,
} from 'lucide-react'
import type { Contact } from '../types'
import { useContacts } from '../hooks/hooks'
import { contactFromInput, cx, isValidEmail } from '../lib/utils'
import { Avatar } from './ui'

export function RecipientField(props: {
  label: string
  recipients: Contact[]
  onChange: (recipients: Contact[]) => void
  autoFocus?: boolean
  trailing?: React.ReactNode
  compact?: boolean
}) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const contacts = useContacts()

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (!q) return []
    return contacts
      .filter((c) => !props.recipients.some((r) => r.email === c.email))
      .filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 5)
  }, [input, contacts, props.recipients])

  const commit = (value: string | Contact) => {
    const contact = typeof value === 'string' ? contactFromInput(value) : value
    if (!contact.email.trim()) return
    if (props.recipients.some((r) => r.email === contact.email)) {
      setInput('')
      return
    }
    props.onChange([...props.recipients, contact])
    setInput('')
    setHighlight(0)
  }

  return (
    <div className="relative border-b border-line">
      <div
        className="flex min-h-10 cursor-text flex-wrap items-center gap-1 py-1.5"
        onClick={() => inputRef.current?.focus()}
      >
        <span className="mr-1 text-sm text-ink-3">{props.label}</span>
        {props.recipients.map((r) => {
          const invalid = !isValidEmail(r.email)
          return (
            <span
              key={r.email}
              title={r.email}
              className={cx(
                'inline-flex max-w-full items-center gap-1.5 rounded-full border py-0.5 pl-1 pr-1.5 text-sm',
                invalid ? 'border-danger text-danger' : 'border-line-strong text-ink-1',
              )}
            >
              <Avatar contact={r} size={20} />
              <span className="truncate">{r.name || r.email}</span>
              <button
                type="button"
                title={`Remove ${r.email}`}
                onClick={(e) => {
                  e.stopPropagation()
                  props.onChange(props.recipients.filter((x) => x.email !== r.email))
                }}
                className="rounded-full px-0.5 text-ink-3 hover:text-ink-1"
              >
                ×
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={input}
          autoFocus={props.autoFocus}
          onChange={(e) => {
            setInput(e.target.value)
            setHighlight(0)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150)
            if (input.trim()) commit(input)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || e.key === ';' || (e.key === 'Tab' && input.trim())) {
              if (e.key !== 'Tab') e.preventDefault()
              if (suggestions.length && focused) commit(suggestions[highlight])
              else if (input.trim()) commit(input)
            } else if (e.key === 'Backspace' && !input && props.recipients.length) {
              props.onChange(props.recipients.slice(0, -1))
            } else if (e.key === 'ArrowDown' && suggestions.length) {
              e.preventDefault()
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1))
            } else if (e.key === 'ArrowUp' && suggestions.length) {
              e.preventDefault()
              setHighlight((h) => Math.max(h - 1, 0))
            } else if (e.key === 'Escape') {
              setInput('')
            }
          }}
          className="min-w-24 flex-1 bg-transparent py-1 text-sm text-ink-1 outline-none"
          aria-label={`${props.label} recipients`}
        />
        {props.trailing}
      </div>

      {focused && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 w-full min-w-64 max-w-md overflow-hidden rounded-lg border border-line/60 bg-surface py-1 shadow-[var(--shadow-menu)]">
          {suggestions.map((c, i) => (
            <button
              key={c.email}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                commit(c)
                inputRef.current?.focus()
              }}
              className={cx(
                'flex w-full items-center gap-3 px-3 py-2 text-left',
                i === highlight ? 'bg-surface-hover' : 'hover:bg-surface-hover',
              )}
            >
              <Avatar contact={c} size={28} />
              <span className="min-w-0">
                <span className="block truncate text-sm text-ink-1">{c.name}</span>
                <span className="block truncate text-xs text-ink-3">{c.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function BodyEditor(props: {
  initialHtml: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  editorRef?: RefObject<HTMLDivElement | null>
  autoFocus?: boolean
}) {
  const localRef = useRef<HTMLDivElement>(null)
  const ref = props.editorRef ?? localRef
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current && ref.current) {
      ref.current.innerHTML = props.initialHtml
      initialized.current = true
      if (props.autoFocus) ref.current.focus()
    }
  }, [])

  return (
    <div
      ref={ref}
      contentEditable
      role="textbox"
      aria-multiline
      aria-label="Message body"
      data-placeholder={props.placeholder ?? ''}
      className={cx('compose-editor text-ink-1', props.className)}
      onInput={(e) => props.onChange((e.target as HTMLDivElement).innerHTML)}
    />
  )
}

const FORMAT_ACTIONS: Array<{ icon: typeof Bold; title: string; cmd: string; arg?: () => string | undefined }> = [
  { icon: Bold, title: 'Bold (⌘B)', cmd: 'bold' },
  { icon: Italic, title: 'Italic (⌘I)', cmd: 'italic' },
  { icon: Underline, title: 'Underline (⌘U)', cmd: 'underline' },
  { icon: List, title: 'Bulleted list', cmd: 'insertUnorderedList' },
  { icon: ListOrdered, title: 'Numbered list', cmd: 'insertOrderedList' },
  { icon: Quote, title: 'Quote', cmd: 'formatBlock', arg: () => 'blockquote' },
  {
    icon: Link2,
    title: 'Insert link',
    cmd: 'createLink',
    arg: () => window.prompt('Link URL', 'https://') ?? undefined,
  },
  { icon: RemoveFormatting, title: 'Remove formatting', cmd: 'removeFormat' },
]

export function FormatToolbar(props: { editorRef: RefObject<HTMLDivElement | null>; className?: string }) {
  return (
    <div className={cx('flex items-center gap-0.5 overflow-x-auto', props.className)}>
      {FORMAT_ACTIONS.map(({ icon: Icon, title, cmd, arg }) => (
        <button
          key={cmd + title}
          type="button"
          title={title}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            props.editorRef.current?.focus()
            const value = arg?.()
            if (arg && value === undefined) return
            document.execCommand(cmd, false, value)
            props.editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }))
          }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded text-ink-2 hover:bg-black/8 dark:hover:bg-white/10"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  )
}

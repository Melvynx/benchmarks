import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock, Paperclip, Search, SlidersHorizontal, Star, Tag, User, X } from 'lucide-react'
import { useMail } from '@/store/mail-store'
import type { Route } from '@/store/router'
import { cn } from '@/lib/utils'
import { VIEWS } from '@/lib/views'
import { Button } from './ui/bits'
import { Popover } from './ui/popover'

const RECENT_KEY = 'opus5mail.recentSearches.v1'

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

function pushRecent(q: string) {
  const list = [q, ...loadRecent().filter((x) => x !== q)].slice(0, 8)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list))
  } catch {
    /* ignore */
  }
  return list
}

interface SearchBoxProps {
  route: Route
  navigate: (r: Route) => void
  className?: string
}

export function SearchBox({ route, navigate, className }: SearchBoxProps) {
  const { data } = useMail()
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const advancedRef = useRef<HTMLButtonElement>(null)
  const [value, setValue] = useState(route.search ?? '')
  const [focused, setFocused] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => loadRecent())
  const [highlight, setHighlight] = useState(-1)

  useEffect(() => {
    setValue(route.search ?? '')
  }, [route.search])

  useEffect(() => {
    const onShortcut = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const typing =
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onShortcut)
    return () => window.removeEventListener('keydown', onShortcut)
  }, [])

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    const out: { id: string; icon: React.ReactNode; label: string; hint?: string; query: string }[] = []

    if (!q) {
      for (const r of recent.slice(0, 5)) {
        out.push({ id: `r-${r}`, icon: <Clock />, label: r, hint: 'Recent', query: r })
      }
      out.push(
        { id: 'q-unread', icon: <Search />, label: 'is:unread', hint: 'Unread mail', query: 'is:unread' },
        { id: 'q-star', icon: <Star />, label: 'is:starred', hint: 'Starred', query: 'is:starred' },
        {
          id: 'q-att',
          icon: <Paperclip />,
          label: 'has:attachment',
          hint: 'With attachments',
          query: 'has:attachment',
        },
      )
      return out
    }

    const last = q.split(' ').pop() ?? ''
    for (const c of data.contacts) {
      if (out.length >= 4) break
      if (c.name.toLowerCase().includes(last) || c.email.toLowerCase().includes(last)) {
        out.push({
          id: `c-${c.id}`,
          icon: <User />,
          label: c.name,
          hint: c.email,
          query: `from:${c.email}`,
        })
      }
    }
    for (const l of data.labels) {
      if (l.name.toLowerCase().includes(q)) {
        out.push({
          id: `l-${l.id}`,
          icon: <Tag />,
          label: `label:${l.name}`,
          hint: 'Label',
          query: `label:"${l.name}"`,
        })
      }
    }
    for (const r of recent) {
      if (r.toLowerCase().includes(q) && r !== value) {
        out.push({ id: `r-${r}`, icon: <Clock />, label: r, hint: 'Recent', query: r })
      }
    }
    out.unshift({ id: 'raw', icon: <Search />, label: value, hint: 'Search all mail', query: value })
    return out.slice(0, 8)
  }, [value, data.contacts, data.labels, recent])

  const submit = (q: string) => {
    const trimmed = q.trim()
    setFocused(false)
    setHighlight(-1)
    inputRef.current?.blur()
    if (!trimmed) {
      navigate({ view: 'inbox' })
      return
    }
    setRecent(pushRecent(trimmed))
    setValue(trimmed)
    navigate({ view: 'all', search: trimmed })
  }

  const active = focused || Boolean(route.search)

  return (
    <div className={cn('relative min-w-0 flex-1', className)}>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault()
          submit(highlight >= 0 ? suggestions[highlight].query : value)
        }}
        className={cn(
          'flex h-12 items-center gap-1 rounded-lg px-1.5 transition-colors',
          active ? 'bg-surface shadow-row' : 'bg-surface-2 hover:bg-surface-3/70',
          focused && 'rounded-b-none',
        )}
        role="search"
      >
        <button
          type="submit"
          aria-label="Search mail"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3"
        >
          <Search className="h-5 w-5" />
        </button>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setHighlight(-1)
            setFocused(true)
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 140)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlight((h) => Math.min(suggestions.length - 1, h + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlight((h) => Math.max(-1, h - 1))
            } else if (e.key === 'Escape') {
              e.currentTarget.blur()
              setFocused(false)
            }
          }}
          placeholder="Search mail"
          aria-label="Search mail"
          className="min-w-0 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-ink-3"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue('')
              navigate({ view: 'inbox' })
              inputRef.current?.focus()
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <button
          ref={advancedRef}
          type="button"
          aria-label="Show search options"
          onClick={() => setAdvanced((v) => !v)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-3"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </form>

      {focused && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-[65] overflow-hidden rounded-b-lg bg-surface pb-2 shadow-row">
          <ul>
            {suggestions.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => submit(s.query)}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex w-full items-center gap-4 px-4 py-2 text-left text-[14px]',
                    highlight === i ? 'bg-surface-2' : 'hover:bg-surface-2',
                  )}
                >
                  <span className="text-ink-3 [&_svg]:h-[18px] [&_svg]:w-[18px]">{s.icon}</span>
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  {s.hint && <span className="shrink-0 text-[12px] text-ink-4">{s.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdvancedSearch
        anchorRef={advancedRef}
        open={advanced}
        onClose={() => setAdvanced(false)}
        onSearch={(q) => {
          setAdvanced(false)
          submit(q)
        }}
      />
    </div>
  )
}

const SCOPES = [
  { value: '', label: 'All mail' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'starred', label: 'Starred' },
  { value: 'sent', label: 'Sent' },
  { value: 'drafts', label: 'Drafts' },
  { value: 'spam', label: 'Spam' },
  { value: 'trash', label: 'Trash' },
  { value: 'anywhere', label: 'Mail & Spam & Trash' },
]

function AdvancedSearch({
  anchorRef,
  open,
  onClose,
  onSearch,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
  onSearch: (q: string) => void
}) {
  const { data } = useMail()
  const [form, setForm] = useState({
    from: '',
    to: '',
    subject: '',
    words: '',
    label: '',
    scope: '',
    within: '',
    hasAttachment: false,
    unreadOnly: false,
  })

  const build = () => {
    const parts: string[] = []
    if (form.from) parts.push(`from:${form.from}`)
    if (form.to) parts.push(`to:${form.to}`)
    if (form.subject) parts.push(`subject:${form.subject.includes(' ') ? `"${form.subject}"` : form.subject}`)
    if (form.label) parts.push(`label:"${form.label}"`)
    if (form.scope) parts.push(`in:${form.scope}`)
    if (form.within) parts.push(`newer_than:${form.within}`)
    if (form.hasAttachment) parts.push('has:attachment')
    if (form.unreadOnly) parts.push('is:unread')
    if (form.words) parts.push(form.words)
    return parts.join(' ')
  }

  const field = (
    key: keyof typeof form,
    label: string,
    placeholder = '',
  ) => (
    <label className="flex items-center gap-3">
      <span className="w-[86px] shrink-0 text-right text-[13px] text-ink-2">{label}</span>
      <input
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
      />
    </label>
  )

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align="end"
      role="dialog"
      ariaLabel="Advanced search"
      className="w-[min(30rem,94vw)] px-4 py-4"
    >
      <div className="space-y-2.5">
        {field('from', 'From', 'name or email')}
        {field('to', 'To')}
        {field('subject', 'Subject')}
        {field('words', 'Has the words')}
        <label className="flex items-center gap-3">
          <span className="w-[86px] shrink-0 text-right text-[13px] text-ink-2">Search</span>
          <select
            value={form.scope}
            onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
            className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-[86px] shrink-0 text-right text-[13px] text-ink-2">Label</span>
          <select
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            <option value="">Any label</option>
            {data.labels.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-3">
          <span className="w-[86px] shrink-0 text-right text-[13px] text-ink-2">Date within</span>
          <select
            value={form.within}
            onChange={(e) => setForm((f) => ({ ...f, within: e.target.value }))}
            className="min-w-0 flex-1 rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
          >
            <option value="">Any time</option>
            <option value="1d">1 day</option>
            <option value="3d">3 days</option>
            <option value="1w">1 week</option>
            <option value="2w">2 weeks</option>
            <option value="1m">1 month</option>
            <option value="6m">6 months</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-4 pl-[98px] pt-1 text-[13px] text-ink-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasAttachment}
              onChange={(e) => setForm((f) => ({ ...f, hasAttachment: e.target.checked }))}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Has attachment
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.unreadOnly}
              onChange={(e) => setForm((f) => ({ ...f, unreadOnly: e.target.checked }))}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Unread only
          </label>
        </div>
        <div className="flex items-center justify-between gap-2 pt-3">
          <span className="truncate font-mono text-[11px] text-ink-4">{build() || 'in:all'}</span>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="text"
              onClick={() =>
                setForm({
                  from: '',
                  to: '',
                  subject: '',
                  words: '',
                  label: '',
                  scope: '',
                  within: '',
                  hasAttachment: false,
                  unreadOnly: false,
                })
              }
            >
              Clear
            </Button>
            <Button onClick={() => onSearch(build())} disabled={!build()}>
              Search
            </Button>
          </div>
        </div>
      </div>
    </Popover>
  )
}

export const SEARCH_VIEW_TITLE = (route: Route) =>
  route.search ? 'Search results' : VIEWS[route.view].title

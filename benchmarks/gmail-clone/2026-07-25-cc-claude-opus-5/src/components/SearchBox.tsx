import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/app'
import { resolveContact } from '../lib/contacts'
import { SEARCH_OPERATORS } from '../lib/search'
import { selectFrequentContacts, useStore } from '../lib/store'
import { Icon } from './Icon'
import { Avatar, Button, cx, IconButton, Popover } from './ui'

const RECENTS_KEY = 'opus5.recent-searches'

function loadRecents(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveRecent(q: string) {
  const next = [q, ...loadRecents().filter((x) => x !== q)].slice(0, 8)
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
}

export function SearchBox() {
  const app = useApp()
  const state = useStore()
  const [value, setValue] = useState(app.route.query ?? '')
  const [open, setOpen] = useState(false)
  const [advOpen, setAdvOpen] = useState(false)
  const [recents, setRecents] = useState<string[]>(loadRecents)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(app.route.query ?? '')
  }, [app.route.query])

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping(e.target)) {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [])

  const frequent = useMemo(() => selectFrequentContacts(state).slice(0, 40), [state])

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    const out: { id: string; kind: 'recent' | 'contact' | 'op' | 'term'; text: string; sub?: string; email?: string }[] =
      []

    if (!q) {
      for (const r of recents.slice(0, 5)) out.push({ id: `r-${r}`, kind: 'recent', text: r })
      for (const e of frequent.slice(0, 4)) {
        const c = resolveContact(e)
        out.push({ id: `c-${e}`, kind: 'contact', text: c.name, sub: c.email, email: e })
      }
      if (!out.length)
        for (const o of SEARCH_OPERATORS.slice(0, 5))
          out.push({ id: `o-${o.op}`, kind: 'op', text: o.op, sub: o.hint })
      return out.slice(0, 9)
    }

    const lastToken = q.split(/\s+/).pop() ?? ''
    if (lastToken.includes(':')) {
      const [head] = lastToken.split(':')
      for (const o of SEARCH_OPERATORS.filter((x) => x.op.startsWith(head)))
        out.push({ id: `o-${o.op}`, kind: 'op', text: o.op, sub: o.hint })
    }

    for (const r of recents.filter((x) => x.toLowerCase().includes(q)).slice(0, 3))
      out.push({ id: `r-${r}`, kind: 'recent', text: r })

    for (const e of frequent) {
      const c = resolveContact(e)
      if (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)) {
        out.push({ id: `c-${e}`, kind: 'contact', text: c.name, sub: c.email, email: e })
      }
      if (out.length > 8) break
    }

    out.push({ id: 'term', kind: 'term', text: value.trim() })
    return out.slice(0, 9)
  }, [value, recents, frequent])

  const submit = useCallback(
    (q: string) => {
      const trimmed = q.trim()
      setOpen(false)
      setActive(-1)
      inputRef.current?.blur()
      if (!trimmed) {
        app.navigate({ kind: 'inbox' })
        return
      }
      saveRecent(trimmed)
      setRecents(loadRecents())
      app.navigate({ kind: 'search', query: trimmed })
    },
    [app],
  )

  const pick = useCallback(
    (s: (typeof suggestions)[number]) => {
      if (s.kind === 'contact' && s.email) {
        setValue(`from:${s.email} `)
        submit(`from:${s.email}`)
      } else if (s.kind === 'op') {
        const parts = value.trim().split(/\s+/)
        parts[parts.length - 1] = s.text
        const next = `${parts.join(' ')}${s.text.endsWith(':') ? '' : ' '}`
        setValue(next)
        inputRef.current?.focus()
      } else {
        setValue(s.text)
        submit(s.text)
      }
    },
    [submit, value],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active >= 0 && suggestions[active]) pick(suggestions[active])
      else submit(value)
    } else if (e.key === 'Escape') {
      if (open) {
        setOpen(false)
        setActive(-1)
      } else {
        setValue('')
        inputRef.current?.blur()
      }
    }
  }

  const focused = open || advOpen

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <div
        className={cx(
          'flex h-12 items-center gap-1 rounded-lg px-2 transition-colors sm:h-12',
          focused ? 'bg-field-focus shadow-e1' : 'bg-field hover:shadow-e1',
        )}
      >
        <IconButton
          icon="search"
          tip="Search mail"
          padding="p-2"
          onClick={() => {
            inputRef.current?.focus()
            setOpen(true)
          }}
        />
        <input
          ref={inputRef}
          value={value}
          placeholder="Search mail"
          aria-label="Search mail"
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
        {value && (
          <IconButton
            icon="close"
            tip="Clear search"
            padding="p-2"
            onClick={() => {
              setValue('')
              inputRef.current?.focus()
              if (app.route.kind === 'search') app.navigate({ kind: 'inbox' })
            }}
          />
        )}
        <span className="hidden sm:block">
          <IconButton
            icon="tune"
            tip="Show search options"
            padding="p-2"
            active={advOpen}
            onClick={() => {
              setAdvOpen((v) => !v)
              setOpen(false)
            }}
          />
        </span>
      </div>

      {open && !advOpen && suggestions.length > 0 && (
        <>
          <div className="fixed inset-0 z-[90]" onMouseDown={() => setOpen(false)} />
          <div className="anim-fade absolute inset-x-0 top-full z-[100] mt-1 overflow-hidden rounded-lg bg-raised py-2 shadow-e2">
            {suggestions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(s)
                }}
                onMouseEnter={() => setActive(i)}
                className={cx(
                  'flex w-full items-center gap-3 px-4 py-2 text-left text-[13px]',
                  i === active ? 'bg-hov' : 'hover:bg-hov',
                )}
              >
                {s.kind === 'contact' && s.email ? (
                  <Avatar
                    name={s.text}
                    hue={resolveContact(s.email).hue}
                    size={24}
                    className="text-[10px]"
                  />
                ) : (
                  <Icon
                    name={s.kind === 'recent' ? 'clock' : s.kind === 'op' ? 'tune' : 'search'}
                    size={18}
                    className="text-ink-3"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-ink">{s.text}</span>
                {s.sub && <span className="hidden truncate text-[12px] text-ink-3 sm:block">{s.sub}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      <AdvancedSearch
        anchor={wrapRef.current}
        open={advOpen}
        onClose={() => setAdvOpen(false)}
        onSubmit={(q) => {
          setValue(q)
          setAdvOpen(false)
          submit(q)
        }}
      />
    </div>
  )
}

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

/* ------------------------------------------------------ advanced panel */

const FIELD =
  'h-8 w-full rounded border border-line-2 bg-transparent px-2 text-[13px] text-ink outline-none focus:border-accent'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid grid-cols-[92px_1fr] items-center gap-3 py-1.5">
      <span className="text-right text-[13px] text-ink-2">{label}</span>
      {children}
    </label>
  )
}

function AdvancedSearch({
  anchor,
  open,
  onClose,
  onSubmit,
}: {
  anchor: HTMLElement | null
  open: boolean
  onClose: () => void
  onSubmit: (q: string) => void
}) {
  const state = useStore()
  const [f, setF] = useState({
    from: '',
    to: '',
    subject: '',
    has: '',
    not: '',
    scope: 'all',
    date: 'any',
    attach: false,
  })

  const build = () => {
    const parts: string[] = []
    if (f.from) parts.push(`from:${quote(f.from)}`)
    if (f.to) parts.push(`to:${quote(f.to)}`)
    if (f.subject) parts.push(`subject:${quote(f.subject)}`)
    if (f.has) parts.push(f.has)
    if (f.not)
      for (const w of f.not.split(/\s+/).filter(Boolean)) parts.push(`-${w}`)
    if (f.attach) parts.push('has:attachment')
    if (f.scope !== 'all') parts.push(`in:${f.scope}`)
    if (f.date !== 'any') parts.push(`newer_than:${f.date}`)
    return parts.join(' ')
  }

  return (
    <Popover
      anchor={anchor}
      open={open}
      onClose={onClose}
      placement="bottom-start"
      width={anchor?.offsetWidth}
      className="!py-0"
    >
      <form
        className="px-4 pt-4 pb-3"
        onSubmit={(e) => {
          e.preventDefault()
          const q = build()
          if (q) onSubmit(q)
        }}
      >
        <Row label="From">
          <input className={FIELD} value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} />
        </Row>
        <Row label="To">
          <input className={FIELD} value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} />
        </Row>
        <Row label="Subject">
          <input
            className={FIELD}
            value={f.subject}
            onChange={(e) => setF({ ...f, subject: e.target.value })}
          />
        </Row>
        <Row label="Has the words">
          <input className={FIELD} value={f.has} onChange={(e) => setF({ ...f, has: e.target.value })} />
        </Row>
        <Row label="Doesn't have">
          <input className={FIELD} value={f.not} onChange={(e) => setF({ ...f, not: e.target.value })} />
        </Row>
        <Row label="Search in">
          <select
            className={FIELD}
            value={f.scope}
            onChange={(e) => setF({ ...f, scope: e.target.value })}
          >
            <option value="all">All mail</option>
            <option value="inbox">Inbox</option>
            <option value="sent">Sent</option>
            <option value="drafts">Drafts</option>
            <option value="spam">Spam</option>
            <option value="trash">Trash</option>
            <option value="anywhere">Mail &amp; Spam &amp; Trash</option>
          </select>
        </Row>
        <Row label="Date within">
          <select className={FIELD} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })}>
            <option value="any">Any time</option>
            <option value="1d">1 day</option>
            <option value="3d">3 days</option>
            <option value="1w">1 week</option>
            <option value="1m">1 month</option>
            <option value="1y">1 year</option>
          </select>
        </Row>
        <div className="grid grid-cols-[92px_1fr] gap-3 py-1.5">
          <span />
          <label className="flex items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={f.attach}
              onChange={(e) => setF({ ...f, attach: e.target.checked })}
              className="size-4 accent-[var(--c-accent)]"
            />
            Has attachment
          </label>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3">
          <Button
            variant="text"
            onClick={() => setF({ from: '', to: '', subject: '', has: '', not: '', scope: 'all', date: 'any', attach: false })}
          >
            Clear
          </Button>
          <Button variant="filled" type="submit">
            Search
          </Button>
        </div>
        <p className="pb-1 text-[11px] text-ink-4">
          {state.threads.length} conversations in this mailbox · operators like{' '}
          <code className="text-ink-3">has:attachment</code> also work in the box above
        </p>
      </form>
    </Popover>
  )
}

function quote(v: string) {
  return /\s/.test(v) ? `"${v}"` : v
}

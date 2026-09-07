import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../lib/app'
import { CONTACTS } from '../lib/contacts'
import { Icon } from './Icon'
import { cx } from './ui'

const SUGGESTIONS = [
  'is:unread',
  'is:starred',
  'has:attachment',
  'in:sent',
  'in:drafts',
  'label:work',
  'from:priya',
  'from:sam',
]

export function SearchBox() {
  const app = useApp()
  const [value, setValue] = useState(app.route.query ?? '')
  const [open, setOpen] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [hasAtt, setHasAtt] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setValue(app.route.query ?? '')
  }, [app.route.query])

  const hints = useMemo(() => {
    const q = value.trim().toLowerCase()
    const people = CONTACTS.filter(
      (c) => c.email !== 'jordan.hale@northline.io' && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)),
    ).slice(0, 4)
    const ops = SUGGESTIONS.filter((s) => !q || s.includes(q)).slice(0, 5)
    return { people, ops }
  }, [value])

  const run = (q: string) => {
    setOpen(false)
    setAdvanced(false)
    app.navigate({ kind: 'search', query: q })
  }

  const runAdvanced = () => {
    const parts = [
      from && `from:${from}`,
      to && `to:${to}`,
      subject && `subject:${subject.includes(' ') ? `"${subject}"` : subject}`,
      hasAtt && 'has:attachment',
      value.trim(),
    ].filter(Boolean)
    run(parts.join(' '))
  }

  return (
    <div className="relative w-full">
      <form
        className={cx(
          'flex h-12 items-center gap-1 rounded-full px-2 transition-shadow',
          open ? 'bg-panel shadow-e2' : 'bg-search',
        )}
        onSubmit={(e) => {
          e.preventDefault()
          run(value)
        }}
      >
        <button type="submit" className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-hov" aria-label="Search">
          <Icon name="search" />
        </button>
        <input
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 180)}
          placeholder="Search mail"
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
          aria-label="Search mail"
        />
        {value && (
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-hov"
            aria-label="Clear search"
            onClick={() => {
              setValue('')
              ref.current?.focus()
              if (app.route.kind === 'search') app.navigate({ kind: 'inbox' })
            }}
          >
            <Icon name="close" />
          </button>
        )}
        <button
          type="button"
          className="grid size-10 place-items-center rounded-full text-ink-2 hover:bg-hov"
          aria-label="Show search options"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setAdvanced((v) => !v)
            setOpen(true)
          }}
        >
          <Icon name="filter" />
        </button>
      </form>

      {open && !advanced && (hints.people.length > 0 || hints.ops.length > 0) && (
        <div className="anim-up absolute inset-x-0 top-[52px] z-[90] overflow-hidden rounded-2xl bg-panel py-2 shadow-e3">
          {hints.people.map((c) => (
            <button
              key={c.email}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-hov"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(`from:${c.email}`)}
            >
              <Icon name="search" size={18} className="text-ink-4" />
              <span>
                {c.name} <span className="text-ink-3">{c.email}</span>
              </span>
            </button>
          ))}
          {hints.ops.map((s) => (
            <button
              key={s}
              type="button"
              className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-hov"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => run(s)}
            >
              <Icon name="search" size={18} className="text-ink-4" />
              {s}
            </button>
          ))}
        </div>
      )}

      {advanced && (
        <div className="anim-up absolute inset-x-0 top-[52px] z-[90] rounded-2xl bg-panel p-4 shadow-e3">
          <div className="grid grid-cols-[88px_1fr] items-center gap-2 text-[13px]">
            <label htmlFor="adv-from">From</label>
            <input id="adv-from" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-lg border border-line bg-transparent px-3 outline-none" />
            <label htmlFor="adv-to">To</label>
            <input id="adv-to" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-lg border border-line bg-transparent px-3 outline-none" />
            <label htmlFor="adv-subj">Subject</label>
            <input id="adv-subj" value={subject} onChange={(e) => setSubject(e.target.value)} className="h-9 rounded-lg border border-line bg-transparent px-3 outline-none" />
            <span />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={hasAtt} onChange={(e) => setHasAtt(e.target.checked)} />
              Has attachment
            </label>
          </div>
          <div className="mt-3 flex justify-end">
            <button type="button" className="rounded-full bg-accent px-4 py-1.5 text-[13px] font-medium text-panel" onClick={runAdvanced}>
              Search
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

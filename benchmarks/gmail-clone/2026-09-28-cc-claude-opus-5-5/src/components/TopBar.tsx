import { useEffect, useMemo, useRef, useState } from 'react'
import { Menu, Search, SlidersHorizontal, X, HelpCircle, Settings as SettingsIcon, Mail, Clock, ArrowLeft, Sun, Moon, Monitor, RotateCcw, Keyboard } from 'lucide-react'
import type { View } from '../types'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { goView } from '../lib/router'
import { ME } from '../data/contacts'
import { Avatar, Button, cx, Dropdown, IconButton, useDismiss } from './ui'
import { matchThread, parseQuery } from '../lib/search'
import { lastDate } from '../lib/mail'
import { formatListDate } from '../lib/format'

const RECENT_KEY = 'opus-mail-recent-searches'
function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}
function pushRecent(q: string) {
  const list = [q, ...getRecent().filter((x) => x !== q)].slice(0, 6)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}

export function runSearch(q: string) {
  const query = q.trim()
  if (!query) {
    goView({ kind: 'folder', folder: 'inbox' })
    return
  }
  pushRecent(query)
  useUI.getState().clearSelection()
  goView({ kind: 'search', query })
}

export function Logo({ compact }: { compact?: boolean }) {
  return (
    <button type="button" onClick={() => goView({ kind: 'folder', folder: 'inbox' })} className="flex items-center gap-2 pl-1 pr-2" aria-label="Opus 5.5 — go to Inbox">
      <svg width="32" height="26" viewBox="0 0 40 32" aria-hidden>
        <rect x="1" y="3" width="38" height="27" rx="4" fill="var(--accent)" opacity=".16" />
        <path d="M3 7.5 20 19 37 7.5" fill="none" stroke="var(--accent)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="1.5" y="3.5" width="37" height="26" rx="4" fill="none" stroke="var(--accent)" strokeWidth="2.6" />
      </svg>
      {!compact && <h1 className="text-[22px] font-normal tracking-tight text-muted">Opus 5.5</h1>}
    </button>
  )
}

function SearchBox({ view, mobile }: { view: View; mobile: boolean }) {
  const current = view.kind === 'search' ? view.query : ''
  const [value, setValue] = useState(current)
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const [advanced, setAdvanced] = useState(false)
  const wrap = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const threads = useMail((s) => s.threads)
  const labels = useMail((s) => s.labels)
  const contacts = useMail((s) => s.contacts)
  const setDrawer = useUI((s) => s.setDrawer)

  useEffect(() => setValue(current), [current])
  useEffect(() => {
    const onFocus = () => input.current?.focus()
    window.addEventListener('focus-search', onFocus)
    return () => window.removeEventListener('focus-search', onFocus)
  }, [])

  const refs = useRef([wrap]).current
  useDismiss(focused || advanced, () => {
    setFocused(false)
    setAdvanced(false)
  }, refs)

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return { people: [], mails: [] }
    const people = contacts.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)).slice(0, 3)
    const parsed = parseQuery(value)
    const mails = Object.values(threads)
      .filter((t) => matchThread(t, parsed, labels, Date.now()))
      .sort((a, b) => lastDate(b) - lastDate(a))
      .slice(0, 5)
    return { people, mails }
  }, [value, threads, labels, contacts])

  const recent = getRecent()
  type Opt = { key: string; run: () => void }
  const options: Opt[] = value.trim()
    ? [
        ...suggestions.people.map((c) => ({ key: 'p' + c.email, run: () => submit(`from:${c.email}`) })),
        ...suggestions.mails.map((t) => ({
          key: 't' + t.id,
          run: () => {
            setFocused(false)
            goView(view.kind === 'search' ? view : { kind: 'search', query: value.trim() }, t.id)
          },
        })),
      ]
    : recent.map((r) => ({ key: 'r' + r, run: () => submit(r) }))

  function submit(q: string) {
    setValue(q)
    setFocused(false)
    setActive(-1)
    input.current?.blur()
    runSearch(q)
  }

  const showPanel = focused && (options.length > 0 || !!value.trim())

  return (
    <div ref={wrap} className={cx('relative min-w-0 flex-1', mobile ? '' : 'max-w-[720px]')}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (active >= 0 && options[active]) options[active].run()
          else submit(value)
        }}
        className={cx(
          'flex h-12 items-center gap-1 px-1 transition-colors',
          showPanel || advanced ? 'rounded-t-3xl bg-surface shadow-pop' : 'rounded-full bg-search focus-within:bg-surface focus-within:shadow-pop',
        )}
      >
        {mobile ? (
          view.kind === 'search' ? (
            <IconButton label="Back" onClick={() => goView({ kind: 'folder', folder: 'inbox' })}>
              <ArrowLeft size={20} />
            </IconButton>
          ) : (
            <IconButton label="Main menu" onClick={() => setDrawer(true)}>
              <Menu size={20} />
            </IconButton>
          )
        ) : (
          <IconButton label="Search" type="submit">
            <Search size={20} />
          </IconButton>
        )}
        <input
          ref={input}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setActive(-1)
            setFocused(true)
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(options.length - 1, a + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(-1, a - 1))
            } else if (e.key === 'Escape') {
              setFocused(false)
              input.current?.blur()
            }
          }}
          placeholder="Search mail"
          aria-label="Search mail"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted"
        />
        {value && (
          <IconButton
            label="Clear search"
            onClick={() => {
              setValue('')
              input.current?.focus()
              if (view.kind === 'search') goView({ kind: 'folder', folder: 'inbox' })
            }}
          >
            <X size={20} />
          </IconButton>
        )}
        {!mobile && (
          <IconButton label="Show search options" onClick={() => { setAdvanced(!advanced); setFocused(false) }}>
            <SlidersHorizontal size={20} />
          </IconButton>
        )}
        {mobile && <AccountMenu mobile />}
      </form>

      {showPanel && !advanced && (
        <div className="animate-fade absolute inset-x-0 top-12 z-[60] max-h-[70vh] overflow-y-auto rounded-b-3xl border-t border-line bg-surface pb-3 shadow-pop">
          {!value.trim() && recent.length > 0 && <div className="px-5 pb-1 pt-3 text-xs font-medium text-muted">Recent searches</div>}
          {!value.trim() &&
            recent.map((r, i) => (
              <button key={r} type="button" onClick={() => submit(r)} className={cx('flex w-full items-center gap-4 px-5 py-2 text-left hover:bg-hover', active === i && 'bg-hover')}>
                <Clock size={18} className="text-muted" />
                <span className="truncate">{r}</span>
              </button>
            ))}
          {suggestions.people.map((c, i) => (
            <button key={c.email} type="button" onClick={() => submit(`from:${c.email}`)} className={cx('flex w-full items-center gap-4 px-5 py-2 text-left hover:bg-hover', active === i && 'bg-hover')}>
              <Avatar contact={c} size={28} />
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{c.name}</span> <span className="text-muted">{c.email}</span>
              </span>
            </button>
          ))}
          {suggestions.mails.map((t, i) => {
            const idx = suggestions.people.length + i
            const last = t.messages[t.messages.length - 1]
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => options[idx].run()}
                className={cx('flex w-full items-center gap-4 px-5 py-2 text-left hover:bg-hover', active === idx && 'bg-hover')}
              >
                <Mail size={18} className="shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className={cx('block truncate', t.unread && 'font-semibold')}>{t.subject}</span>
                  <span className="block truncate text-xs text-muted">{last.from.name}</span>
                </span>
                <span className="text-xs text-muted">{formatListDate(lastDate(t))}</span>
              </button>
            )
          })}
          {value.trim() && (
            <button type="button" onClick={() => submit(value)} className="mt-1 flex w-full items-center gap-4 border-t border-line px-5 pb-1 pt-3 text-left text-accent hover:underline">
              <Search size={18} />
              All search results for “{value.trim()}”
            </button>
          )}
        </div>
      )}
      {advanced && <AdvancedSearch initial={value} onSubmit={submit} onClose={() => setAdvanced(false)} />}
    </div>
  )
}

function AdvancedSearch({ initial, onSubmit, onClose }: { initial: string; onSubmit: (q: string) => void; onClose: () => void }) {
  const labels = useMail((s) => s.labels)
  const p = parseQuery(initial)
  const [f, setF] = useState({
    from: p.from.join(' '),
    to: p.to.join(' '),
    subject: p.subject.join(' '),
    words: p.terms.join(' '),
    without: p.negated.join(' '),
    within: '',
    where: p.in ?? (p.label[0] ? `label:${p.label[0]}` : 'all'),
    attachment: p.has.includes('attachment'),
    unread: p.is.includes('unread'),
  })
  const build = () => {
    const parts: string[] = []
    const q = (v: string) => (/\s/.test(v) ? `"${v}"` : v)
    if (f.from.trim()) parts.push(`from:${q(f.from.trim())}`)
    if (f.to.trim()) parts.push(`to:${q(f.to.trim())}`)
    if (f.subject.trim()) parts.push(`subject:${q(f.subject.trim())}`)
    if (f.words.trim()) parts.push(f.words.trim())
    if (f.without.trim()) parts.push(...f.without.trim().split(/\s+/).map((w) => `-${w}`))
    if (f.within) parts.push(`newer_than:${f.within}`)
    if (f.where.startsWith('label:')) parts.push(f.where)
    else if (f.where !== 'all') parts.push(`in:${f.where}`)
    if (f.attachment) parts.push('has:attachment')
    if (f.unread) parts.push('is:unread')
    return parts.join(' ')
  }
  const row = (label: string, key: 'from' | 'to' | 'subject' | 'words' | 'without') => (
    <label className="flex items-end gap-4">
      <span className="w-36 shrink-0 pb-1.5 text-[14px] text-ink">{label}</span>
      <input
        value={f[key]}
        onChange={(e) => setF({ ...f, [key]: e.target.value })}
        className="h-8 min-w-0 flex-1 border-b border-line-strong bg-transparent text-[14px] outline-none focus:border-b-2 focus:border-accent"
      />
    </label>
  )
  return (
    <div className="animate-fade absolute inset-x-0 top-12 z-[60] rounded-b-2xl bg-surface px-6 pb-5 pt-3 shadow-pop">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit(build())
          onClose()
        }}
        className="flex flex-col gap-3"
      >
        {row('From', 'from')}
        {row('To', 'to')}
        {row('Subject', 'subject')}
        {row('Has the words', 'words')}
        {row("Doesn't have", 'without')}
        <label className="flex items-center gap-4">
          <span className="w-36 shrink-0 text-[14px]">Date within</span>
          <select value={f.within} onChange={(e) => setF({ ...f, within: e.target.value })} className="h-8 rounded border border-line-strong bg-surface px-2 text-[14px]">
            <option value="">Any time</option>
            <option value="1d">1 day</option>
            <option value="7d">1 week</option>
            <option value="1m">1 month</option>
            <option value="6m">6 months</option>
            <option value="1y">1 year</option>
          </select>
        </label>
        <label className="flex items-center gap-4">
          <span className="w-36 shrink-0 text-[14px]">Search</span>
          <select value={f.where} onChange={(e) => setF({ ...f, where: e.target.value })} className="h-8 rounded border border-line-strong bg-surface px-2 text-[14px]">
            <option value="all">All Mail</option>
            <option value="inbox">Inbox</option>
            <option value="sent">Sent Mail</option>
            <option value="anywhere">Mail &amp; Spam &amp; Trash</option>
            <option value="trash">Trash</option>
            <option value="spam">Spam</option>
            {labels.map((l) => (
              <option key={l.id} value={`label:${l.name.toLowerCase().replace(/\s+/g, '-')}`}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={f.attachment} onChange={(e) => setF({ ...f, attachment: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
            Has attachment
          </label>
          <label className="flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={f.unread} onChange={(e) => setF({ ...f, unread: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
            Unread only
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button onClick={() => setF({ from: '', to: '', subject: '', words: '', without: '', within: '', where: 'all', attachment: false, unread: false })}>Clear</Button>
          <Button variant="filled" type="submit">
            Search
          </Button>
        </div>
      </form>
    </div>
  )
}

export function AccountMenu({ mobile }: { mobile?: boolean }) {
  const settings = useMail((s) => s.settings)
  const update = useMail((s) => s.updateSettings)
  const reset = useMail((s) => s.resetMailbox)
  const setOverlay = useUI((s) => s.setOverlay)
  return (
    <Dropdown
      align="right"
      width={360}
      trigger={({ toggle }) => (
        <button type="button" onClick={toggle} aria-label={`Account: ${ME.name}`} data-tip={mobile ? undefined : `${ME.name} ${ME.email}`} className="mx-1 rounded-full p-1 hover:bg-hover">
          <Avatar contact={ME} size={mobile ? 32 : 34} />
        </button>
      )}
    >
      {(close) => (
        <div className="flex flex-col items-center px-4 pb-2 pt-3 text-center">
          <div className="text-[14px] text-muted">{ME.email}</div>
          <Avatar contact={ME} size={76} className="mt-5 text-[32px]" />
          <div className="mt-3 text-[22px]">Hi, {ME.name.split(' ')[0]}!</div>
          <div className="mt-4 flex w-full items-center justify-center gap-1 rounded-full bg-bg p-1">
            {(
              [
                ['light', Sun, 'Light'],
                ['dark', Moon, 'Dark'],
                ['system', Monitor, 'System'],
              ] as const
            ).map(([t, Icon, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => update({ theme: t })}
                className={cx('flex h-9 flex-1 items-center justify-center gap-2 rounded-full text-[13px]', settings.theme === t ? 'bg-active font-medium' : 'hover:bg-hover')}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex w-full flex-col overflow-hidden rounded-2xl bg-bg text-left">
            <button type="button" onClick={() => { close(); setOverlay('settings') }} className="flex items-center gap-4 px-5 py-3 hover:bg-hover">
              <SettingsIcon size={18} /> Mail settings
            </button>
            <button type="button" onClick={() => { close(); setOverlay('shortcuts') }} className="flex items-center gap-4 px-5 py-3 hover:bg-hover">
              <Keyboard size={18} /> Keyboard shortcuts
            </button>
            <button
              type="button"
              onClick={() => {
                close()
                if (confirm('Reset the mailbox to its original demo state? Your local changes will be lost.')) {
                  reset()
                  useUI.getState().setSelected([])
                  goView({ kind: 'folder', folder: 'inbox' })
                  useUI.getState().showToast('Mailbox restored to demo data.')
                }
              }}
              className="flex items-center gap-4 border-t border-line px-5 py-3 hover:bg-hover"
            >
              <RotateCcw size={18} /> Reset demo mailbox
            </button>
          </div>
          <div className="mt-3 text-xs text-muted">Stored locally in this browser · works offline</div>
        </div>
      )}
    </Dropdown>
  )
}

export function TopBar({ view, mobile, onToggleSidebar }: { view: View; mobile: boolean; onToggleSidebar: () => void }) {
  const setOverlay = useUI((s) => s.setOverlay)
  if (mobile) {
    return (
      <header className="no-print sticky top-0 z-30 bg-bg px-3 pb-2 pt-2">
        <SearchBox view={view} mobile />
      </header>
    )
  }
  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-2 pl-2 pr-3">
      <div className="flex w-[240px] shrink-0 items-center gap-1 max-lg:w-auto">
        <IconButton label="Main menu" size="lg" onClick={onToggleSidebar}>
          <Menu size={22} />
        </IconButton>
        <Logo />
      </div>
      <div className="flex min-w-0 flex-1 items-center pl-2 lg:pl-4">
        <SearchBox view={view} mobile={false} />
      </div>
      <div className="flex items-center gap-1 pl-2">
        <IconButton label="Keyboard shortcuts" onClick={() => setOverlay('shortcuts')} className="max-md:hidden">
          <HelpCircle size={22} />
        </IconButton>
        <IconButton label="Settings" onClick={() => setOverlay('settings')}>
          <SettingsIcon size={22} />
        </IconButton>
        <AccountMenu />
      </div>
    </header>
  )
}

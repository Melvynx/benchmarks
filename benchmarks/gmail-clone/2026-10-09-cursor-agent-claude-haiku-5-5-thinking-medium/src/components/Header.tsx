import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CircleHelp, Clock3, Menu, Search, Settings, SlidersHorizontal, X, LogOut, RotateCcw, Keyboard, Mail, CheckCheck } from 'lucide-react'
import { useStore } from '../lib/store'
import { useMailActions } from '../lib/actions'
import { Avatar, Dropdown, IconButton, MenuItem, MenuLabel, cx } from './ui'

function quote(v: string) {
  return /\s/.test(v) ? `"${v}"` : v
}

const EMPTY_FIELDS = { from: '', to: '', subject: '', words: '', exclude: '', within: '', hasAttachment: false, folder: '' }

export function Header({ onToggleNav }: { onToggleNav: () => void }) {
  const { state, dispatch } = useStore()
  const { data, ui } = state
  const { toast } = useMailActions()
  const [focused, setFocused] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const wrapRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [fields, setFields] = useState(EMPTY_FIELDS)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.key === '/' && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && !el.isContentEditable) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!focused && !advanced) return
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setFocused(false)
        setAdvanced(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [focused, advanced])

  const commit = (query: string) => {
    dispatch({ type: 'setQuery', query })
    dispatch({ type: 'saveSearch', query })
    setFocused(false)
    setAdvanced(false)
    inputRef.current?.blur()
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    commit(ui.query)
  }

  const buildAdvanced = (e: FormEvent) => {
    e.preventDefault()
    const parts: string[] = []
    if (fields.from) parts.push(`from:${quote(fields.from)}`)
    if (fields.to) parts.push(`to:${quote(fields.to)}`)
    if (fields.subject) parts.push(`subject:${quote(fields.subject)}`)
    if (fields.words) parts.push(fields.words)
    if (fields.exclude) parts.push(...fields.exclude.split(/\s+/).filter(Boolean).map((w) => `-${w}`))
    if (fields.hasAttachment) parts.push('has:attachment')
    if (fields.within) {
      const d = new Date(ui.now - Number(fields.within) * 86_400_000)
      parts.push(`after:${d.toISOString().slice(0, 10)}`)
    }
    if (fields.folder) parts.push(`in:${fields.folder}`)
    commit(parts.join(' '))
  }

  const showPanel = focused && !ui.query.trim()

  return (
    <header className="flex h-16 shrink-0 items-center gap-1 px-2 sm:gap-3 sm:px-3">
      <IconButton title="Main menu" onClick={onToggleNav} className="lg:hidden">
        <Menu size={22} />
      </IconButton>
      <button
        type="button"
        onClick={() => dispatch({ type: 'setFolder', folder: 'inbox' })}
        className="flex shrink-0 items-center gap-2 pr-2"
        aria-label="Claude Haiku 5.5 home"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-accent-ink max-sm:hidden">
          <Mail size={19} strokeWidth={2.2} />
        </span>
        <span className="truncate text-[18px] font-medium tracking-tight sm:text-[22px]">Claude Haiku 5.5</span>
      </button>

      <form ref={wrapRef} onSubmit={submit} className="relative mx-auto min-w-0 flex-1 max-w-[720px]" role="search">
        <div className={cx('flex h-12 items-center rounded-full px-4 transition-shadow', focused || advanced ? 'bg-surface shadow-[0_1px_6px_rgba(32,33,36,0.2)]' : 'bg-hover')}>
          <Search size={18} className="mr-3 shrink-0 text-ink-2" />
          <input
            ref={inputRef}
            id="search-input"
            value={ui.query}
            onChange={(e) => dispatch({ type: 'setQuery', query: e.target.value })}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setFocused(false)
                setAdvanced(false)
                inputRef.current?.blur()
              }
            }}
            placeholder="Search mail  (try from:sarah has:attachment)"
            className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink-3"
            aria-label="Search mail"
          />
          {ui.query && (
            <IconButton title="Clear search" size="sm" className="mr-1" onClick={() => { dispatch({ type: 'setQuery', query: '' }); inputRef.current?.focus() }}>
              <X size={18} />
            </IconButton>
          )}
          <IconButton
            title="Show search options"
            size="sm"
            active={advanced}
            onClick={() => {
              setAdvanced((a) => !a)
              setFocused(true)
            }}
          >
            <SlidersHorizontal size={18} />
          </IconButton>
        </div>

        {(showPanel || advanced) && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl bg-surface shadow-xl animate-toast-in">
            {!advanced && (
              <div className="py-2">
                <div className="flex items-center justify-between px-4 pb-1 pt-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">
                  <span>Recent</span>
                  {data.recentSearches.length > 0 && (
                    <button type="button" className="text-[12px] normal-case tracking-normal text-accent" onClick={() => dispatch({ type: 'clearRecent' })}>
                      Clear
                    </button>
                  )}
                </div>
                {data.recentSearches.length === 0 && <div className="px-4 py-2 text-ink-3">No recent searches</div>}
                {data.recentSearches.map((q) => (
                  <button key={q} type="button" onClick={() => commit(q)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-hover">
                    <Clock3 size={16} className="text-ink-3" />
                    <span className="truncate">{q}</span>
                  </button>
                ))}
                <div className="mt-1 border-t border-line px-4 pt-2 text-[11px] font-medium uppercase tracking-wider text-ink-3">Quick filters</div>
                <div className="flex flex-wrap gap-2 px-4 py-2">
                  {['is:unread', 'is:starred', 'has:attachment', 'has:pdf', 'in:sent', 'label:work', 'is:snoozed'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => {
                        dispatch({ type: 'setQuery', query: f })
                        inputRef.current?.focus()
                      }}
                      className="rounded-full border border-line px-3 py-1 text-[12px] text-ink-2 hover:bg-hover"
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {advanced && (
              <form onSubmit={buildAdvanced} className="grid gap-3 p-5 text-[13px] sm:grid-cols-2">
                <Field label="From" value={fields.from} onChange={(v) => setFields({ ...fields, from: v })} />
                <Field label="To" value={fields.to} onChange={(v) => setFields({ ...fields, to: v })} />
                <Field label="Subject" value={fields.subject} onChange={(v) => setFields({ ...fields, subject: v })} />
                <Field label="Has the words" value={fields.words} onChange={(v) => setFields({ ...fields, words: v })} />
                <Field label="Doesn't have" value={fields.exclude} onChange={(v) => setFields({ ...fields, exclude: v })} />
                <label className="grid gap-1">
                  <span className="text-ink-3">Date within</span>
                  <select value={fields.within} onChange={(e) => setFields({ ...fields, within: e.target.value })} className="h-9 rounded-md border border-line bg-surface px-2">
                    <option value="">Any time</option>
                    <option value="1">1 day</option>
                    <option value="7">1 week</option>
                    <option value="30">1 month</option>
                    <option value="365">1 year</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-ink-3">Search in</span>
                  <select value={fields.folder} onChange={(e) => setFields({ ...fields, folder: e.target.value })} className="h-9 rounded-md border border-line bg-surface px-2">
                    <option value="">All mail</option>
                    <option value="inbox">Inbox</option>
                    <option value="sent">Sent</option>
                    <option value="drafts">Drafts</option>
                    <option value="trash">Trash</option>
                    <option value="spam">Spam</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 self-end pb-2">
                  <input type="checkbox" checked={fields.hasAttachment} onChange={(e) => setFields({ ...fields, hasAttachment: e.target.checked })} className="accent-[var(--accent)]" />
                  Has attachment
                </label>
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <button type="button" onClick={() => setFields(EMPTY_FIELDS)} className="rounded-full px-4 py-2 text-accent hover:bg-hover">
                    Reset
                  </button>
                  <button type="submit" className="rounded-full bg-accent px-5 py-2 font-medium text-accent-ink">
                    Search
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </form>

      <IconButton title="Keyboard shortcuts (?)" onClick={() => dispatch({ type: 'ui', patch: { shortcutsOpen: true } })} className="max-sm:hidden">
        <CircleHelp size={20} />
      </IconButton>
      <IconButton title="Settings" onClick={() => dispatch({ type: 'ui', patch: { settingsOpen: true } })} className="max-sm:hidden">
        <Settings size={20} />
      </IconButton>

      <Dropdown
        align="right"
        width="w-72"
        trigger={(toggle) => (
          <button type="button" onClick={toggle} title="Account" aria-label="Account" className="ml-1 rounded-full ring-accent transition focus-visible:ring-2">
            <Avatar name={data.me.name} email={data.me.email} size={34} />
          </button>
        )}
      >
        {(close) => (
          <div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar name={data.me.name} email={data.me.email} size={44} />
              <div className="min-w-0">
                <div className="truncate font-medium">{data.me.name}</div>
                <div className="truncate text-[12px] text-ink-3">{data.me.email}</div>
              </div>
            </div>
            <div className="border-t border-line py-1">
              <MenuItem icon={<Settings size={16} />} onClick={() => { close(); dispatch({ type: 'ui', patch: { settingsOpen: true } }) }}>Settings</MenuItem>
              <MenuItem icon={<Keyboard size={16} />} shortcut="?" onClick={() => { close(); dispatch({ type: 'ui', patch: { shortcutsOpen: true } }) }}>Keyboard shortcuts</MenuItem>
              <MenuItem icon={<CheckCheck size={16} />} onClick={() => { close(); toast('Everything is stored on this device and works offline') }}>Account status</MenuItem>
            </div>
            <div className="border-t border-line py-1">
              <MenuLabel>This device</MenuLabel>
              <MenuItem
                icon={<RotateCcw size={16} />}
                danger
                onClick={() => {
                  close()
                  if (window.confirm('Reset the mailbox to fresh demo data? Local changes will be lost.')) dispatch({ type: 'reset', now: Date.now() })
                }}
              >
                Reset demo data
              </MenuItem>
              <MenuItem icon={<LogOut size={16} />} onClick={() => { close(); toast('Sign-out is not available in the local demo') }}>
                Sign out
              </MenuItem>
            </div>
          </div>
        )}
      </Dropdown>
    </header>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1">
      <span className="text-ink-3">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 rounded-md border border-line bg-surface px-2 outline-none focus:border-accent" />
    </label>
  )
}

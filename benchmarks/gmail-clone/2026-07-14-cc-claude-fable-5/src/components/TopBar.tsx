import { useMemo, useRef, useState } from 'react'
import {
  CircleHelp,
  Keyboard,
  Mail,
  Menu as MenuIcon,
  Moon,
  RotateCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react'
import { useMail } from '../store/store'
import { useIsMobile } from '../hooks/hooks'
import { parseQuery, matchesQuery, threadDate, lastNonDraft } from '../lib/mail'
import { listDate } from '../lib/time'
import { cx } from '../lib/utils'
import { Avatar, IconButton, Menu, MenuDivider, MenuItem } from './ui'
import { ME } from '../data/seed'

const OPERATOR_HINTS = ['is:unread', 'is:starred', 'has:attachment', 'from:', 'label:', 'in:trash']

function SearchBox() {
  const searchInput = useMail((s) => s.searchInput)
  const setSearchInput = useMail((s) => s.setSearchInput)
  const navigate = useMail((s) => s.navigate)
  const openThread = useMail((s) => s.openThread)
  const threads = useMail((s) => s.threads)
  const labels = useMail((s) => s.labels)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    const q = searchInput.trim()
    if (!q) return []
    const parsed = parseQuery(q)
    const now = Date.now()
    return threads
      .filter((t) => matchesQuery(t, parsed, labels, now))
      .sort((a, b) => threadDate(b) - threadDate(a))
      .slice(0, 5)
  }, [searchInput, threads, labels])

  const submit = (q: string) => {
    const query = q.trim()
    if (!query) return
    navigate({ folder: 'search', query })
    inputRef.current?.blur()
    setFocused(false)
  }

  const showPanel = focused && searchInput.trim().length > 0

  return (
    <div className="relative min-w-0 w-full max-w-[720px]">
      <div
        className={cx(
          'flex h-12 items-center gap-1 rounded-full px-2 transition-colors',
          showPanel
            ? 'rounded-b-none bg-searchbar-focus shadow-[var(--shadow-menu)]'
            : focused
              ? 'bg-searchbar-focus shadow-[var(--shadow-menu)]'
              : 'bg-searchbar',
        )}
      >
        <IconButton title="Search" onClick={() => submit(searchInput)}>
          <Search />
        </IconButton>
        <input
          id="search-input"
          ref={inputRef}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit(searchInput)
            if (e.key === 'Escape') {
              setFocused(false)
              inputRef.current?.blur()
            }
          }}
          placeholder="Search mail"
          className="h-full w-full min-w-0 bg-transparent text-[15px] text-ink-1 outline-none placeholder:text-ink-3"
          autoComplete="off"
          spellCheck={false}
        />
        {searchInput && (
          <IconButton
            title="Clear search"
            onClick={() => {
              setSearchInput('')
              inputRef.current?.focus()
            }}
          >
            <X />
          </IconButton>
        )}
        <IconButton
          title="Show search options"
          className="max-md:hidden"
          onClick={() => {
            setSearchInput(searchInput.trim() ? searchInput : 'is:unread ')
            inputRef.current?.focus()
          }}
        >
          <SlidersHorizontal />
        </IconButton>
      </div>

      {showPanel && (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-b-2xl bg-searchbar-focus pb-2 shadow-[var(--shadow-menu)]">
          <div className="flex flex-wrap gap-1.5 px-4 py-2">
            {OPERATOR_HINTS.map((op) => (
              <button
                key={op}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const next = searchInput.trim() ? `${searchInput.trim()} ${op}` : op
                  setSearchInput(next + (op.endsWith(':') ? '' : ' '))
                  inputRef.current?.focus()
                }}
                className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink-2 hover:bg-surface-hover"
              >
                {op}
              </button>
            ))}
          </div>
          {suggestions.length > 0 && <div className="border-t border-line" />}
          {suggestions.map((t) => {
            const last = lastNonDraft(t) ?? t.messages[t.messages.length - 1]
            return (
              <button
                key={t.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  openThread(t.id)
                  setFocused(false)
                  inputRef.current?.blur()
                }}
                className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-hover"
              >
                <Avatar contact={last.from} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-1">{t.subject}</span>
                  <span className="block truncate text-xs text-ink-3">{last.from.name}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-3">{listDate(last.date)}</span>
              </button>
            )
          })}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => submit(searchInput)}
            className="mt-1 flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-accent hover:bg-surface-hover"
          >
            <Search className="h-4 w-4" />
            All search results for “{searchInput.trim()}”
          </button>
        </div>
      )}
    </div>
  )
}

export function TopBar() {
  const isMobile = useIsMobile()
  const navCollapsed = useMail((s) => s.navCollapsed)
  const setNavCollapsed = useMail((s) => s.setNavCollapsed)
  const drawerOpen = useMail((s) => s.drawerOpen)
  const setDrawerOpen = useMail((s) => s.setDrawerOpen)
  const setSettingsOpen = useMail((s) => s.setSettingsOpen)
  const settingsOpen = useMail((s) => s.settingsOpen)
  const setShortcutsOpen = useMail((s) => s.setShortcutsOpen)
  const settings = useMail((s) => s.settings)
  const setSettings = useMail((s) => s.setSettings)
  const resetData = useMail((s) => s.resetData)
  const navigate = useMail((s) => s.navigate)
  const [accountOpen, setAccountOpen] = useState(false)

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 px-2 md:px-4">
      <div className="flex w-auto md:w-[228px] shrink-0 items-center gap-1">
        <IconButton
          title="Main menu"
          size="lg"
          onClick={() => (isMobile ? setDrawerOpen(!drawerOpen) : setNavCollapsed(!navCollapsed))}
        >
          <MenuIcon />
        </IconButton>
        <button
          type="button"
          onClick={() => navigate({ folder: 'inbox' })}
          className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-black/5 dark:hover:bg-white/5"
          title="Go to Inbox"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Mail className="h-5 w-5" />
          </span>
          <h1 className="text-[22px] leading-none text-ink-2 max-[420px]:hidden">Fable 5</h1>
        </button>
      </div>

      <div className="flex min-w-0 flex-1 justify-start">
        <SearchBox />
      </div>

      <div className="flex shrink-0 items-center gap-1 md:w-auto">
        <IconButton title="Keyboard shortcuts (?)" className="max-md:hidden" onClick={() => setShortcutsOpen(true)}>
          <CircleHelp />
        </IconButton>
        <IconButton
          title="Settings"
          active={settingsOpen}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings />
        </IconButton>
        <div className="relative">
          <button
            type="button"
            title={`${ME.name} (${ME.email})`}
            onClick={() => setAccountOpen(!accountOpen)}
            className="ml-1 flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/8 dark:hover:bg-white/10"
          >
            <Avatar contact={ME} size={32} />
          </button>
          <Menu open={accountOpen} onClose={() => setAccountOpen(false)} align="right" width="w-72">
            <div className="flex flex-col items-center gap-2 px-6 pb-4 pt-3 text-center">
              <Avatar contact={ME} size={64} />
              <div>
                <div className="text-base font-medium text-ink-1">{ME.name}</div>
                <div className="text-sm text-ink-3">{ME.email}</div>
              </div>
            </div>
            <MenuDivider />
            <MenuItem
              icon={settings.theme === 'dark' ? <Sun /> : <Moon />}
              onClick={() => {
                setSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }}
            >
              Switch to {settings.theme === 'dark' ? 'light' : 'dark'} theme
            </MenuItem>
            <MenuItem
              icon={<Keyboard />}
              onClick={() => {
                setAccountOpen(false)
                setShortcutsOpen(true)
              }}
            >
              Keyboard shortcuts
            </MenuItem>
            <MenuDivider />
            <MenuItem
              icon={<RotateCcw />}
              onClick={() => {
                setAccountOpen(false)
                resetData()
              }}
            >
              Reset demo data
            </MenuItem>
          </Menu>
        </div>
      </div>
    </header>
  )
}

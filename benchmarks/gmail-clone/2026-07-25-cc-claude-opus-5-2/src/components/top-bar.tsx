import { useRef, useState } from 'react'
import {
  Grid3x3,
  Info,
  Keyboard,
  LogOut,
  Menu as MenuIcon,
  Moon,
  RefreshCw,
  Settings,
  Sun,
  SunMoon,
} from 'lucide-react'
import { useMail } from '@/store/mail-store'
import { useSettings } from '@/store/settings'
import { useToast } from '@/store/toast'
import type { Route } from '@/store/router'
import { formatBytes } from '@/lib/utils'
import { Avatar, IconButton } from './ui/bits'
import { Menu } from './ui/popover'
import { SearchBox } from './search-box'

interface TopBarProps {
  route: Route
  navigate: (r: Route) => void
  onToggleSidebar: () => void
  onRefresh: () => void
  refreshing: boolean
  onShowShortcuts: () => void
}

export function TopBar({
  route,
  navigate,
  onToggleSidebar,
  onRefresh,
  refreshing,
  onShowShortcuts,
}: TopBarProps) {
  const { data, resetMailbox } = useMail()
  const { settings, set } = useSettings()
  const { show } = useToast()
  const accountRef = useRef<HTMLButtonElement>(null)
  const settingsRef = useRef<HTMLButtonElement>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const nextTheme = settings.theme === 'dark' ? 'light' : settings.theme === 'light' ? 'system' : 'dark'
  const ThemeIcon = settings.theme === 'dark' ? Moon : settings.theme === 'light' ? Sun : SunMoon

  return (
    // Phones wrap the search field onto its own line under the brand row.
    <header className="relative z-50 flex shrink-0 flex-wrap items-center gap-1.5 bg-canvas px-2 pb-2 pt-1.5 sm:h-16 sm:flex-nowrap sm:gap-3 sm:px-4 sm:py-0">
      <IconButton label="Main menu" size="lg" onClick={onToggleSidebar} className="shrink-0">
        <MenuIcon />
      </IconButton>

      <a
        href="#/inbox"
        onClick={(e) => {
          e.preventDefault()
          navigate({ view: 'inbox' })
        }}
        className="mr-1 flex shrink-0 items-center gap-2 rounded px-1 py-1 outline-offset-4 sm:mr-3"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7 shrink-0">
          <rect x="1" y="4" width="22" height="16" rx="3" fill="var(--color-accent)" />
          <path d="M3 7.5 12 14l9-6.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="whitespace-nowrap text-[19px] font-normal tracking-tight text-ink-2 sm:text-[21px]">
          Claude Opus 5
        </h1>
      </a>

      <SearchBox
        route={route}
        navigate={navigate}
        className="order-last basis-full sm:order-none sm:basis-auto sm:max-w-[720px]"
      />

      <div className="ml-auto flex shrink-0 items-center gap-0.5 pl-1 sm:ml-0 sm:gap-1 sm:pl-2">
        <IconButton
          label="Refresh"
          shortcut="R"
          onClick={onRefresh}
          className="hidden sm:inline-flex"
        >
          <RefreshCw className={refreshing ? 'animate-spin' : undefined} />
        </IconButton>
        <IconButton
          label={`Theme: ${settings.theme}`}
          onClick={() => set('theme', nextTheme)}
          className="hidden sm:inline-flex"
        >
          <ThemeIcon />
        </IconButton>
        <IconButton
          ref={settingsRef}
          label="Settings"
          onClick={() => setSettingsOpen((v) => !v)}
          active={settingsOpen}
        >
          <Settings />
        </IconButton>
        <IconButton label="Apps" className="hidden md:inline-flex" onClick={() => show('This is a local demo mailbox — no other apps to switch to.')}>
          <Grid3x3 />
        </IconButton>
        <button
          ref={accountRef}
          type="button"
          aria-label={`Account: ${data.account.name}`}
          onClick={() => setAccountOpen((v) => !v)}
          className="ml-1 rounded-full p-1 transition-colors hover:bg-surface-3"
        >
          <Avatar
            name={data.account.name}
            email={data.account.email}
            color={data.account.avatarColor}
            size={32}
          />
        </button>
      </div>

      <Menu
        anchorRef={settingsRef}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        align="end"
        ariaLabel="Quick settings"
        entries={[
          { type: 'header', id: 'h1', label: 'Density' },
          {
            id: 'd1',
            label: 'Default',
            checked: settings.density === 'default',
            onSelect: () => set('density', 'default'),
          },
          {
            id: 'd2',
            label: 'Comfortable',
            checked: settings.density === 'comfortable',
            onSelect: () => set('density', 'comfortable'),
          },
          {
            id: 'd3',
            label: 'Compact',
            checked: settings.density === 'compact',
            onSelect: () => set('density', 'compact'),
          },
          { type: 'separator', id: 's1' },
          {
            id: 'pane',
            label: settings.readingPane === 'right' ? 'Turn off reading pane' : 'Turn on reading pane',
            onSelect: () => set('readingPane', settings.readingPane === 'right' ? 'none' : 'right'),
          },
          {
            id: 'tabs',
            label: settings.showCategoryTabs ? 'Hide category tabs' : 'Show category tabs',
            onSelect: () => set('showCategoryTabs', !settings.showCategoryTabs),
          },
          { type: 'separator', id: 's2' },
          {
            id: 'all',
            label: 'See all settings',
            icon: <Settings />,
            onSelect: () => navigate({ view: route.view, settingsTab: 'general' }),
          },
          {
            id: 'keys',
            label: 'Keyboard shortcuts',
            icon: <Keyboard />,
            shortcut: '?',
            onSelect: onShowShortcuts,
          },
        ]}
      />

      <AccountMenu
        anchorRef={accountRef}
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onReset={() => {
          resetMailbox()
          navigate({ view: 'inbox' })
          show('Mailbox reset to the seeded state')
        }}
      />
    </header>
  )
}

function AccountMenu({
  anchorRef,
  open,
  onClose,
  onReset,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>
  open: boolean
  onClose: () => void
  onReset: () => void
}) {
  const { data } = useMail()
  const { account } = data
  const pct = Math.min(100, (account.usedBytes / account.quotaBytes) * 100)

  return (
    <Menu
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align="end"
      ariaLabel="Account"
      className="w-[min(21rem,94vw)] pt-0"
      entries={[
        {
          id: 'profile',
          label: (
            <span className="flex w-full flex-col items-center gap-2 py-4 text-center">
              <Avatar
                name={account.name}
                email={account.email}
                color={account.avatarColor}
                size={72}
              />
              <span className="mt-1 text-[15px] font-medium text-ink">{account.name}</span>
              <span className="text-[13px] text-ink-3">{account.email}</span>
              <span className="mt-1 w-full px-4">
                <span className="block h-1 w-full overflow-hidden rounded-full bg-line-soft">
                  <span
                    style={{ width: `${pct}%` }}
                    className="block h-full rounded-full bg-accent"
                  />
                </span>
                <span className="mt-1.5 block text-[11px] text-ink-4">
                  {formatBytes(account.usedBytes)} of {formatBytes(account.quotaBytes)} used
                </span>
              </span>
            </span>
          ),
          onSelect: () => {},
        },
        { type: 'separator', id: 's1' },
        {
          id: 'about',
          icon: <Info />,
          label: 'About this mailbox',
          onSelect: () => {
            window.alert(
              'A fully local, seeded mailbox. Everything you do — reading, starring, labelling, composing, scheduling — is stored in this browser only. No account, network, or API key involved.',
            )
          },
        },
        {
          id: 'reset',
          icon: <LogOut />,
          label: 'Reset mailbox to seeded data',
          danger: true,
          onSelect: onReset,
        },
      ]}
    />
  )
}

import { useApp } from '../lib/app'
import { ME } from '../lib/contacts'
import { useDispatch, useStore } from '../lib/store'
import { MailGlyph } from './Icon'
import { SearchBox } from './SearchBox'
import { Avatar, IconButton, MenuButton, MenuDivider, MenuItem } from './ui'

export function TopBar() {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const pct = Math.min(100, Math.round((ME.storageUsedGb / ME.storageTotalGb) * 100))
  const dark = state.settings.theme === 'dark' || (state.settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <header className="no-print flex h-16 flex-none items-center gap-1 px-2 sm:gap-3 sm:px-4">
      <IconButton
        icon="menu"
        tip="Main menu"
        onClick={() => {
          if (window.matchMedia('(min-width: 768px)').matches) app.toggleRail()
          else app.setSidebarOpen(true)
        }}
      />

      <a href="#/inbox" className="mr-1 flex shrink-0 items-center gap-1.5 rounded pr-2" aria-label="Cursor Grok 4.6">
        <MailGlyph size={36} />
        <span className="max-w-[42vw] truncate text-[18px] leading-none font-normal tracking-[-0.2px] text-ink-2 sm:max-w-none sm:text-[22px]">Cursor Grok 4.6</span>
      </a>

      <div className="mx-auto hidden min-w-0 max-w-[720px] flex-1 md:flex">
        <SearchBox />
      </div>

      <div className="ml-auto flex flex-none items-center gap-0.5 md:ml-0">
        <span className="md:hidden">
          <IconButton icon="search" tip="Search" onClick={() => app.setSearchOpen(true)} />
        </span>
        <span className="hidden sm:block">
          <IconButton icon="help" tip="Keyboard shortcuts" onClick={() => app.setDialog({ kind: 'shortcuts' })} />
        </span>
        <IconButton
          icon={dark ? 'lightMode' : 'darkMode'}
          tip={dark ? 'Light theme' : 'Dark theme'}
          onClick={() =>
            dispatch({
              t: 'settings',
              patch: { theme: state.settings.theme === 'dark' ? 'light' : 'dark' },
            })
          }
        />
        <IconButton icon="settings" tip="Settings" onClick={() => app.setDialog({ kind: 'settings' })} />
        <span className="hidden sm:block">
          <MenuButton icon="apps" tip="Apps" placement="bottom-end" width={280}>
            {() => (
              <div className="grid grid-cols-3 gap-1 p-2">
                {['Mail', 'Calendar', 'Contacts', 'Drive', 'Chat', 'Meet', 'Tasks', 'Keep', 'Sheets'].map((name) => (
                  <div key={name} className="flex flex-col items-center gap-1.5 rounded-lg p-3 text-[12px] text-ink-2">
                    <span className="grid size-10 place-items-center rounded-full bg-panel-alt text-[13px] font-medium">
                      {name[0]}
                    </span>
                    {name}
                  </div>
                ))}
              </div>
            )}
          </MenuButton>
        </span>
        <MenuButton
          tip="Account"
          placement="bottom-end"
          width={320}
          trigger={<Avatar name={ME.name} hue={ME.hue} size={40} />}
        >
          {(close) => (
            <div className="px-2 py-3">
              <div className="flex flex-col items-center gap-2 px-4 pb-3">
                <Avatar name={ME.name} hue={ME.hue} size={72} />
                <div className="text-center">
                  <div className="text-[16px] font-medium">{ME.name}</div>
                  <div className="text-[13px] text-ink-3">{ME.email}</div>
                </div>
              </div>
              <div className="mx-3 mb-2 rounded-xl bg-panel-alt px-3 py-2 text-[12px] text-ink-2">
                <div className="mb-1 flex justify-between">
                  <span>Storage</span>
                  <span>
                    {ME.storageUsedGb} GB of {ME.storageTotalGb} GB
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <MenuItem icon="settings" onClick={() => { close(); app.setDialog({ kind: 'settings' }) }}>
                Settings
              </MenuItem>
              <MenuItem icon="keyboard" onClick={() => { close(); app.setDialog({ kind: 'shortcuts' }) }}>
                Keyboard shortcuts
              </MenuItem>
              <MenuDivider />
              <MenuItem
                icon="refresh"
                onClick={() => {
                  close()
                  if (confirm('Reset mailbox to the seeded demo? This clears local changes.')) dispatch({ t: 'reset' })
                }}
              >
                Reset mailbox
              </MenuItem>
            </div>
          )}
        </MenuButton>
      </div>
    </header>
  )
}

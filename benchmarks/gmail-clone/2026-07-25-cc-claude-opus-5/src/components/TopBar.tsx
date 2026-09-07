import { useApp } from '../lib/app'
import { ME } from '../lib/contacts'
import { useDispatch, useStore } from '../lib/store'
import { AppGlyph } from './Icon'
import { SearchBox } from './SearchBox'
import { Avatar, Button, IconButton, MenuButton, MenuDivider, MenuItem, Tooltip } from './ui'

export function TopBar() {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const pct = Math.min(100, Math.round((ME.storageUsedGb / ME.storageTotalGb) * 100))

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

      <a
        href="#/inbox"
        className="mr-1 hidden shrink-0 items-center gap-1.5 rounded pr-2 sm:flex"
        aria-label="Opus 5 — go to Inbox"
      >
        <AppGlyph size={38} />
        <span className="text-[22px] leading-none font-normal tracking-[-0.2px] text-ink-2">
          Opus 5
        </span>
      </a>

      <div className="mx-auto flex min-w-0 max-w-[720px] flex-1">
        <SearchBox />
      </div>

      <div className="flex flex-none items-center gap-0.5">
        <span className="hidden sm:block">
          <IconButton
            icon="help"
            tip="Keyboard shortcuts"
            onClick={() => app.setDialog({ kind: 'shortcuts' })}
          />
        </span>
        <IconButton
          icon={state.settings.theme === 'dark' ? 'lightMode' : 'darkMode'}
          tip={state.settings.theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          onClick={() =>
            dispatch({
              t: 'settings',
              patch: { theme: state.settings.theme === 'dark' ? 'light' : 'dark' },
            })
          }
        />
        <IconButton
          icon="settings"
          tip="Settings"
          onClick={() => app.setDialog({ kind: 'settings' })}
        />
        <span className="hidden sm:block">
          <MenuButton icon="apps" tip="Google apps" placement="bottom-end" width={288}>
            {() => (
              <div className="grid grid-cols-3 gap-1 p-2">
                {[
                  ['Mail', 'mail'],
                  ['Calendar', 'calendar'],
                  ['Contacts', 'contacts'],
                  ['Drive', 'doc'],
                  ['Sheets', 'sheet'],
                  ['Slides', 'slide'],
                  ['Chat', 'forum'],
                  ['Meet', 'video'],
                  ['Tasks', 'checkCircle'],
                ].map(([name]) => (
                  <div
                    key={name}
                    className="flex cursor-default flex-col items-center gap-1.5 rounded-lg p-3 hover:bg-hov"
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-selected-soft text-[13px] font-medium text-accent">
                      {name[0]}
                    </span>
                    <span className="text-[11px] text-ink-2">{name}</span>
                  </div>
                ))}
              </div>
            )}
          </MenuButton>
        </span>

        <MenuButton
          icon="person"
          placement="bottom-end"
          width={320}
          render={({ toggle, ref }) => (
            <span ref={ref} className="contents">
              <Tooltip label={`${ME.name} (${ME.email})`}>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Account"
                  className="ml-1 rounded-full p-1 transition-colors hover:bg-hov"
                >
                  <Avatar name={ME.name} hue={ME.hue} size={32} />
                </button>
              </Tooltip>
            </span>
          )}
        >
          {(close) => (
            <div>
              <div className="flex flex-col items-center gap-2 px-6 pt-3 pb-4 text-center">
                <Avatar name={ME.name} hue={ME.hue} size={72} />
                <div>
                  <p className="text-[15px] font-medium text-ink">{ME.name}</p>
                  <p className="text-[13px] text-ink-3">{ME.email}</p>
                </div>
                <Button variant="outline" className="mt-1">
                  Manage your Account
                </Button>
              </div>
              <MenuDivider />
              <div className="px-4 py-2">
                <div className="mb-1.5 flex items-baseline justify-between text-[12px] text-ink-2">
                  <span>Storage</span>
                  <span className="text-ink-3">
                    {ME.storageUsedGb} GB of {ME.storageTotalGb} GB used
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <MenuDivider />
              <MenuItem
                icon="settings"
                onClick={() => {
                  close()
                  app.setDialog({ kind: 'settings' })
                }}
              >
                Settings
              </MenuItem>
              <MenuItem
                icon="keyboard"
                onClick={() => {
                  close()
                  app.setDialog({ kind: 'shortcuts' })
                }}
              >
                Keyboard shortcuts
              </MenuItem>
              <MenuItem
                icon="refresh"
                danger
                onClick={() => {
                  close()
                  if (confirm('Reset the mailbox to its seeded state? Local changes are lost.')) {
                    dispatch({ t: 'reset' })
                    app.navigate({ kind: 'inbox' })
                    app.toast('Mailbox reset to seeded data.')
                  }
                }}
              >
                Reset mailbox data
              </MenuItem>
            </div>
          )}
        </MenuButton>
      </div>
    </header>
  )
}

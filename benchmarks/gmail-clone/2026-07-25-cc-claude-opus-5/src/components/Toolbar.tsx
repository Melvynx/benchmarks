import { useApp } from '../lib/app'
import { isUnread, useStore } from '../lib/store'
import { SYS, type Thread } from '../lib/types'
import { useState } from 'react'
import { Icon } from './Icon'
import { LabelMenu, MoreMenu, MoveMenu, SnoozeMenu } from './Menus'
import { cx, IconButton, MenuButton, MenuItem, Popover, Tooltip } from './ui'

export function Toolbar() {
  const app = useApp()
  const state = useStore()
  const sel = app.selection
  const any = sel.length > 0
  const view = app.route.kind

  const [selOpen, setSelOpen] = useState(false)
  const [selAnchor, setSelAnchor] = useState<HTMLElement | null>(null)

  const allSelected = any && sel.length === app.threads.length
  const someSelected = any && !allSelected

  const inTrash = view === 'trash'
  const inSpam = view === 'spam'
  const anyUnread = state.threads.some((t) => sel.includes(t.id) && isUnread(state, t))

  const pick = (fn: (t: Thread) => boolean) =>
    app.setSelection(app.threads.filter(fn).map((t) => t.id))

  const total = app.total
  const start = total ? app.page * app.pageSize + 1 : 0
  const end = Math.min(total, app.page * app.pageSize + app.threads.length)

  return (
    <div className="no-print flex h-12 flex-none items-center gap-0.5 px-1 sm:gap-1 sm:px-2">
      <div ref={setSelAnchor} className="flex items-center">
        <Tooltip label={allSelected ? 'Deselect all' : 'Select all'}>
          <button
            type="button"
            aria-label={allSelected ? 'Deselect all conversations' : 'Select all conversations'}
            aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
            role="checkbox"
            onClick={() => (any ? app.clearSelection() : pick(() => true))}
            className="ml-1 grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-hov"
          >
            <Icon
              name={
                allSelected
                  ? 'checkboxChecked'
                  : someSelected
                    ? 'checkboxIndeterminate'
                    : 'checkboxBlank'
              }
              size={20}
              className={any ? 'text-accent' : undefined}
            />
          </button>
        </Tooltip>
        <button
          type="button"
          aria-label="Selection options"
          aria-haspopup="menu"
          aria-expanded={selOpen}
          onClick={() => setSelOpen((v) => !v)}
          className="-ml-1 grid size-6 place-items-center rounded-full text-ink-3 transition-colors hover:bg-hov"
        >
          <Icon name="arrowDropDown" size={18} />
        </button>
        <Popover
          open={selOpen}
          anchor={selAnchor}
          onClose={() => setSelOpen(false)}
          placement="bottom-start"
          width={180}
        >
          <MenuItem onClick={() => (setSelOpen(false), pick(() => true))}>All</MenuItem>
          <MenuItem onClick={() => (setSelOpen(false), app.clearSelection())}>None</MenuItem>
          <MenuItem onClick={() => (setSelOpen(false), pick((t) => isUnread(state, t)))}>
            Unread
          </MenuItem>
          <MenuItem onClick={() => (setSelOpen(false), pick((t) => !isUnread(state, t)))}>
            Read
          </MenuItem>
          <MenuItem onClick={() => (setSelOpen(false), pick((t) => t.labels.includes(SYS.STARRED)))}>
            Starred
          </MenuItem>
          <MenuItem
            onClick={() => (setSelOpen(false), pick((t) => !t.labels.includes(SYS.STARRED)))}
          >
            Unstarred
          </MenuItem>
        </Popover>
      </div>

      {any ? (
        <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
          {!inTrash && !inSpam && (
            <IconButton icon="archive" tip="Archive" onClick={() => app.archive(sel)} />
          )}
          {!inSpam ? (
            <IconButton icon="spam" tip="Report spam" onClick={() => app.markSpam(sel, true)} />
          ) : (
            <IconButton icon="checkCircle" tip="Not spam" onClick={() => app.markSpam(sel, false)} />
          )}
          {inTrash ? (
            <IconButton
              icon="deleteForever"
              tip="Delete forever"
              onClick={() => app.deleteForever(sel)}
            />
          ) : (
            <IconButton icon="trash" tip="Delete" onClick={() => app.trash(sel)} />
          )}
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
          <span className="hidden sm:contents">
            <IconButton
              icon={anyUnread ? 'mailOpen' : 'mail'}
              tip={anyUnread ? 'Mark as read' : 'Mark as unread'}
              onClick={() => app.setRead(sel, anyUnread)}
            />
            <MenuButton icon="clock" tip="Snooze" width={280}>
              {(close) => <SnoozeMenu ids={sel} close={close} />}
            </MenuButton>
            <MenuButton icon="label" tip="Labels" width={280}>
              {(close) => <LabelMenu ids={sel} close={close} />}
            </MenuButton>
            <MenuButton icon="moveTo" tip="Move to" width={280}>
              {(close) => <MoveMenu ids={sel} close={close} />}
            </MenuButton>
          </span>
          <MenuButton icon="moreVert" tip="More" width={260}>
            {(close) => <MoreMenu ids={sel} close={close} />}
          </MenuButton>
          <span className="ml-2 truncate text-[13px] text-ink-2">
            {sel.length} selected
          </span>
        </div>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-0.5 sm:gap-1">
          <IconButton
            icon="refresh"
            tip="Refresh"
            onClick={app.refresh}
            className={app.refreshing ? 'anim-spin' : undefined}
          />
          <MenuButton icon="moreVert" tip="More options" width={240}>
            {(close) => (
              <>
                <MenuItem
                  icon="mailOpen"
                  onClick={() => {
                    close()
                    app.setRead(
                      app.threads.filter((t) => isUnread(state, t)).map((t) => t.id),
                      true,
                    )
                  }}
                >
                  Mark all as read
                </MenuItem>
                <MenuItem
                  icon="settings"
                  onClick={() => {
                    close()
                    app.setDialog({ kind: 'settings' })
                  }}
                >
                  Display settings
                </MenuItem>
                {view === 'trash' && (
                  <MenuItem
                    icon="deleteForever"
                    danger
                    onClick={() => {
                      close()
                      app.deleteForever(app.threads.map((t) => t.id))
                    }}
                  >
                    Empty Trash now
                  </MenuItem>
                )}
                {view === 'spam' && (
                  <MenuItem
                    icon="deleteForever"
                    danger
                    onClick={() => {
                      close()
                      app.deleteForever(app.threads.map((t) => t.id))
                    }}
                  >
                    Delete all spam now
                  </MenuItem>
                )}
              </>
            )}
          </MenuButton>
        </div>
      )}

      <div className="flex flex-none items-center gap-1 pl-1">
        <span
          className={cx(
            'hidden text-[12px] tabular-nums text-ink-2 sm:block',
            !total && 'opacity-0',
          )}
        >
          {start}–{end} of {total}
        </span>
        <IconButton
          icon="chevronLeft"
          tip="Newer"
          disabled={app.page === 0}
          onClick={() => app.setPage(app.page - 1)}
        />
        <IconButton
          icon="chevronRight"
          tip="Older"
          disabled={app.page >= app.pageCount - 1}
          onClick={() => app.setPage(app.page + 1)}
        />
      </div>
    </div>
  )
}

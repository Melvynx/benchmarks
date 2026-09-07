import { useApp } from '../lib/app'
import { unreadCount } from '../lib/search'
import { useDispatch, useIndex, useStore } from '../lib/store'
import { PAGE_SIZE, type Category } from '../lib/types'
import { Icon } from './Icon'
import { IconButton, MenuButton, MenuItem, cx } from './ui'

const CATS: { id: Category; label: string; icon: 'mail' | 'people' | 'campaign' | 'localOffer' | 'forum' }[] = [
  { id: 'primary', label: 'Primary', icon: 'mail' },
  { id: 'social', label: 'Social', icon: 'people' },
  { id: 'promotions', label: 'Promotions', icon: 'campaign' },
  { id: 'updates', label: 'Updates', icon: 'localOffer' },
  { id: 'forums', label: 'Forums', icon: 'forum' },
]

export function Toolbar() {
  const app = useApp()
  const store = useStore()
  const dispatch = useDispatch()
  const selected = store.selectedIds
  const ids = selected.length ? selected : app.route.threadId ? [app.route.threadId] : []
  const inTrash = app.route.kind === 'trash'
  const inSpam = app.route.kind === 'spam'
  const start = app.route.page * PAGE_SIZE
  const end = Math.min(app.total, start + PAGE_SIZE)
  const allVisibleSelected =
    app.visibleThreads.length > 0 && app.visibleThreads.every((t) => selected.includes(t.id))

  const toggleAll = () => {
    dispatch({ t: 'select', ids: allVisibleSelected ? [] : app.visibleThreads.map((t) => t.id) })
  }

  return (
    <div className="flex h-12 flex-none items-center gap-0.5 px-1 sm:px-2">
      <IconButton
        icon={allVisibleSelected ? 'checkboxOn' : selected.length ? 'checkboxMinus' : 'checkbox'}
        tip="Select"
        onClick={toggleAll}
      />
      {ids.length === 0 ? (
        <>
          <IconButton
            icon="refresh"
            tip="Refresh"
            onClick={() => {
              /* local mailbox; keep the control live */
              dispatch({ t: 'tick', now: Date.now() })
            }}
          />
          <MenuButton tip="More">
            {(close) => (
              <>
                <MenuItem icon="doneAll" onClick={() => { dispatch({ t: 'markRead', ids: app.visibleThreads.map((t) => t.id), unread: false }); close() }}>
                  Mark all as read
                </MenuItem>
                <MenuItem icon="settings" onClick={() => { app.setDialog({ kind: 'settings' }); close() }}>
                  Settings
                </MenuItem>
              </>
            )}
          </MenuButton>
        </>
      ) : (
        <>
          {!inTrash && !inSpam && (
            <IconButton icon="archive" tip="Archive" onClick={() => dispatch({ t: 'archive', ids })} />
          )}
          {inSpam ? (
            <IconButton icon="inbox" tip="Not spam" onClick={() => dispatch({ t: 'notSpam', ids })} />
          ) : (
            <IconButton icon="spam" tip="Report spam" onClick={() => dispatch({ t: 'spam', ids })} />
          )}
          {inTrash ? (
            <>
              <IconButton icon="restore" tip="Move to Inbox" onClick={() => dispatch({ t: 'restore', ids })} />
              <IconButton icon="trash" tip="Delete forever" onClick={() => dispatch({ t: 'deleteForever', ids })} />
            </>
          ) : (
            <IconButton icon="trash" tip="Delete" onClick={() => dispatch({ t: 'trash', ids })} />
          )}
          <IconButton icon="markunread" tip="Mark as unread" onClick={() => dispatch({ t: 'markRead', ids, unread: true })} />
          <IconButton icon="snooze" tip="Snooze" onClick={() => app.setDialog({ kind: 'snooze', ids })} />
          <MenuButton tip="Labels" icon="label">
            {(close) => (
              <>
                {store.labels.map((l) => {
                  const on = ids.every((id) => store.threads.find((t) => t.id === id)?.labels.includes(l.id))
                  return (
                    <MenuItem
                      key={l.id}
                      onClick={() => {
                        dispatch({ t: 'label', ids, labelId: l.id, add: !on })
                        close()
                      }}
                    >
                      <span className="mr-2 inline-block size-2.5 rounded-sm" style={{ background: l.color }} />
                      {on ? 'Remove ' : 'Add '}
                      {l.name}
                    </MenuItem>
                  )
                })}
                <MenuItem
                  icon="add"
                  onClick={() => {
                    app.setDialog({ kind: 'newLabel', ids })
                    close()
                  }}
                >
                  Create new
                </MenuItem>
              </>
            )}
          </MenuButton>
          <MenuButton tip="More">
            {(close) => (
              <>
                <MenuItem icon="markunread" onClick={() => { dispatch({ t: 'markRead', ids, unread: false }); close() }}>
                  Mark as read
                </MenuItem>
                <MenuItem icon="star" onClick={() => { dispatch({ t: 'star', ids, starred: true }); close() }}>
                  Add star
                </MenuItem>
                <MenuItem icon="important" onClick={() => { dispatch({ t: 'important', ids, important: true }); close() }}>
                  Mark as important
                </MenuItem>
                <MenuItem icon="inbox" onClick={() => { dispatch({ t: 'moveInbox', ids }); close() }}>
                  Move to Inbox
                </MenuItem>
              </>
            )}
          </MenuButton>
        </>
      )}

      <div className="ml-auto flex items-center gap-1 pr-1 text-[12px] text-ink-3">
        <span className="hidden tabular-nums sm:inline">
          {app.total === 0 ? '0' : `${start + 1}–${end}`} of {app.total}
        </span>
        <IconButton
          icon="chevronLeft"
          tip="Newer"
          disabled={app.route.page <= 0}
          onClick={() => app.navigate({ ...app.route, page: app.route.page - 1 })}
        />
        <IconButton
          icon="chevronRight"
          tip="Older"
          disabled={end >= app.total}
          onClick={() => app.navigate({ ...app.route, page: app.route.page + 1 })}
        />
      </div>
    </div>
  )
}

export function CategoryTabs() {
  const app = useApp()
  const index = useIndex()
  const cat = app.route.category ?? 'primary'
  return (
    <div className="flex flex-none overflow-x-auto border-b border-line">
      {CATS.map((c) => {
        const active = cat === c.id
        const n = unreadCount(index, 'inbox', undefined, c.id)
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => app.navigate({ kind: 'inbox', category: c.id === 'primary' ? undefined : c.id })}
            className={cx(
              'flex h-14 min-w-[120px] flex-1 items-center justify-center gap-2 px-3 text-[14px] font-medium',
              active ? 'border-b-4 border-accent text-accent' : 'text-ink-3 hover:bg-hov',
            )}
          >
            <Icon name={c.icon} size={20} />
            <span className="hidden sm:inline">{c.label}</span>
            {n > 0 && <span className="text-[12px] tabular-nums">{n}</span>}
          </button>
        )
      })}
    </div>
  )
}

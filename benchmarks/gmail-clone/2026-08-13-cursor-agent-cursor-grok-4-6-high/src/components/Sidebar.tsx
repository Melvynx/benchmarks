import { useApp } from '../lib/app'
import { unreadCount } from '../lib/search'
import { useIndex, useStore } from '../lib/store'
import type { ViewKind } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { cx } from './ui'

const NAV: { kind: ViewKind; icon: IconName; label: string }[] = [
  { kind: 'inbox', icon: 'inbox', label: 'Inbox' },
  { kind: 'starred', icon: 'star', label: 'Starred' },
  { kind: 'snoozed', icon: 'snooze', label: 'Snoozed' },
  { kind: 'important', icon: 'important', label: 'Important' },
  { kind: 'sent', icon: 'send', label: 'Sent' },
  { kind: 'scheduled', icon: 'schedule', label: 'Scheduled' },
  { kind: 'drafts', icon: 'draft', label: 'Drafts' },
  { kind: 'all', icon: 'allMail', label: 'All Mail' },
  { kind: 'spam', icon: 'spam', label: 'Spam' },
  { kind: 'trash', icon: 'trash', label: 'Trash' },
]

export function Sidebar() {
  const app = useApp()
  const store = useStore()
  const index = useIndex()
  const collapsed = app.railCollapsed

  return (
    <nav
      className={cx('flex h-full flex-col pt-2', collapsed ? 'w-[72px]' : 'w-[256px]')}
      aria-label="Mailboxes"
    >
      <div className={cx('px-2 pb-3', collapsed && 'px-1')}>
        <button
          type="button"
          onClick={() => app.openCompose()}
          className={cx(
            'flex items-center gap-3 rounded-2xl bg-compose text-compose-ink shadow-e1 transition-shadow hover:shadow-e2',
            collapsed ? 'mx-auto size-14 justify-center' : 'h-14 w-auto px-6',
          )}
        >
          <Icon name="edit" size={24} />
          {!collapsed && <span className="text-[14px] font-medium">Compose</span>}
        </button>
      </div>

      <div className="scrollbar-thin flex-1 overflow-auto pb-6">
        {NAV.map((item) => {
          const active = app.route.kind === item.kind && !app.route.threadId
          const count =
            item.kind === 'drafts'
              ? app.drafts
              : item.kind === 'inbox'
                ? unreadCount(index, 'inbox')
                : unreadCount(index, item.kind)
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => app.navigate({ kind: item.kind })}
              className={cx(
                'flex h-8 w-full items-center gap-4 pr-3 text-[14px] transition-colors',
                collapsed ? 'justify-center px-0' : 'rounded-r-full pl-6',
                active ? 'bg-selected font-bold text-ink' : 'font-medium text-ink-2 hover:bg-hov',
                count > 0 && item.kind === 'inbox' && !active && 'font-bold text-ink',
              )}
            >
              <Icon name={item.icon} size={20} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {count > 0 && <span className="text-[12px] tabular-nums">{count}</span>}
                </>
              )}
            </button>
          )
        })}

        {!collapsed && (
          <>
            <div className="mt-3 mb-1 flex items-center justify-between px-6 text-[14px] font-medium text-ink-2">
              Labels
              <button
                type="button"
                className="grid size-7 place-items-center rounded-full hover:bg-hov"
                aria-label="Create label"
                onClick={() => app.setDialog({ kind: 'labels' })}
              >
                <Icon name="add" size={18} />
              </button>
            </div>
            {store.labels.filter((l) => l.visible).map((l) => {
              const active = app.route.kind === 'label' && app.route.labelId === l.id
              const count = unreadCount(index, 'label', l.id)
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => app.navigate({ kind: 'label', labelId: l.id })}
                  className={cx(
                    'flex h-8 w-full items-center gap-4 rounded-r-full pr-3 pl-6 text-[14px]',
                    active ? 'bg-selected font-bold' : 'text-ink-2 hover:bg-hov',
                  )}
                >
                  <span className="size-3.5 rounded-sm" style={{ background: l.color }} />
                  <span className="flex-1 truncate text-left">{l.name}</span>
                  {count > 0 && <span className="text-[12px] tabular-nums">{count}</span>}
                </button>
              )
            })}
          </>
        )}
      </div>
    </nav>
  )
}

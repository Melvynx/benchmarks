import { useState } from 'react'
import { useApp } from '../lib/app'
import { ME } from '../lib/contacts'
import { formatHash } from '../lib/router'
import { selectCounts, useStore } from '../lib/store'
import type { ViewKind } from '../lib/types'
import { Icon, type IconName } from './Icon'
import { cx, IconButton, MenuButton, MenuItem, Tooltip } from './ui'

interface NavDef {
  kind: ViewKind
  icon: IconName
  activeIcon?: IconName
  title: string
  count?: number
  /** Renders count as plain text (drafts) rather than bold unread. */
  quiet?: boolean
  more?: boolean
}

export function Sidebar() {
  const app = useApp()
  const state = useStore()
  const counts = selectCounts(state)
  const [showMore, setShowMore] = useState(false)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const nav: NavDef[] = [
    { kind: 'inbox', icon: 'inbox', title: 'Inbox', count: counts.inbox },
    { kind: 'starred', icon: 'starOutline', activeIcon: 'star', title: 'Starred', count: counts.starred },
    { kind: 'snoozed', icon: 'clock', title: 'Snoozed', count: counts.snoozed, quiet: true },
    { kind: 'sent', icon: 'send', title: 'Sent' },
    { kind: 'drafts', icon: 'mailOpen', title: 'Drafts', count: counts.drafts, quiet: true },
    { kind: 'important', icon: 'important', title: 'Important', count: counts.important, more: true },
    { kind: 'scheduled', icon: 'scheduleSend', title: 'Scheduled', count: counts.scheduled, quiet: true, more: true },
    { kind: 'all', icon: 'allMail', title: 'All Mail', more: true },
    { kind: 'spam', icon: 'spam', title: 'Spam', count: counts.spam, quiet: true, more: true },
    { kind: 'trash', icon: 'trash', title: 'Trash', more: true },
  ]

  const collapsed = app.railCollapsed
  const visible = nav.filter((n) => !n.more || showMore || collapsed)

  const drop = (e: React.DragEvent, apply: (ids: string[]) => void) => {
    e.preventDefault()
    setDragOver(null)
    const raw = e.dataTransfer.getData('text/thread-ids')
    if (!raw) return
    const ids = JSON.parse(raw) as string[]
    if (ids.length) apply(ids)
  }

  const dragProps = (key: string, apply: (ids: string[]) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes('text/thread-ids')) {
        e.preventDefault()
        setDragOver(key)
      }
    },
    onDragLeave: () => setDragOver((k) => (k === key ? null : k)),
    onDrop: (e: React.DragEvent) => drop(e, apply),
    'data-drop': dragOver === key ? 'on' : undefined,
  })

  return (
    <nav
      className={cx(
        'no-print flex h-full flex-col pb-3 transition-[width]',
        collapsed ? 'w-[72px]' : 'w-[256px]',
      )}
      aria-label="Mailboxes"
    >
      <div className={cx('px-2 pb-3', collapsed && 'flex justify-center px-2')}>
        <Tooltip label={collapsed ? 'Compose' : undefined}>
          <button
            type="button"
            onClick={() => {
              app.openCompose()
              app.setSidebarOpen(false)
            }}
            className={cx(
              'flex h-14 items-center gap-3 rounded-2xl bg-compose text-on-compose shadow-e1 transition-all hover:shadow-e2',
              collapsed ? 'w-14 justify-center' : 'w-auto pr-6 pl-4',
            )}
          >
            <Icon name="edit" size={22} />
            {!collapsed && <span className="text-[14px] font-medium">Compose</span>}
          </button>
        </Tooltip>
      </div>

      <div className="scroll-quiet min-h-0 flex-1 overflow-y-auto pr-2">
        <ul>
          {visible.map((n) => {
            const active = app.route.kind === n.kind
            const href = formatHash({ kind: n.kind })
            return (
              <li key={n.kind}>
                <a
                  href={href}
                  onClick={() => app.setSidebarOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  {...dragProps(`nav-${n.kind}`, (ids) => {
                    if (n.kind === 'trash') app.trash(ids)
                    else if (n.kind === 'spam') app.markSpam(ids, true)
                    else if (n.kind === 'starred') app.setStar(ids, true)
                    else if (n.kind === 'inbox') app.restore(ids)
                  })}
                  className={cx(
                    'group relative flex h-8 items-center gap-4 rounded-r-full pr-3 text-[14px] transition-colors',
                    collapsed ? 'mx-2 h-14 flex-col justify-center gap-1 rounded-2xl px-0 pr-0' : 'pl-6',
                    active
                      ? 'bg-selected-soft font-medium text-ink'
                      : 'text-ink-2 hover:bg-hov',
                    dragOver === `nav-${n.kind}` && 'ring-2 ring-accent ring-inset',
                  )}
                >
                  <Tooltip label={collapsed ? n.title : undefined} side="top">
                    <Icon
                      name={active && n.activeIcon ? n.activeIcon : n.icon}
                      size={20}
                      className={cx(
                        n.kind === 'starred' && active && 'text-star',
                        n.kind === 'important' && active && 'text-important',
                      )}
                    />
                  </Tooltip>
                  {collapsed ? (
                    <span className="text-[11px] leading-none">
                      {n.count ? (n.count > 99 ? '99+' : n.count) : ''}
                    </span>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate">{n.title}</span>
                      {!!n.count && (
                        <span
                          className={cx(
                            'text-[12px] tabular-nums',
                            n.quiet ? 'text-ink-3' : 'font-medium text-ink',
                          )}
                        >
                          {n.count > 999 ? '999+' : n.count}
                        </span>
                      )}
                    </>
                  )}
                </a>
              </li>
            )
          })}

          {!collapsed && (
            <li>
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="flex h-8 w-full items-center gap-4 rounded-r-full pr-3 pl-6 text-[14px] text-ink-2 transition-colors hover:bg-hov"
              >
                <Icon name={showMore ? 'expandLess' : 'expandMore'} size={20} />
                <span>{showMore ? 'Less' : 'More'}</span>
              </button>
            </li>
          )}
        </ul>

        {!collapsed && (
          <>
            <div className="mt-3 flex items-center justify-between border-t border-line pt-3 pr-2 pl-6">
              <span className="text-[14px] text-ink-2">Labels</span>
              <IconButton
                icon="add"
                tip="Create new label"
                size={18}
                padding="p-1.5"
                onClick={() => app.setDialog({ kind: 'newLabel' })}
              />
            </div>
            <ul>
              {state.labels
                .filter((l) => l.visible)
                .map((l) => {
                  const active = app.route.kind === 'label' && app.route.labelId === l.id
                  const count = counts.byLabel[l.id] ?? 0
                  return (
                    <li key={l.id}>
                      <a
                        href={formatHash({ kind: 'label', labelId: l.id })}
                        onClick={() => app.setSidebarOpen(false)}
                        aria-current={active ? 'page' : undefined}
                        {...dragProps(`lbl-${l.id}`, (ids) => app.applyLabel(ids, l.id, true))}
                        className={cx(
                          'group flex h-8 items-center gap-4 rounded-r-full pr-1 pl-6 text-[14px] transition-colors',
                          active ? 'bg-selected-soft font-medium text-ink' : 'text-ink-2 hover:bg-hov',
                          dragOver === `lbl-${l.id}` && 'ring-2 ring-accent ring-inset',
                        )}
                      >
                        <Icon name="label" size={20} style={{ color: l.color }} />
                        <span className="min-w-0 flex-1 truncate">{l.name}</span>
                        {!!count && (
                          <span className="text-[12px] font-medium tabular-nums text-ink group-hover:hidden">
                            {count}
                          </span>
                        )}
                        <span
                          className="hidden group-hover:block"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                        >
                          <MenuButton icon="moreVert" tip="Label options" size={16} padding="p-1.5" width={220}>
                            {(close) => (
                              <>
                                <MenuItem
                                  icon="edit"
                                  onClick={() => {
                                    close()
                                    app.setDialog({ kind: 'editLabel', labelId: l.id })
                                  }}
                                >
                                  Edit
                                </MenuItem>
                                <MenuItem
                                  icon="visibilityOff"
                                  onClick={() => {
                                    close()
                                    app.setDialog({ kind: 'editLabel', labelId: l.id })
                                  }}
                                >
                                  Hide in list
                                </MenuItem>
                              </>
                            )}
                          </MenuButton>
                        </span>
                      </a>
                    </li>
                  )
                })}
            </ul>
          </>
        )}

        {collapsed && (
          <div className="mt-2 flex flex-col items-center gap-1 border-t border-line pt-2">
            {state.labels
              .filter((l) => l.visible)
              .slice(0, 6)
              .map((l) => (
                <Tooltip key={l.id} label={l.name} side="top">
                  <a
                    href={formatHash({ kind: 'label', labelId: l.id })}
                    {...dragProps(`lbl-${l.id}`, (ids) => app.applyLabel(ids, l.id, true))}
                    className={cx(
                      'grid size-10 place-items-center rounded-full hover:bg-hov',
                      app.route.labelId === l.id && 'bg-selected-soft',
                      dragOver === `lbl-${l.id}` && 'ring-2 ring-accent',
                    )}
                  >
                    <Icon name="label" size={20} style={{ color: l.color }} />
                  </a>
                </Tooltip>
              ))}
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="mt-2 px-6 pt-2 text-[11px] leading-4 text-ink-3">
          <div className="mb-1.5 h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(ME.storageUsedGb / ME.storageTotalGb) * 100}%` }}
            />
          </div>
          {ME.storageUsedGb} GB of {ME.storageTotalGb} GB used
        </div>
      )}
    </nav>
  )
}

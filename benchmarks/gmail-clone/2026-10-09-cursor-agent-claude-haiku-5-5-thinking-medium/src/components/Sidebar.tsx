import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Archive, CalendarClock, Clock, FileText, OctagonAlert, Pencil, Plus, Send, Star, Tag, Trash2, Inbox } from 'lucide-react'
import { useStore } from '../lib/store'
import { useMailActions } from '../lib/actions'
import { matchesFolder } from '../lib/mail'
import type { FolderId } from '../types'
import { cx } from './ui'

interface NavItem {
  id: FolderId
  label: string
  icon: ReactNode
  count?: number
  strong?: boolean
}

export function Sidebar() {
  const { state, dispatch } = useStore()
  const { data, ui } = state
  const actions = useMailActions()
  const [newLabel, setNewLabel] = useState<string | null>(null)

  const counts = useMemo(() => {
    const msgs = Object.values(data.messages)
    const unreadInbox = msgs.filter((m) => matchesFolder(m, 'inbox', ui.now) && !m.read).length
    return {
      inbox: unreadInbox,
      drafts: msgs.filter((m) => m.folder === 'drafts').length,
      scheduled: msgs.filter((m) => m.folder === 'scheduled').length,
      snoozed: msgs.filter((m) => matchesFolder(m, 'snoozed', ui.now)).length,
      spam: msgs.filter((m) => m.folder === 'spam' && !m.read).length,
    }
  }, [data.messages, ui.now])

  const items: NavItem[] = [
    { id: 'inbox', label: 'Inbox', icon: <Inbox size={18} />, count: counts.inbox, strong: true },
    { id: 'starred', label: 'Starred', icon: <Star size={18} /> },
    { id: 'snoozed', label: 'Snoozed', icon: <Clock size={18} />, count: counts.snoozed },
    { id: 'sent', label: 'Sent', icon: <Send size={18} /> },
    { id: 'drafts', label: 'Drafts', icon: <FileText size={18} />, count: counts.drafts },
    { id: 'scheduled', label: 'Scheduled', icon: <CalendarClock size={18} />, count: counts.scheduled },
    { id: 'all', label: 'All Mail', icon: <Archive size={18} /> },
    { id: 'spam', label: 'Spam', icon: <OctagonAlert size={18} />, count: counts.spam },
    { id: 'trash', label: 'Trash', icon: <Trash2 size={18} /> },
  ]

  const go = (folder: FolderId) => dispatch({ type: 'setFolder', folder })

  const submitLabel = (e: FormEvent) => {
    e.preventDefault()
    if (newLabel?.trim()) actions.createLabel(newLabel, [])
    setNewLabel(null)
    if (newLabel?.trim()) go(`label:${newLabel.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`)
  }

  return (
    <nav className="flex h-full flex-col overflow-y-auto pb-4 pr-2 text-[14px]" aria-label="Mailboxes">
      <div className="px-2 pb-3 pt-2">
        <button
          type="button"
          onClick={() => actions.openCompose('new')}
          className="flex h-14 items-center gap-3 rounded-2xl bg-accent-soft px-5 text-[14px] font-medium text-ink shadow-sm transition hover:shadow-md active:scale-[0.98] dark:text-[var(--accent)]"
          style={{ background: 'var(--accent-soft)' }}
        >
          <Pencil size={20} />
          Compose
          <kbd className="ml-auto font-sans text-[11px] opacity-60">C</kbd>
        </button>
      </div>

      <ul className="space-y-0.5 pl-1">
        {items.map((item) => {
          const active = ui.folder === item.id && !ui.query
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => go(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'flex h-8 w-full items-center gap-4 rounded-r-full pl-3 pr-3 text-left transition-colors',
                  active ? 'bg-selected font-semibold text-accent' : 'text-ink-2 hover:bg-hover',
                  !active && item.strong && item.count ? 'font-semibold text-ink' : '',
                )}
              >
                <span className="flex w-5 justify-center">{item.icon}</span>
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.count && <span className={cx('text-xs', active ? 'font-semibold' : 'text-ink-3')}>{item.count}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between px-4 pb-1 text-[11px] font-medium uppercase tracking-wider text-ink-3">
        <span>Labels</span>
        <button type="button" title="Create label" aria-label="Create label" onClick={() => setNewLabel('')} className="rounded-full p-1 text-ink-3 hover:bg-hover hover:text-ink">
          <Plus size={14} />
        </button>
      </div>
      <ul className="space-y-0.5 pl-1">
        {data.labels.map((label) => {
          const id: FolderId = `label:${label.id}`
          const active = ui.folder === id && !ui.query
          const count = Object.values(data.messages).filter((m) => matchesFolder(m, id, ui.now)).length
          return (
            <li key={label.id}>
              <button
                type="button"
                onClick={() => go(id)}
                className={cx(
                  'flex h-8 w-full items-center gap-4 rounded-r-full pl-3 pr-3 text-left transition-colors',
                  active ? 'bg-selected font-semibold text-accent' : 'text-ink-2 hover:bg-hover',
                )}
              >
                <span className="flex w-5 justify-center">
                  <Tag size={16} color={label.color} fill={label.color} fillOpacity={0.25} />
                </span>
                <span className="flex-1 truncate">{label.name}</span>
                {count > 0 && <span className="text-xs text-ink-3">{count}</span>}
              </button>
            </li>
          )
        })}
        {newLabel !== null && (
          <li className="pr-3 pt-1">
            <form onSubmit={submitLabel} className="pl-3">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onBlur={() => setNewLabel(null)}
                onKeyDown={(e) => e.key === 'Escape' && setNewLabel(null)}
                placeholder="Label name"
                className="h-8 w-full rounded-md border border-line bg-surface px-2 text-[13px] outline-none focus:border-accent"
              />
            </form>
          </li>
        )}
      </ul>
    </nav>
  )
}

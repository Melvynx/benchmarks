import { useState } from 'react'
import {
  Inbox,
  Star,
  Clock,
  SendHorizontal,
  File,
  ChevronDown,
  ChevronUp,
  Plus,
  Tag,
  CalendarClock,
  Mails,
  OctagonAlert,
  Trash2,
  Pencil,
  MoreVertical,
  Bookmark,
} from 'lucide-react'
import type { FolderId, View } from '../types'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { useCounts } from '../hooks'
import { goView } from '../lib/router'
import { cx, Dropdown, MenuDivider, MenuItem, MenuLabel } from './ui'

const PRIMARY: { id: FolderId; icon: typeof Inbox; label: string }[] = [
  { id: 'inbox', icon: Inbox, label: 'Inbox' },
  { id: 'starred', icon: Star, label: 'Starred' },
  { id: 'snoozed', icon: Clock, label: 'Snoozed' },
  { id: 'sent', icon: SendHorizontal, label: 'Sent' },
  { id: 'drafts', icon: File, label: 'Drafts' },
]
const MORE: { id: FolderId; icon: typeof Inbox; label: string }[] = [
  { id: 'important', icon: Bookmark, label: 'Important' },
  { id: 'scheduled', icon: CalendarClock, label: 'Scheduled' },
  { id: 'all', icon: Mails, label: 'All Mail' },
  { id: 'spam', icon: OctagonAlert, label: 'Spam' },
  { id: 'trash', icon: Trash2, label: 'Trash' },
]

export const LABEL_SWATCHES = ['#4285f4', '#16a765', '#e8710a', '#a142f4', '#12b5cb', '#f6bf26', '#e66550', '#f691b2', '#8e8e8e', '#0b8043', '#3c78d8', '#b99aff']

export function Sidebar({ view, collapsed, mobile }: { view: View; collapsed: boolean; mobile: boolean }) {
  const counts = useCounts()
  const labels = useMail((s) => s.labels)
  const updateLabel = useMail((s) => s.updateLabel)
  const deleteLabel = useMail((s) => s.deleteLabel)
  const openCompose = useUI((s) => s.openCompose)
  const setDrawer = useUI((s) => s.setDrawer)
  const setOverlay = useUI((s) => s.setOverlay)
  const setLabelEdit = useUI((s) => s.setLabelEdit)
  const [showMore, setShowMore] = useState(false)
  const rail = collapsed && !mobile

  const go = (v: View) => {
    useUI.getState().clearSelection()
    useUI.getState().setFocusIndex(0)
    goView(v)
    if (mobile) setDrawer(false)
  }
  const isActive = (f: FolderId) => view.kind === 'folder' && view.folder === f
  const moreActive = MORE.some((m) => isActive(m.id))
  const countFor = (f: FolderId) =>
    f === 'inbox' ? counts.inbox : f === 'drafts' ? counts.drafts : f === 'spam' ? counts.spam : f === 'scheduled' ? counts.scheduled : f === 'snoozed' ? 0 : 0
  const boldCount = (f: FolderId) => f === 'inbox' || f === 'spam'

  const item = (f: { id: FolderId; icon: typeof Inbox; label: string }) => {
    const active = isActive(f.id)
    const n = countFor(f.id)
    const Icon = f.icon
    return (
      <button
        key={f.id}
        type="button"
        onClick={() => go({ kind: 'folder', folder: f.id })}
        data-tip={rail ? f.label : undefined}
        className={cx(
          'group relative flex h-8 w-full items-center rounded-full text-[14px] transition-colors',
          rail ? 'mx-auto w-14 justify-center' : 'gap-4 pl-[26px] pr-3',
          active ? 'bg-active font-semibold text-ink' : 'text-ink hover:bg-hover',
          n > 0 && boldCount(f.id) && !active && 'font-semibold',
        )}
      >
        <Icon size={19} strokeWidth={active ? 2.4 : 1.8} className={cx(f.id === 'starred' && active && 'fill-current')} />
        {!rail && <span className="flex-1 truncate text-left">{f.label}</span>}
        {!rail && n > 0 && <span className={cx('text-xs', boldCount(f.id) ? 'font-bold' : 'text-muted')}>{n}</span>}
        {rail && n > 0 && f.id === 'inbox' && (
          <span className="absolute right-1 top-0 rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">{n > 99 ? '99+' : n}</span>
        )}
      </button>
    )
  }

  return (
    <nav className={cx('flex h-full flex-col', rail ? 'w-[72px]' : 'w-[256px]')} aria-label="Mailboxes">
      <div className={cx('pb-4 pt-2', rail ? 'px-2' : 'pl-2 pr-4')}>
        <button
          type="button"
          onClick={() => {
            openCompose()
            if (mobile) setDrawer(false)
          }}
          className={cx(
            'flex h-14 items-center gap-3 rounded-2xl bg-compose font-medium text-on-compose transition-shadow hover:shadow-md',
            rail ? 'w-14 justify-center' : 'pl-4 pr-6',
          )}
          aria-label="Compose"
        >
          <Pencil size={22} />
          {!rail && <span className="text-[14px]">Compose</span>}
        </button>
      </div>
      <div className={cx('scroll-thin min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-6', rail ? 'px-2' : 'pr-4')}>
        {PRIMARY.map(item)}
        {(showMore || moreActive) && MORE.map(item)}
        <button
          type="button"
          onClick={() => setShowMore(!showMore)}
          className={cx('flex h-8 w-full items-center rounded-full text-[14px] text-ink hover:bg-hover', rail ? 'mx-auto w-14 justify-center' : 'gap-4 pl-[26px]')}
          data-tip={rail ? (showMore ? 'Less' : 'More') : undefined}
        >
          {showMore || moreActive ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
          {!rail && <span>{showMore || moreActive ? 'Less' : 'More'}</span>}
        </button>

        <div className={cx('mt-4 flex items-center', rail ? 'justify-center' : 'justify-between pl-[26px]')}>
          {!rail && <span className="text-[16px] font-medium">Labels</span>}
          <button
            type="button"
            onClick={() => setOverlay('newLabel')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-hover"
            aria-label="Create new label"
            data-tip="Create new label"
          >
            <Plus size={18} />
          </button>
        </div>
        {labels.map((l) => {
          const active = view.kind === 'label' && view.labelId === l.id
          const n = counts.byLabel[l.id] ?? 0
          return (
            <div
              key={l.id}
              className={cx(
                'group relative flex h-8 w-full items-center rounded-full text-[14px]',
                active ? 'bg-active font-semibold' : 'hover:bg-hover',
                n > 0 && 'font-semibold',
                rail && 'mx-auto w-14 justify-center',
              )}
            >
              <button
                type="button"
                onClick={() => go({ kind: 'label', labelId: l.id })}
                className={cx('flex h-full min-w-0 flex-1 items-center', rail ? 'justify-center' : 'gap-4 pl-[26px]')}
                data-tip={rail ? l.name : undefined}
              >
                <Tag size={18} style={{ color: l.color, fill: l.color }} />
                {!rail && <span className="flex-1 truncate text-left">{l.name}</span>}
                {!rail && n > 0 && <span className="pr-1 text-xs group-hover:hidden">{n}</span>}
              </button>
              {!rail && (
                <Dropdown
                  width={220}
                  align="left"
                  trigger={({ toggle, open }) => (
                    <button
                      type="button"
                      aria-label={`Options for ${l.name}`}
                      onClick={toggle}
                      className={cx('mr-1 h-7 w-7 items-center justify-center rounded-full hover:bg-hover-strong', open ? 'flex' : 'hidden group-hover:flex')}
                    >
                      <MoreVertical size={16} />
                    </button>
                  )}
                >
                  {(close) => (
                    <>
                      <MenuLabel>Label color</MenuLabel>
                      <div className="grid grid-cols-6 gap-2 px-4 py-2">
                        {LABEL_SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            aria-label={`Color ${c}`}
                            onClick={() => updateLabel(l.id, { color: c })}
                            className={cx('h-6 w-6 rounded-full border-2', c === l.color ? 'border-ink' : 'border-transparent')}
                            style={{ background: c }}
                          />
                        ))}
                      </div>
                      <MenuDivider />
                      <MenuItem
                        onClick={() => {
                          close()
                          setLabelEdit(l.id)
                          setOverlay('newLabel')
                        }}
                      >
                        Edit
                      </MenuItem>
                      <MenuItem
                        danger
                        onClick={() => {
                          close()
                          if (active) goView({ kind: 'folder', folder: 'inbox' })
                          deleteLabel(l.id)
                          useUI.getState().showToast(`Label "${l.name}" removed.`)
                        }}
                      >
                        Remove label
                      </MenuItem>
                    </>
                  )}
                </Dropdown>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )
}

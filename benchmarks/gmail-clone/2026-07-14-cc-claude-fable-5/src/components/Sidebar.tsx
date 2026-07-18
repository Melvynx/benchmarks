import { useMemo, useState, type ReactNode } from 'react'
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Clock,
  File,
  Inbox,
  OctagonAlert,
  Pencil,
  Plus,
  Send,
  SquarePen,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useMail } from '../store/store'
import { folderOf, hasDraft, isUnread } from '../lib/mail'
import { useIsMobile } from '../hooks/hooks'
import { cx } from '../lib/utils'
import type { FolderId, Route } from '../types'

const LABEL_COLORS = ['#4a86e8', '#16a765', '#ffad47', '#a479e2', '#f691b3', '#fb4c2f', '#43d692', '#999999']

function NavItem(props: {
  icon: ReactNode
  name: string
  count?: number
  active: boolean
  collapsed: boolean
  onClick: () => void
  trailing?: ReactNode
  boldCount?: boolean
}) {
  return (
    <button
      type="button"
      title={props.name}
      onClick={props.onClick}
      className={cx(
        'group/nav flex h-9 w-full items-center rounded-full text-left text-sm transition-colors',
        props.collapsed ? 'justify-center px-0' : 'pl-4 pr-3',
        props.active
          ? 'bg-nav-sel font-semibold text-nav-sel-text'
          : 'text-ink-1 hover:bg-black/6 dark:hover:bg-white/8',
      )}
    >
      <span className="[&>svg]:h-5 [&>svg]:w-5 shrink-0">{props.icon}</span>
      {!props.collapsed && (
        <>
          <span className="ml-3.5 min-w-0 flex-1 truncate">{props.name}</span>
          {props.trailing}
          {props.count !== undefined && props.count > 0 && (
            <span className={cx('ml-2 text-xs', props.boldCount && !props.active && 'font-semibold')}>
              {props.count}
            </span>
          )}
        </>
      )}
    </button>
  )
}

function CreateLabelForm(props: { onClose: () => void }) {
  const createLabel = useMail((s) => s.createLabel)
  const navigate = useMail((s) => s.navigate)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0])

  const submit = () => {
    const label = createLabel(name, color)
    if (label) {
      navigate({ folder: 'label', labelId: label.id })
      props.onClose()
    }
  }

  return (
    <div className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
      <div className="mb-2 text-sm font-medium text-ink-1">New label</div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') props.onClose()
        }}
        placeholder="Label name"
        className="mb-3 w-full rounded-md border border-line-strong bg-transparent px-3 py-2 text-sm text-ink-1 outline-none focus:border-accent"
      />
      <div className="mb-3 flex gap-1.5">
        {LABEL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => setColor(c)}
            className={cx(
              'h-5 w-5 rounded-full border-2',
              color === c ? 'border-ink-1' : 'border-transparent',
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onClose}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-ink-2 hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:text-[#0e1014]"
        >
          Create
        </button>
      </div>
    </div>
  )
}

export function SidebarContent(props: { collapsed: boolean }) {
  const { collapsed } = props
  const threads = useMail((s) => s.threads)
  const labels = useMail((s) => s.labels)
  const route = useMail((s) => s.route)
  const navigate = useMail((s) => s.navigate)
  const openCompose = useMail((s) => s.openCompose)
  const deleteLabel = useMail((s) => s.deleteLabel)
  const [moreOpen, setMoreOpen] = useState(false)
  const [labelFormOpen, setLabelFormOpen] = useState(false)

  const now = Date.now()
  const counts = useMemo(() => {
    let inboxUnread = 0
    let drafts = 0
    let spamUnread = 0
    const labelUnread = new Map<string, number>()
    for (const t of threads) {
      if (folderOf(t, 'inbox', now) && isUnread(t)) inboxUnread += 1
      if (folderOf(t, 'drafts', now) && hasDraft(t)) drafts += 1
      if (t.location === 'spam' && isUnread(t)) spamUnread += 1
      if (t.location !== 'trash' && t.location !== 'spam' && isUnread(t)) {
        for (const id of t.labelIds) labelUnread.set(id, (labelUnread.get(id) ?? 0) + 1)
      }
    }
    return { inboxUnread, drafts, spamUnread, labelUnread }
  }, [threads, now])

  const go = (folder: FolderId): Route => ({ folder })
  const isActive = (folder: FolderId) => route.folder === folder

  return (
    <nav className={cx('flex h-full flex-col', collapsed ? 'w-[72px] items-center' : 'w-[228px]')}>
      <div className={cx('py-2', collapsed ? 'px-2' : 'px-3')}>
        <button
          type="button"
          onClick={() => openCompose()}
          title="Compose (c)"
          className={cx(
            'flex h-14 items-center justify-center gap-3 rounded-2xl bg-compose-btn text-nav-sel-text dark:text-ink-1',
            'shadow-[0_1px_3px_rgba(60,64,67,0.3)] transition-shadow hover:shadow-[0_2px_6px_rgba(60,64,67,0.35)]',
            collapsed ? 'w-14' : 'w-fit pl-4 pr-6',
          )}
        >
          <SquarePen className="h-5 w-5 shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Compose</span>}
        </button>
      </div>

      <div className={cx('flex-1 overflow-y-auto pb-4', collapsed ? 'w-full px-2' : 'pr-3')}>
        <NavItem icon={<Inbox />} name="Inbox" count={counts.inboxUnread} boldCount active={isActive('inbox')} collapsed={collapsed} onClick={() => navigate(go('inbox'))} />
        <NavItem icon={<Star />} name="Starred" active={isActive('starred')} collapsed={collapsed} onClick={() => navigate(go('starred'))} />
        <NavItem icon={<Clock />} name="Snoozed" active={isActive('snoozed')} collapsed={collapsed} onClick={() => navigate(go('snoozed'))} />
        <NavItem icon={<Send />} name="Sent" active={isActive('sent')} collapsed={collapsed} onClick={() => navigate(go('sent'))} />
        <NavItem icon={<File />} name="Drafts" count={counts.drafts} active={isActive('drafts')} collapsed={collapsed} onClick={() => navigate(go('drafts'))} />

        {moreOpen && (
          <>
            <NavItem icon={<Archive />} name="All Mail" active={isActive('all')} collapsed={collapsed} onClick={() => navigate(go('all'))} />
            <NavItem icon={<OctagonAlert />} name="Spam" count={counts.spamUnread} boldCount active={isActive('spam')} collapsed={collapsed} onClick={() => navigate(go('spam'))} />
            <NavItem icon={<Trash2 />} name="Trash" active={isActive('trash')} collapsed={collapsed} onClick={() => navigate(go('trash'))} />
          </>
        )}
        <NavItem
          icon={moreOpen ? <ChevronUp /> : <ChevronDown />}
          name={moreOpen ? 'Less' : 'More'}
          active={false}
          collapsed={collapsed}
          onClick={() => setMoreOpen(!moreOpen)}
        />

        {!collapsed && (
          <div className="relative mt-5">
            <div className="flex items-center justify-between pl-4 pr-1">
              <span className="text-sm font-medium text-ink-2">Labels</span>
              <button
                type="button"
                title="Create new label"
                onClick={() => setLabelFormOpen(true)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-black/8 dark:hover:bg-white/10"
              >
                <Plus className="h-4.5 w-4.5" />
              </button>
            </div>
            {labelFormOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setLabelFormOpen(false)} />
                <div className="absolute left-2 right-0 z-50 rounded-lg border border-line/60 bg-surface shadow-[var(--shadow-menu)] anim-pop">
                  <CreateLabelForm onClose={() => setLabelFormOpen(false)} />
                </div>
              </>
            )}
            {labels.map((label) => {
              const active = route.folder === 'label' && route.labelId === label.id
              return (
                <div key={label.id} className="group/label relative">
                  <NavItem
                    icon={<Tag style={{ color: label.color }} fill={label.color} fillOpacity={0.25} />}
                    name={label.name}
                    count={counts.labelUnread.get(label.id) ?? 0}
                    boldCount
                    active={active}
                    collapsed={collapsed}
                    onClick={() => navigate({ folder: 'label', labelId: label.id })}
                    trailing={
                      <span
                        role="button"
                        tabIndex={-1}
                        title={`Delete label “${label.name}”`}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteLabel(label.id)
                        }}
                        className="hidden h-6 w-6 items-center justify-center rounded-full text-ink-3 hover:bg-black/10 group-hover/label:flex dark:hover:bg-white/15"
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    }
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}

export function Sidebar() {
  const isMobile = useIsMobile()
  const navCollapsed = useMail((s) => s.navCollapsed)
  const drawerOpen = useMail((s) => s.drawerOpen)
  const setDrawerOpen = useMail((s) => s.setDrawerOpen)
  const openCompose = useMail((s) => s.openCompose)

  if (isMobile) {
    return (
      <>
        {drawerOpen && (
          <div className="fixed inset-0 z-40 bg-scrim anim-fade" onClick={() => setDrawerOpen(false)}>
            <div
              className="anim-drawer h-full w-[280px] rounded-r-2xl bg-shell pt-2 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 px-4 pb-2 pt-1">
                <span className="text-[20px] text-ink-2">Fable 5</span>
              </div>
              <div className="h-[calc(100%-52px)] overflow-y-auto px-1">
                <SidebarContent collapsed={false} />
              </div>
            </div>
          </div>
        )}
        <button
          type="button"
          title="Compose"
          onClick={() => openCompose()}
          className="fixed bottom-5 right-5 z-30 flex h-14 items-center gap-3 rounded-2xl bg-compose-btn px-5 text-nav-sel-text shadow-[0_4px_12px_rgba(0,0,0,0.25)] dark:text-ink-1"
        >
          <Pencil className="h-5 w-5" />
          <span className="text-sm font-medium">Compose</span>
        </button>
      </>
    )
  }

  return (
    <aside className="shrink-0">
      <SidebarContent collapsed={navCollapsed} />
    </aside>
  )
}

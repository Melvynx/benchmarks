import { useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  EllipsisVertical,
  Pencil,
  Plus,
  Settings as SettingsIcon,
  Tag,
} from 'lucide-react'
import { LABEL_PALETTE } from '@/data/labels'
import { useMailActions } from '@/hooks/use-mail-actions'
import type { Counts } from '@/lib/selectors'
import type { Label } from '@/lib/types'
import { cn, formatBytes } from '@/lib/utils'
import { SIDEBAR_MORE, SIDEBAR_PRIMARY, VIEWS } from '@/lib/views'
import { useCompose } from '@/store/compose'
import { useMail } from '@/store/mail-store'
import type { Route } from '@/store/router'
import { Button, IconButton, Tooltip } from './ui/bits'
import { Dialog } from './ui/dialog'
import { Menu } from './ui/popover'

interface SidebarProps {
  route: Route
  navigate: (r: Route) => void
  counts: Counts
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ route, navigate, counts, collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { data } = useMail()
  const { openNew } = useCompose()
  const actions = useMailActions()
  const [showMore, setShowMore] = useState(false)
  const [labelsOpen, setLabelsOpen] = useState(true)
  const [editing, setEditing] = useState<Label | null>(null)
  const [creating, setCreating] = useState(false)

  const countFor = (id: string) => {
    switch (id) {
      case 'inbox':
        return counts.inboxUnread
      case 'starred':
        return counts.starred
      case 'snoozed':
        return counts.snoozed
      case 'important':
        return counts.important
      case 'drafts':
        return counts.drafts
      case 'scheduled':
        return counts.scheduled
      case 'spam':
        return counts.spam
      case 'trash':
        return counts.trash
      case 'sent':
        return 0
      default:
        return 0
    }
  }

  const isActiveView = (id: string) =>
    !route.labelId && !route.settingsTab && route.search === undefined && route.view === id

  const go = (r: Route) => {
    navigate(r)
    onCloseMobile()
  }

  const storagePct = Math.min(100, (data.account.usedBytes / data.account.quotaBytes) * 100)

  const nav = (
    <nav
      className={cn(
        'flex h-full min-h-0 flex-col pb-3 pt-2',
        collapsed ? 'w-[72px] items-center' : 'w-[256px]',
      )}
      aria-label="Mailboxes"
    >
      <div className={cn('mb-3 px-2', collapsed && 'px-0')}>
        {collapsed ? (
          <Tooltip label="Compose" shortcut="c">
            <button
              type="button"
              onClick={() => openNew()}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent-ink shadow-sm transition-shadow hover:shadow-md"
              aria-label="Compose"
            >
              <Pencil className="h-5 w-5" />
            </button>
          </Tooltip>
        ) : (
          <button
            type="button"
            onClick={() => {
              openNew()
              onCloseMobile()
            }}
            className="flex h-14 items-center gap-3 rounded-2xl bg-accent-soft pl-4 pr-6 text-[14px] font-medium text-accent-ink shadow-sm transition-shadow hover:shadow-md"
          >
            <Pencil className="h-5 w-5" />
            Compose
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin pr-1">
        <ul className="space-y-0.5">
          {SIDEBAR_PRIMARY.map((id) => (
            <NavItem
              key={id}
              id={id}
              active={isActiveView(id)}
              collapsed={collapsed}
              count={countFor(id)}
              bold={id === 'inbox'}
              onClick={() => go({ view: id })}
            />
          ))}

          {!collapsed && (
            <li>
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="flex h-8 w-full items-center gap-4 rounded-r-full pl-5 pr-3 text-[14px] text-ink-2 hover:bg-surface-3"
              >
                {showMore ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                <span>{showMore ? 'Less' : 'More'}</span>
              </button>
            </li>
          )}

          {(showMore || collapsed) &&
            SIDEBAR_MORE.map((id) => (
              <NavItem
                key={id}
                id={id}
                active={isActiveView(id)}
                collapsed={collapsed}
                count={countFor(id)}
                onClick={() => go({ view: id })}
              />
            ))}
        </ul>

        {!collapsed && (
          <>
            <div className="mt-3 flex items-center justify-between pl-5 pr-2">
              <button
                type="button"
                onClick={() => setLabelsOpen((v) => !v)}
                className="flex items-center gap-1 py-1.5 text-[13px] font-medium text-ink-2"
              >
                Labels
                {labelsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <IconButton label="Create new label" size="sm" onClick={() => setCreating(true)}>
                <Plus />
              </IconButton>
            </div>

            {labelsOpen && (
              <ul className="space-y-0.5 pb-2">
                {data.labels.map((label) => (
                  <LabelItem
                    key={label.id}
                    label={label}
                    active={route.labelId === label.id}
                    unread={counts.byLabel[label.id]?.unread ?? 0}
                    total={counts.byLabel[label.id]?.total ?? 0}
                    onClick={() => go({ view: 'all', labelId: label.id })}
                    onEdit={() => setEditing(label)}
                    onDelete={() => actions.deleteLabel(label.id)}
                  />
                ))}
                {!data.labels.length && (
                  <li className="px-5 py-2 text-[12px] text-ink-4">No labels yet.</li>
                )}
              </ul>
            )}

            <div className="mt-2 space-y-1 px-5 pb-2 pt-3">
              <div className="h-1 w-full overflow-hidden rounded-full bg-line-soft">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
              <p className="text-[11px] text-ink-3">
                {formatBytes(data.account.usedBytes)} of {formatBytes(data.account.quotaBytes)} used
              </p>
              <button
                type="button"
                onClick={() => go({ view: route.view, settingsTab: 'general' })}
                className="text-[12px] text-accent-ink hover:underline"
              >
                Manage storage
              </button>
            </div>
          </>
        )}
      </div>

      {collapsed && (
        <IconButton
          label="Settings"
          className="mt-2"
          onClick={() => go({ view: route.view, settingsTab: 'general' })}
        >
          <SettingsIcon />
        </IconButton>
      )}

      <LabelDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSubmit={(name, color) => {
          actions.createLabel(name, color)
          setCreating(false)
        }}
      />
      <LabelDialog
        open={Boolean(editing)}
        label={editing ?? undefined}
        onClose={() => setEditing(null)}
        onSubmit={(name, color) => {
          if (editing) {
            actions.renameLabel(editing.id, name)
            actions.recolorLabel(editing.id, color)
          }
          setEditing(null)
        }}
      />
    </nav>
  )

  return (
    <>
      {/* Desktop / tablet rail */}
      <div className="hidden shrink-0 md:block">{nav}</div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[280px] overflow-hidden bg-canvas shadow-compose animate-slide-up">
            <div className="h-full pt-2">{nav}</div>
          </div>
        </div>
      )}
    </>
  )
}

function NavItem({
  id,
  active,
  collapsed,
  count,
  bold,
  onClick,
}: {
  id: keyof typeof VIEWS
  active: boolean
  collapsed: boolean
  count: number
  bold?: boolean
  onClick: () => void
}) {
  const def = VIEWS[id]
  const Icon = def.icon
  return (
    <li>
      <Tooltip label={collapsed ? def.title : undefined}>
        <button
          type="button"
          onClick={onClick}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'group flex w-full items-center text-[14px] transition-colors',
            collapsed
              ? 'h-12 w-12 flex-col justify-center gap-0.5 rounded-2xl'
              : 'h-8 gap-4 rounded-r-full pl-5 pr-3',
            active
              ? 'bg-accent-soft font-semibold text-accent-ink'
              : 'text-ink-2 hover:bg-surface-3',
          )}
        >
          <Icon
            className={cn('h-5 w-5 shrink-0', active && 'text-accent-ink')}
            fill={active && id === 'starred' ? 'currentColor' : 'none'}
          />
          {!collapsed && (
            <>
              <span className={cn('min-w-0 flex-1 truncate text-left', bold && active && 'font-bold')}>
                {def.title}
              </span>
              {count > 0 && (
                <span
                  className={cn(
                    'shrink-0 text-[12px] tabular-nums',
                    active ? 'font-bold text-accent-ink' : 'font-semibold text-ink-2',
                  )}
                >
                  {count > 999 ? '999+' : count}
                </span>
              )}
            </>
          )}
          {collapsed && count > 0 && (
            <span className="absolute" aria-hidden />
          )}
        </button>
      </Tooltip>
    </li>
  )
}

function LabelItem({
  label,
  active,
  unread,
  total,
  onClick,
  onEdit,
  onDelete,
}: {
  label: Label
  active: boolean
  unread: number
  total: number
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const menuRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex h-8 w-full items-center gap-4 rounded-r-full pl-5 pr-2 text-[14px]',
          active ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-ink-2 hover:bg-surface-3',
        )}
      >
        <span
          className="h-[14px] w-[14px] shrink-0 rounded-[3px] ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: label.color.bg }}
        />
        <span className="min-w-0 flex-1 truncate text-left">{label.name}</span>
        {unread > 0 && (
          <span className="shrink-0 text-[12px] font-semibold tabular-nums group-hover:hidden">
            {unread}
          </span>
        )}
      </button>
      <IconButton
        ref={menuRef}
        label={`Label options for ${label.name}`}
        size="sm"
        showTooltip={false}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100',
          open && 'opacity-100',
        )}
      >
        <EllipsisVertical />
      </IconButton>
      <Menu
        anchorRef={menuRef}
        open={open}
        onClose={() => setOpen(false)}
        align="start"
        entries={[
          { type: 'header', id: 'h', label: `${total} conversation${total === 1 ? '' : 's'}` },
          { id: 'edit', label: 'Edit label', icon: <Tag />, onSelect: onEdit },
          { type: 'separator', id: 's' },
          { id: 'del', label: 'Remove label', danger: true, onSelect: onDelete },
        ]}
      />
    </li>
  )
}

function LabelDialog({
  open,
  label,
  onClose,
  onSubmit,
}: {
  open: boolean
  label?: Label
  onClose: () => void
  onSubmit: (name: string, color: { bg: string; fg: string }) => void
}) {
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState(label?.color ?? LABEL_PALETTE[7])
  const key = label?.id ?? 'new'

  return (
    <Dialog
      key={`${key}-${open}`}
      open={open}
      onClose={onClose}
      title={label ? 'Edit label' : 'New label'}
      className="max-w-sm"
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!name.trim()}
            onClick={() => onSubmit(name.trim(), color)}
          >
            {label ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 pb-2">
        <input
          data-autofocus
          defaultValue={label?.name ?? ''}
          onChange={(e) => setName(e.target.value)}
          placeholder="Label name"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div>
          <p className="mb-2 text-[12px] font-medium text-ink-2">Colour</p>
          <div className="flex flex-wrap gap-2">
            {LABEL_PALETTE.map((c) => (
              <button
                key={c.bg}
                type="button"
                aria-label={`Colour ${c.bg}`}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c.bg }}
                className={cn(
                  'h-7 w-7 rounded-full ring-1 ring-inset ring-black/10 transition-transform',
                  color.bg === c.bg && 'scale-110 ring-2 ring-accent ring-offset-2 ring-offset-elevated',
                )}
              />
            ))}
          </div>
        </div>
        <div className="pt-1">
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-[12px] font-medium"
            style={{ backgroundColor: color.bg, color: color.fg }}
          >
            {name.trim() || 'Preview'}
          </span>
        </div>
      </div>
    </Dialog>
  )
}

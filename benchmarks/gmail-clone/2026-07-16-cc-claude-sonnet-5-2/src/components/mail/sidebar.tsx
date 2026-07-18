import { useState, type ReactNode } from 'react'
import { ChevronDown, MoreVertical, Plus, SquarePen, Trash2 } from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import { MORE_NAV, PRIMARY_NAV } from '@/lib/nav'
import { filterThreadsForView, threadIsUnread } from '@/lib/mail-queries'
import { NavIcon } from './nav-icon'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function useFolderCount(id: (typeof PRIMARY_NAV)[number]['id']) {
  const threads = useMailStore((s) => s.threads)
  const view = { kind: 'folder' as const, id }
  const items = filterThreadsForView(threads, view, null)
  if (id === 'draft') return items.length
  if (id === 'inbox') return items.filter(threadIsUnread).length
  return 0
}

function NavRow({
  active,
  icon,
  label,
  count,
  bold,
  collapsed,
  onClick,
  dotColor,
}: {
  active: boolean
  icon?: ReactNode
  label: string
  count?: number
  bold?: boolean
  collapsed: boolean
  onClick: () => void
  dotColor?: string
}) {
  const content = (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-4 rounded-e-full py-[7px] text-[13px] transition-colors',
        collapsed ? 'justify-center px-0' : 'pl-6 pr-3',
        active
          ? 'bg-sidebar-active font-semibold text-sidebar-active-fg'
          : 'text-foreground hover:bg-sidebar-hover',
      )}
    >
      {icon ?? (
        <span
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {!collapsed && <span className={cn('flex-1 truncate text-left', bold && count ? 'font-semibold' : '')}>{label}</span>}
      {!collapsed && count !== undefined && count > 0 && (
        <span className={cn('text-[12px]', active ? 'text-sidebar-active-fg' : 'text-muted-foreground', bold && 'font-semibold text-foreground')}>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )

  if (!collapsed) return content

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function CreateLabelPopover() {
  const createLabel = useMailStore((s) => s.createLabel)
  const [name, setName] = useState('')
  const [open, setOpen] = useState(false)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    createLabel(trimmed)
    setName('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-sidebar-hover group-hover:opacity-100"
          aria-label="Create new label"
        >
          <Plus className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <p className="mb-2 text-sm font-medium">New label</p>
        <div className="flex gap-2">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Label name"
          />
          <Button size="sm" onClick={submit}>
            Create
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const view = useMailStore((s) => s.view)
  const setView = useMailStore((s) => s.setView)
  const openCompose = useMailStore((s) => s.openCompose)
  const labels = useMailStore((s) => s.labels)
  const threads = useMailStore((s) => s.threads)
  const deleteLabel = useMailStore((s) => s.deleteLabel)
  const [moreOpen, setMoreOpen] = useState(false)

  const inboxCount = useFolderCount('inbox')
  const draftCount = useFolderCount('draft')

  return (
    <nav
      className={cn(
        'flex h-full shrink-0 flex-col bg-sidebar transition-[width] duration-150',
        collapsed ? 'w-[76px] items-center' : 'w-[256px]',
      )}
    >
      <div className={cn('py-4', collapsed ? '' : 'px-3')}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => openCompose('new')}
                className="flex size-14 items-center justify-center rounded-2xl bg-[#c2e7ff] text-[#001d35] shadow-sm transition-shadow hover:shadow-md"
                aria-label="Compose"
              >
                <SquarePen className="size-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Compose</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            onClick={() => openCompose('new')}
            className="h-14 w-full justify-start gap-4 rounded-2xl bg-[#c2e7ff] px-6 text-[15px] font-medium text-[#001d35] shadow-sm hover:bg-[#c2e7ff] hover:shadow-md hover:brightness-100"
          >
            <SquarePen className="size-5" />
            Compose
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className={cn('flex flex-col gap-0.5 pb-2', collapsed ? 'items-center px-2' : '')}>
          {PRIMARY_NAV.map((item) => (
            <NavRow
              key={item.id}
              icon={<NavIcon icon={item.icon} className="size-[18px]" />}
              label={item.label}
              active={view.kind === 'folder' && view.id === item.id}
              collapsed={collapsed}
              bold={item.id === 'inbox'}
              count={item.id === 'inbox' ? inboxCount : item.id === 'draft' ? draftCount : undefined}
              onClick={() => setView({ kind: 'folder', id: item.id })}
            />
          ))}

          {!collapsed && (
            <button
              onClick={() => setMoreOpen((v) => !v)}
              className="mt-0.5 flex items-center gap-4 rounded-e-full py-[7px] pl-6 pr-3 text-[13px] text-foreground hover:bg-sidebar-hover"
            >
              <ChevronDown className={cn('size-[18px] transition-transform', moreOpen && 'rotate-180')} />
              <span>{moreOpen ? 'Less' : 'More'}</span>
            </button>
          )}

          {(moreOpen || collapsed) &&
            MORE_NAV.map((item) => (
              <NavRow
                key={item.id}
                icon={<NavIcon icon={item.icon} className="size-[18px]" />}
                label={item.label}
                active={view.kind === 'folder' && view.id === item.id}
                collapsed={collapsed}
                onClick={() => setView({ kind: 'folder', id: item.id })}
              />
            ))}

          {!collapsed && (
            <div className="group mt-3 flex items-center justify-between px-6 pb-1 pt-2">
              <span className="text-[13px] font-medium text-muted-foreground">Labels</span>
              <CreateLabelPopover />
            </div>
          )}

          {!collapsed &&
            labels.map((label) => {
              const count = filterThreadsForView(threads, { kind: 'label', id: label.id }, null).filter(
                threadIsUnread,
              ).length
              return (
                <div key={label.id} className="group relative flex items-center">
                  <div className="flex-1">
                    <NavRow
                      dotColor={label.color}
                      label={label.name}
                      active={view.kind === 'label' && view.id === label.id}
                      collapsed={false}
                      count={count}
                      bold
                      onClick={() => setView({ kind: 'label', id: label.id })}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="absolute right-2 rounded-full p-1 text-muted-foreground opacity-0 hover:bg-sidebar-hover group-hover:opacity-100"
                        aria-label={`${label.name} options`}
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem variant="destructive" onClick={() => deleteLabel(label.id)}>
                        <Trash2 />
                        Remove label
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}

          {!collapsed && labels.length === 0 && (
            <p className="px-6 py-1 text-[12px] text-muted-foreground">No labels yet</p>
          )}
        </div>
      </ScrollArea>
    </nav>
  )
}

export function useCategoryCount(category: string) {
  const threads = useMailStore((s) => s.threads)
  const items = filterThreadsForView(threads, { kind: 'folder', id: 'inbox' }, category)
  return items.filter(threadIsUnread).length
}

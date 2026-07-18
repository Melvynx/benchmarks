import { useState } from 'react'
import {
  Archive,
  ArchiveRestore,
  BellOff,
  ChevronDown,
  Clock,
  MailOpen,
  Mail as MailUnread,
  MoreVertical,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  Tag,
  Trash2,
} from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import { filterThreadsForView, searchThreads, threadIsUnread } from '@/lib/mail-queries'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SnoozeMenu } from './snooze-menu'
import { LabelPickerMenu } from './label-picker-menu'
import { cn } from '@/lib/utils'

export function MailListToolbar() {
  const view = useMailStore((s) => s.view)
  const category = useMailStore((s) => s.category)
  const searchQuery = useMailStore((s) => s.searchQuery)
  const threads = useMailStore((s) => s.threads)
  const selectedIds = useMailStore((s) => s.selectedIds)
  const selectMany = useMailStore((s) => s.selectMany)
  const clearSelection = useMailStore((s) => s.clearSelection)
  const archiveThreads = useMailStore((s) => s.archiveThreads)
  const trashThreads = useMailStore((s) => s.trashThreads)
  const restoreFromTrash = useMailStore((s) => s.restoreFromTrash)
  const deleteForever = useMailStore((s) => s.deleteForever)
  const markSpam = useMailStore((s) => s.markSpam)
  const markNotSpam = useMailStore((s) => s.markNotSpam)
  const markRead = useMailStore((s) => s.markRead)
  const snoozeThreads = useMailStore((s) => s.snoozeThreads)
  const unsnooze = useMailStore((s) => s.unsnooze)
  const applyLabel = useMailStore((s) => s.applyLabel)
  const showToast = useMailStore((s) => s.showToast)
  const [selectMenuOpen, setSelectMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const inView = searchQuery.trim()
    ? searchThreads(threads, searchQuery)
    : filterThreadsForView(threads, view, category)

  const allIds = inView.map((t) => t.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.includes(id))
  const someSelected = selectedIds.length > 0 && !allSelected

  const hasSelection = selectedIds.length > 0
  const selectedThreads = threads.filter((t) => selectedIds.includes(t.id))
  const mostlyUnread = selectedThreads.filter(threadIsUnread).length >= selectedThreads.length / 2
  const currentLabelIds = Array.from(new Set(selectedThreads.flatMap((t) => t.labelIds)))

  const isTrash = view.kind === 'folder' && view.id === 'trash'
  const isSpam = view.kind === 'folder' && view.id === 'spam'
  const isDraft = view.kind === 'folder' && view.id === 'draft'
  const isSnoozed = view.kind === 'folder' && view.id === 'snoozed'

  function toggleAll() {
    selectMany(allSelected ? [] : allIds)
  }

  function quickSelect(kind: 'all' | 'none' | 'read' | 'unread' | 'starred') {
    setSelectMenuOpen(false)
    if (kind === 'all') return selectMany(allIds)
    if (kind === 'none') return clearSelection()
    if (kind === 'read') return selectMany(inView.filter((t) => !threadIsUnread(t)).map((t) => t.id))
    if (kind === 'unread') return selectMany(inView.filter(threadIsUnread).map((t) => t.id))
    if (kind === 'starred') return selectMany(inView.filter((t) => t.labelIds.includes('starred')).map((t) => t.id))
  }

  return (
    <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-2 sm:px-3">
      <div className="flex items-center">
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={toggleAll}
          className="ml-1"
          aria-label="Select all conversations"
        />
        <Popover open={selectMenuOpen} onOpenChange={setSelectMenuOpen}>
          <PopoverTrigger asChild>
            <button className="rounded-full p-1.5 text-muted-foreground hover:bg-surface-hover" aria-label="Selection options">
              <ChevronDown className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-40 p-1">
            {(['all', 'none', 'read', 'unread', 'starred'] as const).map((k) => (
              <button
                key={k}
                onClick={() => quickSelect(k)}
                className="block w-full rounded-md px-2.5 py-1.5 text-left text-sm capitalize hover:bg-surface-hover"
              >
                {k}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      {!hasSelection && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setRefreshing(true)
                showToast('Inbox is up to date')
                window.setTimeout(() => setRefreshing(false), 600)
              }}
              aria-label="Refresh"
            >
              <RefreshCw className={cn('size-[18px]', refreshing && 'animate-spin')} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Refresh</TooltipContent>
        </Tooltip>
      )}

      {hasSelection && (
        <div className="flex items-center gap-0.5">
          {isTrash ? (
            <>
              <ToolbarIcon label="Move to Inbox" icon={ArchiveRestore} onClick={() => restoreFromTrash(selectedIds)} />
              <ToolbarIcon label="Delete forever" icon={Trash2} onClick={() => deleteForever(selectedIds)} />
            </>
          ) : isSpam ? (
            <>
              <ToolbarIcon label="Not spam" icon={ShieldCheck} onClick={() => markNotSpam(selectedIds)} />
              <ToolbarIcon label="Delete forever" icon={Trash2} onClick={() => deleteForever(selectedIds)} />
            </>
          ) : isDraft ? (
            <ToolbarIcon label="Delete draft" icon={Trash2} onClick={() => trashThreads(selectedIds)} />
          ) : (
            <>
              <ToolbarIcon label="Archive" icon={Archive} onClick={() => archiveThreads(selectedIds)} />
              <ToolbarIcon label="Delete" icon={Trash2} onClick={() => trashThreads(selectedIds)} />
              <ToolbarIcon
                label={mostlyUnread ? 'Mark as read' : 'Mark as unread'}
                icon={mostlyUnread ? MailOpen : MailUnread}
                onClick={() => markRead(selectedIds, mostlyUnread)}
              />
              {isSnoozed ? (
                <ToolbarIcon label="Unsnooze" icon={BellOff} onClick={() => unsnooze(selectedIds)} />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <span>
                      <ToolbarIcon label="Snooze" icon={Clock} onClick={() => {}} />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-2">
                    <SnoozeMenu onSnooze={(until) => snoozeThreads(selectedIds, until)} />
                  </PopoverContent>
                </Popover>
              )}
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreVertical className="size-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => applyLabel(selectedIds, 'starred')}>
                <Star />
                Add star
              </DropdownMenuItem>
              {!isSpam && !isTrash && (
                <DropdownMenuItem onClick={() => markSpam(selectedIds)}>
                  <ShieldAlert />
                  Report spam
                </DropdownMenuItem>
              )}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-surface-hover [&_svg]:size-4 [&_svg]:text-muted-foreground">
                    <Tag />
                    Label as
                  </button>
                </PopoverTrigger>
                <PopoverContent side="right" align="start" className="w-auto p-2">
                  <LabelPickerMenu threadIds={selectedIds} currentLabelIds={currentLabelIds} />
                </PopoverContent>
              </Popover>
              {!isTrash && (
                <DropdownMenuItem variant="destructive" onClick={() => trashThreads(selectedIds)}>
                  <Trash2 />
                  Move to Trash
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2 pr-1 text-xs text-muted-foreground">
        <span>
          {inView.length === 0
            ? '0 of 0'
            : `1–${inView.length} of ${inView.length}`}
        </span>
      </div>
    </div>
  )
}

function ToolbarIcon({
  label,
  icon: Icon,
  onClick,
}: {
  label: string
  icon: typeof Archive
  onClick: () => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClick} aria-label={label}>
          <Icon className="size-[18px]" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

import type { MouseEvent, ReactNode } from 'react';
import { Archive, ChevronDown, ChevronLeft, ChevronRight, Clock, Ellipsis, Inbox, Mail, MailOpen, OctagonAlert, RefreshCw, Tag, Trash } from 'lucide-react';
import { isUnread } from '../../domain/threads';
import type { Folder, Thread } from '../../domain/types';
import { cn } from '../../lib/cn';
import * as actions from '../../store/actions';
import * as commands from '../../store/commands';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { Dropdown, IconButton, MenuItem } from '../ui/primitives';

interface ListToolbarProps {
  folder: Folder | null;
  visibleIds: string[];
  total: number;
  from: number;
  to: number;
  page: number;
  pageCount: number;
  onPage: (page: number) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ListToolbar({
  folder,
  visibleIds,
  total,
  from,
  to,
  page,
  pageCount,
  onPage,
  onRefresh,
  refreshing,
}: ListToolbarProps) {
  const selected = useUI((s) => s.selected);
  const setSelected = useUI((s) => s.setSelected);
  const ask = useUI((s) => s.ask);
  const threads = useMail((s) => s.data.threads);

  const byId = new Map(threads.map((t) => [t.id, t]));
  const selectedThreads = selected.map((id) => byId.get(id)).filter((t): t is Thread => t !== undefined);
  const hasSelection = selected.length > 0;
  const allChecked = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));
  const someChecked = hasSelection && !allChecked;
  const anyUnread = selectedThreads.some(isUnread);
  const inTrash = folder === 'trash';
  const inSpam = folder === 'spam';

  const selectWhere = (predicate: (id: string) => boolean) => setSelected(visibleIds.filter(predicate));
  const isReadNow = (id: string) => {
    const t = byId.get(id);
    return !!t && !isUnread(t);
  };
  const isStarredNow = (id: string) => !!byId.get(id)?.starred;

  const emptyFolder = () => {
    const ids = threads.filter((t) => t.location === (inTrash ? 'trash' : 'spam')).map((t) => t.id);
    ask({
      title: inTrash ? 'Empty Trash now?' : 'Delete all spam messages?',
      body: `${ids.length} conversations will be deleted forever. This can't be undone.`,
      confirmLabel: inTrash ? 'Empty Trash' : 'Delete all',
      danger: true,
      onConfirm: () => {
        actions.removeThreads(ids);
        useUI.getState().setSelected([]);
      },
    });
  };

  const openMenuAt = (kind: 'snooze' | 'labels', e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    commands.openMenu({ kind, ids: selected, x: rect.left, y: rect.bottom });
  };

  return (
    <div role="toolbar" aria-label="Conversation actions" className="flex h-12 shrink-0 items-center gap-0.5 border-b border-line px-2 md:px-3">
      <Dropdown
        trigger={({ toggle }) => (
          <div className="flex items-center">
            <label className="flex size-9 cursor-pointer items-center justify-center rounded-full hover:bg-hover">
              <input
                type="checkbox"
                aria-label="Select all visible"
                className="size-4 cursor-pointer accent-primary"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={() => setSelected(allChecked ? [] : visibleIds)}
              />
            </label>
            <IconButton label="Selection options" onClick={toggle} className="size-6">
              <ChevronDown className="size-4" />
            </IconButton>
          </div>
        )}
      >
        {(close) => (
          <>
            <MenuItem onSelect={() => { setSelected(visibleIds); close(); }}>All</MenuItem>
            <MenuItem onSelect={() => { setSelected([]); close(); }}>None</MenuItem>
            <MenuItem onSelect={() => { selectWhere(isReadNow); close(); }}>Read</MenuItem>
            <MenuItem onSelect={() => { selectWhere((id) => !isReadNow(id)); close(); }}>Unread</MenuItem>
            <MenuItem onSelect={() => { selectWhere(isStarredNow); close(); }}>Starred</MenuItem>
            <MenuItem onSelect={() => { selectWhere((id) => !isStarredNow(id)); close(); }}>Unstarred</MenuItem>
          </>
        )}
      </Dropdown>

      <IconButton label="Refresh" onClick={onRefresh} className="hidden sm:inline-flex">
        <RefreshCw className={cn('size-[18px]', refreshing && 'animate-spin')} />
      </IconButton>

      <div className="mx-1 hidden h-5 w-px bg-line sm:block" />

      <ActionButton label="Archive" disabled={!hasSelection} onClick={() => commands.archiveThreads(selected)}>
        <Archive className="size-[18px]" />
      </ActionButton>
      {!inSpam && !inTrash && (
        <ActionButton
          label="Report spam"
          disabled={!hasSelection}
          onClick={() => commands.reportSpam(selected)}
          className="hidden sm:inline-flex"
        >
          <OctagonAlert className="size-[18px]" />
        </ActionButton>
      )}
      <ActionButton
        label={inTrash ? 'Delete forever' : 'Delete'}
        disabled={!hasSelection}
        onClick={() => {
          if (!inTrash) {
            commands.trashThreads(selected);
            return;
          }
          const ids = [...selected];
          ask({
            title: 'Delete forever?',
            body: `${ids.length} conversation(s) will be deleted permanently.`,
            confirmLabel: 'Delete forever',
            danger: true,
            onConfirm: () => commands.deleteForever(ids),
          });
        }}
      >
        <Trash className="size-[18px]" />
      </ActionButton>
      <ActionButton
        label={anyUnread ? 'Mark as read' : 'Mark as unread'}
        disabled={!hasSelection}
        onClick={() => commands.toggleReadState(selected)}
        className="hidden sm:inline-flex"
      >
        {anyUnread ? <MailOpen className="size-[18px]" /> : <Mail className="size-[18px]" />}
      </ActionButton>
      <ActionButton label="Snooze" disabled={!hasSelection} onClick={(e) => openMenuAt('snooze', e)}>
        <Clock className="size-[18px]" />
      </ActionButton>
      <ActionButton
        label="Labels"
        disabled={!hasSelection}
        onClick={(e) => openMenuAt('labels', e)}
        className="hidden sm:inline-flex"
      >
        <Tag className="size-[18px]" />
      </ActionButton>
      {(inTrash || inSpam) && (
        <ActionButton label="Move to Inbox" disabled={!hasSelection} onClick={() => commands.moveToInbox(selected)}>
          <Inbox className="size-[18px]" />
        </ActionButton>
      )}

      <Dropdown trigger={({ toggle }) => (
        <IconButton label="More actions" onClick={toggle} className="hidden sm:inline-flex">
          <Ellipsis className="size-[18px]" />
        </IconButton>
      )} align="end">
        {(close) => (
          <>
            <MenuItem disabled={!hasSelection} onSelect={() => { commands.toggleReadState(selected); close(); }}>
              {anyUnread ? 'Mark as read' : 'Mark as unread'}
            </MenuItem>
            <MenuItem disabled={!hasSelection} onSelect={() => { actions.setImportant(selected, true); close(); }}>
              Mark as important
            </MenuItem>
            <MenuItem disabled={!hasSelection} onSelect={() => { actions.setImportant(selected, false); close(); }}>
              Mark as not important
            </MenuItem>
            {(inTrash || inSpam) && (
              <MenuItem danger onSelect={() => { close(); emptyFolder(); }}>
                {inTrash ? 'Empty Trash now' : 'Delete all spam'}
              </MenuItem>
            )}
          </>
        )}
      </Dropdown>

      <div className="ml-auto flex items-center gap-1 text-xs text-ink-3">
        <span className="whitespace-nowrap tabular-nums">{total === 0 ? '0 of 0' : `${from}–${to} of ${total}`}</span>
        <IconButton label="Newer conversations" disabled={page <= 0} onClick={() => onPage(page - 1)} className="size-8">
          <ChevronLeft className="size-4" />
        </IconButton>
        <IconButton
          label="Older conversations"
          disabled={page >= pageCount - 1}
          onClick={() => onPage(page + 1)}
          className="size-8"
        >
          <ChevronRight className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <IconButton label={label} disabled={disabled} onClick={onClick} className={cn('size-9', className)}>
      {children}
    </IconButton>
  );
}

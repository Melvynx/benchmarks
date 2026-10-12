import type { MouseEvent, ReactNode } from 'react';
import { Archive, Check, Clock, Mail, MailOpen, Paperclip, Star, Trash } from 'lucide-react';
import type { Label, Settings, Thread } from '../../domain/types';
import { isUnread, lastMessage, senderLine } from '../../domain/threads';
import { cn } from '../../lib/cn';
import { snippetOf } from '../../lib/text';
import { formatListDate } from '../../lib/time';
import * as commands from '../../store/commands';
import { useUI } from '../../store/uiStore';
import { Avatar, IconButton } from '../ui/primitives';
import { LABEL_CHIP } from '../labelStyles';
import { Highlight } from './Highlight';

interface ThreadRowProps {
  thread: Thread;
  me: string;
  layout: 'row' | 'stacked';
  density: Settings['density'];
  selected: boolean;
  focused: boolean;
  labels: Label[];
  hasDraft: boolean;
  terms: string[];
  now: number;
  onOpen: (threadId: string) => void;
}

const DENSITY_ROW: Record<Settings['density'], string> = {
  comfortable: 'min-h-[48px] py-2 text-sm',
  cozy: 'min-h-[40px] py-1.5 text-sm',
  compact: 'min-h-[32px] py-1 text-[13px]',
};

const DENSITY_STACK: Record<Settings['density'], string> = {
  comfortable: 'py-3',
  cozy: 'py-2.5',
  compact: 'py-2',
};

export function ThreadRow({
  thread,
  me,
  layout,
  density,
  selected,
  focused,
  labels,
  hasDraft,
  terms,
  now,
  onOpen,
}: ThreadRowProps) {
  const last = lastMessage(thread);
  const unread = isUnread(thread);
  const hasFiles = thread.messages.some((m) => m.attachments.length > 0);
  const sender = senderLine(thread, me);
  const snippet = snippetOf(last.text, 160);
  const date = formatListDate(last.date, now);
  const chips = thread.labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is Label => Boolean(l))
    .slice(0, 2);
  const avatarSource =
    last.from.email === me ? (thread.messages.find((m) => m.from.email !== me)?.from ?? last.from) : last.from;

  const base = cn(
    'group relative flex cursor-pointer border-b border-line/70 px-3 transition-shadow',
    selected ? 'bg-selected' : 'bg-surface hover:shadow-[0_1px_2px_rgba(60,64,67,.25),0_1px_3px_rgba(60,64,67,.12)] hover:z-10',
    focused && 'ring-2 ring-inset ring-primary/60',
    unread ? 'text-ink' : 'text-ink-2',
  );

  const toggleStar = (e: MouseEvent) => {
    e.stopPropagation();
    commands.toggleStar([thread.id]);
  };

  const starButton = (
    <button
      type="button"
      onClick={toggleStar}
      aria-label={thread.starred ? 'Unstar conversation' : 'Star conversation'}
      className="shrink-0 rounded-full p-1 hover:bg-hover"
    >
      <Star
        className={cn(
          'size-[18px]',
          thread.starred ? 'fill-[#f4b400] text-[#f4b400]' : 'text-ink-3 opacity-60 group-hover:opacity-100',
        )}
      />
    </button>
  );

  if (layout === 'stacked') {
    return (
      <div
        id={`row-${thread.id}`}
        role="row"
        aria-selected={selected}
        onClick={() => onOpen(thread.id)}
        className={cn(base, 'items-start gap-3', DENSITY_STACK[density], unread && 'font-medium')}
      >
        <button
          type="button"
          aria-label={selected ? 'Deselect conversation' : 'Select conversation'}
          onClick={(e) => {
            e.stopPropagation();
            useUI.getState().toggleSelected(thread.id);
          }}
          className="relative mt-0.5 shrink-0 rounded-full"
        >
          {selected ? (
            <span className="flex size-10 items-center justify-center rounded-full bg-primary text-on-primary">
              <Check className="size-5" />
            </span>
          ) : (
            <Avatar name={avatarSource.name} email={avatarSource.email} size={40} />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className={cn('truncate', unread ? 'font-semibold text-ink' : 'text-ink')}>{sender}</span>
            <span className={cn('ml-auto shrink-0 text-xs', unread ? 'font-semibold text-primary' : 'text-ink-3')}>
              {date}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            {hasDraft && <span className="shrink-0 text-xs font-semibold text-danger">Draft</span>}
            <span className={cn('truncate', unread ? 'font-semibold text-ink' : 'text-ink')}>
              <Highlight text={thread.subject} terms={terms} />
            </span>
            {hasFiles && <Paperclip className="size-3.5 shrink-0 text-ink-3" />}
          </div>
          <div className="truncate text-ink-3">
            <Highlight text={snippet} terms={terms} />
          </div>
        </div>
        {starButton}
      </div>
    );
  }

  return (
    <div
      id={`row-${thread.id}`}
      role="row"
      aria-selected={selected}
      onClick={() => onOpen(thread.id)}
      className={cn(base, 'items-center gap-2', DENSITY_ROW[density], unread && 'font-semibold')}
    >
      <input
        type="checkbox"
        className="size-4 shrink-0 cursor-pointer accent-primary"
        checked={selected}
        aria-label={`Select ${thread.subject}`}
        onClick={(e) => e.stopPropagation()}
        onChange={() => useUI.getState().toggleSelected(thread.id)}
      />
      {starButton}
      <span className={cn('w-[176px] shrink-0 truncate', unread ? 'text-ink' : 'text-ink-2')}>
        {sender}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        {hasDraft && <span className="shrink-0 text-danger">Draft</span>}
        {thread.important && <span className="size-1.5 shrink-0 rounded-full bg-[#f4b400]" title="Important" />}
        {chips.map((l) => (
          <span
            key={l.id}
            className={cn('shrink-0 rounded px-1.5 text-[11px] font-medium leading-4 font-normal', LABEL_CHIP[l.color])}
          >
            {l.name}
          </span>
        ))}
        <span className="truncate text-ink">
          <Highlight text={thread.subject} terms={terms} />
        </span>
        <span className="min-w-0 truncate font-normal text-ink-3">
          <Highlight text={` – ${snippet}`} terms={terms} />
        </span>
      </span>
      {hasFiles && <Paperclip className="size-4 shrink-0 text-ink-3" />}
      <span className={cn('w-[64px] shrink-0 whitespace-nowrap pr-1 text-right text-xs', unread ? 'text-ink' : 'text-ink-3')}>
        {date}
      </span>

      <div className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-full bg-surface px-1 shadow-md group-hover:flex">
        <RowAction label="Archive" onClick={(e) => { stop(e); commands.archiveThreads([thread.id]); }}>
          <Archive className="size-4" />
        </RowAction>
        <RowAction label="Delete" onClick={(e) => { stop(e); commands.trashThreads([thread.id]); }}>
          <Trash className="size-4" />
        </RowAction>
        <RowAction
          label={isUnread(thread) ? 'Mark as read' : 'Mark as unread'}
          onClick={(e) => {
            stop(e);
            commands.toggleReadState([thread.id]);
          }}
        >
          {isUnread(thread) ? <MailOpen className="size-4" /> : <Mail className="size-4" />}
        </RowAction>
        <RowAction
          label="Snooze"
          onClick={(e) => {
            stop(e);
            const rect = e.currentTarget.getBoundingClientRect();
            commands.openMenu({ kind: 'snooze', ids: [thread.id], x: rect.left - 120, y: rect.bottom });
          }}
        >
          <Clock className="size-4" />
        </RowAction>
      </div>
    </div>
  );
}

function stop(e: MouseEvent) {
  e.stopPropagation();
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}) {
  return (
    <IconButton label={label} onClick={onClick} className="size-8">
      {children}
    </IconButton>
  );
}

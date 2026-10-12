import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Paperclip } from 'lucide-react';
import { displayName, sameEmail } from '../../domain/threads';
import type { Address, Message } from '../../domain/types';
import { cn } from '../../lib/cn';
import { sanitizeHtml } from '../../lib/sanitize';
import { snippetOf } from '../../lib/text';
import { formatFullDate, formatListDate } from '../../lib/time';
import { Avatar } from '../ui/primitives';
import { AttachmentList } from './AttachmentList';

interface MessageCardProps {
  message: Message;
  me: Address;
  expanded: boolean;
  now: number;
  onToggle: () => void;
}

export function MessageCard({ message, me, expanded, now, onToggle }: MessageCardProps) {
  const [details, setDetails] = useState(false);
  const body = useMemo(() => sanitizeHtml(message.html), [message.html]);
  const fromMe = sameEmail(message.from, me);
  const sender = fromMe ? 'me' : displayName(message.from);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        className="flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors hover:bg-hover md:px-6"
      >
        <Avatar name={message.from.name} email={message.from.email} size={32} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className={cn('truncate text-sm', message.unread ? 'font-semibold text-ink' : 'text-ink')}>{sender}</span>
            <span className="ml-auto shrink-0 text-xs text-ink-3">{formatListDate(message.date, now)}</span>
          </span>
          <span className="block truncate text-sm text-ink-3">{snippetOf(message.text, 140)}</span>
        </span>
        {message.attachments.length > 0 && <Paperclip className="size-4 shrink-0 text-ink-3" />}
      </button>
    );
  }

  return (
    <article aria-label={`Message from ${sender}`} className="border-b border-line px-4 py-4 md:px-6 md:py-5">
      <header className="flex items-start gap-3">
        <Avatar name={message.from.name} email={message.from.email} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-medium text-ink">{sender}</span>
            {!fromMe && <span className="hidden truncate text-xs text-ink-3 sm:inline">&lt;{message.from.email}&gt;</span>}
          </div>
          <button
            type="button"
            onClick={() => setDetails((d) => !d)}
            aria-expanded={details}
            className="mt-0.5 flex max-w-full items-center gap-1 text-left text-xs text-ink-3 hover:text-ink-2"
          >
            <span className="truncate">{details ? 'hide details' : `to ${recipientLine(message.to, me)}`}</span>
            <ChevronDown className={cn('size-3.5 shrink-0 transition-transform', details && 'rotate-180')} />
          </button>
          {details && (
            <dl className="mt-2 grid grid-cols-[48px_1fr] gap-x-3 gap-y-1 text-xs text-ink-3">
              <dt>From</dt>
              <dd className="break-all text-ink-2">{`${message.from.name || ''} <${message.from.email}>`}</dd>
              <dt>To</dt>
              <dd className="break-all text-ink-2">{message.to.map((a) => `${displayName(a)} <${a.email}>`).join(', ')}</dd>
              {message.cc.length > 0 && (
                <>
                  <dt>Cc</dt>
                  <dd className="break-all text-ink-2">{message.cc.map((a) => a.email).join(', ')}</dd>
                </>
              )}
              <dt>Date</dt>
              <dd className="text-ink-2">{formatFullDate(message.date)}</dd>
            </dl>
          )}
        </div>
        <div className="flex shrink-0 items-start gap-1">
          <time className="whitespace-nowrap pt-0.5 text-xs text-ink-3" dateTime={new Date(message.date).toISOString()}>
            {formatListDate(message.date, now)}
          </time>
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse message"
            className="flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-hover hover:text-ink"
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      </header>
      <div
        className="mail-html mt-4 min-w-0 break-words text-[15px] leading-relaxed text-ink"
        dangerouslySetInnerHTML={{ __html: body }}
      />
      <AttachmentList attachments={message.attachments} />
    </article>
  );
}

function recipientLine(list: Address[], me: Address): string {
  if (list.length === 0) return 'no one';
  const names = list.map((a) => (sameEmail(a, me) ? 'me' : displayName(a)));
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, ${names[1]} and ${names.length - 2} more`;
}

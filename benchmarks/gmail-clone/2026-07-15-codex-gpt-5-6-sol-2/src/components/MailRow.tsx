import {
  Archive,
  Clock3,
  Mail,
  MailOpen,
  Paperclip,
  RotateCcw,
  Star,
  Trash2,
} from 'lucide-react';
import type { MouseEvent } from 'react';

import type { MailboxId, MailThread } from '../domain/mail';
import { formatMailboxTime } from '../lib/format';
import { IconButton } from './IconButton';

interface MailRowProps {
  thread: MailThread;
  currentMailbox: MailboxId;
  isSelected: boolean;
  onSelect: (threadId: string) => void;
  onOpen: (threadId: string) => void;
  onStar: (threadId: string) => void;
  onToggleRead: (threadId: string) => void;
  onArchive: (threadId: string) => void;
  onTrash: (threadId: string) => void;
  onSnooze: (threadId: string) => void;
  onRestore: (threadId: string) => void;
  onDeleteForever: (threadId: string) => void;
}

function stopRowEvent(event: MouseEvent): void {
  event.stopPropagation();
}

export function MailRow({
  thread,
  currentMailbox,
  isSelected,
  onSelect,
  onOpen,
  onStar,
  onToggleRead,
  onArchive,
  onTrash,
  onSnooze,
  onRestore,
  onDeleteForever,
}: MailRowProps) {
  const lastMessage = thread.messages.at(-1);
  const senderNames = thread.participants.map((participant) => participant.name).join(', ');
  const mailboxSender = currentMailbox === 'sent' ? `To: ${senderNames}` : senderNames;
  const messageCount = thread.messages.length > 1 ? thread.messages.length : null;
  const hasAttachments = thread.messages.some((message) => message.attachments.length > 0);
  const canArchive = thread.folder === 'inbox';
  const canSnooze = thread.folder === 'inbox' || thread.folder === 'archive';

  if (!lastMessage) return null;

  return (
    <article
      className={`mail-row${thread.isRead ? '' : ' mail-row--unread'}${
        isSelected ? ' mail-row--selected' : ''
      }`}
      tabIndex={0}
      role="listitem"
      onClick={() => onOpen(thread.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          onOpen(thread.id);
        }
      }}
      aria-label={`${thread.isRead ? '' : 'Unread '}message from ${mailboxSender}: ${thread.subject}`}
    >
      <div className="mail-row__leading" onClick={stopRowEvent}>
        <label className="check-control" aria-label={`Select ${thread.subject}`}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(thread.id)}
          />
          <span />
        </label>
        <IconButton
          label={thread.isStarred ? 'Remove star' : 'Add star'}
          size="small"
          className={thread.isStarred ? 'star-button star-button--active' : 'star-button'}
          aria-pressed={thread.isStarred}
          onClick={() => onStar(thread.id)}
        >
          <Star aria-hidden="true" fill={thread.isStarred ? 'currentColor' : 'none'} />
        </IconButton>
        <span
          className={`importance-marker${thread.isImportant ? ' importance-marker--active' : ''}`}
          title={thread.isImportant ? 'Marked important' : 'Not marked important'}
          aria-label={thread.isImportant ? 'Important' : 'Not important'}
        />
      </div>

      <div className="mail-row__sender">
        <span className="mail-row__sender-name">{mailboxSender}</span>
        {messageCount ? <span className="mail-row__count">{messageCount}</span> : null}
      </div>

      <div className="mail-row__content">
        <div className="mail-row__copy">
          {thread.labels.slice(0, 2).map((label) => (
            <span className={`label-chip label-chip--${label.toLocaleLowerCase()}`} key={label}>
              {label}
            </span>
          ))}
          <span className="mail-row__subject">{thread.subject || '(no subject)'}</span>
          <span className="mail-row__separator"> - </span>
          <span className="mail-row__snippet">{thread.snippet}</span>
        </div>
        {hasAttachments ? <Paperclip className="mail-row__attachment" aria-label="Has attachments" /> : null}
      </div>

      <time className="mail-row__time" dateTime={lastMessage.timestamp}>
        {formatMailboxTime(lastMessage.timestamp)}
      </time>

      <div className="mail-row__actions" onClick={stopRowEvent}>
        {thread.folder === 'trash' ? (
          <>
            <IconButton label="Restore" size="small" onClick={() => onRestore(thread.id)}>
              <RotateCcw aria-hidden="true" />
            </IconButton>
            <IconButton label="Delete forever" size="small" onClick={() => onDeleteForever(thread.id)}>
              <Trash2 aria-hidden="true" />
            </IconButton>
          </>
        ) : (
          <>
            {canArchive ? (
              <IconButton label="Archive" size="small" onClick={() => onArchive(thread.id)}>
                <Archive aria-hidden="true" />
              </IconButton>
            ) : null}
            <IconButton label="Delete" size="small" onClick={() => onTrash(thread.id)}>
              <Trash2 aria-hidden="true" />
            </IconButton>
            <IconButton
              label={thread.isRead ? 'Mark as unread' : 'Mark as read'}
              size="small"
              onClick={() => onToggleRead(thread.id)}
            >
              {thread.isRead ? <Mail aria-hidden="true" /> : <MailOpen aria-hidden="true" />}
            </IconButton>
            {canSnooze ? (
              <IconButton label="Snooze" size="small" onClick={() => onSnooze(thread.id)}>
                <Clock3 aria-hidden="true" />
              </IconButton>
            ) : null}
          </>
        )}
      </div>
    </article>
  );
}

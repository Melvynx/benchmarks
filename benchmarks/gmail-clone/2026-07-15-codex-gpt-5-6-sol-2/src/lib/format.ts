import type { MailboxId } from '../domain/mail';

const ONE_DAY = 86_400_000;

export const MAILBOX_TITLES: Record<MailboxId, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  sent: 'Sent',
  drafts: 'Drafts',
  archive: 'Archive',
  trash: 'Trash',
};

export function formatMailboxTime(timestamp: string): string {
  const value = new Date(timestamp);
  const now = new Date();
  const dayDifference = Math.floor((now.getTime() - value.getTime()) / ONE_DAY);

  if (value.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat('en', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(value);
  }

  if (dayDifference < 7) {
    return new Intl.DateTimeFormat('en', { weekday: 'short' }).format(value);
  }

  if (value.getFullYear() === now.getFullYear()) {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
    }).format(value);
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(value);
}

export function formatFullDate(timestamp: string): string {
  return new Intl.DateTimeFormat('en', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toLocaleUpperCase();
}

export function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`;
}

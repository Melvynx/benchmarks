import type { Address, Message, Thread } from './types';

export const lastMessage = (thread: Thread): Message => thread.messages[thread.messages.length - 1];
export const lastDate = (thread: Thread): number => lastMessage(thread).date;
export const isUnread = (thread: Thread): boolean => thread.messages.some((m) => m.unread);
export const isExcluded = (thread: Thread): boolean => thread.location === 'spam' || thread.location === 'trash';
export const sentBy = (thread: Thread, email: string): boolean =>
  thread.messages.some((m) => m.from.email === email);
export const displayName = (address: Address): string => address.name || address.email;
export const sameEmail = (a: Address, b: Address): boolean =>
  a.email.trim().toLowerCase() === b.email.trim().toLowerCase();
export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const sortRecent = (threads: Thread[]): Thread[] => [...threads].sort((a, b) => lastDate(b) - lastDate(a));

export function threadBytes(thread: Thread): number {
  return thread.messages.reduce(
    (sum, m) => sum + m.text.length + m.attachments.reduce((acc, a) => acc + a.size, 0),
    0,
  );
}

/** "Priya Raman, me 3" style sender line, Gmail-like. */
export function senderLine(thread: Thread, myEmail: string): string {
  const seen: string[] = [];
  for (const m of thread.messages) {
    const label = m.from.email === myEmail ? 'me' : displayName(m.from);
    if (!seen.includes(label)) seen.push(label);
  }
  const names = seen.slice(0, 3).join(', ');
  return thread.messages.length > 1 ? `${names} ${thread.messages.length}` : names;
}

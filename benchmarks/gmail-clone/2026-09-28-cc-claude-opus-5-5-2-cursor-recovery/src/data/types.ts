export type Category = 'primary' | 'promotions' | 'social' | 'updates';

export interface Contact {
  name: string;
  email: string;
  /** Optional organisation shown in hover cards. */
  org?: string;
  /** Brand/bot senders never auto-reply and render a square-ish logo avatar. */
  kind?: 'person' | 'brand';
  /** Avatar background colour. Derived from the email when omitted. */
  color?: string;
}

export type AttachmentKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'slides' | 'zip' | 'audio' | 'video' | 'file';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
  /** Plain-text excerpt used by the local document previewer. */
  preview?: string;
  /** data: URL for user-uploaded files small enough to persist. */
  dataUrl?: string;
  mime?: string;
}

export interface Message {
  id: string;
  threadId: string;
  from: Contact;
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  date: number;
  /** Sanitised HTML body. */
  html: string;
  /** Plain text version used for snippets and search. */
  text: string;
  attachments: Attachment[];
  /** Quoted history (rendered behind the "…" toggle). */
  quoted?: string;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  category: Category;
  labels: string[];
  unread: boolean;
  starred: boolean;
  important: boolean;
  inInbox: boolean;
  trashed: boolean;
  spam: boolean;
  snoozedUntil: number | null;
  /** Set when a snoozed conversation returns so the row can show "Snoozed". */
  unsnoozedAt?: number | null;
  muted?: boolean;
  trashedAt?: number | null;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  textColor: string;
  hidden?: boolean;
}

export interface Draft {
  id: string;
  /** When set, the draft is a reply/forward inside this conversation. */
  threadId: string | null;
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  subject: string;
  html: string;
  attachments: Attachment[];
  quoted?: string;
  updatedAt: number;
  scheduledAt?: number | null;
  /** True while the draft sits in the undo-send window (hidden from Drafts and Scheduled). */
  outgoing?: boolean;
}

/** A simulated incoming message waiting to be delivered (e.g. a contact replying to mail you sent). */
export interface Incoming {
  id: string;
  threadId: string | null;
  from: Contact;
  to: Contact[];
  subject: string;
  text: string;
  category: 'primary' | 'promotions' | 'social' | 'updates';
  deliverAt: number;
  labels?: string[];
  important?: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes?: string;
  done: boolean;
  due?: number | null;
  threadId?: string | null;
  createdAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  location?: string;
  color: string;
}

/* ---------- Seed authoring format ---------- */

/**
 * Relative time used by seeds. Resolved against the moment the mailbox is first created.
 *  - "12m"        → 12 minutes ago
 *  - "3h"         → 3 hours ago
 *  - "2d@14:05"   → 2 days ago at 14:05 local time
 *  - "40d@09:30"  → 40 days ago at 09:30 local time
 */
export type Ago = string;

export interface SeedAttachment {
  name: string;
  /** Bytes. */
  size: number;
  preview?: string;
}

export interface SeedMessage {
  /** Contact key from contacts.ts, or "me". */
  from: string;
  /** Contact keys or "me". */
  to: string[];
  cc?: string[];
  at: Ago;
  /**
   * Plain-text body. Blank lines separate paragraphs; lines starting with "- " become bullets;
   * URLs are auto-linked. Ignored when `html` is provided.
   */
  body?: string;
  /** Pre-styled HTML body for newsletters, receipts and other rich mail. */
  html?: string;
  attachments?: SeedAttachment[];
}

export interface SeedThread {
  id: string;
  subject: string;
  category: Category;
  messages: SeedMessage[];
  labels?: string[];
  starred?: boolean;
  important?: boolean;
  /** Defaults to false. */
  unread?: boolean;
  /** Defaults to "inbox". "archive" = only in All Mail. "sent" = conversation started by me, not in inbox. */
  location?: 'inbox' | 'archive' | 'spam' | 'trash' | 'sent';
  /** Hours from now until the conversation reappears in the inbox. */
  snoozeHours?: number;
}

export interface SeedDraft {
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  at: Ago;
  /** Hours from now for scheduled send. */
  scheduleInHours?: number;
  /** Reply draft attached to a seeded thread id. */
  threadId?: string;
}

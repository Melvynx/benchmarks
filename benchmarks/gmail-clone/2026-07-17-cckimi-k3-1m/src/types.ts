export type Category = 'primary' | 'social' | 'promotions' | 'updates';

export type SystemLabel = 'INBOX' | 'SENT' | 'DRAFT' | 'TRASH' | 'SPAM';

export type MailboxId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'sent'
  | 'drafts'
  | 'all'
  | 'spam'
  | 'trash';

export interface Attachment {
  id: string;
  name: string;
  /** size in bytes */
  size: number;
  mime: string;
}

export interface Message {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  date: number;
  /** sanitized HTML authored by the app */
  body: string;
  attachments?: Attachment[];
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  labels: string[]; // system labels + custom label ids
  category?: Category;
  starred: boolean;
  read: boolean;
  snoozeUntil?: number;
  /** present when labels includes DRAFT */
  draftTo?: string[];
  draftCc?: string[];
  draftBcc?: string[];
  draftBody?: string;
  draftAttachments?: Attachment[];
  /** threads this draft replies to (kept in the same conversation) */
  replyAll?: boolean;
  /** last edit time, used for drafts ordering */
  updatedAt?: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  name: string;
  email: string;
  autoReply?: boolean;
}

export interface Account {
  name: string;
  email: string;
}

export type View =
  | { kind: 'mailbox'; mailbox: MailboxId; category?: Category }
  | { kind: 'label'; labelId: string }
  | { kind: 'search'; query: string };

export interface ComposeState {
  draftId: string | null;
  mode: 'new' | 'reply' | 'replyAll' | 'forward';
  threadId?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: Attachment[];
  showCcBcc: boolean;
  minimized: boolean;
  showFormatting: boolean;
}

export interface Toast {
  id: string;
  message: string;
  actionLabel?: string;
  /** key into the pending undo registry (not persisted) */
  undoKey?: string;
}

export type Density = 'default' | 'comfortable' | 'compact';
export type Theme = 'light' | 'dark';

export interface Settings {
  theme: Theme;
  density: Density;
  signature: string;
}

export const SYSTEM_LABELS: SystemLabel[] = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM'];

export function isSystemLabel(id: string): id is SystemLabel {
  return (SYSTEM_LABELS as string[]).includes(id);
}

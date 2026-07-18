export type MailboxId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'sent'
  | 'drafts'
  | 'archive'
  | 'trash';

export type StoredFolder = Exclude<MailboxId, 'starred' | 'snoozed'>;
export type MailCategory = 'primary' | 'promotions' | 'social' | 'updates';

export interface Contact {
  name: string;
  email: string;
  avatar: string;
  color: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  kind: 'pdf' | 'image' | 'document' | 'sheet' | 'archive';
  accent: string;
}

export interface MailMessage {
  id: string;
  sender: Contact;
  recipients: Contact[];
  timestamp: string;
  body: string[];
  attachments: Attachment[];
}

export interface MailThread {
  id: string;
  subject: string;
  snippet: string;
  participants: Contact[];
  messages: MailMessage[];
  folder: StoredFolder;
  category: MailCategory;
  labels: string[];
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  snoozedUntil?: string;
  draft?: ComposeDraft;
}

export interface ComposeDraft {
  id: string;
  replyToThreadId?: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  isMinimized: boolean;
  updatedAt: string;
}

export interface ToastState {
  id: number;
  message: string;
  actionLabel?: string;
  action?: 'undo';
}

export const SYSTEM_LABELS = ['Work', 'Finance', 'Travel', 'Receipts'] as const;

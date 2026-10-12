export type Category = 'primary' | 'promotions' | 'social' | 'updates';

export type FolderId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'important'
  | 'sent'
  | 'scheduled'
  | 'drafts'
  | 'all'
  | 'spam'
  | 'trash';

export interface Person {
  name: string;
  email: string;
}

export interface Contact extends Person {
  kind: 'person' | 'org';
  title?: string;
  org?: string;
  phone?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  dataUrl?: string;
}

export type MessageStatus = 'received' | 'sent' | 'draft' | 'scheduled';

export interface Message {
  id: string;
  threadId: string;
  from: Person;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  date: number;
  body: string;
  quote?: string;
  attachments: Attachment[];
  status: MessageStatus;
  scheduledAt?: number;
  replyMode?: ComposeMode;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  labelIds: string[];
  category: Category;
  inInbox: boolean;
  starred: boolean;
  important: boolean;
  unread: boolean;
  trashed: boolean;
  spam: boolean;
  muted?: boolean;
  snoozedUntil?: number | null;
  returnedAt?: number;
  arrivedAt?: number;
}

export type LabelColor = 'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'gray';

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
  hidden?: boolean;
}

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

export interface DraftFields {
  to: Person[];
  cc: Person[];
  bcc: Person[];
  subject: string;
  body: string;
  quote?: string;
  attachments: Attachment[];
}

export interface PendingReply {
  threadId: string;
  sourceMessageId: string;
  at: number;
  from: Person;
}

export interface IncomingItem {
  thread: Thread;
  mergeInto?: string;
}

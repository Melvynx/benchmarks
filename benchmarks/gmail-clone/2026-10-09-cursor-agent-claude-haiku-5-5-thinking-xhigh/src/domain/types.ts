export const FOLDERS = [
  'inbox',
  'starred',
  'snoozed',
  'sent',
  'drafts',
  'scheduled',
  'all',
  'spam',
  'trash',
] as const;
export type Folder = (typeof FOLDERS)[number];

export const FOLDER_LABELS: Record<Folder, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  sent: 'Sent',
  drafts: 'Drafts',
  scheduled: 'Scheduled',
  all: 'All Mail',
  spam: 'Spam',
  trash: 'Trash',
};

/** Where a conversation physically lives. Folders are derived from this plus flags. */
export type Location = 'inbox' | 'archive' | 'spam' | 'trash';

export const CATEGORIES = ['primary', 'social', 'promotions', 'updates'] as const;
export type Category = (typeof CATEGORIES)[number];

export const LABEL_COLORS = ['blue', 'red', 'green', 'amber', 'violet', 'pink', 'teal', 'slate'] as const;
export type LabelColor = (typeof LABEL_COLORS)[number];

export type AttachmentKind = 'pdf' | 'image' | 'sheet' | 'doc' | 'slides' | 'archive' | 'file';
export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward';

export interface Address {
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
}

export interface Message {
  id: string;
  from: Address;
  to: Address[];
  cc: Address[];
  date: number;
  html: string;
  text: string;
  attachments: Attachment[];
  unread: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  location: Location;
  category: Category;
  starred: boolean;
  important: boolean;
  labelIds: string[];
  snoozedUntil: number | null;
}

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface Draft {
  id: string;
  threadId: string | null;
  mode: ComposeMode;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  html: string;
  attachments: Attachment[];
  updatedAt: number;
  /** True for a brand-new compose that the user has not typed into yet. */
  pristine?: boolean;
}

/**
 * undo: waiting for the undo-send window to close
 * scheduled: user-chosen send time
 * queued: sent while offline, flushed on reconnect
 */
export type OutgoingKind = 'undo' | 'scheduled' | 'queued';

export interface Outgoing {
  id: string;
  kind: OutgoingKind;
  sendAt: number;
  createdAt: number;
  draft: Draft;
}

export interface Settings {
  signature: string;
  theme: 'light' | 'dark' | 'system';
  density: 'comfortable' | 'cozy' | 'compact';
  readingPane: boolean;
  undoSendSeconds: 5 | 10 | 30;
  categories: boolean;
  offline: boolean;
  incomingMail: boolean;
}

export interface MailData {
  account: Address;
  threads: Thread[];
  labels: Label[];
  drafts: Draft[];
  outgoing: Outgoing[];
  settings: Settings;
  recentSearches: string[];
  nextIncomingAt: number;
}

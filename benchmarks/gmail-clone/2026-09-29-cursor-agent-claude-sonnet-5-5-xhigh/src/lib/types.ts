export interface Person {
  name: string;
  email: string;
}

export type Category = 'primary' | 'social' | 'promotions' | 'updates';
export const CATEGORIES: Category[] = ['primary', 'promotions', 'social', 'updates'];

export type AttachmentKind =
  | 'pdf'
  | 'image'
  | 'doc'
  | 'sheet'
  | 'slides'
  | 'zip'
  | 'calendar'
  | 'code'
  | 'audio'
  | 'video'
  | 'other';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
  art?: number;
  title?: string;
  lines?: string[];
  dataUrl?: string;
}

export type Rsvp = 'none' | 'yes' | 'maybe' | 'no';

export interface Invite {
  title: string;
  start: number;
  end: number;
  where: string;
  organizer: Person;
  attendees: Person[];
  rsvp: Rsvp;
}

export interface Message {
  id: string;
  threadId: string;
  from: Person;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  date: number;
  html: string;
  snippet: string;
  unread: boolean;
  starred: boolean;
  attachments: Attachment[];
  invite?: Invite;
  unsubscribe?: boolean;
  trashed?: boolean;
  mailedBy?: string;
}

export interface Thread {
  id: string;
  subject: string;
  messageIds: string[];
  labelIds: string[];
  inbox: boolean;
  trashed: boolean;
  spam: boolean;
  important: boolean;
  category: Category;
  snoozeUntil?: number;
  snoozedAt?: number;
  lastDate: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  hidden?: boolean;
}

export type DraftKind = 'new' | 'reply' | 'replyAll' | 'forward';

export interface Draft {
  id: string;
  kind: DraftKind;
  mode: 'window' | 'inline';
  threadId?: string;
  replyToId?: string;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  subject: string;
  html: string;
  quoteHtml: string;
  attachments: Attachment[];
  updatedAt: number;
  createdAt: number;
  sendAt?: number;
}

export interface Contact extends Person {
  color: string;
  freq: number;
  bot?: boolean;
  persona?: 'warm' | 'brisk' | 'formal' | 'playful';
}

export type Theme = 'light' | 'dark' | 'system';
export type Accent = 'blue' | 'violet' | 'teal' | 'rose' | 'amber';
export type Density = 'compact' | 'default' | 'comfortable';
export type Pane = 'off' | 'right';
export type AfterAction = 'list' | 'newer' | 'older';

export interface Settings {
  theme: Theme;
  accent: Accent;
  density: Density;
  pane: Pane;
  categories: Record<Category, boolean>;
  tabsEnabled: boolean;
  undoSendSeconds: number;
  defaultReplyAll: boolean;
  afterAction: AfterAction;
  shortcuts: boolean;
  showSnippets: boolean;
  showImportant: boolean;
  signatureEnabled: boolean;
  signature: string;
  sidebarCollapsed: boolean;
  autoReplies: boolean;
  pageSize: number;
}

export interface PendingIncoming {
  id: string;
  dueAt: number;
  threadId: string;
  from: Person;
  subject: string;
  html: string;
  inReplyTo?: string;
}

export interface MailData {
  threads: Record<string, Thread>;
  messages: Record<string, Message>;
  drafts: Record<string, Draft>;
  labels: Label[];
  contacts: Contact[];
  pending: PendingIncoming[];
  recentSearches: string[];
}

export const SYSTEM_VIEWS = [
  'inbox',
  'starred',
  'snoozed',
  'important',
  'sent',
  'drafts',
  'scheduled',
  'all',
  'spam',
  'trash',
] as const;
export type SystemView = (typeof SYSTEM_VIEWS)[number];

export type ViewKey = SystemView | 'label' | 'search' | 'settings';

export interface Route {
  view: ViewKey;
  param?: string;
  threadId?: string;
  page: number;
  tab: Category;
}

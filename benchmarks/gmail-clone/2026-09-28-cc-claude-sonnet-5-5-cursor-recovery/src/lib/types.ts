export interface Address {
  name: string;
  email: string;
}

export type CategoryId = 'primary' | 'promotions' | 'social' | 'updates';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Present for files the user attached locally (small files only). */
  dataUrl?: string;
}

export interface Message {
  id: string;
  threadId: string;
  from: Address;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  date: number;
  /** Message's own body HTML (without quoted history). */
  html: string;
  /** Quoted previous message HTML (shown collapsed behind an ellipsis). */
  quoteHtml?: string;
  /** Plain-text version of `html`, used for snippets and search. */
  text: string;
  attachments: Attachment[];
  unread: boolean;
  draft: boolean;
  /** Epoch ms at which a scheduled message will be delivered. */
  scheduledAt?: number;
  /** Bulk sender that offers one-click unsubscribe. */
  unsubscribe?: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  labelIds: string[];
  category: CategoryId;
  inbox: boolean;
  starred: boolean;
  important: boolean;
  trashed: boolean;
  trashedAt?: number;
  spam: boolean;
  snoozedUntil?: number;
  muted?: boolean;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  /** Avatar background colour (CSS colour). Derived from the name when absent. */
  color?: string;
  org?: string;
  title?: string;
  /** Whether the contact answers messages sent from this mailbox (simulated). */
  replies?: boolean;
}

export type Density = 'default' | 'comfortable' | 'compact';
export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentId = 'blue' | 'coral' | 'green' | 'violet';
export type ReadingPane = 'off' | 'right';

export interface Settings {
  density: Density;
  theme: ThemeMode;
  accent: AccentId;
  categoriesEnabled: Record<CategoryId, boolean>;
  readingPane: ReadingPane;
  undoSendSeconds: 5 | 10 | 20 | 30;
  signature: string;
  signatureEnabled: boolean;
  keyboardShortcuts: boolean;
  smartReplies: boolean;
  hoverActions: boolean;
  autoAdvance: 'list' | 'newer' | 'older';
  simulateIncoming: boolean;
  sidebarCollapsed: boolean;
  previewSnippets: boolean;
}

export interface PendingDelivery {
  id: string;
  /** Epoch ms when the simulated message arrives. */
  at: number;
  threadId: string;
  contactId: string;
  /** Id of the message being replied to (used for the quoted history). */
  inReplyTo: string;
}

export interface MailState {
  version: number;
  seededAt: number;
  threads: Record<string, Thread>;
  labels: Label[];
  contacts: Contact[];
  settings: Settings;
  recentSearches: string[];
  pending: PendingDelivery[];
}

export type SystemFolder =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'important'
  | 'sent'
  | 'drafts'
  | 'scheduled'
  | 'all'
  | 'spam'
  | 'trash';

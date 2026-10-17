export type SystemFolder =
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

export type InboxCategory = 'primary' | 'promotions' | 'social' | 'updates';

export type DensityMode = 'default' | 'comfortable' | 'compact';

export type SplitPaneMode = 'none' | 'right' | 'bottom';

export type ThemeMode = 'light' | 'dark';

export interface CustomLabel {
  id: string;
  name: string;
  color: string; // hex or tailwind token key
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  role?: string;
  company?: string;
  avatarColor: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'spreadsheet' | 'image' | 'archive' | 'code' | 'calendar' | 'doc';
  previewTitle?: string;
  previewContent?: string;
  previewMeta?: Record<string, string>;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  sender: {
    name: string;
    email: string;
    avatarColor: string;
    role?: string;
  };
  to: { name: string; email: string }[];
  cc?: { name: string; email: string }[];
  bcc?: { name: string; email: string }[];
  timestamp: string; // ISO string
  displayTime: string; // e.g., "10:42 AM", "Oct 12"
  fullDate: string; // e.g., "Wed, Oct 14, 2026, 10:42 AM"
  body: string; // HTML or structured rich text
  attachments?: Attachment[];
  isDraft?: boolean;
}

export interface EmailThread {
  id: string;
  subject: string;
  snippet: string;
  category: InboxCategory;
  folder: 'inbox' | 'archive' | 'sent' | 'drafts' | 'spam' | 'trash' | 'scheduled';
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  isSnoozed?: boolean;
  snoozedUntil?: string;
  scheduledFor?: string;
  labels: string[]; // array of CustomLabel IDs
  messages: EmailMessage[];
  lastActivityAt: string; // ISO timestamp for sorting
  displayDate: string; // compact date for list view
  smartReplies?: string[];
}

export interface ComposeDraftState {
  id: string;
  threadId?: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  attachments: Attachment[];
  isMinimized: boolean;
  isMaximized: boolean;
  lastSavedAt?: string;
}

export interface AdvancedSearchFilter {
  query: string;
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  doesntHave: string;
  hasAttachment: boolean;
  onlyUnread: boolean;
  onlyStarred: boolean;
  dateRange: 'any' | '1d' | '7d' | '30d';
  labelId: string;
}

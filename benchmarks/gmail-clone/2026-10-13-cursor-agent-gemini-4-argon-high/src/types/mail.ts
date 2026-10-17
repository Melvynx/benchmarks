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

export type ReadingPaneMode = 'none' | 'right' | 'bottom';

export type ThemeMode = 'light' | 'dark';

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
  type: 'pdf' | 'image' | 'spreadsheet' | 'code' | 'archive' | 'calendar' | 'doc';
  previewTitle?: string;
  previewContent?: string;
  previewMeta?: Record<string, string>;
}

export interface CalendarInvite {
  title: string;
  dateStr: string;
  timeStr: string;
  location: string;
  organizer: string;
  attendees: string[];
  rsvpStatus?: 'yes' | 'maybe' | 'no' | null;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  sender: Contact;
  to: Contact[];
  cc?: Contact[];
  bcc?: Contact[];
  timestamp: string; // ISO string
  displayTime: string;
  fullDateStr: string;
  body: string; // Rich HTML or structured paragraphs
  snippet: string;
  attachments?: Attachment[];
  calendarInvite?: CalendarInvite;
  isStarred?: boolean;
  isDraft?: boolean;
}

export interface EmailThread {
  id: string;
  subject: string;
  folder: 'inbox' | 'archive' | 'sent' | 'drafts' | 'spam' | 'trash' | 'snoozed' | 'scheduled';
  category: InboxCategory;
  labels: string[]; // custom label IDs
  isUnread: boolean;
  isStarred: boolean;
  isImportant: boolean;
  snoozedUntil?: string;
  scheduledFor?: string;
  messages: EmailMessage[];
  lastActivityIso: string;
  displayDate: string;
}

export interface CustomLabel {
  id: string;
  name: string;
  color: string; // hex background
  textColor: string; // hex text
  darkBgColor: string;
  darkTextColor: string;
}

export interface ComposeDraft {
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
  lastSaved?: string;
  replyToMessageId?: string;
}

export interface SearchFilters {
  query: string;
  from: string;
  to: string;
  subject: string;
  hasWords: string;
  doesntHave: string;
  hasAttachment: boolean;
  isUnread: boolean;
  isStarred: boolean;
  dateRange: 'any' | '1d' | '7d' | '30d';
  labelId: string;
}

export interface MailSettings {
  theme: ThemeMode;
  density: DensityMode;
  readingPane: ReadingPaneMode;
  showCategoryTabs: boolean;
  keyboardShortcuts: boolean;
  vacationResponder: boolean;
}

export interface UndoToast {
  id: string;
  message: string;
  onUndo?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

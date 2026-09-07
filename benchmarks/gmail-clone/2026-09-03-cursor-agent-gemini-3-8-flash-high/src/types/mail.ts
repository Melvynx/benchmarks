export type FolderId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'spam'
  | 'important'
  | 'all';

export type CategoryId = 'primary' | 'promotions' | 'social' | 'updates' | 'forums';

export type DensityMode = 'default' | 'comfortable' | 'compact';

export interface Attachment {
  id: string;
  filename: string;
  size: string;
  type: 'pdf' | 'image' | 'archive' | 'doc' | 'sheet' | 'code' | 'other';
  url?: string;
  previewUrl?: string;
}

export interface EmailContact {
  name: string;
  email: string;
  avatar?: string;
}

export interface Message {
  id: string;
  threadId: string;
  from: EmailContact;
  to: EmailContact[];
  cc?: EmailContact[];
  bcc?: EmailContact[];
  subject: string;
  body: string; // HTML or rich text
  snippet: string;
  date: number; // Epoch timestamp
  formattedDate?: string;
  read: boolean;
  starred: boolean;
  important: boolean;
  labels: string[]; // custom label ids or system labels
  category: CategoryId;
  attachments?: Attachment[];
  snoozedUntil?: number;
  isDraft?: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  snippet: string;
  messages: Message[];
  lastMessageDate: number;
  participants: EmailContact[];
  unreadCount: number;
  isStarred: boolean;
  isImportant: boolean;
  labels: string[];
  category: CategoryId;
  folder: FolderId;
  hasAttachments: boolean;
  snoozedUntil?: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  textColor: string;
  isSystem?: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  storageUsed: string;
  storageLimit: string;
  storagePercent: number;
}

export interface ComposeDraft {
  id?: string;
  threadId?: string;
  to: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
  subject: string;
  body: string;
  attachments: Attachment[];
  scheduledTime?: number;
  isReply?: boolean;
  replyToMessageId?: string;
  replyType?: 'reply' | 'replyAll' | 'forward';
}

export interface SearchFilters {
  query: string;
  from?: string;
  to?: string;
  subject?: string;
  hasWords?: string;
  doesntHave?: string;
  hasAttachment?: boolean;
  dateWithin?: string;
  folder?: string;
  category?: string;
}

export interface UndoAction {
  id: string;
  message: string;
  action: () => void;
  timestamp: number;
}

export interface MailSettings {
  density: DensityMode;
  theme: 'light' | 'dark' | 'system';
  signature: string;
  vacationResponder: {
    enabled: boolean;
    subject: string;
    message: string;
  };
  keyboardShortcuts: boolean;
  smartReply: boolean;
  conversationView: boolean;
}

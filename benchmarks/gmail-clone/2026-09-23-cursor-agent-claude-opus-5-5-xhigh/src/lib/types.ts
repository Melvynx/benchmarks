export type FolderId =
  | "inbox"
  | "starred"
  | "snoozed"
  | "important"
  | "sent"
  | "scheduled"
  | "drafts"
  | "all"
  | "spam"
  | "trash";

export type Category = "primary" | "promotions" | "social" | "updates";

export interface Contact {
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  /** Present for files the user attached from disk (small files only). */
  dataUrl?: string;
}

export type MessageStatus = "received" | "sent" | "draft" | "sending" | "scheduled";

export interface Message {
  id: string;
  threadId: string;
  from: Contact;
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  date: number;
  html: string;
  /** Quoted history appended to replies, collapsed behind "•••". */
  quote?: string;
  attachments: Attachment[];
  unread: boolean;
  status: MessageStatus;
  scheduledAt?: number;
}

export interface Thread {
  id: string;
  subject: string;
  messageIds: string[];
  labels: string[];
  inInbox: boolean;
  trashed: boolean;
  spam: boolean;
  starred: boolean;
  important: boolean;
  category: Category;
  snoozedUntil?: number;
  muted?: boolean;
}

export type LabelColor =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blue"
  | "indigo"
  | "purple"
  | "pink";

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export type Density = "default" | "comfortable" | "compact";
export type Theme = "light" | "dark" | "system";
export type ReadingPane = "none" | "right" | "bottom";
export type InboxType = "default" | "unread" | "starred" | "important";

export interface Settings {
  theme: Theme;
  density: Density;
  readingPane: ReadingPane;
  inboxType: InboxType;
  undoSeconds: number;
  signature: string;
  shortcuts: boolean;
  pageSize: number;
  sidebarCollapsed: boolean;
  paneSize: number;
}

export interface PendingDelivery {
  id: string;
  deliverAt: number;
  threadId?: string;
  subject: string;
  from: Contact;
  html: string;
  category: Category;
  attachments?: Attachment[];
  labels?: string[];
  important?: boolean;
}

export type View =
  | { kind: "folder"; id: FolderId }
  | { kind: "category"; id: Category }
  | { kind: "label"; id: string }
  | { kind: "search"; q: string };

export interface Route {
  view: View;
  threadId?: string;
}

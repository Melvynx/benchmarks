export type Category = "primary" | "promotions" | "social" | "updates";
export type Location = "inbox" | "archive" | "spam" | "trash";

export interface Contact {
  name: string;
  email: string;
  color: string;
  kind: "person" | "service";
  org?: string;
  title?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: "pdf" | "image" | "doc" | "sheet" | "slides" | "zip" | "other";
}

export interface Message {
  id: string;
  from: string; // email
  to: string[];
  cc?: string[];
  bcc?: string[];
  date: number;
  html: string;
  quote?: string;
  attachments: Attachment[];
  unread?: boolean;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  labels: string[];
  category: Category;
  location: Location;
  unread: boolean;
  starred: boolean;
  important: boolean;
  snoozedUntil?: number;
  bumpedAt?: number;
}

export type DraftMode = "new" | "reply" | "replyAll" | "forward";

export interface Draft {
  id: string;
  mode: DraftMode;
  threadId?: string;
  inline?: boolean;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  html: string;
  quote?: string;
  attachments: Attachment[];
  updatedAt: number;
  scheduledAt?: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export type Theme = "light" | "dark" | "system";
export type Density = "default" | "comfortable" | "compact";

export interface Settings {
  theme: Theme;
  density: Density;
  readingPane: "none" | "right";
  inboxTabs: boolean;
  pageSize: number;
  undoSeconds: number;
  signature: string;
  shortcuts: boolean;
  sidebarCollapsed: boolean;
  autoReplies: boolean;
}

export interface MailState {
  version: number;
  threads: Thread[];
  drafts: Draft[];
  labels: Label[];
  contacts: Contact[];
  settings: Settings;
  incomingQueue: number;
}

export type ViewId =
  | "inbox"
  | "category"
  | "starred"
  | "snoozed"
  | "important"
  | "sent"
  | "scheduled"
  | "drafts"
  | "all"
  | "spam"
  | "trash"
  | "label"
  | "search"
  | "settings";

export interface Route {
  view: ViewId;
  param?: string;
  threadId?: string;
}

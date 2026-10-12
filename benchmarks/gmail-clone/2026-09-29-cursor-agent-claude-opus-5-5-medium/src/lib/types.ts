export type Category = "primary" | "promotions" | "social" | "updates";

export interface Contact {
  name: string;
  email: string;
}

export type AttachmentKind = "pdf" | "image" | "doc" | "sheet" | "slides" | "zip" | "calendar" | "other";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  kind: AttachmentKind;
  /** Optional data URL for user-attached small files or generated previews */
  dataUrl?: string;
  /** Seed hue used for generated image previews */
  hue?: number;
}

export type Rsvp = "yes" | "maybe" | "no";

export interface CalendarInvite {
  title: string;
  start: number;
  end: number;
  location: string;
  organizer: Contact;
  rsvp?: Rsvp;
}

export interface Message {
  id: string;
  from: Contact;
  to: Contact[];
  cc: Contact[];
  bcc?: Contact[];
  date: number;
  html: string;
  quoteHtml?: string;
  attachments: Attachment[];
  invite?: CalendarInvite;
}

export interface Thread {
  id: string;
  subject: string;
  messages: Message[];
  labelIds: string[];
  category: Category;
  starred: boolean;
  important: boolean;
  unread: boolean;
  inInbox: boolean;
  trashed: boolean;
  spam: boolean;
  snoozedUntil?: number;
  /** When a snoozed thread resurfaces it jumps to the top of the inbox */
  bumpedAt?: number;
  muted?: boolean;
}

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export interface Draft {
  id: string;
  mode: ComposeMode;
  threadId?: string;
  to: Contact[];
  cc: Contact[];
  bcc: Contact[];
  subject: string;
  html: string;
  quoteHtml?: string;
  attachments: Attachment[];
  updatedAt: number;
  scheduledAt?: number;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export type Density = "default" | "comfortable" | "compact";
export type Theme = "light" | "dark" | "system";
export type ReadingPane = "none" | "right";

export interface Settings {
  density: Density;
  theme: Theme;
  readingPane: ReadingPane;
  inboxTabs: boolean;
  undoSeconds: number;
  signature: string;
  shortcuts: boolean;
  pageSize: number;
  simulateIncoming: boolean;
}

export type SystemView =
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

export interface Route {
  view: SystemView | "label" | "search";
  category?: Category;
  labelId?: string;
  query?: string;
  threadId?: string;
}

export interface ComposeWindow {
  draftId: string;
  minimized: boolean;
  maximized: boolean;
}

export interface Toast {
  id: string;
  text: string;
  action?: { label: string; run: () => void };
  secondary?: { label: string; run: () => void };
  duration?: number;
}

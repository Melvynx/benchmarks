export type Category = "primary" | "promotions" | "social" | "updates" | "forums";

export type SystemFolder =
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

export interface Address {
  name: string;
  email: string;
}

export interface Contact extends Address {
  color?: string;
  title?: string;
  company?: string;
  phone?: string;
}

export type AttachmentKind = "pdf" | "image" | "sheet" | "doc" | "calendar" | "text" | "zip" | "audio" | "video" | "other";

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  kind: AttachmentKind;
  /** Seeded attachments are generated on demand from this seed. */
  seed?: { hue: number; title?: string; lines?: string[]; rows?: string[][] };
  /** User-uploaded attachments live in IndexedDB under this key. */
  blobKey?: string;
}

export type MessageStatus = "received" | "sent" | "draft" | "scheduled";

export interface Invite {
  title: string;
  start: number;
  end: number;
  location?: string;
  organizer: Address;
  guests: Address[];
  response?: "yes" | "no" | "maybe";
  videoLink?: string;
}

export interface Message {
  id: string;
  threadId: string;
  from: Address;
  to: Address[];
  cc: Address[];
  bcc: Address[];
  subject: string;
  date: number;
  html: string;
  text: string;
  attachments: Attachment[];
  status: MessageStatus;
  scheduledAt?: number;
  invite?: Invite;
  /** Quoted/trimmed content shown behind the "…" toggle. */
  quoted?: string;
  replyKind?: "new" | "reply" | "replyAll" | "forward";
  inReplyTo?: string;
  /** Signature HTML, rendered beneath the body and kept out of the editable document. */
  signature?: string;
}

export interface Thread {
  id: string;
  subject: string;
  messageIds: string[];
  /** INBOX, SPAM, TRASH, IMPORTANT and user label ids. */
  labels: string[];
  category: Category;
  starred: boolean;
  unread: boolean;
  snoozedUntil?: number;
  /** Timestamp used for ordering after a snooze returns a thread to the inbox. */
  bumpedAt?: number;
  muted?: boolean;
  unsubscribed?: boolean;
}

export interface UserLabel {
  id: string;
  name: string;
  color: string;
  hidden?: boolean;
}

export interface Account {
  name: string;
  email: string;
  color: string;
}

export type Density = "default" | "comfortable" | "compact";
export type Theme = "light" | "dark" | "system";
export type InboxType = "default" | "important" | "unread" | "starred";
export type ReadingPane = "none" | "right" | "below";

export interface Settings {
  theme: Theme;
  density: Density;
  inboxType: InboxType;
  readingPane: ReadingPane;
  categories: Record<Exclude<Category, "primary">, boolean>;
  undoSendSeconds: number;
  pageSize: number;
  keyboardShortcuts: boolean;
  signature: string;
  useSignature: boolean;
  defaultReply: "reply" | "replyAll";
  simulateActivity: boolean;
  showSnippets: boolean;
  showAttachmentChips: boolean;
  hoverActions: boolean;
  autoAdvance: "back" | "newer" | "older";
  navCollapsed: boolean;
  sendAndArchive: boolean;
  importanceMarkers: boolean;
  swipeAction: "archive" | "trash" | "read" | "none";
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  threadId?: string;
  createdAt: number;
  due?: number;
}

export interface Filter {
  id: string;
  query: string;
  actions: {
    skipInbox?: boolean;
    markRead?: boolean;
    star?: boolean;
    label?: string;
    trash?: boolean;
    important?: boolean;
  };
}

export type ViewRef =
  | { kind: "folder"; folder: SystemFolder }
  | { kind: "category"; category: Category }
  | { kind: "label"; labelId: string }
  | { kind: "search"; query: string }
  | { kind: "settings"; tab: string };

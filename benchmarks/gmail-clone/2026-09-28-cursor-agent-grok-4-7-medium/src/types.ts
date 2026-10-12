export type Category = "primary" | "promotions" | "social" | "updates";

export interface Person {
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  mime: string;
  preview: string;
}

export interface Message {
  id: string;
  threadId: string;
  from: Person;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  subject: string;
  body: string;
  date: number;
  read: boolean;
  starred: boolean;
  important: boolean;
  labels: string[];
  category: Category;
  attachments: Attachment[];
  snoozedUntil: number | null;
  sendAt: number | null;
}

export interface CustomLabel {
  id: string;
  name: string;
  color: string;
}

export type Density = "default" | "comfortable" | "compact";
export type ThemeChoice = "light" | "dark" | "system";

export interface Settings {
  density: Density;
  theme: ThemeChoice;
  signature: string;
  signatureOn: boolean;
  previewPane: boolean;
  displayName: string;
}

export interface MailData {
  messages: Message[];
  labels: CustomLabel[];
  settings: Settings;
  recentSearches: string[];
  signedIn: boolean;
}

export type SystemMailbox =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "scheduled"
  | "all"
  | "spam"
  | "trash";

export type Mailbox = SystemMailbox | `label:${string}`;

export interface ThreadSummary {
  threadId: string;
  messages: Message[];
  subject: string;
  snippet: string;
  date: number;
  people: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
  count: number;
  hasAttachment: boolean;
  labelIds: string[];
  hasDraft: boolean;
  category: Category;
  snoozedUntil: number | null;
  sendAt: number | null;
}

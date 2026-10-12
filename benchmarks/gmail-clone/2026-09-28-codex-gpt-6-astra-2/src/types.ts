export type Folder = "inbox" | "archived" | "trash" | "sent";
export type Category = "primary" | "updates" | "promotions";
export type View =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "trash"
  | "all"
  | `label:${string}`;

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  data?: string;
}

export interface Message {
  id: string;
  name: string;
  email: string;
  to: string;
  cc?: string;
  bcc?: string;
  date: string;
  body: string;
  html?: string;
  attachments?: Attachment[];
}

export interface Thread {
  id: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  brand?: string;
  subject: string;
  preview: string;
  date: string;
  unread: boolean;
  starred: boolean;
  important: boolean;
  folder: Folder;
  previousFolder?: Folder;
  category: Category;
  labels: string[];
  snoozedUntil?: string;
  messages: Message[];
}

export interface Draft {
  id: string;
  to: string[];
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  html: string;
  attachments: Attachment[];
  updatedAt: string;
  replyTo?: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}
export interface Settings {
  theme: "light" | "dark";
  density: "comfortable" | "compact";
  signature: boolean;
}
export interface Mailbox {
  version: 1;
  threads: Thread[];
  drafts: Draft[];
  labels: Label[];
  settings: Settings;
  notes: string;
  tasks: { id: string; text: string; done: boolean }[];
}

export const ACCOUNT = {
  name: "Alex Morgan",
  email: "alex@studio.design",
  initials: "AM",
};

export type Dialog =
  | "help"
  | "settings"
  | "search"
  | "labels"
  | "create-label"
  | "snooze"
  | "empty-trash"
  | null;
export type Filter = "all" | "unread" | "starred" | "attachments";

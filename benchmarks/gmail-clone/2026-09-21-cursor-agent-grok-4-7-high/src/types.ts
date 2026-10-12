export type Category = "primary" | "social" | "promotions" | "updates";

export type Contact = {
  name: string;
  email: string;
};

export type Attachment = {
  id: string;
  name: string;
  size: number;
  mime: string;
  dataUrl?: string;
};

export type Message = {
  id: string;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  bcc?: Contact[];
  date: string;
  body: string;
  bodyHtml?: string;
  quote?: string;
  attachments?: Attachment[];
  confidential?: boolean;
};

export type Thread = {
  id: string;
  subject: string;
  category: Category;
  labels: string[];
  starred: boolean;
  read: boolean;
  important: boolean;
  snoozedUntil: string | null;
  messages: Message[];
};

export type Draft = {
  id: string;
  threadId?: string;
  messageId?: string;
  mode: "new" | "reply" | "replyAll" | "forward";
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  quote?: string;
  attachments: Attachment[];
  confidential: boolean;
  scheduledFor: string | null;
  showCc: boolean;
  showBcc: boolean;
  updatedAt: string;
};

export type Label = {
  id: string;
  name: string;
  color: string;
};

export type Settings = {
  density: "default" | "comfortable" | "compact";
  theme: "light" | "dark" | "system";
  readingPane: boolean;
  sortUnreadFirst: boolean;
  signature: string;
  signatureOn: boolean;
};

export type MailboxId =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "scheduled"
  | "all"
  | "spam"
  | "trash"
  | `label:${string}`;

export type MenuState =
  | { type: "account" }
  | { type: "select" }
  | { type: "more"; ids: string[] }
  | { type: "move"; ids: string[] }
  | { type: "labels"; ids: string[] }
  | { type: "snooze"; ids: string[] }
  | { type: "schedule" }
  | { type: "search-tools" }
  | { type: "row"; x: number; y: number; threadId: string };

export type DialogState =
  | { type: "settings" }
  | { type: "shortcuts" }
  | { type: "label"; applyTo?: string[] }
  | { type: "attachment"; attachment: Attachment }
  | { type: "confirm"; title: string; body: string; confirm: string; danger?: boolean; intent: ConfirmIntent }
  | { type: "datetime"; purpose: "snooze" | "schedule"; ids?: string[]; draftId?: string };

export type ConfirmIntent =
  | { type: "reset" }
  | { type: "empty-trash" }
  | { type: "empty-spam" }
  | { type: "send-no-subject"; draftId: string; archive?: boolean }
  | { type: "discard"; draftId: string };

export const STORAGE_KEY = "grok-4.7-mail";

export const LABEL_COLORS = [
  "#0b57d0",
  "#188038",
  "#e37400",
  "#c5221f",
  "#9334e6",
  "#007b83",
  "#b86000",
  "#444746",
];

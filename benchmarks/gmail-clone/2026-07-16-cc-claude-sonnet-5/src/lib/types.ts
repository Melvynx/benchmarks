export type Contact = {
  name: string;
  email: string;
};

export type AttachmentKind = "pdf" | "image" | "doc" | "sheet" | "slide" | "zip" | "code";

export type Attachment = {
  id: string;
  name: string;
  sizeKb: number;
  kind: AttachmentKind;
};

export type ThreadCategory = "primary" | "social" | "promotions" | "updates" | "forums";

export type Message = {
  id: string;
  threadId: string;
  from: Contact;
  to: Contact[];
  cc?: Contact[];
  date: string;
  bodyHtml: string;
  snippet: string;
  attachments: Attachment[];
  isRead: boolean;
  isMe: boolean;
  isDraft?: boolean;
};

export const SYSTEM_LABELS = [
  "INBOX",
  "SENT",
  "DRAFT",
  "TRASH",
  "SPAM",
  "STARRED",
  "IMPORTANT",
] as const;

export type SystemLabel = (typeof SYSTEM_LABELS)[number];

export type Label = {
  id: string;
  name: string;
  color: string;
  textColor: string;
  system?: boolean;
};

export type Thread = {
  id: string;
  subject: string;
  messageIds: string[];
  labelIds: string[];
  category: ThreadCategory;
  isStarred: boolean;
  isImportant: boolean;
  snoozedUntil: string | null;
  lastMessageAt: string;
  restoreLabels?: string[];
};

export type FolderId =
  | "inbox"
  | "starred"
  | "snoozed"
  | "important"
  | "sent"
  | "drafts"
  | "spam"
  | "trash"
  | "all";

export type ComposeMode = "new" | "reply" | "reply-all" | "forward";

export type ComposeDraft = {
  id: string;
  minimized: boolean;
  fullscreen: boolean;
  mode: ComposeMode;
  threadId?: string;
  quotedMessageId?: string;
  to: string;
  cc: string;
  bcc: string;
  showCc: boolean;
  showBcc: boolean;
  subject: string;
  body: string;
  attachments: Attachment[];
  savedDraftMessageId?: string;
  savedDraftThreadId?: string;
};

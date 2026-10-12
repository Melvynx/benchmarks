export type Person = { name: string; email: string };

export type Attachment = {
  id: string;
  filename: string;
  mime: string;
  size: number;
  text?: string;
  dataUrl?: string;
};

export type Message = {
  id: string;
  from: Person;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  date: number;
  body: string;
  format: "text" | "html";
  attachments: Attachment[];
  unread: boolean;
};

export type Draft = {
  to: Person[];
  cc: Person[];
  bcc: Person[];
  subject: string;
  body: string;
  attachments: Attachment[];
  updatedAt: number;
};

export type Thread = {
  id: string;
  subject: string;
  messages: Message[];
  labels: string[];
  unread: boolean;
  snoozedUntil: number | null;
  scheduledFor: number | null;
  draft: Draft | null;
};

export type UserLabel = {
  id: string;
  name: string;
  color: string;
  bg: string;
};

export type Category = "primary" | "promotions" | "social" | "updates";

export type MailView =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "scheduled"
  | "trash"
  | "spam"
  | "important"
  | "all"
  | `label:${string}`;

export type Density = "default" | "comfortable" | "compact";
export type Theme = "light" | "dark";
export type InboxType = "default" | "important" | "unread";

export type Settings = {
  density: Density;
  theme: Theme;
  inboxType: InboxType;
  readingPane: boolean;
  vacationOn: boolean;
  vacationSubject: string;
  vacationMessage: string;
  signature: string;
};

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export type ComposeModel = {
  id: string;
  threadId: string | null;
  mode: ComposeMode;
  placement: "float" | "inline";
  minimized: boolean;
  maximized: boolean;
  to: Person[];
  cc: Person[];
  bcc: Person[];
  subject: string;
  body: string;
  attachments: Attachment[];
  showCc: boolean;
  showBcc: boolean;
};

export type Palette = null | "label" | "move" | "snooze";

export type ConfirmState =
  | null
  | { kind: "emptyTrash" }
  | { kind: "forever"; ids: string[] }
  | { kind: "deleteLabel"; id: string };

export type History = {
  threads: Thread[];
  composes: ComposeModel[];
  openThreadId: string | null;
  labels: UserLabel[];
};

export type Snack = {
  id: number;
  text: string;
  history: History | null;
};

export type State = {
  threads: Thread[];
  labels: UserLabel[];
  settings: Settings;
  view: MailView;
  category: Category;
  search: string;
  recentSearches: string[];
  openThreadId: string | null;
  selected: string[];
  anchorId: string | null;
  cursorId: string | null;
  page: number;
  composes: ComposeModel[];
  snack: Snack | null;
  snackSeq: number;
  signedIn: boolean;
  sidebarOpen: boolean;
  navCollapsed: boolean;
  quickSettings: boolean;
  accountOpen: boolean;
  shortcutsOpen: boolean;
  advancedSearch: boolean;
  settingsPage: boolean;
  palette: Palette;
  confirm: ConfirmState;
  pulse: number;
};

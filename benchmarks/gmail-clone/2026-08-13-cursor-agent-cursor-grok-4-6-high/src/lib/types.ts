export const SYS = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFT: 'DRAFT',
  TRASH: 'TRASH',
  SPAM: 'SPAM',
  STARRED: 'STARRED',
  IMPORTANT: 'IMPORTANT',
  SNOOZED: 'SNOOZED',
  SCHEDULED: 'SCHEDULED',
} as const

export type SysLabel = (typeof SYS)[keyof typeof SYS]

export type Category = 'primary' | 'social' | 'promotions' | 'updates' | 'forums'

export type ViewKind =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'important'
  | 'sent'
  | 'scheduled'
  | 'drafts'
  | 'all'
  | 'spam'
  | 'trash'
  | 'label'
  | 'search'

export interface Contact {
  id: string
  name: string
  email: string
  hue: number
  title?: string
}

export type AttachmentKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'slide' | 'zip' | 'code' | 'video'

export interface Attachment {
  id: string
  name: string
  kind: AttachmentKind
  size: number
  preview?: string
}

export interface Message {
  id: string
  threadId: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  date: number
  body: string
  attachments?: Attachment[]
  unread?: boolean
  draft?: boolean
  sendAt?: number
  inReplyTo?: string
}

export interface Thread {
  id: string
  subject: string
  messageIds: string[]
  labels: string[]
  category: Category
  snoozeUntil?: number
  lastActivity: number
}

export interface Label {
  id: string
  name: string
  color: string
  visible: boolean
}

export type Density = 'default' | 'comfortable' | 'compact'
export type ThemePref = 'light' | 'dark' | 'system'
export type ReadingPane = 'none' | 'right'

export interface Settings {
  theme: ThemePref
  density: Density
  readingPane: ReadingPane
  senderImages: boolean
  categoryTabs: boolean
  conversationView: boolean
  shortcuts: boolean
  undoSendSeconds: number
  snippets: boolean
  starredFirst: boolean
  signature: string
}

export interface ComposeWindow {
  id: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
  attachments: Attachment[]
  threadId?: string
  inReplyTo?: string
  showCc: boolean
  showBcc: boolean
  sendAt?: number
  mode: 'normal' | 'minimized' | 'full'
  inline?: boolean
  kind: 'new' | 'reply' | 'replyAll' | 'forward' | 'draft'
}

export interface Snack {
  id: string
  text: string
  actionLabel?: string
  undo?: UndoEntry
  duration?: number
}

export type UndoEntry =
  | { type: 'labels'; snapshot: { threadId: string; labels: string[]; snoozeUntil?: number }[] }
  | { type: 'unread'; ids: string[]; unread: boolean }
  | { type: 'unsend'; messageId: string; threadId: string }
  | { type: 'restore'; threads: Thread[]; messages: Message[] }

export interface Account {
  name: string
  email: string
  hue: number
  storageUsedGb: number
  storageTotalGb: number
}

export interface Route {
  kind: ViewKind
  category?: Category
  labelId?: string
  query?: string
  threadId?: string
  page: number
}

export const PAGE_SIZE = 50

export const VIEW_TITLES: Record<ViewKind, string> = {
  inbox: 'Inbox',
  starred: 'Starred',
  snoozed: 'Snoozed',
  important: 'Important',
  sent: 'Sent',
  scheduled: 'Scheduled',
  drafts: 'Drafts',
  all: 'All Mail',
  spam: 'Spam',
  trash: 'Trash',
  label: 'Label',
  search: 'Search',
}

export const LABEL_COLORS = [
  '#4127d2',
  '#0b57d0',
  '#018b6e',
  '#188038',
  '#e37400',
  '#d93025',
  '#c5221f',
  '#9334e6',
  '#3c4043',
  '#1967d2',
]

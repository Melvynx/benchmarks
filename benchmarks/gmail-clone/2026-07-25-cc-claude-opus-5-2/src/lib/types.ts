export interface Address {
  name: string
  email: string
}

export type AttachmentKind =
  | 'image'
  | 'pdf'
  | 'doc'
  | 'sheet'
  | 'slide'
  | 'zip'
  | 'code'
  | 'audio'
  | 'video'
  | 'other'

export interface Attachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  /** Optional inline preview: an image data URL, or plain text for code/doc previews. */
  previewText?: string
  previewImage?: string
}

export interface Message {
  id: string
  threadId: string
  from: Address
  to: Address[]
  cc: Address[]
  bcc: Address[]
  /** ISO timestamp. */
  date: string
  /** Sanitized HTML fragment. */
  bodyHtml: string
  attachments: Attachment[]
  read: boolean
  starred: boolean
  /** True when the account owner sent it. */
  outgoing: boolean
  /** Set for messages queued by "Schedule send" that have not left the outbox. */
  scheduledFor?: string
}

export type Category = 'primary' | 'social' | 'promotions' | 'updates' | 'forums'

/** System labels double as folders, matching Gmail's model. */
export const SYSTEM = {
  inbox: 'INBOX',
  sent: 'SENT',
  trash: 'TRASH',
  spam: 'SPAM',
  important: 'IMPORTANT',
  scheduled: 'SCHEDULED',
} as const

export interface Thread {
  id: string
  subject: string
  messageIds: string[]
  labelIds: string[]
  category: Category
  /** ISO timestamp; while set the thread lives in Snoozed and leaves the inbox list. */
  snoozedUntil?: string
  muted?: boolean
}

export interface LabelColor {
  bg: string
  fg: string
}

export interface Label {
  id: string
  name: string
  color: LabelColor
  /** Shown in the sidebar's top section. */
  favorite?: boolean
}

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'

export interface Draft {
  id: string
  threadId?: string
  inReplyTo?: string
  mode: ComposeMode
  to: Address[]
  cc: Address[]
  bcc: Address[]
  subject: string
  bodyHtml: string
  attachments: Attachment[]
  updatedAt: string
  scheduledFor?: string
}

export interface Contact extends Address {
  id: string
  title?: string
  company?: string
  /** Higher ranks first in autocomplete. */
  rank: number
}

export interface Account {
  name: string
  email: string
  avatarColor: string
  usedBytes: number
  quotaBytes: number
}

export interface MailData {
  version: number
  account: Account
  messages: Record<string, Message>
  threads: Record<string, Thread>
  drafts: Record<string, Draft>
  labels: Label[]
  contacts: Contact[]
}

/* -------------------------------------------------------------------------- */
/*  Views                                                                      */
/* -------------------------------------------------------------------------- */

export type ViewId =
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

export interface ViewMeta {
  id: ViewId
  title: string
  icon: string
  /** Empty-state copy. */
  emptyTitle: string
  emptySubtitle: string
}

export type Density = 'default' | 'comfortable' | 'compact'
export type Theme = 'light' | 'dark' | 'system'
export type ReadingPane = 'none' | 'right'

export interface Settings {
  theme: Theme
  density: Density
  readingPane: ReadingPane
  conversationView: boolean
  showCategoryTabs: boolean
  undoSendSeconds: number
  signature: string
  signatureEnabled: boolean
  keyboardShortcuts: boolean
  pageSize: number
  markAsReadDelayMs: number
  hoverActions: boolean
  sendAndArchive: boolean
  previewText: boolean
  starClicked: boolean
}

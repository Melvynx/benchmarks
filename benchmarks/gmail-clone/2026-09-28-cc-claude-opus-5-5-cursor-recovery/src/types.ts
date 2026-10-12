export type Category = 'primary' | 'promotions' | 'social' | 'updates'

export interface Contact {
  name: string
  email: string
}

export type AttachmentKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'slides' | 'zip' | 'other'

export interface Attachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
  hue?: number
  dataUrl?: string
}

export interface Message {
  id: string
  from: Contact
  to: Contact[]
  cc: Contact[]
  bcc?: Contact[]
  date: number
  html: string
  attachments: Attachment[]
}

export interface Thread {
  id: string
  subject: string
  messages: Message[]
  inbox: boolean
  trash: boolean
  spam: boolean
  starred: boolean
  important: boolean
  unread: boolean
  labels: string[]
  category: Category
  snoozeUntil?: number
  /** timestamp used for sorting when a snooze returns */
  bumpedAt?: number
}

export type ReplyMode = 'reply' | 'replyAll' | 'forward'

export interface Draft {
  id: string
  to: Contact[]
  cc: Contact[]
  bcc: Contact[]
  subject: string
  html: string
  attachments: Attachment[]
  updatedAt: number
  threadId?: string
  replyMode?: ReplyMode
  /** When set the draft is queued in the outbox */
  sendAt?: number
  scheduled?: boolean
}

export interface Label {
  id: string
  name: string
  color: string
}

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'default' | 'comfortable' | 'compact'

export interface Settings {
  theme: Theme
  density: Density
  readingPane: 'none' | 'right'
  categories: boolean
  undoSeconds: number
  signature: string
  autoAdvance: 'list' | 'next'
  sidebarCollapsed: boolean
}

export interface PendingReply {
  id: string
  at: number
  from: Contact
  html: string
  /** Reply into an existing thread, or start a new one with `subject` */
  threadId?: string
  subject?: string
  category?: Category
  labels?: string[]
  important?: boolean
  attachments?: Attachment[]
}

export type FolderId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'important'
  | 'sent'
  | 'drafts'
  | 'scheduled'
  | 'all'
  | 'spam'
  | 'trash'

export type View =
  | { kind: 'folder'; folder: FolderId }
  | { kind: 'label'; labelId: string }
  | { kind: 'search'; query: string }

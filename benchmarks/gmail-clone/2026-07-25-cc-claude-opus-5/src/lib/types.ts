/** System labels mirror Gmail's model: a thread's location is derived from its label set. */
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
  /** Deterministic avatar hue index. */
  hue: number
  /** Optional job title, shown in the contact hovercard. */
  title?: string
}

export type AttachmentKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'slide' | 'zip' | 'code' | 'video'

export interface Attachment {
  id: string
  name: string
  kind: AttachmentKind
  /** bytes */
  size: number
  /** For image attachments: a CSS gradient used to fake a thumbnail. */
  preview?: string
}

export interface Message {
  id: string
  threadId: string
  from: string
  to: string[]
  cc?: string[]
  bcc?: string[]
  /** epoch ms */
  date: number
  /** Simple HTML, authored by the seed or the composer. */
  body: string
  attachments?: Attachment[]
  /** Per-message read flag (Gmail marks the whole thread, but keeps per-message state). */
  unread?: boolean
  /** Draft messages are editable and not yet delivered. */
  draft?: boolean
  /** epoch ms — set for scheduled sends. */
  sendAt?: number
  inReplyTo?: string
}

export interface Thread {
  id: string
  subject: string
  messageIds: string[]
  labels: string[]
  category: Category
  /** epoch ms — set while the thread is snoozed. */
  snoozeUntil?: number
  /** Kept so `Sent`/`All mail` can show a thread the user archived. */
  lastActivity: number
}

export interface Label {
  id: string
  name: string
  color: string
  /** Show in the sidebar list. */
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
  markAsReadDelay: boolean
  signature: string
  /** Preview text next to the subject in the list. */
  snippets: boolean
  starredFirst: boolean
}

export interface DraftState {
  id: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  body: string
  attachments: Attachment[]
  /** Reply/forward context. */
  threadId?: string
  inReplyTo?: string
  showCc: boolean
  showBcc: boolean
  sendAt?: number
}

export interface ComposeWindow extends DraftState {
  mode: 'normal' | 'minimized' | 'full'
  /** Inline reply boxes render inside the thread instead of floating. */
  inline?: boolean
  kind: 'new' | 'reply' | 'replyAll' | 'forward' | 'draft'
}

export interface Snack {
  id: string
  text: string
  actionLabel?: string
  /** Serialised inverse operation. */
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

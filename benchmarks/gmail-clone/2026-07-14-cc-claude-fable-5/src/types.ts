export interface Contact {
  name: string
  email: string
  me?: boolean
}

export type AttachmentKind =
  | 'pdf'
  | 'image'
  | 'sheet'
  | 'doc'
  | 'slides'
  | 'zip'
  | 'code'
  | 'video'
  | 'audio'
  | 'calendar'

export interface Attachment {
  id: string
  name: string
  size: number
  kind: AttachmentKind
}

export interface Message {
  id: string
  threadId: string
  from: Contact
  to: Contact[]
  cc?: Contact[]
  bcc?: Contact[]
  date: number
  /** Sanitized HTML body (paragraphs, lists, links). Local, trusted content only. */
  bodyHtml: string
  /** Collapsed quoted history, shown behind the "trimmed content" toggle. */
  quotedHtml?: string
  snippet: string
  attachments?: Attachment[]
  unread: boolean
  starred: boolean
  draft?: boolean
}

export type Category = 'primary' | 'social' | 'promotions' | 'updates'

export type ThreadLocation = 'inbox' | 'archive' | 'trash' | 'spam'

export interface Thread {
  id: string
  subject: string
  messages: Message[]
  labelIds: string[]
  category: Category
  location: ThreadLocation
  snoozedUntil?: number
}

export interface Label {
  id: string
  name: string
  color: string
}

export type FolderId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'sent'
  | 'drafts'
  | 'all'
  | 'spam'
  | 'trash'

export interface Route {
  folder: FolderId | 'label' | 'search'
  labelId?: string
  query?: string
  threadId?: string
}

export interface ComposeState {
  id: string
  to: Contact[]
  cc: Contact[]
  bcc: Contact[]
  subject: string
  bodyHtml: string
  attachments: Attachment[]
  minimized: boolean
  maximized: boolean
  /** Thread the reply/forward belongs to (undefined for fresh mail). */
  replyToThreadId?: string
  /** Existing draft message being edited. */
  draftThreadId?: string
  draftMessageId?: string
  quotedHtml?: string
}

export interface Toast {
  id: string
  text: string
  actionLabel?: string
  /** Registered handler id resolved in the store. */
  action?: () => void
  duration: number
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  density: 'comfortable' | 'compact'
  undoSendSeconds: number
}

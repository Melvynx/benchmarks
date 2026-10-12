export type SystemFolder = 'inbox' | 'sent' | 'drafts' | 'scheduled' | 'archive' | 'spam' | 'trash'
export type FolderId = SystemFolder | 'starred' | 'snoozed' | 'all' | `label:${string}`
export type Category = 'primary' | 'promotions' | 'social' | 'updates'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Contact {
  name: string
  email: string
}

export type AttachmentKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'other'

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
  cc: Contact[]
  bcc: Contact[]
  subject: string
  /** HTML body. Seeded content and composed content (contenteditable) */
  body: string
  date: number
  read: boolean
  starred: boolean
  folder: SystemFolder
  /** Folder to restore to when a message is moved out of trash */
  restoreFolder?: SystemFolder
  labels: string[]
  category: Category
  attachments: Attachment[]
  snoozedUntil?: number
  scheduledAt?: number
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Settings {
  theme: ThemeMode
  density: 'comfortable' | 'compact'
  readingPane: 'right' | 'off'
  signature: string
  undoSeconds: number
}

export interface Data {
  version: number
  me: Contact
  messages: Record<string, Message>
  labels: Label[]
  settings: Settings
  recentSearches: string[]
}

export type Box = 'inbox' | 'archive' | 'trash' | 'spam'
export type Category = 'primary' | 'promotions' | 'social' | 'updates'

export interface Attachment {
  name: string
  size: number
  kind: 'pdf' | 'image' | 'doc' | 'sheet' | 'zip' | 'cal'
}

export interface Message {
  id: string
  from: string
  to: string[]
  cc?: string[]
  date: number
  html: string
  attachments?: Attachment[]
}

export interface Thread {
  id: string
  subject: string
  messages: Message[]
  box: Box
  category: Category
  labels: string[]
  starred: boolean
  read: boolean
  snoozedUntil?: number
}

export interface Draft {
  id: string
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  html: string
  threadId?: string
  attachments: Attachment[]
  updatedAt: number
  sendAt?: number
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  density: 'default' | 'comfortable' | 'compact'
  signature: string
}

export interface MailState {
  threads: Thread[]
  drafts: Draft[]
  labels: Label[]
  settings: Settings
  recent: string[]
  extraContacts: string[]
}

export interface Contact {
  name: string
  email: string
}

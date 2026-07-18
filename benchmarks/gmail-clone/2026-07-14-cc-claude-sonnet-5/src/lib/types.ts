export type ContactId = string

export interface Contact {
  id: ContactId
  name: string
  email: string
  color: string
  initials: string
}

export type LabelId = string

export interface Label {
  id: LabelId
  name: string
  color: string
}

export type Category = 'primary' | 'social' | 'promotions' | 'updates'

export type SystemLabel =
  | 'inbox'
  | 'starred'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'important'
  | 'spam'

export interface Attachment {
  id: string
  name: string
  size: string
  kind: 'pdf' | 'image' | 'sheet' | 'doc' | 'zip' | 'slides' | 'other'
}

export interface Message {
  id: string
  threadId: string
  fromId: ContactId
  toIds: ContactId[]
  ccIds: ContactId[]
  bccIds: ContactId[]
  date: string
  body: string[]
  isRead: boolean
  isDraft: boolean
  attachments: Attachment[]
}

export interface Thread {
  id: string
  subject: string
  category: Category
  labels: string[]
  messages: Message[]
}

export interface DraftFields {
  threadId: string | null
  messageId: string | null
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  attachments: Attachment[]
  showCc: boolean
  showBcc: boolean
  inReplyTo: { threadId: string; messageId: string; mode: 'reply' | 'replyAll' | 'forward' } | null
}

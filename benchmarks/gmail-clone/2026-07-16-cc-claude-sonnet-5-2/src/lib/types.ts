export type SystemLabelId =
  | 'inbox'
  | 'starred'
  | 'snoozed'
  | 'sent'
  | 'draft'
  | 'important'
  | 'spam'
  | 'trash'
  | 'all'
  | 'scheduled'

export type CategoryLabelId =
  | 'category_primary'
  | 'category_social'
  | 'category_promotions'
  | 'category_updates'
  | 'category_forums'

export type LabelId = SystemLabelId | CategoryLabelId | string

export interface Contact {
  id: string
  name: string
  email: string
  color: string
}

export type AttachmentKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'zip' | 'slides'

export interface Attachment {
  id: string
  name: string
  kind: AttachmentKind
  size: string
}

export interface Label {
  id: string
  name: string
  color: string
  textColor: string
}

export interface Message {
  id: string
  threadId: string
  from: Contact
  to: Contact[]
  cc?: Contact[]
  bcc?: Contact[]
  date: string
  bodyText: string
  snippet: string
  attachments: Attachment[]
  isRead: boolean
  isDraft?: boolean
}

export interface Thread {
  id: string
  subject: string
  messages: Message[]
  labelIds: string[]
  isImportant: boolean
  snoozedUntil: string | null
  scheduledFor: string | null
  draftMeta?: {
    to: Contact[]
    cc?: Contact[]
    subject: string
    bodyText: string
  }
}

export type ComposeMode = 'new' | 'reply' | 'reply-all' | 'forward'

export interface ComposeDraft {
  id: string
  threadId: string | null
  mode: ComposeMode
  to: Contact[]
  cc: Contact[]
  bcc: Contact[]
  showCc: boolean
  showBcc: boolean
  subject: string
  bodyText: string
  attachments: Attachment[]
  minimized: boolean
  savedAt: string | null
  inReplyToMessageId?: string
  scheduledFor?: string | null
}

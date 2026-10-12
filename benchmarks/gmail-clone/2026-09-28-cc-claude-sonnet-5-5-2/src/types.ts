export type Person = { name: string; email: string }
export type Att = { id: string; name: string; size: number; kind: 'pdf' | 'image' | 'doc' | 'sheet' | 'zip' | 'cal' | 'other'; }
export type Msg = { id: string; from: Person; to: Person[]; cc?: Person[]; date: number; html: string; atts?: Att[] }
export type Category = 'primary' | 'social' | 'promotions' | 'updates'
export type Thread = {
  id: string; subject: string; category: Category; labels: string[]
  inbox: boolean; starred: boolean; unread: boolean; trashed: boolean; spam: boolean; important: boolean
  snoozedUntil?: number; messages: Msg[]
}
export type Draft = { id: string; to: string[]; cc: string[]; bcc: string[]; subject: string; html: string; atts: Att[]; threadId?: string; updatedAt: number }
export type Scheduled = { id: string; sendAt: number; draft: Draft }
export type Label = { id: string; name: string; color: string }
export type Settings = { theme: 'light' | 'dark' | 'system'; density: 'comfortable' | 'compact'; tabs: boolean; signature: string; undoSeconds: number; autoReply: boolean; preview: boolean }
export type State = { threads: Thread[]; drafts: Draft[]; scheduled: Scheduled[]; labels: Label[]; settings: Settings; contacts: Person[]; recent: string[] }

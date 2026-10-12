import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, Contact, Draft, ReplyMode } from '../types'
import { useMail } from './mail'
import { uid } from '../lib/id'
import { textToHtml } from '../lib/html'

export interface ComposeWin {
  id: string // draft id
  minimized: boolean
  maximized: boolean
}

export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
  secondary?: { label: string; run: () => void }
  duration: number
}

export type Overlay = null | 'settings' | 'shortcuts' | 'newLabel' | 'advancedSearch'

interface UIState {
  selected: string[]
  composes: ComposeWin[]
  inboxTab: Category
  drawerOpen: boolean
  overlay: Overlay
  toast: Toast | null
  focusIndex: number
  labelEdit: string | null
  preview: { threadId: string; messageId: string; attachmentId: string } | null

  setSelected: (ids: string[]) => void
  toggleSelected: (id: string) => void
  clearSelection: () => void
  setInboxTab: (c: Category) => void
  setDrawer: (open: boolean) => void
  setOverlay: (o: Overlay) => void
  setFocusIndex: (i: number) => void
  setLabelEdit: (id: string | null) => void
  setPreview: (p: UIState['preview']) => void

  openCompose: (draft?: Partial<Draft>) => string
  openDraft: (id: string) => void
  closeCompose: (id: string) => void
  updateCompose: (id: string, p: Partial<ComposeWin>) => void

  showToast: (message: string, opts?: Partial<Omit<Toast, 'id' | 'message'>>) => void
  hideToast: () => void
}

let toastSeq = 0

export function signatureHtml() {
  const sig = useMail.getState().settings.signature.trim()
  return sig ? `<p><br></p><div class="signature" style="color:var(--muted)">--<br>${textToHtml(sig).replace(/^<p>|<\/p>$/g, '')}</div>` : ''
}

export function newDraft(p: Partial<Draft> = {}): Draft {
  return {
    id: uid('d'),
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    html: '<p><br></p>' + signatureHtml(),
    attachments: [],
    updatedAt: Date.now(),
    ...p,
  }
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      selected: [],
      composes: [],
      inboxTab: 'primary',
      drawerOpen: false,
      overlay: null,
      toast: null,
      focusIndex: 0,
      labelEdit: null,
      preview: null,

      setSelected: (ids) => set({ selected: ids }),
      toggleSelected: (id) => {
        const s = get().selected
        set({ selected: s.includes(id) ? s.filter((x) => x !== id) : [...s, id] })
      },
      clearSelection: () => set({ selected: [] }),
      setInboxTab: (c) => set({ inboxTab: c, selected: [], focusIndex: 0 }),
      setDrawer: (open) => set({ drawerOpen: open }),
      setOverlay: (o) => set({ overlay: o }),
      setFocusIndex: (i) => set({ focusIndex: i }),
      setLabelEdit: (id) => set({ labelEdit: id }),
      setPreview: (p) => set({ preview: p }),

      openCompose: (p) => {
        const draft = newDraft(p)
        useMail.getState().saveDraft(draft)
        const composes = get().composes.map((c) => ({ ...c, maximized: false }))
        // Gmail keeps a limited number of windows open
        const trimmed = composes.length >= 3 ? composes.slice(1) : composes
        set({ composes: [...trimmed, { id: draft.id, minimized: false, maximized: false }] })
        return draft.id
      },
      openDraft: (id) => {
        const existing = get().composes.find((c) => c.id === id)
        if (existing) {
          set({ composes: get().composes.map((c) => (c.id === id ? { ...c, minimized: false } : c)) })
          return
        }
        const composes = get().composes
        const trimmed = composes.length >= 3 ? composes.slice(1) : composes
        set({ composes: [...trimmed, { id, minimized: false, maximized: false }] })
      },
      closeCompose: (id) => set({ composes: get().composes.filter((c) => c.id !== id) }),
      updateCompose: (id, p) => set({ composes: get().composes.map((c) => (c.id === id ? { ...c, ...p } : c)) }),

      showToast: (message, opts) => set({ toast: { id: ++toastSeq, message, duration: opts?.duration ?? 6000, ...opts } }),
      hideToast: () => set({ toast: null }),
    }),
    {
      name: 'opus-mail-ui-v1',
      partialize: (s) => ({ composes: s.composes, inboxTab: s.inboxTab }),
    },
  ),
)

/** Build a reply / forward draft for a thread and open it inline or in a window */
export function buildReplyDraft(threadId: string, mode: ReplyMode, messageId?: string): Draft {
  const mail = useMail.getState()
  const t = mail.threads[threadId]
  const msg = (messageId && t.messages.find((m) => m.id === messageId)) || t.messages[t.messages.length - 1]
  const me = 'sam.rivera@lumenlabs.io'
  const lastFromOther = [...t.messages].reverse().find((m) => m.from.email !== me) ?? msg
  let to: Contact[] = []
  let cc: Contact[] = []
  if (mode === 'reply') {
    to = msg.from.email === me ? msg.to : [msg.from]
  } else if (mode === 'replyAll') {
    const base = msg.from.email === me ? lastFromOther : msg
    const all = [base.from, ...base.to, ...base.cc]
    const seen = new Set<string>()
    const uniq = all.filter((c) => c.email !== me && !seen.has(c.email) && (seen.add(c.email), true))
    to = uniq.slice(0, 1)
    cc = uniq.slice(1)
  }
  const date = new Date(msg.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const quote =
    mode === 'forward'
      ? `<p><br></p>${signatureHtml()}<p><br></p><div class="quote">---------- Forwarded message ---------<br>From: <b>${msg.from.name}</b> &lt;${msg.from.email}&gt;<br>Date: ${date}<br>Subject: ${t.subject}<br>To: ${msg.to.map((c) => c.name).join(', ')}<br><br>${msg.html}</div>`
      : `<p><br></p>${signatureHtml()}<p><br></p><blockquote class="quote">On ${date} ${msg.from.name} &lt;${msg.from.email}&gt; wrote:<br>${msg.html}</blockquote>`
  const subject = mode === 'forward' ? (t.subject.startsWith('Fwd:') ? t.subject : `Fwd: ${t.subject}`) : t.subject.startsWith('Re:') ? t.subject : `Re: ${t.subject}`
  return newDraft({
    to,
    cc,
    subject,
    html: quote,
    threadId,
    replyMode: mode,
    attachments: mode === 'forward' ? msg.attachments : [],
  })
}

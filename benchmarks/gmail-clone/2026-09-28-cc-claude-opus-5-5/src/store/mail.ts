import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Contact, Draft, Label, Message, PendingReply, Settings, Thread } from '../types'
import { buildSeed, SEED_LABELS } from '../data/seed'
import { ADDRESS_BOOK, ME, P, PEOPLE_WHO_REPLY } from '../data/contacts'
import { uid } from '../lib/id'
import { sanitizeHtml } from '../lib/html'
import { firstName } from '../lib/avatar'
import { isMe } from '../lib/mail'

type ThreadMap = Record<string, Thread>

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  density: 'default',
  readingPane: 'none',
  categories: true,
  undoSeconds: 5,
  signature: 'Sam Rivera\nPlatform Engineering · Lumen Labs',
  autoAdvance: 'list',
  sidebarCollapsed: false,
}

interface MailState {
  threads: ThreadMap
  drafts: Record<string, Draft>
  outbox: Record<string, Draft>
  labels: Label[]
  contacts: Contact[]
  settings: Settings
  pending: PendingReply[]
  seededAt: number

  // thread actions
  patch: (ids: string[], fn: (t: Thread) => Partial<Thread>) => void
  setUnread: (ids: string[], unread: boolean) => void
  toggleStar: (id: string) => void
  setStar: (ids: string[], starred: boolean) => void
  setImportant: (ids: string[], important: boolean) => void
  archive: (ids: string[]) => void
  moveToInbox: (ids: string[]) => void
  trash: (ids: string[]) => void
  deleteForever: (ids: string[]) => void
  emptyTrash: () => void
  emptySpam: () => void
  setSpam: (ids: string[], spam: boolean) => void
  addLabel: (ids: string[], labelId: string) => void
  removeLabel: (ids: string[], labelId: string) => void
  moveToLabel: (ids: string[], labelId: string) => void
  snooze: (ids: string[], until: number) => void
  unsnooze: (ids: string[]) => void
  deleteMessage: (threadId: string, messageId: string) => void
  markUnreadFrom: (threadId: string) => void

  // labels
  createLabel: (name: string, color?: string) => Label
  updateLabel: (id: string, patch: Partial<Label>) => void
  deleteLabel: (id: string) => void

  // drafts & sending
  saveDraft: (d: Draft) => void
  discardDraft: (id: string) => void
  queueSend: (d: Draft, sendAt: number, scheduled: boolean) => void
  cancelSend: (id: string) => Draft | undefined
  deliverNow: (id: string) => string | undefined
  tick: (now: number) => { delivered: string[]; arrived: Thread[]; unsnoozed: number }

  updateSettings: (p: Partial<Settings>) => void
  resetMailbox: () => void

  // undo
  snapshot: () => void
  undo: () => boolean
}

let undoSnapshot: ThreadMap | null = null

const LABEL_COLORS = ['#4285f4', '#16a765', '#e8710a', '#a142f4', '#12b5cb', '#f6bf26', '#e66550', '#f691b2', '#8e8e8e', '#0b8043']

function seedState() {
  const now = Date.now()
  const { threads, drafts, outbox } = buildSeed(now)
  const pending: PendingReply[] = [
    {
      id: uid('p'),
      at: now + 50_000,
      from: P.marcus,
      subject: 'Replica sizing for Atlas — confirmed',
      labels: ['work', 'atlas'],
      important: true,
      html:
        '<p>Hey Sam,</p><p>Ran the load test against the new replica config: 2× db.r6g.xlarge handles 3.1× our current peak with headroom. Cost delta is about $1.9k/mo, which should go in Tom\'s reforecast.</p><p>Graphs attached.</p><p>— M</p>',
      attachments: [{ id: uid('a'), name: 'replica-loadtest.png', size: 842_000, kind: 'image', hue: 190 }],
    },
  ]
  return {
    threads: Object.fromEntries(threads.map((t) => [t.id, t])),
    drafts: Object.fromEntries(drafts.map((d) => [d.id, d])),
    outbox: Object.fromEntries(outbox.map((d) => [d.id, d])),
    labels: SEED_LABELS,
    contacts: ADDRESS_BOOK,
    pending,
    seededAt: now,
  }
}

const AUTO_REPLIES = [
  (n: string) => `<p>Thanks ${n}! Got it — I'll take a look this afternoon and get back to you.</p>`,
  (n: string) => `<p>Perfect, thanks ${n}. That works for me 👍</p>`,
  (n: string) => `<p>Hey ${n}, appreciate the quick note. Let's sync on this tomorrow — does 10am work?</p>`,
  (n: string) => `<p>Received, thank you ${n}! Will circle back once I've had a proper look.</p>`,
]

function mapIds(threads: ThreadMap, ids: string[], fn: (t: Thread) => Partial<Thread>): ThreadMap {
  const next = { ...threads }
  for (const id of ids) {
    const t = next[id]
    if (t) next[id] = { ...t, ...fn(t) }
  }
  return next
}

function draftToMessage(d: Draft, date: number): Message {
  return {
    id: uid('m'),
    from: ME,
    to: d.to,
    cc: d.cc,
    bcc: d.bcc,
    date,
    html: sanitizeHtml(d.html),
    attachments: d.attachments,
  }
}

export const useMail = create<MailState>()(
  persist(
    (set, get) => {
      const mutate = (fn: (t: ThreadMap) => ThreadMap) => {
        undoSnapshot = get().threads
        set({ threads: fn(get().threads) })
      }
      const deliver = (d: Draft, date: number): string => {
        const threads = { ...get().threads }
        const msg = draftToMessage(d, date)
        let threadId: string
        const existing = d.threadId ? threads[d.threadId] : undefined
        if (existing && d.replyMode !== 'forward') {
          threadId = existing.id
          threads[threadId] = { ...existing, messages: [...existing.messages, msg], trash: false, unread: false }
        } else {
          threadId = uid('t')
          threads[threadId] = {
            id: threadId,
            subject: d.subject.trim() || '(no subject)',
            messages: [msg],
            inbox: [...d.to, ...d.cc, ...d.bcc].some(isMe),
            trash: false,
            spam: false,
            starred: false,
            important: false,
            unread: false,
            labels: existing?.labels ?? [],
            category: 'primary',
          }
        }
        // learn new contacts
        const known = new Set(get().contacts.map((c) => c.email.toLowerCase()))
        const learned = [...d.to, ...d.cc, ...d.bcc].filter((c) => !known.has(c.email.toLowerCase()) && !isMe(c))
        // simulate a reply from a real person
        const pending = [...get().pending]
        const responder = d.to.find((c) => PEOPLE_WHO_REPLY.has(c.email.toLowerCase()))
        if (responder && !d.scheduled) {
          const pick = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]
          pending.push({
            id: uid('p'),
            threadId,
            at: Date.now() + 20_000 + Math.random() * 20_000,
            from: responder,
            html: pick(firstName(ME.name)) + `<p>${firstName(responder.name)}</p>`,
          })
        }
        set({ threads, pending, contacts: learned.length ? [...get().contacts, ...learned] : get().contacts })
        return threadId
      }

      return {
        ...seedState(),
        settings: DEFAULT_SETTINGS,

        patch: (ids, fn) => mutate((t) => mapIds(t, ids, fn)),
        setUnread: (ids, unread) => mutate((t) => mapIds(t, ids, () => ({ unread }))),
        toggleStar: (id) => mutate((t) => mapIds(t, [id], (x) => ({ starred: !x.starred }))),
        setStar: (ids, starred) => mutate((t) => mapIds(t, ids, () => ({ starred }))),
        setImportant: (ids, important) => mutate((t) => mapIds(t, ids, () => ({ important }))),
        archive: (ids) => mutate((t) => mapIds(t, ids, () => ({ inbox: false, snoozeUntil: undefined }))),
        moveToInbox: (ids) => mutate((t) => mapIds(t, ids, () => ({ inbox: true, trash: false, spam: false, snoozeUntil: undefined }))),
        trash: (ids) => mutate((t) => mapIds(t, ids, () => ({ trash: true }))),
        deleteForever: (ids) =>
          mutate((t) => {
            const next = { ...t }
            ids.forEach((id) => delete next[id])
            return next
          }),
        emptyTrash: () =>
          mutate((t) => Object.fromEntries(Object.entries(t).filter(([, x]) => !x.trash))),
        emptySpam: () =>
          mutate((t) => Object.fromEntries(Object.entries(t).filter(([, x]) => !x.spam || x.trash))),
        setSpam: (ids, spam) => mutate((t) => mapIds(t, ids, () => ({ spam, inbox: !spam, trash: false }))),
        addLabel: (ids, labelId) =>
          mutate((t) => mapIds(t, ids, (x) => ({ labels: x.labels.includes(labelId) ? x.labels : [...x.labels, labelId] }))),
        removeLabel: (ids, labelId) => mutate((t) => mapIds(t, ids, (x) => ({ labels: x.labels.filter((l) => l !== labelId) }))),
        moveToLabel: (ids, labelId) =>
          mutate((t) =>
            mapIds(t, ids, (x) => ({ inbox: false, trash: false, spam: false, labels: x.labels.includes(labelId) ? x.labels : [...x.labels, labelId] })),
          ),
        snooze: (ids, until) => mutate((t) => mapIds(t, ids, () => ({ snoozeUntil: until, inbox: true }))),
        unsnooze: (ids) => mutate((t) => mapIds(t, ids, () => ({ snoozeUntil: undefined, inbox: true }))),
        deleteMessage: (threadId, messageId) =>
          mutate((t) => {
            const th = t[threadId]
            if (!th) return t
            const messages = th.messages.filter((m) => m.id !== messageId)
            const next = { ...t }
            if (messages.length === 0) next[threadId] = { ...th, trash: true }
            else next[threadId] = { ...th, messages }
            return next
          }),
        markUnreadFrom: (threadId) => mutate((t) => mapIds(t, [threadId], () => ({ unread: true }))),

        createLabel: (name, color) => {
          const label: Label = {
            id: uid('l'),
            name: name.trim(),
            color: color ?? LABEL_COLORS[get().labels.length % LABEL_COLORS.length],
          }
          set({ labels: [...get().labels, label] })
          return label
        },
        updateLabel: (id, p) => set({ labels: get().labels.map((l) => (l.id === id ? { ...l, ...p } : l)) }),
        deleteLabel: (id) => {
          set({
            labels: get().labels.filter((l) => l.id !== id),
            threads: Object.fromEntries(
              Object.entries(get().threads).map(([k, t]) => [k, t.labels.includes(id) ? { ...t, labels: t.labels.filter((l) => l !== id) } : t]),
            ),
          })
        },

        saveDraft: (d) => set({ drafts: { ...get().drafts, [d.id]: { ...d, updatedAt: Date.now() } } }),
        discardDraft: (id) => {
          const drafts = { ...get().drafts }
          delete drafts[id]
          set({ drafts })
        },
        queueSend: (d, sendAt, scheduled) => {
          const drafts = { ...get().drafts }
          delete drafts[d.id]
          set({ drafts, outbox: { ...get().outbox, [d.id]: { ...d, sendAt, scheduled, updatedAt: Date.now() } } })
        },
        cancelSend: (id) => {
          const d = get().outbox[id]
          if (!d) return undefined
          const outbox = { ...get().outbox }
          delete outbox[id]
          const draft: Draft = { ...d, sendAt: undefined, scheduled: undefined, updatedAt: Date.now() }
          set({ outbox, drafts: { ...get().drafts, [id]: draft } })
          return draft
        },
        deliverNow: (id) => {
          const d = get().outbox[id]
          if (!d) return undefined
          const outbox = { ...get().outbox }
          delete outbox[id]
          set({ outbox })
          return deliver(d, Date.now())
        },
        tick: (now) => {
          const delivered: string[] = []
          const arrived: Thread[] = []
          // outbox
          for (const d of Object.values(get().outbox)) {
            if (d.sendAt && d.sendAt <= now) {
              const outbox = { ...get().outbox }
              delete outbox[d.id]
              set({ outbox })
              delivered.push(deliver(d, d.scheduled ? d.sendAt : now))
            }
          }
          // snoozes
          let unsnoozed = 0
          const due = Object.values(get().threads).filter((t) => t.snoozeUntil && t.snoozeUntil <= now)
          if (due.length) {
            unsnoozed = due.length
            set({
              threads: mapIds(get().threads, due.map((t) => t.id), (t) => ({
                snoozeUntil: undefined,
                bumpedAt: t.snoozeUntil,
                unread: true,
                inbox: true,
              })),
            })
          }
          // incoming mail
          const ready = get().pending.filter((p) => p.at <= now)
          if (ready.length) {
            const threads = { ...get().threads }
            for (const p of ready) {
              const msg: Message = {
                id: uid('m'),
                from: p.from,
                to: [ME],
                cc: [],
                date: now,
                html: p.html,
                attachments: p.attachments ?? [],
              }
              const existing = p.threadId ? threads[p.threadId] : undefined
              if (existing) {
                threads[existing.id] = { ...existing, messages: [...existing.messages, msg], unread: true, inbox: true, trash: false, snoozeUntil: undefined }
                arrived.push(threads[existing.id])
              } else {
                const id = uid('t')
                threads[id] = {
                  id,
                  subject: p.subject ?? '(no subject)',
                  messages: [msg],
                  inbox: true,
                  trash: false,
                  spam: false,
                  starred: false,
                  important: p.important ?? false,
                  unread: true,
                  labels: p.labels ?? [],
                  category: p.category ?? 'primary',
                }
                arrived.push(threads[id])
              }
            }
            set({ threads, pending: get().pending.filter((p) => p.at > now) })
          }
          return { delivered, arrived, unsnoozed }
        },

        updateSettings: (p) => set({ settings: { ...get().settings, ...p } }),
        resetMailbox: () => {
          undoSnapshot = null
          set({ ...seedState() })
        },

        snapshot: () => {
          undoSnapshot = get().threads
        },
        undo: () => {
          if (!undoSnapshot) return false
          set({ threads: undoSnapshot })
          undoSnapshot = null
          return true
        },
      }
    },
    {
      name: 'opus-mail-v1',
      version: 1,
      partialize: (s) => ({
        threads: s.threads,
        drafts: s.drafts,
        outbox: s.outbox,
        labels: s.labels,
        contacts: s.contacts,
        settings: s.settings,
        pending: s.pending,
        seededAt: s.seededAt,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<MailState> | undefined
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p?.settings ?? {}) } }
      },
    },
  ),
)

export function getThread(id: string | undefined) {
  return id ? useMail.getState().threads[id] : undefined
}

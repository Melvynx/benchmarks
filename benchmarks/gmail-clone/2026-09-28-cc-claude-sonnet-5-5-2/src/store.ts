import type { Draft, Label, Msg, Person, Settings, State, Thread } from './types'
import { ME, seedState } from './seed'
import { htmlToText, nameFromEmail, uid } from './util'

const KEY = 'mail-state-v2'
export function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return seedState()
}
export function save(s: State) { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* ignore */ } }

export type Action =
  | { t: 'patch'; ids: string[]; patch: Partial<Thread> }
  | { t: 'star'; ids: string[]; value: boolean }
  | { t: 'read'; ids: string[]; value: boolean }
  | { t: 'archive'; ids: string[] }
  | { t: 'inbox'; ids: string[] }
  | { t: 'trash'; ids: string[] }
  | { t: 'restore'; ids: string[] }
  | { t: 'spam'; ids: string[]; value: boolean }
  | { t: 'purge'; ids: string[] }
  | { t: 'label'; ids: string[]; label: string; on: boolean }
  | { t: 'snooze'; ids: string[]; until: number }
  | { t: 'draft'; draft: Draft }
  | { t: 'delDraft'; id: string }
  | { t: 'send'; draft: Draft; sendAt?: number }
  | { t: 'cancelScheduled'; id: string }
  | { t: 'deliver'; now: number }
  | { t: 'incoming'; threadId: string; from: Person; html: string }
  | { t: 'addLabel'; label: Label }
  | { t: 'delLabel'; id: string }
  | { t: 'settings'; patch: Partial<Settings> }
  | { t: 'recent'; q: string }
  | { t: 'replace'; state: State }
  | { t: 'delMsg'; threadId: string; msgId: string }
  | { t: 'add'; thread: Thread }

const map = (s: State, ids: string[], f: (t: Thread) => Thread): State => ({ ...s, threads: s.threads.map((t) => (ids.includes(t.id) ? f(t) : t)) })

function toPeople(s: State, emails: string[]): Person[] {
  return emails.map((e) => s.contacts.find((c) => c.email === e) ?? { name: nameFromEmail(e), email: e })
}

function deliver(s: State, d: Draft, date: number): State {
  const msg: Msg = { id: uid('m'), from: ME, to: toPeople(s, d.to), cc: d.cc.length ? toPeople(s, d.cc) : undefined, date, html: d.html, atts: d.atts.length ? d.atts : undefined }
  const contacts = [...s.contacts]
  for (const p of msg.to) if (!contacts.some((c) => c.email === p.email)) contacts.push(p)
  if (d.threadId && s.threads.some((t) => t.id === d.threadId)) {
    return { ...map(s, [d.threadId], (t) => ({ ...t, messages: [...t.messages, msg], trashed: false, snoozedUntil: undefined })), contacts }
  }
  const t: Thread = { id: d.threadId ?? uid('t'), subject: d.subject || '(no subject)', category: 'primary', labels: [], inbox: false, starred: false, unread: false, trashed: false, spam: false, important: false, messages: [msg] }
  return { ...s, threads: [t, ...s.threads], contacts }
}

export function reducer(s: State, a: Action): State {
  switch (a.t) {
    case 'patch': return map(s, a.ids, (t) => ({ ...t, ...a.patch }))
    case 'star': return map(s, a.ids, (t) => ({ ...t, starred: a.value }))
    case 'read': return map(s, a.ids, (t) => ({ ...t, unread: !a.value }))
    case 'archive': return map(s, a.ids, (t) => ({ ...t, inbox: false, snoozedUntil: undefined }))
    case 'inbox': return map(s, a.ids, (t) => ({ ...t, inbox: true, trashed: false, spam: false, snoozedUntil: undefined }))
    case 'trash': return map(s, a.ids, (t) => ({ ...t, trashed: true, inbox: false, snoozedUntil: undefined }))
    case 'restore': return map(s, a.ids, (t) => ({ ...t, trashed: false, inbox: true }))
    case 'spam': return map(s, a.ids, (t) => a.value ? { ...t, spam: true, inbox: false, snoozedUntil: undefined } : { ...t, spam: false, inbox: true })
    case 'purge': return { ...s, threads: s.threads.filter((t) => !a.ids.includes(t.id)) }
    case 'label': return map(s, a.ids, (t) => ({ ...t, labels: a.on ? [...new Set([...t.labels, a.label])] : t.labels.filter((l) => l !== a.label) }))
    case 'snooze': return map(s, a.ids, (t) => ({ ...t, snoozedUntil: a.until, inbox: false }))
    case 'draft': {
      const i = s.drafts.findIndex((d) => d.id === a.draft.id)
      const drafts = i >= 0 ? s.drafts.map((d, j) => (j === i ? a.draft : d)) : [a.draft, ...s.drafts]
      return { ...s, drafts }
    }
    case 'delDraft': return { ...s, drafts: s.drafts.filter((d) => d.id !== a.id) }
    case 'send': {
      const drafts = s.drafts.filter((d) => d.id !== a.draft.id)
      if (a.sendAt) return { ...s, drafts, scheduled: [...s.scheduled, { id: uid('s'), sendAt: a.sendAt, draft: a.draft }] }
      return deliver({ ...s, drafts }, a.draft, Date.now())
    }
    case 'cancelScheduled': return { ...s, scheduled: s.scheduled.filter((x) => x.id !== a.id) }
    case 'deliver': {
      let out = s
      const due = s.scheduled.filter((x) => x.sendAt <= a.now)
      for (const x of due) out = deliver(out, x.draft, x.sendAt)
      if (due.length) out = { ...out, scheduled: out.scheduled.filter((x) => x.sendAt > a.now) }
      if (out.threads.some((t) => t.snoozedUntil && t.snoozedUntil <= a.now)) {
        out = { ...out, threads: out.threads.map((t) => t.snoozedUntil && t.snoozedUntil <= a.now ? { ...t, snoozedUntil: undefined, inbox: true, unread: true, messages: t.messages } : t) }
      }
      return out
    }
    case 'incoming': {
      const msg: Msg = { id: uid('m'), from: a.from, to: [ME], date: Date.now(), html: a.html }
      return { ...map(s, [a.threadId], (t) => ({ ...t, messages: [...t.messages, msg], inbox: !t.trashed && !t.spam, unread: true })) }
    }
    case 'addLabel': return { ...s, labels: [...s.labels, a.label] }
    case 'delLabel': return { ...s, labels: s.labels.filter((l) => l.id !== a.id), threads: s.threads.map((t) => ({ ...t, labels: t.labels.filter((l) => l !== a.id) })) }
    case 'settings': return { ...s, settings: { ...s.settings, ...a.patch } }
    case 'recent': return a.q.trim() ? { ...s, recent: [a.q.trim(), ...s.recent.filter((r) => r !== a.q.trim())].slice(0, 6) } : s
    case 'replace': return a.state
    case 'add': return { ...s, threads: [a.thread, ...s.threads] }
    case 'delMsg': return { ...s, threads: s.threads.map((t) => t.id === a.threadId ? { ...t, messages: t.messages.filter((m) => m.id !== a.msgId) } : t).filter((t) => t.messages.length) }
  }
}

export const lastMsg = (t: Thread) => t.messages[t.messages.length - 1]
export const threadDate = (t: Thread) => lastMsg(t).date
export const snippet = (t: Thread) => {
  const m = lastMsg(t)
  return htmlToText(m.html).slice(0, 140)
}

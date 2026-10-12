import type { Draft, MailState, Message, Thread, Attachment } from './types'
import { INCOMING, seedState } from './seed'
import { ME, escapeHtml, lastMsg, nameOf, uid, fullDate } from './util'

const KEY = 'sonnet-mail-v1'

export function loadState(): MailState {
  try {
    const s = localStorage.getItem(KEY)
    if (s) return JSON.parse(s) as MailState
  } catch {
    /* ignore */
  }
  return seedState()
}
export function saveState(s: MailState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}
export function resetState(): MailState {
  localStorage.removeItem(KEY)
  return seedState()
}

export function newDraft(p: Partial<Draft> = {}): Draft {
  return { id: uid(), to: [], cc: [], bcc: [], subject: '', html: '', attachments: [], updatedAt: Date.now(), ...p }
}

export const draftIsEmpty = (d: Draft) => !d.to.length && !d.cc.length && !d.bcc.length && !d.subject.trim() && !d.attachments.length && !d.html.replace(/<[^>]*>|&nbsp;|\s/g, '').length

export function sigHtml(sig: string) {
  if (!sig.trim()) return ''
  return `<div class="sig">-- <br>${escapeHtml(sig).replace(/\n/g, '<br>')}</div>`
}

export function deliver(s: MailState, d: Draft): { state: MailState; threadId: string } {
  const msg: Message = {
    id: uid(),
    from: ME,
    to: d.to,
    cc: d.cc.length ? d.cc : undefined,
    date: Date.now(),
    html: d.html || '<p></p>',
    attachments: d.attachments.length ? d.attachments : undefined,
  }
  const drafts = s.drafts.filter((x) => x.id !== d.id)
  const extra = Array.from(new Set([...s.extraContacts, ...d.to, ...d.cc, ...d.bcc]))
  const existing = d.threadId ? s.threads.find((t) => t.id === d.threadId) : undefined
  if (existing) {
    const threads = s.threads.map((t) => (t.id === existing.id ? { ...t, messages: [...t.messages, msg], read: true, box: t.box === 'trash' ? 'inbox' : t.box } : t))
    return { state: { ...s, threads, drafts, extraContacts: extra }, threadId: existing.id }
  }
  const th: Thread = { id: uid(), subject: d.subject.trim() || '(no subject)', messages: [msg], box: 'archive', category: 'primary', labels: [], starred: false, read: true }
  return { state: { ...s, threads: [th, ...s.threads], drafts, extraContacts: extra }, threadId: th.id }
}

const REPLIES = [
  'Thanks, got it. I&rsquo;ll take a look and get back to you shortly.',
  'Sounds good to me! Let&rsquo;s do it.',
  'Appreciate the note. Can we chat about this tomorrow morning?',
  'Perfect, thank you. Looping in the team.',
]

export function autoReply(s: MailState, threadId: string, from: string): MailState {
  const reply: Message = { id: uid(), from, to: [ME], date: Date.now(), html: `<p>${REPLIES[Math.floor(Math.random() * REPLIES.length)]}</p>` }
  return { ...s, threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, reply], read: false, box: t.box === 'trash' || t.box === 'spam' ? 'inbox' : t.box === 'archive' ? 'inbox' : t.box } : t)) }
}

let inIdx = 0
export function receiveMail(s: MailState): { state: MailState; subject?: string } {
  if (inIdx >= INCOMING.length) return { state: s }
  const inc = INCOMING[inIdx++]
  const th: Thread = {
    id: uid(),
    subject: inc.subject,
    messages: [{ id: uid(), from: inc.from, to: [ME], date: Date.now(), html: inc.html, attachments: inc.att }],
    box: 'inbox',
    category: inc.cat,
    labels: [],
    starred: false,
    read: false,
  }
  return { state: { ...s, threads: [th, ...s.threads] }, subject: inc.subject }
}

export function quoteHtml(m: Message, now: number) {
  return `<br><div class="quote-head">On ${fullDate(m.date, now).replace(/ \(.*\)$/, '')}, ${escapeHtml(nameOf(m.from))} &lt;${m.from}&gt; wrote:</div><blockquote>${m.html}</blockquote>`
}

export function replyDraft(t: Thread, all: boolean, sig: string, now: number): Draft {
  const last = lastMsg(t)
  const base = [...t.messages].reverse().find((x) => x.from !== ME) || last
  const to = base.from === ME ? last.to : [base.from]
  const cc = all ? Array.from(new Set([...base.to, ...(base.cc || [])].filter((e) => e !== ME && !to.includes(e)))) : []
  const subject = /^re:/i.test(t.subject) ? t.subject : `Re: ${t.subject}`
  return newDraft({ to, cc, subject, threadId: t.id, html: `<p><br></p>${sigHtml(sig)}${quoteHtml(base, now)}` })
}

export function forwardDraft(t: Thread, sig: string, now: number): Draft {
  const last = lastMsg(t)
  const subject = /^fwd:/i.test(t.subject) ? t.subject : `Fwd: ${t.subject}`
  const head = `<br><div class="quote-head">---------- Forwarded message ---------<br>From: <b>${escapeHtml(nameOf(last.from))}</b> &lt;${last.from}&gt;<br>Date: ${fullDate(last.date, now).replace(/ \(.*\)$/, '')}<br>Subject: ${escapeHtml(t.subject)}<br>To: ${last.to.join(', ')}</div><br>`
  const attachments: Attachment[] = t.messages.flatMap((m) => m.attachments || [])
  return newDraft({ subject, attachments, html: `<p><br></p>${sigHtml(sig)}${head}${last.html}` })
}

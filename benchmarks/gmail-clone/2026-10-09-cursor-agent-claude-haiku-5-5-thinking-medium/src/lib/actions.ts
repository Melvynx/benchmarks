import { useStore, type Action } from './store'
import { formatFull, escapeHtml, threadMessages, scopeIds } from './mail'
import type { Contact, Message, SystemFolder, FolderId } from '../types'

export function uid(prefix: string) {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}${Math.random()}`
  return `${prefix}-${rand.replace(/-/g, '').slice(0, 12)}`
}

export type ComposeMode = 'new' | 'reply' | 'replyAll' | 'forward'

const sigHtml = (sig: string) => (sig.trim() ? `<p class="sig" style="color:var(--ink-3)">${escapeHtml(sig).replace(/\n/g, '<br>')}</p>` : '')

/** Build a fresh draft for compose, optionally seeded from a source message */
export function buildDraft(args: { mode: ComposeMode; source?: Message; me: Contact; signature: string; now: number }): Message {
  const { mode, source, me, signature, now } = args
  const base: Message = {
    id: uid('draft'),
    threadId: uid('thread'),
    from: me,
    to: [],
    cc: [],
    bcc: [],
    subject: '',
    body: `<p><br></p>${sigHtml(signature)}`,
    date: now,
    read: true,
    starred: false,
    folder: 'drafts',
    labels: [],
    category: 'primary',
    attachments: [],
  }
  if (!source) return base

  const subjectPrefix = mode === 'forward' ? 'Fwd: ' : 'Re: '
  const cleanSubject = source.subject.replace(/^(re|fwd):\s*/i, '')
  const quoteHeader = `On ${formatFull(source.date)}, ${escapeHtml(source.from.name)} &lt;${escapeHtml(source.from.email)}&gt; wrote:`
  const quote = `<p><br></p>${sigHtml(signature)}<div style="color:var(--ink-3);font-size:12px;margin-top:1.2em">${quoteHeader}</div><blockquote style="border-left:2px solid var(--line);margin:0.4em 0 0 0.2em;padding-left:1em;color:var(--ink-3)">${source.body}</blockquote>`
  const fwdHeader = `<p><br></p>${sigHtml(signature)}<p style="color:var(--ink-3)">---------- Forwarded message ----------<br>From: ${escapeHtml(source.from.name)} &lt;${escapeHtml(source.from.email)}&gt;<br>Date: ${formatFull(source.date)}<br>Subject: ${escapeHtml(source.subject)}</p>`

  const others = [...source.to, ...source.cc].filter((c) => c.email !== me.email && c.email !== source.from.email)
  const isSelf = source.from.email === me.email

  if (mode === 'forward') {
    return { ...base, subject: `${subjectPrefix}${cleanSubject}`, body: `${fwdHeader}${source.body}`, attachments: source.attachments.map((a) => ({ ...a })), threadId: base.threadId }
  }
  return {
    ...base,
    threadId: source.threadId,
    subject: `${subjectPrefix}${cleanSubject}`,
    to: isSelf ? source.to.slice(0, 1) : [source.from],
    cc: mode === 'replyAll' ? others : [],
    body: quote,
  }
}

const REPLY_TEXTS = [
  'Thanks, this looks good to me. I will take a closer look this afternoon.',
  'Got it, appreciate the quick turnaround. Let us sync tomorrow.',
  'Sounds good. Could you add the numbers to the appendix too?',
  'Perfect, that works for me. See you then!',
  'Thanks for the update. I have a couple of small comments and will send them over shortly.',
]

/** Simulated incoming reply so the mailbox feels alive after sending */
function scheduleReply(dispatch: (a: Action) => void, to: Contact, threadId: string, subject: string, me: Contact) {
  const delay = 6000 + Math.random() * 3000
  window.setTimeout(() => {
    const reply: Message = {
      id: uid('reply'),
      threadId,
      from: to,
      to: [me],
      cc: [],
      bcc: [],
      subject,
      body: `<p>${REPLY_TEXTS[Math.floor(Math.random() * REPLY_TEXTS.length)]}</p>`,
      date: Date.now(),
      read: false,
      starred: false,
      folder: 'inbox',
      labels: [],
      category: 'primary',
      attachments: [],
    }
    dispatch({ type: 'upsert', message: reply })
    dispatch({ type: 'toast', toast: { id: Date.now(), text: `New reply from ${to.name}` } })
  }, delay)
}

export function useMailActions() {
  const { state, dispatch } = useStore()
  const { data, ui } = state

  const toast = (text: string, undo?: Action) => dispatch({ type: 'toast', toast: { id: Date.now() + Math.random(), text, undo } })

  const undoable = (text: string, ids: string[], action: Action) => {
    const before = ids.map((id) => data.messages[id]).filter((m): m is Message => Boolean(m))
    dispatch(action)
    toast(text, before.length ? { type: 'restore', messages: before } : undefined)
  }

  const openThread = (threadId: string) => {
    const unread = threadMessages(data, threadId).filter((m) => !m.read).map((m) => m.id)
    if (unread.length) dispatch({ type: 'mark', ids: unread, read: true })
    dispatch({ type: 'openThread', threadId })
  }

  const markRead = (ids: string[], read?: boolean) => {
    if (!ids.length) return
    const target = read ?? ids.some((id) => data.messages[id]?.read === false)
    dispatch({ type: 'mark', ids, read: target })
    toast(target ? 'Marked as read' : 'Marked as unread')
  }

  const toggleStar = (ids: string[]) => {
    if (!ids.length) return
    const starred = ids.some((id) => !data.messages[id]?.starred)
    dispatch({ type: 'star', ids, starred })
  }

  const archive = (ids: string[]) => {
    if (!ids.length) return
    undoable('Conversation archived', ids, { type: 'archive', ids })
  }

  const trash = (ids: string[]) => {
    if (!ids.length) return
    const allTrashed = ids.every((id) => data.messages[id]?.folder === 'trash')
    if (allTrashed) {
      toast('Deleted forever')
      dispatch({ type: 'purge', ids })
      return
    }
    undoable('Conversation moved to Trash', ids, { type: 'trash', ids })
  }

  const move = (ids: string[], folder: SystemFolder, text: string) => {
    if (!ids.length) return
    undoable(text, ids, { type: 'move', ids, folder })
  }

  const label = (ids: string[], labelId: string, on: boolean) => {
    if (!ids.length) return
    const l = data.labels.find((x) => x.id === labelId)
    dispatch({ type: 'label', ids, labelId, on })
    toast(on ? `Applied label "${l?.name ?? ''}"` : `Removed label "${l?.name ?? ''}"`)
  }

  const createLabel = (name: string, ids: string[]) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-') || uid('label')
    const colors = ['#d93025', '#1a73e8', '#188038', '#e37400', '#a142f4', '#129eaf']
    if (!data.labels.some((l) => l.id === id)) {
      dispatch({ type: 'createLabel', label: { id, name: trimmed, color: colors[data.labels.length % colors.length] } })
    }
    if (ids.length) dispatch({ type: 'label', ids, labelId: id, on: true })
    toast(`Created label "${trimmed}"`)
  }

  const snooze = (ids: string[], until: number, text: string) => {
    if (!ids.length) return
    undoable(text, ids, { type: 'snooze', ids, until })
  }

  const openCompose = (mode: ComposeMode, source?: Message) => {
    const draft = buildDraft({ mode, source, me: data.me, signature: data.settings.signature, now: ui.now })
    dispatch({ type: 'upsert', message: draft })
    dispatch({ type: 'openCompose', id: draft.id })
  }

  const closeCompose = () => dispatch({ type: 'openCompose', id: null })

  const sendDraft = (id: string, patch?: Partial<Message>) => {
    const stored = data.messages[id]
    if (!stored) return
    if (patch) dispatch({ type: 'patch', id, patch })
    const draft = { ...stored, ...patch }
    dispatch({ type: 'send', id, now: Date.now() })
    dispatch({ type: 'openCompose', id: null })
    toast('Message sent', { type: 'restore', messages: [draft] })
    const recipient = draft.to[0]
    if (recipient && recipient.email !== data.me.email) {
      scheduleReply(dispatch, recipient, draft.threadId, draft.subject, data.me)
    }
  }

  const scheduleDraft = (id: string, at: number, patch?: Partial<Message>) => {
    if (!data.messages[id]) return
    if (patch) dispatch({ type: 'patch', id, patch })
    dispatch({ type: 'schedule', id, at })
    dispatch({ type: 'openCompose', id: null })
    toast(`Scheduled to send ${new Date(at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`, { type: 'unschedule', id })
  }

  const discardDraft = (id: string) => {
    const draft = data.messages[id]
    if (!draft) return
    dispatch({ type: 'discard', id })
    dispatch({ type: 'openCompose', id: null })
    toast('Draft discarded', { type: 'restore', messages: [draft] })
  }

  const scopeFor = (threadId: string) => scopeIds(data, threadId, ui.folder as FolderId, ui.now)

  return {
    data,
    ui,
    dispatch,
    toast,
    openThread,
    markRead,
    toggleStar,
    archive,
    trash,
    move,
    label,
    createLabel,
    snooze,
    openCompose,
    closeCompose,
    sendDraft,
    scheduleDraft,
    discardDraft,
    scopeFor,
  }
}

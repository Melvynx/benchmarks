import { ME } from './seed-data'
import type { SystemLabelId, Thread } from './types'

export type MailView =
  | { kind: 'folder'; id: SystemLabelId }
  | { kind: 'label'; id: string }

export function threadLastMessage(thread: Thread) {
  return thread.messages[thread.messages.length - 1]
}

export function threadIsUnread(thread: Thread): boolean {
  if (thread.labelIds.includes('draft')) return false
  return thread.messages.some((m) => !m.isRead && m.from.id !== ME.id)
}

export function threadHasAttachments(thread: Thread): boolean {
  return thread.messages.some((m) => m.attachments.length > 0)
}

export function threadIsSnoozedNow(thread: Thread): boolean {
  if (!thread.labelIds.includes('snoozed') || !thread.snoozedUntil) return false
  return new Date(thread.snoozedUntil).getTime() > Date.now()
}

export function threadParticipantsLabel(thread: Thread): string {
  const names = new Set<string>()
  for (const m of thread.messages) {
    if (m.from.id !== ME.id) names.add(m.from.name)
  }
  if (names.size === 0) return 'me'
  return Array.from(names).join(', ')
}

export function sortThreadsByDate(threads: Thread[]): Thread[] {
  return [...threads].sort((a, b) => {
    const dateA = new Date(threadLastMessage(a).date).getTime()
    const dateB = new Date(threadLastMessage(b).date).getTime()
    return dateB - dateA
  })
}

function isVisibleOutsideTrashSpam(thread: Thread): boolean {
  return !thread.labelIds.includes('trash') && !thread.labelIds.includes('spam')
}

export function filterThreadsForView(
  threads: Thread[],
  view: MailView,
  category: string | null,
): Thread[] {
  let result: Thread[]

  if (view.kind === 'folder') {
    switch (view.id) {
      case 'inbox':
        result = threads.filter(
          (t) => t.labelIds.includes('inbox') && isVisibleOutsideTrashSpam(t) && !threadIsSnoozedNow(t),
        )
        if (category) {
          result = result.filter((t) => t.labelIds.includes(category))
        }
        break
      case 'starred':
        result = threads.filter((t) => t.labelIds.includes('starred') && isVisibleOutsideTrashSpam(t))
        break
      case 'snoozed':
        result = threads.filter((t) => threadIsSnoozedNow(t) && isVisibleOutsideTrashSpam(t))
        break
      case 'sent':
        result = threads.filter((t) => t.labelIds.includes('sent') && isVisibleOutsideTrashSpam(t))
        break
      case 'draft':
        result = threads.filter((t) => t.labelIds.includes('draft') && isVisibleOutsideTrashSpam(t))
        break
      case 'important':
        result = threads.filter((t) => t.isImportant && isVisibleOutsideTrashSpam(t))
        break
      case 'spam':
        result = threads.filter((t) => t.labelIds.includes('spam'))
        break
      case 'trash':
        result = threads.filter((t) => t.labelIds.includes('trash'))
        break
      case 'all':
      default:
        result = threads.filter((t) => isVisibleOutsideTrashSpam(t) && !t.labelIds.includes('draft'))
        break
    }
  } else {
    result = threads.filter((t) => t.labelIds.includes(view.id) && isVisibleOutsideTrashSpam(t))
  }

  return sortThreadsByDate(result)
}

interface ParsedSearch {
  terms: string[]
  is: string[]
  has: string[]
  from?: string
  to?: string
  subject?: string
  label?: string
  in?: string
}

function parseSearchQuery(query: string): ParsedSearch {
  const parsed: ParsedSearch = { terms: [], is: [], has: [] }
  const tokens = query.trim().split(/\s+/).filter(Boolean)

  for (const token of tokens) {
    const match = /^(is|has|from|to|subject|label|in):(.+)$/i.exec(token)
    if (!match) {
      parsed.terms.push(token.toLowerCase())
      continue
    }
    const [, key, value] = match
    const v = value.toLowerCase()
    switch (key.toLowerCase()) {
      case 'is':
        parsed.is.push(v)
        break
      case 'has':
        parsed.has.push(v)
        break
      case 'from':
        parsed.from = v
        break
      case 'to':
        parsed.to = v
        break
      case 'subject':
        parsed.subject = v
        break
      case 'label':
        parsed.label = v
        break
      case 'in':
        parsed.in = v
        break
    }
  }

  return parsed
}

export function searchThreads(threads: Thread[], query: string): Thread[] {
  if (!query.trim()) return []
  const parsed = parseSearchQuery(query)

  const result = threads.filter((thread) => {
    if (parsed.is.includes('starred') && !thread.labelIds.includes('starred')) return false
    if (parsed.is.includes('unread') && !threadIsUnread(thread)) return false
    if (parsed.is.includes('read') && threadIsUnread(thread)) return false
    if (parsed.is.includes('important') && !thread.isImportant) return false
    if (parsed.has.includes('attachment') && !threadHasAttachments(thread)) return false
    if (parsed.label && !thread.labelIds.some((l) => l.toLowerCase() === parsed.label)) return false
    if (parsed.in) {
      const inMap: Record<string, string> = {
        inbox: 'inbox',
        sent: 'sent',
        drafts: 'draft',
        draft: 'draft',
        trash: 'trash',
        spam: 'spam',
      }
      const wanted = inMap[parsed.in]
      if (wanted && !thread.labelIds.includes(wanted)) return false
    }
    if (parsed.from && !thread.messages.some((m) => m.from.name.toLowerCase().includes(parsed.from!) || m.from.email.toLowerCase().includes(parsed.from!))) {
      return false
    }
    if (parsed.to && !thread.messages.some((m) => m.to.some((c) => c.name.toLowerCase().includes(parsed.to!) || c.email.toLowerCase().includes(parsed.to!)))) {
      return false
    }
    if (parsed.subject && !thread.subject.toLowerCase().includes(parsed.subject)) return false

    if (parsed.terms.length > 0) {
      const haystack = [
        thread.subject,
        ...thread.messages.map((m) => m.bodyText),
        ...thread.messages.map((m) => m.from.name),
        ...thread.messages.map((m) => m.from.email),
        ...thread.messages.flatMap((m) => m.to.map((c) => c.name)),
      ]
        .join(' \n ')
        .toLowerCase()
      const allTermsMatch = parsed.terms.every((term) => haystack.includes(term))
      if (!allTermsMatch) return false
    }

    return true
  })

  return sortThreadsByDate(result)
}

export function labelCounts(threads: Thread[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const thread of threads) {
    if (!isVisibleOutsideTrashSpam(thread)) continue
    for (const label of thread.labelIds) {
      counts[label] = (counts[label] ?? 0) + (threadIsUnread(thread) ? 1 : 0)
    }
  }
  return counts
}

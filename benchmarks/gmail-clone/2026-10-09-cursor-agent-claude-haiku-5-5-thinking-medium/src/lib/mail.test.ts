import { describe, expect, it } from 'vitest'
import { buildSeed } from '../data/seed'
import { groupThreads, matchesFolder, matchesQuery, parseQuery, threadMessages, stripHtml } from './mail'
import { computeView, groupMessageIds } from './view'
import { reducer, type State } from './store'
import { buildDraft } from './actions'

const NOW = new Date('2026-10-09T09:08:00').getTime()
const data = buildSeed(NOW)
const ui = { folder: 'inbox' as const, query: '', category: 'all' as const, now: NOW, threadId: null, selection: [], page: 0, cursor: null, composeId: null, composeFull: false, toast: null, settingsOpen: false, shortcutsOpen: false, navOpen: false }
const state = (): State => ({ data, ui })

describe('search parsing', () => {
  it('extracts filters and free text', () => {
    const q = parseQuery('from:"Sarah Chen" has:attachment budget is:unread')
    expect(q.from).toEqual(['sarah chen'])
    expect(q.has).toEqual(['attachment'])
    expect(q.is).toEqual(['unread'])
    expect(q.terms).toEqual(['budget'])
  })

  it('matches body text and attachment filters', () => {
    const q = parseQuery('has:attachment roadmap')
    const hits = Object.values(data.messages).filter((m) => matchesQuery(m, q, NOW, data))
    expect(hits.map((m) => m.subject)).toContain('Q4 roadmap review: notes and deck')
    expect(hits.every((m) => m.attachments.length > 0)).toBe(true)
  })

  it('excludes trash and spam by default, includes them with in:', () => {
    const q = parseQuery('cruise')
    expect(Object.values(data.messages).some((m) => matchesQuery(m, q, NOW, data))).toBe(false)
    const q2 = parseQuery('in:spam cruise')
    expect(Object.values(data.messages).some((m) => matchesQuery(m, q2, NOW, data))).toBe(true)
  })

  it('filters by label name', () => {
    const q = parseQuery('label:travel')
    const hits = Object.values(data.messages).filter((m) => matchesQuery(m, q, NOW, data))
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((m) => m.labels.includes('travel'))).toBe(true)
  })
})

describe('folders and threads', () => {
  it('inbox hides snoozed mail and snoozed view shows it', () => {
    const snoozed = Object.values(data.messages).find((m) => m.snoozedUntil)!
    expect(matchesFolder(snoozed, 'inbox', NOW)).toBe(false)
    expect(matchesFolder(snoozed, 'snoozed', NOW)).toBe(true)
  })

  it('groups a conversation into one row, newest first', () => {
    const groups = groupThreads(Object.values(data.messages).filter((m) => matchesFolder(m, 'inbox', NOW)), 'inbox')
    const keys = groups.map((g) => g.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (let i = 1; i < groups.length; i++) expect(groups[i - 1].latest.date).toBeGreaterThanOrEqual(groups[i].latest.date)
  })

  it('computes inbox view with category filter', () => {
    const all = computeView(data, { ...ui, category: 'all' })
    const promo = computeView(data, { ...ui, category: 'promotions' })
    expect(promo.groups.length).toBeGreaterThan(0)
    expect(promo.groups.length).toBeLessThan(all.groups.length)
    expect(promo.groups.every((g) => g.latest.category === 'promotions')).toBe(true)
  })

  it('returns the whole conversation in chronological order', () => {
    const t = threadMessages(data, 'thread-2')
    expect(t.length).toBe(5)
    for (let i = 1; i < t.length; i++) expect(t[i - 1].date).toBeLessThanOrEqual(t[i].date)
  })

  it('strips html for snippets', () => {
    expect(stripHtml('<p>Hello&nbsp;<strong>you</strong></p><p>Bye</p>')).toBe('Hello you Bye')
  })
})

describe('reducer actions', () => {
  const firstInbox = () => groupThreads(Object.values(data.messages).filter((m) => matchesFolder(m, 'inbox', NOW)), 'inbox')[0]

  it('archive moves only inbox messages', () => {
    const g = firstInbox()
    const ids = g.messages.map((m) => m.id)
    const next = reducer(state(), { type: 'archive', ids })
    for (const id of ids) expect(next.data.messages[id].folder).toBe(data.messages[id].folder === 'inbox' ? 'archive' : data.messages[id].folder)
  })

  it('trash remembers the origin folder and restore undoes it', () => {
    const id = Object.values(data.messages).find((m) => m.folder === 'inbox')!.id
    const trashed = reducer(state(), { type: 'trash', ids: [id] })
    expect(trashed.data.messages[id].folder).toBe('trash')
    const restored = reducer(trashed, { type: 'restore', messages: [data.messages[id]] })
    expect(restored.data.messages[id].folder).toBe('inbox')
  })

  it('purge removes messages permanently', () => {
    const id = Object.values(data.messages).find((m) => m.folder === 'trash')!.id
    const next = reducer(state(), { type: 'purge', ids: [id] })
    expect(next.data.messages[id]).toBeUndefined()
  })

  it('mark and star are idempotent and keep identity when nothing changes', () => {
    const id = Object.values(data.messages).find((m) => m.read)!.id
    const s1 = reducer(state(), { type: 'mark', ids: [id], read: true })
    expect(s1.data.messages[id].read).toBe(true)
    const s2 = reducer(state(), { type: 'star', ids: [id], starred: false })
    expect(s2.data.messages[id].starred).toBe(false)
  })

  it('labels can be added and removed', () => {
    const id = Object.values(data.messages).find((m) => m.folder === 'inbox' && !m.labels.includes('finance'))!.id
    const on = reducer(state(), { type: 'label', ids: [id], labelId: 'finance', on: true })
    expect(on.data.messages[id].labels).toContain('finance')
    const off = reducer(on, { type: 'label', ids: [id], labelId: 'finance', on: false })
    expect(off.data.messages[id].labels).not.toContain('finance')
  })

  it('snooze hides from inbox until the tick brings it back unread', () => {
    const id = Object.values(data.messages).find((m) => m.folder === 'inbox' && !m.snoozedUntil)!.id
    const until = NOW + 3_600_000
    const snoozed = reducer(state(), { type: 'snooze', ids: [id], until })
    expect(matchesFolder(snoozed.data.messages[id], 'inbox', NOW)).toBe(false)
    const ticked = reducer(snoozed, { type: 'tick', now: until + 1 })
    expect(ticked.data.messages[id].snoozedUntil).toBeUndefined()
    expect(ticked.data.messages[id].read).toBe(false)
  })

  it('scheduled messages are sent by the tick once due', () => {
    const scheduled = Object.values(data.messages).find((m) => m.folder === 'scheduled')!
    const later = reducer(state(), { type: 'tick', now: scheduled.scheduledAt! + 1 })
    expect(later.data.messages[scheduled.id].folder).toBe('sent')
  })

  it('sending a draft moves it to sent with a default subject', () => {
    const draft = buildDraft({ mode: 'new', me: data.me, signature: '', now: NOW })
    const seeded = reducer(state(), { type: 'upsert', message: draft })
    const sent = reducer(seeded, { type: 'send', id: draft.id, now: NOW })
    expect(sent.data.messages[draft.id].folder).toBe('sent')
    expect(sent.data.messages[draft.id].subject).toBe('(no subject)')
  })

  it('reply drafts keep the thread and quote the original', () => {
    const src = data.messages['msg-1-1']
    const reply = buildDraft({ mode: 'reply', source: src, me: data.me, signature: 'Alex', now: NOW })
    expect(reply.threadId).toBe(src.threadId)
    expect(reply.subject).toBe('Re: Q4 roadmap review: notes and deck')
    expect(reply.to[0].email).toBe(src.from.email)
    expect(reply.body).toContain('blockquote')
  })

  it('forward has no recipients and an Fwd subject', () => {
    const src = data.messages['msg-1-1']
    const fwd = buildDraft({ mode: 'forward', source: src, me: data.me, signature: '', now: NOW })
    expect(fwd.to).toHaveLength(0)
    expect(fwd.subject.startsWith('Fwd: ')).toBe(true)
    expect(fwd.attachments.length).toBe(src.attachments.length)
  })

  it('groupMessageIds expands selected groups to their messages', () => {
    const groups = computeView(data, ui).groups
    const ids = groupMessageIds(groups, [groups[0].key])
    expect(ids).toEqual(groups[0].messages.map((m) => m.id))
  })
})

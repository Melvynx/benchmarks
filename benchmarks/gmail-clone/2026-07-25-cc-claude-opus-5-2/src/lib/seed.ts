import { SEED_LABELS } from '@/data/labels'
import { addr, ME, PEOPLE, type PersonKey } from '@/data/people'
import {
  SEED_DRAFTS,
  SEED_SCHEDULED,
  SEED_THREADS,
  type SeedAttachment,
  type SeedMessage,
  type SeedThread,
} from '@/data/threads'
import { SYSTEM, type Attachment, type Contact, type MailData, type Message, type Thread } from './types'
import { kindForFile } from './utils'

export const DATA_VERSION = 3

const MIN = 60_000

/** A soft, deterministic gradient used as an image-attachment thumbnail. */
function previewImageFor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0
  const a = h % 360
  const b = (a + 40 + (h % 60)) % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${a} 62% 62%)"/><stop offset="1" stop-color="hsl(${b} 58% 38%)"/>
</linearGradient></defs>
<rect width="320" height="220" fill="url(#g)"/>
<circle cx="${60 + (h % 120)}" cy="${50 + (h % 40)}" r="46" fill="hsl(${b} 80% 82%)" opacity=".38"/>
<path d="M0 ${150 + (h % 30)} L90 ${100 + (h % 40)} L170 ${160 - (h % 30)} L250 ${105 + (h % 25)} L320 ${150} L320 220 L0 220Z" fill="hsl(${a} 45% 22%)" opacity=".55"/>
<path d="M0 ${185} L110 ${140 + (h % 20)} L210 ${190 - (h % 25)} L320 ${150 + (h % 20)} L320 220 L0 220Z" fill="hsl(${b} 40% 16%)" opacity=".6"/>
</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n/g, ''))}`
}

const PREVIEW_TEXT: Record<string, string> = {
  csv: `cohort,accounts,d30,d60,d90
searched_wk1,1842,0.88,0.79,0.71
no_search_wk1,2610,0.64,0.47,0.38
searched_wk1_smb,904,0.86,0.76,0.68
no_search_wk1_smb,1488,0.61,0.44,0.35
searched_wk1_ent,938,0.90,0.82,0.74
no_search_wk1_ent,1122,0.68,0.51,0.42`,
  markdown: `# Postmortem — 2026-07-21 EU partial outage

**Severity** SEV2 · **Duration** 33m · **Impact** ~8% of requests

## Timeline (UTC)
- 14:02  config push #8841 merged
- 14:06  EU p99 crosses 800ms
- 14:10  monitor fires
- 14:16  on-call paged (6m delay — rotation gap)
- 14:35  root cause found: pool ceiling 20, expected 200
- 14:39  rollback complete
- 14:43  metrics normal

## Root cause
\`eu.pool.max\` was set to \`20\` instead of \`200\`. A missing zero.

## Contributing factors
1. Config diffs post the SHA, not the values.
2. No range validation on pool sizes.
3. Symptom (connection timeouts) pointed at the database.`,
  markdownDefault: `# Notes\n\n- item one\n- item two\n`,
}

function buildAttachment(seed: SeedAttachment, idx: number, msgId: string): Attachment {
  const kind = kindForFile(seed.name)
  return {
    id: `${msgId}_a${idx}`,
    name: seed.name,
    size: seed.size,
    kind,
    previewImage: kind === 'image' ? previewImageFor(seed.name) : undefined,
    previewText: seed.text ? (PREVIEW_TEXT[seed.text] ?? PREVIEW_TEXT.markdownDefault) : undefined,
  }
}

function defaultRead(seed: SeedMessage, thread: SeedThread, outgoing: boolean) {
  if (seed.read !== undefined) return seed.read
  if (outgoing) return true
  const box = thread.box ?? 'inbox'
  if (box !== 'inbox') return true
  // Bulk mail piles up unread the way it does in a real account.
  const cat = thread.cat ?? 'primary'
  if (cat !== 'primary' && seed.ago < 9 * 1440) return false
  return true
}

export function buildSeedData(now = Date.now()): MailData {
  const messages: Record<string, Message> = {}
  const threads: Record<string, Thread> = {}
  const subjectToThread = new Map<string, string>()

  SEED_THREADS.forEach((seed, ti) => {
    const threadId = `t${ti}`
    const messageIds: string[] = []

    // Seeds list messages newest-intent-first only incidentally; sort by time so
    // conversation order is always chronological.
    const ordered = [...seed.msgs].sort((a, b) => b.ago - a.ago)

    ordered.forEach((m, mi) => {
      const id = `${threadId}m${mi}`
      const outgoing = m.from === 'me'
      const to = (m.to ?? []).map((k) => addr(k as PersonKey))
      messages[id] = {
        id,
        threadId,
        from: addr(m.from as PersonKey),
        to: to.length ? to : [ME],
        cc: (m.cc ?? []).map((k) => addr(k as PersonKey)),
        bcc: [],
        date: new Date(now - m.ago * MIN).toISOString(),
        bodyHtml: m.body,
        attachments: (m.att ?? []).map((a, ai) => buildAttachment(a, ai, id)),
        read: defaultRead(m, seed, outgoing),
        starred: m.starred ?? false,
        outgoing,
      }
      messageIds.push(id)
    })

    const box = seed.box ?? 'inbox'
    const labelIds: string[] = [...(seed.labels ?? [])]
    if (box === 'inbox') labelIds.push(SYSTEM.inbox)
    if (box === 'trash') labelIds.push(SYSTEM.trash)
    if (box === 'spam') labelIds.push(SYSTEM.spam)
    if (seed.important) labelIds.push(SYSTEM.important)
    if (ordered.some((m) => m.from === 'me')) labelIds.push(SYSTEM.sent)

    threads[threadId] = {
      id: threadId,
      subject: seed.subject,
      messageIds,
      labelIds,
      category: seed.cat ?? 'primary',
      snoozedUntil: seed.snooze ? new Date(now + seed.snooze * MIN).toISOString() : undefined,
    }
    subjectToThread.set(seed.subject, threadId)
  })

  /* ---- Scheduled outgoing mail lives in its own single-message threads ---- */
  SEED_SCHEDULED.forEach((s, si) => {
    const threadId = `ts${si}`
    const id = `${threadId}m0`
    messages[id] = {
      id,
      threadId,
      from: ME,
      to: s.to.map((k) => addr(k as PersonKey)),
      cc: [],
      bcc: [],
      date: new Date(now - 20 * MIN).toISOString(),
      bodyHtml: s.body,
      attachments: [],
      read: true,
      starred: false,
      outgoing: true,
      scheduledFor: new Date(now + s.inMinutes * MIN).toISOString(),
    }
    threads[threadId] = {
      id: threadId,
      subject: s.subject,
      messageIds: [id],
      labelIds: [SYSTEM.scheduled],
      category: 'primary',
    }
  })

  /* ---- Drafts ---- */
  const drafts: MailData['drafts'] = {}
  SEED_DRAFTS.forEach((d, di) => {
    const id = `d${di}`
    const threadId = d.replyToSubject ? subjectToThread.get(d.replyToSubject) : undefined
    drafts[id] = {
      id,
      threadId,
      mode: threadId ? 'reply' : 'new',
      to: (d.to ?? []).map((k) => addr(k as PersonKey)),
      cc: (d.cc ?? []).map((k) => addr(k as PersonKey)),
      bcc: [],
      subject: d.subject,
      bodyHtml: d.body,
      attachments: (d.att ?? []).map((a, ai) => buildAttachment(a, ai, id)),
      updatedAt: new Date(now - d.ago * MIN).toISOString(),
    }
  })

  const contacts: Contact[] = (Object.keys(PEOPLE) as PersonKey[])
    .filter((k) => k !== 'me' && !k.startsWith('spam'))
    .map((k) => {
      const p = PEOPLE[k]
      return {
        id: k,
        name: p.name,
        email: p.email,
        title: 'title' in p ? p.title : undefined,
        company: 'company' in p ? p.company : undefined,
        rank: p.rank ?? 10,
      }
    })
    .sort((a, b) => b.rank - a.rank)

  return {
    version: DATA_VERSION,
    account: {
      name: ME.name,
      email: ME.email,
      avatarColor: '#1a73e8',
      usedBytes: 7_344_182_231,
      quotaBytes: 16_106_127_360,
    },
    messages,
    threads,
    drafts,
    labels: SEED_LABELS.map((l) => ({ ...l })),
    contacts,
  }
}

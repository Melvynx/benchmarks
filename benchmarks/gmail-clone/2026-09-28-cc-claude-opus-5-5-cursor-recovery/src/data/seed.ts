import type { Attachment, AttachmentKind, Category, Contact, Draft, Label, Message, Thread } from '../types'
import { ME, P } from './contacts'
import { atHour, time } from '../lib/format'

export const SEED_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#4285f4' },
  { id: 'atlas', name: 'Atlas launch', color: '#a142f4' },
  { id: 'hiring', name: 'Hiring', color: '#e8710a' },
  { id: 'personal', name: 'Personal', color: '#16a765' },
  { id: 'travel', name: 'Travel', color: '#12b5cb' },
  { id: 'finance', name: 'Finance', color: '#f6bf26' },
  { id: 'receipts', name: 'Receipts', color: '#8e8e8e' },
]

interface AttSpec {
  name: string
  kb: number
  hue?: number
}

interface MsgSpec {
  from: Contact
  to?: Contact[]
  cc?: Contact[]
  at: number
  body: string
  att?: AttSpec[]
}

interface ThreadSpec {
  subject: string
  msgs: MsgSpec[]
  cat?: Category
  labels?: string[]
  starred?: boolean
  important?: boolean
  unread?: boolean
  inbox?: boolean
  trash?: boolean
  spam?: boolean
  snoozeUntil?: number
}

const p = (...paras: string[]) => paras.map((x) => (x.startsWith('<') ? x : `<p>${x}</p>`)).join('')
const ul = (...items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`
const sig = (name: string, title?: string) =>
  `<p style="color:var(--muted)">— ${name}${title ? `<br>${title}` : ''}</p>`

function kindOf(name: string): AttachmentKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'pdf') return 'pdf'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return 'image'
  if (['doc', 'docx', 'txt', 'md'].includes(ext)) return 'doc'
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet'
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slides'
  if (['zip', 'tar', 'gz'].includes(ext)) return 'zip'
  return 'other'
}

export function buildSeed(now = Date.now()) {
  const m = (minutesAgo: number) => now - minutesAgo * time.MIN
  const d = (daysAgo: number, h: number, min = 0) => {
    const ts = atHour(-daysAgo, h, min, now)
    return daysAgo === 0 && ts > now ? now - 30 * time.MIN : ts
  }

  let tid = 0
  let mid = 0
  let aid = 0
  const threads: Thread[] = []

  const add = (s: ThreadSpec) => {
    const id = `t${++tid}`
    const messages: Message[] = s.msgs.map((x) => ({
      id: `m${++mid}`,
      from: x.from,
      to: x.to ?? [ME],
      cc: x.cc ?? [],
      date: x.at,
      html: x.body,
      attachments: (x.att ?? []).map(
        (a): Attachment => ({ id: `a${++aid}`, name: a.name, size: a.kb * 1024, kind: kindOf(a.name), hue: a.hue ?? (aid * 47) % 360 }),
      ),
    }))
    threads.push({
      id,
      subject: s.subject,
      messages,
      inbox: s.inbox ?? true,
      trash: s.trash ?? false,
      spam: s.spam ?? false,
      starred: s.starred ?? false,
      important: s.important ?? false,
      unread: s.unread ?? false,
      labels: s.labels ?? [],
      category: s.cat ?? 'primary',
      snoozeUntil: s.snoozeUntil,
    })
  }

  // ───────────────────────────── Today
  add({
    subject: 'Atlas launch — final go/no-go checklist',
    labels: ['work', 'atlas'],
    important: true,
    unread: true,
    starred: true,
    msgs: [
      {
        from: P.priya,
        to: [ME, P.marcus, P.elena],
        at: m(260),
        body: p(
          'Hi all,',
          "We're 9 days out from the Atlas public launch. I've put together the go/no-go checklist we'll walk through on Thursday. Please add owners for anything that's still blank.",
          ul(
            '<b>Billing migration</b> — Marcus (dry run on staging passed)',
            '<b>Onboarding flow v3</b> — Elena, final copy review pending',
            '<b>Status page + incident runbook</b> — Sam',
            '<b>Press embargo list</b> — me',
          ),
          'Let me know if anything is at risk. I would rather slip by a week than launch with a broken billing path.',
          sig('Priya', 'Product Lead, Lumen Labs'),
        ),
        att: [{ name: 'Atlas-go-no-go.pdf', kb: 482 }],
      },
      {
        from: P.marcus,
        to: [P.priya, ME, P.elena],
        at: m(190),
        body: p(
          'Billing migration is green. We replayed 30 days of production webhooks against staging and the reconciliation diff is zero.',
          "One thing I'd like Sam to double-check: the retry queue alerts still point at the old PagerDuty service.",
          sig('Marcus'),
        ),
      },
      {
        from: P.elena,
        to: [P.priya, ME, P.marcus],
        at: m(42),
        body: p(
          'Onboarding copy is locked 🎉 — final screens attached. The only open item is the empty-state illustration for teams with no projects, which lands tomorrow.',
          'Sam, can you confirm the status page will link from the in-app help menu?',
        ),
        att: [
          { name: 'onboarding-v3-screens.png', kb: 2310, hue: 262 },
          { name: 'copy-deck-final.docx', kb: 88 },
        ],
      },
    ],
  })

  add({
    subject: 'Quick favor — can you review my offer letter?',
    labels: ['personal'],
    unread: true,
    msgs: [
      {
        from: P.maya,
        at: m(75),
        body: p(
          'Hey Sam!!',
          "So... I got the offer from Halcyon 😅 I'm really excited but the equity section is confusing me — 4 year vest, 1 year cliff, but then there's this thing about \"early exercise\" and an 83(b) election?",
          "Would you mind taking a look before I sign? No rush, they gave me until Friday. Coffee's on me.",
          'Maya',
        ),
        att: [{ name: 'Halcyon_Offer_Maya_Patel.pdf', kb: 214 }],
      },
    ],
  })

  add({
    subject: '[lumen/atlas] Fix race condition in webhook retry queue (#1482)',
    cat: 'updates',
    labels: ['work'],
    unread: true,
    msgs: [
      {
        from: P.github,
        at: m(110),
        body: p(
          '<b>@jonasweber</b> requested your review on this pull request.',
          '<pre style="background:var(--code-bg);padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap">Retries could be enqueued twice when two workers picked up the same job\nwithin the visibility window. This PR adds an idempotency key and a\nconditional update on the job row.\n\n 4 files changed, +128 −41</pre>',
          'Reply to this email directly or view it on GitHub.',
        ),
      },
    ],
  })

  add({
    subject: 'Your flight to Lisbon is confirmed — SK 2481',
    cat: 'updates',
    labels: ['travel'],
    starred: true,
    msgs: [
      {
        from: P.skyward,
        at: m(330),
        body: p(
          '<h2 style="margin:0 0 8px">You\'re all set, Sam.</h2>',
          '<table style="border-collapse:collapse;width:100%;max-width:520px"><tr><td style="padding:8px 0;color:var(--muted)">Confirmation</td><td style="padding:8px 0"><b>QX7P2L</b></td></tr><tr><td style="padding:8px 0;color:var(--muted)">Depart</td><td style="padding:8px 0">SFO → LIS · Fri Oct 16, 7:40 PM</td></tr><tr><td style="padding:8px 0;color:var(--muted)">Return</td><td style="padding:8px 0">LIS → SFO · Sun Oct 25, 11:15 AM</td></tr><tr><td style="padding:8px 0;color:var(--muted)">Seat</td><td style="padding:8px 0">22A (window)</td></tr></table>',
          'Check-in opens 24 hours before departure. Bring a valid passport — Portugal is part of the Schengen area.',
        ),
        att: [{ name: 'E-ticket_QX7P2L.pdf', kb: 156 }],
      },
    ],
  })

  add({
    subject: 'Harbor & Pine: The Autumn Edit is here 🍂 up to 40% off',
    cat: 'promotions',
    unread: true,
    msgs: [
      {
        from: P.harbor,
        at: m(400),
        body: p(
          '<h2 style="margin:0">The Autumn Edit</h2>',
          'Warm oak, boucle, and the lamp everyone keeps asking about. This week only, take up to 40% off our best-selling living room pieces.',
          '<a href="https://example.com">Shop the edit →</a>',
          '<small style="color:var(--muted)">You are receiving this because you signed up at harborandpine.com. Unsubscribe anytime.</small>',
        ),
      },
    ],
  })

  add({
    subject: 'Kenji Watanabe wants to connect',
    cat: 'social',
    unread: true,
    msgs: [
      {
        from: P.linkedin,
        at: m(500),
        body: p(
          '<b>Kenji Watanabe</b> · Head of Data at Orbit Analytics',
          '"Hi Sam — loved your talk on event-driven billing at Infra Summit. Would be great to connect."',
          '<a href="https://example.com">Accept</a> · <a href="https://example.com">View profile</a>',
        ),
      },
    ],
  })

  // ───────────────────────────── Yesterday / this week
  add({
    subject: 'Q3 budget reforecast — need your numbers by Wednesday',
    labels: ['work', 'finance'],
    important: true,
    msgs: [
      {
        from: P.tom,
        to: [ME, P.priya],
        at: d(1, 16, 12),
        body: p(
          'Hi Sam,',
          "We're closing the Q3 reforecast. Could you fill in the infrastructure lines in the attached sheet? In particular I need your best estimate for the new observability contract and the extra database replicas for Atlas.",
          "Wednesday EOD would be ideal so I can roll it up for the board pack on Thursday.",
          sig('Tom Becker', 'CFO'),
        ),
        att: [{ name: 'Q3-reforecast-infra.xlsx', kb: 67 }],
      },
      {
        from: ME,
        to: [P.tom, P.priya],
        at: d(1, 17, 48),
        body: p(
          "Will do, Tom. Observability is roughly $4.2k/mo after the negotiated discount; I'll confirm the replica sizing with Marcus tomorrow morning and fill the sheet in.",
          'Sam',
        ),
      },
    ],
  })

  add({
    subject: 'Dinner Sunday? 🍝',
    labels: ['personal'],
    msgs: [
      {
        from: P.mom,
        at: d(1, 11, 5),
        body: p(
          'Hi sweetheart,',
          "Dad is making his lasagna on Sunday and Chris said he can come. Can you make it around 6? Bring that nice bread from the bakery near you if you can.",
          'Also — did you ever call Aunt Rosa back? She asked about you again.',
          'Love, Mom',
        ),
      },
      {
        from: ME,
        to: [P.mom],
        at: d(1, 12, 30),
        body: p("I'll be there! I'll grab the sourdough. And yes, calling Rosa tonight, promise 😅", 'Sam'),
      },
      {
        from: P.mom,
        at: d(1, 12, 41),
        body: p('Perfect ❤️ See you Sunday.'),
      },
    ],
  })

  add({
    subject: 'Candidate debrief: Staff Engineer (Platform) — Ana Ruiz',
    labels: ['work', 'hiring'],
    unread: true,
    msgs: [
      {
        from: P.aisha,
        to: [ME, P.marcus, P.hana],
        at: d(1, 9, 20),
        body: p(
          'Hi panel,',
          'Thanks for interviewing Ana yesterday. Please submit written feedback in the ATS before we meet at 3pm today. Quick summary of what I have so far:',
          ul('System design — strong hire (Marcus)', 'Coding — hire (Hana)', 'Values — pending (Sam)'),
          'Her competing offer expires Monday, so we need to move quickly if it\'s a yes.',
          sig('Aisha', 'Talent Partner'),
        ),
        att: [{ name: 'Ana_Ruiz_Resume.pdf', kb: 131 }],
      },
    ],
  })

  add({
    subject: 'Re: Office lease renewal — redlines',
    labels: ['work', 'finance'],
    msgs: [
      {
        from: ME,
        to: [P.diego],
        cc: [P.tom],
        at: d(3, 10, 2),
        body: p(
          'Hi Diego,',
          "Attached are our comments on the renewal. Main asks: cap the annual escalator at 3%, add a sublease clause, and push the HVAC maintenance obligation back to the landlord.",
          'Sam',
        ),
        att: [{ name: 'Lease-renewal-comments.docx', kb: 54 }],
      },
      {
        from: P.diego,
        to: [ME],
        cc: [P.tom],
        at: d(2, 14, 36),
        body: p(
          'Sam,',
          "The landlord accepted the 3% cap and the sublease clause. They're pushing back on HVAC — they'll cover replacements but not routine maintenance. Honestly that's market standard; I'd accept.",
          'Redlined version attached. If you\'re happy I\'ll send it for signature.',
          sig('Diego Alvarez', 'Alvarez Legal LLP'),
        ),
        att: [{ name: 'Lease-Renewal-v4-redline.pdf', kb: 912 }],
      },
    ],
  })

  add({
    subject: 'Invoice #INV-20931 from Orbit Analytics — paid',
    cat: 'updates',
    labels: ['receipts', 'finance'],
    msgs: [
      {
        from: P.stripe,
        at: d(2, 8, 0),
        body: p(
          '<h2 style="margin:0 0 4px">$1,240.00 paid to Orbit Analytics</h2>',
          '<span style="color:var(--muted)">Receipt #2231-4418 · Paid with Visa •••• 4242</span>',
          '<table style="width:100%;max-width:420px;border-collapse:collapse;margin-top:12px"><tr><td>Team plan (10 seats)</td><td style="text-align:right">$1,100.00</td></tr><tr><td>Additional events (2.8M)</td><td style="text-align:right">$140.00</td></tr><tr><td style="border-top:1px solid var(--line);padding-top:6px"><b>Total</b></td><td style="border-top:1px solid var(--line);padding-top:6px;text-align:right"><b>$1,240.00</b></td></tr></table>',
        ),
        att: [{ name: 'Receipt-2231-4418.pdf', kb: 38 }],
      },
    ],
  })

  add({
    subject: 'Photos from Big Sur 📸',
    labels: ['personal', 'travel'],
    starred: true,
    msgs: [
      {
        from: P.leo,
        to: [ME, P.maya, P.chris],
        at: d(2, 21, 14),
        body: p(
          'Finally went through everything from the trip. Some absolute bangers in here. Sam, the one of you almost falling into the creek is my new phone wallpaper.',
          'Full album link is in the shared drive, attaching my favorites.',
          'Leo',
        ),
        att: [
          { name: 'bixby-bridge.jpg', kb: 3420, hue: 205 },
          { name: 'mcway-falls.jpg', kb: 2980, hue: 170 },
          { name: 'campfire.jpg', kb: 2650, hue: 22 },
        ],
      },
      {
        from: P.maya,
        to: [P.leo, ME, P.chris],
        at: d(2, 22, 3),
        body: p('These are incredible 😭 the falls one should be printed and framed. Next trip: Joshua Tree in March?'),
      },
      {
        from: P.chris,
        to: [P.leo, ME, P.maya],
        at: d(1, 8, 17),
        body: p("I'm in for Joshua Tree. Sam, you're in charge of not falling into anything this time."),
      },
    ],
  })

  add({
    subject: 'Design critique: Settings information architecture',
    labels: ['work', 'atlas'],
    msgs: [
      {
        from: P.elena,
        to: [ME, P.hana],
        at: d(3, 15, 40),
        body: p(
          'Hey both — sharing the new IA for Settings ahead of Thursday\'s crit. The big change is splitting "Workspace" and "Personal" settings into separate top-level sections, and moving billing out of the admin panel.',
          'Figma link is in the file below. Comments welcome directly in the file.',
          'E.',
        ),
        att: [{ name: 'settings-IA-v2.pdf', kb: 1840 }],
      },
      {
        from: P.hana,
        to: [P.elena, ME],
        at: d(3, 17, 2),
        body: p("Love the split. One concern: keyboard shortcuts feel like they belong in Personal, not Workspace. Also can we keep a search box at the top? Settings pages always grow."),
      },
      {
        from: ME,
        to: [P.elena, P.hana],
        at: d(2, 9, 30),
        body: p(
          "+1 to Hana on search. From the platform side, anything under Workspace should be permission-gated — I'll make sure the API returns 403s rather than hiding fields client-side.",
          'Sam',
        ),
      },
    ],
  })

  add({
    subject: 'Your weekly run summary: 21.4 km 🏃',
    cat: 'social',
    msgs: [
      {
        from: P.strava,
        at: d(2, 7, 0),
        body: p(
          '<h2 style="margin:0">Nice work this week, Sam</h2>',
          '<table style="width:100%;max-width:420px"><tr><td>Distance</td><td><b>21.4 km</b></td></tr><tr><td>Time</td><td><b>1h 58m</b></td></tr><tr><td>Elevation</td><td><b>312 m</b></td></tr></table>',
          "You're 8.6 km away from your monthly goal. Keep it up!",
        ),
      },
    ],
  })

  add({
    subject: 'Deployment failed for atlas-web (production)',
    cat: 'updates',
    labels: ['work'],
    msgs: [
      {
        from: P.vercel,
        at: d(3, 22, 51),
        body: p(
          '<b style="color:#d93025">● Error</b> — The deployment <code>atlas-web-7f3a2c</code> failed during the build step.',
          '<pre style="background:var(--code-bg);padding:12px;border-radius:8px;font-size:12px;white-space:pre-wrap">Type error: Property \'teamId\' does not exist on type \'Session\'.\n  src/app/(dashboard)/billing/page.tsx:42:18</pre>',
          'The previous production deployment is still serving traffic.',
        ),
      },
    ],
  })

  add({
    subject: 'Re: Seed round follow-up',
    labels: ['work'],
    important: true,
    msgs: [
      {
        from: P.nora,
        at: d(4, 13, 22),
        body: p(
          'Sam,',
          "Great catching up at the founders dinner. As promised, here's the intro deck for our platform program — we run a quarterly infra roundtable for portfolio CTOs and I think you'd be a great speaker for the January session.",
          "Also, no pressure, but if Lumen ever thinks about the next round, I'd love to be an early call.",
          sig('Nora Lindqvist', 'Partner, Northwind Ventures'),
        ),
        att: [{ name: 'Northwind-Platform-Program.pdf', kb: 2240 }],
      },
    ],
  })

  add({
    subject: 'Your order #BB-50192 has shipped',
    cat: 'updates',
    labels: ['receipts'],
    msgs: [
      {
        from: P.bookshop,
        at: d(4, 10, 11),
        body: p(
          'Good news — your books are on their way!',
          ul('<i>Designing Data-Intensive Applications</i> — Martin Kleppmann', '<i>The Overstory</i> — Richard Powers', '<i>A Philosophy of Software Design</i> — John Ousterhout'),
          'Estimated delivery: <b>Thursday</b>. Tracking: 1Z 999 AA1 0123 4567 84',
        ),
      },
    ],
  })

  add({
    subject: 'Fieldnotes Weekly #214: The quiet return of the index card',
    cat: 'promotions',
    msgs: [
      {
        from: P.fieldnotes,
        at: d(4, 6, 30),
        body: p(
          '<h2 style="margin:0">The quiet return of the index card</h2>',
          "This week: why a growing number of engineers are moving their planning off screens, a surprisingly good $12 fountain pen, and a reader's desk tour from Kyoto.",
          '<a href="https://example.com">Read online</a>',
        ),
      },
    ],
  })

  add({
    subject: 'Invitation: Atlas launch rehearsal @ Thu 2pm – 3pm',
    cat: 'updates',
    labels: ['atlas'],
    msgs: [
      {
        from: P.calendar,
        at: d(5, 9, 3),
        body: p(
          '<b>Atlas launch rehearsal</b>',
          'Thursday · 2:00 – 3:00pm (Pacific Time)<br>Room: Mission (4F) and video call',
          'Organizer: Priya Shah<br>Guests: Sam Rivera, Marcus Chen, Elena García, Hana Kim',
          '<a href="https://example.com">Yes</a> · <a href="https://example.com">Maybe</a> · <a href="https://example.com">No</a>',
        ),
        att: [{ name: 'invite.ics', kb: 2 }],
      },
    ],
  })

  add({
    subject: 'Coffee next week?',
    msgs: [
      {
        from: P.ben,
        at: d(5, 16, 45),
        body: p(
          'Hey Sam, long time!',
          "I'm in SF next Tuesday–Thursday for a client workshop. Want to grab coffee? I'd love to hear how Atlas is going — and pick your brain about design-engineering handoff, we're struggling with it at Halcyon.",
          'Ben',
        ),
      },
      {
        from: ME,
        to: [P.ben],
        at: d(5, 18, 2),
        body: p('Absolutely! Wednesday 10am at Sightglass on 7th? Happy to share what worked (and what very much did not) for us.', 'Sam'),
      },
      {
        from: P.ben,
        at: d(4, 8, 55),
        body: p('Perfect, see you there ☕'),
      },
    ],
  })

  add({
    subject: 'Your ride with Loop on Tuesday evening',
    cat: 'updates',
    labels: ['receipts'],
    msgs: [
      {
        from: P.loop,
        at: d(6, 22, 40),
        body: p('<h2 style="margin:0">$18.60</h2>', 'Thanks for riding with Nadia. Mission St → Valencia St · 12 min · 3.1 km', 'Rate your ride to help us improve.'),
      },
    ],
  })

  add({
    subject: 'Reminder: SF Platform Engineering Meetup — Thursday',
    cat: 'social',
    msgs: [
      {
        from: P.meetup,
        at: d(6, 12, 0),
        body: p(
          '<b>Postgres at scale: lessons from 3 migrations</b>',
          'Thursday, 6:30 PM · Lumen Labs HQ, 4th floor<br>124 people going',
          "You RSVP'd yes. Doors open at 6:00 — pizza and drinks provided.",
        ),
      },
    ],
  })

  add({
    subject: 'Lisbon apartment — booking confirmed',
    cat: 'updates',
    labels: ['travel'],
    msgs: [
      {
        from: P.staybnb,
        at: d(7, 19, 10),
        body: p(
          '<h2 style="margin:0">Pack your bags! You\'re going to Lisbon.</h2>',
          'Sunny loft in Alfama with river views · Hosted by Inês',
          'Check-in: Fri, Oct 16 after 3:00 PM<br>Checkout: Sun, Oct 25 by 11:00 AM<br>Guests: 1',
          'Total paid: $1,184.20',
        ),
        att: [{ name: 'alfama-loft.jpg', kb: 1320, hue: 34 }],
      },
    ],
  })

  add({
    subject: 'Incident review: API latency spike (Sept 18)',
    labels: ['work'],
    msgs: [
      {
        from: P.jonas,
        to: [ME, P.marcus, { name: 'Engineering', email: 'eng@lumenlabs.io' }],
        at: d(8, 11, 30),
        body: p(
          'Postmortem doc for last week\'s latency incident is ready for review.',
          '<b>Summary:</b> p99 latency on /v2/events rose to 4.8s for 37 minutes after an index was dropped by a migration that ran out of order. No data loss.',
          '<b>Action items</b>',
          ul('Add migration ordering check to CI (owner: Jonas)', 'Alert on p99 > 1s for 5 min (owner: Sam)', 'Runbook update for rollback (owner: Marcus)'),
          'Please leave comments by Friday.',
        ),
        att: [{ name: 'postmortem-2026-09-18.pdf', kb: 305 }],
      },
      {
        from: ME,
        to: [P.jonas, P.marcus],
        at: d(7, 9, 12),
        body: p("Thanks Jonas — this is a great write-up. Alert is live as of this morning, and I added a dashboard panel for index usage so we'd catch this earlier.", 'Sam'),
      },
    ],
  })

  add({
    subject: 'Welcome to Notion Calendar',
    cat: 'promotions',
    msgs: [
      {
        from: P.notion,
        at: d(9, 14, 0),
        body: p('Your time, finally organized. Connect your calendars and see everything alongside your docs.', '<a href="https://example.com">Get started</a>'),
      },
    ],
  })

  add({
    subject: 'FreshCrate: Your box arrives Thursday',
    cat: 'promotions',
    msgs: [
      {
        from: P.grocer,
        at: d(9, 8, 20),
        body: p('This week in your crate: honeycrisp apples, delicata squash, lacinato kale, and our famous sourdough.', 'Want to skip a week? You can change your box until Tuesday at midnight.'),
      },
    ],
  })

  add({
    subject: 'Linear: 5 issues assigned to you this cycle',
    cat: 'updates',
    labels: ['work', 'atlas'],
    msgs: [
      {
        from: P.linear,
        at: d(10, 7, 30),
        body: p(
          '<b>Cycle 42</b> started today. Here\'s what\'s on your plate:',
          ul(
            'ATL-311 Status page: add component for billing API',
            'ATL-318 Rotate webhook signing secret',
            'ATL-322 Rate limits for bulk export',
            'ATL-327 Runbook: region failover',
            'ATL-330 Audit log retention to 400 days',
          ),
        ),
      },
    ],
  })

  add({
    subject: 'Re: Mentorship sessions for the new grads',
    labels: ['work'],
    msgs: [
      {
        from: P.hana,
        at: d(11, 13, 0),
        body: p(
          'Hi Sam,',
          "The four new grads start on Monday. Would you be up for running a monthly 'how our infra actually works' session? Nothing formal — a whiteboard and an hour. They'd love it.",
          'Hana',
        ),
      },
      {
        from: ME,
        to: [P.hana],
        at: d(11, 15, 22),
        body: p("I'd love to. First Thursday of each month at 4pm? I'll start with the request lifecycle: DNS to database and back.", 'Sam'),
      },
    ],
  })

  add({
    subject: 'The Pragmatic Engineer: How big tech runs on-call',
    cat: 'promotions',
    msgs: [
      {
        from: P.newsletter,
        at: d(12, 16, 0),
        body: p(
          "In today's issue: an inside look at on-call compensation across 40 companies, how rotations are structured, and why some teams are moving to follow-the-sun.",
          '<a href="https://example.com">Read the full issue</a>',
        ),
      },
    ],
  })

  add({
    subject: 'Statement available: September',
    cat: 'updates',
    labels: ['finance'],
    msgs: [
      {
        from: P.northbank,
        at: d(13, 6, 0),
        body: p('Your September statement for Checking ••7781 is ready to view in the Northbank app.', 'For your security, we never ask for your password by email.'),
        att: [{ name: 'Statement-Sep.pdf', kb: 220 }],
      },
    ],
  })

  add({
    subject: 'Rialto Cinemas: your tickets for "The Long Tide"',
    cat: 'updates',
    labels: ['receipts', 'personal'],
    msgs: [
      {
        from: P.cinema,
        at: d(14, 12, 30),
        body: p('<b>The Long Tide</b> · Saturday 8:15 PM · Screen 2', 'Seats: F7, F8', 'Show this email at the door or scan the QR code in your wallet.'),
      },
    ],
  })

  add({
    subject: 'Architecture review for the new office build-out',
    labels: ['work'],
    msgs: [
      {
        from: P.rachel,
        to: [ME],
        cc: [P.tom],
        at: d(16, 10, 0),
        body: p(
          'Hi Sam,',
          "Following our walkthrough, here's the updated floor plan for the 4th floor. We've added two more focus rooms and moved the server closet next to the riser as you suggested — that saves about 20 meters of cable run.",
          'Let me know if IT has any requirements for the network room (cooling, access control).',
          sig('Rachel Stone', 'Stone Architects'),
        ),
        att: [
          { name: '4F-floorplan-rev3.pdf', kb: 4410 },
          { name: 'focus-room-render.png', kb: 1905, hue: 140 },
        ],
      },
    ],
  })

  add({
    subject: 'Birthday plans for Chris 🎂',
    labels: ['personal'],
    msgs: [
      {
        from: P.maya,
        to: [ME, P.leo],
        at: d(18, 20, 0),
        body: p("Okay so Chris's birthday is the 14th. I'm thinking surprise karaoke? Leo already booked the private room at Pandora. Sam, can you get him there without being suspicious?"),
      },
      {
        from: P.leo,
        to: [P.maya, ME],
        at: d(18, 20, 40),
        body: p('Room is booked for 8pm, 10 people. I told them it was for a "work thing" lol'),
      },
      {
        from: ME,
        to: [P.maya, P.leo],
        at: d(17, 9, 5),
        body: p("I'll tell him we're doing dinner at the ramen place next door. He'll never know 🤫"),
      },
    ],
  })

  add({
    subject: 'Orbit Analytics: data residency options for EU customers',
    labels: ['work'],
    msgs: [
      {
        from: P.kenji,
        at: d(20, 15, 10),
        body: p(
          'Hi Sam,',
          'Following up on your question about EU data residency. We can pin your workspace to our Frankfurt region; migration takes about 48 hours with no downtime. Attached is our DPA and sub-processor list.',
          sig('Kenji Watanabe', 'Head of Data, Orbit Analytics'),
        ),
        att: [
          { name: 'Orbit-DPA-2026.pdf', kb: 640 },
          { name: 'subprocessors.xlsx', kb: 24 },
        ],
      },
    ],
  })

  add({
    subject: 'Figma: Elena mentioned you in "Atlas — Onboarding v3"',
    cat: 'updates',
    labels: ['atlas'],
    msgs: [
      {
        from: P.figma,
        at: d(22, 11, 11),
        body: p('<b>Elena García</b> commented on <b>Atlas — Onboarding v3</b>:', '<blockquote style="border-left:3px solid var(--line);margin:0;padding-left:12px">@Sam is it OK if the workspace slug is editable after creation? Need to know before we finalize this step.</blockquote>', '<a href="https://example.com">Reply in Figma</a>'),
      },
    ],
  })

  add({
    subject: 'Tax documents for 2025',
    labels: ['finance', 'personal'],
    starred: true,
    msgs: [
      {
        from: P.chris,
        at: d(30, 18, 0),
        body: p("Hey, Mom asked me to forward these — it's the 1099s from the house sale split. Keep them somewhere safe for next April.", 'C'),
        att: [
          { name: '1099-S_Rivera.pdf', kb: 118 },
          { name: 'closing-statement.pdf', kb: 402 },
        ],
      },
    ],
  })

  add({
    subject: 'Onsite agenda — October',
    labels: ['work'],
    msgs: [
      {
        from: P.priya,
        to: [ME, P.marcus, P.elena, P.hana, P.jonas],
        at: d(34, 9, 0),
        body: p(
          'Team onsite is confirmed for the week after launch. Draft agenda below — reply with anything you want to add.',
          ul('Day 1: Atlas retro + customer feedback review', 'Day 2: 2027 roadmap brainstorm', 'Day 3: Hack day + team dinner'),
          'Location: Sonoma, travel covered.',
        ),
        att: [{ name: 'onsite-agenda.docx', kb: 42 }],
      },
    ],
  })

  add({
    subject: 'Congrats on 3 years at Lumen! 🎉',
    labels: ['work'],
    msgs: [
      {
        from: P.aisha,
        at: d(45, 10, 0),
        body: p("Happy work anniversary, Sam! Three years of keeping the lights on (literally — thanks for fixing the office Wi-Fi that one time). Your gift card is in the People portal. 🎉"),
      },
    ],
  })

  add({
    subject: 'Old apartment security deposit',
    labels: ['finance', 'personal'],
    inbox: false,
    msgs: [
      {
        from: ME,
        to: [{ name: 'Greenview Property', email: 'leasing@greenviewprop.com' }],
        at: d(60, 11, 0),
        body: p("Hi, I moved out of unit 4B on August 31 and haven't received my security deposit yet. Could you let me know the status?", 'Thanks, Sam Rivera'),
      },
      {
        from: { name: 'Greenview Property', email: 'leasing@greenviewprop.com' },
        at: d(57, 15, 30),
        body: p('Hi Sam, the deposit of $2,400 was mailed on Sept 20 minus a $120 cleaning fee. Itemized statement attached.'),
        att: [{ name: 'deposit-statement-4B.pdf', kb: 64 }],
      },
    ],
  })

  add({
    subject: 'Kickoff notes — Atlas',
    labels: ['atlas', 'work'],
    inbox: false,
    msgs: [
      {
        from: P.priya,
        to: [ME, P.marcus, P.elena],
        at: d(92, 14, 0),
        body: p(
          'Notes from today\'s kickoff:',
          ul('Goal: self-serve onboarding for teams < 50', 'North star: time-to-first-dashboard under 10 minutes', 'Launch target: early October'),
          "Let's go!",
        ),
      },
    ],
  })

  // ───────────────────────────── Sent-only
  add({
    subject: 'Intro: Ben ↔ Elena (design-engineering handoff)',
    inbox: false,
    msgs: [
      {
        from: ME,
        to: [P.ben, P.elena],
        at: d(3, 19, 5),
        body: p(
          'Ben, meet Elena — she leads product design at Lumen and built the handoff process I was telling you about.',
          'Elena, meet Ben — design director at Halcyon, fighting the same Figma-to-code battles we were last year.',
          "I'll let you two take it from here!",
          'Sam',
        ),
      },
    ],
  })

  add({
    subject: 'Status page copy for Atlas',
    labels: ['atlas'],
    inbox: false,
    msgs: [
      {
        from: ME,
        to: [P.priya],
        at: d(6, 16, 20),
        body: p("Draft copy for the status page components attached. I kept the names customer-facing (e.g. 'Dashboards' rather than 'query-service').", 'Sam'),
        att: [{ name: 'status-page-components.docx', kb: 31 }],
      },
    ],
  })

  // ───────────────────────────── Snoozed
  add({
    subject: 'Renew passport before the trip',
    labels: ['travel', 'personal'],
    snoozeUntil: now + 3 * time.MIN,
    msgs: [
      {
        from: ME,
        to: [ME],
        at: d(15, 8, 0),
        body: p('Note to self: passport expires in February — some countries need 6 months validity. Check Portugal rules + book renewal appointment.'),
      },
    ],
  })

  add({
    subject: 'Performance review self-assessment due',
    labels: ['work'],
    important: true,
    snoozeUntil: atHour(2, 8, 0, now),
    msgs: [
      {
        from: P.aisha,
        at: d(3, 9, 0),
        body: p("Friendly reminder that H2 self-assessments are due on the 10th. The template is in the People portal. Reach out if you'd like to talk through it!"),
      },
    ],
  })

  // ───────────────────────────── Spam
  add({
    subject: 'CONGRATULATIONS!!! You have been selected to receive 2.5 BTC',
    spam: true,
    inbox: false,
    unread: true,
    msgs: [
      {
        from: P.spam1,
        at: d(1, 3, 12),
        body: p('Dear Valued Winner, you have been SELECTED. Click the link below within 24 HOURS to claim your crypto reward. Act now!!!'),
      },
    ],
  })
  add({
    subject: 'Limited offer: 90% off all medications',
    spam: true,
    inbox: false,
    msgs: [{ from: P.spam2, at: d(4, 2, 45), body: p('No prescription needed. Fast worldwide shipping. Discreet packaging.') }],
  })

  // ───────────────────────────── Trash
  add({
    subject: 'Harbor & Pine: Last chance — Summer Sale ends tonight',
    cat: 'promotions',
    trash: true,
    inbox: false,
    msgs: [{ from: P.harbor, at: d(26, 9, 0), body: p('Final hours to save up to 50% on outdoor furniture.') }],
  })
  add({
    subject: 'Your weekly run summary: 14.2 km',
    cat: 'social',
    trash: true,
    inbox: false,
    msgs: [{ from: P.strava, at: d(9, 7, 0), body: p('Distance 14.2 km · Time 1h 21m · Elevation 180 m') }],
  })

  // ───────────────────────────── Older filler for density
  const older: Array<[Contact, string, string, Category, string[]]> = [
    [P.github, '[lumen/infra] Dependabot: bump pg from 8.11.3 to 8.13.1', 'Bumps pg from 8.11.3 to 8.13.1. Release notes and changelog included.', 'updates', ['work']],
    [P.fieldnotes, 'Fieldnotes Weekly #213: Desks of the Pacific Northwest', 'Standing desks, sit-stand debates, and one very tidy woodshop.', 'promotions', []],
    [P.linkedin, 'You appeared in 42 searches this week', 'See who is looking at your profile and how you compare.', 'social', []],
    [P.northbank, 'Large purchase alert: $1,184.20', 'A purchase of $1,184.20 at STAYBNB was made on your card ending in 4242.', 'updates', ['finance']],
    [P.harbor, 'New arrivals: the Linen Collection', 'Breathable, washed linen bedding in six new colors.', 'promotions', []],
    [P.meetup, 'New event: Rust Bay Area — October hack night', 'Join 60+ Rustaceans for pizza and pairing.', 'social', []],
    [P.stripe, 'Your receipt from Vercel Inc. #1893-2211', 'Amount paid: $20.00 · Pro plan', 'updates', ['receipts']],
    [P.newsletter, 'The Pragmatic Engineer: The state of platform teams', 'We surveyed 1,100 engineers on how platform teams are organized.', 'promotions', []],
    [P.grocer, 'FreshCrate: Rate last week\'s box', 'Tell us what you loved (or didn\'t) and earn 50 points.', 'promotions', []],
    [P.strava, 'Leo Martins gave you kudos', 'Leo Martins gave you kudos on "Morning Run – Presidio loop".', 'social', []],
    [P.github, '[lumen/atlas] CI failed on main: e2e / billing.spec.ts', 'Run #8812 failed. 1 failing test: billing › upgrade from free to team.', 'updates', ['work']],
    [P.skyward, 'Earn double miles this fall', 'Book any trip by Oct 31 and earn 2x SkyMiles on your next flight.', 'promotions', []],
  ]
  older.forEach(([from, subject, text, cat, labels], i) => {
    add({ subject, cat, labels, unread: i % 4 === 1, msgs: [{ from, at: d(14 + i * 5, 8 + (i % 9), (i * 17) % 60), body: p(text) }] })
  })

  // ───────────────────────────── Drafts & scheduled
  const drafts: Draft[] = [
    {
      id: 'd1',
      to: [P.priya],
      cc: [],
      bcc: [],
      subject: 'Status page — link from help menu',
      html: p('Hi Priya,', 'Quick update: the status page is live on status.lumenlabs.io and I added the link to the in-app help menu behind a flag. We can flip it on launch morning.', ''),
      attachments: [],
      updatedAt: m(95),
    },
    {
      id: 'd2',
      to: [],
      cc: [],
      bcc: [],
      subject: 'Lisbon recommendations?',
      html: p('Hey! You were in Lisbon last spring right? Any must-eat spots near Alfama'),
      attachments: [],
      updatedAt: d(2, 23, 10),
    },
  ]
  const outbox: Draft[] = [
    {
      id: 'o1',
      to: [P.tom],
      cc: [P.priya],
      bcc: [],
      subject: 'Q3 reforecast — infra numbers',
      html: p('Hi Tom,', "Infra lines are filled in: observability at $4.2k/mo and two additional db replicas at $1.9k/mo combined. Marcus confirmed the sizing.", 'Sam'),
      attachments: [{ id: 'ao1', name: 'Q3-reforecast-infra.xlsx', size: 71 * 1024, kind: 'sheet' }],
      updatedAt: m(20),
      sendAt: atHour(1, 8, 0, now),
      scheduled: true,
    },
  ]

  return { threads, drafts, outbox }
}

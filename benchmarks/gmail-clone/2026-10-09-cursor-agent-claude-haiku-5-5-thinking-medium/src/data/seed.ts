import type { Attachment, AttachmentKind, Category, Contact, Data, Label, Message, SystemFolder } from '../types'

export const DATA_VERSION = 3
const HOUR = 3_600_000

export const ME: Contact = { name: 'Alex Rivera', email: 'alex.rivera@northwind.dev' }

export const LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#1a73e8' },
  { id: 'finance', name: 'Finance', color: '#188038' },
  { id: 'travel', name: 'Travel', color: '#e37400' },
  { id: 'personal', name: 'Personal', color: '#a142f4' },
]

const PEOPLE: Record<string, string> = {
  'Sarah Chen': 'sarah.chen@northwind.dev',
  'Jordan Kim': 'jordan.kim@northwind.dev',
  'Priya Nair': 'priya.nair@lumen-legal.com',
  'Sam Okafor': 'sam.okafor@northwind.dev',
  'Maya Patel': 'maya.patel@gmail.com',
  'Mom': 'claire.rivera@gmail.com',
  'Tom Becker': 'tom@becker-design.io',
  'Lena Hoffmann': 'lena@hoffmann-studio.de',
  'Recruiter Dana Ruiz': 'dana.ruiz@helix-talent.com',
  'GitHub': 'noreply@github.com',
  'Linear': 'notifications@linear.app',
  'Notion': 'team@mail.notion.so',
  'Figma': 'no-reply@figma.com',
  'Stripe': 'receipts@stripe.com',
  'Delta Air Lines': 'confirmations@delta.com',
  'Google Calendar': 'calendar-notification@google.com',
  'Amazon': 'shipment-tracking@amazon.com',
  'Northwind Bank': 'alerts@northwindbank.com',
  'Westside Clinic': 'reminders@westsideclinic.org',
  'The Weekly Synth': 'hello@theweeklysynth.com',
  'Reddit Digest': 'digest@reddit.com',
  'LinkedIn': 'editor@linkedin.com',
  'Spring Deals': 'promo@springdeals.shop',
  'Quanta Systems Ops': 'ops-alerts@quantasys.io',
  'Helen Burke': 'helen.burke@northwind.dev',
}

const emailOf = (name: string) => PEOPLE[name] ?? `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`
const c = (name: string): Contact => ({ name, email: emailOf(name) })
const ATT_KINDS: Record<string, AttachmentKind> = { pdf: 'pdf', png: 'image', jpg: 'image', doc: 'doc', docx: 'doc', xlsx: 'sheet', csv: 'sheet' }

function att(name: string, size: number): Attachment {
  const ext = name.split('.').pop() ?? ''
  return { id: `${name}-${size}`, name, size, kind: ATT_KINDS[ext] ?? 'other' }
}

interface Spec {
  /** sender display name, or 'me' */
  from: string
  /** hours ago */
  ago: number
  to?: string[]
  cc?: string[]
  body: string
  read?: boolean
  star?: boolean
  folder?: SystemFolder
  labels?: string[]
  category?: Category
  files?: [string, number][]
  snoozedHours?: number
  scheduledInHours?: number
}

interface Thread {
  subject: string
  messages: Spec[]
}

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('')

const HAND_THREADS: Thread[] = [
  {
    subject: 'Q4 roadmap review: notes and deck',
    messages: [
      {
        from: 'Sarah Chen', ago: 26, to: ['me'], star: true, read: true, labels: ['work'],
        body: p('Hey Alex,', 'Attached is the Q4 roadmap deck. The main change is that we push onboarding v2 to November so the billing migration can ship first.', 'Can you look at slides 6 to 9 before Thursday? I want your take on the capacity numbers, they feel optimistic.', 'Thanks,<br>Sarah'),
        files: [['Q4-roadmap-final.pdf', 2_480_000]],
      },
      {
        from: 'me', ago: 22, to: ['Sarah Chen'], read: true, body: p('Thanks Sarah. Slides 6 to 9 look fine to me, but I agree the capacity line is aggressive. I would plan for 0.8 of the current velocity and call out the risk explicitly.', 'I will add comments in the doc tonight.'),
      },
      {
        from: 'Sarah Chen', ago: 4.5, to: ['me'], cc: ['Sam Okafor'], labels: ['work'], body: p('Perfect, that is exactly what I was hoping for. Sam, can you join the Thursday review? Alex is proposing the 0.8 velocity scenario.', 'Sending the updated deck after lunch.'), read: false,
      },
    ],
  },
  {
    subject: 'Design review: onboarding flow',
    messages: [
      {
        from: 'Jordan Kim', ago: 52, to: ['me'], cc: ['Tom Becker'], read: true, labels: ['work'], body: p('Hi team, I put the new onboarding flow in Figma. Three screens changed: the workspace picker, the invite step, and the empty state.', 'Would love reactions before the Friday review.'), star: false,
      },
      {
        from: 'Tom Becker', ago: 48, to: ['Jordan Kim', 'me'], read: true, labels: ['work'], body: p('Love the workspace picker. The invite step still feels like a wall of inputs though. Could we default to a single email field and reveal more on demand?'),
      },
      {
        from: 'Jordan Kim', ago: 30, to: ['Tom Becker', 'me'], read: true, labels: ['work'], body: p('Good call. I tried it: a single field with a "add more" link cut the step from 40 seconds to 12 in my test run.', 'Alex, can you check the accessibility notes on the empty state? The contrast on the helper text is borderline.'),
      },
      {
        from: 'me', ago: 29, to: ['Jordan Kim'], read: true, body: p('Checking now. Helper text is about 3.9:1 on the tinted background, so we need to darken it a bit. Will leave a comment on the frame.'),
      },
      {
        from: 'Jordan Kim', ago: 2.2, to: ['me'], cc: ['Tom Becker'], read: false, labels: ['work'], star: true, body: p('Updated frames are in. The helper text is now #4B5563 and passes AA. Ready for Friday whenever you are.'),
      },
    ],
  },
  {
    subject: 'Contract redline v3 - please review before Monday',
    messages: [
      {
        from: 'Priya Nair', ago: 7, to: ['me'], read: false, star: true, labels: ['work'], body: p('Hi Alex,', 'Attaching redline v3 of the vendor agreement. The main open points are the data residency clause (section 7.2) and the SLA credits in the appendix.', 'Could you confirm that engineering is fine with the 99.9 percent target? Legal needs an answer before Monday.', 'Best,<br>Priya'),
        files: [['vendor-agreement-redline-v3.docx', 412_000], ['sla-credits.xlsx', 88_400]],
      },
    ],
  },
  {
    subject: 'Lunch on Thursday?',
    messages: [{ from: 'Maya Patel', ago: 1.1, to: ['me'], read: false, labels: ['personal'], body: p('Hey! Are you free for lunch Thursday? There is a new ramen place near the old office. I can do 12:30 or 1:15, whatever works.') }],
  },
  {
    subject: 'Sunday dinner at ours?',
    messages: [{ from: 'Mom', ago: 3.4, to: ['me'], read: false, labels: ['personal'], body: p('Hi sweetheart, dad wants to grill on Sunday if you can come. Bring whoever you want. Let me know!') }],
  },
  {
    subject: 'Your September invoice is ready',
    messages: [{ from: 'Stripe', ago: 9, to: ['me'], read: true, labels: ['finance'], category: 'updates', body: p('Hi Alex Rivera,', 'Your invoice for September 2026 is ready. Amount due: $1,284.00, payable by October 15.'), files: [['invoice-INV-2026-0918.pdf', 96_000]] }],
  },
  {
    subject: 'Your trip to Lisbon: confirmation ABC123',
    messages: [
      { from: 'Delta Air Lines', ago: 140, to: ['me'], read: true, labels: ['travel'], category: 'updates', body: p('Your flight is booked. Confirmation code: ABC123.', 'Depart JFK 19:05 on Oct 22, arrive LIS 07:40 on Oct 23. Seat 14A (window).'), files: [['itinerary-ABC123.pdf', 233_000]] },
      { from: 'Delta Air Lines', ago: 72, to: ['me'], read: true, labels: ['travel'], category: 'updates', body: p('Reminder: check in is open. Your gate will be posted 90 minutes before departure.') },
    ],
  },
  {
    subject: 'Invitation: 1:1 Alex / Sam @ Tue 10:30',
    messages: [{ from: 'Google Calendar', ago: 5, to: ['me'], read: true, category: 'updates', body: p('Sam Okafor has invited you to a recurring event.', '<strong>1:1 Alex / Sam</strong><br>Tuesday, 10:30 to 11:00<br>Google Meet') }],
  },
  {
    subject: 'Board deck feedback',
    messages: [
      { from: 'Sam Okafor', ago: 60, to: ['me'], read: true, labels: ['work'], body: p('Alex, I went through the board deck. Slide 4 needs the retention chart split by cohort, otherwise the board will ask.', 'Can you own the metrics slides?') },
      { from: 'me', ago: 55, to: ['Sam Okafor'], read: true, body: p('On it. I will have the cohort version by Wednesday.') },
      { from: 'Sam Okafor', ago: 1.8, to: ['me'], read: false, star: true, labels: ['work'], body: p('Amazing, thank you. One more thing: can we move the runway slide to the end? I want the ask to land on the last page.') },
    ],
  },
  {
    subject: 'Quick intro: Staff Engineer role at Helix',
    messages: [{ from: 'Recruiter Dana Ruiz', ago: 11, to: ['me'], read: false, body: p('Hi Alex,', 'I came across your work on the sync engine and wanted to reach out about a Staff Engineer role at Helix. Remote-first, strong platform team, and a real budget for infra.', 'Would you be open to a 20 minute call this week?') }],
  },
  {
    subject: 'Launch checklist updated',
    messages: [{ from: 'Notion', ago: 16, to: ['me'], read: true, category: 'social', body: p('Priya Nair commented on <strong>Launch checklist</strong>: "Legal sign-off is blocked until the SLA appendix is final."') }],
  },
  {
    subject: '3 issues assigned to you in Lumen Web',
    messages: [{ from: 'Linear', ago: 13, to: ['me'], read: true, category: 'updates', body: p('You have been assigned three issues: <strong>LW-412</strong> flaky checkout test, <strong>LW-418</strong> invoice PDF fonts, <strong>LW-430</strong> SSO redirect loop.') }],
  },
  {
    subject: '[northwind/web] Build failed on main',
    messages: [{ from: 'GitHub', ago: 0.4, to: ['me'], read: false, category: 'updates', body: p('The workflow <strong>CI</strong> failed on <code>main</code> (commit 8f2c1ab, "bump playwright").', 'Failing job: e2e / chromium. View run to see logs.') }],
  },
  {
    subject: 'Your package has shipped',
    messages: [{ from: 'Amazon', ago: 20, to: ['me'], read: true, category: 'updates', body: p('Your package is on the way. Arriving Thursday, October 11 by 8 PM.') }],
  },
  {
    subject: 'Appointment reminder: Thursday 9:15',
    messages: [{ from: 'Westside Clinic', ago: 33, to: ['me'], read: true, category: 'updates', body: p('This is a reminder of your appointment with Dr. Osei on Thursday at 9:15. Reply CANCEL to reschedule.') }],
  },
  {
    subject: 'Your monthly statement is ready',
    messages: [{ from: 'Northwind Bank', ago: 96, to: ['me'], read: true, labels: ['finance'], category: 'updates', body: p('Your September statement is available in the app. Closing balance is shown on the summary page.'), files: [['statement-2026-09.pdf', 178_000]] }],
  },
  {
    subject: 'Rent reminder: October',
    messages: [{ from: 'Helen Burke', ago: 80, to: ['me'], read: true, labels: ['finance', 'personal'], body: p('Hi Alex, friendly reminder that October rent is due on the 1st. Transfer details are the same as last time.') }],
  },
  {
    subject: 'Lisbon offsite logistics',
    messages: [
      { from: 'Helen Burke', ago: 200, to: ['me'], read: true, labels: ['travel', 'work'], body: p('Team, here is the draft plan for the Lisbon offsite. Flights, hotel, and the schedule are in the doc.') },
      { from: 'me', ago: 190, to: ['Helen Burke'], read: true, folder: 'sent', labels: ['travel'], body: p('Looks great. Can we move the workshop to Wednesday morning? Thursday afternoon is packed for the platform review.') },
    ],
  },
  {
    subject: 'Re: Quarterly planning notes',
    messages: [{ from: 'me', ago: 300, to: ['Sarah Chen'], read: true, folder: 'sent', labels: ['work'], body: p('Sarah, notes below. Main decision: we freeze scope on Oct 14 and cut anything not tied to billing.') }],
  },
  {
    subject: 'Follow-up after the vendor call',
    messages: [{ from: 'me', ago: 0, to: ['Priya Nair'], read: true, folder: 'scheduled', scheduledInHours: 16, body: p('Priya, thanks for the call. Attaching the SLA numbers we discussed. I will confirm engineering sign-off by end of day.') }],
  },
  {
    subject: 'Ideas for the pricing page',
    messages: [{ from: 'me', ago: 4, to: [], read: true, folder: 'drafts', body: p('Draft: three options, one clear recommendation. I think we should lead with annual pricing and show monthly as a secondary toggle.') }],
  },
  {
    subject: 'Intro to Helix recruiter',
    messages: [{ from: 'me', ago: 2, to: ['Recruiter Dana Ruiz'], read: true, folder: 'drafts', body: p('Hi Dana,') }],
  },
  {
    subject: 'Hiring panel availability',
    messages: [{ from: 'Sam Okafor', ago: 40, to: ['me'], read: true, labels: ['work'], body: p('Could you make the panel on Oct 15? We need two more interviewers for the staff role.'), snoozedHours: 26 }],
  },
  {
    subject: 'Bring the good slides this time',
    messages: [{ from: 'Tom Becker', ago: 54, to: ['me'], read: true, category: 'social', body: p('Lol. See you Friday.') }],
  },
  {
    subject: 'Congratulations! You have won a cruise!!!',
    messages: [{ from: 'Spring Deals', ago: 110, to: ['me'], read: true, folder: 'spam', category: 'promotions', body: p('CLICK NOW to claim your free cruise. Limited time only!!!') }],
  },
  {
    subject: 'Old newsletter draft from 2024',
    messages: [{ from: 'me', ago: 9000, to: ['Maya Patel'], read: true, folder: 'trash', body: p('Old draft I never sent.') }],
  },
  {
    subject: 'Stand-up notes archived',
    messages: [{ from: 'Sam Okafor', ago: 500, to: ['me'], read: true, folder: 'archive', labels: ['work'], body: p('Notes from the stand-up. Nothing blocking, two follow ups for the billing team.') }],
  },
  {
    subject: 'Lumen Legal: signature request',
    messages: [{ from: 'Quanta Systems Ops', ago: 130, to: ['me'], read: true, folder: 'archive', body: p('Your DocuSign envelope has been completed. Copies are attached.'), files: [['signed-msa.pdf', 510_000]] }],
  },
  {
    subject: 'Photos from Lisbon!',
    messages: [{ from: 'Maya Patel', ago: 260, to: ['me'], read: true, labels: ['personal'], category: 'social', body: p('Some shots from last year, sorry for the delay.'), files: [['lisbon-01.png', 2_100_000], ['lisbon-02.png', 1_800_000], ['lisbon-03.png', 1_650_000]] }],
  },
]

const FILLER_SENDERS = ['The Weekly Synth', 'Reddit Digest', 'LinkedIn', 'Spring Deals', 'Figma', 'Notion', 'Linear', 'Stripe', 'Amazon']
const FILLER_SUBJECTS: [string, Category][] = [
  ['Your weekly digest: 8 stories you missed', 'promotions'],
  ['New comments on your post', 'social'],
  ['You appeared in 14 searches this week', 'social'],
  ['Summer sale: up to 60 percent off', 'promotions'],
  ['Project update: 4 tasks moved to Done', 'updates'],
  ['Your receipt from Stripe', 'updates'],
  ['Weekly synth #214: modular patches and tape loops', 'promotions'],
  ['Trending in r/programming today', 'social'],
  ['Someone liked your comment', 'social'],
  ['Your order has been delivered', 'updates'],
  ['Flash deal ends tonight', 'promotions'],
  ['Comment mentioned you in Lumen Web', 'updates'],
  ['New file shared with you: Brand guidelines v2', 'updates'],
  ['5 people you may know are now on LinkedIn', 'social'],
]

/** Deterministic PRNG so the seed looks identical across reloads of the same generation */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function buildFiller(): Thread[] {
  const rand = rng(42)
  const out: Thread[] = []
  for (let i = 0; i < 46; i++) {
    const sender = FILLER_SENDERS[Math.floor(rand() * FILLER_SENDERS.length)]
    const [subject, category] = FILLER_SUBJECTS[Math.floor(rand() * FILLER_SUBJECTS.length)]
    const ago = 12 + Math.floor(rand() * 24 * 14) / 4 // up to ~14 days
    out.push({
      subject: i % 3 === 0 ? subject : `${subject} #${i + 1}`,
      messages: [{ from: sender, ago, to: ['me'], read: rand() > 0.35, category, body: p('Hi there,', 'Here is what changed since your last visit. Open the message to see the full list of updates, offers, and links.', 'You are receiving this because you subscribed to updates from this sender.'), star: rand() > 0.93, labels: rand() > 0.8 ? ['work'] : [], files: rand() > 0.9 ? [['overview.pdf', 140_000]] : undefined }],
    })
  }
  return out
}

export function buildSeed(now: number = Date.now()): Data {
  const messages: Record<string, Message> = {}
  const all = [...HAND_THREADS, ...buildFiller()]

  all.forEach((thread, ti) => {
    const threadId = `thread-${ti + 1}`
    thread.messages.forEach((spec, mi) => {
      const id = `msg-${ti + 1}-${mi + 1}`
      const from = spec.from === 'me' ? ME : c(spec.from)
      const toList = (spec.to ?? []).map((n) => (n === 'me' ? ME : c(n)))
      const ccList = (spec.cc ?? []).map((n) => (n === 'me' ? ME : c(n)))
      const folder: SystemFolder = spec.folder ?? (spec.from === 'me' ? 'sent' : 'inbox')
      const date = now - spec.ago * HOUR
      const msg: Message = {
        id,
        threadId,
        from,
        to: toList.length ? toList : spec.from === 'me' ? [] : [ME],
        cc: ccList,
        bcc: [],
        subject: thread.subject,
        body: spec.body,
        date,
        read: spec.read ?? folder !== 'inbox',
        starred: spec.star ?? false,
        folder,
        labels: spec.labels ?? [],
        category: spec.category ?? 'primary',
        attachments: (spec.files ?? []).map(([name, size]) => att(name, size)),
      }
      if (spec.snoozedHours) msg.snoozedUntil = now + spec.snoozedHours * HOUR
      if (spec.scheduledInHours) {
        msg.scheduledAt = now + spec.scheduledInHours * HOUR
        msg.date = now
      }
      if (spec.folder === 'trash') msg.restoreFolder = 'inbox'
      messages[id] = msg
    })
  })

  return {
    version: DATA_VERSION,
    me: ME,
    messages,
    labels: LABELS,
    settings: { theme: 'system', density: 'comfortable', readingPane: 'right', signature: '-- \nAlex Rivera\nNorthwind', undoSeconds: 8 },
    recentSearches: [],
  }
}

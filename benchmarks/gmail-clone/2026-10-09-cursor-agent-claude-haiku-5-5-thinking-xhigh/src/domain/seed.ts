import { uid } from '../lib/ids';
import { createRng } from '../lib/random';
import { htmlToText } from '../lib/text';
import { DAY, HOUR, MINUTE, startOfDay } from '../lib/time';
import type {
  Address,
  AttachmentKind,
  Category,
  Draft,
  Label,
  Location,
  MailData,
  Message,
  Outgoing,
  Settings,
  Thread,
} from './types';

export const ACCOUNT: Address = { name: 'Jordan Ellis', email: 'jordan.ellis@example.com' };

export const PEOPLE = {
  priya: { name: 'Priya Raman', email: 'priya.raman@northwindlabs.io' },
  aisha: { name: 'Aisha Khan', email: 'aisha.khan@northwindlabs.io' },
  marcus: { name: 'Marcus Chen', email: 'marcus.chen@brightwave.io' },
  dana: { name: 'Dana Whitfield', email: 'dana@halcyon.health' },
  sam: { name: 'Sam Okoye', email: 'sam@kestrelstudio.com' },
  ben: { name: 'Ben Carter', email: 'ben.carter@proton.me' },
  helen: { name: 'Helen Ellis', email: 'helen.ellis@outlook.com' },
  nina: { name: 'Nina Rossi', email: 'nina@lumencoffee.co' },
  theo: { name: 'Theo Laurent', email: 'theo@laurent.design' },
  lina: { name: 'Lina Park', email: 'lina.park@mailbox.org' },
  parcelly: { name: 'Parcelly', email: 'updates@parcelly.co' },
  people: { name: 'People Team', email: 'people@northwindlabs.io' },
  calendar: { name: 'Calendar', email: 'calendar-noreply@northwindlabs.io' },
  harbor: { name: 'Harbor CI', email: 'ci@harborplatform.dev' },
  summit: { name: 'Summit Bank', email: 'alerts@summitbank.co' },
  skyline: { name: 'Skyline Air', email: 'bookings@skylineair.co' },
  pinwheel: { name: 'Pinwheel', email: 'hello@pinwheel.app' },
  digest: { name: 'The Daily Byte', email: 'hello@thedailybyte.news' },
  lumen: { name: 'Lumen Coffee', email: 'hello@lumencoffee.co' },
  atlas: { name: 'Atlas Cloud', email: 'billing@atlascloud.io' },
  winner: { name: 'Prize Desk', email: 'claim-now8831@freeoffers.biz' },
  crypto: { name: 'Crypto Insider', email: 'alerts@moonsignal.biz' },
} as const satisfies Record<string, Address>;

export type PersonKey = keyof typeof PEOPLE | 'me';

const KB = 1024;
const MB = 1024 * KB;

export const SEED_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: 'blue' },
  { id: 'finance', name: 'Finance', color: 'green' },
  { id: 'travel', name: 'Travel', color: 'amber' },
  { id: 'personal', name: 'Personal', color: 'pink' },
  { id: 'design', name: 'Design', color: 'violet' },
  { id: 'receipts', name: 'Receipts', color: 'slate' },
  { id: 'newsletters', name: 'Newsletters', color: 'teal' },
];

export const DEFAULT_SETTINGS: Settings = {
  signature: 'Jordan Ellis\nHead of Product, Northwind Labs',
  theme: 'system',
  density: 'comfortable',
  readingPane: true,
  undoSendSeconds: 5,
  categories: true,
  offline: false,
  incomingMail: true,
};

interface AttachSpec {
  name: string;
  size: number;
  kind: AttachmentKind;
}

interface MsgSpec {
  from: PersonKey;
  to?: PersonKey[];
  cc?: PersonKey[];
  at: number;
  html: string;
  attach?: AttachSpec[];
  unread?: boolean;
}

interface ThreadSpec {
  key: string;
  subject: string;
  msgs: MsgSpec[];
  location?: Location;
  category?: Category;
  labels?: string[];
  starred?: boolean;
  important?: boolean;
  snoozedUntil?: number;
}

const resolve = (key: PersonKey): Address => (key === 'me' ? ACCOUNT : PEOPLE[key]);

function toMessage(ms: MsgSpec, id: string): Message {
  const html = ms.html.trim();
  return {
    id,
    from: resolve(ms.from),
    to: (ms.to ?? (ms.from === 'me' ? [] : ['me'])).map(resolve),
    cc: (ms.cc ?? []).map(resolve),
    date: ms.at,
    html,
    text: htmlToText(html),
    attachments: (ms.attach ?? []).map((a, i) => ({ id: `${id}-a${i}`, name: a.name, size: a.size, kind: a.kind })),
    unread: ms.unread ?? false,
  };
}

function toThread(spec: ThreadSpec): Thread {
  return {
    id: `thr-${spec.key}`,
    subject: spec.subject,
    messages: spec.msgs.map((ms, i) => toMessage(ms, `msg-${spec.key}-${i}`)),
    location: spec.location ?? 'inbox',
    category: spec.category ?? 'primary',
    starred: spec.starred ?? false,
    important: spec.important ?? false,
    labelIds: spec.labels ?? [],
    snoozedUntil: spec.snoozedUntil ?? null,
  };
}

const TOPICS = ['local-first apps', 'why boring tech wins', 'pricing pages that convert', 'accessibility in dense UIs', 'queueing systems'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PROMOS = [
  'Spring menu: three new single origins',
  'Final hours: 40% off the Ethiopia bundle',
  'Your cold brew kit is back in stock',
  'Weekend only: free grinder with 1 kg bags',
  'New from Lumen Labs: nitro cold brew',
];
const TRAINING = ['Security awareness 2026', 'Data handling basics', 'Anti-harassment refresher', 'Expense policy update'];
const CITIES = ['Porto', 'Berlin', 'Tokyo', 'Montreal', 'Seville'];
const MEETINGS = ['Weekly product sync', 'Design critique', 'Hiring debrief', '1:1 with Priya', 'Sprint planning', 'Board pre-read'];

const FILLERS: Array<{
  from: PersonKey;
  subject: (n: number) => string;
  html: string;
  category: Category;
  label?: string;
}> = [
  {
    from: 'harbor',
    subject: (n) => `[harbor/api] Build #${2200 + n} passed on main`,
    html: '<p>All 1,284 checks passed in 6m 12s. The staging deploy was queued automatically.</p>',
    category: 'updates',
    label: 'work',
  },
  {
    from: 'atlas',
    subject: (n) => `Deploy succeeded: billing-worker to production (v2.${n % 9}.${n % 7})`,
    html: '<p>The release bot promoted billing-worker to production. No errors in the first ten minutes.</p>',
    category: 'updates',
    label: 'work',
  },
  {
    from: 'pinwheel',
    subject: (n) => `Mira and ${2 + (n % 5)} others commented on your post`,
    html: '<p>"Love this direction. Can we see the dark variant?" and more replies are waiting for you in Pinwheel.</p>',
    category: 'social',
  },
  {
    from: 'calendar',
    subject: (n) => `Reminder: ${MEETINGS[n % MEETINGS.length]} starts in 15 minutes`,
    html: '<p>Agenda: onboarding metrics, sync engine staging results, and the hiring update.</p>',
    category: 'updates',
    label: 'work',
  },
  {
    from: 'parcelly',
    subject: (n) => `Delivered: order PX-${80000 + n * 37}`,
    html: '<p>Your parcel was left with the front desk. Thanks for choosing Parcelly.</p>',
    category: 'updates',
    label: 'receipts',
  },
  {
    from: 'digest',
    subject: (n) => `The Daily Byte #${300 + (n % 90)}: ${TOPICS[n % TOPICS.length]}`,
    html: '<h2>Top stories</h2><ul><li>Why small teams are rebuilding their CI</li><li>Notes on typography for dense interfaces</li></ul><p>Read time: 6 minutes.</p>',
    category: 'promotions',
    label: 'newsletters',
  },
  {
    from: 'summit',
    subject: (n) => `Your ${MONTHS[n % 12]} statement is ready`,
    html: '<p>Your statement is available in the app. No action is needed.</p>',
    category: 'updates',
    label: 'finance',
  },
  {
    from: 'lumen',
    subject: (n) => PROMOS[n % PROMOS.length],
    html: '<p>Our seasonal roast is back, and shipping is free on orders over $40 this week.</p>',
    category: 'promotions',
  },
  {
    from: 'people',
    subject: (n) => `Reminder: finish "${TRAINING[n % TRAINING.length]}" by Oct ${20 + (n % 8)}`,
    html: '<p>This takes about 20 minutes. Thanks for keeping compliance training current.</p>',
    category: 'primary',
    label: 'work',
  },
  {
    from: 'skyline',
    subject: (n) => `Check-in opens for your flight to ${CITIES[n % CITIES.length]}`,
    html: '<p>Online check-in opens 24 hours before departure. Have your passport ready at the gate.</p>',
    category: 'updates',
    label: 'travel',
  },
];

function buildSpecs(ago: (h: number) => number, onDay: (d: number, h: number, m?: number) => number): ThreadSpec[] {
  const handcrafted: ThreadSpec[] = [
    {
      key: 'roadmap',
      subject: 'Q3 roadmap review: notes and decisions',
      labels: ['work'],
      important: true,
      msgs: [
        {
          from: 'priya',
          at: onDay(1, 16, 20),
          attach: [{ name: 'Q3-roadmap-notes.pdf', size: 254 * KB, kind: 'pdf' }],
          html: `<p>Hi all,</p><p>Notes from yesterday's roadmap review. We landed three decisions:</p><ul><li>The sync engine rewrite ships in Q3, behind a feature flag.</li><li>The billing revamp moves to Q4 so we can staff the migration properly.</li><li>The mobile widgets experiment is paused until we have usage data.</li></ul><p>Action items are in the doc. Please add yours by Friday.</p><p>Priya</p>`,
        },
        {
          from: 'me',
          to: ['priya'],
          at: onDay(1, 17, 2),
          html: `<p>Thanks Priya, agreed on all three. I'll write up the sync engine migration plan and have a draft ready Monday.</p>`,
        },
        {
          from: 'priya',
          at: ago(3),
          unread: true,
          html: `<p>Perfect. One ask: Marcus wants the migration plan to include a rollback path before we commit to dates. Can you add that section? No rush before Wednesday.</p><p>P.</p>`,
        },
      ],
    },
    {
      key: 'onboarding',
      subject: 'Onboarding v4: frames for review',
      labels: ['design'],
      category: 'primary',
      msgs: [
        {
          from: 'aisha',
          at: ago(5),
          unread: true,
          attach: [
            { name: 'onboarding-v4-frames.png', size: 4.2 * MB, kind: 'image' },
            { name: 'tokens.json', size: 38 * KB, kind: 'file' },
          ],
          html: `<p>Hey Jordan, the frames for onboarding v4 are attached. I tightened the progress indicator, and the empty state for new workspaces now has one clear action.</p><p>The biggest open question is whether we keep the skip button on step two. I would love your take before Thursday's review.</p><p>Aisha</p>`,
        },
      ],
    },
    {
      key: 'harbor-2291',
      subject: '[harbor/web] Build #2291 failed on main',
      labels: ['work'],
      category: 'updates',
      msgs: [
        {
          from: 'harbor',
          at: ago(1.5),
          unread: true,
          html: `<p>Build <strong>#2291</strong> failed on <code>main</code> at commit <code>7c1e9a4</code>.</p><pre>FAIL  src/billing/invoice.test.ts\n  x rounds tax per line item (42 ms)\n  Expected: 1049  Received: 1050</pre><p>Triggered by: marcus.chen (merge: billing rounding fix)</p><p><a href="https://example.com/builds/2291">View build logs</a></p>`,
        },
      ],
    },
    {
      key: 'invoice',
      subject: 'Invoice INV-2026-0931 for the October design sprint',
      category: 'primary',
      msgs: [
        {
          from: 'sam',
          at: ago(7),
          unread: true,
          attach: [{ name: 'INV-2026-0931.pdf', size: 186 * KB, kind: 'pdf' }],
          html: `<p>Hi Jordan,</p><p>Please find invoice INV-2026-0931 attached for the October design sprint (three weeks, two designers). Payment terms are net 14.</p><p>Let me know if you need a PO number or a different format.</p><p>Thanks,<br>Sam</p>`,
        },
      ],
    },
    {
      key: 'signin',
      subject: 'A new sign-in was detected on your account',
      labels: ['finance'],
      category: 'updates',
      msgs: [
        {
          from: 'summit',
          at: ago(10),
          html: `<p>We noticed a new sign-in to your Summit account from Chrome on macOS in Lisbon, Portugal at 08:41 today.</p><p>If this was you, you don't need to do anything. If not, <a href="https://example.com/secure">secure your account</a> right away.</p>`,
        },
      ],
    },
    {
      key: 'lunch',
      subject: 'Lunch on Thursday?',
      labels: ['personal'],
      msgs: [
        {
          from: 'ben',
          at: onDay(2, 12, 4),
          html: `<p>Hey! Are you free for lunch on Thursday? I'm finally back in the city and want to try that ramen place on Hanover St.</p><p>Ben</p>`,
        },
        {
          from: 'me',
          to: ['ben'],
          at: onDay(2, 13, 40),
          html: `<p>Yes! Thursday works. 12:30 is good for me, I have a call at 1:45.</p>`,
        },
      ],
    },
    {
      key: 'lisbon',
      subject: 'Your flight to Lisbon is confirmed · LIS 14 Oct',
      labels: ['travel'],
      category: 'updates',
      msgs: [
        {
          from: 'skyline',
          at: ago(30),
          attach: [
            { name: 'itinerary.pdf', size: 312 * KB, kind: 'pdf' },
            { name: 'boarding-pass.pdf', size: 96 * KB, kind: 'pdf' },
          ],
          html: `<p>Your booking is confirmed. Here are the details:</p><ul><li><strong>SL 412</strong> · 14 Oct · 06:50 to 11:35</li><li>Passenger: Jordan Ellis · Seat 14C (window)</li></ul><p>Your e-tickets and itinerary are attached. Check-in opens 24 hours before departure.</p>`,
        },
      ],
    },
    {
      key: 'sunday',
      subject: 'Sunday dinner plans',
      labels: ['personal'],
      msgs: [
        {
          from: 'helen',
          at: ago(20),
          unread: true,
          html: `<p>Sweetheart, are you coming for Sunday dinner? Your dad is making his lasagna and I ordered the good bread from the bakery on Elm.</p><p>Bring the wine this time 😉</p><p>Love, Mom</p>`,
        },
      ],
    },
    {
      key: 'coffee',
      subject: 'Re: Lumen Club renewal',
      labels: ['receipts'],
      category: 'updates',
      msgs: [
        {
          from: 'nina',
          at: onDay(4, 9, 10),
          html: `<p>Hi Jordan, thanks for reaching out. Your Lumen Club renewal is set for October 20. Would you like to switch from the 250 g bag to the 1 kg bag? It works out about 18% cheaper per gram.</p><p>Nina, Lumen Coffee</p>`,
        },
        {
          from: 'me',
          to: ['nina'],
          at: onDay(4, 11, 22),
          html: `<p>Hi Nina, switching to 1 kg sounds good. Please keep the Ethiopian single origin as the monthly pick.</p>`,
        },
      ],
    },
    {
      key: 'design-sync',
      subject: 'Updated: Design sync moved to 3:30 PM',
      labels: ['work'],
      category: 'updates',
      msgs: [
        {
          from: 'calendar',
          at: ago(0.5),
          unread: true,
          html: `<p>Aisha Khan changed the time of <strong>Design sync</strong>.</p><p>New time: today, 3:30 PM to 4:00 PM (Europe/Lisbon)<br>Location: Studio B / Video</p><p><a href="https://example.com/calendar">Open in Calendar</a></p>`,
        },
      ],
    },
    {
      key: 'parcel',
      subject: 'Your package has shipped',
      labels: ['receipts'],
      category: 'updates',
      msgs: [
        {
          from: 'parcelly',
          at: ago(9),
          html: `<p>Good news: order #PX-88213 has left our warehouse with Parcelly Express.</p><p>Estimated delivery window: 1 to 5 PM on the next business day.</p>`,
        },
      ],
    },
    {
      key: 'api-limits',
      subject: 'Quick question about the API rate limits',
      labels: ['work'],
      starred: true,
      msgs: [
        {
          from: 'marcus',
          at: onDay(1, 15, 2),
          html: `<p>Hey Jordan, quick one: are we planning to raise the default rate limit for the public API before the Q3 launch? Two partners asked about 600 requests per minute instead of 300.</p><p>No rush. If we say yes, I'll loop in the platform team tomorrow.</p><p>Marcus</p>`,
        },
      ],
    },
    {
      key: 'perf-report',
      subject: 'Performance report: March to September',
      labels: ['work'],
      msgs: [
        {
          from: 'dana',
          at: onDay(2, 10, 15),
          attach: [{ name: 'performance-report-2026.xlsx', size: 1.1 * MB, kind: 'sheet' }],
          html: `<p>Jordan, sharing the H1 to H2 performance report with the new cohort breakdown.</p><p>Headline: activation up 14%, churn flat. Mobile retention is the outlier, and I would like to dig in before the board pre-read.</p><p>Tab 3 has the raw cohort data.</p>`,
        },
      ],
    },
    {
      key: 'board-deck',
      subject: 'Board deck v7: final numbers',
      labels: ['work'],
      starred: true,
      msgs: [
        {
          from: 'dana',
          at: onDay(1, 9, 0),
          attach: [{ name: 'board-deck-v7.pptx', size: 4.8 * MB, kind: 'slides' }],
          html: `<p>Final numbers are on slide 6. Revenue and ARR line up with the finance close. Let me know if the margin callouts read clearly.</p>`,
        },
        {
          from: 'me',
          to: ['dana'],
          at: onDay(1, 9, 48),
          html: `<p>Looks great. One tweak: slide 9 needs the Q2 comparison. Otherwise ready to go.</p>`,
        },
      ],
    },
    {
      key: 'pinwheel-welcome',
      subject: 'Welcome to Pinwheel: start here',
      category: 'social',
      msgs: [
        {
          from: 'pinwheel',
          at: onDay(12, 8, 30),
          html: `<p>Hi Jordan, welcome aboard. Pinwheel is where your team shares work in progress. Start by following two or three people from your team.</p>`,
        },
      ],
    },
    {
      key: 'pinwheel-likes',
      subject: 'Ava and 4 others liked your post',
      category: 'social',
      msgs: [
        {
          from: 'pinwheel',
          at: ago(30),
          html: `<p>Ava, Theo and three others liked "Notes on onboarding v3".</p>`,
        },
      ],
    },
    {
      key: 'offsite-vote',
      subject: 'Offsite vote: pick a city by Friday',
      labels: ['work'],
      msgs: [
        {
          from: 'people',
          at: onDay(3, 14, 0),
          unread: true,
          html: `<p>Hi team, it's time to vote for the offsite city. Options:</p><ul><li>Lisbon</li><li>Porto</li><li>Montreal</li></ul><p>Reply with your top choice by Friday. The winner gets booked on Monday.</p>`,
        },
      ],
    },
    {
      key: 'tax-docs',
      subject: 'Your 2025 tax documents are ready',
      labels: ['finance'],
      category: 'updates',
      msgs: [
        {
          from: 'summit',
          at: onDay(2, 7, 10),
          unread: true,
          attach: [
            { name: '2025-tax-summary.pdf', size: 220 * KB, kind: 'pdf' },
            { name: '1099-INT.pdf', size: 88 * KB, kind: 'pdf' },
          ],
          html: `<p>Your 2025 tax documents are ready to download from the Documents tab.</p>`,
        },
      ],
    },
    {
      key: 'maintenance',
      subject: 'Scheduled maintenance: Sunday 02:00 to 03:00 UTC',
      labels: ['work'],
      category: 'updates',
      msgs: [
        {
          from: 'harbor',
          at: onDay(4, 16, 0),
          html: `<p>Harbor Platform will perform database maintenance on Sunday between 02:00 and 03:00 UTC. Deploys are frozen during the window.</p>`,
        },
      ],
    },
    {
      key: 'local-first',
      subject: '5 things we learned about local-first software',
      category: 'promotions',
      labels: ['newsletters'],
      msgs: [
        {
          from: 'digest',
          at: onDay(3, 6, 0),
          html: `<h2>Local-first, for real this time</h2><p>Storage is cheap, sync is hard, and the boring parts decide everything. Five lessons from teams that shipped offline-first in production:</p><ul><li>Conflict resolution is a product decision.</li><li>Persist the outbox, not just the state.</li><li>Searching locally is faster than searching the server.</li><li>Schema migrations need to run on the client.</li><li>Users notice offline mode only when it breaks.</li></ul>`,
        },
      ],
    },
    {
      key: 'lumen-sale',
      subject: 'Flash sale: 40% off single origins this weekend',
      category: 'promotions',
      msgs: [
        {
          from: 'lumen',
          at: ago(40),
          unread: true,
          html: `<p>This weekend only: 40% off every single origin. Use code <strong>ORIGIN40</strong> at checkout.</p>`,
        },
      ],
    },
    {
      key: 'hike-photos',
      subject: 'Photos from the hike',
      labels: ['personal'],
      msgs: [
        {
          from: 'lina',
          at: onDay(5, 18, 10),
          attach: [
            { name: 'hike-01.jpg', size: 1.4 * MB, kind: 'image' },
            { name: 'hike-02.jpg', size: 1.2 * MB, kind: 'image' },
            { name: 'hike-03.jpg', size: 1.6 * MB, kind: 'image' },
          ],
          html: `<p>Finally got through the photos from Sunday. The light at the top was unreal. Picking the best ones for the album this week.</p>`,
        },
      ],
    },
    {
      key: 'figma',
      subject: 'Figma link: landing page explorations',
      labels: ['design'],
      category: 'updates',
      msgs: [
        {
          from: 'theo',
          at: ago(3),
          unread: true,
          html: `<p>Here are the three directions for the landing page. I'm partial to the second one, the grid feels calmer on mobile.</p><p><a href="https://example.com/figma/landing">Open the file</a></p>`,
        },
      ],
    },
    {
      key: 'pto',
      subject: 'Reminder: PTO rollover deadline is October 31',
      labels: ['work'],
      msgs: [
        {
          from: 'people',
          at: onDay(6, 10, 0),
          html: `<p>Quick reminder that unused PTO over 10 days rolls over only until October 31. Plan your time off in the HR portal.</p>`,
        },
      ],
    },
    {
      key: 'halcyon-legal',
      subject: 'Halcyon pilot: agreement redlines',
      labels: ['work'],
      snoozedUntil: ago(-6),
      msgs: [
        {
          from: 'dana',
          at: ago(4),
          html: `<p>Legal sent back the pilot agreement with redlines on the data retention clause. I have pinged them for a call on Friday. Can you look at section 6 before then?</p>`,
        },
      ],
    },
    {
      key: 'benefits',
      subject: 'Benefits enrollment closes in 3 days',
      labels: ['work'],
      snoozedUntil: ago(-26),
      msgs: [
        {
          from: 'people',
          at: ago(6),
          unread: true,
          html: `<p>Benefits enrollment closes on Friday at 5 PM. If you have not made changes, your current plan carries over automatically.</p>`,
        },
      ],
    },
    {
      key: 'retro',
      subject: 'Team retro notes: September',
      labels: ['work'],
      location: 'archive',
      msgs: [
        {
          from: 'aisha',
          at: onDay(9, 15, 30),
          html: `<p>Retro notes are in the doc. Top three themes: review latency, too many meetings on Tuesday, and great demo habits. Action owners are listed at the bottom.</p>`,
        },
      ],
    },
    {
      key: 'atlas-invoice',
      subject: 'Your Atlas Cloud invoice for September',
      labels: ['finance'],
      location: 'archive',
      msgs: [
        {
          from: 'atlas',
          at: onDay(8, 9, 0),
          attach: [{ name: 'atlas-invoice-sep.pdf', size: 120 * KB, kind: 'pdf' }],
          html: `<p>Your invoice for September is attached. Total: $482.10, charged to the card ending in 4411.</p>`,
        },
      ],
    },
    {
      key: 'welcome',
      subject: 'Welcome aboard, Jordan',
      location: 'archive',
      msgs: [
        {
          from: 'people',
          at: onDay(14, 9, 0),
          html: `<p>Welcome to Northwind Labs. Your first-week checklist lives in the HR portal. Your manager will reach out to set up your first 1:1.</p>`,
        },
      ],
    },
    {
      key: 'cruise',
      subject: 'YOU HAVE WON a free cruise!!!',
      location: 'spam',
      msgs: [
        {
          from: 'winner',
          at: ago(14),
          unread: true,
          html: `<p>Congratulations!!! Claim your free cruise now. Just pay the small port fee to confirm.</p>`,
        },
      ],
    },
    {
      key: 'crypto',
      subject: "Crypto gains you can't miss this week",
      location: 'spam',
      msgs: [
        {
          from: 'crypto',
          at: ago(60),
          html: `<p>Our signal group doubled its returns last week. Join today before the window closes.</p>`,
        },
      ],
    },
    {
      key: 'landing-old',
      subject: 'Landing page copy: draft v2',
      location: 'trash',
      msgs: [
        {
          from: 'aisha',
          at: onDay(5, 11, 0),
          html: `<p>Old copy draft, replaced by the new hero section. Keeping it here in case we need the testimonials.</p>`,
        },
      ],
    },
    {
      key: 'digest-sep',
      subject: 'The Daily Byte #288: weekly roundup',
      location: 'trash',
      category: 'promotions',
      msgs: [
        {
          from: 'digest',
          at: onDay(16, 6, 0),
          html: `<p>This week: queueing systems, a retrospective on a failed rewrite, and tips for typography in dense UIs.</p>`,
        },
      ],
    },
    {
      key: 'pilot-kickoff',
      subject: 'Re: Halcyon pilot kickoff',
      location: 'archive',
      msgs: [
        {
          from: 'me',
          to: ['dana'],
          cc: ['priya'],
          at: onDay(2, 11, 5),
          html: `<p>Hi Dana, thanks for the thoughtful intro. Kickoff works for me on Monday at 10. Priya will join for the data retention part.</p>`,
        },
      ],
    },
    {
      key: 'api-doc',
      subject: 'Can you review the API limits doc?',
      location: 'archive',
      msgs: [
        {
          from: 'me',
          to: ['marcus'],
          at: onDay(1, 11, 40),
          html: `<p>Marcus, could you review the rate limit proposal before the partner call? Section 3 is the one I'm least sure about.</p>`,
        },
      ],
    },
  ];

  const rng = createRng(20261009);
  const fillers: ThreadSpec[] = [];
  for (let i = 0; i < 34; i += 1) {
    const tpl = FILLERS[i % FILLERS.length];
    const n = rng.int(10, 990);
    fillers.push({
      key: `filler-${i}`,
      subject: tpl.subject(n),
      category: tpl.category,
      labels: tpl.label ? [tpl.label] : [],
      starred: rng.next() < 0.06,
      msgs: [
        {
          from: tpl.from,
          at: ago(4 + i * 5.3 + rng.next() * 3),
          unread: rng.next() < 0.28,
          html: tpl.html,
        },
      ],
    });
  }
  return [...handcrafted, ...fillers];
}

export function createSeedData(now: number): MailData {
  const ago = (hours: number) => now - hours * HOUR;
  const onDay = (days: number, hour: number, minute = 0) =>
    startOfDay(now) - days * DAY + hour * HOUR + minute * MINUTE;

  const threads = buildSpecs(ago, onDay).map(toThread);

  const drafts: Draft[] = [
    {
      id: 'draft-roadmap',
      threadId: 'thr-roadmap',
      mode: 'reply',
      to: [PEOPLE.priya],
      cc: [],
      bcc: [],
      subject: 'Re: Q3 roadmap review: notes and decisions',
      html: '<p>Priya, the migration plan is in progress. I am writing the rollback section now and will share it by Tuesday.</p><p>Can we get Marcus to confirm the SLO budget before we commit?</p>',
      attachments: [],
      updatedAt: ago(0.4),
      pristine: false,
    },
    {
      id: 'draft-hike',
      threadId: null,
      mode: 'new',
      to: [PEOPLE.ben],
      cc: [],
      bcc: [],
      subject: 'Weekend hike idea',
      html: '<p>Ben, what about the Lost Coast trail on Saturday? We could leave at 7 and be back for dinner.</p>',
      attachments: [],
      updatedAt: ago(2),
      pristine: false,
    },
  ];

  const outgoing: Outgoing[] = [
    {
      id: 'out-plan',
      kind: 'scheduled',
      sendAt: onDay(-1, 8),
      createdAt: ago(5),
      draft: {
        id: 'draft-plan',
        threadId: 'thr-roadmap',
        mode: 'reply',
        to: [PEOPLE.priya],
        cc: [],
        bcc: [],
        subject: 'Re: Q3 roadmap review: notes and decisions',
        html: '<p>Hi Priya, here is the migration plan with the rollback path added. Shout if anything looks off.</p>',
        attachments: [{ id: 'att-plan', name: 'sync-migration-plan.docx', size: 92 * KB, kind: 'doc' }],
        updatedAt: ago(5),
        pristine: false,
      },
    },
  ];

  return {
    account: ACCOUNT,
    threads,
    labels: SEED_LABELS,
    drafts,
    outgoing,
    settings: DEFAULT_SETTINGS,
    recentSearches: ['has:attachment', 'from:helen'],
    nextIncomingAt: now + 2 * MINUTE,
  };
}

const INCOMING: Array<{
  from: PersonKey;
  subject: string;
  html: string;
  category: Category;
  labels?: string[];
  attach?: AttachSpec[];
}> = [
  {
    from: 'priya',
    subject: 'Can you own the incident review?',
    html: '<p>Hi Jordan, the payments incident review needs an owner by end of day. Would you take it? I can share the timeline.</p>',
    category: 'primary',
    labels: ['work'],
  },
  {
    from: 'aisha',
    subject: 'Quick review: pricing page v3',
    html: '<p>Pricing page v3 is ready for a look. I moved the annual toggle above the fold and simplified the enterprise block.</p>',
    category: 'primary',
    labels: ['design'],
    attach: [{ name: 'pricing-v3.fig', size: 2.1 * MB, kind: 'file' }],
  },
  {
    from: 'harbor',
    subject: '[harbor/web] Build #2302 failed on main',
    html: '<p>Build <strong>#2302</strong> failed on <code>main</code>. The e2e suite timed out waiting for the checkout page.</p>',
    category: 'updates',
    labels: ['work'],
  },
  {
    from: 'nina',
    subject: 'Your Lumen Club shipment is on its way',
    html: '<p>Your 1 kg bag of Ethiopia Yirgacheffe left the roastery this morning. Expect it within three days.</p>',
    category: 'updates',
    labels: ['receipts'],
  },
  {
    from: 'dana',
    subject: 'Re: Halcyon pilot: signed version attached',
    html: '<p>Legal signed off on the redlines. The countersigned version is attached. Thanks for pushing on section 6.</p>',
    category: 'primary',
    attach: [{ name: 'halcyon-pilot-signed.pdf', size: 340 * KB, kind: 'pdf' }],
  },
  {
    from: 'marcus',
    subject: 'Heads up: staging DB migration at 4 PM',
    html: '<p>Running the staging migration at 4 PM. Expect a few minutes of read-only mode on the admin app.</p>',
    category: 'primary',
    labels: ['work'],
  },
];

/** A new message that arrives while the app is open (simulated inbound mail). */
export function createIncomingThread(now: number): Thread {
  const tpl = INCOMING[Math.floor(Math.random() * INCOMING.length)];
  const message = toMessage({ from: tpl.from, at: now, unread: true, html: tpl.html, attach: tpl.attach }, uid('msg'));
  return {
    id: uid('thr'),
    subject: tpl.subject,
    messages: [message],
    location: 'inbox',
    category: tpl.category,
    starred: false,
    important: false,
    labelIds: tpl.labels ?? [],
    snoozedUntil: null,
  };
}

export function nextIncomingDelay(): number {
  return (90 + Math.floor(Math.random() * 90)) * 1000;
}

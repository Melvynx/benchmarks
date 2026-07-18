import type { Attachment, Category, Thread } from '../types';
import { CONTACTS, ME } from './contacts';
import { uid } from '../lib/utils';

const H = 3_600_000;
const D = 24 * H;
const M = 60_000;

function ago(parts: { d?: number; h?: number; m?: number }): number {
  const { d = 0, h = 0, m = 0 } = parts;
  return Date.now() - d * D - h * H - m * M;
}

let attN = 0;
function att(name: string, size: number, mime: string): Attachment {
  attN += 1;
  return { id: `att_${attN}`, name, size, mime };
}

interface MsgSpec {
  from: string;
  to?: string[];
  cc?: string[];
  at: number;
  body: string;
  attachments?: Attachment[];
}

interface ThreadSpec {
  subject: string;
  msgs: MsgSpec[];
  labels?: string[];
  category?: Category;
  starred?: boolean;
  read?: boolean;
  snoozeInH?: number;
  draftTo?: string[];
  draftCc?: string[];
  draftBody?: string;
  draftAttachments?: Attachment[];
}

function makeThread(spec: ThreadSpec): Thread {
  return {
    id: uid('thr'),
    subject: spec.subject,
    messages: spec.msgs.map((m) => ({
      id: uid('msg'),
      from: m.from,
      to: m.to ?? [ME.email],
      cc: m.cc,
      date: m.at,
      body: m.body,
      attachments: m.attachments,
    })),
    labels: spec.labels ?? ['INBOX'],
    category: spec.category,
    starred: spec.starred ?? false,
    read: spec.read ?? true,
    snoozeUntil: spec.snoozeInH ? Date.now() + spec.snoozeInH * H : undefined,
    draftTo: spec.draftTo,
    draftCc: spec.draftCc,
    draftBody: spec.draftBody,
    draftAttachments: spec.draftAttachments,
  };
}

// ---- people shorthand -------------------------------------------------------
const maya = 'maya.chen@northwind.io';
const david = 'david.okafor@northwind.io';
const priya = 'priya.nair@northwind.io';
const anna = 'anna.k@northwind.io';
const sofia = 'sofia.almeida@northwind.io';
const tom = 'tom.becker@gmail.com';
const sam = 'sam.rivera@fastmail.com';
const mom = 'linda.carter@outlook.com';
const james = 'james.park@parkview-realty.com';
const elise = 'elise@moreau-studio.fr';
const marcus = 'm.webb@greenfieldcap.com';
const ben = 'ben.hoffman@hoffmanlaw.com';
const rachel = 'rachel.kim@kinetic.dev';

export const LABELS_SEED = [
  { id: 'lbl_work', name: 'Work', color: '#0b57d0' },
  { id: 'lbl_personal', name: 'Personal', color: '#0d652d' },
  { id: 'lbl_finance', name: 'Finance', color: '#7a42d8' },
  { id: 'lbl_travel', name: 'Travel', color: '#b06000' },
  { id: 'lbl_receipts', name: 'Receipts', color: '#5f6368' },
];

const W = 'lbl_work';
const P = 'lbl_personal';
const F = 'lbl_finance';
const T = 'lbl_travel';
const R = 'lbl_receipts';

// ---------------------------------------------------------------------------

export function seedThreads(): Thread[] {
  const threads: Thread[] = [

    // ============================ PRIMARY ============================
    makeThread({
      subject: 'Q3 launch plan — feedback needed by Friday',
      category: 'primary', labels: ['INBOX', W], starred: true, read: false,
      msgs: [
        {
          from: maya, at: ago({ d: 2, h: 4 }),
          body: `<p>Hi Alex,</p><p>Attached is the latest draft of the Q3 launch plan. The big changes since last week: the beta window moved to <strong>August 4–15</strong>, and we're splitting the rollout into two cohorts so support isn't overwhelmed.</p><p>Could you review sections 2 and 4 in particular? I'd like to lock the plan in Thursday's staff meeting.</p><p>— Maya</p>`,
          attachments: [att('Q3-launch-plan-v3.pdf', 482_300, 'application/pdf')],
        },
        {
          from: ME.email, to: [maya], at: ago({ d: 1, h: 6 }),
          body: `<p>Thanks Maya — read through it last night. Section 2 looks solid. On section 4, I think cohort B needs at least one more week of soak time; the payment migration lands August 6 and I don't want both in flight.</p><p>I'll leave comments in the doc today.</p>`,
        },
        {
          from: maya, at: ago({ h: 3 }),
          body: `<p>Good call on the payment migration, I hadn't connected those. If you can get comments in by <strong>Thursday noon</strong> I'll fold them into v4 and circulate before the meeting.</p><p>Also — can you own the rollout checklist? You're closest to the failure modes.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'API rate limits — follow-up from infra review',
      category: 'primary', labels: ['INBOX', W], read: true,
      msgs: [
        {
          from: david, at: ago({ d: 4 }),
          body: `<p>Alex,</p><p>Following up from Tuesday's infra review. We're seeing the mobile clients burst to ~4x their quota during morning sync. Two options on the table:</p><ul><li>raise the per-user quota to 600 req/min, or</li><li>add a token-bucket on the edge with a 2-minute window.</li></ul><p>My preference is the token bucket — cheaper and protects us from runaway clients. Thoughts?</p><p>David</p>`,
        },
        {
          from: ME.email, to: [david], at: ago({ d: 3, h: 8 }),
          body: `<p>Agree on the token bucket. If we raise the quota we'll just re-baseline the abuse. Can you put together a one-pager with expected p99 latency impact? I'll review tomorrow.</p>`,
        },
        {
          from: david, at: ago({ d: 3, h: 2 }),
          body: `<p>Will do. Expect it in your inbox by EOD Thursday.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Offsite venue options (September)',
      category: 'primary', labels: ['INBOX', W], read: false,
      msgs: [
        {
          from: priya, at: ago({ h: 7 }),
          body: `<p>Hi all,</p><p>I've narrowed the September offsite down to three venues — comparison sheet attached. My take:</p><ul><li><strong>Cascade Lodge</strong> — best space, but 90 min from the airport</li><li><strong>Harbor House</strong> — walkable, great food, smaller rooms</li><li><strong>The Foundry</strong> — cheapest, meh wifi (they claim 100 Mbps)</li></ul><p>Vote in the sheet by Monday and I'll book.</p><p>Priya</p>`,
          attachments: [att('offsite-venue-comparison.xlsx', 96_400, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')],
        },
      ],
    }),
    makeThread({
      subject: 'Design review notes — nav refresh',
      category: 'primary', labels: ['INBOX', W], read: true,
      msgs: [
        {
          from: anna, at: ago({ d: 5 }),
          body: `<p>Notes from today's design review:</p><ul><li>Everyone prefers the condensed nav — let's ship it behind a flag</li><li>The 14px body text tested poorly; stay at 15px</li><li>Empty states need illustrations before launch (Sofia owns)</li></ul><p>Full deck is in the shared drive. Nice work pushing this forward, Alex.</p><p>Anna</p>`,
        },
        {
          from: ME.email, to: [anna], cc: [sofia], at: ago({ d: 5, h: -2 }),
          body: `<p>Thanks Anna. I'll cut the flag today and wire up analytics so we can compare engagement before/after. Sofia — happy to pair on the empty states next week.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Lunch Thursday?',
      category: 'primary', labels: ['INBOX', P], read: true,
      msgs: [
        {
          from: tom, at: ago({ d: 1, h: 8 }),
          body: `<p>Yo — are you free Thursday? That new ramen place on 9th finally opened and I refuse to go alone. 12:30?</p>`,
        },
        {
          from: ME.email, to: [tom], at: ago({ d: 1, h: 5 }),
          body: `<p>Thursday works. 12:30, see you there. If there's a line we're getting the tsukemen and committing to it.</p>`,
        },
        {
          from: tom, at: ago({ h: 9 }),
          body: `<p>Deal. Bringing quarters for the gacha machine too, obviously.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Photos from the weekend',
      category: 'primary', labels: ['INBOX', P], read: false,
      msgs: [
        {
          from: mom, at: ago({ h: 5 }),
          body: `<p>Sweetie,</p><p>Here are the photos from the lake house. The one of you and Dad on the dock at sunset came out beautifully — you should print it.</p><p>Your aunt says hello and wants to know if you're still coming for Labor Day. Call me when you can!</p><p>Love, Mom</p>`,
          attachments: [
            att('IMG_2041-dock-sunset.jpg', 2_410_000, 'image/jpeg'),
            att('IMG_2044-kayaks.jpg', 1_980_000, 'image/jpeg'),
            att('IMG_2051-bonfire.jpg', 2_120_000, 'image/jpeg'),
          ],
        },
      ],
    }),
    makeThread({
      subject: 'Invoice #1042 — July design retainer',
      category: 'primary', labels: ['INBOX', F], read: false,
      msgs: [
        {
          from: elise, at: ago({ h: 12 }),
          body: `<p>Bonjour Alex,</p><p>Invoice #1042 for the July retainer is attached — same terms as usual, net 14. This month included the icon set rework and the two landing page variants.</p><p>Merci!<br>Elise</p>`,
          attachments: [att('invoice-1042-july.pdf', 88_200, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Fantasy league — week 6 trades',
      category: 'primary', labels: ['INBOX', P], read: true,
      msgs: [
        {
          from: sam, at: ago({ d: 2, h: 10 }),
          body: `<p>Commissioner update: trade deadline is Sunday midnight, no exceptions this year (looking at you, Dan).</p><p>Alex — your offer for my RB2 is insulting and I respect it. Counter: throw in a defense and we talk.</p>`,
        },
        {
          from: ME.email, to: [sam], at: ago({ d: 2, h: 6 }),
          body: `<p>A defense? In this economy? Fine — Ravens DST, final offer. Take it before I come to my senses.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Re: Apartment lease renewal',
      category: 'primary', labels: ['INBOX', P], read: true,
      msgs: [
        {
          from: james, at: ago({ d: 9 }),
          body: `<p>Dear Mr. Carter,</p><p>Your lease at 418 W Elm St #3B expires September 30. We'd like to offer a renewal at $2,150/mo for 12 months (a 4.7% increase). Please let us know your decision by August 15.</p><p>Regards,<br>James Park, Parkview Realty</p>`,
          attachments: [att('lease-renewal-2026.pdf', 312_000, 'application/pdf')],
        },
        {
          from: ME.email, to: [james], at: ago({ d: 8 }),
          body: `<p>Hi James,</p><p>Thanks for the heads-up. Given the building's ongoing elevator issues (documented since March), I'd like to propose $2,050/mo, or $2,100 with the parking spot included. Happy to sign quickly if we can meet there.</p><p>Best,<br>Alex</p>`,
        },
        {
          from: james, at: ago({ d: 6 }),
          body: `<p>Mr. Carter,</p><p>Management has approved $2,100/mo with the parking spot included. I'll prepare the updated lease this week for your signature.</p><p>James Park</p>`,
        },
        {
          from: ME.email, to: [james], at: ago({ d: 6, h: -3 }),
          body: `<p>Perfect — thank you, James. I'll watch for the documents.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Quarterly portfolio review — schedule?',
      category: 'primary', labels: ['INBOX', F], read: true,
      msgs: [
        {
          from: marcus, at: ago({ d: 3 }),
          body: `<p>Alex,</p><p>Time for your quarterly review. I'd like to walk through the rebalancing we discussed and the new muni bond ladder. Do you have 45 minutes next week? Tuesday or Wednesday afternoon works best on our end.</p><p>Marcus Webb<br>Greenfield Capital</p>`,
        },
        {
          from: ME.email, to: [marcus], at: ago({ d: 2, h: 12 }),
          body: `<p>Wednesday at 2pm works. Send the invite and I'll bring my questions about the expense ratios on the international fund.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Estate documents ready for pickup',
      category: 'primary', labels: ['INBOX', P, F], read: true,
      msgs: [
        {
          from: ben, at: ago({ d: 12 }),
          body: `<p>Dear Alex,</p><p>The updated will and healthcare directive are finalized and ready for notarization. You can pick them up any weekday between 9 and 5 — no appointment needed. Bring a photo ID.</p><p>Ben Hoffman<br>Hoffman Law Group</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Kicked off the new onboarding flow today',
      category: 'primary', labels: ['INBOX', W, 'SENT'], read: true,
      msgs: [
        {
          from: rachel, at: ago({ d: 1, h: 3 }),
          body: `<p>Hey Alex — saw your prototype in Figma, the progressive profiling idea is exactly what we need. Two questions: how does it behave for SSO signups, and can the checklist survive a mid-flow abandonment?</p>`,
        },
        {
          from: ME.email, to: [rachel], cc: ['nora.l@kinetic.dev'], at: ago({ h: 2 }),
          body: `<p>Great questions. SSO skips steps 1–2 entirely and lands on the checklist with 60% pre-completed. State is persisted server-side per step, so abandonment just resumes where you left — tested it with a 3-day gap and it held up.</p><p>Looping in Nora since she owns the SSO edge cases.</p>`,
        },
      ],
    }),

    // ============================ UPDATES ============================
    makeThread({
      subject: '[northwind/web] PR #482: Fix flaky checkout test',
      category: 'updates', labels: ['INBOX', W], read: false,
      msgs: [
        {
          from: 'notifications@github.com', at: ago({ h: 1, m: 20 }),
          body: `<p><strong>@dokafor</strong> requested your review on <a href="#">#482: Fix flaky checkout test</a>.</p><p>The failure was a race between the cart totals animation frame and the assertion. Replaced the fixed 400ms sleep with <code>waitFor(totalsToSettle)</code> — 200 CI runs green.</p><p>Files changed: 3 · +41 −22</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Deployment to production failed — northwind-api',
      category: 'updates', labels: ['INBOX', W], read: true,
      msgs: [
        {
          from: 'deploys@vercel.com', at: ago({ d: 1, h: 4 }),
          body: `<p><strong>Deployment failed</strong> for project <strong>northwind-api</strong> (commit <code>9f31ac2</code>).</p><p>Build exited with code 1: Type error in <code>src/routes/invoices.ts:88</code> — Property 'totalCents' does not exist on type 'Invoice'.</p><p>Duration: 1m 12s · Region: iad1</p>`,
        },
        {
          from: 'deploys@vercel.com', at: ago({ d: 1, h: 3 }),
          body: `<p><strong>Deployment ready</strong> for project <strong>northwind-api</strong> (commit <code>77bd0e4</code>). The previous type error is resolved.</p><p>Duration: 58s · <a href="#">Visit deployment</a></p>`,
        },
      ],
    }),
    makeThread({
      subject: 'New comments in "Mobile nav v2"',
      category: 'updates', labels: ['INBOX', W], read: false,
      msgs: [
        {
          from: 'team@figma.com', at: ago({ h: 4, m: 45 }),
          body: `<p><strong>Anna Kowalski</strong> and <strong>Sofia Almeida</strong> left 4 new comments in <strong>Mobile nav v2</strong>:</p><p>“Can we try the active state with the pill instead of the underline?” — Anna<br>“+1, and the badge count should cap at 9+” — Sofia</p><p><a href="#">Open in Figma</a></p>`,
        },
      ],
    }),
    makeThread({
      subject: 'GML-203: Search operators return stale results',
      category: 'updates', labels: ['INBOX', W], read: true,
      msgs: [
        {
          from: 'linear@linear.app', at: ago({ d: 2 }),
          body: `<p><strong>Maya Chen</strong> assigned you <strong>GML-203</strong> · Priority: High · Estimate: 3</p><p>“Search with label: filters intermittently returns threads that had the label removed in the last minute. Probably an indexing lag — acceptable? Needs a decision.”</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Your payout of $1,204.33 is on the way',
      category: 'updates', labels: ['INBOX', R, F], read: true,
      msgs: [
        {
          from: 'stripe@stripe.com', at: ago({ d: 1, h: 14 }),
          body: `<p>Your payout of <strong>$1,204.33</strong> was initiated to your bank account ending in 4471. It should arrive within 2 business days.</p><p>Statement descriptor: K3 CONSULTING. View the breakdown in your <a href="#">Stripe dashboard</a>.</p>`,
          attachments: [att('payout-statement-jul16.pdf', 54_100, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Your order has shipped — arriving Friday',
      category: 'updates', labels: ['INBOX', R], read: true,
      msgs: [
        {
          from: 'auto-confirm@amazon.com', at: ago({ d: 1, h: 20 }),
          body: `<p>Your order <strong>#114-8827103-5570642</strong> has shipped and is estimated to arrive <strong>Friday, July 18</strong>.</p><p>1× Logitech MX Master 3S — $99.00<br>1× Anker 737 Power Bank — $89.99</p><p>Track package · Order details</p>`,
          attachments: [att('order-receipt-5570642.pdf', 66_800, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Check in now for your flight to Lisbon',
      category: 'updates', labels: ['INBOX', T], starred: true, read: false,
      msgs: [
        {
          from: 'delta@delta.com', at: ago({ h: 6 }),
          body: `<p><strong>Check-in is open</strong> for flight <strong>DL 214</strong>, Boston (BOS) → Lisbon (LIS), departing <strong>tomorrow at 9:35 PM</strong>.</p><p>Seat 21A (window) · Confirmation: HX7Q2M. Your detailed itinerary is attached.</p><p><a href="#">Check in now</a></p>`,
          attachments: [att('itinerary-DL214-lisbon.pdf', 154_000, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Reservation confirmed — Porto, Aug 12–16',
      category: 'updates', labels: ['INBOX', T], read: true,
      msgs: [
        {
          from: 'automated@airbnb.com', at: ago({ d: 5 }),
          body: `<p>You're all set, Alex! Your stay at <strong>“Sunny loft in Cedofeita”</strong> in Porto is confirmed for <strong>Aug 12–16</strong> (4 nights, 2 guests).</p><p>Check-in after 3:00 PM. Your host Marta will send door codes 24h before arrival. Total: €412.00.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Your June statement is ready',
      category: 'updates', labels: ['INBOX', F], read: true,
      msgs: [
        {
          from: 'no-reply@chase.com', at: ago({ d: 7 }),
          body: `<p>Your Chase Sapphire statement for the period ending June 30 is ready. Statement balance: <strong>$2,847.19</strong>. Minimum payment $35.00 due July 25.</p><p>Sign in to view transactions and download your statement.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Invitation: Design sync — Tue 2:00 PM',
      category: 'updates', labels: ['INBOX', W], read: true,
      msgs: [
        {
          from: 'calendar-notification@google.com', at: ago({ d: 3, h: 5 }),
          body: `<p><strong>Anna Kowalski</strong> invited you to <strong>Design sync</strong> on Tuesday at 2:00–2:45 PM (weekly).</p><p>Agenda: nav refresh flag rollout, empty-state illustrations, Q3 design debt triage.</p><p>Yes · Maybe · No</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Security alert: new sign-in from Chrome on macOS',
      category: 'updates', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'no-reply@accounts.google.com', at: ago({ d: 4 }),
          body: `<p>A new sign-in to your account was detected:</p><p><strong>Chrome on macOS</strong> · Boston, MA, USA · Jul 13, 8:14 PM EDT<br>IP: 73.118.xx.xx</p><p>If this was you, no action is needed. If not, secure your account immediately.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Your Notion weekly digest',
      category: 'updates', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'digest@mail.notion.so', at: ago({ d: 2, h: 18 }),
          body: `<p>This week in <strong>Northwind workspace</strong>:</p><ul><li>12 pages edited in “Q3 Launch”</li><li>Maya created “Rollout checklist (DRAFT)”</li><li>3 comments mention you</li></ul><p><a href="#">Catch up in Notion</a></p>`,
        },
      ],
    }),

    // ============================ SOCIAL ============================
    makeThread({
      subject: 'You have 9 new notifications',
      category: 'social', labels: ['INBOX'], read: false,
      msgs: [
        {
          from: 'notifications@linkedin.com', at: ago({ h: 8 }),
          body: `<p>Alex, you have <strong>9 new notifications</strong>:</p><ul><li>Priya Nair and 6 others viewed your profile</li><li>Your post about search UX got 42 reactions</li><li>2 new connection requests</li></ul><p><a href="#">See all notifications</a></p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Sarah Lindt accepted your invitation',
      category: 'social', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'invitations@linkedin.com', at: ago({ d: 2 }),
          body: `<p><strong>Sarah Lindt</strong> (Staff Designer at Fathom) accepted your invitation to connect. Start a conversation or see her latest posts.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Your weekly X analytics',
      category: 'social', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'analytics@x.com', at: ago({ d: 4, h: 2 }),
          body: `<p>Your week on X: <strong>18,204</strong> impressions (+12%), <strong>312</strong> profile visits, <strong>11</strong> new followers. Top post: “Every search box deserves operators.”</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'React Boston meetup — RSVP closes Friday',
      category: 'social', labels: ['INBOX'], read: false,
      msgs: [
        {
          from: 'events@meetup.com', at: ago({ h: 15 }),
          body: `<p><strong>React Boston</strong>: “Server Components in the Real World” — Thursday, July 24, 6:30 PM at the Cambridge Innovation Center. 84 going. RSVP closes Friday.</p><p><a href="#">RSVP Yes</a> · <a href="#">Maybe</a></p>`,
        },
      ],
    }),

    // ============================ PROMOTIONS ============================
    makeThread({
      subject: 'The Pragmatic Engineer: What senior engineers actually do',
      category: 'promotions', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'newsletter@pragmaticengineer.com', at: ago({ d: 1, h: 9 }),
          body: `<p>This week: observations from 40+ conversations about what separates senior engineers — ownership of ambiguous problems, writing things down, and the underrated skill of making other people productive.</p><p>Plus: inside Monzo's incident review culture, and four interesting engineering blogs to follow.</p><p><a href="#">Read the issue</a></p>`,
        },
      ],
    }),
    makeThread({
      subject: 'New module dropped: Advanced TypeScript patterns',
      category: 'promotions', labels: ['INBOX'], read: false,
      msgs: [
        {
          from: 'wes@wesbos.com', at: ago({ h: 20 }),
          body: `<p>The brand-new <strong>Advanced TypeScript Patterns</strong> module is live — template literal types, variance, and the builder pattern done right. 2.5 hours of new video, free for course owners.</p><p>Log in and it's in your dashboard under Module 11.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Config 2026 recap — watch the keynotes',
      category: 'promotions', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'config@figma.com', at: ago({ d: 6 }),
          body: `<p>Missed Config this year? All 34 keynotes and sessions are now streaming — including “Design systems that scale sideways” and the Dev Mode deep dive.</p><p><a href="#">Watch now</a></p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Notion AI — 20% off your first year',
      category: 'promotions', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'promos@mail.notion.so', at: ago({ d: 3, h: 7 }),
          body: `<p>Upgrade to Notion AI and save 20% on your first year. Q&amp;A across your workspace, autofill for databases, and writing help everywhere. Offer ends July 31.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Members sale ends Sunday — up to 40% off',
      category: 'promotions', labels: ['INBOX'], read: true,
      msgs: [
        {
          from: 'rei@e.rei.com', at: ago({ d: 2, h: 2 }),
          body: `<p>The REI Members Sale ends Sunday: up to 40% off past-season gear, plus an extra 20% off one outlet item with code <strong>MEMBER20</strong>.</p>`,
        },
      ],
    }),

    // ============================ SNOOZED ============================
    makeThread({
      subject: 'Re: Conference talk proposal — feedback',
      labels: ['INBOX', W], read: true, snoozeInH: 26,
      msgs: [
        {
          from: anna, at: ago({ d: 1, h: 11 }),
          body: `<p>Read your “Search is a product feature” talk proposal — it's strong. Two notes: tighten the abstract to one paragraph, and the live demo needs a fallback video in case wifi dies. Submit it!</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Car insurance renewal — action required by Aug 1',
      labels: ['INBOX', F], read: true, snoozeInH: 49,
      msgs: [
        {
          from: 'service@mapleinsurance.com', at: ago({ d: 2 }),
          body: `<p>Your auto policy #MA-88231 renews August 1 at $1,284/year (up 6%). No action needed to renew automatically; contact us by July 31 to adjust coverage or payment plan.</p>`,
        },
      ],
    }),

    // ============================ SENT ============================
    makeThread({
      subject: 'Retro notes — June',
      labels: ['SENT', W], read: true,
      msgs: [
        {
          from: ME.email, to: [maya, david, anna], at: ago({ d: 6, h: 4 }),
          body: `<p>Team — notes from June retro are attached. Headlines: deploy frequency up 40%, but review latency crept up too. Action items in the doc, owners assigned. Great month.</p>`,
          attachments: [att('retro-notes-june.md', 12_300, 'text/markdown')],
        },
      ],
    }),
    makeThread({
      subject: 'Interview availability next week',
      labels: ['SENT'], read: true,
      msgs: [
        {
          from: ME.email, to: ['k.donovan@lattice-recruiting.com'], at: ago({ d: 10 }),
          body: `<p>Hi Karen,</p><p>Thanks for reaching out about the Staff Engineer role. I'm fairly deep into a launch cycle right now, so I'm not looking to move — but I'm flattered and happy to stay in touch for the future.</p><p>Best,<br>Alex</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Weekend itinerary — Cape trip',
      labels: ['SENT', P], read: true,
      msgs: [
        {
          from: ME.email, to: [sam, tom], at: ago({ d: 13 }),
          body: `<p>Final itinerary for the Cape weekend: drive up Friday 4pm, dinner at Moby's, Saturday beach + clam shacks, Sunday rail trail ride then home by 6. I booked the house — you two owe me $180 each. Don't forget sunscreen this time, Sam.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Re: Consulting agreement — signed',
      labels: ['SENT', F], read: true,
      msgs: [
        {
          from: ME.email, to: ['ops@bluefinanalytics.com'], at: ago({ d: 18 }),
          body: `<p>Hi Dana,</p><p>Signed agreement attached — all set on my end. Looking forward to kicking off the dashboard audit on August 4. I'll send the pre-read a few days prior.</p><p>Best,<br>Alex</p>`,
          attachments: [att('bluefin-agreement-signed.pdf', 204_000, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Book club pick for August',
      labels: ['SENT', P], read: true,
      msgs: [
        {
          from: ME.email, to: ['bookclub@googlegroups.com'], at: ago({ d: 4, h: 6 }),
          body: `<p>My nomination for August: <em>The Making of Prince of Persia</em>. Short, funny, and surprisingly relevant to anyone who ships software. Second choice: <em>Several Short Sentences About Writing</em>. Vote in the thread!</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Dinner Friday — my place?',
      labels: ['SENT', P], read: true,
      msgs: [
        {
          from: ME.email, to: [tom], at: ago({ h: 22 }),
          body: `<p>Before you commit to a weekend of leftovers — I'm attempting the serious eats carnitas Friday night. 7:30, bring that mezcal you've been hoarding.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Wedding RSVP — Carter party of 2',
      labels: ['SENT', P], read: true,
      msgs: [
        {
          from: ME.email, to: ['rsvp@julesanddev.com'], at: ago({ d: 25 }),
          body: `<p>Hi Jules & Dev — thrilled to RSVP yes for two! Entrée: one salmon, one short rib. We'll sort flights this month. Congratulations again!!</p>`,
        },
      ],
    }),

    // ============================ DRAFTS ============================
    makeThread({
      subject: 'Slides for the all-hands',
      labels: ['DRAFT'],
      msgs: [],
      draftTo: [maya],
      draftBody: `<p>Hey Maya — putting together my section of the all-hands deck. Current outline:</p><ul><li>launch metrics recap (2 min)</li><li>search quality deep dive (5 min)</li><li>what I'm punting to Q4 and why</li></ul><p>Can you send me the template you used last quarter? Mine has the old logo and`,
    }),
    makeThread({
      subject: 'Re: Photos from the weekend',
      labels: ['DRAFT'],
      msgs: [],
      draftTo: [mom],
      draftBody: `<p>Mom! These are wonderful — the dock one is getting framed, you're right. Tell Dad the kayak photo is going straight to his next birthday card.</p><p>Labor Day: yes, planning on it. I'll drive up Thursday night and`,
    }),
    makeThread({
      subject: '',
      labels: ['DRAFT'],
      msgs: [],
      draftTo: [david],
      draftBody: `<p>Quick thought on the token bucket — we should probably also`,
    }),

    // ============================ SPAM ============================
    makeThread({
      subject: 'CONGRATULATIONS! You have been selected',
      labels: ['SPAM'], read: false,
      msgs: [
        {
          from: 'winner@intl-lottery-claim.net', at: ago({ d: 1, h: 6 }),
          body: `<p>DEAR WINNER, your email address was selected in the INTERNATIONAL EMAIL PROMOTION. You have won $2,500,000 USD. To claim, reply with your full name, address, and bank details.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Urgent: your account will be suspended',
      labels: ['SPAM'], read: true,
      msgs: [
        {
          from: 'security-alert@paypa1-verify.com', at: ago({ d: 3 }),
          body: `<p>We detected unusual activity. Your account will be SUSPENDED within 24 hours unless you verify your identity immediately at our secure portal.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Last chance: 100x crypto opportunity inside',
      labels: ['SPAM'], read: true,
      msgs: [
        {
          from: 'moonshot@defi-alerts.io', at: ago({ d: 6 }),
          body: `<p>Insider alert: this micro-cap token is about to list on major exchanges. Our analysts project 100x. Don't say we didn't tell you.</p>`,
        },
      ],
    }),

    // ============================ TRASH ============================
    makeThread({
      subject: 'Your weekly store coupons inside',
      labels: ['TRASH'], read: true,
      msgs: [
        {
          from: 'deals@megamart.com', at: ago({ d: 5 }),
          body: `<p>This week only: BOGO frozen pizzas, $2 off laundry detergent, and double fuel points Friday–Sunday.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Old: team lunch headcount',
      labels: ['TRASH', W], read: true,
      msgs: [
        {
          from: priya, at: ago({ d: 21 }),
          body: `<p>Headcount for next Friday's team lunch — reply by EOD. Current tally: 11 yes, 2 maybe.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Receipt: parking garage',
      labels: ['TRASH', R], read: true,
      msgs: [
        {
          from: 'receipts@parkcentral.com', at: ago({ d: 16 }),
          body: `<p>Thank you for parking at ParkCentral Garage. 3h 12m — $18.00 charged to Visa ••4471.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Expired: 15% off your next order',
      labels: ['TRASH'], read: false,
      msgs: [
        {
          from: 'offers@nordware.com', at: ago({ d: 11 }),
          body: `<p>Your exclusive 15% code expired yesterday. But don't worry — new offers drop every month.</p>`,
        },
      ],
    }),

    // ============================ ARCHIVED (All mail only) ============================
    makeThread({
      subject: 'Your 2025 tax documents',
      labels: [F], starred: true, read: true,
      msgs: [
        {
          from: 'documents@harborcpa.com', at: ago({ d: 95 }),
          body: `<p>Dear Alex,</p><p>Your finalized 2025 federal and state returns are attached, along with the e-file confirmation. Please retain these for at least seven years.</p><p>Harbor CPA Group</p>`,
          attachments: [
            att('2025-federal-return.pdf', 1_140_000, 'application/pdf'),
            att('2025-state-return.pdf', 612_000, 'application/pdf'),
          ],
        },
      ],
    }),
    makeThread({
      subject: 'Flight confirmation — Denver, March',
      labels: [T], read: true,
      msgs: [
        {
          from: 'delta@delta.com', at: ago({ d: 120 }),
          body: `<p>Your trip is confirmed: DL 886, Boston (BOS) → Denver (DEN), March 14 at 8:05 AM. Confirmation: K9PT4W. Seat 14C.</p>`,
          attachments: [att('itinerary-DL886-denver.pdf', 148_000, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Welcome to the team!',
      labels: [W], read: true,
      msgs: [
        {
          from: maya, at: ago({ d: 210 }),
          body: `<p>Alex — huge welcome to Northwind! Your onboarding buddy is David, your laptop ships Monday, and your first-team lunch is Tuesday at noon. Read the eng handbook when you get a chance; it's genuinely good. So glad you're here.</p>`,
        },
        {
          from: ME.email, to: [maya], at: ago({ d: 210, h: -2 }),
          body: `<p>Thanks Maya! Reading the handbook tonight. See everyone Tuesday.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Re: Apartment application approved',
      labels: [P], read: true,
      msgs: [
        {
          from: james, at: ago({ d: 160 }),
          body: `<p>Good news — your application for 418 W Elm St #3B is approved. Lease starts October 1. First month + deposit due at signing.</p>`,
        },
        {
          from: ME.email, to: [james], at: ago({ d: 159 }),
          body: `<p>Excellent — I'll come by Thursday to sign. Thanks James.</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'Dentist appointment confirmed — Aug 6',
      labels: [P], read: true,
      msgs: [
        {
          from: 'office@beaconhilldental.com', at: ago({ d: 9 }),
          body: `<p>This confirms your cleaning appointment on <strong>August 6 at 9:00 AM</strong> with Dr. Osei. Reply C to confirm or call to reschedule.</p>`,
        },
      ],
    }),
  ];

  return threads;
}

/** Extra threads delivered one at a time when the user hits "refresh". */
export function seedArrivals(): Thread[] {
  return [
    makeThread({
      subject: 'Your Porto host sent a message',
      category: 'updates', labels: ['INBOX', T], read: false,
      msgs: [
        {
          from: 'automated@airbnb.com', at: Date.now(),
          body: `<p><strong>Marta (your host)</strong>: “Olá Alex! Excited to host you in August. The loft has fast wifi and a great espresso machine — and I'll leave my list of favorite tascas on the fridge. Let me know your arrival time when you have it.”</p>`,
        },
      ],
    }),
    makeThread({
      subject: 'One-pager: token bucket for mobile sync',
      category: 'primary', labels: ['INBOX', W], read: false,
      msgs: [
        {
          from: david, at: Date.now(),
          body: `<p>As promised — the token-bucket one-pager is attached. Headline: p99 impact is under 8ms and we can roll it out per-endpoint behind a flag. Review when you can; I'd like to start Monday.</p><p>David</p>`,
          attachments: [att('token-bucket-onepager.pdf', 132_000, 'application/pdf')],
        },
      ],
    }),
    makeThread({
      subject: 'Your MX Master 3S was delivered',
      category: 'updates', labels: ['INBOX', R], read: false,
      msgs: [
        {
          from: 'auto-confirm@amazon.com', at: Date.now(),
          body: `<p>Your package was delivered: <strong>Logitech MX Master 3S</strong>. Left at front door. How was your delivery experience?</p>`,
        },
      ],
    }),
  ];
}

// ---- display names ----------------------------------------------------------

const DIRECTORY: Record<string, string> = {
  'notifications@github.com': 'GitHub',
  'deploys@vercel.com': 'Vercel',
  'team@figma.com': 'Figma',
  'config@figma.com': 'Figma Config',
  'linear@linear.app': 'Linear',
  'stripe@stripe.com': 'Stripe',
  'auto-confirm@amazon.com': 'Amazon',
  'delta@delta.com': 'Delta Air Lines',
  'automated@airbnb.com': 'Airbnb',
  'no-reply@chase.com': 'Chase',
  'calendar-notification@google.com': 'Google Calendar',
  'no-reply@accounts.google.com': 'Google',
  'digest@mail.notion.so': 'Notion',
  'promos@mail.notion.so': 'Notion',
  'notifications@linkedin.com': 'LinkedIn',
  'invitations@linkedin.com': 'LinkedIn',
  'analytics@x.com': 'X',
  'events@meetup.com': 'Meetup',
  'newsletter@pragmaticengineer.com': 'The Pragmatic Engineer',
  'wes@wesbos.com': 'Wes Bos',
  'rei@e.rei.com': 'REI',
  'service@mapleinsurance.com': 'Maple Insurance',
  'documents@harborcpa.com': 'Harbor CPA Group',
  'office@beaconhilldental.com': 'Beacon Hill Dental',
  'receipts@parkcentral.com': 'ParkCentral',
  'deals@megamart.com': 'MegaMart',
  'offers@nordware.com': 'Nordware',
  'winner@intl-lottery-claim.net': 'Intl Lottery Claim',
  'security-alert@paypa1-verify.com': 'PayPa1 Verify',
  'moonshot@defi-alerts.io': 'DeFi Alerts',
  'k.donovan@lattice-recruiting.com': 'Karen Donovan',
  'ops@bluefinanalytics.com': 'Dana Reyes',
  'rsvp@julesanddev.com': 'Jules & Dev',
  'bookclub@googlegroups.com': 'Book Club',
};

export function displayName(email: string): string {
  const contact = CONTACTS.find((c) => c.email === email);
  if (contact) return contact.name;
  if (email === ME.email) return 'me';
  if (DIRECTORY[email]) return DIRECTORY[email];
  const local = email.split('@')[0];
  const words = local.split(/[._-]+/).filter(Boolean);
  if (words.length >= 2) return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  return email;
}

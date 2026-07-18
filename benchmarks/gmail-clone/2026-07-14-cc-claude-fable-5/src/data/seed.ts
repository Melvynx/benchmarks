import type {
  Attachment,
  AttachmentKind,
  Category,
  Contact,
  Label,
  Message,
  Thread,
  ThreadLocation,
} from '../types'
import { ago } from '../lib/time'
import { snippetOf } from '../lib/utils'

export const SEED_VERSION = 3

export const ME: Contact = { name: 'Alex Rivera', email: 'alex.rivera@fablemail.app', me: true }

const c = (name: string, email: string): Contact => ({ name, email })

// People
const sofia = c('Sofia Martinez', 'sofia.martinez@horizonlabs.io')
const marcus = c('Marcus Webb', 'marcus.webb@horizonlabs.io')
const priya = c('Priya Sharma', 'priya.sharma@horizonlabs.io')
const daniel = c('Daniel Kim', 'daniel.kim@horizonlabs.io')
const jordan = c('Jordan Lee', 'jordan.lee.climbs@gmail.com')
const mom = c('Elena Rivera', 'elena.rivera58@gmail.com')
const emma = c('Emma Larsen', 'emma@horizonlabs.io')
const nina = c('Nina Patel', 'nina@brightstoneproperties.com')
const tom = c('Tom Bradley', 'tom@bradleytaxgroup.com')
const lucia = c('Lucia Ortiz', 'lucia@frontendconf.eu')
const sam = c('Sam Torres', 'sam.torres.87@gmail.com')
const dana = c('Dana Fuchs', 'dana.fuchs@loom.com')

// Services
const github = c('GitHub', 'notifications@github.com')
const vercel = c('Vercel', 'notifications@vercel.com')
const stripe = c('Stripe', 'receipts@stripe.com')
const amazon = c('Amazon.com', 'shipment-tracking@amazon.com')
const uber = c('Uber Receipts', 'noreply@uber.com')
const sentry = c('Sentry', 'noreply@md.getsentry.com')
const gcal = c('Google Calendar', 'calendar-notification@google.com')
const linear = c('Linear', 'notifications@linear.app')
const spotify = c('Spotify', 'no-reply@spotify.com')
const npmjs = c('npm', 'support@npmjs.com')
const linkedin = c('LinkedIn', 'invitations@linkedin.com')
const xcorp = c('X', 'info@x.com')
const strava = c('Strava', 'no-reply@strava.com')
const nextdoor = c('Nextdoor', 'reply@rs.email.nextdoor.com')
const morningbrew = c('Morning Brew', 'crew@morningbrew.com')
const lenny = c("Lenny's Newsletter", 'lenny@substack.com')
const bestbuy = c('Best Buy', 'BestBuyInfo@emailinfo.bestbuy.com')
const doordash = c('DoorDash', 'no-reply@doordash.com')
const airbnb = c('Airbnb', 'automated@airbnb.com')
const figma = c('Figma', 'news@figma.com')
const duolingo = c('Duolingo', 'hello@duolingo.com')
const dentist = c('Lakeview Dental', 'appointments@lakeviewdental.com')
const insurer = c('Meridian Insurance', 'service@meridian-insure.com')
const scammer1 = c('Account Security Team', 'secure-alerts@mail-verify-check.net')
const scammer2 = c('Mr. Adewale Okonkwo', 'a.okonkwo@intl-partners-biz.info')
const giftcards = c('Rewards Center', 'winner@prize-notify-center.com')

export const SEED_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#4a86e8' },
  { id: 'personal', name: 'Personal', color: '#16a765' },
  { id: 'finance', name: 'Finance', color: '#ffad47' },
  { id: 'travel', name: 'Travel', color: '#a479e2' },
]

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('')
const sig = (text: string) => `<p class="sig">${text.replace(/\n/g, '<br>')}</p>`

interface MsgSpec {
  from: Contact
  to?: Contact[]
  cc?: Contact[]
  at: { minutes?: number; hours?: number; days?: number }
  body: string
  quoted?: string
  att?: Array<[string, number, AttachmentKind]>
  unread?: boolean
  starred?: boolean
  draft?: boolean
}

interface ThreadSpec {
  subject: string
  category?: Category
  location?: ThreadLocation
  labels?: string[]
  snoozeDays?: number
  msgs: MsgSpec[]
}

function buildThreads(specs: ThreadSpec[], now: number): Thread[] {
  return specs.map((spec, ti) => {
    const threadId = `t${ti + 1}`
    const messages: Message[] = spec.msgs.map((m, mi) => {
      const attachments: Attachment[] | undefined = m.att?.map((a, ai) => ({
        id: `${threadId}m${mi + 1}a${ai + 1}`,
        name: a[0],
        size: a[1],
        kind: a[2],
      }))
      return {
        id: `${threadId}m${mi + 1}`,
        threadId,
        from: m.from,
        to: m.to ?? [ME],
        cc: m.cc,
        date: ago(m.at, now),
        bodyHtml: m.body,
        quotedHtml: m.quoted,
        snippet: snippetOf(m.body),
        attachments,
        unread: m.unread ?? false,
        starred: m.starred ?? false,
        draft: m.draft,
      }
    })
    return {
      id: threadId,
      subject: spec.subject,
      messages,
      labelIds: spec.labels ?? [],
      category: spec.category ?? 'primary',
      location: spec.location ?? 'inbox',
      snoozedUntil: spec.snoozeDays ? now + spec.snoozeDays * 86_400_000 : undefined,
    }
  })
}

export function seedThreads(now = Date.now()): Thread[] {
  const specs: ThreadSpec[] = [
    // ── Primary ────────────────────────────────────────────────────────────
    {
      subject: 'Q3 roadmap review — comments before Thursday?',
      labels: ['work'],
      msgs: [
        {
          from: sofia,
          to: [ME, marcus],
          cc: [priya],
          at: { hours: 26 },
          body: p(
            'Hi both,',
            'I just published v2 of the Q3 roadmap. The biggest change since the draft: we pulled the payments migration forward to August and pushed the reporting revamp to late September. Growth asked for the referral experiment to stay in, so it did.',
            'Could you leave comments by <b>Thursday EOD</b>? I want to lock scope before the planning session next week.',
          ) + sig('Sofia Martinez\nProduct Lead · Horizon Labs'),
          att: [['Q3-roadmap-v2.pdf', 1_814_732, 'pdf']],
        },
        {
          from: marcus,
          to: [sofia, ME],
          cc: [priya],
          at: { hours: 5 },
          body: p(
            'Left comments on sections 2 and 4.',
            'One flag: if payments moves to August we need Daniel full-time on it, which means the checkout bug backlog slips. I think that trade is right, but I want it to be explicit in the doc.',
          ),
          quoted: p('I just published v2 of the Q3 roadmap…'),
        },
        {
          from: sofia,
          to: [ME, marcus],
          cc: [priya],
          at: { hours: 2 },
          body: p(
            'Good catch — made the trade-off explicit in section 4 and added a risks row.',
            'Alex, still waiting on your pass over the platform items. Even a quick 👍/👎 per row helps.',
          ),
          quoted: p('Left comments on sections 2 and 4…'),
          unread: true,
        },
      ],
    },
    {
      subject: 'Bug: checkout totals drift on refresh (#4821)',
      labels: ['work'],
      msgs: [
        {
          from: daniel,
          to: [ME, marcus],
          at: { days: 3, hours: 4 },
          body: p(
            'Seeing a weird one in production: refresh the checkout page twice quickly and the order total changes by a cent or two. Repro rate ~1 in 8 on staging.',
            'Suspects: the tax line is computed client-side from an unrounded subtotal while the server rounds per item. Filed as #4821.',
          ),
        },
        {
          from: ME,
          to: [daniel, marcus],
          at: { days: 3, hours: 1 },
          body: p(
            'Can reproduce. It is the per-item vs per-order rounding mismatch — cart items round half-up, the summary rounds half-even.',
            'Short term we should make the client trust the server total and never recompute. Longer term the totals endpoint should be the single source of truth.',
          ),
          quoted: p('Seeing a weird one in production…'),
        },
        {
          from: marcus,
          to: [ME, daniel],
          at: { days: 2, hours: 20 },
          body: p('Agreed on both. Daniel, take the short-term fix this sprint; put the endpoint consolidation in the payments-migration epic so it does not get lost.'),
        },
        {
          from: daniel,
          to: [ME, marcus],
          at: { days: 1, hours: 6 },
          body: p(
            'PR up: <a href="#">horizon-labs/checkout#482</a>. Client now renders server totals verbatim, and I added a regression test that hammers refresh 20×.',
            'One review and it can ship today.',
          ),
        },
        {
          from: ME,
          to: [daniel, marcus],
          at: { days: 1, hours: 3 },
          body: p('Reviewed and approved — one nit about the test timeout, non-blocking. Nice fast turnaround.'),
        },
        {
          from: daniel,
          to: [ME, marcus],
          at: { hours: 4 },
          body: p(
            'Merged and deployed. Totals are stable across refreshes on prod, and Sentry has been quiet for 3 hours.',
            'Closing #4821. Thanks both for the fast reviews.',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Re: Design system tokens migration',
      labels: ['work'],
      msgs: [
        {
          from: priya,
          to: [ME],
          cc: [daniel],
          at: { days: 2, hours: 9 },
          body: p(
            'Package v3 of the tokens is ready. Color and spacing are 1:1 with the Figma source now, and the deprecated aliases print a console warning instead of silently mapping.',
            'The migration codemod covers ~90% of usages. The stragglers are the charts package and two legacy settings screens.',
          ),
          att: [['tokens-v3-mapping.fig', 4_204_558, 'image']],
        },
        {
          from: ME,
          to: [priya],
          cc: [daniel],
          at: { days: 2, hours: 3 },
          body: p(
            'Ran the codemod on a branch — 214 files changed, snapshot diffs all look intentional.',
            'Charts I can take next week. Can we leave the legacy settings screens on aliases until the settings redesign lands? Warning noise is acceptable there.',
          ),
          quoted: p('Package v3 of the tokens is ready…'),
        },
        {
          from: priya,
          to: [ME],
          cc: [daniel],
          at: { days: 1, hours: 22 },
          body: p('Works for me. I will pin the alias layer to v3 so nothing breaks when v4 starts. Kicking off the rollout ticket now.'),
        },
        {
          from: daniel,
          to: [priya, ME],
          at: { days: 1, hours: 20 },
          body: p('FYI the charts package also pulls tokens at build time through the theme plugin — happy to pair on that when you get to it, there is one gnarly indirection.'),
        },
      ],
    },
    {
      subject: 'Speaker confirmation — FrontendConf Lisbon 🎤',
      labels: ['work', 'travel'],
      msgs: [
        {
          from: lucia,
          to: [ME],
          at: { days: 1, hours: 8 },
          body: p(
            'Hi Alex,',
            'Wonderful news — your talk <b>“Design systems that survive their authors”</b> is confirmed for the main stage, October 9th, 11:30–12:10.',
            'Attached is the speaker guide with AV specs, hotel details and the reimbursement process. We cover up to €450 for flights and two hotel nights.',
            'Could you confirm your travel dates by Friday so we can book the hotel block?',
          ) + sig('Lucia Ortiz\nProgram Chair · FrontendConf EU'),
          att: [['speaker-guide-2026.pdf', 2_318_002, 'pdf']],
        },
        {
          from: lucia,
          to: [ME],
          at: { hours: 3 },
          body: p(
            'Quick follow-up — the hotel block closes <b>this Friday</b>, so we would need your dates by Thursday evening at the latest.',
            'Also: would you be up for a 20-minute podcast recording while you are in Lisbon? Optional, but attendees love those.',
          ),
          unread: true,
          starred: true,
        },
      ],
    },
    {
      subject: 'Dinner Saturday?',
      labels: ['personal'],
      msgs: [
        {
          from: jordan,
          at: { hours: 7 },
          body: p(
            'Hey! Nadia and I are trying that new Oaxacan place on 5th on Saturday — Casa Itzel. They had a cancellation so we have a table for four at 7:30.',
            'You and Sam in? They apparently do a mole tasting that is supposed to be ridiculous.',
          ),
        },
        {
          from: jordan,
          at: { hours: 1, minutes: 20 },
          body: p('Update: they can only hold the table until tomorrow morning, so let me know tonight if you can 🙏'),
          unread: true,
        },
      ],
    },
    {
      subject: 'Flight options for Lisbon in October',
      labels: ['travel', 'personal'],
      msgs: [
        {
          from: mom,
          at: { hours: 9 },
          body: p(
            'Hi sweetheart,',
            'Since you will already be in Lisbon for the conference, your dad and I looked at joining for the weekend after. There is a direct TAP flight on the Friday that lands at 10am, and pretty reasonable fares if we book this week.',
            'Would the 10th–14th work with your schedule? We would do our own thing during your conference days, of course. Also — do you still have that spreadsheet from the Porto trip? It had all the restaurant notes.',
            'Love, Mom',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Your offer letter — Horizon Labs',
      labels: ['work'],
      msgs: [
        {
          from: emma,
          to: [ME],
          at: { days: 12 },
          body: p(
            'Hi Alex,',
            'It was a pleasure speaking with you today. As discussed, attached is the updated offer reflecting the Staff Engineer level and the revised equity grant.',
            'The offer is valid through the end of the month. Happy to set up a call with Marcus or anyone on the team if that would help your decision.',
          ) + sig('Emma Larsen\nPeople Operations · Horizon Labs'),
          att: [['Offer-Letter-Alex-Rivera.pdf', 328_115, 'pdf']],
          starred: true,
        },
      ],
    },
    {
      subject: 'Apartment inspection — Tuesday Jul 21, 10am–12pm',
      labels: ['personal'],
      msgs: [
        {
          from: nina,
          at: { days: 2, hours: 6 },
          body: p(
            'Dear resident,',
            'This is a reminder that the annual unit inspection for 4th-floor apartments is scheduled for <b>Tuesday, July 21st between 10am and 12pm</b>. A technician will check smoke detectors, the HVAC filter and under-sink plumbing. The visit takes about 15 minutes.',
            'You do not need to be home; building staff will accompany the technician. If you prefer to be present, reply to this email and we will give you a narrower window.',
          ) + sig('Nina Patel\nBrightstone Properties'),
        },
      ],
    },
    {
      subject: 'Tax documents for 2025 filing',
      labels: ['finance'],
      msgs: [
        {
          from: tom,
          at: { days: 6, hours: 5 },
          body: p(
            'Hi Alex,',
            'To finish your 2025 return I still need: (1) the 1099-B from your brokerage, (2) receipts for the home-office equipment you mentioned, and (3) the property tax statement.',
            'The extension deadline is October 15 but I would rather not cut it close. The attached worksheet shows what I have so far.',
          ) + sig('Tom Bradley, CPA\nBradley Tax Group'),
          att: [['2025-tax-worksheet.xlsx', 88_204, 'sheet']],
        },
        {
          from: ME,
          to: [tom],
          at: { days: 5, hours: 22 },
          body: p('Thanks Tom — 1099-B attached here, and I will scan the equipment receipts this weekend. The property tax statement should arrive by mail this week; I will forward it as soon as it does.'),
          att: [['1099-B-2025.pdf', 412_770, 'pdf']],
          quoted: p('To finish your 2025 return I still need…'),
        },
      ],
    },
    {
      subject: 'Standup notes — week of Jul 13',
      labels: ['work'],
      msgs: [
        {
          from: daniel,
          to: [ME, marcus, sofia, priya],
          at: { days: 1, hours: 2 },
          body: p(
            'Notes from this morning:',
            '<b>Shipped:</b> checkout totals fix (#4821), tokens v3 alias layer, the new empty states.<br><b>In flight:</b> payments migration spike, search relevance tweaks, offsite retro doc.<br><b>Blocked:</b> nothing 🎉',
            'Retro is Friday 2pm — add topics to the board before Thursday.',
          ),
        },
      ],
    },
    {
      subject: 'Climbing this week?',
      labels: ['personal'],
      msgs: [
        {
          from: sam,
          at: { days: 2, hours: 12 },
          body: p('Gym or outdoors this week? The forecast says Thursday evening is the only dry window. Otherwise Tuesday indoor?'),
        },
        {
          from: ME,
          to: [sam],
          at: { days: 2, hours: 10 },
          body: p('Thursday outdoors if it holds — I want another go at that 5.11a before it gets too polished. Backup Tuesday indoor works.'),
        },
        {
          from: sam,
          at: { days: 2, hours: 9 },
          body: p('Deal. I will bring the rope, you bring the quickdraws. If it rains we can do the moonboard and complain about our fingers.'),
        },
      ],
    },
    {
      subject: 'Feedback on onboarding copy',
      labels: ['work'],
      msgs: [
        {
          from: priya,
          at: { hours: 6 },
          body: p(
            'Rewrote the first-run screens after the user interviews. Three changes: we lead with the import (that is what people came to do), the permissions ask moved to the moment it is needed, and every screen now has a skip.',
            'Draft is in Figma → Onboarding v4 → page “Copy pass”. Would love your read before I hand it to legal.',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Team offsite photos 📸',
      labels: ['work'],
      msgs: [
        {
          from: marcus,
          to: [ME, sofia, priya, daniel],
          at: { days: 5, hours: 7 },
          body: p(
            'Finally pulled the photos off my camera. The full album is in the drive, but these three are too good not to share directly — including the one of Daniel discovering the karaoke machine.',
            'Good week, team. Same place next year?',
          ),
          att: [
            ['offsite-day1-team.jpg', 3_812_400, 'image'],
            ['offsite-karaoke.jpg', 2_988_113, 'image'],
            ['offsite-sunset-deck.jpg', 4_410_552, 'image'],
          ],
        },
      ],
    },
    {
      subject: 'Intro: Alex ↔ Dana (Loom infra)',
      labels: ['work'],
      msgs: [
        {
          from: marcus,
          to: [ME, dana],
          at: { days: 4, hours: 8 },
          body: p(
            'Alex, meet Dana — we worked together at my last gig, and she has spent the past two years on exactly the kind of migration you are about to start. Dana, Alex leads platform here and is staring down a payments-provider move.',
            'I will let you two take it from here.',
          ),
        },
        {
          from: dana,
          to: [ME],
          cc: [marcus],
          at: { days: 4, hours: 2 },
          body: p(
            'Happy to help — we did the same move in 2024 and stepped on every rake so you do not have to.',
            'I am free Wednesday or Thursday afternoon PT. Bring your cutover plan if you have one; the dual-write phase is where the bodies are buried.',
          ),
        },
      ],
    },
    {
      subject: 'Reminder: your appointment on Thursday Jul 16',
      msgs: [
        {
          from: dentist,
          at: { hours: 30 },
          body: p(
            'Hi Alex,',
            'This is a friendly reminder of your cleaning appointment on <b>Thursday, July 16 at 2:30 PM</b> with Dr. Okafor.',
            'Please arrive 10 minutes early. Need to reschedule? Reply to this email or call (555) 014-2298 at least 24 hours in advance.',
          ),
          unread: true,
        },
      ],
    },

    // ── Updates ────────────────────────────────────────────────────────────
    {
      subject: '[horizon-labs/checkout] PR #482 merged: Trust server totals in cart summary',
      category: 'updates',
      labels: ['work'],
      msgs: [
        {
          from: github,
          at: { hours: 4, minutes: 12 },
          body: p(
            '<b>daniel-kim-hl</b> merged pull request <a href="#">#482</a> into <b>main</b>.',
            '“Client now renders server-computed totals verbatim. Adds a refresh-hammering regression test for #4821.”',
            '2 approvals · 14 files changed · +312 −188',
          ),
        },
      ],
    },
    {
      subject: 'Deployment failed: horizon-web (production)',
      category: 'updates',
      labels: ['work'],
      msgs: [
        {
          from: vercel,
          at: { hours: 1, minutes: 40 },
          body:
            p('Your deployment of <b>horizon-web</b> to <b>production</b> failed during the build step.') +
            `<table class="card"><tr><td>Project</td><td>horizon-web</td></tr><tr><td>Branch</td><td>main · 4f2c9ae</td></tr><tr><td>Error</td><td>Type error in src/routes/checkout.tsx:214</td></tr><tr><td>Duration</td><td>1m 42s</td></tr></table>` +
            p('<a href="#">View build logs</a> · The previous deployment remains live.'),
          unread: true,
        },
      ],
    },
    {
      subject: 'New issue: TypeError in CartSummary — 214 events',
      category: 'updates',
      labels: ['work'],
      msgs: [
        {
          from: sentry,
          at: { hours: 8 },
          body:
            p('A new issue was detected in <b>horizon-web</b>:') +
            `<table class="card"><tr><td>Issue</td><td>TypeError: Cannot read properties of undefined (reading 'total')</td></tr><tr><td>Location</td><td>CartSummary(src/components/CartSummary.tsx)</td></tr><tr><td>Events</td><td>214 in the last hour</td></tr><tr><td>Users affected</td><td>~38</td></tr></table>` +
            p('<a href="#">View issue</a> · <a href="#">Mute for 24h</a>'),
          unread: true,
        },
      ],
    },
    {
      subject: 'Your invoice from Horizon Labs is available',
      category: 'updates',
      labels: ['finance'],
      msgs: [
        {
          from: stripe,
          at: { days: 3, hours: 2 },
          body:
            p('Your invoice for July is attached.') +
            `<table class="card"><tr><td>Invoice</td><td>#HL-2026-0714</td></tr><tr><td>Amount</td><td>$240.00</td></tr><tr><td>Status</td><td>Paid</td></tr></table>`,
          att: [['invoice-HL-2026-0714.pdf', 96_412, 'pdf']],
        },
      ],
    },
    {
      subject: 'Your order has shipped: Anker USB-C Hub (8-in-1)',
      category: 'updates',
      msgs: [
        {
          from: amazon,
          at: { days: 1, hours: 12 },
          body:
            p('Your package is on its way and will arrive <b>Thursday, July 16</b>.') +
            `<table class="card"><tr><td>Order</td><td>#114-2205981-3310027</td></tr><tr><td>Carrier</td><td>UPS · 1Z 8842 X01 03</td></tr><tr><td>Deliver to</td><td>Alex Rivera · 4F</td></tr></table>` +
            p('<a href="#">Track your package</a>'),
        },
      ],
    },
    {
      subject: 'Your Tuesday evening trip with Uber',
      category: 'updates',
      labels: ['finance'],
      msgs: [
        {
          from: uber,
          at: { days: 6, hours: 3 },
          body:
            p('Thanks for riding, Alex. Here is your receipt.') +
            `<table class="card"><tr><td>Total</td><td>$18.42</td></tr><tr><td>Trip</td><td>Dolores St → Harrison St</td></tr><tr><td>Time</td><td>19 min · 4.3 mi</td></tr><tr><td>Payment</td><td>Visa ···· 4821</td></tr></table>`,
        },
      ],
    },
    {
      subject: 'Invitation: Q3 Planning @ Thu Jul 16, 1–3pm (alex.rivera@fablemail.app)',
      category: 'updates',
      labels: ['work'],
      msgs: [
        {
          from: gcal,
          at: { hours: 22 },
          body:
            p('<b>Sofia Martinez</b> invited you to <b>Q3 Planning</b>.') +
            `<table class="card"><tr><td>When</td><td>Thursday, Jul 16 · 1:00–3:00 PM</td></tr><tr><td>Where</td><td>Fern room + Meet</td></tr><tr><td>Guests</td><td>8 — sofia, marcus, priya, daniel, you…</td></tr></table>` +
            p('<a href="#">Yes</a> · <a href="#">No</a> · <a href="#">Maybe</a>'),
          att: [['invite.ics', 4_112, 'calendar']],
          unread: true,
        },
      ],
    },
    {
      subject: 'Security advisory: 2 of your projects use a vulnerable version of fast-xml-parser',
      category: 'updates',
      labels: ['work'],
      msgs: [
        {
          from: npmjs,
          at: { days: 2, hours: 2 },
          body: p(
            'A high-severity advisory (GHSA-58qx) was published for <b>fast-xml-parser &lt; 4.4.2</b>: crafted entities can cause prototype pollution.',
            'Affected projects: <b>horizon-web</b> (via sitemap-tools), <b>hl-integrations</b> (direct). Upgrade to 4.4.2 or later.',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Linear weekly: 12 issues completed, 3 added',
      category: 'updates',
      labels: ['work'],
      msgs: [
        {
          from: linear,
          at: { days: 1, hours: 16 },
          body: p(
            'Your week in <b>Platform</b>:',
            '✅ 12 completed (top: HL-482 checkout totals, HL-467 tokens v3) · 🆕 3 added · 📈 cycle velocity +18%',
            'Next cycle starts Monday with 14 scoped issues.',
          ),
        },
      ],
    },
    {
      subject: 'Your receipt from Spotify',
      category: 'updates',
      labels: ['finance'],
      msgs: [
        {
          from: spotify,
          at: { days: 8 },
          body:
            p('Thanks for your payment.') +
            `<table class="card"><tr><td>Plan</td><td>Premium Duo</td></tr><tr><td>Amount</td><td>$16.99</td></tr><tr><td>Billed</td><td>Visa ···· 4821 · Jul 6, 2026</td></tr></table>`,
        },
      ],
    },

    // ── Social ─────────────────────────────────────────────────────────────
    {
      subject: 'You have 4 new invitations',
      category: 'social',
      msgs: [
        {
          from: linkedin,
          at: { days: 1, hours: 4 },
          body: p(
            '<b>Dana Fuchs</b>, <b>Ravi Iyer</b> and 2 others want to connect on LinkedIn.',
            'Dana Fuchs · Infrastructure Engineering at Loom · 12 mutual connections',
            '<a href="#">Accept</a> · <a href="#">View all invitations</a>',
          ),
        },
      ],
    },
    {
      subject: '🔥 Your post is getting attention: 2.4K impressions',
      category: 'social',
      msgs: [
        {
          from: xcorp,
          at: { hours: 5, minutes: 30 },
          body: p(
            'Your post “design tokens are a people problem wearing a technology costume” is doing numbers:',
            '2.4K impressions · 118 likes · 22 reposts · 9 replies',
            '<a href="#">View post analytics</a>',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Jordan Lee and 3 others gave you kudos',
      category: 'social',
      msgs: [
        {
          from: strava,
          at: { days: 2, hours: 18 },
          body: p(
            'Your activity <b>“Thursday hill repeats (regret immediately)”</b> got kudos from Jordan Lee, Sam Torres and 2 others.',
            '6.2 mi · 48:12 · 620 ft elevation',
          ),
        },
      ],
    },
    {
      subject: 'New in Oakwood: "Anyone else hear the construction at 6am?"',
      category: 'social',
      msgs: [
        {
          from: nextdoor,
          at: { days: 3, hours: 9 },
          body: p(
            'Trending in your neighborhood:',
            '“Anyone else hear the construction at 6am?” — 34 replies · “Free lemon tree cuttings on Maple & 9th” — 12 replies · “Lost tabby near the park, answers to Biscuit” — 41 replies',
          ),
        },
      ],
    },

    // ── Promotions ─────────────────────────────────────────────────────────
    {
      subject: '☕ Chips, dips, and the AI capex boom',
      category: 'promotions',
      msgs: [
        {
          from: morningbrew,
          at: { hours: 10 },
          body: p(
            '<b>Good morning.</b> The chip industry spent more on new fabs last quarter than the previous three combined, streaming services quietly raised prices again, and scientists taught a robot hand to shuffle cards better than a Vegas dealer.',
            'Also in today’s issue: why every grocery store suddenly has a “fancy water” aisle, and the surprisingly cutthroat economics of stadium pretzels.',
            '<a href="#">Read the full issue →</a>',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'How the best PMs run discovery (with real examples)',
      category: 'promotions',
      msgs: [
        {
          from: lenny,
          at: { days: 1, hours: 14 },
          body: p(
            'This week I interviewed product leaders at six companies about how they actually run discovery — not the framework-poster version, the real one.',
            'Highlights: continuous interviews beat big research phases, the best teams write down what would change their mind before talking to users, and every team that shipped fast had one person with kill authority.',
            '<a href="#">Read online</a> · 14 min',
          ),
          starred: true,
        },
      ],
    },
    {
      subject: '48-hour flash sale — up to 40% off laptops & monitors',
      category: 'promotions',
      msgs: [
        {
          from: bestbuy,
          at: { hours: 16 },
          body: p(
            'Two days only: save on top-rated tech. 34" ultrawide monitors from $279, gaming laptops from $749, and an extra 10% off open-box.',
            'Members get free next-day delivery on orders over $35. Sale ends Wednesday 11:59 PM.',
            '<a href="#">Shop the sale</a>',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: '$0 delivery fees all weekend 🎉',
      category: 'promotions',
      msgs: [
        {
          from: doordash,
          at: { days: 1, hours: 6 },
          body: p(
            'This weekend only: $0 delivery fees from your favorites within 3 miles. No code needed — the fee drops at checkout.',
            'Popular near you: Casa Itzel (Oaxacan), Golden Bowl (pho), Marlowe’s (burgers).',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Lisbon stays for your October dates',
      category: 'promotions',
      labels: ['travel'],
      msgs: [
        {
          from: airbnb,
          at: { days: 2, hours: 5 },
          body: p(
            'Still thinking about Lisbon Oct 8–12? Places matching your saved filters are booking up — 73% of Alfama listings for those dates are gone.',
            'Top picks: bright 1BR with river view ($124/night) · rooftop studio near Time Out Market ($98/night) · classic azulejo flat in Graça ($112/night).',
            '<a href="#">See all 28 stays</a>',
          ),
        },
      ],
    },
    {
      subject: 'Config 2026 session recordings are live',
      category: 'promotions',
      labels: ['work'],
      msgs: [
        {
          from: figma,
          at: { days: 4, hours: 10 },
          body: p(
            'All 62 sessions from Config 2026 are now available to watch, including the keynote, “Variables at scale”, and the design-engineering panel everyone kept quoting.',
            '<a href="#">Watch on demand</a>',
          ),
        },
      ],
    },
    {
      subject: "Don't lose your 47-day streak! 🔥",
      category: 'promotions',
      msgs: [
        {
          from: duolingo,
          at: { hours: 2, minutes: 15 },
          body: p(
            'Alex, your Portuguese streak is in danger! Complete a lesson before midnight to keep your 47-day streak alive.',
            'You are 220 XP from moving up in the Diamond League. Duo believes in you. Duo is watching.',
          ),
          unread: true,
        },
      ],
    },

    // ── Sent-only threads ──────────────────────────────────────────────────
    {
      subject: 'Expense report — June',
      location: 'archive',
      labels: ['finance'],
      msgs: [
        {
          from: ME,
          to: [tom],
          at: { days: 9, hours: 4 },
          body: p(
            'Hi Tom,',
            'June expense report attached — the big line items are the offsite travel and the new monitor. Receipts are in the second sheet, categorized the way you asked.',
            'Let me know if anything needs a receipt I missed.',
          ),
          att: [['expenses-june-2026.xlsx', 64_002, 'sheet']],
        },
      ],
    },
    {
      subject: 'Reference for Maya Chen',
      location: 'archive',
      labels: ['work'],
      msgs: [
        {
          from: ME,
          to: [c('Hiring — Northwind', 'hiring@northwind.dev')],
          at: { days: 7, hours: 6 },
          body: p(
            'Hello,',
            'Happy to give a reference for Maya Chen — I managed her for two years on the platform team.',
            'Short version: she is the engineer you hand the ambiguous, cross-team problem to. She rebuilt our design-token pipeline while keeping every consumer unbroken, and she writes the clearest technical docs I have read. I would hire her again without hesitation.',
            'Happy to get on a call if useful.',
          ),
        },
      ],
    },
    {
      subject: 'Notes from user interviews (batch 3)',
      location: 'archive',
      labels: ['work'],
      msgs: [
        {
          from: ME,
          to: [sofia, priya],
          at: { days: 4, hours: 20 },
          body: p(
            'Wrote up the last five interviews. Recurring themes:',
            '1. Nobody understands the difference between “archive” and “done” — we should pick one word.<br>2. The import is the moment of truth; two people almost churned when it stalled.<br>3. Power users want keyboard shortcuts badly enough that two asked unprompted.',
            'Full notes in the doc. I say we fix the import stall before anything else.',
          ),
        },
      ],
    },
    {
      subject: 'Re: Reschedule 1:1 to Friday?',
      location: 'archive',
      labels: ['work'],
      msgs: [
        {
          from: marcus,
          to: [ME],
          at: { days: 1, hours: 9 },
          body: p('Something came up Thursday — can we move our 1:1 to Friday 10am? Same doc, I added two topics.'),
        },
        {
          from: ME,
          to: [marcus],
          at: { days: 1, hours: 8 },
          body: p('Friday 10 works. I added the payments staffing question to the doc as well — want to resolve that before planning.'),
        },
      ],
    },

    // ── Drafts ─────────────────────────────────────────────────────────────
    {
      subject: "Ideas for dad's 60th",
      location: 'archive',
      labels: ['personal'],
      msgs: [
        {
          from: ME,
          to: [jordan],
          at: { days: 1, hours: 5 },
          body: p(
            'Okay, current shortlist for dad’s 60th:',
            '1. Weekend at the coast house with everyone (needs booking soon)<br>2. That woodworking masterclass he keeps mentioning<br>3. Restoring the record player + first-pressing of Kind of Blue',
            'Leaning toward 1 + 3 combined. Mom is in for',
          ),
          draft: true,
        },
      ],
    },
    {
      subject: 'Talk outline — Design systems that survive their authors',
      location: 'archive',
      labels: ['work'],
      msgs: [
        {
          from: ME,
          to: [],
          at: { days: 2, hours: 1 },
          body: p(
            'Working outline:',
            '1. The graveyard: three design systems that died and why<br>2. Systems as products, not projects — the maintenance budget argument<br>3. Tokens, the API surface you did not know you were shipping<br>4. Succession: docs, codemods, and making yourself replaceable',
            'Need a stronger cold open. Maybe the “14 button components” audit story?',
          ),
          draft: true,
        },
      ],
    },

    // ── Snoozed ────────────────────────────────────────────────────────────
    {
      subject: 'Car insurance renewal — action needed by Jul 30',
      labels: ['finance'],
      snoozeDays: 2,
      msgs: [
        {
          from: insurer,
          at: { days: 3, hours: 11 },
          body: p(
            'Hi Alex,',
            'Your auto policy #MA-88214-C renews on July 30. Your new premium is <b>$118.40/month</b> (up from $112.10) reflecting regional rate changes.',
            'No action is needed to renew. To adjust coverage or compare plans, visit your account before the renewal date.',
          ),
        },
      ],
    },

    // ── Trash ──────────────────────────────────────────────────────────────
    {
      subject: 'Confirm your unsubscribe from DailyDealz',
      location: 'trash',
      category: 'promotions',
      msgs: [
        {
          from: c('DailyDealz', 'newsletter@dailydealz.shop'),
          at: { days: 4, hours: 3 },
          body: p('You have been unsubscribed from DailyDealz. We are sorry to see you go! It may take up to 48 hours for emails to stop.'),
        },
      ],
    },
    {
      subject: 'Last chance: your cart is waiting',
      location: 'trash',
      category: 'promotions',
      msgs: [
        {
          from: c('GadgetGrove', 'offers@gadgetgrove.shop'),
          at: { days: 6, hours: 8 },
          body: p('Your cart misses you! Complete your order in the next 24 hours and get 15% off with code COMEBACK15.'),
        },
      ],
    },

    // ── Spam ───────────────────────────────────────────────────────────────
    {
      subject: 'URGENT: Verify your account within 24 hours',
      location: 'spam',
      msgs: [
        {
          from: scammer1,
          at: { days: 1, hours: 15 },
          body: p(
            'Dear Customer, we detected unusual sign-in activity on your account. To avoid permanent suspension, verify your identity within 24 hours by confirming your credentials at the secure link below.',
            '<a href="#">Verify account now</a>',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: 'Business proposal — confidential',
      location: 'spam',
      msgs: [
        {
          from: scammer2,
          at: { days: 3, hours: 20 },
          body: p(
            'Dear Friend, I am contacting you regarding a mutually beneficial transaction involving the transfer of $14,500,000 USD. Your discretion is paramount. Kindly reply with your full name and bank details to proceed.',
          ),
          unread: true,
        },
      ],
    },
    {
      subject: '🎁 You have been selected: claim your $500 gift card',
      location: 'spam',
      msgs: [
        {
          from: giftcards,
          at: { days: 5, hours: 2 },
          body: p('Congratulations! Your email was randomly selected for a $500 shopping gift card. Claim within 48 hours or your prize will be forfeited. <a href="#">Claim now</a>'),
          unread: true,
        },
      ],
    },
  ]

  return buildThreads(specs, now)
}

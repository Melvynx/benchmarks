import { ME } from './contacts'
import { makeAttachment } from './format'
import { SYS, type Category, type Message, type Thread } from './types'

const P = 'priya@orbitlabs.com'
const D = 'daniel.osei@orbitlabs.com'
const S = 'sofia@orbitlabs.com'
const T = 'tom@orbitlabs.com'
const G = 'grace.kim@orbitlabs.com'
const B = 'ben@orbitlabs.com'
const N = 'nadia@orbitlabs.com'
const MW = 'marcus.webb@orbitlabs.com'
const Y = 'yuki@orbitlabs.com'
const EP = 'elena.petrova@orbitlabs.com'
const OG = 'oliver.grant@orbitlabs.com'
const ME_ = ME.email

type At = [daysAgo: number, hour: number, minute: number]

interface MsgSpec {
  from: string
  to?: string[]
  cc?: string[]
  at: At
  body: string
  atts?: [name: string, size: number][]
  /** Only meaningful on the last message; earlier ones are read. */
  unread?: boolean
  draft?: boolean
}

interface ThreadSpec {
  subject: string
  cat?: Category
  labels?: string[]
  starred?: boolean
  important?: boolean
  /** inbox is the default. */
  where?: 'inbox' | 'archive' | 'trash' | 'spam' | 'draft' | 'scheduled' | 'snoozed'
  /** Hours from now, for snoozed/scheduled threads. */
  wakeIn?: number
  msgs: MsgSpec[]
}

/* ------------------------------------------------------------------ bodies */

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('')
const sig = (name: string, role: string) =>
  `<p><span style="color:#5f6368">—<br>${name}<br>${role}</span></p>`

const SPECS: ThreadSpec[] = [
  /* ============================================================ TODAY ==== */
  {
    subject: 'Re: Q3 roadmap — cut list needs your call by EOD',
    cat: 'primary',
    labels: ['lbl_work', 'lbl_followup'],
    important: true,
    starred: true,
    msgs: [
      {
        from: G,
        to: [ME_, P],
        cc: [T],
        at: [1, 17, 12],
        body: p(
          'Maya — we are 3 weeks out from the Q3 cutoff and engineering capacity is short by roughly 11 dev-weeks. I put together the trade-off doc with three options.',
          'My read: option B is the only one that keeps the enterprise commitments intact. It costs us the mobile widget refresh, which I know Sofia will not love.',
          'Attaching the capacity model. Can you make the call by Friday so Priya can re-plan sprints?',
        ),
        atts: [
          ['Q3-capacity-model.xlsx', 184_320],
          ['roadmap-tradeoffs-v3.pdf', 1_046_528],
        ],
      },
      {
        from: P,
        to: [ME_, G],
        cc: [T],
        at: [1, 18, 40],
        body: p(
          'Confirming the numbers. 11 dev-weeks is accurate assuming Yuki stays on the crash backlog through August.',
          'One correction to the doc: the SSO work is 4 weeks, not 6. We already landed the SAML parsing in #2841.',
        ),
      },
      {
        from: G,
        to: [ME_, P],
        cc: [T],
        at: [0, 8, 52],
        body: p(
          'Updated with Priya&rsquo;s correction — that pulls the gap to 9 dev-weeks, which makes option B comfortable rather than tight.',
          'Still need your decision today. I have the sprint planning doc open and ready.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Design review: onboarding v4 (Figma link inside)',
    cat: 'primary',
    labels: ['lbl_design', 'lbl_work'],
    msgs: [
      {
        from: S,
        to: [ME_, G, 'design-crit@orbitlabs.com'],
        at: [0, 9, 24],
        body: p(
          'Fourth pass on onboarding is ready for crit. The big change: we dropped the workspace-naming step entirely and infer it from the email domain.',
          'Early numbers from the prototype test (n=14): time-to-first-dashboard dropped from 4m10s to 1m38s. Two people got stuck on the data-source picker, so that screen is still red.',
          '<a href="#">Open the Figma file →</a>',
          'I would like 20 minutes with you before Thursday&rsquo;s crit so we are aligned on the data-source question.',
        ),
        atts: [['onboarding-v4-flow.png', 2_312_704]],
        unread: true,
      },
    ],
  },
  {
    subject: '[Orbit] Production alert resolved: p99 latency on /v2/events',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: 'alerts@sentry.io',
        to: [ME_, P, D],
        at: [0, 6, 3],
        body: p(
          '<strong>Alert: p99 latency &gt; 1200ms on POST /v2/events</strong>',
          'Triggered 05:41 UTC · Resolved 06:02 UTC · Duration 21 minutes',
          'Peak p99 <strong>2,940 ms</strong> · Affected requests <strong>18,402</strong> · Error rate stayed below 0.4%.',
          'Root cause candidate: the ingest workers exhausted the connection pool while the nightly rollup job held long transactions.',
          '<a href="#">View issue in Sentry →</a>',
        ),
        unread: true,
      },
      {
        from: D,
        to: [ME_, P],
        at: [0, 7, 15],
        body: p(
          'I was up for this one. Confirmed it was the rollup job — it grabbed 40 of 50 pool connections for about 18 minutes.',
          'Short-term fix shipped: rollup now runs on its own pool with a hard cap of 8. Longer term we should move it off the primary entirely.',
          'No customer-facing errors, just slow writes. I will write it up properly in the incident doc this afternoon.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Your Skyward itinerary — LHR → SFO, Mon 3 Aug',
    cat: 'updates',
    labels: ['lbl_travel'],
    starred: true,
    msgs: [
      {
        from: 'itinerary@skywardair.com',
        to: [ME_],
        at: [0, 7, 41],
        body: [
          '<h2 style="margin-bottom:4px">Trip confirmed · SK 4471</h2>',
          '<p style="color:#5f6368;margin-top:0">Booking reference <strong>QX8P2M</strong> · Maya Okonkwo</p>',
          '<table><tbody>',
          '<tr><th>Outbound</th><td>Mon 3 Aug · London Heathrow (LHR) T3 <strong>10:20</strong> → San Francisco (SFO) <strong>13:35</strong></td></tr>',
          '<tr><th>Return</th><td>Sat 8 Aug · San Francisco (SFO) <strong>16:05</strong> → London Heathrow (LHR) <strong>10:40</strong> +1</td></tr>',
          '<tr><th>Seat</th><td>14A (window) · Economy Plus · 1 checked bag</td></tr>',
          '</tbody></table>',
          '<p>Online check-in opens 24 hours before departure.</p>',
          '<p><a class="btn-cta" href="#">Manage booking</a></p>',
        ].join(''),
        atts: [['skyward-itinerary-QX8P2M.pdf', 96_256]],
        unread: true,
      },
    ],
  },
  {
    subject: 'daniel.osei opened a pull request: Fix connection pool starvation in rollup worker',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: 'notifications@github.com',
        to: [ME_, P],
        at: [0, 8, 11],
        body: p(
          '<strong>orbitlabs/ingest</strong> · #2903 · <code>fix/rollup-pool-isolation</code> → <code>main</code>',
          'Gives the nightly rollup job a dedicated pool capped at 8 connections, adds a pool-saturation gauge, and backs off when the primary pool drops below 30% headroom.',
          '<strong>+214 −38</strong> across 7 files · 2 reviewers requested · checks passing',
          '<a href="#">Review pull request →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Meridian renewal — legal wants two redlines',
    cat: 'primary',
    labels: ['lbl_work', 'lbl_followup'],
    important: true,
    msgs: [
      {
        from: 'jordan@meridianretail.com',
        to: [ME_],
        cc: [MW],
        at: [2, 14, 30],
        body: p(
          'Hi Maya — good news, we have budget approval for the 24-month renewal at the tier we discussed.',
          'Our legal team has two changes they need before signature: (1) the data-retention clause needs to say 90 days rather than "commercially reasonable period", and (2) they want a 30-day termination-for-convenience window in year two.',
          'Point 2 is the one they will not move on. Can your side live with it?',
        ),
      },
      {
        from: ME_,
        to: ['jordan@meridianretail.com'],
        cc: [MW, OG],
        at: [1, 10, 5],
        body: p(
          'Jordan — great news on the budget, thank you for pushing that through.',
          'Looping in Oliver from our side. My instinct is that 90 days on retention is straightforward; the termination window needs a conversation but I do not expect it to be a blocker.',
          'Oliver, can you take a first read and come back to Jordan directly?',
        ),
      },
      {
        from: OG,
        to: [ME_, 'jordan@meridianretail.com'],
        cc: [MW],
        at: [0, 9, 58],
        body: p(
          'Jordan, thanks for the clear framing.',
          'Retention at 90 days is fine — I will update clause 7.3. On termination for convenience, we can offer it in year two with a 60-day notice period rather than 30. That protects our forecast without leaving you locked in.',
          'Redlined draft attached. If 60 days works I can have this in DocuSign this afternoon.',
        ),
        atts: [['Meridian-MSA-renewal-redline-v2.pdf', 428_032]],
        unread: true,
      },
    ],
  },
  {
    subject: 'lunch tomorrow? 🍜',
    cat: 'primary',
    msgs: [
      {
        from: 'lea.dubois@gmail.com',
        to: [ME_],
        at: [0, 10, 2],
        body: p(
          'I am in Shoreditch tomorrow for a client thing that finishes at noon. Ramen at that place on Redchurch St?',
          'Also I still have your umbrella. It has been four months. This is now a hostage situation.',
        ),
        unread: true,
      },
    ],
  },

  /* ========================================================= YESTERDAY ==== */
  {
    subject: 'Weekly product metrics — week 30',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: N,
        to: ['eng-all@orbitlabs.com', ME_],
        at: [1, 16, 45],
        body: [
          p('Week 30 snapshot. Two things worth your attention are flagged below.'),
          '<table><tbody>',
          '<tr><th>Metric</th><th>This week</th><th>WoW</th></tr>',
          '<tr><td>Weekly active workspaces</td><td>4,182</td><td>+3.1%</td></tr>',
          '<tr><td>Events ingested</td><td>1.94B</td><td>+6.8%</td></tr>',
          '<tr><td>Trial → paid conversion</td><td>11.2%</td><td><strong>−2.4pp</strong></td></tr>',
          '<tr><td>Net revenue retention</td><td>118%</td><td>+1pp</td></tr>',
          '<tr><td>Support first-response</td><td>3h 12m</td><td>−41m</td></tr>',
          '</tbody></table>',
          p(
            '<strong>Flag 1:</strong> trial conversion is down two weeks running. The drop is concentrated in self-serve signups that never connect a data source — which lines up with what Sofia is seeing in onboarding research.',
            '<strong>Flag 2:</strong> ingest growth is outpacing our capacity plan by about 9%. Not urgent, but the September forecast needs redoing.',
          ),
          sig('Nadia Haddad', 'Data Science · Orbit Labs'),
        ].join(''),
        atts: [['week-30-metrics.pdf', 742_400]],
      },
    ],
  },
  {
    subject: 'Offer accepted — Amara Nwosu, Senior Product Designer',
    cat: 'primary',
    labels: ['lbl_hiring', 'lbl_work'],
    starred: true,
    important: true,
    msgs: [
      {
        from: EP,
        to: [ME_, S],
        cc: [T],
        at: [1, 11, 20],
        body: p(
          'She signed! Amara starts Monday 17 August, reporting to Sofia.',
          'Laptop and accounts are already requested. I have put a 30/60/90 template in the shared drive — Sofia, can you fill in the first-month goals by the 8th?',
          'Also worth noting: she mentioned twice that the portfolio-review round was the reason she chose us over the other offer. Whatever you two did in that session, keep doing it.',
        ),
      },
      {
        from: S,
        to: [ME_, EP],
        cc: [T],
        at: [1, 11, 52],
        body: p(
          'Brilliant news. I will have the 30/60/90 done by Wednesday.',
          'Maya — can we put her on the data-source picker as a first project? It is small, visible, and genuinely broken.',
        ),
      },
    ],
  },
  {
    subject: 'Invoice INV-2026-0714 paid — £2,480.00',
    cat: 'updates',
    labels: ['lbl_receipts'],
    msgs: [
      {
        from: 'receipts@stripe.com',
        to: [ME_],
        at: [1, 9, 14],
        body: p(
          '<strong>Payment received</strong> · £2,480.00 GBP',
          'Invoice <strong>INV-2026-0714</strong> from Ali Consulting Ltd was paid on 24 July 2026 via card ending 4242.',
          'Description: Data platform architecture review — July retainer.',
          '<a href="#">View invoice PDF →</a>',
        ),
        atts: [['INV-2026-0714.pdf', 88_064]],
      },
    ],
  },
  {
    subject: 'Re: Coffee before Config?',
    cat: 'primary',
    msgs: [
      {
        from: 'wei.zhang@cartography.dev',
        to: [ME_],
        at: [3, 15, 8],
        body: p(
          'Maya! I saw you are speaking at Config this year — congratulations, the talk title is excellent.',
          'I land in SF on the 3rd. Any chance of coffee on the 4th before the keynote circus starts? I want to hear how the ingest rewrite went, and I have a question about how you structured the design-engineering handoff.',
        ),
      },
      {
        from: ME_,
        to: ['wei.zhang@cartography.dev'],
        at: [2, 8, 30],
        body: p(
          'Wei! Yes to coffee. The 4th works — I land on the 3rd and I will be jetlagged and useless by 4pm, so morning is better.',
          'There is a Sightglass two blocks from Moscone. 8:30?',
          'Happy to talk handoff. Short version: we stopped doing handoff. Longer version needs coffee.',
        ),
      },
      {
        from: 'wei.zhang@cartography.dev',
        to: [ME_],
        at: [1, 7, 22],
        body: p(
          '"We stopped doing handoff" is exactly the kind of sentence that makes me buy the coffee. 8:30 at Sightglass, confirmed.',
        ),
      },
    ],
  },
  {
    subject: 'Bramble Vet — Ozzy is due for his booster',
    cat: 'primary',
    labels: ['lbl_family'],
    msgs: [
      {
        from: 'appointments@bramblevet.co.uk',
        to: [ME_],
        at: [1, 13, 0],
        body: p(
          'Hello Maya, this is a reminder that <strong>Ozzy</strong> (Domestic Shorthair, 6y) is due for his annual booster vaccination in the next three weeks.',
          'We have appointments available on Tue 4 Aug at 09:20, Thu 6 Aug at 15:40 and Sat 8 Aug at 10:00.',
          '<a href="#">Book online →</a> or call us on 020 7946 0821.',
        ),
      },
    ],
  },
  {
    subject: 'You have 3 new connection requests and 14 profile views',
    cat: 'social',
    msgs: [
      {
        from: 'notifications@linkedin.com',
        to: [ME_],
        at: [1, 12, 30],
        body: p(
          '<strong>Ibrahim Diallo</strong> (CTO at Fintrace) and 2 others want to connect.',
          'Your post about instrumenting onboarding funnels reached <strong>8,412</strong> people this week — your best in six months.',
          '<a href="#">See who viewed your profile →</a>',
        ),
      },
    ],
  },

  /* ========================================================== THIS WEEK === */
  {
    subject: 'Incident postmortem: 18 July ingest backlog',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: P,
        to: [ME_, T, D, N],
        at: [4, 10, 40],
        body: p(
          'Postmortem for the 18 July backlog is done and I would like it reviewed before it goes to the whole company on Monday.',
          '<strong>Summary:</strong> a malformed schema push from a single large customer caused the validator to retry indefinitely. Queue depth peaked at 42 million events. Recovery took 6 hours 20 minutes. No data was lost.',
          '<strong>Contributing factors:</strong> no upper bound on validator retries; queue-depth alert threshold was set to 5M, which we routinely exceed during normal spikes, so the page was ignored for 40 minutes.',
          '<strong>Actions:</strong> bounded retries with a dead-letter queue (done), alert thresholds rebased on rate-of-change rather than absolute depth (in review), a customer-level ingest quota (Q3).',
          'The uncomfortable part is the ignored page. I want to talk about that in the review rather than in writing.',
        ),
        atts: [['postmortem-2026-07-18.pdf', 512_000]],
      },
      {
        from: T,
        to: [P, ME_, D, N],
        at: [4, 12, 5],
        body: p(
          'Thank you for writing this the honest way. The alert-fatigue point is the real finding — the rest is engineering.',
          'Publish it as-is. I will speak to the ignored-page question at the all-hands so it does not land on any one person.',
        ),
      },
      {
        from: ME_,
        to: [P, T, D, N],
        at: [4, 14, 22],
        body: p(
          'Agreed on all counts. One addition for the actions list: we told 11 customers "we are investigating" and then went quiet for four hours. The comms gap was worse than the outage for at least three of them.',
          'Ben and I will draft a status-page policy so this is not improvised next time.',
        ),
      },
    ],
  },
  {
    subject: 'Config 2026 speaker logistics — slides due 29 July',
    cat: 'updates',
    labels: ['lbl_travel', 'lbl_followup'],
    important: true,
    msgs: [
      {
        from: 'events@figma.com',
        to: [ME_],
        at: [3, 9, 30],
        body: p(
          'Hi Maya, you are confirmed for <strong>"Instrumentation as a design material"</strong> on the Product stage, Wed 5 August, 14:20–14:50 (30 minutes including Q&amp;A).',
          '<strong>Deadline: final slides by Wednesday 29 July.</strong> 16:9, no video embeds, we will run them from our deck machine.',
          'Speaker briefing call is Thursday 30 July at 17:00 BST. Green room opens at 13:00 on the day.',
          '<a href="#">Upload slides →</a>',
        ),
        atts: [['config-2026-speaker-pack.pdf', 1_884_160]],
      },
      {
        from: ME_,
        to: ['events@figma.com'],
        at: [3, 18, 15],
        body: p(
          'Confirmed, thank you. Slides will be in by the 29th and I will make the briefing call.',
          'One question: is there a confidence monitor with presenter notes, or should I plan to work without notes?',
        ),
      },
    ],
  },
  {
    subject: 'Support escalation: Fintrace cannot export beyond 50k rows',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: B,
        to: [ME_, D],
        cc: [MW],
        at: [3, 16, 20],
        body: p(
          'Fintrace has hit the CSV export ceiling three times this week. Their finance team needs a 180-day export which is about 340k rows; we truncate silently at 50,000.',
          'The silent truncation is the actual bug — they reconciled against a truncated file and it cost them a day.',
          'Ibrahim has been very patient but he asked me directly whether this is on the roadmap. What should I tell him?',
        ),
      },
      {
        from: D,
        to: [B, ME_],
        cc: [MW],
        at: [3, 17, 2],
        body: p(
          'Two separate fixes. Making the truncation loud is half a day — I can do that this week. Streaming exports properly (async job + emailed download link) is about a week and a half.',
          'I would ship the warning immediately regardless of what we decide about streaming.',
        ),
      },
      {
        from: ME_,
        to: [B, D],
        cc: [MW, 'ibrahim@fintrace.co'],
        at: [2, 9, 12],
        body: p(
          'Ship the warning this week, Daniel — silent data loss is not something we sit on.',
          'Ibrahim, adding you directly. Streaming exports are going into the Q3 plan; I will confirm the sprint once we finalise the roadmap on Friday. In the meantime Ben can run the 180-day export manually for you today.',
          'Sorry about the reconciliation day. That one is on us.',
        ),
      },
      {
        from: 'ibrahim@fintrace.co',
        to: [ME_, B, D],
        at: [2, 10, 30],
        body: p(
          'Appreciated, and the direct answer is worth more than the fix honestly.',
          'Manual export today would help a lot. And yes — a loud error we can work around, a quiet wrong number we cannot.',
        ),
      },
    ],
  },
  {
    subject: 'Notion: Grace mentioned you in "Q3 planning / trade-offs"',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: 'team@makenotion.com',
        to: [ME_],
        at: [3, 11, 45],
        body: p(
          '<strong>Grace Kim</strong> mentioned you in a comment:',
          '<blockquote>@Maya Okonkwo — need your call on B vs C here. C keeps the widget refresh but pushes SSO into Q4, which breaks two enterprise commitments.</blockquote>',
          '<a href="#">Reply in Notion →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Vercel deployment ready — orbit-dashboard (production)',
    cat: 'updates',
    msgs: [
      {
        from: 'no-reply@vercel.com',
        to: [ME_],
        at: [3, 14, 8],
        body: p(
          '<strong>orbit-dashboard</strong> deployed to production in 1m 42s.',
          'Commit <code>a91f3cd</code> — "feat(export): warn when result set exceeds export ceiling" by daniel.osei',
          'Build passed · 0 warnings · Lighthouse 98 / 100 / 100 / 96',
          '<a href="#">Visit deployment →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Your Northline order has shipped',
    cat: 'promotions',
    labels: ['lbl_receipts'],
    msgs: [
      {
        from: 'orders@northline.com',
        to: [ME_],
        at: [4, 8, 20],
        body: p(
          'Order <strong>#NL-88420137</strong> is on its way. Expected Saturday 26 July.',
          '1 × Aeron-style task chair, graphite · 1 × monitor arm, single',
          '<a href="#">Track parcel →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Sunday lunch — 2pm, and bring the good bread',
    cat: 'primary',
    labels: ['lbl_family'],
    msgs: [
      {
        from: 'adaeze.okonkwo@gmail.com',
        to: [ME_, 'chidi.ok@gmail.com'],
        at: [4, 19, 10],
        body: p(
          'Both of you, Sunday, 2pm. Chidi is bringing Tessa so behave.',
          'Maya — the bread from the place near you, not the supermarket one. I will know.',
          'Also your father has decided he understands the new television and I need a witness.',
        ),
      },
      {
        from: 'chidi.ok@gmail.com',
        to: ['adaeze.okonkwo@gmail.com', ME_],
        at: [4, 20, 2],
        body: p('Confirmed for two. I will bring wine and moral support re: the television.'),
      },
      {
        from: ME_,
        to: ['adaeze.okonkwo@gmail.com', 'chidi.ok@gmail.com'],
        at: [3, 8, 5],
        body: p(
          'I will be there with the correct bread.',
          'Fair warning: I fly to SF the following morning so I may be doing laundry in my head the whole time.',
        ),
      },
    ],
  },
  {
    subject: 'Kestrel Hotels — reservation confirmed, San Francisco',
    cat: 'updates',
    labels: ['lbl_travel', 'lbl_receipts'],
    msgs: [
      {
        from: 'reservations@kestrelhotels.com',
        to: [ME_],
        at: [5, 10, 12],
        body: p(
          '<strong>Kestrel SoMa</strong> · 3–8 August 2026 · 5 nights',
          'King room, high floor · Confirmation <strong>KH-7742901</strong> · £1,145.00 total, charged at checkout.',
          'Check-in from 15:00. Your room includes the workspace desk you requested.',
          '<a href="#">Modify reservation →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Senior Director, Product — would you take a look?',
    cat: 'primary',
    labels: ['lbl_hiring'],
    msgs: [
      {
        from: 'hannah@northbeam-talent.com',
        to: [ME_],
        at: [5, 14, 40],
        body: p(
          'Hi Maya — I will be direct because I know your inbox is not short of these.',
          'I am working with a Series C infrastructure company (London, hybrid 2 days) looking for a Senior Director of Product to own the developer-facing surface. Team of 6 PMs, reports to the CPO. Comp band is £185–210k plus equity.',
          'The reason I am writing to you specifically: they have the same "instrumentation is a design problem" thesis you wrote about in June, and their current product leader is leaving on good terms to start something.',
          'Worth 20 minutes? Happy to send the brief without any process attached.',
        ),
      },
    ],
  },
  {
    subject: 'Design Systems Club: token naming, round 47',
    cat: 'forums',
    labels: ['lbl_reading'],
    msgs: [
      {
        from: 'design-systems@googlegroups.com',
        to: ['design-systems@googlegroups.com'],
        at: [5, 17, 30],
        body: p(
          '<strong>New in the group this week</strong>',
          '· "Semantic vs. literal token names: a truce" — 34 replies<br>· "How do you version a colour change that is technically a bug fix?" — 21 replies<br>· "Show &amp; tell: our team dropped the t-shirt sizing scale" — 12 replies',
          'The truce thread is genuinely good. The short version: name by role at the component boundary, by literal value inside primitives, and stop pretending one scheme survives both.',
        ),
      },
    ],
  },

  /* ======================================================== LAST 30 DAYS == */
  {
    subject: 'Board deck — please review section 3 (product)',
    cat: 'primary',
    labels: ['lbl_work'],
    starred: true,
    msgs: [
      {
        from: T,
        to: [ME_, P, 'rachel@northstar.vc'],
        at: [9, 18, 20],
        body: p(
          'Board is on the 6th. Deck is drafted; section 3 is yours.',
          'What I need from you: the honest version of the trial-conversion story. Rachel will ask about it and I would rather we bring it than defend it.',
          'Deadline for your section is the 31st so I can rehearse over the weekend.',
        ),
        atts: [['Orbit-board-deck-Aug-2026-DRAFT.pptx', 6_312_960]],
      },
      {
        from: 'rachel@northstar.vc',
        to: [T, ME_, P],
        at: [9, 20, 45],
        body: p(
          'Looking forward to it. And yes, I will ask about trial conversion — bring the diagnosis, not just the number.',
          'One other thing I would like in the room: what you would do with 15 more engineers, and what you would do with 5 fewer. Both answers are informative.',
        ),
      },
    ],
  },
  {
    subject: 'Re: partnership pilot — Brightpath × Orbit',
    cat: 'primary',
    labels: ['lbl_work', 'lbl_followup'],
    msgs: [
      {
        from: 'clara.nunes@brightpath.io',
        to: [ME_],
        cc: [MW],
        at: [12, 11, 15],
        body: p(
          'Maya, following our call — here is the pilot shape we discussed, written down so we are both honest about it.',
          '<strong>Scope:</strong> 8 weeks, 3 shared customers, Brightpath surfaces Orbit dashboards inside our reporting tab. <strong>Success:</strong> ≥40% of pilot accounts use the embedded view weekly, and support volume does not increase for either side.',
          'The part I am least sure about is auth. We would need a token exchange rather than an iframe with a shared secret, and I do not know your appetite for that.',
        ),
        atts: [['brightpath-orbit-pilot-brief.pdf', 322_560]],
      },
      {
        from: ME_,
        to: ['clara.nunes@brightpath.io'],
        cc: [MW, P],
        at: [11, 9, 40],
        body: p(
          'This is a good brief — thank you for writing the success criteria down before the excitement wears off.',
          'On auth: token exchange is the right call and we have most of it from the SSO work. Priya, can you sanity-check the effort? My guess is under two weeks.',
          'One addition to success criteria: I want a qualitative check too. If 40% use it weekly but hate it, we should know that before we scale it.',
        ),
      },
      {
        from: P,
        to: [ME_, 'clara.nunes@brightpath.io'],
        cc: [MW],
        at: [11, 14, 25],
        body: p(
          'Token exchange is about 6 dev-days on our side given the SAML work already landed. The unknown is Brightpath&rsquo;s side, not ours.',
          'Caveat: this competes directly with streaming exports for Daniel&rsquo;s time. One of the two moves.',
        ),
      },
    ],
  },
  {
    subject: 'Performance review cycle opens Monday',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: EP,
        to: ['eng-all@orbitlabs.com', ME_],
        at: [14, 9, 0],
        body: p(
          'The H1 review cycle opens Monday 13 July and closes Friday 31 July.',
          'Managers: 6 direct-report reviews plus your own self-review. Calibration sessions are the week of 3 August — Maya, yours is Tuesday 4 August at 16:00 BST, which I know is your Config week, so tell me now if that needs moving.',
          '<a href="#">Open the review tool →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Your 1Password vault: 3 items need attention',
    cat: 'updates',
    msgs: [
      {
        from: 'no-reply@1password.com',
        to: [ME_],
        at: [16, 7, 30],
        body: p(
          'Watchtower found <strong>3 items</strong> that need your attention.',
          '· 1 password appeared in a known data breach<br>· 1 password is reused across 2 sites<br>· 1 login is missing two-factor authentication',
          '<a href="#">Open Watchtower →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Tempo: your July is your biggest month yet 🏃',
    cat: 'social',
    msgs: [
      {
        from: 'no-reply@tempo.run',
        to: [ME_],
        at: [18, 6, 45],
        body: p(
          '<strong>112 km</strong> so far in July — 21 km more than your previous best month.',
          '14 runs · 11h 48m moving time · average pace 6:19/km · longest run 21.4 km',
          'Léa Dubois and 6 others gave you kudos this week.',
        ),
      },
    ],
  },
  {
    subject: 'Rent review — 14 Ashgrove Court',
    cat: 'primary',
    msgs: [
      {
        from: 'lettings@fieldingproperty.co.uk',
        to: [ME_],
        at: [20, 10, 20],
        body: p(
          'Dear Ms Okonkwo,',
          'Your tenancy at 14 Ashgrove Court is due for renewal on 1 October 2026. The landlord proposes a revised rent of <strong>£2,150 per calendar month</strong>, an increase of £120.',
          'Please confirm in writing by 15 August whether you wish to renew for a further 12 months.',
          'Kind regards,<br>Fielding Property Management',
        ),
        atts: [['tenancy-renewal-2026.pdf', 214_016]],
      },
    ],
  },
  {
    subject: 'Dense Discovery № 341',
    cat: 'promotions',
    labels: ['lbl_reading'],
    msgs: [
      {
        from: 'hello@densediscovery.com',
        to: [ME_],
        at: [21, 8, 0],
        body: p(
          '<strong>This week:</strong> a font built for cockpit displays, an argument against dashboards, and a tool that turns spreadsheets into small ugly websites on purpose.',
          '<em>"The dashboard is where a question goes to die."</em> — an essay that will annoy you productively if your job involves dashboards. Which, reader, it does.',
          '<a href="#">Read issue 341 →</a>',
        ),
      },
    ],
  },
  {
    subject: 'The Interface: what the instrumentation crowd gets wrong',
    cat: 'promotions',
    labels: ['lbl_reading'],
    msgs: [
      {
        from: 'letters@theinterface.email',
        to: [ME_],
        at: [23, 8, 30],
        body: p(
          'The measurement people and the taste people have been having the same argument for fifteen years and both sides are getting worse at it.',
          'This week: why "we are data-driven" almost always means "we are last-quarter-driven", and a short defence of the product decision that cannot be A/B tested.',
          '<a href="#">Continue reading →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Kinfolk Supply — 25% off the summer range, ends Sunday',
    cat: 'promotions',
    msgs: [
      {
        from: 'hello@kinfolksupply.com',
        to: [ME_],
        at: [6, 9, 0],
        body: p(
          '<h2>Mid-season, 25% off</h2>',
          'Linen, cotton, and the canvas weekender you looked at twice last month and did not buy. We noticed. We are not going to make it weird.',
          '<p><a class="btn-cta" href="#">Shop the sale</a></p>',
          '<span style="color:#5f6368;font-size:12px">Ends Sunday 23:59. Excludes archive.</span>',
        ),
      },
    ],
  },
  {
    subject: 'Rook Coffee: your subscription ships Thursday',
    cat: 'promotions',
    labels: ['lbl_receipts'],
    msgs: [
      {
        from: 'brew@rookcoffee.co',
        to: [ME_],
        at: [8, 7, 15],
        body: p(
          'This month: <strong>Kirinyaga AB, Kenya</strong> — blackcurrant, brown sugar, and enough acidity to make a statement about your morning.',
          '250g whole bean, shipping Thursday. £14.00 on your card ending 4242.',
          '<a href="#">Skip or change this delivery →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Dribbble weekly: 12 shots you might like',
    cat: 'social',
    msgs: [
      {
        from: 'digest@dribbble.com',
        to: [ME_],
        at: [10, 8, 0],
        body: p(
          'Dashboards, mostly. Some of them are even usable.',
          'Also trending: brutalist data tables, which is either a phase or a cry for help.',
        ),
      },
    ],
  },
  {
    subject: 'React Weekly #482',
    cat: 'forums',
    labels: ['lbl_reading'],
    msgs: [
      {
        from: 'digest@reactweekly.dev',
        to: [ME_],
        at: [13, 8, 0],
        body: p(
          '· The compiler is stable and your memo calls are now mostly decoration<br>· A very long post about why suspense boundaries are a design decision<br>· Someone rebuilt a spreadsheet in 4kB and we should all sit with that',
        ),
      },
    ],
  },
  {
    subject: 'Discord: 42 unread in Design Engineering',
    cat: 'forums',
    msgs: [
      {
        from: 'noreply@discord.com',
        to: [ME_],
        at: [15, 20, 30],
        body: p(
          'You have unread messages in <strong>#design-engineering</strong>, <strong>#show-and-tell</strong> and 3 other channels.',
        ),
      },
    ],
  },
  {
    subject: 'New sign-in to your Google Account',
    cat: 'updates',
    msgs: [
      {
        from: 'no-reply@accounts.google.com',
        to: [ME_],
        at: [17, 21, 12],
        body: p(
          'Your Google Account was just signed in to from a new MacBook Pro.',
          'Thursday 9 July, 21:12 BST · London, United Kingdom',
          'If this was you, no action is needed. If not, we will help you secure your account.',
          '<a href="#">Check activity →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Ledger: 4 expenses need receipts before month end',
    cat: 'updates',
    labels: ['lbl_receipts'],
    msgs: [
      {
        from: 'team@ledger.finance',
        to: [ME_],
        at: [19, 12, 0],
        body: p(
          'You have <strong>4 expenses</strong> totalling £312.40 missing receipts. These lock on 31 July.',
          '· £184.00 · Skyward Airlines seat upgrade<br>· £62.40 · Client dinner, Meridian<br>· £48.00 · Taxi, Heathrow<br>· £18.00 · Coffee, offsite',
          '<a href="#">Upload receipts →</a>',
        ),
      },
    ],
  },
  {
    subject: 'Re: iOS crash rate is back under 0.2%',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: Y,
        to: [ME_, P],
        at: [7, 15, 30],
        body: p(
          'Crash-free sessions are at 99.83% on 4.12.0, up from 99.41%. The Keychain race was 80% of it.',
          'Remaining tail is almost all one thing: iPad multitasking with the chart view. It is ugly to fix properly because the layout code predates me and possibly predates good sense.',
          'Do you want me to keep going down the tail, or move to the widget work?',
        ),
      },
      {
        from: ME_,
        to: [Y],
        cc: [P],
        at: [7, 17, 5],
        body: p(
          'This is a great result — 0.42pp is not a small move at that volume.',
          'Stay on the tail for one more week. iPad multitasking is exactly the kind of thing that generates one furious review and zero support tickets, and I would rather kill it now.',
          'After that, widget work, assuming Friday&rsquo;s roadmap call goes the way I expect.',
        ),
      },
    ],
  },
  {
    subject: 'Linear: 6 issues assigned to you this cycle',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: 'notifications@linear.app',
        to: [ME_],
        at: [11, 8, 30],
        body: p(
          '<strong>Cycle 31</strong> starts Monday. You have 6 assigned issues, 2 of which are carried over.',
          '· ORB-1841 Decide Q3 cut list <em>(carried over ×2)</em><br>· ORB-1902 Write status-page comms policy<br>· ORB-1908 Board deck section 3<br>· ORB-1911 Config slides<br>· ORB-1915 Amara 30/60/90 sign-off<br>· ORB-1920 Q4 headcount draft',
          'ORB-1841 has been carried over twice. Linear is not judging you. Linear is simply noting it.',
        ),
      },
    ],
  },
  {
    subject: 'Thanks for the intro to Rachel',
    cat: 'primary',
    msgs: [
      {
        from: 'hassan@ali-consulting.com',
        to: [ME_],
        at: [22, 16, 45],
        body: p(
          'Maya — the Northstar conversation went well. They are not the right fit for this raise but Rachel introduced me to two people who might be, which is the better outcome anyway.',
          'I owe you a dinner. Genuinely, not the polite kind that never happens.',
        ),
      },
      {
        from: ME_,
        to: ['hassan@ali-consulting.com'],
        at: [22, 18, 20],
        body: p(
          'Delighted it was useful. Rachel is excellent at the "not us, but here are two people" move — it is rarer than it should be.',
          'Dinner accepted. I am away the first week of August; after that I am yours.',
        ),
      },
    ],
  },
  {
    subject: 'Strider: the new trail range is here',
    cat: 'promotions',
    msgs: [
      {
        from: 'news@strider.com',
        to: [ME_],
        at: [24, 10, 0],
        body: p(
          '<h2>Built for the bad weather you run in anyway</h2>',
          'New Fell 4 and Ridge GTX, plus the winter kit that has not yet admitted it is winter kit.',
          '<p><a class="btn-cta" href="#">Shop new in</a></p>',
        ),
      },
    ],
  },

  /* ============================================================ ARCHIVE == */
  {
    subject: 'Welcome to Orbit Labs 🎉',
    cat: 'primary',
    labels: ['lbl_work'],
    where: 'archive',
    msgs: [
      {
        from: EP,
        to: [ME_],
        at: [420, 9, 0],
        body: p(
          'Maya — welcome aboard. Your first day is Monday and here is everything you need before then.',
          'Laptop will be at reception. Your accounts are provisioned. Tom has blocked 90 minutes on Monday afternoon, and I have put a "no meetings before 11am for two weeks" rule on your calendar which you are welcome to break but I would advise against it.',
          'We are very glad you said yes.',
        ),
        atts: [['orbit-first-week.pdf', 620_544]],
      },
    ],
  },
  {
    subject: 'Old: Q1 planning notes',
    cat: 'primary',
    labels: ['lbl_work'],
    where: 'archive',
    msgs: [
      {
        from: G,
        to: [ME_, P],
        at: [180, 14, 0],
        body: p(
          'Archiving these here so they are findable. Q1 shipped 4 of 6 committed items; the two misses were both dependent on the ingest rewrite.',
          'Lesson recorded for Q2: do not commit to anything downstream of a rewrite in the same quarter as the rewrite.',
        ),
      },
    ],
  },

  /* ============================================================== DRAFTS == */
  {
    subject: 'Q3 roadmap decision — going with option B',
    where: 'draft',
    labels: ['lbl_work'],
    msgs: [
      {
        from: ME_,
        to: [G, P, T],
        at: [0, 9, 40],
        draft: true,
        body: p(
          'Decision: option B. We keep the enterprise commitments (SSO, audit log, streaming exports) and we push the mobile widget refresh to Q4.',
          'Reasoning, so nobody has to guess: the two enterprise items are contractual, the widget refresh is not, and the 9-week gap makes B comfortable rather than heroic.',
          'Sofia — I know this is the second quarter running that widgets slip. I want to talk about that properly rather than',
        ),
      },
    ],
  },
  {
    subject: '',
    where: 'draft',
    msgs: [
      {
        from: ME_,
        to: ['hannah@northbeam-talent.com'],
        at: [4, 22, 10],
        draft: true,
        body: p('Hi Hannah, thank you for reaching out and for actually reading what I wrote —'),
      },
    ],
  },
  {
    subject: 'Status page comms policy — first draft',
    where: 'draft',
    labels: ['lbl_work'],
    msgs: [
      {
        from: ME_,
        to: [B, P],
        cc: [T],
        at: [2, 16, 30],
        draft: true,
        body: p(
          '<strong>Principle:</strong> customers should never learn about an incident from us going quiet.',
          '<strong>Rules.</strong> 1) Any incident affecting more than 1% of workspaces gets a status-page entry within 15 minutes, even if the entry says only "we are investigating". 2) Updates every 30 minutes while unresolved, no exceptions, even when there is nothing new — "still investigating, next update at 14:30" is a complete update. 3) A named human owns comms and is not the same human debugging.',
          '4) Post-resolution summary within 24 hours, in plain language, including what we got wrong.',
          'Ben — does rule 3 work with your on-call rota, or does it need a second person on the roster?',
        ),
        atts: [['status-comms-draft.md', 8_192]],
      },
    ],
  },

  /* =========================================================== SCHEDULED == */
  {
    subject: 'Slides for Wednesday — the honest version of section 3',
    where: 'scheduled',
    labels: ['lbl_work'],
    wakeIn: 15,
    msgs: [
      {
        from: ME_,
        to: [T],
        cc: [P],
        at: [0, 9, 5],
        body: p(
          'Tom — section 3 attached, and I have written the trial-conversion story the way you asked for it rather than the way it is comfortable.',
          'Short version for the deck: conversion dropped 2.4pp over two weeks, concentrated entirely in self-serve signups who never connect a data source. It is an onboarding problem, not a demand problem, and we have known about the data-source picker since May.',
          'The slide says that in those words. Tell me now if you would rather it did not.',
        ),
        atts: [['board-section-3-product.pptx', 3_104_768]],
      },
    ],
  },

  /* ============================================================= SNOOZED == */
  {
    subject: 'Q4 headcount plan — needs your numbers',
    cat: 'primary',
    labels: ['lbl_work'],
    where: 'snoozed',
    wakeIn: 26,
    msgs: [
      {
        from: OG,
        to: [ME_, P, S],
        at: [6, 11, 20],
        body: p(
          'Q4 headcount planning opens next week. I need requested roles, level, and a one-line justification per role from each function by 7 August.',
          'Guidance from Tom: assume flat budget with reallocation possible, not growth. If you want a role, something has to move.',
        ),
        atts: [['headcount-template-Q4.xlsx', 61_440]],
      },
    ],
  },
  {
    subject: 'Reminder: submit your July expenses',
    cat: 'updates',
    labels: ['lbl_receipts'],
    where: 'snoozed',
    wakeIn: 68,
    msgs: [
      {
        from: OG,
        to: [ME_],
        at: [5, 9, 0],
        body: p(
          'July expenses lock on the 31st. You have four items outstanding — Ledger has been emailing you about it and I suspect you have been snoozing those too.',
        ),
      },
    ],
  },

  /* =============================================================== TRASH == */
  {
    subject: 'Re: quick question about your tech stack',
    cat: 'primary',
    where: 'trash',
    msgs: [
      {
        from: 'kzhao@lattice-search.com',
        to: [ME_],
        at: [8, 13, 40],
        body: p(
          'Hi Maya, I noticed Orbit Labs is scaling and wanted to see whether you are open to a conversation about senior engineering talent. I have three candidates who would be a great fit.',
          'Also happy to share our salary benchmarking report for London infrastructure roles.',
        ),
      },
    ],
  },
  {
    subject: 'Webinar: 10 dashboard best practices for 2026',
    cat: 'promotions',
    where: 'trash',
    msgs: [
      {
        from: 'digest@dribbble.com',
        to: [ME_],
        at: [26, 9, 0],
        body: p(
          'Join 4,000 product leaders for a 45-minute webinar on dashboard best practices, followed by a 15-minute product demo you cannot leave gracefully.',
        ),
      },
    ],
  },

  /* ================================================================ SPAM == */
  {
    subject: 'FINAL NOTICE: Your $4,850,000 crypto reward is pending release',
    cat: 'promotions',
    where: 'spam',
    msgs: [
      {
        from: 'winner@luxe-rewards-claim.biz',
        to: [ME_],
        at: [2, 3, 14],
        body: p(
          'DEAR VALUED CLIENT!!! Your account has been SELECTED for immediate reward disbursement of $4,850,000 USD in verified digital assets.',
          'To release funds you must confirm identity within 24 HOURS by replying with full name, address, date of birth and wallet seed phrase.',
          'DO NOT DELAY. This offer is 100% legitimate and government approved.',
        ),
      },
    ],
  },
  {
    subject: 'Confidential business proposal — urgent reply needed',
    cat: 'primary',
    where: 'spam',
    msgs: [
      {
        from: 'b.holloway991@barrister-trust.net',
        to: [ME_],
        at: [9, 4, 2],
        body: p(
          'Dear Friend, I am Mrs. Beatrice Holloway, a barrister of high standing. I write concerning the estate of a deceased client who shares your surname and left £8.4 million unclaimed.',
          'I propose we present you as next of kin. The sharing ratio shall be 60/40 in your favour. This transaction is completely risk-free and legal.',
        ),
      },
    ],
  },
]

/* -------------------------------------------------------------- assembly */

function resolveAt(at: At, now: number) {
  const d = new Date(now)
  d.setDate(d.getDate() - at[0])
  d.setHours(at[1], at[2], 0, 0)
  // Never seed mail in the future.
  return Math.min(d.getTime(), now - 60_000 - at[0] * 137)
}

export interface Mailbox {
  threads: Thread[]
  messages: Record<string, Message>
}

export function buildSeed(now = Date.now()): Mailbox {
  const threads: Thread[] = []
  const messages: Record<string, Message> = {}

  SPECS.forEach((spec, ti) => {
    const tid = `t${String(ti + 1).padStart(3, '0')}`
    const labels = new Set<string>(spec.labels ?? [])
    const where = spec.where ?? 'inbox'

    const msgIds: string[] = []
    let last = 0
    let sentByMe = false

    spec.msgs.forEach((m, mi) => {
      const id = `${tid}m${mi + 1}`
      const date = resolveAt(m.at, now)
      if (m.from === ME_) sentByMe = true
      messages[id] = {
        id,
        threadId: tid,
        from: m.from,
        to: m.to ?? [ME_],
        cc: m.cc,
        date,
        body: m.body,
        attachments: m.atts?.map(([n, s]) => makeAttachment(n, s)),
        unread: m.unread,
        draft: m.draft,
        sendAt: where === 'scheduled' ? now + (spec.wakeIn ?? 12) * 3_600_000 : undefined,
        inReplyTo: mi > 0 ? `${tid}m${mi}` : undefined,
      }
      msgIds.push(id)
      last = Math.max(last, date)
    })

    if (where === 'inbox') labels.add(SYS.INBOX)
    if (where === 'trash') labels.add(SYS.TRASH)
    if (where === 'spam') labels.add(SYS.SPAM)
    if (where === 'draft') labels.add(SYS.DRAFT)
    if (where === 'snoozed') {
      labels.add(SYS.INBOX)
      labels.add(SYS.SNOOZED)
    }
    if (where === 'scheduled') labels.add(SYS.SCHEDULED)
    if (spec.starred) labels.add(SYS.STARRED)
    if (spec.important) labels.add(SYS.IMPORTANT)
    if (sentByMe && where !== 'draft' && where !== 'scheduled') labels.add(SYS.SENT)
    if (where === 'scheduled') labels.add(SYS.SENT)

    threads.push({
      id: tid,
      subject: spec.subject,
      messageIds: msgIds,
      labels: [...labels],
      category: spec.cat ?? 'primary',
      snoozeUntil:
        where === 'snoozed' ? now + (spec.wakeIn ?? 24) * 3_600_000 : undefined,
      lastActivity: where === 'scheduled' ? now + (spec.wakeIn ?? 12) * 3_600_000 : last,
    })
  })

  return { threads, messages }
}

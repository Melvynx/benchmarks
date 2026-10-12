import type { Attachment, Contact, IncomingItem, Label, Message, MessageStatus, Person, Thread } from '../types';
import { DAY, HOUR, MIN, atTime, formatFullDate } from '../lib/date';
import { escapeHtml, stripQuote } from '../lib/utils';
import { itinerary, newsletter, notice, ol, p, promo, sig, ul } from './templates';

export const ME: Person = { name: 'Alex Rivera', email: 'alex.rivera@lumenlabs.io' };

const c = <T extends Record<string, Contact>>(x: T) => x;

export const PEOPLE = c({
  priya: { name: 'Priya Natarajan', email: 'priya@lumenlabs.io', kind: 'person', title: 'VP of Engineering', org: 'Lumen Labs' },
  marcus: { name: 'Marcus Chen', email: 'marcus.chen@lumenlabs.io', kind: 'person', title: 'Senior Software Engineer', org: 'Lumen Labs' },
  lena: { name: 'Lena Fischer', email: 'lena@lumenlabs.io', kind: 'person', title: 'Product Designer', org: 'Lumen Labs' },
  jordan: { name: 'Jordan Blake', email: 'jordan@lumenlabs.io', kind: 'person', title: 'CEO', org: 'Lumen Labs' },
  hana: { name: 'Hana Sato', email: 'hana.sato@lumenlabs.io', kind: 'person', title: 'Product Manager', org: 'Lumen Labs' },
  alicia: { name: 'Alicia Gomez', email: 'people@lumenlabs.io', kind: 'person', title: 'People Operations', org: 'Lumen Labs' },
  team: { name: 'Lumen Team', email: 'team@lumenlabs.io', kind: 'org', org: 'Lumen Labs' },
  sam: { name: 'Sam Okafor', email: 'sam.okafor@fastmail.com', kind: 'person' },
  theo: { name: 'Theo Martin', email: 'theo.martin@icloud.com', kind: 'person' },
  mom: { name: 'Carol Rivera', email: 'carol.rivera@outlook.com', kind: 'person', phone: '(415) 555-0142' },
  dad: { name: 'Carl Rivera', email: 'carl.rivera@outlook.com', kind: 'person' },
  sofia: { name: 'Sofia Rivera', email: 'sofia.rivera@proton.me', kind: 'person' },
  diego: { name: 'Diego Alvarez', email: 'hello@diegoalvarez.studio', kind: 'person', title: 'Illustrator', org: 'Alvarez Studio' },
  nora: { name: 'Nora Lindqvist', email: 'nora@lindqvistproperties.com', kind: 'person', title: 'Property Manager', org: 'Lindqvist Properties' },
  olivia: { name: 'Olivia Park', email: 'olivia.park@atlasrobotics.com', kind: 'person', title: 'Design Recruiter', org: 'Atlas Robotics' },
  emma: { name: 'Emma Walsh', email: 'emma@designsystemssummit.com', kind: 'person', title: 'Program Chair', org: 'Design Systems Summit' },
  kenji: { name: 'Kenji Mori', email: 'kenji@moribuild.co', kind: 'person', title: 'Owner', org: 'Mori Build Co.' },
  ravi: { name: 'Ravi Kapoor', email: 'ravi@kapoor.vc', kind: 'person', title: 'Partner', org: 'Kapoor Ventures' },
  nadia: { name: 'Nadia Rahman', email: 'nadia.rahman@icloud.com', kind: 'person' },
  jasmine: { name: 'Jasmine Wu', email: 'jasmine.wu@northgate.edu', kind: 'person' },
});

export const ORGS = c({
  skyway: { name: 'Skyway Airlines', email: 'noreply@skywayair.com', kind: 'org' },
  brightbank: { name: 'Brightbank', email: 'statements@brightbank.com', kind: 'org' },
  hubstack: { name: 'Hubstack', email: 'notifications@hubstack.dev', kind: 'org' },
  trackline: { name: 'Trackline', email: 'digest@trackline.app', kind: 'org' },
  payflow: { name: 'Payflow', email: 'payouts@payflow.com', kind: 'org' },
  cloudbox: { name: 'Cloudbox', email: 'no-reply@cloudbox.io', kind: 'org' },
  linkd: { name: 'Linkd', email: 'notifications@linkd.com', kind: 'org' },
  chirp: { name: 'Chirp', email: 'notify@chirp.social', kind: 'org' },
  gatherly: { name: 'Gatherly', email: 'events@gatherly.com', kind: 'org' },
  northwind: { name: 'Northwind Outfitters', email: 'deals@northwind.shop', kind: 'org' },
  aurora: { name: 'Aurora Coffee Roasters', email: 'hello@auroracoffee.co', kind: 'org' },
  nestaway: { name: 'Nestaway', email: 'trips@nestaway.com', kind: 'org' },
  lumina: { name: 'Lumina Audio', email: 'store@lumina-audio.com', kind: 'org' },
  pixelcraft: { name: 'Pixelcraft', email: 'team@pixelcraft.design', kind: 'org' },
  greenleaf: { name: 'Greenleaf Market', email: 'weekly@greenleaf.market', kind: 'org' },
  brief: { name: 'The Morning Brief', email: 'brief@morningbrief.news', kind: 'org' },
  weekly: { name: 'Design Weekly', email: 'issue@designweekly.io', kind: 'org' },
  meetly: { name: 'Meetly', email: 'notifications@meetly.app', kind: 'org' },
  library: { name: 'Bay City Library', email: 'holds@baycitylibrary.org', kind: 'org' },
  dental: { name: 'Bright Smile Dental', email: 'appointments@brightsmiledental.com', kind: 'org' },
  it: { name: 'Lumen Labs IT', email: 'it-security@lumenlabs.io', kind: 'org' },
  ledgerly: { name: 'Ledgerly', email: 'documents@ledgerly.com', kind: 'org' },
  tickets: { name: 'Ticketbooth', email: 'orders@ticketbooth.com', kind: 'org' },
  vet: { name: 'Mission Pet Clinic', email: 'care@missionpetclinic.com', kind: 'org' },
  citydocs: { name: 'CityDocs Appointments', email: 'no-reply@citydocs.org', kind: 'org' },
  zoomride: { name: 'Zoomride', email: 'receipts@zoomride.com', kind: 'org' },
  growthcon: { name: 'GrowthCon', email: 'hello@growthcon.events', kind: 'org' },
  alumni: { name: 'Northgate Alumni', email: 'alumni@northgate.edu', kind: 'org' },
});

const SPAMMERS = {
  prize: { name: 'Rewards Center', email: 'winner@prize-claims-center.biz' },
  phish: { name: 'Account Services', email: 'security@verify-acct-support.net' },
  crypto: { name: 'Crypto Daily Profits', email: 'vip@cryptodailyprofits.io' },
};

export const SEED_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: 'blue' },
  { id: 'design', name: 'Design', color: 'pink' },
  { id: 'personal', name: 'Personal', color: 'green' },
  { id: 'family', name: 'Family', color: 'teal' },
  { id: 'travel', name: 'Travel', color: 'orange' },
  { id: 'finance', name: 'Finance', color: 'yellow' },
  { id: 'receipts', name: 'Receipts', color: 'purple' },
];

const MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  csv: 'text/csv',
};

let attSeq = 0;
function file(name: string, kb: number, preview?: string): Attachment {
  const ext = name.split('.').pop()!.toLowerCase();
  return { id: `att${++attSeq}`, name, size: Math.round(kb * 1024), type: MIME[ext] ?? 'application/octet-stream', preview };
}

interface Spec {
  from: Person;
  to?: Person[];
  cc?: Person[];
  at: number;
  body: string;
  att?: Attachment[];
  status?: MessageStatus;
  scheduledAt?: number;
  noQuote?: boolean;
}

function quoteOf(prev: Message): string {
  return `<div class="mail-quote"><p>On ${formatFullDate(prev.date)}, ${escapeHtml(prev.from.name)} &lt;${prev.from.email}&gt; wrote:</p><blockquote>${stripQuote(prev.body)}</blockquote></div>`;
}

function T(id: string, subject: string, specs: Spec[], o: Partial<Thread> = {}): Thread {
  const messages: Message[] = [];
  specs.forEach((s, i) => {
    const prev = [...messages].reverse().find((m) => m.status !== 'draft');
    const status = s.status ?? (s.from === ME ? 'sent' : 'received');
    const withQuote = i > 0 && prev && !s.noQuote && status !== 'draft';
    messages.push({
      id: `${id}-${i}`,
      threadId: id,
      from: s.from,
      to: s.to ?? [ME],
      cc: s.cc ?? [],
      bcc: [],
      date: s.at,
      body: s.body,
      quote: withQuote ? quoteOf(prev!) : undefined,
      attachments: s.att ?? [],
      status,
      scheduledAt: s.scheduledAt,
    });
  });
  return {
    id,
    subject,
    messages,
    labelIds: [],
    category: 'primary',
    inInbox: true,
    starred: false,
    important: false,
    unread: false,
    trashed: false,
    spam: false,
    ...o,
  };
}

const BRIEF_ISSUES: Array<[string, Array<[string, string]>]> = [
  ['City council approves new waterfront transit line', [['Waterfront line gets the green light', 'The 4.2-mile light rail extension will connect the ferry terminal to downtown by 2029.'], ['Markets close higher on chip rally', 'Semiconductor stocks led a broad rally after strong earnings from two major suppliers.'], ['The quiet comeback of the paper notebook', 'Why a growing number of engineers are going analog for their planning rituals.']]],
  ['Heat wave breaks; cooler week ahead', [['Fog returns to the coast', 'Forecasters expect highs in the low 60s through the weekend.'], ['A new era for public libraries', 'Three branches are piloting 24-hour self-service hours.'], ['Why everyone is talking about small models', 'Compact AI models are quietly powering a new wave of on-device apps.']]],
  ['Housing report: rents flatten for third month', [['Rents flatten again', 'Median one-bedroom rent held steady at $2,980, the third flat month in a row.'], ['The best bakeries you haven’t tried', 'Our food desk visited 31 bakeries so you don’t have to.'], ['Ferries add weekend service', 'Two new weekend routes start next month.']]],
  ['Startups rethink the four-day week', [['The four-day week, one year later', 'We checked in with twelve companies that made the switch.'], ['Transit ridership hits post-2019 high', 'Weekday ridership crossed 80% of pre-pandemic levels.'], ['What to read this weekend', 'Five long reads, from deep-sea mining to the history of typefaces.']]],
  ['Bay Bridge lane closures this weekend', [['Plan ahead: bridge work Saturday', 'Two westbound lanes will close from 10pm Friday to 5am Monday.'], ['A museum for the internet', 'A new exhibit traces 40 years of the web through 300 artifacts.'], ['The science of a perfect nap', 'Researchers say 20 minutes is still the sweet spot.']]],
  ['Local election guide: what’s on your ballot', [['Your ballot, explained', 'Six measures, three races, and what each would actually change.'], ['Record crowds at the harvest fair', 'Organizers counted 140,000 visitors over three days.'], ['Designing for the next billion', 'How product teams are rethinking low-bandwidth experiences.']]],
  ['Storm season outlook released', [['Wetter winter expected', 'Forecasters give 60% odds of above-average rainfall.'], ['Coffee prices climb again', 'A poor harvest is pushing wholesale prices to a 15-year high.'], ['The case for boring technology', 'Engineers explain why they keep choosing proven tools.']]],
];

function briefThreads(now: number): Thread[] {
  const out: Thread[] = [];
  for (let i = 0; i < 20; i++) {
    const at = atTime(now - i * DAY, 6, 5);
    const issue = BRIEF_ISSUES[i % BRIEF_ISSUES.length];
    const date = new Date(at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    out.push(
      T(`brief${i}`, `The Morning Brief: ${issue[0]}`, [
        {
          from: ORGS.brief,
          at: at > now ? now - 2 * HOUR : at,
          body: newsletter({
            name: 'The Morning Brief',
            color: '#c5221f',
            issue: date,
            intro: 'Good morning. Here’s what you need to know today — in about five minutes.',
            stories: issue[1],
          }),
        },
      ], { category: 'updates', unread: i === 0 }),
    );
  }
  return out;
}

const PRS: Array<[number, string, string, string]> = [
  [482, 'Replace legacy date picker with new Calendar primitive', 'merged', 'marcus'],
  [484, 'Onboarding v3: labeled progress bar', 'merged', 'lena'],
  [486, 'Fix focus trap in modal dialogs', 'review', 'marcus'],
  [488, 'Stabilize checkout e2e address autocomplete', 'merged', 'marcus'],
  [489, 'Add analytics events for onboarding steps', 'comment', 'hana'],
  [491, 'Bump design tokens to 3.2.0', 'merged', 'lena'],
  [493, 'CI failed: main (lint)', 'ci', 'marcus'],
  [494, 'Team invite suggestions (experimental)', 'review', 'lena'],
];

function hubstackThreads(now: number): Thread[] {
  return PRS.map(([num, title, kind, who], i) => {
    const author = PEOPLE[who as keyof typeof PEOPLE];
    const at = now - (i * 2.3 + 0.6) * DAY - (i % 3) * HOUR;
    const lines =
      kind === 'merged'
        ? [`<b>${author.name}</b> merged 1 commit into <code>main</code> from <code>${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)}</code>.`, '✓ All checks have passed · 14 files changed, +412 −268']
        : kind === 'review'
          ? [`<b>${author.name}</b> requested your review on this pull request.`, 'Reviewers: you, Priya Natarajan · Labels: <code>needs-design</code>']
          : kind === 'ci'
            ? ['Run #5821 failed on <code>main</code> after 3m 12s.', '✗ lint — 2 errors in <code>src/features/settings/Form.tsx</code>']
            : [`<b>${author.name}</b> commented: “Can we fire <code>onboarding_step_viewed</code> on mount instead of on first interaction? Otherwise we’ll undercount skips.”`];
    return T(`hub${num}`, kind === 'ci' ? `[lumenlabs/web] Run failed: CI - main (${title.includes('lint') ? 'a3f91c2' : 'b2c1'})` : `[lumenlabs/web] ${title} (PR #${num})`, [
      { from: { name: kind === 'ci' ? 'Hubstack' : `${author.name} (Hubstack)`, email: ORGS.hubstack.email }, at, body: notice({ brand: 'Hubstack', color: '#24292f', title: kind === 'ci' ? 'CI - main: Some jobs were not successful' : `#${num} ${title}`, lines, cta: kind === 'ci' ? 'View workflow run' : 'View pull request', meta: 'You are receiving this because you were mentioned or requested for review. Reply to this email directly or view it on Hubstack.' }) },
    ], { category: 'updates', unread: i < 2 });
  });
}

export function buildSeed(now = Date.now()): { threads: Thread[]; labels: Label[]; contacts: Contact[]; incoming: IncomingItem[] } {
  const P = PEOPLE;
  const O = ORGS;
  const ago = (ms: number) => now - ms;
  attSeq = 0;

  const threads: Thread[] = [
    T('roadmap', 'Q4 roadmap review — final draft', [
      {
        from: P.priya,
        to: [ME, P.marcus, P.hana],
        at: ago(DAY + 3 * HOUR),
        body: p(
          'Hi all,',
          'Attaching the final draft of the Q4 roadmap ahead of Thursday’s review. The big changes since v2:',
          ol('Analytics milestone moved to November so it lands after the SOC 2 audit', 'Mobile parity split into two phases (core flows first, settings later)', 'Two weeks of buffer added across all teams for audit prep'),
          'Please leave comments directly in the doc by end of day Wednesday. Alex — could you sanity-check the design capacity numbers on tab 3 of the capacity plan?',
          'Thanks!',
        ) + sig('Priya'),
        att: [file('Q4-Roadmap-v3.pdf', 2460), file('Capacity-plan.xlsx', 184)],
      },
      {
        from: P.marcus,
        to: [P.priya, ME, P.hana],
        at: ago(DAY + HOUR),
        body: p('Looks solid overall. One flag: mobile phase 1 assumes the new API gateway is live by Oct 20, but platform said Oct 27 at the earliest. Might be worth another week of slack there.', '— M'),
      },
      {
        from: ME,
        to: [P.priya, P.marcus, P.hana],
        at: ago(20 * HOUR),
        body: p(
          'Checked tab 3. Design capacity is tight but workable if we pause the illustration refresh until January.',
          'I’d also like to reserve ~20% of Lena’s time for onboarding v3 follow-ups — early numbers look great and there’s a long tail of polish. I updated the sheet with those assumptions (cells highlighted in yellow).',
        ) + sig('Alex'),
      },
      {
        from: P.priya,
        to: [ME, P.marcus, P.hana],
        at: ago(2 * HOUR + 14 * MIN),
        body: p(
          'Thanks both — super helpful.',
          'Marcus: I’ll push mobile phase 1 by a week. Alex: pausing the illustration refresh is fine by me; let’s call it out explicitly in the review so Jordan isn’t surprised.',
          'Final version goes out tomorrow morning.',
        ) + sig('Priya'),
      },
    ], { labelIds: ['work'], important: true, starred: true, unread: true }),

    T('allhands', 'All-hands moved to Thursday 4pm', [
      {
        from: P.jordan,
        to: [P.team],
        at: ago(47 * MIN),
        body: p(
          'Hey team —',
          'Quick heads up: we’re moving this week’s all-hands to <b>Thursday at 4pm</b> so we can include the Q4 roadmap walkthrough.',
          'Agenda:',
          ul('Q3 retro (10 min)', 'Q4 roadmap — Priya (20 min)', 'Onboarding v3 results — Lena &amp; Alex (10 min)', 'Open AMA'),
          'Snacks from the usual bakery. 🥐 See you there.',
        ) + sig('Jordan'),
      },
    ], { labelIds: ['work'], important: true, unread: true }),

    T('onboarding', 'Onboarding v3 — design review notes', [
      {
        from: P.lena,
        to: [ME],
        cc: [P.hana],
        at: ago(2 * DAY + 5 * HOUR),
        body: p(
          'Hey Alex,',
          'Here are my notes from yesterday’s review plus the updated screens. Main changes:',
          ul('Collapsed steps 2 and 3 into a single “Connect your data” step', 'Replaced the progress dots with a labeled progress bar', 'Added a skip link for teammates invited by an admin'),
          'Would love your eyes on the empty state for the team invite step — it still feels a little sad.',
        ) + sig('Lena'),
        att: [file('onboarding-step-1.png', 842, 'ui1'), file('onboarding-step-2.png', 910, 'ui2'), file('onboarding-step-3.png', 875, 'ui3')],
      },
      {
        from: ME,
        to: [P.lena],
        cc: [P.hana],
        at: ago(2 * DAY + 2 * HOUR),
        body: p(
          'These are great. The labeled progress bar is a big improvement.',
          'For the invite empty state: what if we suggest the three most active people from their calendar domain? We did something similar in the workspace switcher and it tested well.',
          'Minor: the “Connect your data” CTA could just say “Connect” — the verb is doing the work.',
        ),
      },
      {
        from: P.lena,
        to: [ME],
        cc: [P.hana],
        at: ago(DAY + 22 * HOUR),
        body: p('Love the suggestions idea — mocking it up today. Agree on the CTA. I’ll share an updated prototype before Thursday.', 'L'),
      },
    ], { labelIds: ['work', 'design'] }),

    T('lisbon', 'Lisbon in November?? 🇵🇹', [
      {
        from: P.sam,
        to: [ME, P.theo],
        at: ago(3 * DAY + 4 * HOUR),
        body: p('Okay hear me out: <b>Lisbon, Nov 19–23</b>.', 'Flights are weirdly cheap right now, Theo found a place in Alfama with a rooftop, and I need pastéis de nata in my life. Who’s in?'),
      },
      {
        from: P.theo,
        to: [P.sam, ME],
        at: ago(3 * DAY + 3 * HOUR),
        body: p('IN. The Alfama place is $142/night split three ways. There’s also a fado bar two blocks away that my cousin swears by.'),
      },
      {
        from: ME,
        to: [P.sam, P.theo],
        at: ago(3 * DAY + HOUR),
        body: p('I’m in if we can do Nov 19–24 — my PTO starts the 18th anyway. Can we squeeze in a day trip to Sintra?'),
      },
      {
        from: P.sam,
        to: [ME, P.theo],
        at: ago(2 * DAY + 6 * HOUR),
        body: p('Sintra is non-negotiable. Booking the apartment tonight unless someone objects 🙌'),
      },
      {
        from: P.theo,
        to: [P.sam, ME],
        at: ago(3 * HOUR + 8 * MIN),
        body: p('Booked! Confirmation attached.', 'Now we just need flights — Alex, you’re the points person. Any magic left on your card?'),
        att: [file('Alfama-booking-confirmation.pdf', 312)],
      },
    ], { labelIds: ['personal', 'travel'], starred: true, unread: true }),

    T('thanksgiving', 'Thanksgiving plans + photos from the lake', [
      {
        from: P.mom,
        to: [ME],
        cc: [P.sofia],
        at: ago(DAY + 6 * HOUR),
        body: p(
          'Hi sweetheart,',
          'Dad and I finally went through the photos from the lake weekend — attaching a few favorites. The sunset one is going on the fridge!',
          'Also, we’re thinking of doing Thanksgiving here this year. Sofia is coming Wednesday night. Can you let me know if you’re flying in or driving? Dad wants to know how big of a turkey to get (he says “big”).',
          'Love you,<br>Mom',
        ),
        att: [file('lake-sunset.jpg', 3140, 'sunset'), file('dock-morning.jpg', 2810, 'lake'), file('trail-walk.jpg', 2630, 'forest')],
      },
    ], { labelIds: ['family'], starred: true }),

    T('skyway', 'Your trip confirmation: SFO → SEA · K7Q2XM', [
      {
        from: O.skyway,
        at: ago(5 * HOUR + 20 * MIN),
        body: itinerary({ code: 'K7Q2XM', from: ['SFO', 'San Francisco'], to: ['SEA', 'Seattle'], date: 'Wed, Oct 14', depart: '7:40 AM', arrive: '9:52 AM', flight: 'SK 1182', seat: '14C' }),
        att: [file('e-ticket-K7Q2XM.pdf', 188)],
      },
    ], { labelIds: ['travel'], unread: true }),

    T('invoice', 'Invoice #2291 — illustration set (final)', [
      {
        from: P.diego,
        at: ago(4 * DAY + 2 * HOUR),
        body: p(
          'Hi Alex,',
          'Attached is the final invoice for the onboarding illustration set (12 spot illustrations + 3 hero images). Source files are zipped up as well, and mirrored in the shared folder.',
          'Payment terms are net 15 as usual. It was a pleasure — the team’s feedback made these so much better.',
        ) + sig('Diego Alvarez', 'Alvarez Studio · Illustration &amp; Motion'),
        att: [file('Invoice-2291-Lumen-Labs.pdf', 96), file('illustrations-final.zip', 24_600)],
      },
      {
        from: P.diego,
        at: ago(DAY + 4 * HOUR),
        body: p('Just a gentle nudge on this one — no rush if it’s already in the queue!', 'D'),
      },
      {
        from: ME,
        to: [P.diego],
        at: ago(31 * MIN),
        status: 'draft',
        body: p('Hi Diego — so sorry for the delay! It’s approved and going out with Friday’s payment run.', 'Thank you again, these are beautiful.'),
      },
    ], { labelIds: ['work', 'finance'] }),

    T('flaky', 'Flaky e2e tests on checkout', [
      {
        from: ME,
        to: [P.marcus],
        at: ago(6 * DAY + 3 * HOUR),
        body: p('Hey Marcus — the checkout e2e suite failed 4 of the last 10 runs on main. Is this the payments mock again or something new?'),
      },
      {
        from: P.marcus,
        to: [ME],
        at: ago(5 * DAY + 20 * HOUR),
        body:
          p('New one. The address autocomplete now debounces at 300ms and the test types faster than that. The fix is to wait for the listbox instead of a fixed timeout:') +
          `<pre><code>await page.getByRole('combobox', { name: 'Address' }).fill('1 Market St');
await expect(page.getByRole('listbox')).toBeVisible();
await page.getByRole('option').first().click();</code></pre>` +
          p('PR incoming.'),
      },
      {
        from: P.marcus,
        to: [ME],
        at: ago(5 * DAY + 18 * HOUR),
        body: p('Merged in #488. 25 green runs in a row 🟢'),
      },
    ], { labelIds: ['work'] }),

    T('interviews', 'Customer interview synthesis (7 calls)', [
      {
        from: P.hana,
        to: [ME],
        cc: [P.lena],
        at: ago(8 * HOUR),
        body: p(
          'Hi Alex,',
          'Synthesis from last week’s seven customer calls is attached. Top themes:',
          ol('<b>Setup anxiety</b> — 5 of 7 admins worried about “breaking something” when connecting data', '<b>Invites stall</b> — teammates who aren’t invited in the first session rarely join', '<b>Reporting</b> — everyone wants a weekly digest they can forward to their boss'),
          'Theme 2 lines up nicely with Lena’s invite-suggestion idea. Happy to walk through the raw notes if useful.',
        ) + sig('Hana'),
        att: [file('Interview-synthesis-Sept.docx', 1240)],
      },
    ], { labelIds: ['work'] }),

    T('lease', 'Lease renewal for Unit 4B', [
      {
        from: P.nora,
        at: ago(2 * DAY + HOUR),
        body: p(
          'Hi Alex,',
          'Your lease for Unit 4B ends on December 31. I’m happy to offer either a 12-month renewal at $3,150/month (a 3% increase) or month-to-month at $3,400.',
          'The renewal agreement is attached — please let me know which option you prefer by November 15.',
          'Also a heads up: the building will be repainting the stairwells the week of October 12.',
        ) + sig('Best,', 'Nora Lindqvist', 'Lindqvist Properties'),
        att: [file('Lease-Renewal-Unit-4B.pdf', 420)],
      },
    ], { labelIds: ['personal', 'finance'], important: true, unread: true }),

    T('dental', 'Appointment reminder: Tuesday at 3:30 PM', [
      {
        from: O.dental,
        at: ago(DAY + 2 * HOUR),
        body: notice({ brand: 'Bright Smile Dental', color: '#12b5cb', title: 'See you Tuesday, Alex!', lines: ['Cleaning &amp; exam with Dr. Amelia Ortiz', '<b>Tuesday · 3:30 PM</b> · 2150 Mission St, Suite 300', 'Please arrive 10 minutes early. Need to reschedule? Reply to this email or call (415) 555-0187.'], cta: 'Confirm appointment' }),
      },
    ]),

    T('recruiter', 'Staff Product Designer at Atlas Robotics', [
      {
        from: P.olivia,
        at: ago(3 * DAY + 6 * HOUR),
        body: p(
          'Hi Alex,',
          'I came across your talk on onboarding patterns from last year’s Design Systems Summit and loved it. I’m hiring a Staff Product Designer to lead our operator tools — the software that warehouse teams use to supervise our robot fleet.',
          'It’s a small team (4 designers, ~60 engineers), fully remote-friendly, and the problems are genuinely novel. Would you be open to a 20-minute chat next week? No pressure at all.',
        ) + sig('Best,', 'Olivia Park', 'Design Recruiting, Atlas Robotics'),
      },
    ]),

    T('wedding', 'Photos from Maya & Jon’s wedding 📸', [
      {
        from: P.theo,
        to: [ME, P.sam],
        at: ago(6 * DAY + 5 * HOUR),
        body: p('The photographer sent the first batch! Attaching my two favorites. Alex, your toast made Maya’s grandma cry (in a good way).', 'Full gallery link coming once they finish editing.'),
        att: [file('first-dance.jpg', 4210, 'confetti'), file('harbor-ceremony.jpg', 3860, 'harbor')],
      },
    ], { labelIds: ['personal'] }),

    T('boarddeck', 'Board deck feedback', [
      {
        from: P.jordan,
        at: ago(9 * DAY + 4 * HOUR),
        body: p('Alex — can you take a pass at slides 8–12 of the board deck? The product story is there but the visuals are doing us no favors. Anything you can do by Friday would be amazing.') + sig('J'),
        att: [file('Board-Deck-Q3-v4.pptx', 12_800)],
      },
      {
        from: ME,
        to: [P.jordan],
        at: ago(8 * DAY + 2 * HOUR),
        body: p('Done — I rebuilt 8–12 with the new chart styles and simplified the activation funnel into a single story. Also moved the customer quotes up front; they carry the argument better than the numbers do.'),
        att: [file('Board-Deck-Q3-v5-AR.pptx', 13_400)],
      },
      {
        from: P.jordan,
        at: ago(8 * DAY),
        body: p('This is perfect. Thank you! 🙏'),
      },
    ], { labelIds: ['work'], starred: true }),

    T('oneonone', '1:1 agenda for tomorrow', [
      {
        from: P.priya,
        at: ago(DAY + 8 * HOUR),
        body: p('Hey! A few things I’d like to cover tomorrow:', ul('Design ops headcount — where your head is at', 'Lena’s growth plan', 'Your summit talk — anything you need from me?'), 'Add anything you want to talk about.'),
      },
    ], { labelIds: ['work'] }),

    T('coffee', 'Coffee next week?', [
      {
        from: P.ravi,
        at: ago(5 * DAY + 2 * HOUR),
        body: p('Alex! It’s been way too long. I’d love to hear how things are going at Lumen — are you free for coffee next week? I’m around SoMa most mornings.', 'Ravi'),
      },
      {
        from: ME,
        to: [P.ravi],
        at: ago(4 * DAY + 20 * HOUR),
        body: p('Ravi! Yes please. Tuesday at 9 at the place on 2nd St? My treat this time.'),
      },
    ]),

    T('dadgift', 'Birthday gift for Dad — ideas?', [
      {
        from: P.sofia,
        at: ago(7 * DAY + 5 * HOUR),
        body: p('Dad’s birthday is coming up and I have zero ideas. He already has every tool known to humankind. Thoughts??'),
      },
      {
        from: ME,
        to: [P.sofia],
        at: ago(7 * DAY + 3 * HOUR),
        body: p('What about a framed print of the lake photo Mom keeps talking about? Or a cooking class — he’s been obsessed with making paella.'),
      },
      {
        from: P.sofia,
        at: ago(7 * DAY + HOUR),
        body: p('PAELLA CLASS. Genius. I found one in Sonoma for two people so he can take Mom. Split it with me?'),
      },
      {
        from: ME,
        to: [P.sofia],
        at: ago(6 * DAY + 22 * HOUR),
        body: p('Done. Venmo’d you my half. I’ll also schedule a birthday email so it lands first thing in the morning 🎂'),
      },
    ], { labelIds: ['family'] }),

    T('summit', 'Speaker confirmation — Design Systems Summit 2026', [
      {
        from: P.emma,
        at: ago(9 * DAY + 6 * HOUR),
        body: p(
          'Hi Alex,',
          'We’re thrilled to confirm your talk, <b>“Onboarding is a design system problem”</b>, for Design Systems Summit 2026 in Seattle on October 14.',
          'The speaker guide is attached with everything you need: AV specs, rehearsal slots and travel reimbursement details.',
        ) + sig('Warmly,', 'Emma Walsh', 'Program Chair'),
        att: [file('DSS-2026-Speaker-Guide.pdf', 1780)],
      },
      {
        from: ME,
        to: [P.emma],
        at: ago(8 * DAY + 5 * HOUR),
        body: p('Thank you Emma — honored to be part of it! I’ll book travel this week and send a draft deck by early October.'),
      },
      {
        from: P.emma,
        at: ago(2 * DAY + 4 * HOUR),
        body: p('Friendly reminder that final slides are due <b>October 9</b> so our AV team can load them. Looking forward to it!'),
      },
    ], { labelIds: ['work'], important: true }),

    T('kitchen', 'Kitchen remodel quote', [
      {
        from: P.kenji,
        at: ago(12 * DAY + 3 * HOUR),
        body: p('Hi Alex, thanks for having us over. Attached is the detailed quote for Option B (keeping the existing plumbing, new island, quartz counters) and the layout drawing.', 'Total comes to $38,400 with a 6–7 week timeline. We could start as early as mid-November.') + sig('Kenji Mori', 'Mori Build Co.'),
        att: [file('Quote-Rivera-Kitchen-OptionB.pdf', 640), file('kitchen-option-b.png', 1120, 'blueprint')],
      },
      {
        from: ME,
        to: [P.kenji],
        at: ago(11 * DAY + 5 * HOUR),
        body: p('Thanks Kenji, this is really clear. Could you price out the induction cooktop instead of gas? And does the timeline change if we start after the holidays?'),
      },
      {
        from: P.kenji,
        at: ago(10 * DAY + 6 * HOUR),
        body: p('Induction adds about $1,150 (the unit is pricier but we skip the gas line work). Starting January 6 keeps the same 6–7 weeks. Happy to hold that slot for you with a 10% deposit.'),
      },
    ], { labelIds: ['personal', 'finance'] }),

    T('enroll', 'Action required: open enrollment ends Oct 15', [
      {
        from: P.alicia,
        at: ago(2 * DAY + 3 * HOUR),
        body: p('Hi Alex,', 'Open enrollment for 2027 benefits is live and closes <b>October 15</b>. If you don’t make a selection, your current medical plan rolls over but <b>FSA and commuter elections reset to $0</b>.', 'It takes about 10 minutes in the benefits portal. Reply here with any questions!') + sig('Alicia', 'People Operations'),
      },
    ], { labelIds: ['work'], important: true, unread: true }),

    T('itsec', 'New sign-in to your Lumen Labs account', [
      {
        from: O.it,
        at: ago(6 * HOUR + 40 * MIN),
        body: notice({ brand: 'Lumen Labs IT', color: '#0b57d0', title: 'New sign-in on Mac', lines: ['alex.rivera@lumenlabs.io', 'We noticed a new sign-in to your account from a Mac in San Francisco, CA. If this was you, you don’t need to do anything.', 'If not, we’ll help you secure your account.'], cta: 'Check activity', meta: 'You received this email to let you know about important changes to your account.' }),
      },
    ], { category: 'updates' }),

    T('pto', 'PTO request: Nov 18–25', [
      {
        from: ME,
        to: [P.priya],
        at: ago(4 * DAY + 3 * HOUR),
        body: p('Hi Priya — I’d like to take PTO from Nov 18 through Nov 25 (Lisbon + Thanksgiving). Lena will cover design reviews and I’ll make sure onboarding v3 follow-ups are handed off.') + sig('Thanks!', 'Alex'),
      },
      {
        from: P.priya,
        at: ago(4 * DAY + HOUR),
        body: p('Approved! Enjoy Lisbon 🇵🇹 — bring back pastries.'),
      },
    ], { labelIds: ['work'] }),

    T('pairing', 'Pairing session tomorrow?', [
      {
        from: ME,
        to: [P.marcus],
        at: ago(DAY + 5 * HOUR),
        body: p('Want to pair tomorrow afternoon on the invite-suggestions prototype? I can bring the Figma, you bring the API knowledge. 2pm?'),
      },
    ], { inInbox: false }),

    T('slides', 'Slides for the summit (draft v1)', [
      {
        from: ME,
        to: [P.emma],
        at: ago(3 * DAY + 2 * HOUR),
        body: p('Hi Emma,', 'Early draft of my deck attached — about 70% there. Structure is locked; visuals still need love. Any feedback on the flow is very welcome.') + sig('Best,', 'Alex'),
        att: [file('Rivera-DSS-2026-draft.pptx', 18_400)],
      },
    ], { inInbox: false, labelIds: ['work'] }),

    T('bookclub', 'Book club: October pick', [
      { from: P.nadia, to: [ME, P.sam], at: ago(11 * DAY + 2 * HOUR), body: p('Votes are in! October’s pick is <i>The Remains of the Day</i>. We’ll meet at mine on the 24th — I’ll make soup, someone please bring bread.', 'N x') },
    ], { labelIds: ['personal'] }),

    T('mentor', 'Thank you for the portfolio review!', [
      { from: P.jasmine, at: ago(14 * DAY + 4 * HOUR), body: p('Hi Alex,', 'Thank you so much for spending an hour on my portfolio last week. I reworked the case study intro like you suggested (problem → stakes → my role) and it reads SO much better.', 'I got a second-round interview at a fintech startup! Fingers crossed.') + sig('Jasmine') },
    ]),

    T('vet', 'Biscuit is due for his annual vaccines 🐶', [
      { from: O.vet, at: ago(16 * DAY + 3 * HOUR), body: notice({ brand: 'Mission Pet Clinic', color: '#34a853', title: 'Biscuit’s annual check-up is coming up', lines: ['Biscuit is due for DHPP and rabies boosters this month.', 'Book online or call us at (415) 555-0110. We have Saturday slots available!'], cta: 'Book appointment' }), att: [file('biscuit-vaccine-record.pdf', 76)] },
    ], { labelIds: ['personal'] }),

    T('offsite', 'Offsite venue options', [
      { from: P.hana, to: [ME, P.priya, P.lena], at: ago(18 * DAY + 2 * HOUR), body: p('Shortlisted three venues for the January offsite — all within 90 minutes of the city and under budget. My vote is the vineyard in Healdsburg (big room + good wifi + no one will want to leave).') + sig('Hana'), att: [file('offsite-venue-shortlist.pdf', 3320)] },
      { from: P.priya, to: [P.hana, ME, P.lena], at: ago(17 * DAY + 20 * HOUR), body: p('Healdsburg gets my vote too. Alex, Lena — any objections?') },
    ], { labelIds: ['work'] }),

    T('taxes', 'Your 2025 tax documents are ready', [
      { from: O.ledgerly, at: ago(25 * DAY + 3 * HOUR), body: notice({ brand: 'Ledgerly', color: '#188038', title: 'Your documents are ready to download', lines: ['Your 2025 federal and state returns, plus supporting forms, are now available in your Ledgerly vault.', 'For your security, documents are only available after you sign in.'], cta: 'View documents' }) },
    ], { category: 'updates', labelIds: ['finance'] }),

    T('concert', 'Your tickets: The Midnight Palms — Fox Theater', [
      { from: O.tickets, at: ago(20 * DAY + 5 * HOUR), body: notice({ brand: 'Ticketbooth', color: '#a142f4', title: 'You’re going to The Midnight Palms!', lines: ['<b>Fox Theater</b> · Saturday, Nov 7 · Doors 7:00 PM', '2 × General Admission · Order #TB-448120', 'Your mobile tickets are attached. Show them at the door.'] }), att: [file('Midnight-Palms-tickets.pdf', 212)] },
    ], { labelIds: ['personal', 'receipts'] }),

    T('reunion', 'Class of 2016 reunion — save the date', [
      { from: O.alumni, at: ago(30 * DAY + 2 * HOUR), body: notice({ brand: 'Northgate Alumni', color: '#8c1515', title: 'Ten years already?!', lines: ['Join your classmates for the Class of 2016 reunion weekend, June 5–7 on campus.', 'Early registration opens in January.'], cta: 'Save the date' }) },
    ], { category: 'social' }),

    T('recipe', 'The recipe you asked for', [
      { from: P.mom, at: ago(35 * DAY + 4 * HOUR), body: p('Here it is — Grandma’s empanada dough. The secret is the lard (don’t tell your sister I told you).', ul('3 cups flour', '1 tsp salt', '½ cup cold lard or butter', '1 egg + ⅔ cup ice water'), 'Rest it at least an hour. Call me when you make them!', 'Love, Mom') },
    ], { labelIds: ['family'] }),

    T('welcome', 'Welcome to Lumen, Alex!', [
      { from: P.jordan, at: ago(402 * DAY), body: p('Alex —', 'Officially welcome to Lumen Labs! We’re so excited to have you leading product design. Your laptop should arrive Monday; Priya will be your onboarding buddy for the first two weeks.', 'Let’s grab lunch on your first Friday.') + sig('Jordan') },
    ], { labelIds: ['work'], starred: true }),

    // Drafts
    T('d-headcount', 'Proposal: design ops headcount', [
      {
        from: ME,
        to: [P.jordan],
        cc: [P.priya],
        at: ago(DAY + 2 * HOUR),
        status: 'draft',
        body: p('Hi Jordan,', 'Following up on our conversation last week — I’d like to propose adding one design ops role in Q1. Three reasons:', ol('We’re spending ~6 hours/week per designer on tooling and handoff', 'The design system has no dedicated owner', 'Research ops keeps getting deferred, and')),
      },
    ], { inInbox: false }),

    T('d-blog', 'Blog post: what we learned shipping onboarding v3', [
      {
        from: ME,
        to: [],
        at: ago(3 * DAY + 5 * HOUR),
        status: 'draft',
        body: p('<b>Outline</b>', ul('The problem: 38% of new admins never invited a teammate', 'What we tried (and what didn’t work)', 'The labeled progress bar — tiny change, big impact', 'Invite suggestions', 'Results: +18% activation'), 'Draft intro: When we looked at our funnel in June, one number stood out…'),
      },
    ], { inInbox: false }),

    // Scheduled
    T('bday', 'Happy birthday, Dad! 🎂', [
      {
        from: ME,
        to: [P.dad],
        cc: [P.mom, P.sofia],
        at: ago(2 * HOUR),
        status: 'scheduled',
        scheduledAt: atTime(now + 3 * DAY, 8),
        body: p('Happy birthday, Dad!', 'Sofia and I got you and Mom something to get you out of the kitchen for once (well… into a different kitchen). Check your mailbox this week. 🥘', 'Can’t wait to see you at Thanksgiving. Love you!') + sig('Alex'),
      },
    ], { inInbox: false, labelIds: ['family'] }),

    // Snoozed
    T('passport', 'Passport renewal — appointment options', [
      { from: O.citydocs, at: ago(4 * DAY + 7 * HOUR), body: notice({ brand: 'CityDocs Appointments', color: '#1a73e8', title: 'Appointments available for passport renewal', lines: ['We have the following openings at the Civic Center office:', 'Thu 10:15 AM · Fri 1:40 PM · Mon 9:00 AM', 'Bring your current passport, one photo (2×2 in), and form DS-82.'], cta: 'Pick a time' }) },
    ], { snoozedUntil: atTime(now + DAY, 8), labelIds: ['travel'] }),

    T('porto', 'How was your stay in Porto?', [
      { from: O.nestaway, at: ago(20 * DAY), body: promo({ brand: 'Nestaway', color: '#ff5a5f', headline: 'How was Ribeira Riverside Loft?', sub: 'Your host Inês would love to hear about your stay. Reviews help future guests find great places.', cta: 'Write a review' }) },
    ], { snoozedUntil: atTime(now + 5 * DAY, 8) }),

    // Spam
    T('spam1', 'Congratulations!! You’ve been selected for a $1,000 gift card', [
      { from: SPAMMERS.prize, at: ago(9 * HOUR), body: p('<b>CONGRATULATIONS!!!</b>', 'You have been randomly selected to receive a <b>$1,000 gift card</b>. To claim your reward simply confirm your shipping details within 24 HOURS.', '<a href="#">CLAIM MY REWARD NOW</a>') },
    ], { spam: true, inInbox: false, unread: true }),
    T('spam2', 'Urgent: your account will be suspended in 24 hours', [
      { from: SPAMMERS.phish, at: ago(DAY + 11 * HOUR), body: p('Dear Customer,', 'We detected unusual activity on your account. To avoid suspension, verify your identity immediately by entering your password and card details at the link below.', '<a href="#">Verify account</a>', 'Account Services Team') },
    ], { spam: true, inInbox: false }),
    T('spam3', 'Make $4,000/week from home with crypto 🚀🚀', [
      { from: SPAMMERS.crypto, at: ago(3 * DAY + 2 * HOUR), body: p('Our AI trading bot made members an average of $4,000 per week. Limited spots left! Join the VIP group today.') },
    ], { spam: true, inInbox: false, unread: true }),

    // Trash
    T('tr1', 'Webinar: 10 growth hacks for 2026', [
      { from: O.growthcon, at: ago(5 * DAY + 6 * HOUR), body: promo({ brand: 'GrowthCon', color: '#6200ee', headline: '10 growth hacks for 2026', sub: 'Live webinar Thursday at 11am PT. Spots are limited!', cta: 'Save my seat' }) },
    ], { trashed: true, inInbox: false, category: 'promotions' }),
    T('tr2', 'Your Zoomride receipt', [
      { from: O.zoomride, at: ago(7 * DAY + 2 * HOUR), body: notice({ brand: 'Zoomride', color: '#111', title: 'Thanks for riding, Alex', lines: ['Total: <b>$18.42</b>', 'Mission St → SFO Terminal 2 · 21 min', 'Visa •••• 4417'] }) },
    ], { trashed: true, inInbox: false, category: 'updates', labelIds: ['receipts'] }),
    T('tr3', 'Old apartment keys', [
      { from: P.sam, at: ago(9 * DAY + 3 * HOUR), body: p('Found your old apartment keys in my junk drawer lol. Want them back or should I toss?') },
    ], { trashed: true, inInbox: false }),

    // Promotions
    T('pr-northwind', '48 hours only: up to 60% off outdoor gear 🏕️', [
      { from: O.northwind, at: ago(4 * HOUR + 10 * MIN), body: promo({ brand: 'Northwind Outfitters', color: '#1e5631', headline: 'The Fall Clear-Out is ON', sub: 'Up to 60% off tents, packs and insulated layers. 48 hours only — while supplies last.', cta: 'Shop the sale', items: [['Ridgeline 2P Tent', '$189 <s>$379</s>', '#d8e8d2'], ['Summit 40L Pack', '$84 <s>$140</s>', '#e8e0d2'], ['Loft Puffer Jacket', '$99 <s>$220</s>', '#d2dde8']] }) },
    ], { category: 'promotions', unread: true }),
    T('pr-aurora', 'New arrival: Ethiopia Guji — strawberry & jasmine ☕', [
      { from: O.aurora, at: ago(DAY + 3 * HOUR), body: promo({ brand: 'Aurora Coffee Roasters', color: '#f4d35e', dark: true, headline: 'Meet Ethiopia Guji', sub: 'A natural-process coffee bursting with strawberry, jasmine and dark chocolate. Roasted Tuesday, shipped Wednesday.', cta: 'Get a bag — $22', items: [['Guji Natural', '12 oz · $22', '#f7e3c6'], ['Colombia Huila', '12 oz · $19', '#eadbc8'], ['House Espresso', '2 lb · $38', '#d9c5b2']] }) },
    ], { category: 'promotions', unread: true }),
    T('pr-nestaway', 'Weekend getaways under $150/night', [
      { from: O.nestaway, at: ago(2 * DAY + 5 * HOUR), body: promo({ brand: 'Nestaway', color: '#ff5a5f', headline: 'Escape for the weekend', sub: 'Cabins, cottages and coastal hideaways within a 3-hour drive — all under $150/night.', cta: 'Explore stays', items: [['A-frame in Guerneville', '$132/night', '#cfe3d6'], ['Tiny house, Half Moon Bay', '$118/night', '#d6e4f0'], ['Farm loft, Petaluma', '$144/night', '#f0e2cf']] }) },
    ], { category: 'promotions' }),
    T('pr-lumina', 'Still thinking it over? Here’s 15% off 🎧', [
      { from: O.lumina, at: ago(3 * DAY + 4 * HOUR), body: promo({ brand: 'Lumina Audio', color: '#111827', headline: 'Your cart misses you', sub: 'The Lumina Studio Pro headphones are still waiting. Use code <b>COMEBACK15</b> for 15% off through Sunday.', cta: 'Return to cart' }) },
    ], { category: 'promotions' }),
    T('pr-pixelcraft', 'Config 2026: early-bird pricing ends Friday', [
      { from: O.pixelcraft, at: ago(5 * DAY + 2 * HOUR), body: promo({ brand: 'Pixelcraft', color: '#7b61ff', headline: 'Pixelcraft Config 2026', sub: 'Two days of talks, workshops and product launches. Early-bird tickets are 40% off until Friday.', cta: 'Get tickets' }) },
    ], { category: 'promotions' }),
    T('pr-greenleaf', 'This week: honeycrisp apples, sourdough & more', [
      { from: O.greenleaf, at: ago(6 * DAY + 3 * HOUR), body: promo({ brand: 'Greenleaf Market', color: '#2e7d32', headline: 'Fresh this week', sub: 'Honeycrisp apples are back, plus new sourdough from Tartine-trained bakers.', cta: 'See weekly deals', items: [['Honeycrisp apples', '$2.49/lb', '#f8d7cf'], ['Country sourdough', '$7.99', '#f1e3c8'], ['Heirloom squash', '$1.99/lb', '#f6e2b3']] }) },
    ], { category: 'promotions' }),
    T('pr-skyway', 'Fall fare sale: fly from $59 one-way ✈️', [
      { from: O.skyway, at: ago(9 * DAY + 5 * HOUR), body: promo({ brand: 'Skyway Airlines', color: '#0f3057', headline: 'Fall fares from $59', sub: 'Book by Monday for travel through December 15. Seattle, Portland, Denver and more.', cta: 'Find fares' }) },
    ], { category: 'promotions' }),
    T('pr-northwind2', 'New arrivals for fall 🍂', [
      { from: O.northwind, at: ago(12 * DAY + 2 * HOUR), body: promo({ brand: 'Northwind Outfitters', color: '#8b5e34', headline: 'New for fall', sub: 'Flannels, wool socks and the return of the Cascade parka.', cta: 'Shop new arrivals' }) },
    ], { category: 'promotions' }),
    T('pr-greenleaf2', 'Pumpkin season is here 🎃', [
      { from: O.greenleaf, at: ago(13 * DAY + 3 * HOUR), body: promo({ brand: 'Greenleaf Market', color: '#e65100', headline: 'Pumpkin everything', sub: 'Pie pumpkins, spiced cider and the return of our pumpkin bread.', cta: 'Shop seasonal' }) },
    ], { category: 'promotions' }),
    T('pr-lumina2', 'Introducing Lumina Air 2', [
      { from: O.lumina, at: ago(21 * DAY + 5 * HOUR), body: promo({ brand: 'Lumina Audio', color: '#0f172a', headline: 'Lumina Air 2', sub: 'Lighter. Longer battery. Adaptive noise cancelling that actually adapts.', cta: 'Pre-order' }) },
    ], { category: 'promotions' }),

    // Social
    T('so-endorse', 'Priya Natarajan endorsed you for Product Design', [
      { from: O.linkd, at: ago(7 * HOUR + 15 * MIN), body: notice({ brand: 'Linkd', color: '#0a66c2', title: 'Priya Natarajan endorsed you for Product Design', lines: ['Priya is a VP of Engineering at Lumen Labs. You now have 48 endorsements for Product Design.'], cta: 'View profile' }) },
    ], { category: 'social', unread: true }),
    T('so-chirp', 'Lena Fischer and 12 others liked your post', [
      { from: O.chirp, at: ago(10 * HOUR), body: notice({ brand: 'Chirp', color: '#1d9bf0', title: 'Lena Fischer and 12 others liked your post', lines: ['“Hot take: most onboarding flows are just progress bars pretending to be product.”'], cta: 'See activity' }) },
    ], { category: 'social', unread: true }),
    T('so-searches', 'You appeared in 34 searches this week', [
      { from: O.linkd, at: ago(2 * DAY + 7 * HOUR), body: notice({ brand: 'Linkd', color: '#0a66c2', title: 'You appeared in 34 searches this week', lines: ['Top searcher titles: Design Manager, Recruiter, Founder'], cta: 'See all searches' }) },
    ], { category: 'social' }),
    T('so-meetup', 'New event: Design Systems SF — October meetup', [
      { from: O.gatherly, at: ago(3 * DAY + 8 * HOUR), body: notice({ brand: 'Gatherly', color: '#f65858', title: 'Design Systems SF: Tokens at scale', lines: ['Thursday, Oct 22 · 6:30 PM', 'Hosted at Lumen Labs HQ · 84 going'], cta: 'RSVP' }) },
    ], { category: 'social' }),
    T('so-connect', 'Olivia Park wants to connect', [
      { from: O.linkd, at: ago(4 * DAY + 2 * HOUR), body: notice({ brand: 'Linkd', color: '#0a66c2', title: 'Olivia Park wants to connect', lines: ['Design Recruiter at Atlas Robotics · 12 mutual connections'], cta: 'Accept' }) },
    ], { category: 'social' }),
    T('so-trending', 'Trending in Design: #onboarding', [
      { from: O.chirp, at: ago(8 * DAY + 4 * HOUR), body: notice({ brand: 'Chirp', color: '#1d9bf0', title: 'Your post is trending in Design', lines: ['Your thread on onboarding patterns has been viewed 18.2K times.'], cta: 'View analytics' }) },
    ], { category: 'social' }),
    T('so-anniv', 'Congratulate Marcus Chen on 3 years at Lumen Labs', [
      { from: O.linkd, at: ago(15 * DAY + 2 * HOUR), body: notice({ brand: 'Linkd', color: '#0a66c2', title: 'Marcus Chen is celebrating a work anniversary', lines: ['3 years at Lumen Labs'], cta: 'Say congrats' }) },
    ], { category: 'social' }),

    // Updates
    T('up-payflow', 'Your payout of $1,240.00 is on the way', [
      { from: O.payflow, at: ago(2 * DAY + 2 * HOUR), body: notice({ brand: 'Payflow', color: '#635bff', title: '$1,240.00 is on its way to your bank', lines: ['Expected arrival: in 2 business days', 'Bank account •••• 0931 · Payout ID po_1Q8x2L'], cta: 'View payout' }) },
    ], { category: 'updates', labelIds: ['finance'] }),
    T('up-cloudbox', 'You’ve used 92% of your Cloudbox storage', [
      { from: O.cloudbox, at: ago(3 * DAY + HOUR), body: notice({ brand: 'Cloudbox', color: '#0061fe', title: 'You’re almost out of space', lines: ['You’ve used 1.84 TB of 2 TB. When you run out, files will stop syncing.'], cta: 'Manage storage' }) },
    ], { category: 'updates' }),
    T('up-bank', 'Your September statement is ready', [
      { from: O.brightbank, at: ago(DAY + 9 * HOUR), body: notice({ brand: 'Brightbank', color: '#00695c', title: 'Your statement is ready', lines: ['Checking •••• 2291 · Statement period Sep 1 – Sep 30', 'Your statement is attached as a PDF and available in online banking.'] }), att: [file('Brightbank-Statement-Sep.pdf', 244)] },
    ], { category: 'updates', labelIds: ['finance'] }),
    T('up-meetly', 'New event: Portfolio review with Alex Rivera', [
      { from: O.meetly, at: ago(9 * HOUR + 30 * MIN), body: notice({ brand: 'Meetly', color: '#006bff', title: 'Jasmine Wu booked a Portfolio review', lines: ['<b>Friday · 12:00 – 12:45 PM</b>', 'Video call link will be added to the calendar invite.'], cta: 'View event' }) },
    ], { category: 'updates' }),
    T('up-library', 'Your hold is ready for pickup', [
      { from: O.library, at: ago(2 * DAY + 6 * HOUR), body: notice({ brand: 'Bay City Library', color: '#5f6368', title: 'Your hold is ready', lines: ['<i>The Design of Everyday Things</i> (Revised edition)', 'Pick up at Mission Branch by Oct 8.'] }) },
    ], { category: 'updates' }),
    ...[0, 1, 2].map((i) =>
      T(`trackline${i}`, `Your weekly Trackline digest — ${[5, 3, 7][i]} issues need you`, [
        { from: O.trackline, at: atTime(now - (i * 7 + 2) * DAY, 7, 30), body: notice({ brand: 'Trackline', color: '#5e6ad2', title: `${[5, 3, 7][i]} issues assigned to you`, lines: ['LUM-1284 · Invite suggestions empty state · <b>In progress</b>', 'LUM-1279 · Settings form primitives audit · <b>Todo</b>', 'LUM-1266 · Dark mode chart palette · <b>In review</b>'], cta: 'Open Trackline' }) },
      ], { category: 'updates', unread: i === 0 }),
    ),
    ...[0, 1, 2, 3].map((i) =>
      T(`weekly${i}`, `Design Weekly #${212 - i}: ${['Motion that means something', 'The state of design tokens', 'Accessible color, finally', 'Onboarding teardown special'][i]}`, [
        { from: O.weekly, at: atTime(now - (i * 7 + 1) * DAY, 9, 0), body: newsletter({ name: 'Design Weekly', color: '#e8710a', issue: `Issue #${212 - i}`, intro: 'The best design links of the week, hand-picked and annotated.', stories: [['Motion with intent', 'A practical guide to animation that clarifies instead of decorates.'], ['Tokens at scale', 'How three companies manage 4,000+ tokens without losing their minds.'], ['Tool of the week', 'A contrast checker that understands gradients.']] }) },
      ], { category: 'updates' }),
    ),
    ...briefThreads(now),
    ...hubstackThreads(now),
  ];

  const incoming: IncomingItem[] = [
    { thread: T('in-sync', 'Quick sync at 3?', [{ from: P.priya, at: 0, body: p('Do you have 15 minutes at 3 to go over the roadmap comments? Mostly about the analytics milestone and what we tell Jordan.', 'P') }], { labelIds: ['work'], important: true, unread: true }) },
    { thread: T('in-pr497', '[lumenlabs/web] Migrate settings page to form primitives (PR #497)', [{ from: { name: 'Marcus Chen (Hubstack)', email: ORGS.hubstack.email }, at: 0, body: notice({ brand: 'Hubstack', color: '#24292f', title: '#497 Migrate settings page to form primitives', lines: ['<b>Marcus Chen</b> requested your review on this pull request.', '22 files changed, +640 −902'], cta: 'View pull request' }) }], { category: 'updates', unread: true }) },
    {
      mergeInto: 'lisbon',
      thread: T('in-lisbon', '', [{ from: P.sam, to: [ME, P.theo], at: 0, body: p('Found flights!! $612 round trip on Nov 19 direct from SFO, back on the 24th. Alex can you check if your points cover it before I book mine?', '✈️') }]),
    },
    { thread: T('in-aurora', 'Last call: free shipping ends tonight ☕', [{ from: O.aurora, at: 0, body: promo({ brand: 'Aurora Coffee Roasters', color: '#f4d35e', dark: true, headline: 'Free shipping ends tonight', sub: 'Stock up on your favorites before midnight.', cta: 'Shop now' }) }], { category: 'promotions', unread: true }) },
    { thread: T('in-jordan', 'Onboarding v3 numbers 🎉', [{ from: P.jordan, to: [ME, P.lena, P.hana], at: 0, body: p('Just looked at the dashboard — activation is up <b>18% week over week</b> since v3 shipped. Invites per new workspace are up 31%.', 'Incredible work, all of you. Let’s make sure this gets its moment at all-hands.') + sig('J'), att: [file('activation-dashboard.png', 640, 'chart')] }], { labelIds: ['work'], important: true, unread: true }) },
    { thread: T('in-linkd', 'You have 3 new profile views', [{ from: O.linkd, at: 0, body: notice({ brand: 'Linkd', color: '#0a66c2', title: 'You have 3 new profile views', lines: ['Including a Head of Design at a Series B startup.'], cta: 'See who viewed' }) }], { category: 'social', unread: true }) },
  ];

  const contacts: Contact[] = [...Object.values(PEOPLE), ...Object.values(ORGS)];
  return { threads, labels: SEED_LABELS, contacts, incoming };
}

const CANNED: Record<string, string[]> = {
  default: [
    'Thanks, Alex — got it. I’ll take a look and get back to you later today.',
    'Sounds good to me 👍',
    'Perfect, thank you! Let’s go with that.',
    'Appreciate the quick reply. One small question — could we push this to early next week? Otherwise all good.',
    'Great, thanks for the update. Looping back once I’ve had a chance to review properly.',
  ],
  [PEOPLE.mom.email]: ['Thank you sweetheart! Call me this weekend? ❤️<br>Mom', 'Love this. Dad says hi (and asks about the turkey again).<br>Mom'],
  [PEOPLE.sofia.email]: ['haha love it. talk soon!!', 'omg yes. let’s plan it this weekend'],
  [PEOPLE.sam.email]: ['LETS GOOO 🙌', 'haha perfect, I’m in'],
  [PEOPLE.theo.email]: ['Legend. Thanks Alex!', 'Ha, deal. 🍻'],
  [PEOPLE.jordan.email]: ['Great — thanks Alex. Let’s discuss at our next 1:1.', 'Love it. Ship it. 🚀'],
};

export function cannedReply(email: string, seed: number): string {
  const list = CANNED[email.toLowerCase()] ?? CANNED.default;
  const text = list[seed % list.length];
  return `<p>${text}</p>`;
}

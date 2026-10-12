import type { Person } from './types';
import { BOTS, ME, P } from './people';
import { DAY } from './date';
import { att, buildThread, makeClock, promo, receipt } from './seed-kit';
import type { TS } from './seed-kit';

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface PromoSeed {
  who: Person;
  accent: string;
  art: string;
  subjects: [string, string, string?][];
  cta: string;
}

const PROMOS: PromoSeed[] = [
  {
    who: BOTS.trailhead,
    accent: '#2f7d32',
    art: 'sun',
    cta: 'Shop now',
    subjects: [
      ['Last call: 30% off tents and packs', 'Gear up before the first frost. Ends midnight.'],
      ['New arrivals: merino layers for the cold snap', 'Soft, warm, and made to last ten winters.'],
      ['Your trail-ready checklist', 'Ten items people forget, and one they always regret.'],
    ],
  },
  {
    who: BOTS.kettle,
    accent: '#b45f06',
    art: 'food',
    cta: 'Order beans',
    subjects: [
      ['Your subscription ships tomorrow', 'Two bags of Huila are on their way.'],
      ['Meet the roaster: a morning with Marta', 'How a single-origin lot goes from farm to bag.'],
    ],
  },
  {
    who: BOTS.northwind,
    accent: '#0b5cad',
    art: 'city',
    cta: 'See fares',
    subjects: [
      ['Fares from $329: Lisbon, Porto, and Madrid', 'Book by Friday for travel through March.'],
      ['Double miles on weekend flights', 'Fly Saturday or Sunday and earn twice as fast.'],
      ['Your status is expiring soon', 'Two more flights to keep Silver through 2027.'],
    ],
  },
  {
    who: BOTS.linehouse,
    accent: '#7a3e9d',
    art: 'mesh',
    cta: 'Browse the list',
    subjects: [
      ['Five novels to read by the fire', 'Chosen by booksellers, not algorithms.'],
      ['Your October reading list', 'Based on what you read last month.'],
    ],
  },
  {
    who: BOTS.pulse,
    accent: '#ef4444',
    art: 'sun',
    cta: 'Start a session',
    subjects: [
      ['You are 2 workouts away from a new streak', 'Finish this week strong.'],
      ['New: guided trail runs are here', 'Audio coaching for every terrain.'],
    ],
  },
  {
    who: BOTS.loop,
    accent: '#0f766e',
    art: 'waves',
    cta: 'Listen now',
    subjects: [
      ['This week on Loop: the maps that changed the world', 'Plus: why we get lost less and remember less.'],
      ['Loop Weekly: 9 episodes worth your commute', 'Our editors picked the best of the week.'],
    ],
  },
  {
    who: BOTS.frame,
    accent: '#7c4dff',
    art: 'grid',
    cta: 'Read the issue',
    subjects: [
      ['The Weekly Frame #211: Forms that forgive', 'The case for gentler error states.'],
      ['The Weekly Frame #210: Motion with restraint', 'When not to animate.'],
      ['The Weekly Frame #209: Design systems at 10', 'A decade of tokens, lessons, and regrets.'],
      ['The Weekly Frame #208: Dark mode done right', 'Contrast, colour temperature, and OLED reality.'],
    ],
  },
  {
    who: BOTS.wanderly,
    accent: '#e66a00',
    art: 'city',
    cta: 'Explore deals',
    subjects: [
      ['Weekend escapes under $200', 'Quick trips, quiet towns, fair prices.'],
      ['Trending now: Porto in autumn', 'Fewer crowds, warmer wine.'],
    ],
  },
];

const ART_VARIANTS = ['mesh', 'sun', 'city', 'grid', 'waves', 'food', 'product'];

export function fillThreads(now: number) {
  const at = makeClock(now);
  const r = rng(20260930);
  const out: TS[] = [];
  let artSeed = 100;

  // Promotions: a steady drip going back months
  let day = 3;
  for (let i = 0; i < 26; i++) {
    const p = PROMOS[i % PROMOS.length];
    const sub = p.subjects[Math.floor(i / PROMOS.length) % p.subjects.length];
    day += 2 + Math.floor(r() * 7);
    artSeed += 3;
    const variant = ART_VARIANTS.includes(p.art) ? p.art : 'mesh';
    out.push({
      subject: sub[0],
      cat: 'promotions',
      inbox: day < 40,
      msgs: [
        {
          from: p.who,
          at: at(day, Math.floor(r() * 12), Math.floor(r() * 59)),
          unsub: true,
          mailedBy: p.who.email.split('@')[1],
          html: promo({
            brand: p.who.name,
            accent: p.accent,
            headline: sub[0],
            sub: sub[1],
            art: `art:${variant}-${artSeed}-560x240`,
            cta: p.cta,
          }),
        },
      ],
    });
  }

  // Updates: notifications and receipts
  const prNames = [
    'Add offline tile cache eviction',
    'Bump map SDK to 9.2',
    'Empty state illustrations for map tab',
    'Refactor onboarding reducers',
    'Track onboarding_step_completed',
    'Fix keyboard overlap on iOS sheets',
  ];
  prNames.forEach((name, i) => {
    const d = 4 + i * 5 + Math.floor(r() * 3);
    out.push({
      subject: `[brightlane/atlas-app] Pull request #${470 - i * 6}: ${name}`,
      cat: 'updates',
      labels: ['l_work'],
      inbox: d < 25,
      msgs: [
        {
          from: BOTS.stackhouse,
          at: at(d, Math.floor(r() * 10) + 1),
          mailedBy: 'stackhouse.dev',
          html: `<div style="font-size:14px;line-height:1.55"><p><b>${i % 2 ? 'priya-nair' : 'tom-adeyemi'}</b> approved this pull request.</p><div style="border:1px solid #d0d7de;border-radius:8px;padding:12px 16px;background:#f6f8fa;color:#1f2328"><div style="font-weight:600">${name} <span style="color:#6e7781;font-weight:400">#${470 - i * 6}</span></div><div style="margin-top:6px;color:#57606a"><span style="color:#1a7f37;font-weight:600">+${60 + i * 13}</span> <span style="color:#cf222e;font-weight:600">-${8 + i * 5}</span> · ${2 + i} files changed</div></div><p style="margin-top:12px"><a href="https://example.com" style="color:#0969da">View pull request</a></p></div>`,
        },
      ],
    });
  });

  const months = ['August', 'July', 'June', 'May', 'April', 'March'];
  months.forEach((m, i) => {
    const d = 38 + i * 30;
    out.push({
      subject: `Your invoice for ${m} is available`,
      cat: 'updates',
      labels: ['l_receipts', 'l_finance'],
      inbox: false,
      msgs: [
        {
          from: BOTS.nimbus,
          at: at(d, 8),
          mailedBy: 'nimbuscloud.com',
          html: receipt({
            brand: 'Nimbus Cloud',
            accent: '#2563eb',
            title: `Invoice NC-2026-${String(9 - (i + 1)).padStart(2, '0')}-${1090 - i * 11}`,
            lines: [
              ['Compute (4 instances)', `$${(212.4 - i * 3).toFixed(2)}`],
              ['Managed Postgres', '$96.00'],
              ['Object storage', `$${(38.1 + i).toFixed(2)}`],
            ],
            total: ['Total charged', `$${(346.5 - i * 2 + i).toFixed(2)}`],
          }),
        },
      ],
    });
  });

  const cardEvents: [string, string, number][] = [
    ['Your card ending 1129 was used at Casa Bruna', '$86.40 · Yesterday', 9],
    ['Card alert: online purchase at Wanderly', '€842.60 · Sep 27', 3],
    ['Your statement for August is ready', 'Sign in to view your statement.', 34],
    ['Payment received: thank you', 'We received your payment of $1,204.10.', 22],
  ];
  cardEvents.forEach(([subject, line, d]) => {
    out.push({
      subject,
      cat: 'updates',
      labels: ['l_finance'],
      inbox: d < 20,
      msgs: [
        {
          from: BOTS.orbit,
          at: at(d, 5),
          mailedBy: 'orbitbank.com',
          html: receipt({ brand: 'Orbit Bank', accent: '#0b7a5b', title: subject, lines: [['Details', line]], total: ['Account', 'Checking ••4821'] }),
        },
      ],
    });
  });

  out.push({
    subject: 'Your electricity bill for September',
    cat: 'updates',
    labels: ['l_finance', 'l_personal'],
    inbox: true,
    msgs: [
      {
        from: BOTS.meridian,
        at: at(8, 6),
        mailedBy: 'meridianenergy.co',
        html: receipt({
          brand: 'Meridian Energy',
          accent: '#f59e0b',
          title: 'Bill ready: due Oct 14',
          lines: [
            ['Usage · 312 kWh', '$58.20'],
            ['Delivery charge', '$21.85'],
            ['Taxes and fees', '$6.40'],
          ],
          total: ['Amount due', '$86.45'],
          note: 'AutoPay is on. Your account will be debited on Oct 14.',
        }),
      },
    ],
  });

  out.push({
    subject: 'Cadence: invitation to "Atlas weekly sync"',
    cat: 'updates',
    labels: ['l_work'],
    inbox: true,
    msgs: [
      {
        from: BOTS.cadence,
        at: at(5, 9),
        mailedBy: 'cadence.app',
        html: `<div style="max-width:520px;margin:0 auto;background:#fff;color:#1f1f1f;border-radius:12px;border:1px solid #e4e4e4;padding:24px;font-size:14px;line-height:1.6"><div style="color:#0e7490;font-weight:800;letter-spacing:.08em;font-size:13px">CADENCE</div><h2 style="margin:8px 0">Atlas weekly sync</h2><p style="margin:0;color:#555">Every Thursday · 11:30 AM – 12:00 PM<br>Organizer: Tom Adeyemi</p><p style="margin:14px 0 0"><a href="https://example.com" style="color:#0b57d0">Open in Cadence</a></p></div>`,
        invite: {
          title: 'Atlas weekly sync',
          start: now + 1 * DAY + 3 * 3600_000,
          end: now + 1 * DAY + 3.5 * 3600_000,
          where: 'Meet · meet.example.com/atlas-sync',
          organizer: P.tom,
          attendees: [ME, P.tom, P.priya, P.marcus],
          rsvp: 'yes',
        },
      },
    ],
  });

  // Social
  const social: [string, string, number][] = [
    ['Kenji Watanabe started following you', 'Follow back to see what Kenji shares.', 6],
    ['You have 3 new connections', 'Hannah Kim, Olivia Grant, and 1 other.', 11],
    ['Your post reached 1,000 views', '"What we learned shipping onboarding in three steps" is trending in Product.', 14],
    ['Priya Nair endorsed you for Product Strategy', 'Say thanks and endorse back.', 20],
    ['Jules Moreau invited you to the group "Weekend Hikers"', '214 members · Active daily', 26],
    ['Sofia Lindqvist mentioned you in a comment', '"@Avery this headline test is exactly what we needed."', 33],
  ];
  social.forEach(([subject, line, d], i) => {
    out.push({
      subject,
      cat: 'social',
      inbox: d < 30,
      msgs: [
        {
          from: BOTS.circle,
          at: at(d, 4 + (i % 5)),
          unsub: true,
          mailedBy: 'circle-social.com',
          html: promo({ brand: 'Circle', accent: '#e0245e', headline: subject, sub: line, cta: 'Open Circle', footer: 'Circle · Manage your email preferences.' }),
        },
      ],
    });
  });

  // Colleague threads
  out.push(
    {
      subject: 'Lunch tomorrow?',
      inbox: true,
      msgs: [
        { from: P.tom, at: at(0, 20), unread: true, body: `Thinking that ramen place around the corner, 12:30? I'll bring the sprint retro notes so we can pretend it's a meeting.` },
      ],
    },
    {
      subject: 'Vacation coverage: Oct 5 to 9',
      labels: ['l_work'],
      inbox: true,
      msgs: [
        { from: P.hannah, to: [ME, P.elena, P.tom], at: at(2, 7), body: `Heads up: I'm out Oct 5–9. Hiring loop logistics are covered by Marta (marta@brightlane.io). For offers and anything urgent, ping Elena.` },
        { from: ME, to: [P.hannah], at: at(2, 5), body: `Enjoy the time off! Anything I should do before you leave for the Marisol loop, or is the scorecard link enough?` },
        { from: P.hannah, to: [ME], at: at(2, 3, 20), body: `The scorecard link is enough. Just fill it in within a day. 🙏` },
      ],
    },
    {
      subject: 'Feedback on onboarding v2 (Figma link inside)',
      labels: ['l_work', 'l_atlas'],
      inbox: false,
      msgs: [
        {
          from: ME,
          to: [P.priya],
          at: at(16, 4),
          body: `Priya, went through v2 end to end. Notes:\n\n- Step 2 chips feel great, but the "Continue" button hides under the keyboard on smaller phones\n- The illustration on step 1 is lovely but heavy; can we get an SVG version?\n- Consider a progress indicator that isn't "1/3". Maybe just dots.\n\nOverall this is the best it has looked. Let's ship a v3 with those changes.`,
        },
        { from: P.priya, to: [ME], at: at(16, 1), body: `Love this. Dots, SVG, and the keyboard fix. On it. I'll have v3 by the end of next week.` },
      ],
    },
    {
      subject: 'Atlas featured in Design Weekly',
      labels: ['l_work'],
      inbox: true,
      msgs: [
        {
          from: P.sofia,
          to: [ME, P.elena, P.priya],
          at: at(9, 3),
          body: `Team! Design Weekly ran a piece on Atlas onboarding. They quoted Priya's line about "asking for permission like a friend, not a bouncer." Link's below.\n\nhttps://example.com/design-weekly/atlas`,
          star: true,
        },
      ],
    },
    {
      subject: 'Expense policy update (effective Oct 1)',
      labels: ['l_finance'],
      inbox: true,
      msgs: [
        {
          from: P.diego,
          to: [ME, P.elena, P.marcus, P.priya, P.tom, P.sofia, P.hannah],
          at: at(10, 6),
          body: `Hi everyone,\n\nFrom Oct 1 we're changing how expenses are submitted:\n\n1. All receipts must be uploaded within 14 days\n2. Travel bookings go through Wanderly for Business\n3. Meals abroad are capped at €60 per day\n\nQuestions? Reply here or find me on Slack.`,
        },
      ],
    },
    {
      subject: 'Kickoff notes: Atlas phase 1',
      labels: ['l_atlas', 'l_work'],
      inbox: false,
      msgs: [
        {
          from: P.kenji,
          to: [ME, P.elena],
          at: at(96, 5),
          body: `Thanks all for the productive kickoff. Summary of what we agreed:\n\n- Phase 1 scope: onboarding, map, saved places\n- Weekly sync on Thursdays\n- Design reviews on the first Tuesday of the month\n\nLooking forward to working together.`,
        },
        { from: ME, to: [P.kenji], cc: [P.elena], at: at(96, 2), body: `Thank you Kenji, the summary matches our notes. We'll share the workplan this week.` },
      ],
    },
    {
      subject: 'Architecture review: map tile cache',
      labels: ['l_work', 'l_atlas'],
      inbox: false,
      msgs: [
        {
          from: P.marcus,
          to: [ME, P.tom],
          at: at(45, 4),
          body: `Proposal for offline tiles:\n\n\`\`\`ts\ninterface TileCache {\n  maxBytes: number;\n  evict(policy: 'lru' | 'distance'): Promise<number>;\n}\n\`\`\`\n\nI prefer LRU for phase 1. Distance-based eviction is nicer but needs the location permission upfront. Thoughts?`,
        },
        { from: ME, to: [P.marcus, P.tom], at: at(45, 1), body: `LRU for now, agreed. Let's not couple the cache to a permission we're trying to defer.` },
      ],
    },
    {
      subject: 'Photos from the summer offsite',
      labels: ['l_work'],
      inbox: false,
      msgs: [
        {
          from: P.priya,
          to: [ME, P.marcus, P.tom, P.sofia, P.elena],
          at: at(58, 3),
          body: `Finally sorted the offsite photos. Marcus is in exactly zero of them because he was "carrying the tripod." 😅`,
          att: [att('offsite-group.jpg', 4210, { art: 71 }), att('offsite-beach.jpg', 3880, { art: 72 }), att('offsite-dinner.jpg', 3010, { art: 73 })],
        },
      ],
    },
    {
      subject: 'Happy birthday, sweetheart!',
      labels: ['l_family'],
      inbox: false,
      msgs: [
        {
          from: P.grace,
          to: [ME],
          at: at(190, 8),
          star: true,
          body: `Happy birthday, my love! I hope the day is full of cake and no spreadsheets. Dad and I are so proud of you. Card in the post (it will be late, as always).\n\nMum xx`,
          att: [att('birthday-card.png', 820, { art: 81 })],
        },
        { from: ME, to: [P.grace], at: at(190, 4), body: `Thank you Mum! Cake, yes. Spreadsheets, sadly also yes. Love you both. x` },
      ],
    },
    {
      subject: 'Q3 numbers: retention up, activation flat',
      labels: ['l_work', 'l_finance'],
      inbox: false,
      msgs: [
        {
          from: P.elena,
          to: [ME, P.diego],
          at: at(72, 6),
          body: `Preliminary Q3:\n\n- Revenue +11% QoQ\n- Retention (90 day) 64% → 68%\n- Activation flat at 39%\n\nActivation is where the leverage is. Avery, I'd like the onboarding work to be the headline of the product update.`,
          att: [att('Q3-metrics.xlsx', 96, { title: 'Q3 metrics', lines: ['Revenue', 'Retention', 'Activation', 'NPS'] })],
        },
      ],
    },
  );

  // Sent-only
  const sent: TS[] = [
    {
      subject: 'Friday dinner?',
      msgs: [{ from: ME, to: [P.nico], at: at(1, 22), body: `Booking Casa Bruna for Friday at 8. That okay? I'll get the corner table if they have it.` }],
    },
    {
      subject: 'Expense report: September',
      labels: ['l_finance'],
      msgs: [
        {
          from: ME,
          to: [P.diego],
          at: at(3, 3),
          body: `Diego, attached is my September expense report. The two taxi receipts are missing because I lost them, so I've added a signed note.`,
          att: [att('Expenses-Sep-2026.xlsx', 58, { title: 'Expenses · September 2026', lines: ['Taxis', 'Meals', 'Software', 'Books'] })],
        },
      ],
    },
    {
      subject: '1:1 agenda for Thursday',
      msgs: [
        {
          from: ME,
          to: [P.tom],
          at: at(5, 2),
          body: `Tom, agenda for Thursday:\n\n1. Sprint 42 risks\n2. Hiring loop debrief\n3. Your growth plan (what stretch do you want for Q4?)\n4. Anything you want to raise`,
        },
      ],
    },
    {
      subject: 'Thursday call about the MSA',
      labels: ['l_legal'],
      msgs: [
        {
          from: ME,
          to: [P.rachel],
          cc: [P.elena],
          at: at(5, 20),
          body: `Rachel, Thursday at 3 PM works. Could you send a dial-in? I'd like to focus on §7.2 and §11 first.\n\nThanks,\nAvery`,
        },
      ],
    },
    {
      subject: 'Intro: Priya and Kenji (design review cadence)',
      labels: ['l_atlas'],
      msgs: [
        {
          from: ME,
          to: [P.priya, P.kenji],
          at: at(20, 4),
          body: `Priya, Kenji, I'd like to connect you both directly. Kenji leads digital at Tidepool, and Priya leads design on Atlas. I'd suggest a monthly design review so you can give and get feedback without going through me.\n\nI'll leave you to find a time.`,
        },
      ],
    },
    {
      subject: 'Booking enquiry: 4 nights in October',
      labels: ['l_travel'],
      msgs: [
        {
          from: ME,
          to: [P.ines],
          at: at(12, 5),
          body: `Olá Inês, do you have a room for 4 nights from Oct 13? A quiet one would be perfect. Late arrival is possible.\n\nObrigado,\nAvery Quinn`,
        },
      ],
    },
    {
      subject: 'Deploy freeze dates for the offsite',
      labels: ['l_work'],
      msgs: [
        {
          from: ME,
          to: [P.marcus],
          cc: [P.tom],
          at: at(4, 8),
          body: `Marcus, let's freeze deploys Oct 13 to 18 while most of us are in Lisbon. Is that fine on your side? On-call rotation can shift to whoever stays home.`,
        },
      ],
    },
    {
      subject: 'The bread!',
      labels: ['l_family'],
      msgs: [
        {
          from: ME,
          to: [P.grace],
          at: at(9, 10),
          body: `Mum, you'll be proud. Sourdough attempt number 4.`,
          att: [att('sourdough.jpg', 2480, { art: 91 })],
        },
      ],
    },
  ];
  out.push(...sent);

  // Spam
  out.push(
    {
      subject: 'Congratulations! You have been selected: claim your $500 gift card',
      spam: true,
      inbox: false,
      msgs: [
        {
          from: { name: 'Rewards Desk', email: 'claim@rewards-center.win' },
          at: at(0, 9),
          unread: true,
          body: `Dear Valued Customer,\n\nYou have been randomly selected to receive a **$500 gift card**. Click below within 24 hours to claim your reward!\n\n[CLAIM NOW](https://example.com)`,
        },
      ],
    },
    {
      subject: 'Your mailbox is almost full. Verify now to avoid suspension',
      spam: true,
      inbox: false,
      msgs: [
        {
          from: { name: 'Mail Admin', email: 'admin@mailbox-verify.top' },
          at: at(2, 2),
          body: `Your mailbox has reached 98% of its quota. To avoid losing incoming mail, verify your account.\n\n[Verify my account](https://example.com)`,
        },
      ],
    },
    {
      subject: 'Urgent business proposal (confidential)',
      spam: true,
      inbox: false,
      msgs: [
        {
          from: { name: 'Dr. Emeka Obi', email: 'emeka.obi.legal@consultants-hq.biz' },
          at: at(6, 14),
          body: `Dear friend,\n\nI am a barrister representing the estate of a late client with an unclaimed fund of $12.4 million. I seek a trusted partner. You will receive 30%.\n\nRespond with your full name and phone number.`,
        },
      ],
    },
  );

  // Trash
  out.push(
    {
      subject: 'Re: lunch?',
      trashed: true,
      inbox: false,
      msgs: [
        { from: P.jules, at: at(25, 4), body: `Are we still on for Thursday?` },
        { from: ME, at: at(25, 2), to: [P.jules], body: `Yes! Same spot.` },
      ],
    },
    {
      subject: 'Flash sale ends tonight: 50% off everything',
      cat: 'promotions',
      trashed: true,
      inbox: false,
      msgs: [
        {
          from: BOTS.trailhead,
          at: at(18, 6),
          unsub: true,
          html: promo({ brand: 'Trailhead', accent: '#2f7d32', headline: 'Flash sale ends tonight', sub: '50% off everything. Really.', cta: 'Shop now' }),
        },
      ],
    },
    {
      subject: 'Test message',
      trashed: true,
      inbox: false,
      msgs: [{ from: ME, to: [ME], at: at(40, 3), body: `test` }],
    },
  );

  return { threads: out.map(buildThread) };
}

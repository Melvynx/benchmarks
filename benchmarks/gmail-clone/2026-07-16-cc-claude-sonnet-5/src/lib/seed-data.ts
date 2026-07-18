import type {
  Attachment,
  AttachmentKind,
  Contact,
  Label,
  Message,
  Thread,
  ThreadCategory,
} from "./types";

export const ME: Contact = { name: "Melvyn", email: "melvynmal@gmail.com" };

const NOW = Date.now();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function ago(amount: number, unit: "m" | "h" | "d"): string {
  const ms = unit === "m" ? amount * MIN : unit === "h" ? amount * HOUR : amount * DAY;
  return new Date(NOW - ms).toISOString();
}

function future(days: number): string {
  return new Date(NOW + days * DAY).toISOString();
}

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}

function html(paragraphs: string[]): string {
  return paragraphs.map((p) => `<p>${p}</p>`).join("");
}

function snippetFrom(bodyHtml: string): string {
  const text = bodyHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

function att(name: string, kind: AttachmentKind, sizeKb: number): Attachment {
  return { id: nextId("att"), name, kind, sizeKb };
}

// --- Contacts -------------------------------------------------------------

const sarah: Contact = { name: "Sarah Chen", email: "sarah.chen@northwind.io" };
const marcus: Contact = { name: "Marcus Webb", email: "marcus.webb@northwind.io" };
const priya: Contact = { name: "Priya Patel", email: "priya.patel@northwind.io" };
const david: Contact = { name: "David Kim", email: "david.kim@northwind.io" };
const legal: Contact = { name: "Northwind Legal", email: "legal@northwind.io" };
const hr: Contact = { name: "Northwind People Ops", email: "people@northwind.io" };
const camille: Contact = { name: "Camille Rousseau", email: "camille.rousseau@gmail.com" };
const thomas: Contact = { name: "Thomas Bernard", email: "thomas.bernard@gmail.com" };
const noor: Contact = { name: "Noor Haddad", email: "noor.haddad@gmail.com" };
const landlord: Contact = { name: "Élan Property Management", email: "office@elanproperties.com" };

const linear: Contact = { name: "Linear", email: "notifications@linear.app" };
const github: Contact = { name: "GitHub", email: "notifications@github.com" };
const vercel: Contact = { name: "Vercel", email: "notify@vercel.com" };
const stripe: Contact = { name: "Stripe", email: "receipts@stripe.com" };
const figma: Contact = { name: "Figma", email: "team@figma.com" };
const notion: Contact = { name: "Notion", email: "updates@notion.so" };
const notBoring: Contact = { name: "Packy McCormick", email: "packy@notboring.co" };
const morningBrew: Contact = { name: "Morning Brew", email: "crew@morningbrew.com" };
const tldr: Contact = { name: "TLDR Newsletter", email: "dan@tldrnewsletter.com" };

const linkedin: Contact = { name: "LinkedIn", email: "notifications@linkedin.com" };
const xDotCom: Contact = { name: "X", email: "info@x.com" };
const instagram: Contact = { name: "Instagram", email: "no-reply@mail.instagram.com" };
const medium: Contact = { name: "Medium Daily Digest", email: "noreply@medium.com" };

const nike: Contact = { name: "Nike", email: "nike@promotions.nike.com" };
const airbnb: Contact = { name: "Airbnb", email: "no-reply@airbnb.com" };
const spotify: Contact = { name: "Spotify", email: "no-reply@spotify.com" };
const amazon: Contact = { name: "Amazon", email: "shipment-tracking@amazon.com" };
const booking: Contact = { name: "Booking.com", email: "customer.service@booking.com" };
const uber: Contact = { name: "Uber Receipts", email: "receipts@uber.com" };
const amex: Contact = { name: "American Express", email: "no.reply@americanexpress.com" };

const hnDigest: Contact = { name: "Hacker News Digest", email: "digest@hn.algolia.com" };
const reddit: Contact = { name: "Reddit", email: "noreply@redditmail.com" };
const indieHackers: Contact = { name: "Indie Hackers", email: "community@indiehackers.com" };

const lottery: Contact = { name: "International Lottery Commission", email: "claim@intl-lottery-prize.info" };
const cryptoAlert: Contact = { name: "Crypto Wealth Now", email: "alerts@crypto-wealth-now.biz" };
const phishing: Contact = { name: "IT Security Team", email: "security-alert@mail-verify-portal.com" };
const pharmacy: Contact = { name: "Global Pharmacy Direct", email: "offers@pharma-savings-now.ru" };
const inheritance: Contact = { name: "Barrister J. Okonkwo", email: "j.okonkwo@legal-claims-intl.com" };

// --- Labels ----------------------------------------------------------------

export const CUSTOM_LABELS: Label[] = [
  { id: "label:work", name: "Work", color: "#dbe7fd", textColor: "#1a56b0" },
  { id: "label:personal", name: "Personal", color: "#d9f2e3", textColor: "#146c43" },
  { id: "label:finance", name: "Finance", color: "#ece3fb", textColor: "#6b3fa0" },
  { id: "label:travel", name: "Travel", color: "#d7f3f5", textColor: "#0f7a8c" },
  { id: "label:receipts", name: "Receipts", color: "#fdf0d5", textColor: "#a3690a" },
  { id: "label:newsletters", name: "Newsletters", color: "#fbe2ea", textColor: "#a3275f" },
];

type SeedMsg = {
  from: Contact | "me";
  to?: Contact[];
  cc?: Contact[];
  ago: [number, "m" | "h" | "d"];
  body: string[];
  attachments?: Attachment[];
  read?: boolean;
};

type SeedThread = {
  subject: string;
  category: ThreadCategory;
  labels?: string[];
  starred?: boolean;
  important?: boolean;
  snoozedUntil?: string;
  system: Array<"INBOX" | "SENT" | "DRAFT" | "TRASH" | "SPAM">;
  messages: SeedMsg[];
};

const seedThreads: SeedThread[] = [
  // ---------------- Primary / work, multi-message threads ----------------
  {
    subject: "Q3 roadmap review — need your input before Friday",
    category: "primary",
    labels: ["label:work"],
    important: true,
    system: ["INBOX"],
    messages: [
      {
        from: sarah,
        ago: [2, "d"],
        body: [
          "Hey team, I put together a first pass at the Q3 roadmap based on last week's strategy offsite. Doc is linked below — the big swings are the billing rework and the mobile onboarding revamp.",
          "Would love thoughts before we lock scope on Friday. Specifically: does the billing rework timeline look realistic given the Stripe migration?",
        ],
        attachments: [att("Q3-Roadmap-Draft.pdf", "pdf", 842)],
        read: true,
      },
      {
        from: marcus,
        ago: [30, "h"],
        body: [
          "Skimmed it — billing rework at 5 weeks feels tight if we're also migrating off the old invoicing service. I'd budget 7 and keep a 2 week buffer before the Q3 close.",
          "Otherwise the mobile onboarding scope looks right-sized.",
        ],
        read: true,
      },
      {
        from: "me",
        ago: [20, "h"],
        body: [
          "Agreed on the buffer. Sarah — can we push the billing rework start date up a week to compensate? That keeps the Q3 close date intact without compressing QA.",
        ],
        read: true,
      },
      {
        from: sarah,
        ago: [3, "h"],
        body: [
          "Yes, moved it up. Updated doc attached. Can everyone give final thumbs up by end of day tomorrow so I can present this Friday?",
        ],
        attachments: [att("Q3-Roadmap-v2.pdf", "pdf", 891)],
        read: false,
      },
    ],
  },
  {
    subject: "Design review: new inbox density options",
    category: "primary",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: priya,
        ago: [5, "h"],
        body: [
          "Pushed the comfortable / default / compact density variants to Figma. Compact fits ~30% more rows which should help power users.",
          "Curious what you think about the compact row height — I went with 32px but could go tighter.",
        ],
        attachments: [att("inbox-density-specs.fig", "image", 2140)],
        read: false,
      },
      {
        from: "me",
        ago: [1, "h"],
        body: ["32px reads great on my screen. Let's ship it and gather feedback before tightening further."],
        read: true,
      },
    ],
  },
  {
    subject: "Can you review the offer letter for the new hire?",
    category: "primary",
    labels: ["label:work"],
    important: true,
    system: ["INBOX"],
    messages: [
      {
        from: hr,
        ago: [1, "d"],
        body: [
          "Hi Melvyn, we'd like to extend an offer to the senior engineer candidate from last week's onsite. Could you review the attached offer letter before we send it out tomorrow morning?",
          "Let me know if the start date works with your team's onboarding calendar.",
        ],
        attachments: [att("Offer-Letter-Draft.pdf", "pdf", 210)],
        read: false,
      },
    ],
  },
  {
    subject: "Weekend hike — Saturday morning?",
    category: "primary",
    labels: ["label:personal"],
    starred: true,
    system: ["INBOX"],
    messages: [
      {
        from: camille,
        ago: [6, "h"],
        body: [
          "A few of us are doing the ridge trail Saturday at 8am, weather looks perfect. You in? I can grab you on the way if you're still near the old place.",
        ],
        read: true,
      },
      {
        from: "me",
        ago: [4, "h"],
        body: ["Count me in — I'll bring coffee for everyone. Still at the same address, see you at 8."],
        read: true,
      },
      {
        from: camille,
        ago: [2, "h"],
        body: ["Perfect, see you then! Bringing Noor too, she's never done this trail."],
        read: false,
      },
    ],
  },
  {
    subject: "Re: Lease renewal — unit 4B",
    category: "primary",
    labels: ["label:personal"],
    system: ["INBOX"],
    messages: [
      {
        from: landlord,
        ago: [3, "d"],
        body: [
          "Hi Melvyn, your lease for unit 4B is up for renewal on September 1st. We're offering a 12-month renewal at the same rate if you sign by August 15th.",
          "Renewal agreement is attached — let us know if you have questions.",
        ],
        attachments: [att("Lease-Renewal-4B.pdf", "pdf", 156)],
        read: true,
      },
    ],
  },
  {
    subject: "Congrats on the launch!",
    category: "primary",
    system: ["INBOX"],
    messages: [
      {
        from: david,
        ago: [4, "d"],
        body: [
          "Saw the launch went out clean, congrats! Numbers looked strong on the dashboard this morning. Let's grab coffee this week and swap notes.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Flight change confirmation needed",
    category: "primary",
    labels: ["label:travel"],
    important: true,
    system: ["INBOX"],
    messages: [
      {
        from: thomas,
        ago: [8, "h"],
        body: [
          "Just saw our connecting flight got moved up 40 minutes. Can you confirm you can still make the 6:15am airport shuttle? If not I'll book a separate car for you.",
        ],
        read: false,
      },
    ],
  },
  {
    subject: "Feedback on the interview loop",
    category: "primary",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: marcus,
        ago: [9, "h"],
        body: [
          "Left my scorecard for the systems design round — strong signal on distributed systems, a bit light on production debugging stories. Leaning yes overall.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Reminder: annual checkup this Thursday",
    category: "primary",
    system: ["INBOX"],
    messages: [
      {
        from: { name: "Riverside Family Practice", email: "scheduling@riversidefp.example" },
        ago: [1, "d"],
        body: [
          "This is a reminder for your annual checkup on Thursday at 10:30am with Dr. Alvarez. Please arrive 15 minutes early to complete updated intake forms.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Noor's birthday dinner — Friday 8pm",
    category: "primary",
    labels: ["label:personal"],
    starred: true,
    system: ["INBOX"],
    messages: [
      {
        from: noor,
        ago: [1, "d"],
        body: [
          "It's official, I'm turning 30! Dinner Friday at 8pm at Marchetti's, then drinks wherever the night takes us. Bring your appetite.",
        ],
        read: true,
      },
      {
        from: "me",
        ago: [22, "h"],
        body: ["Wouldn't miss it. Happy early birthday — see you Friday!"],
        read: true,
      },
    ],
  },
  {
    subject: "Contract renewal terms attached",
    category: "primary",
    labels: ["label:work", "label:finance"],
    system: ["INBOX"],
    messages: [
      {
        from: legal,
        ago: [2, "d"],
        body: [
          "Attached is the updated vendor contract for the analytics platform renewal. Legal has cleared the terms; we need a signature by end of month to avoid a lapse in service.",
        ],
        attachments: [att("Vendor-Contract-2026.pdf", "pdf", 430)],
        read: true,
      },
    ],
  },
  {
    subject: "Quick question about the API rate limits",
    category: "primary",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: { name: "Elena Vasquez", email: "elena@partnerco.dev" },
        ago: [11, "h"],
        body: [
          "We're seeing 429s from the webhook endpoint during peak hours. Is the rate limit per API key or per account? Want to make sure we're batching correctly on our end.",
        ],
        read: false,
      },
    ],
  },
  {
    subject: "Photos from the trip 📸",
    category: "primary",
    labels: ["label:personal"],
    system: ["INBOX"],
    messages: [
      {
        from: thomas,
        ago: [5, "d"],
        body: [
          "Finally sorted through all the photos. The ones from the summit at sunrise came out incredible. Full album link is in the shared drive, grabbed a few favorites as attachments.",
        ],
        attachments: [att("summit-sunrise.jpg", "image", 3400), att("group-photo.jpg", "image", 2870)],
        read: true,
      },
    ],
  },
  {
    subject: "Performance review self-assessment due Friday",
    category: "primary",
    labels: ["label:work"],
    important: true,
    system: ["INBOX"],
    messages: [
      {
        from: hr,
        ago: [3, "d"],
        body: [
          "Friendly reminder that self-assessments for the mid-year review cycle are due this Friday at 5pm. The form takes about 20 minutes — link is in the portal under 'My Reviews'.",
        ],
        read: false,
      },
    ],
  },

  // ---------------- Snoozed ----------------
  {
    subject: "Draft the investor update — numbers attached",
    category: "primary",
    labels: ["label:work"],
    snoozedUntil: future(1),
    system: ["INBOX"],
    messages: [
      {
        from: david,
        ago: [6, "h"],
        body: [
          "Monthly metrics are in. Can you take a first pass at the investor update this week? I'll add the fundraising section once you've got the product narrative down.",
        ],
        attachments: [att("monthly-metrics.xlsx", "sheet", 88)],
        read: true,
      },
    ],
  },
  {
    subject: "Renew passport before the trip",
    category: "primary",
    labels: ["label:travel"],
    snoozedUntil: future(3),
    system: ["INBOX"],
    messages: [
      {
        from: "me",
        to: [ME],
        ago: [2, "d"],
        body: ["Note to self: passport expires in 5 months, needs to be valid 6 months past travel date for the September trip. Renew this week."],
        read: true,
      },
    ],
  },
  {
    subject: "Tax documents needed for filing",
    category: "primary",
    labels: ["label:finance"],
    snoozedUntil: future(6),
    system: ["INBOX"],
    messages: [
      {
        from: { name: "Dana Whitfield, CPA", email: "dana@whitfieldtax.example" },
        ago: [4, "d"],
        body: [
          "Reaching out ahead of the filing deadline — still need last year's 1099s and the home office worksheet whenever you get a chance. No rush, just don't want it to slip.",
        ],
        read: true,
      },
    ],
  },

  // ---------------- Social ----------------
  {
    subject: "You have 12 new connection requests",
    category: "social",
    system: ["INBOX"],
    messages: [
      {
        from: linkedin,
        ago: [5, "h"],
        body: ["You have 12 new connection requests and 4 people viewed your profile this week. See who's interested in connecting."],
        read: false,
      },
    ],
  },
  {
    subject: "Your post is getting attention",
    category: "social",
    system: ["INBOX"],
    messages: [
      {
        from: xDotCom,
        ago: [9, "h"],
        body: ["Your post about the Q3 launch has 340 likes and 58 reposts. Reply to keep the conversation going."],
        read: false,
      },
    ],
  },
  {
    subject: "3 people liked your photo",
    category: "social",
    system: ["INBOX"],
    messages: [
      {
        from: instagram,
        ago: [1, "d"],
        body: ["camille_r, noor.h and 1 other liked your photo from the ridge trail hike."],
        read: true,
      },
    ],
  },
  {
    subject: "Stories from writers you follow",
    category: "social",
    system: ["INBOX"],
    messages: [
      {
        from: medium,
        ago: [2, "d"],
        body: ["Today's picks: 'The hidden cost of premature abstraction', 'Why your onboarding flow is losing 40% of users', and 4 more stories picked for you."],
        read: true,
      },
    ],
  },
  {
    subject: "New job alerts matching your profile",
    category: "social",
    system: ["INBOX"],
    messages: [
      {
        from: linkedin,
        ago: [3, "d"],
        body: ["8 new jobs matching 'Engineering Lead' near you. Northwind Analytics is hiring a Staff Engineer."],
        read: true,
      },
    ],
  },

  // ---------------- Promotions ----------------
  {
    subject: "Your summer sale ends tonight — 40% off",
    category: "promotions",
    system: ["INBOX"],
    messages: [
      {
        from: nike,
        ago: [4, "h"],
        body: ["Last call: 40% off running shoes and gear ends at midnight. Free shipping on orders over $50."],
        read: false,
      },
    ],
  },
  {
    subject: "Weekend getaways under $120/night",
    category: "promotions",
    system: ["INBOX"],
    messages: [
      {
        from: airbnb,
        ago: [1, "d"],
        body: ["Handpicked stays near you starting at $89/night. Book this weekend and save 15% with code GETAWAY15."],
        read: true,
      },
    ],
  },
  {
    subject: "Your 2026 Wrapped is almost ready",
    category: "promotions",
    system: ["INBOX"],
    messages: [
      {
        from: spotify,
        ago: [2, "d"],
        body: ["We're crunching the numbers on your year in music. Preview a few early stats now, full Wrapped drops next month."],
        read: true,
      },
    ],
  },
  {
    subject: "Deal alert: prices dropped on 3 items in your cart",
    category: "promotions",
    system: ["INBOX"],
    messages: [
      {
        from: amazon,
        ago: [6, "h"],
        body: ["Good news — prices dropped on items in your cart. The mechanical keyboard you viewed is now $29 off."],
        read: false,
      },
    ],
  },
  {
    subject: "Flash sale: extra 20% off already reduced prices",
    category: "promotions",
    system: ["INBOX"],
    messages: [
      {
        from: booking,
        ago: [3, "d"],
        body: ["Genius members get an extra 20% off select stays this week only. Explore deals in destinations you've searched."],
        read: true,
      },
    ],
  },
  {
    subject: "We miss you — here's 15% off your next order",
    category: "promotions",
    system: ["INBOX"],
    messages: [
      {
        from: nike,
        ago: [5, "d"],
        body: ["It's been a while! Here's 15% off to welcome you back, valid through the end of the month."],
        read: true,
      },
    ],
  },

  // ---------------- Updates ----------------
  {
    subject: "[northwind/api] 3 pull requests need your review",
    category: "updates",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: github,
        ago: [3, "h"],
        body: [
          "marcus-webb opened 'Fix rate limit backoff for webhook retries' and requested your review. 2 other PRs are also waiting.",
        ],
        read: false,
      },
    ],
  },
  {
    subject: "Deployment succeeded: production",
    category: "updates",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: vercel,
        ago: [7, "h"],
        body: ["Your latest deployment to production succeeded. Build completed in 48s, all checks passed."],
        read: true,
      },
    ],
  },
  {
    subject: "Your receipt from Stripe",
    category: "updates",
    labels: ["label:receipts", "label:finance"],
    system: ["INBOX"],
    messages: [
      {
        from: stripe,
        ago: [1, "d"],
        body: ["Your subscription to Northwind Analytics Pro renewed. $89.00 was charged to the card ending in 4242."],
        attachments: [att("receipt-8842.pdf", "pdf", 64)],
        read: true,
      },
    ],
  },
  {
    subject: "Priya Patel commented on 'Onboarding v3'",
    category: "updates",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: figma,
        ago: [10, "h"],
        body: ["Priya Patel left a comment: 'Can we soften the shadow on the empty state illustration?' on frame Onboarding v3 / Empty States."],
        read: false,
      },
    ],
  },
  {
    subject: "Weekly summary: 14 tasks completed",
    category: "updates",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: linear,
        ago: [1, "d"],
        body: ["Your team completed 14 issues this week, 3 more than last week. Cycle 'Sprint 24' is 68% complete with 4 days remaining."],
        read: true,
      },
    ],
  },
  {
    subject: "Your Uber trip receipt — $18.42",
    category: "updates",
    labels: ["label:receipts"],
    system: ["INBOX"],
    messages: [
      {
        from: uber,
        ago: [2, "d"],
        body: ["Thanks for riding with Uber. Trip total: $18.42. Downtown Loop → Riverside Ave, 14 min."],
        attachments: [att("uber-receipt.pdf", "pdf", 42)],
        read: true,
      },
    ],
  },
  {
    subject: "Your statement is ready",
    category: "updates",
    labels: ["label:finance", "label:receipts"],
    system: ["INBOX"],
    messages: [
      {
        from: amex,
        ago: [3, "d"],
        body: ["Your latest statement is now available. Balance: $1,284.19, minimum payment due August 5th."],
        attachments: [att("statement-july.pdf", "pdf", 118)],
        read: true,
      },
    ],
  },
  {
    subject: "New comment on your document",
    category: "updates",
    labels: ["label:work"],
    system: ["INBOX"],
    messages: [
      {
        from: notion,
        ago: [4, "d"],
        body: ["Marcus Webb commented on 'Engineering Handbook': 'Should we add a section on incident postmortems?'"],
        read: true,
      },
    ],
  },

  // ---------------- Forums / newsletters ----------------
  {
    subject: "Top stories this week on Hacker News",
    category: "forums",
    labels: ["label:newsletters"],
    system: ["INBOX"],
    messages: [
      {
        from: hnDigest,
        ago: [1, "d"],
        body: ["1. Why we moved off Kubernetes (612 pts). 2. A love letter to boring technology (489 pts). 3. Show HN: I built a database in a weekend (401 pts)."],
        read: true,
      },
    ],
  },
  {
    subject: "Your r/webdev weekly digest",
    category: "forums",
    system: ["INBOX"],
    messages: [
      {
        from: reddit,
        ago: [2, "d"],
        body: ["Top posts this week: 'CSS :has() changed how I write layouts', 'I quit my job to build in public', and 12 more."],
        read: true,
      },
    ],
  },
  {
    subject: "Not Boring: The Economics of Attention",
    category: "forums",
    labels: ["label:newsletters"],
    system: ["INBOX"],
    messages: [
      {
        from: notBoring,
        ago: [3, "d"],
        body: [
          "This week: why attention has become the scarcest resource in software, and what that means for how products get built. Plus a deep dive on three companies betting against the trend.",
        ],
        read: false,
      },
    ],
  },
  {
    subject: "5 things in tech you need to know today",
    category: "forums",
    labels: ["label:newsletters"],
    system: ["INBOX"],
    messages: [
      {
        from: tldr,
        ago: [14, "h"],
        body: ["1. New silicon roadmap leaked. 2. A major cloud provider cuts egress fees. 3. The state of AI coding assistants in 2026. Plus 2 more."],
        read: true,
      },
    ],
  },
  {
    subject: "Morning Brew ☕️ — markets, memes, and more",
    category: "forums",
    labels: ["label:newsletters"],
    system: ["INBOX"],
    messages: [
      {
        from: morningBrew,
        ago: [16, "h"],
        body: ["Markets closed mixed as earnings season kicks off. Plus: the quiet return of in-person conferences, and today's business news roundup."],
        read: true,
      },
    ],
  },
  {
    subject: "How this founder hit $40k MRR solo",
    category: "forums",
    system: ["INBOX"],
    messages: [
      {
        from: indieHackers,
        ago: [4, "d"],
        body: ["This week's featured story: a solo founder's path from side project to $40k MRR, and the pricing change that made the difference."],
        read: true,
      },
    ],
  },

  // ---------------- Sent ----------------
  {
    subject: "Proposal: shifting standup to async updates",
    category: "primary",
    labels: ["label:work"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [marcus, priya, sarah],
        ago: [2, "d"],
        body: [
          "Been thinking about how much context-switching our daily standup causes across three time zones. Proposing we move to an async written update in Linear instead, with a live sync only when something needs real discussion.",
          "Curious if this would work for everyone — happy to trial it for two weeks and revisit.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Re: Vendor contract renewal terms attached",
    category: "primary",
    labels: ["label:work", "label:finance"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [legal],
        ago: [1, "d"],
        body: ["Reviewed and terms look good. Signing today and will get it back to you before end of week."],
        read: true,
      },
    ],
  },
  {
    subject: "Thank you for the referral",
    category: "primary",
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [david],
        ago: [3, "d"],
        body: ["Really appreciate you putting in a word for Elena on the partnerships call — made a big difference. Coffee's on me next time."],
        read: true,
      },
    ],
  },
  {
    subject: "Following up on the API rate limit question",
    category: "primary",
    labels: ["label:work"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [{ name: "Elena Vasquez", email: "elena@partnerco.dev" }],
        ago: [10, "h"],
        body: [
          "Rate limits are per API key, not per account, so splitting traffic across two keys won't help here — best fix is exponential backoff on 429s. Happy to hop on a call if useful.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Confirming Saturday hike",
    category: "primary",
    labels: ["label:personal"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [camille],
        ago: [4, "h"],
        body: ["Count me in — I'll bring coffee for everyone. Still at the same address, see you at 8."],
        read: true,
      },
    ],
  },
  {
    subject: "Feedback on the offsite deck",
    category: "primary",
    labels: ["label:work"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [sarah, david],
        ago: [6, "d"],
        body: [
          "Deck looks strong. One suggestion: move the churn analysis earlier since it motivates the roadmap bets later on. Otherwise ready to present.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Apartment recommendation for Noor",
    category: "primary",
    labels: ["label:personal"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [noor],
        ago: [5, "d"],
        body: ["Sent you the listing for the building near the park — same one Thomas is in. Management company is solid, worth a look before you sign anything else."],
        read: true,
      },
    ],
  },
  {
    subject: "Re: Interview loop feedback",
    category: "primary",
    labels: ["label:work"],
    system: ["SENT"],
    messages: [
      {
        from: "me",
        to: [marcus, hr],
        ago: [8, "h"],
        body: ["Agreed on the debugging gap — worth probing further in the team-fit conversation rather than blocking on it alone. Leaning yes."],
        read: true,
      },
    ],
  },

  // ---------------- Drafts ----------------
  {
    subject: "Q3 investor update — first draft",
    category: "primary",
    labels: ["label:work"],
    system: ["DRAFT"],
    messages: [
      {
        from: "me",
        to: [david],
        ago: [3, "h"],
        body: [
          "Hi David — here's a first pass at the product narrative for the investor update. Revenue section still needs your numbers, left a placeholder.",
          "Key wins this quarter: shipped the billing rework a week early, mobile onboarding conversion up 12%, and we closed two enterprise pilots.",
        ],
        read: true,
      },
    ],
  },
  {
    subject: "Re: Lease renewal — unit 4B",
    category: "primary",
    labels: ["label:personal"],
    system: ["DRAFT"],
    messages: [
      {
        from: "me",
        to: [landlord],
        ago: [1, "h"],
        body: ["Thanks for sending this over — before I sign, could you confirm whether the parking spot fee is included in the renewal rate or billed separately?"],
        read: true,
      },
    ],
  },
  {
    subject: "Happy birthday!!",
    category: "primary",
    system: ["DRAFT"],
    messages: [
      {
        from: "me",
        to: [noor],
        ago: [20, "h"],
        body: ["Happy birthday Noor! Hope your"],
        read: true,
      },
    ],
  },
  {
    subject: "(no subject)",
    category: "primary",
    system: ["DRAFT"],
    messages: [
      {
        from: "me",
        to: [],
        ago: [2, "h"],
        body: [""],
        read: true,
      },
    ],
  },

  // ---------------- Trash ----------------
  {
    subject: "Your trial is ending soon",
    category: "updates",
    system: ["TRASH"],
    messages: [
      {
        from: { name: "CloudMetrics", email: "billing@cloudmetrics.example" },
        ago: [6, "d"],
        body: ["Your 14-day trial ends in 2 days. Add a payment method to keep your dashboards running without interruption."],
        read: true,
      },
    ],
  },
  {
    subject: "Old team standup notes — 2025 archive",
    category: "primary",
    system: ["TRASH"],
    messages: [
      {
        from: marcus,
        ago: [20, "d"],
        body: ["Archiving last year's standup notes doc, replaced by the new Linear cycle view. Let me know if you need anything from the old one."],
        read: true,
      },
    ],
  },
  {
    subject: "Newsletter: 10 productivity hacks you're not using",
    category: "promotions",
    system: ["TRASH"],
    messages: [
      {
        from: { name: "ProductivityDaily", email: "hello@productivitydaily.example" },
        ago: [8, "d"],
        body: ["Unlock your best self with these 10 hacks top performers swear by. Number 7 will surprise you."],
        read: true,
      },
    ],
  },
  {
    subject: "Duplicate: Deployment succeeded: staging",
    category: "updates",
    system: ["TRASH"],
    messages: [
      {
        from: vercel,
        ago: [4, "d"],
        body: ["Your latest deployment to staging succeeded. Build completed in 51s."],
        read: true,
      },
    ],
  },
  {
    subject: "Re: Quick sync?",
    category: "primary",
    system: ["TRASH"],
    messages: [
      {
        from: { name: "Recruiter — TalentBridge", email: "outreach@talentbridge.example" },
        ago: [15, "d"],
        body: ["Following up on my note last week — still think you'd be a great fit for a role I'm working on. Open to a quick call?"],
        read: true,
      },
    ],
  },

  // ---------------- Spam ----------------
  {
    subject: "YOU HAVE WON $2,500,000.00 USD — CLAIM NOW",
    category: "primary",
    system: ["SPAM"],
    messages: [
      {
        from: lottery,
        ago: [2, "d"],
        body: ["Congratulations! Your email address has been selected to receive $2,500,000.00 USD from our international lottery draw. Reply with your full name, address and bank details to claim your prize within 48 hours."],
        read: true,
      },
    ],
  },
  {
    subject: "Turn $500 into $50,000 in 30 days — guaranteed",
    category: "primary",
    system: ["SPAM"],
    messages: [
      {
        from: cryptoAlert,
        ago: [3, "d"],
        body: ["Our AI trading bot has a 99.7% win rate. Limited spots left this month — deposit as little as $500 and watch it grow. Act now before the offer ends."],
        read: true,
      },
    ],
  },
  {
    subject: "URGENT: Your account will be suspended in 24 hours",
    category: "primary",
    system: ["SPAM"],
    messages: [
      {
        from: phishing,
        ago: [1, "d"],
        body: ["We detected unusual activity on your account. Verify your identity immediately by clicking the link below or your account will be permanently suspended."],
        read: true,
      },
    ],
  },
  {
    subject: "Cheap medications, no prescription needed",
    category: "primary",
    system: ["SPAM"],
    messages: [
      {
        from: pharmacy,
        ago: [5, "d"],
        body: ["Save up to 80% on brand name medications, discreet shipping worldwide, no prescription required. Order today for a limited-time discount."],
        read: true,
      },
    ],
  },
  {
    subject: "RE: Unclaimed inheritance of $8.4 million",
    category: "primary",
    system: ["SPAM"],
    messages: [
      {
        from: inheritance,
        ago: [7, "d"],
        body: ["I am a barrister representing the estate of a deceased client who shares your surname. There is an unclaimed inheritance of $8.4 million. Contact me privately to discuss the transfer."],
        read: true,
      },
    ],
  },
];

export function buildSeed() {
  const labels: Label[] = [...CUSTOM_LABELS];
  const threads: Thread[] = [];
  const messages: Message[] = [];

  for (const st of seedThreads) {
    const threadId = nextId("thread");
    const messageIds: string[] = [];
    let lastMessageAt = "";

    for (const sm of st.messages) {
      const messageId = nextId("msg");
      const isMe = sm.from === "me";
      const from = sm.from === "me" ? ME : sm.from;
      const to = sm.to ?? (isMe ? [] : [ME]);
      const bodyHtml = html(sm.body.filter(Boolean));
      const date = ago(sm.ago[0], sm.ago[1]);
      const isDraft = st.system.includes("DRAFT");

      messages.push({
        id: messageId,
        threadId,
        from,
        to,
        cc: sm.cc,
        date,
        bodyHtml,
        snippet: snippetFrom(bodyHtml || "(no content)"),
        attachments: sm.attachments ?? [],
        isRead: sm.read ?? true,
        isMe,
        isDraft,
      });
      messageIds.push(messageId);
      lastMessageAt = date;
    }

    const labelIds: string[] = [...st.system, ...(st.labels ?? [])];

    threads.push({
      id: threadId,
      subject: st.subject,
      messageIds,
      labelIds,
      category: st.category,
      isStarred: st.starred ?? false,
      isImportant: st.important ?? false,
      snoozedUntil: st.snoozedUntil ?? null,
      lastMessageAt,
    });
  }

  const contactsByEmail = new Map<string, Contact>();
  for (const m of messages) {
    for (const c of [m.from, ...m.to, ...(m.cc ?? [])]) {
      if (c.email !== ME.email && !contactsByEmail.has(c.email)) {
        contactsByEmail.set(c.email, c);
      }
    }
  }

  return { labels, threads, messages, contacts: [...contactsByEmail.values()] };
}

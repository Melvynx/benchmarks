import type { Attachment, Contact, Label, Thread } from './types'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
const NOW = Date.now()

function ago(ms: number): string {
  return new Date(NOW - ms).toISOString()
}

function from(days: number, hours = 0, minutes = 0): string {
  return ago(days * DAY + hours * HOUR + minutes * 60 * 1000)
}

function future(days: number, hours = 0): string {
  return ago(-(days * DAY + hours * HOUR))
}

export function contact(
  id: string,
  name: string,
  email: string,
  color: string,
): Contact {
  return { id, name, email, color }
}

export const ME = contact('me', 'Melvyn', 'melvynmal@gmail.com', '#0b57d0')

export const CONTACTS = {
  sarah: contact('sarah', 'Sarah Chen', 'sarah.chen@vertexlabs.io', '#8e24aa'),
  james: contact('james', 'James Okafor', 'james.okafor@vertexlabs.io', '#00897b'),
  priya: contact('priya', 'Priya Patel', 'priya.patel@vertexlabs.io', '#e65100'),
  lucas: contact('lucas', 'Lucas Moreau', 'lucas.moreau@vertexlabs.io', '#3949ab'),
  anna: contact('anna', 'Anna Kowalski', 'anna.k@vertexlabs.io', '#c2185b'),
  jordan: contact('jordan', 'Jordan Reyes', 'jordan.reyes@icloud.com', '#00acc1'),
  maria: contact('maria', 'Maria Gonzalez', 'maria.g.design@gmail.com', '#6d4c41'),
  mom: contact('mom', 'Mom', 'maureen.arnold@gmail.com', '#d81b60'),
  manager: contact('manager', 'Parkview Property Mgmt', 'manager@parkview-residences.com', '#546e7a'),
  support: contact('support', 'Nova Supply Support', 'support@novasupply.example', '#455a64'),

  github: contact('github', 'GitHub', 'notifications@github.com', '#24292e'),
  linear: contact('linear', 'Linear', 'notifications@linear.app', '#5e6ad2'),
  stripe: contact('stripe', 'Stripe', 'receipts@stripe.com', '#635bff'),
  notion: contact('notion', 'Notion', 'team@makenotion.com', '#000000'),
  vercel: contact('vercel', 'Vercel', 'notifications@vercel.com', '#000000'),
  figma: contact('figma', 'Figma', 'notify@figma.com', '#a259ff'),
  linkedin: contact('linkedin', 'LinkedIn', 'messages-noreply@linkedin.com', '#0a66c2'),
  amazon: contact('amazon', 'Amazon', 'shipment-tracking@amazon.com', '#ff9900'),
  uber: contact('uber', 'Uber', 'receipts@uber.com', '#000000'),
  airbnb: contact('airbnb', 'Airbnb', 'automated@airbnb.com', '#ff5a5f'),
  spotify: contact('spotify', 'Spotify', 'no-reply@spotify.com', '#1db954'),
  duolingo: contact('duolingo', 'Duolingo', 'hello@duolingo.com', '#58cc02'),
  calendly: contact('calendly', 'Calendly', 'notifications@calendly.com', '#006bff'),
  zoom: contact('zoom', 'Zoom', 'no-reply@zoom.us', '#2d8cff'),
  slack: contact('slack', 'Slack', 'feedback@slack.com', '#4a154b'),
  gcloud: contact('gcloud', 'Google Cloud', 'cloud-noreply@google.com', '#4285f4'),
  nike: contact('nike', 'Nike', 'news@nike.com', '#111111'),
  away: contact('away', 'Away', 'hello@awaytravel.com', '#1c3f52'),
  everlane: contact('everlane', 'Everlane', 'hello@everlane.com', '#2d2d2d'),
  twitter: contact('twitter', 'X', 'info@x.com', '#000000'),
  facebook: contact('facebook', 'Facebook', 'notification@facebookmail.com', '#1877f2'),
  stackoverflow: contact('stackoverflow', 'Stack Overflow', 'do-not-reply@stackoverflow.email', '#f48024'),
  producthunt: contact('producthunt', 'Product Hunt', 'hello@producthunt.com', '#da552f'),
  prize: contact('prize', 'Rewards Center', 'claim@prize-alerts.example', '#7cb342'),
  security: contact('security', 'Account Security Team', 'no-reply@secure-verify.example', '#c62828'),
  pharma: contact('pharma', 'MedSaver Direct', 'offers@medsaver.example', '#8d6e63'),
  sweepstakes: contact('sweepstakes', 'Global Sweepstakes', 'winners@global-sweepstakes.example', '#f9a825'),
}

export const LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#0b57d0', textColor: '#ffffff' },
  { id: 'travel', name: 'Travel', color: '#1e8e3e', textColor: '#ffffff' },
  { id: 'finance', name: 'Finance', color: '#e37400', textColor: '#ffffff' },
  { id: 'receipts', name: 'Receipts', color: '#8430ce', textColor: '#ffffff' },
  { id: 'personal', name: 'Personal', color: '#d81b60', textColor: '#ffffff' },
]

function pdf(name: string, size: string): Attachment {
  return { id: crypto.randomUUID(), name, kind: 'pdf', size }
}
function img(name: string, size: string): Attachment {
  return { id: crypto.randomUUID(), name, kind: 'image', size }
}
function doc(name: string, size: string): Attachment {
  return { id: crypto.randomUUID(), name, kind: 'doc', size }
}
function sheet(name: string, size: string): Attachment {
  return { id: crypto.randomUUID(), name, kind: 'sheet', size }
}
function slides(name: string, size: string): Attachment {
  return { id: crypto.randomUUID(), name, kind: 'slides', size }
}
function zip(name: string, size: string): Attachment {
  return { id: crypto.randomUUID(), name, kind: 'zip', size }
}

let msgCounter = 0
function nextMsgId(threadId: string): string {
  msgCounter += 1
  return `${threadId}-m${msgCounter}`
}

interface MsgInput {
  from: Contact
  to: Contact[]
  cc?: Contact[]
  date: string
  bodyText: string
  snippet?: string
  attachments?: Attachment[]
  isRead?: boolean
  isDraft?: boolean
}

function msg(threadId: string, input: MsgInput) {
  return {
    id: nextMsgId(threadId),
    threadId,
    from: input.from,
    to: input.to,
    cc: input.cc,
    date: input.date,
    bodyText: input.bodyText,
    snippet: input.snippet ?? input.bodyText.replace(/\n/g, ' ').slice(0, 120),
    attachments: input.attachments ?? [],
    isRead: input.isRead ?? true,
    isDraft: input.isDraft ?? false,
  }
}

interface ThreadInput {
  id: string
  subject: string
  labelIds: string[]
  messages: ReturnType<typeof msg>[]
  isImportant?: boolean
  snoozedUntil?: string | null
}

function thread(input: ThreadInput): Thread {
  return {
    id: input.id,
    subject: input.subject,
    messages: input.messages,
    labelIds: input.labelIds,
    isImportant: input.isImportant ?? false,
    snoozedUntil: input.snoozedUntil ?? null,
    scheduledFor: null,
  }
}

const C = CONTACTS

export const SEED_THREADS: Thread[] = [
  // ---------------- INBOX / PRIMARY ----------------
  thread({
    id: 't-design-review',
    subject: 'Design review for onboarding flow',
    labelIds: ['inbox', 'category_primary', 'work', 'starred'],
    isImportant: true,
    messages: [
      msg('t-design-review', {
        from: C.sarah,
        to: [ME],
        date: from(0, 3, 10),
        isRead: false,
        bodyText:
          "Hey Melvyn,\n\nI just pushed the updated onboarding flow to Figma — added the empty states we talked about and simplified step 3 down to a single screen. Would love your eyes on it before I bring it to the team sync tomorrow.\n\nA few things I'm not 100% sure about:\n1. Should the progress indicator be at the top or bottom on mobile?\n2. Do we need a skip option on the profile picture step?\n\nExports attached for quick reference.\n\nThanks!\nSarah",
        attachments: [img('onboarding-flow-v3.png', '2.4 MB'), img('onboarding-mobile-states.png', '1.8 MB')],
      }),
    ],
  }),

  thread({
    id: 't-roadmap',
    subject: 'Q3 roadmap – need your input by Friday',
    labelIds: ['inbox', 'category_primary', 'work'],
    isImportant: true,
    messages: [
      msg('t-roadmap', {
        from: C.priya,
        to: [ME, C.sarah, C.james],
        date: from(0, 5, 40),
        isRead: false,
        bodyText:
          "Team,\n\nI'm finalizing the Q3 roadmap doc this week and want to make sure engineering capacity lines up with what design + marketing are expecting. Could everyone add their estimates to the sheet by end of day Friday?\n\nSpecifically I need:\n- Confirmation on whether the billing rework fits in Q3 or slips to Q4\n- Rough sizing on the notifications revamp\n- Any blockers on the mobile app parity work\n\nLet's sync in Thursday's standup if anything's unclear. Thanks all!\n\nPriya",
        attachments: [sheet('Q3-roadmap-planning.xlsx', '186 KB')],
      }),
    ],
  }),

  thread({
    id: 't-infra-migration',
    subject: 'Infra migration timeline',
    labelIds: ['inbox', 'category_primary', 'work'],
    messages: [
      msg('t-infra-migration', {
        from: C.lucas,
        to: [ME],
        date: from(1, 2),
        bodyText:
          "Melvyn — wanted to get your read on the database migration timeline. Ops thinks we can cut over the weekend of the 25th with about 90 minutes of downtime for writes. Does that conflict with anything on the product side?",
      }),
      msg('t-infra-migration', {
        from: ME,
        to: [C.lucas],
        date: from(0, 22),
        bodyText:
          "That weekend works on our end — nothing shipping around then. Only ask is we get a heads up 48h before so I can post in the status page and give support a script for inbound tickets.",
      }),
      msg('t-infra-migration', {
        from: C.lucas,
        to: [ME],
        date: from(0, 8),
        isRead: false,
        bodyText:
          "Perfect, I'll have ops send the formal notice Wednesday. I'll loop you in on that thread directly so you have the exact maintenance window for the status page copy.",
      }),
    ],
  }),

  thread({
    id: 't-pr-482',
    subject: 'PR #482 ready for review',
    labelIds: ['inbox', 'category_primary', 'work'],
    messages: [
      msg('t-pr-482', {
        from: C.james,
        to: [ME],
        date: from(0, 6, 15),
        isRead: false,
        bodyText:
          "Melvyn, the search reindexing PR is ready for a look whenever you have time — it's the one that fixes the stale-results bug from last week's bug bash. CI is green, added tests for the edge case with archived threads. No rush but would like to ship before Friday's release cut.",
      }),
    ],
  }),

  thread({
    id: 't-hike',
    subject: 'Weekend hike?',
    labelIds: ['inbox', 'category_primary', 'personal'],
    messages: [
      msg('t-hike', {
        from: C.jordan,
        to: [ME],
        date: from(2, 4),
        bodyText:
          "Yo! A few of us are doing the Eagle Ridge trail Saturday morning, meeting at the trailhead around 8am to beat the heat. You in? Bringing the good coffee this time, I promise.",
      }),
      msg('t-hike', {
        from: ME,
        to: [C.jordan],
        date: from(1, 20),
        bodyText: "Depends how Friday night goes but leaning yes. What's the plan for after — lunch somewhere?",
      }),
      msg('t-hike', {
        from: C.jordan,
        to: [ME],
        date: from(0, 4),
        isRead: false,
        bodyText:
          "Yeah thinking that diner by the trailhead, they do a solid post-hike breakfast. I'll add you to the group chat so you get the real-time meeting spot in case plans shift.",
      }),
    ],
  }),

  thread({
    id: 't-newsletter-feedback',
    subject: 'Newsletter draft feedback',
    labelIds: ['inbox', 'category_primary', 'work'],
    messages: [
      msg('t-newsletter-feedback', {
        from: C.anna,
        to: [ME],
        date: from(0, 9),
        isRead: false,
        bodyText:
          "Hi Melvyn, attaching this month's product newsletter draft — would love a sanity check on the feature descriptions in section 2 before it goes to the full list Thursday. Let me know if I'm overselling the export tool.",
        attachments: [doc('product-newsletter-july-draft.docx', '312 KB')],
      }),
    ],
  }),

  thread({
    id: 't-portfolio-live',
    subject: 'Portfolio site is live!',
    labelIds: ['inbox', 'category_primary', 'personal'],
    messages: [
      msg('t-portfolio-live', {
        from: C.maria,
        to: [ME],
        date: from(3, 6),
        bodyText:
          "It's finally up! mariagonzalez.design — spent way too many weekends on the case studies but happy with how it turned out. Would love your thoughts whenever you get a chance, especially on the project detail pages.",
        attachments: [img('portfolio-screenshot.png', '956 KB')],
      }),
    ],
  }),

  thread({
    id: 't-sunday-dinner',
    subject: 'Sunday dinner?',
    labelIds: ['inbox', 'category_primary', 'personal', 'starred'],
    messages: [
      msg('t-sunday-dinner', {
        from: C.mom,
        to: [ME],
        date: from(0, 11),
        isRead: false,
        bodyText:
          "Hi honey, are you free Sunday around 6? Making the roast chicken you like. Let me know if you want to bring anyone along, always room for one more at the table. Love you!",
      }),
    ],
  }),

  thread({
    id: 't-calendly-scheduled',
    subject: 'New event scheduled: Coffee chat w/ Alex Nguyen',
    labelIds: ['inbox', 'category_primary'],
    messages: [
      msg('t-calendly-scheduled', {
        from: C.calendly,
        to: [ME],
        date: from(1, 1),
        bodyText:
          "A new event has been scheduled.\n\nEvent: Coffee Chat (30 min)\nInvitee: Alex Nguyen\nDate: Thursday, July 23 at 2:00pm\nLocation: Google Meet\n\nYou can reschedule or cancel from your Calendly dashboard.",
      }),
    ],
  }),

  thread({
    id: 't-zoom-recording',
    subject: 'Your meeting recording is ready',
    labelIds: ['inbox', 'category_primary'],
    messages: [
      msg('t-zoom-recording', {
        from: C.zoom,
        to: [ME],
        date: from(0, 14),
        isRead: false,
        bodyText:
          "Your cloud recording for 'Product Sync – Weekly' is now available.\n\nRecording length: 47 minutes\nAvailable until: this recording will be kept until manually deleted per your workspace retention policy.\n\nView or share the recording from your Zoom account.",
      }),
    ],
  }),

  thread({
    id: 't-github-comments',
    subject: '[vertex/core] 3 new comments on your pull request #482',
    labelIds: ['inbox', 'category_primary'],
    messages: [
      msg('t-github-comments', {
        from: C.github,
        to: [ME],
        date: from(0, 2),
        isRead: false,
        bodyText:
          "jokafor commented on #482:\n\"Nice fix — can we also add a regression test for the pagination edge case?\"\n\nlmoreau commented on #482:\n\"LGTM once the test above is added.\"\n\nView the full conversation on GitHub.",
      }),
    ],
  }),

  thread({
    id: 't-notion-mentions',
    subject: 'You were mentioned in 2 pages',
    labelIds: ['inbox', 'category_primary'],
    messages: [
      msg('t-notion-mentions', {
        from: C.notion,
        to: [ME],
        date: from(1, 6),
        bodyText:
          "Sarah Chen mentioned you in \"Onboarding Redesign — Feedback\":\n\"@Melvyn can you weigh in on the empty state copy here?\"\n\nPriya Patel mentioned you in \"Q3 Planning\":\n\"looping in @Melvyn for the engineering estimate\"",
      }),
    ],
  }),

  thread({
    id: 't-stripe-receipt',
    subject: 'Your receipt from Vertex Labs Inc.',
    labelIds: ['inbox', 'category_primary', 'finance', 'receipts'],
    messages: [
      msg('t-stripe-receipt', {
        from: C.stripe,
        to: [ME],
        date: from(4, 3),
        bodyText:
          "Receipt #2291-8841\n\nVertex Labs Inc. — Team Plan (Monthly)\nAmount charged: $89.00\nPayment method: Visa •••• 4242\nBilling period: Jul 12 – Aug 11\n\nThank you for your business. A copy of this receipt is attached for your records.",
        attachments: [pdf('receipt-2291-8841.pdf', '84 KB')],
      }),
    ],
  }),

  thread({
    id: 't-airbnb-lisbon',
    subject: 'Your upcoming trip to Lisbon',
    labelIds: ['inbox', 'category_primary', 'travel'],
    messages: [
      msg('t-airbnb-lisbon', {
        from: C.airbnb,
        to: [ME],
        date: from(0, 16),
        isRead: false,
        bodyText:
          "Your trip to Lisbon is coming up in 12 days!\n\nCheck-in: Aug 3, 3:00 PM\nCheckout: Aug 9, 11:00 AM\nAlfama Loft with Terrace — hosted by Ines\n\nMessage your host to coordinate check-in, or review the house rules and directions in your itinerary.",
        attachments: [pdf('lisbon-itinerary.pdf', '410 KB')],
      }),
    ],
  }),

  // ---------------- INBOX / SOCIAL ----------------
  thread({
    id: 't-linkedin-views',
    subject: 'You have 7 new profile views this week',
    labelIds: ['inbox', 'category_social'],
    messages: [
      msg('t-linkedin-views', {
        from: C.linkedin,
        to: [ME],
        date: from(0, 20),
        isRead: false,
        bodyText: 'See who viewed your profile and discover new opportunities that match your experience.',
      }),
    ],
  }),
  thread({
    id: 't-linkedin-comment',
    subject: 'James Okafor commented on your post',
    labelIds: ['inbox', 'category_social'],
    messages: [
      msg('t-linkedin-comment', {
        from: C.linkedin,
        to: [ME],
        date: from(1, 3),
        bodyText: '"Great write-up, this matches what we saw in the last migration too." — James Okafor',
      }),
    ],
  }),
  thread({
    id: 't-x-followers',
    subject: 'You have 12 new followers this week',
    labelIds: ['inbox', 'category_social'],
    messages: [
      msg('t-x-followers', {
        from: C.twitter,
        to: [ME],
        date: from(2, 8),
        bodyText: 'Your recent posts are getting noticed. See your new followers and top post analytics.',
      }),
    ],
  }),
  thread({
    id: 't-facebook-memory',
    subject: 'You have a new memory to look back on',
    labelIds: ['inbox', 'category_social'],
    messages: [
      msg('t-facebook-memory', {
        from: C.facebook,
        to: [ME],
        date: from(3, 1),
        bodyText: 'See what you shared on this day in previous years.',
      }),
    ],
  }),
  thread({
    id: 't-linkedin-likes',
    subject: 'Priya Patel and 6 others reacted to your post',
    labelIds: ['inbox', 'category_social'],
    messages: [
      msg('t-linkedin-likes', {
        from: C.linkedin,
        to: [ME],
        date: from(4, 5),
        bodyText: 'Your post about shipping the new search experience is getting attention — see who engaged.',
      }),
    ],
  }),

  // ---------------- INBOX / PROMOTIONS ----------------
  thread({
    id: 't-nike-sale',
    subject: '24 hours only: extra 20% off sale styles',
    labelIds: ['inbox', 'category_promotions'],
    messages: [
      msg('t-nike-sale', {
        from: C.nike,
        to: [ME],
        date: from(0, 7),
        isRead: false,
        bodyText: 'Members get an extra 20% off already-reduced styles. Ends tonight at midnight. Shop now before your size sells out.',
      }),
    ],
  }),
  thread({
    id: 't-away-restock',
    subject: 'Back in stock: the carry-on you saved',
    labelIds: ['inbox', 'category_promotions', 'travel'],
    messages: [
      msg('t-away-restock', {
        from: C.away,
        to: [ME],
        date: from(1, 9),
        bodyText: "The Bigger Carry-On in Sage is back in stock. It sold out fast last time — grab yours before it's gone again.",
      }),
    ],
  }),
  thread({
    id: 't-everlane-new',
    subject: 'New arrivals: organic cotton essentials',
    labelIds: ['inbox', 'category_promotions'],
    messages: [
      msg('t-everlane-new', {
        from: C.everlane,
        to: [ME],
        date: from(2, 2),
        bodyText: 'This week: relaxed fits in our softest organic cotton yet. Free shipping on orders over $75.',
      }),
    ],
  }),
  thread({
    id: 't-spotify-wrapped',
    subject: 'A little something for your ears this week',
    labelIds: ['inbox', 'category_promotions'],
    messages: [
      msg('t-spotify-wrapped', {
        from: C.spotify,
        to: [ME],
        date: from(3, 4),
        bodyText: 'New releases from artists you follow, plus a playlist we think you\'ll like based on your recent listening.',
      }),
    ],
  }),
  thread({
    id: 't-duolingo-streak',
    subject: "You're 2 days from a 30-day streak!",
    labelIds: ['inbox', 'category_promotions'],
    messages: [
      msg('t-duolingo-streak', {
        from: C.duolingo,
        to: [ME],
        date: from(0, 13),
        isRead: false,
        bodyText: "Don't break your streak now! Complete one lesson today to keep it going. Your owl is counting on you.",
      }),
    ],
  }),
  thread({
    id: 't-uber-promo',
    subject: '20% off your next 3 rides',
    labelIds: ['inbox', 'category_promotions'],
    messages: [
      msg('t-uber-promo', {
        from: C.uber,
        to: [ME],
        date: from(4, 10),
        bodyText: 'Use code SAVE20 on your next three rides this month. Valid through the end of the week.',
      }),
    ],
  }),

  // ---------------- INBOX / UPDATES ----------------
  thread({
    id: 't-vercel-deploy',
    subject: 'Deployment succeeded: vertex-marketing',
    labelIds: ['inbox', 'category_updates'],
    messages: [
      msg('t-vercel-deploy', {
        from: C.vercel,
        to: [ME],
        date: from(0, 1),
        isRead: false,
        bodyText: 'vertex-marketing was successfully deployed to production.\n\nBranch: main\nCommit: chore: update pricing copy\nDuration: 38s',
      }),
    ],
  }),
  thread({
    id: 't-linear-cycle',
    subject: 'Cycle 24 starts tomorrow — 6 issues assigned to you',
    labelIds: ['inbox', 'category_updates', 'work'],
    messages: [
      msg('t-linear-cycle', {
        from: C.linear,
        to: [ME],
        date: from(1, 4),
        bodyText:
          'Cycle 24 kicks off tomorrow. You have 6 issues assigned, including 2 marked Urgent:\n\n- VTX-341: Fix stale search index on archive\n- VTX-348: Notification preferences API\n\nView the full cycle board to plan your week.',
        attachments: [slides('cycle-24-planning-deck.pptx', '4.1 MB')],
      }),
    ],
  }),
  thread({
    id: 't-gcloud-billing',
    subject: 'Your June billing summary is ready',
    labelIds: ['inbox', 'category_updates', 'finance'],
    messages: [
      msg('t-gcloud-billing', {
        from: C.gcloud,
        to: [ME],
        date: from(5, 2),
        bodyText: 'Your Google Cloud billing summary for June is now available.\n\nTotal: $412.18\nCompared to last month: +6.4%\n\nView the detailed breakdown attached.',
        attachments: [pdf('gcloud-billing-june.pdf', '156 KB')],
      }),
    ],
  }),
  thread({
    id: 't-amazon-shipped',
    subject: 'Your package has shipped',
    labelIds: ['inbox', 'category_updates'],
    messages: [
      msg('t-amazon-shipped', {
        from: C.amazon,
        to: [ME],
        date: from(1, 5),
        bodyText: 'Your order of "Mechanical Keyboard — Low Profile" has shipped and is expected to arrive Thursday.\n\nTrack your package for real-time updates.',
      }),
    ],
  }),
  thread({
    id: 't-slack-digest',
    subject: 'Your weekly digest for Vertex Labs',
    labelIds: ['inbox', 'category_updates'],
    messages: [
      msg('t-slack-digest', {
        from: C.slack,
        to: [ME],
        date: from(2, 6),
        bodyText: '12 messages you might have missed across #eng, #design, and #general this week.',
      }),
    ],
  }),
  thread({
    id: 't-figma-comment',
    subject: 'New comment on Design System v3',
    labelIds: ['inbox', 'category_updates'],
    messages: [
      msg('t-figma-comment', {
        from: C.figma,
        to: [ME],
        date: from(0, 18),
        isRead: false,
        bodyText: 'Sarah Chen left a comment on "Design System v3":\n"Updated the button component states — added the new focus ring treatment."',
      }),
    ],
  }),

  // ---------------- INBOX / FORUMS ----------------
  thread({
    id: 't-so-answer',
    subject: 'Someone answered your question',
    labelIds: ['inbox', 'category_forums'],
    messages: [
      msg('t-so-answer', {
        from: C.stackoverflow,
        to: [ME],
        date: from(1, 12),
        bodyText: 'Your question "Why does React re-render twice in StrictMode" has a new answer with 14 upvotes.',
      }),
    ],
  }),
  thread({
    id: 't-producthunt-trending',
    subject: 'Your product is trending #4 today',
    labelIds: ['inbox', 'category_forums', 'work'],
    messages: [
      msg('t-producthunt-trending', {
        from: C.producthunt,
        to: [ME],
        date: from(2, 3),
        bodyText: "Congrats, Vertex is trending #4 on Product Hunt today! Keep the momentum going by responding to comments from hunters.",
      }),
    ],
  }),
  thread({
    id: 't-github-digest',
    subject: 'Weekly digest for vertex/core',
    labelIds: ['inbox', 'category_forums'],
    messages: [
      msg('t-github-digest', {
        from: C.github,
        to: [ME],
        date: from(3, 9),
        bodyText: '8 pull requests merged, 3 issues closed, and 2 new contributors this week in vertex/core.',
      }),
    ],
  }),

  // ---------------- SNOOZED ----------------
  thread({
    id: 't-snoozed-invoice',
    subject: 'Action needed: update payment method',
    labelIds: ['inbox', 'category_updates', 'snoozed', 'finance'],
    snoozedUntil: future(1, 9),
    messages: [
      msg('t-snoozed-invoice', {
        from: C.stripe,
        to: [ME],
        date: from(2, 1),
        bodyText: "We weren't able to process your card ending in 4242 for this month's subscription. Please update your payment method to avoid service interruption.",
      }),
    ],
  }),
  thread({
    id: 't-snoozed-followup',
    subject: 'Following up — did you get a chance to look?',
    labelIds: ['inbox', 'category_primary', 'snoozed', 'work'],
    snoozedUntil: future(3),
    messages: [
      msg('t-snoozed-followup', {
        from: C.anna,
        to: [ME],
        date: from(6, 4),
        bodyText: "Just floating this back to the top of your inbox — no rush, but wanted to make sure it didn't get buried before the newsletter goes out.",
      }),
    ],
  }),

  // ---------------- SENT ----------------
  thread({
    id: 't-sent-roadmap-input',
    subject: 'Re: Q3 roadmap – here is my input',
    labelIds: ['sent'],
    messages: [
      msg('t-sent-roadmap-input', {
        from: ME,
        to: [C.priya],
        cc: [C.sarah, C.james],
        date: from(0, 4),
        bodyText:
          "Priya — added my estimates to the sheet. Billing rework should fit in Q3 if we descope the multi-currency piece to Q4. Notifications revamp is roughly 3 weeks for the core flow, longer if we want per-channel preferences at launch. No blockers on mobile parity right now, will flag if that changes.",
      }),
    ],
  }),
  thread({
    id: 't-sent-design-notes',
    subject: 'Design review notes attached',
    labelIds: ['sent'],
    messages: [
      msg('t-sent-design-notes', {
        from: ME,
        to: [C.sarah, C.james, C.lucas],
        date: from(1, 7),
        bodyText:
          "Notes from today's design review attached — main callouts are around the empty state copy and making sure the skip option is available on lower-priority steps. Great progress overall, this is close to ready for the team sync.",
        attachments: [pdf('design-review-notes.pdf', '128 KB'), zip('onboarding-exports.zip', '6.7 MB')],
      }),
    ],
  }),
  thread({
    id: 't-sent-hike-in',
    subject: 'Re: Weekend hike?',
    labelIds: ['sent'],
    messages: [
      msg('t-sent-hike-in', {
        from: ME,
        to: [C.jordan],
        date: from(1, 21),
        bodyText: "Depends how Friday night goes but leaning yes. What's the plan for after — lunch somewhere?",
      }),
    ],
  }),
  thread({
    id: 't-sent-maintenance',
    subject: 'Maintenance request follow-up',
    labelIds: ['sent'],
    messages: [
      msg('t-sent-maintenance', {
        from: ME,
        to: [C.manager],
        date: from(4, 6),
        bodyText:
          "Following up on the maintenance request I submitted last week for the kitchen faucet — hasn't been addressed yet. Could someone take a look this week? Happy to be home for a specific time window if that helps scheduling.",
      }),
    ],
  }),
  thread({
    id: 't-sent-refund',
    subject: 'Re: Refund request #88213',
    labelIds: ['sent'],
    messages: [
      msg('t-sent-refund', {
        from: ME,
        to: [C.support],
        date: from(6, 2),
        bodyText:
          "Thanks for confirming — that works for me. Please go ahead and process the refund to the original payment method. Appreciate the quick turnaround on this.",
      }),
    ],
  }),
  thread({
    id: 't-sent-newsletter-fb',
    subject: 'Re: Newsletter draft feedback',
    labelIds: ['sent'],
    messages: [
      msg('t-sent-newsletter-fb', {
        from: ME,
        to: [C.anna],
        date: from(7, 3),
        bodyText:
          "Left comments in the doc — mostly small wording tweaks. Section 2 reads great, maybe just soften the language around the export tool since it's still in beta.",
        attachments: [doc('newsletter-feedback.docx', '98 KB')],
      }),
    ],
  }),

  // ---------------- TRASH ----------------
  thread({
    id: 't-trash-flash-sale',
    subject: 'Flash sale ends tonight — up to 60% off',
    labelIds: ['trash', 'category_promotions'],
    messages: [
      msg('t-trash-flash-sale', {
        from: C.everlane,
        to: [ME],
        date: from(10, 2),
        bodyText: 'Last chance — flash sale ends at midnight. Up to 60% off select styles.',
      }),
    ],
  }),
  thread({
    id: 't-trash-old-newsletter',
    subject: 'This week in design: issue #114',
    labelIds: ['trash', 'category_forums'],
    messages: [
      msg('t-trash-old-newsletter', {
        from: C.producthunt,
        to: [ME],
        date: from(14, 5),
        bodyText: 'This week: a roundup of the best new design tools and articles from around the web.',
      }),
    ],
  }),
  thread({
    id: 't-trash-invoice-overdue',
    subject: 'Your invoice is overdue',
    labelIds: ['trash', 'category_updates'],
    messages: [
      msg('t-trash-invoice-overdue', {
        from: C.support,
        to: [ME],
        date: from(20, 1),
        bodyText: 'This is a reminder that invoice #4471 is now 15 days overdue. Please submit payment to avoid a late fee.',
      }),
    ],
  }),
  thread({
    id: 't-trash-lunch',
    subject: 'Lunch next week?',
    labelIds: ['trash', 'category_primary'],
    messages: [
      msg('t-trash-lunch', {
        from: C.maria,
        to: [ME],
        date: from(25, 3),
        bodyText: "Been a while! Free for lunch sometime next week? Would love to catch up.",
      }),
    ],
  }),
  thread({
    id: 't-trash-trial-ending',
    subject: 'Your trial is ending in 3 days',
    labelIds: ['trash', 'category_updates'],
    messages: [
      msg('t-trash-trial-ending', {
        from: C.notion,
        to: [ME],
        date: from(30, 1),
        bodyText: 'Your Notion trial ends in 3 days. Upgrade now to keep access to advanced permissions and unlimited file uploads.',
      }),
    ],
  }),

  // ---------------- SPAM ----------------
  thread({
    id: 't-spam-prize',
    subject: "Congratulations! You've been selected to claim a prize",
    labelIds: ['spam'],
    messages: [
      msg('t-spam-prize', {
        from: C.prize,
        to: [ME],
        date: from(2, 5),
        bodyText: "You've been randomly selected to receive a reward. Click below within 24 hours to claim before it expires.",
      }),
    ],
  }),
  thread({
    id: 't-spam-verify',
    subject: 'URGENT: Verify your account now to avoid suspension',
    labelIds: ['spam'],
    messages: [
      msg('t-spam-verify', {
        from: C.security,
        to: [ME],
        date: from(3, 8),
        bodyText: 'We detected unusual activity on your account. Verify your identity immediately using the link below or your access will be suspended within 24 hours.',
      }),
    ],
  }),
  thread({
    id: 't-spam-meds',
    subject: 'Save 80% on your prescriptions today',
    labelIds: ['spam'],
    messages: [
      msg('t-spam-meds', {
        from: C.pharma,
        to: [ME],
        date: from(5, 2),
        bodyText: 'Huge discounts on brand-name medication, no prescription required. Limited time offer, order now.',
      }),
    ],
  }),
  thread({
    id: 't-spam-sweepstakes',
    subject: "You're our lucky winner this week!",
    labelIds: ['spam'],
    messages: [
      msg('t-spam-sweepstakes', {
        from: C.sweepstakes,
        to: [ME],
        date: from(6, 6),
        bodyText: 'Your email address was entered into our weekly drawing and you are a winner! Respond with your details to claim your prize.',
      }),
    ],
  }),
]

export const SEED_DRAFTS: Thread[] = [
  thread({
    id: 't-draft-budget',
    subject: 'Budget proposal for Q4',
    labelIds: ['draft'],
    messages: [
      msg('t-draft-budget', {
        from: ME,
        to: [C.lucas],
        date: from(0, 3),
        isDraft: true,
        bodyText:
          "Hey Lucas,\n\nPutting together the Q4 budget proposal — wanted to run the headcount numbers by you before I finalize. Thinking we add two engineers and one designer, roughly...",
      }),
    ],
  }),
  thread({
    id: 't-draft-mom',
    subject: '(no subject)',
    labelIds: ['draft'],
    messages: [
      msg('t-draft-mom', {
        from: ME,
        to: [C.mom],
        date: from(1, 1),
        isDraft: true,
        bodyText: "Hi Mom, yes I'll be there Sunday, should I bring",
      }),
    ],
  }),
  thread({
    id: 't-draft-pr-reply',
    subject: 'Re: PR #482 ready for review',
    labelIds: ['draft'],
    messages: [
      msg('t-draft-pr-reply', {
        from: ME,
        to: [C.james],
        date: from(0, 1),
        isDraft: true,
        bodyText: "Taking a look now, will have comments by",
      }),
    ],
  }),
  thread({
    id: 't-draft-standup',
    subject: 'Notes for standup',
    labelIds: ['draft'],
    messages: [
      msg('t-draft-standup', {
        from: ME,
        to: [],
        date: from(2, 0),
        isDraft: true,
        bodyText: "- Finished search reindex fix\n- Reviewing onboarding designs\n- Blocked on:",
      }),
    ],
  }),
]

export function buildSeedThreads(): Thread[] {
  return [...SEED_THREADS, ...SEED_DRAFTS].map((t) => ({
    ...t,
    messages: t.messages.map((m) => ({ ...m })),
  }))
}

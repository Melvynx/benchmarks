export const labels = [
  { name: "Work", color: "#1a73e8" },
  { name: "Finance", color: "#188038" },
  { name: "Receipts", color: "#9334e6" },
  { name: "Travel", color: "#e37400" }
];

export const contacts = [
  { name: "Maya Chen", email: "maya.chen@example.com", initials: "MC", color: "#8e5cc9" },
  { name: "Marcus Webb", email: "marcus@northstar.studio", initials: "MW", color: "#2563a9" },
  { name: "Riley Morgan", email: "riley@northstar.studio", initials: "RM", color: "#16846b" },
  { name: "Elena Rossi", email: "elena@atelierrosso.co", initials: "ER", color: "#cf5b47" },
  { name: "Noah Williams", email: "noah.williams@example.com", initials: "NW", color: "#7258a6" },
  { name: "Sophie Laurent", email: "sophie@fieldnotes.design", initials: "SL", color: "#b84d76" }
];

const me = { name: "Alex Morgan", email: "alex.morgan@example.com", initials: "AM", color: "#0b57d0" };

function message(from, to, time, paragraphs, attachments = []) {
  return { from, to, time, paragraphs, attachments };
}

export const seedMail = [
  {
    id: "m-101",
    folder: "inbox",
    category: "primary",
    sender: contacts[2],
    recipients: [me],
    subject: "Quarterly roadmap review",
    snippet: "I pulled the customer signals into one page. The biggest shift is clear…",
    timestamp: "2026-07-15T09:42:00+03:00",
    unread: true,
    starred: true,
    archived: false,
    labels: ["Work"],
    attachments: [{ name: "Q3-roadmap.pdf", size: "2.4 MB", type: "PDF" }],
    messages: [
      message(contacts[2], [me], "2026-07-14T16:20:00+03:00", [
        "Hi Alex,",
        "I pulled the customer signals, support themes, and product bets into one page. The biggest shift is clear: teams want a faster path from first draft to shared decision.",
        "Could you review the priorities before our session tomorrow? I highlighted the two places where we still need a call."
      ], [{ name: "Q3-roadmap.pdf", size: "2.4 MB", type: "PDF" }]),
      message(me, [contacts[2]], "2026-07-14T17:04:00+03:00", [
        "This is strong. I added notes around the onboarding milestone and moved the reporting work up one slot.",
        "Let’s use the first ten minutes tomorrow to settle the sequencing."
      ]),
      message(contacts[2], [me], "2026-07-15T09:42:00+03:00", [
        "Perfect — I’ve incorporated your notes and shared the updated page with the leads.",
        "See you at 11:00.",
        "Riley"
      ])
    ]
  },
  {
    id: "m-102",
    folder: "inbox",
    category: "primary",
    sender: contacts[0],
    recipients: [me],
    subject: "Lisbon this weekend?",
    snippet: "Found a tiny place near Alfama with a rooftop and exactly two rooms left.",
    timestamp: "2026-07-15T08:18:00+03:00",
    unread: true,
    starred: false,
    archived: false,
    labels: ["Travel"],
    attachments: [{ name: "rooftop.jpg", size: "1.1 MB", type: "JPG" }],
    messages: [
      message(contacts[0], [me], "2026-07-15T08:18:00+03:00", [
        "Found a tiny place near Alfama with a rooftop and exactly two rooms left. It’s a five-minute walk from the market.",
        "If you’re in, I’ll book it after lunch. No elaborate itinerary — good coffee, a long dinner, and the ocean on Sunday.",
        "Maya"
      ], [{ name: "rooftop.jpg", size: "1.1 MB", type: "JPG" }])
    ]
  },
  {
    id: "m-103",
    folder: "inbox",
    category: "updates",
    sender: { name: "Notion", email: "team@makenotion.com", initials: "N", color: "#111111" },
    recipients: [me],
    subject: "Your workspace, this week",
    snippet: "12 pages updated, 4 decisions captured, and one project ready to ship.",
    timestamp: "2026-07-15T07:10:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message({ name: "Notion", email: "team@makenotion.com", initials: "N", color: "#111111" }, [me], "2026-07-15T07:10:00+03:00", [
      "Here’s what moved in your workspace this week.",
      "The Launch plan had 12 updates. Four decisions were captured in Product notes, and the Q3 website refresh moved to Ready to ship.",
      "You spent the most time in Roadmap, Customer interviews, and Weekly planning."
    ])]
  },
  {
    id: "m-104",
    folder: "inbox",
    category: "updates",
    sender: { name: "Vercel", email: "ship@vercel.com", initials: "V", color: "#111111" },
    recipients: [me],
    subject: "Production deployment is ready",
    snippet: "northstar-web was deployed successfully from main in 43 seconds.",
    timestamp: "2026-07-14T22:37:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message({ name: "Vercel", email: "ship@vercel.com", initials: "V", color: "#111111" }, [me], "2026-07-14T22:37:00+03:00", [
      "northstar-web was deployed successfully from main in 43 seconds.",
      "Commit: Refine onboarding handoff · Deployment region: Washington, D.C., USA"
    ])]
  },
  {
    id: "m-105",
    folder: "inbox",
    category: "primary",
    sender: contacts[3],
    recipients: [me],
    subject: "Final menu & guest count",
    snippet: "We’re at 46 guests. I’ve attached the final menu with the vegetarian changes.",
    timestamp: "2026-07-14T18:05:00+03:00",
    unread: false,
    starred: true,
    archived: false,
    labels: [],
    attachments: [{ name: "summer-menu.pdf", size: "864 KB", type: "PDF" }],
    messages: [message(contacts[3], [me], "2026-07-14T18:05:00+03:00", [
      "We’re at 46 guests. I’ve attached the final menu with the vegetarian changes and the revised wine pairing.",
      "The courtyard is confirmed from 18:30. Could you send me the final place cards by Thursday?",
      "Elena"
    ], [{ name: "summer-menu.pdf", size: "864 KB", type: "PDF" }])]
  },
  {
    id: "m-106",
    folder: "inbox",
    category: "social",
    sender: { name: "Slack", email: "notification@slack.com", initials: "S", color: "#611f69" },
    recipients: [me],
    subject: "Riley mentioned you in #product",
    snippet: "The new empty state is in staging — @Alex can you take a final look?",
    timestamp: "2026-07-14T16:51:00+03:00",
    unread: true,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message({ name: "Slack", email: "notification@slack.com", initials: "S", color: "#611f69" }, [me], "2026-07-14T16:51:00+03:00", [
      "Riley Morgan mentioned you in #product:",
      "The new empty state is in staging — @Alex can you take a final look before we merge? I think the calmer copy lands much better."
    ])]
  },
  {
    id: "m-107",
    folder: "inbox",
    category: "updates",
    sender: { name: "Stripe", email: "notifications@stripe.com", initials: "S", color: "#635bff" },
    recipients: [me],
    subject: "Your July payout is on the way",
    snippet: "€4,820.40 will arrive in your bank account by July 17.",
    timestamp: "2026-07-14T13:24:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Finance"],
    attachments: [{ name: "payout-summary.csv", size: "42 KB", type: "CSV" }],
    messages: [message({ name: "Stripe", email: "notifications@stripe.com", initials: "S", color: "#635bff" }, [me], "2026-07-14T13:24:00+03:00", [
      "Your payout of €4,820.40 is on the way and should arrive in your bank account by July 17.",
      "This payout includes 71 payments, 3 refunds, and processing fees for the period ending July 13."
    ], [{ name: "payout-summary.csv", size: "42 KB", type: "CSV" }])]
  },
  {
    id: "m-108",
    folder: "inbox",
    category: "primary",
    sender: contacts[4],
    recipients: [me],
    subject: "Re: Studio keys",
    snippet: "All sorted — Sam has the spare set and will meet you by the side entrance.",
    timestamp: "2026-07-14T10:12:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: [],
    attachments: [],
    messages: [
      message(me, [contacts[4]], "2026-07-13T19:31:00+03:00", ["Do you know who has the spare studio keys? I’m there early tomorrow for the recording."]),
      message(contacts[4], [me], "2026-07-14T10:12:00+03:00", ["All sorted — Sam has the spare set and will meet you by the side entrance at 08:20.", "Good luck with the recording!"])
    ]
  },
  {
    id: "m-109",
    folder: "inbox",
    category: "social",
    sender: { name: "LinkedIn", email: "messages-noreply@linkedin.com", initials: "in", color: "#0a66c2" },
    recipients: [me],
    subject: "7 people viewed your profile",
    snippet: "See where your profile viewers work and what roles they have.",
    timestamp: "2026-07-13T17:46:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: [],
    attachments: [],
    messages: [message({ name: "LinkedIn", email: "messages-noreply@linkedin.com", initials: "in", color: "#0a66c2" }, [me], "2026-07-13T17:46:00+03:00", [
      "Your profile appeared in 29 searches this week and 7 people viewed your profile.",
      "Your most common searcher titles were Product Designer, Founder, and Design Lead."
    ])]
  },
  {
    id: "m-110",
    folder: "inbox",
    category: "updates",
    sender: { name: "GitHub", email: "noreply@github.com", initials: "GH", color: "#24292f" },
    recipients: [me],
    subject: "Security alert resolved in atlas/web",
    snippet: "Dependabot closed an alert affecting undici after your dependency update.",
    timestamp: "2026-07-13T11:32:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message({ name: "GitHub", email: "noreply@github.com", initials: "GH", color: "#24292f" }, [me], "2026-07-13T11:32:00+03:00", [
      "A moderate severity security alert affecting undici was resolved after your dependency update in atlas/web.",
      "No further action is required."
    ])]
  },
  {
    id: "m-111",
    folder: "inbox",
    category: "primary",
    sender: contacts[5],
    recipients: [me],
    subject: "The type study",
    snippet: "Three directions attached. Number two has the restraint we talked about.",
    timestamp: "2026-07-12T15:17:00+03:00",
    unread: true,
    starred: true,
    archived: false,
    labels: ["Work"],
    attachments: [{ name: "type-study.fig", size: "6.8 MB", type: "FIG" }, { name: "notes.pdf", size: "318 KB", type: "PDF" }],
    messages: [message(contacts[5], [me], "2026-07-12T15:17:00+03:00", [
      "Three directions attached. Number two has the restraint we talked about, but I included the warmer serif option as a counterpoint.",
      "My preference: option two for the product, option three for editorial moments. Curious where you land.",
      "Sophie"
    ], [{ name: "type-study.fig", size: "6.8 MB", type: "FIG" }, { name: "notes.pdf", size: "318 KB", type: "PDF" }])]
  },
  {
    id: "m-112",
    folder: "inbox",
    category: "updates",
    sender: { name: "Figma", email: "comments@figma.com", initials: "F", color: "#a259ff" },
    recipients: [me],
    subject: "3 new comments in “Mobile foundations”",
    snippet: "Marcus: This transition feels much more natural now.",
    timestamp: "2026-07-12T09:04:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message({ name: "Figma", email: "comments@figma.com", initials: "F", color: "#a259ff" }, [me], "2026-07-12T09:04:00+03:00", [
      "Marcus: This transition feels much more natural now.",
      "Riley: Could we keep the previous icon size? The new one loses a little weight on mobile.",
      "Sophie: Resolved the spacing note."
    ])]
  },
  {
    id: "m-113",
    folder: "inbox",
    category: "updates",
    sender: { name: "Adobe", email: "mail@mail.adobe.com", initials: "A", color: "#e53935" },
    recipients: [me],
    subject: "Your Adobe receipt",
    snippet: "Thank you for your payment. Invoice AD-88419 is attached.",
    timestamp: "2026-07-11T12:00:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Receipts", "Finance"],
    attachments: [{ name: "invoice-AD-88419.pdf", size: "95 KB", type: "PDF" }],
    messages: [message({ name: "Adobe", email: "mail@mail.adobe.com", initials: "A", color: "#e53935" }, [me], "2026-07-11T12:00:00+03:00", [
      "Thank you for your payment of €67.99. Your Creative Cloud subscription is active through August 11, 2026.",
      "Invoice AD-88419 is attached for your records."
    ], [{ name: "invoice-AD-88419.pdf", size: "95 KB", type: "PDF" }])]
  },
  {
    id: "m-114",
    folder: "sent",
    category: "primary",
    sender: me,
    recipients: [contacts[1]],
    subject: "Monday’s workshop",
    snippet: "Here’s the agenda and the short pre-read for Monday.",
    timestamp: "2026-07-15T08:03:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [{ name: "workshop-agenda.pdf", size: "390 KB", type: "PDF" }],
    messages: [message(me, [contacts[1]], "2026-07-15T08:03:00+03:00", [
      "Hi Marcus,",
      "Here’s the agenda and the short pre-read for Monday. I kept the first half focused on decisions, then left room for the team to work through two prototypes together.",
      "Let me know if you want anything added before Friday."
    ], [{ name: "workshop-agenda.pdf", size: "390 KB", type: "PDF" }])]
  },
  {
    id: "m-115",
    folder: "sent",
    category: "primary",
    sender: me,
    recipients: [contacts[3]],
    subject: "Place cards — final copy",
    snippet: "Attaching the final guest list and table assignments.",
    timestamp: "2026-07-14T19:41:00+03:00",
    unread: false,
    starred: true,
    archived: false,
    labels: [],
    attachments: [{ name: "place-cards.csv", size: "18 KB", type: "CSV" }],
    messages: [message(me, [contacts[3]], "2026-07-14T19:41:00+03:00", ["Attaching the final guest list and table assignments. I’ve marked the two dietary notes in the last column."], [{ name: "place-cards.csv", size: "18 KB", type: "CSV" }])]
  },
  {
    id: "m-116",
    folder: "drafts",
    category: "primary",
    sender: me,
    recipients: [contacts[5]],
    subject: "Re: The type study",
    snippet: "Option two is the right foundation. I’d like to borrow one detail from…",
    timestamp: "2026-07-15T09:12:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    draftBody: "Option two is the right foundation. I’d like to borrow one detail from the warmer direction: the more generous paragraph rhythm.\n\nI’ll leave specific notes in the file this afternoon.",
    messages: []
  },
  {
    id: "m-117",
    folder: "drafts",
    category: "primary",
    sender: me,
    recipients: [],
    subject: "Ideas for August",
    snippet: "A small dinner series / one long train trip / publish the field notes…",
    timestamp: "2026-07-13T21:12:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: [],
    attachments: [],
    draftBody: "A small dinner series\nOne long train trip\nPublish the field notes\nLearn to make the lemon pasta properly",
    messages: []
  },
  {
    id: "m-118",
    folder: "trash",
    category: "updates",
    sender: { name: "Store Weekly", email: "hello@storeweekly.example", initials: "SW", color: "#5f6368" },
    recipients: [me],
    subject: "48-hour summer sale",
    snippet: "Everything you saved is now up to 40% off.",
    timestamp: "2026-07-14T06:48:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: [],
    attachments: [],
    messages: [message({ name: "Store Weekly", email: "hello@storeweekly.example", initials: "SW", color: "#5f6368" }, [me], "2026-07-14T06:48:00+03:00", ["Everything you saved is now up to 40% off through midnight tomorrow."])]
  },
  {
    id: "m-119",
    folder: "trash",
    category: "social",
    sender: { name: "Community Digest", email: "digest@community.example", initials: "CD", color: "#5f6368" },
    recipients: [me],
    subject: "Top conversations from June",
    snippet: "The five discussions your community read most last month.",
    timestamp: "2026-07-01T08:00:00+03:00",
    unread: true,
    starred: false,
    archived: false,
    labels: [],
    attachments: [],
    messages: [message({ name: "Community Digest", email: "digest@community.example", initials: "CD", color: "#5f6368" }, [me], "2026-07-01T08:00:00+03:00", ["The five discussions your community read most last month, plus three thoughtful replies you may have missed."])]
  },
  {
    id: "m-120",
    folder: "inbox",
    category: "social",
    sender: { name: "Dribbble", email: "hello@dribbble.com", initials: "D", color: "#ea4c89" },
    recipients: [me],
    subject: "Sophie Laurent posted new work",
    snippet: "A new identity system for Field Notes is now live.",
    timestamp: "2026-07-10T15:30:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: [],
    attachments: [],
    messages: [message({ name: "Dribbble", email: "hello@dribbble.com", initials: "D", color: "#ea4c89" }, [me], "2026-07-10T15:30:00+03:00", ["Sophie Laurent posted a new identity system for Field Notes. See the marks, type system, and editorial applications."])]
  },
  {
    id: "m-121",
    folder: "inbox",
    category: "updates",
    sender: { name: "Google Calendar", email: "calendar-notification@google.com", initials: "31", color: "#4285f4" },
    recipients: [me],
    subject: "Reminder: Roadmap review at 11:00",
    snippet: "Today · 11:00–11:45 · Northstar Meet",
    timestamp: "2026-07-15T08:00:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message({ name: "Google Calendar", email: "calendar-notification@google.com", initials: "31", color: "#4285f4" }, [me], "2026-07-15T08:00:00+03:00", ["Roadmap review", "Today · 11:00–11:45", "Northstar Meet · Organized by Riley Morgan"])]
  },
  {
    id: "m-122",
    folder: "inbox",
    category: "primary",
    sender: { name: "Avery & Co.", email: "receipts@averyco.example", initials: "A&", color: "#9c6b35" },
    recipients: [me],
    subject: "Receipt for your order #A1843",
    snippet: "Thanks for your order. Your linen notebook ships tomorrow.",
    timestamp: "2026-07-09T11:22:00+03:00",
    unread: false,
    starred: false,
    archived: false,
    labels: ["Receipts"],
    attachments: [{ name: "receipt-A1843.pdf", size: "81 KB", type: "PDF" }],
    messages: [message({ name: "Avery & Co.", email: "receipts@averyco.example", initials: "A&", color: "#9c6b35" }, [me], "2026-07-09T11:22:00+03:00", ["Thanks for your order. Your linen notebook ships tomorrow and should arrive July 12–14."], [{ name: "receipt-A1843.pdf", size: "81 KB", type: "PDF" }])]
  },
  {
    id: "m-123",
    folder: "inbox",
    category: "primary",
    sender: contacts[1],
    recipients: [me],
    subject: "A thought on the workshop",
    snippet: "What if we start with the artifact instead of the introductions?",
    timestamp: "2026-07-08T18:33:00+03:00",
    unread: false,
    starred: true,
    archived: false,
    labels: ["Work"],
    attachments: [],
    messages: [message(contacts[1], [me], "2026-07-08T18:33:00+03:00", [
      "What if we start with the artifact instead of the introductions? Put the draft on the wall, give everyone five quiet minutes, then ask what they notice.",
      "It might get us to the useful tension faster."
    ])]
  }
];

export const currentUser = me;

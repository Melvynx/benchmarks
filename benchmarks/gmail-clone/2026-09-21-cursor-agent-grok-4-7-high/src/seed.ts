import type { Attachment, Contact, Draft, Label, Message, Settings, Thread } from "./types";
import { ME } from "./format";

export const EXTRA_CONTACTS: Contact[] = [
  { name: "Chris Nguyen", email: "chris.nguyen@northwind.dev" },
  { name: "Facilities", email: "facilities@northwind.dev" },
  { name: "Amina Diallo", email: "amina.diallo@northwind.dev" },
];

const jordan: Contact = { name: "Jordan Hale", email: "jordan.hale@northwind.dev" };
const priya: Contact = { name: "Priya Shah", email: "priya.shah@northwind.dev" };
const sam: Contact = { name: "Sam Okonkwo", email: "sam.okonkwo@northwind.dev" };
const lena: Contact = { name: "Lena Vogt", email: "lena.vogt@northwind.dev" };
const helen: Contact = { name: "Helen Chen", email: "helen.chen@gmail.com" };
const alex: Contact = { name: "Alex Rivera", email: "alex.rivera@gmail.com" };
const robin: Contact = { name: "Robin Peck", email: "robin.peck@harborrentals.com" };
const noah: Contact = { name: "Noah Berg", email: "noah@bergstudio.co" };
const erin: Contact = { name: "Erin Walsh", email: "erin.walsh@latticehire.com" };
const ivy: Contact = { name: "Ivy Tran", email: "ivy.tran@clientworks.io" };
const marco: Contact = { name: "Marco Diaz", email: "marco.diaz@northwind.dev" };
const people: Contact = { name: "People Ops", email: "peopleops@northwind.dev" };
const github: Contact = { name: "GitHub", email: "notifications@github.com" };
const linkedin: Contact = { name: "LinkedIn", email: "messages-noreply@linkedin.com" };
const figma: Contact = { name: "Figma", email: "team@figma.com" };
const stripe: Contact = { name: "Stripe", email: "receipts@stripe.com" };
const delta: Contact = { name: "Delta Air Lines", email: "itinerary@delta.com" };
const ups: Contact = { name: "UPS", email: "pkginfo@ups.com" };
const bank: Contact = { name: "First Harbor Bank", email: "alerts@firstharbor.example" };
const calendar: Contact = { name: "Calendar", email: "calendar-notification@northwind.dev" };
const signal: Contact = { name: "Dense Signal", email: "editors@densesignal.com" };
const uniqlo: Contact = { name: "Uniqlo", email: "news@uniqlo.com" };
const notion: Contact = { name: "Notion", email: "team@notion.so" };
const aws: Contact = { name: "Amazon Web Services", email: "no-reply-aws@amazon.com" };
const prize: Contact = { name: "Prize Desk", email: "winner@claim-reward.example" };
const wallet: Contact = { name: "Wallet Support", email: "sync@secure-wallet-check.example" };

const ago = (hours: number) => new Date(Date.now() - hours * 3600_000).toISOString();
const ahead = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();

function file(id: string, name: string, size: number, mime: string): Attachment {
  return { id, name, size, mime };
}

function message(partial: Omit<Message, "id"> & { id: string }): Message {
  return partial;
}

export const defaultSettings = (): Settings => ({
  density: "default",
  theme: "system",
  readingPane: false,
  sortUnreadFirst: false,
  signature: "Maya Chen\nProduct, Northwind",
  signatureOn: true,
});

export const defaultLabels = (): Label[] => [
  { id: "work", name: "Work", color: "#0b57d0" },
  { id: "finance", name: "Finance", color: "#188038" },
  { id: "travel", name: "Travel", color: "#e37400" },
  { id: "personal", name: "Personal", color: "#9334e6" },
  { id: "projects", name: "Projects", color: "#c5221f" },
];

function thread(partial: Thread): Thread {
  return partial;
}

export function createMailbox(): { threads: Thread[]; drafts: Draft[]; labels: Label[]; held: Thread[]; settings: Settings } {
  const threads: Thread[] = [
    thread({
      id: "t-roadmap",
      subject: "Q3 roadmap review — search and draft sync",
      category: "primary",
      labels: ["inbox", "work"],
      starred: true,
      read: false,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-roadmap-1",
          from: jordan,
          to: [ME],
          cc: [lena],
          date: ago(30),
          body: "Maya,\n\nThe Q3 roadmap review is Thursday at 2. I want inbox search and offline draft sync called out as risks, not footnotes.\n\nPlease leave comments on the one-pager before noon tomorrow. The version attached is the one we walked in planning, not the slide dump.\n\nJordan",
          attachments: [file("roadmap-v1", "Roadmap-one-pager.pdf", 482_000, "application/pdf")],
        }),
        message({
          id: "t-roadmap-2",
          from: ME,
          to: [jordan],
          cc: [lena],
          date: ago(24),
          body: "Commented. Two changes before Thursday:\n\n1. Put draft sync behind the label rewrite. We still drop a thread if a label is deleted mid-compose.\n2. The search section promises operators we have not shipped (before:, rfc822msgid:). I'd rather list the six that work.\n\nI'll take the search slide if you take the timeline.",
          quote: "On the previous note, Jordan Hale asked for comments before noon.",
        }),
        message({
          id: "t-roadmap-3",
          from: jordan,
          to: [ME],
          cc: [lena],
          date: ago(2),
          body: "This is the right cut. I accepted both comments and updated the deck.\n\nOne ask: can you present the search slide? I'll take the timeline. Latest PDF is attached so you don't have to dig through Drive.\n\nSee you at 2. Bring the operator list on one slide, not three.",
          attachments: [file("roadmap-v3", "Roadmap-Q3.pdf", 866_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-critique",
      subject: "Design critique notes — reading pane",
      category: "primary",
      labels: ["inbox", "projects"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-critique-1",
          from: priya,
          to: [ME, noah],
          date: ago(6),
          body: "Notes from this morning's critique. The reading pane is doing too much at 1280px: subject, labels, and the first message compete, and the reply box pushes the last paragraph below the fold.\n\nProposal: keep the subject row sticky, collapse every message but the last, and let the reply sit in the page instead of a second floating window.\n\nI marked the spacing issues in the Figma file. Noah, the type ramp is fine. Don't restyle it.",
        }),
        message({
          id: "t-critique-2",
          from: noah,
          to: [priya, ME],
          date: ago(5),
          body: "Agreed on the sticky subject. I pushed a frame called 'Pane / Thursday' with the collapsed rows at 40px. Maya, the unread row in that frame is still pure white — tell me if you want the gray canvas behind it or if inbox rows should stay flat.",
        }),
      ],
    }),
    thread({
      id: "t-migration",
      subject: "Review the thread-index migration before tonight",
      category: "primary",
      labels: ["inbox", "work"],
      starred: false,
      read: false,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-migration-1",
          from: sam,
          to: [ME],
          date: ago(8),
          body: "The preview deploy failed on the label backfill. northwind/mail-web #481 rewrites the thread index off the legacy table, and the job dies when it meets a thread that is both in Trash and still labeled Inbox.\n\nI don't want this to run in prod with that row shape. Can you look at the migration step today? Log excerpt is attached. The failing id is thr_18c2, which is one of the imported Harbor Rentals threads.\n\nIf the fix is 'skip trash', say so and I'll cut the PR down.",
          attachments: [file("migrate-log", "backfill-failure.log", 28_400, "text/plain")],
        }),
      ],
    }),
    thread({
      id: "t-lunch",
      subject: "Sunday lunch — come early if you can",
      category: "primary",
      labels: ["inbox", "personal"],
      starred: true,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-lunch-1",
          from: helen,
          to: [ME],
          date: ago(20),
          body: "Maya,\n\nSunday at the house, 12:30. Your dad is making the scallops and will pretend he invented them. Come early if you want the quiet version of the afternoon — your aunt arrives at 1:15 with the dogs.\n\nBring nothing. If you insist, bring the clementines, not wine. We still have the bottles from last month.\n\nLove,\nMom",
        }),
      ],
    }),
    thread({
      id: "t-lease",
      subject: "Re: Harbor apartment lease renewal",
      category: "primary",
      labels: ["inbox", "personal", "finance"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-lease-1",
          from: robin,
          to: [ME, alex],
          date: ago(240),
          body: "Hello Maya and Alex,\n\nYour lease at 418 Harbor Ave, unit 6, ends October 31. The renewal offer is 14 months at $3,280, which is the same rent. Utilities stay in your names.\n\nSign the attached addendum by September 28 if you want to keep the unit. After that date I have to list it.\n\nRobin Peck\nHarbor Rentals",
          attachments: [file("lease-add", "Harbor-418-addendum.pdf", 220_000, "application/pdf")],
        }),
        message({
          id: "t-lease-2",
          from: alex,
          to: [ME],
          cc: [robin],
          date: ago(200),
          body: "I can live with 14 months. I don't love that the addendum still says we repaint on exit — we already did the north wall in April and Robin signed off in email.\n\nWant me to ask her to strike that sentence, or are you fine initialing it?",
        }),
        message({
          id: "t-lease-3",
          from: ME,
          to: [alex],
          cc: [robin],
          date: ago(190),
          body: "Ask her to strike it. I'll initial once that sentence is gone. Also check the parking line: it still lists spot B12, and they moved us to B7 in June.",
        }),
        message({
          id: "t-lease-4",
          from: robin,
          to: [ME, alex],
          date: ago(26),
          body: "Updated addendum attached. Paint clause removed. Parking is B7. Rent and term are unchanged.\n\nSend it back signed by the 28th and I'll countersign the same day.",
          attachments: [file("lease-add-2", "Harbor-418-addendum-v2.pdf", 228_400, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-recruiter",
      subject: "Northwind conversation — 20 minutes next week?",
      category: "primary",
      labels: ["inbox"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-recruiter-1",
          from: erin,
          to: [ME],
          date: ago(3.2),
          body: "Maya,\n\nI lead search for a series C company building a mail client for support teams. Your note about conversation indexing at the Northwind product talk is the reason I'm writing, not a scraped title.\n\nWould you take 20 minutes next week? I can do Tuesday 9:40 or Wednesday 4:10. No deck. I want to hear what you think is still unsolved in shared inboxes.\n\nErin Walsh\nLattice Hire",
        }),
      ],
    }),
    thread({
      id: "t-proposal",
      subject: "ClientWorks proposal — redlines on the timeline",
      category: "primary",
      labels: ["inbox", "work", "projects"],
      starred: false,
      read: false,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-proposal-1",
          from: ivy,
          to: [ME, marco],
          date: ago(1.1),
          body: "Maya, Marco,\n\nLegal sent the proposal back. They'll accept the fixed fee. They will not accept 'search ships in week 6' as a date, because week 6 depends on their label export and they know that export slips.\n\nI marked a version that says 'search ships 10 business days after we receive the label export.' That's the sentence I want in the contract. The redline PDF is attached.\n\nCan you confirm today? I told them we'd answer before their Thursday standup.",
          attachments: [file("redline", "ClientWorks-SOW-redline.pdf", 640_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-offsite",
      subject: "October offsite agenda, second pass",
      category: "primary",
      labels: ["inbox", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-offsite-1",
          from: marco,
          to: [ME, jordan, priya, sam, lena],
          date: ago(32),
          body: "Second pass of the offsite agenda is below. Location is still the Marin house, Thursday–Friday.\n\nThursday\n10:00 Arrive, no laptops for the first hour\n11:00 Roadmap readout (Jordan, Maya)\n13:30 Working session: the inbox we wish we had\n16:00 Walk, then dinner at 19:00\n\nFriday\n09:30 Support-queue observation\n11:30 Decide what we will not build\n14:00 Trains back\n\nTell me dietary constraints by Friday. I already have Maya down as no shellfish.",
        }),
      ],
    }),
    thread({
      id: "t-oneone",
      subject: "Notes from our 1:1",
      category: "primary",
      labels: ["inbox", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-oneone-1",
          from: lena,
          to: [ME],
          date: ago(50),
          body: "Leaving this in writing so it doesn't evaporate.\n\nYou asked for fewer status meetings. Done: the Monday product sync is now a written update, and I'll only pull you in if a decision is blocked.\n\nYou owe me a one-page hiring bar for the inbox role by the 30th. I'll take a rough version. I don't want a rubric with twelve competencies.\n\nAnd take Thursday afternoon off after the roadmap review. You've been in the migration thread since Sunday.",
        }),
      ],
    }),
    thread({
      id: "t-brand",
      subject: "Three directions for the empty inbox",
      category: "primary",
      labels: ["inbox", "projects"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-brand-1",
          from: noah,
          to: [ME, priya],
          date: ago(4),
          body: "I put three empty states in the 'Inbox zero' page. None of them are illustrations of a person waving.\n\n1. A single line: 'You're all caught up.' No art.\n2. The same line, plus the keyboard shortcut for compose.\n3. A quiet list of the last three things you archived, so zero doesn't feel like the mail vanished.\n\nI prefer 3. Priya prefers 1. Maya, pick one and I'll stop drawing the other two. File is in Figma, page 'Empty'.",
        }),
      ],
    }),
    thread({
      id: "t-benefits",
      subject: "Benefits enrollment closes Friday",
      category: "primary",
      labels: ["inbox", "work", "finance"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-benefits-1",
          from: people,
          to: [ME],
          date: ago(6.5),
          body: "Enrollment closes Friday at 6pm Pacific. You have not confirmed medical.\n\nYour current election (Anthem PPO, employee only) will roll over if you do nothing. Dental and the commuter benefit will not. Last year the commuter benefit lapsed because the form was saved and not submitted.\n\nThe form is in the people portal under Benefits → 2026. Reply to this note if the portal locks you out again — it did that to three people in Design this morning.",
        }),
      ],
    }),
    thread({
      id: "t-shipped",
      subject: "Shipped the label-delete fix",
      category: "primary",
      labels: ["inbox", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-shipped-1",
          from: jordan,
          to: [ME, sam],
          date: ago(76),
          body: "The fix is on main. Deleting a label no longer drops the open draft; the label chip disappears and the draft stays put.\n\nSam, I left the migration assertion you asked for. Maya, you can take this off the Thursday risk slide.",
        }),
        message({
          id: "t-shipped-2",
          from: sam,
          to: [jordan, ME],
          date: ago(74),
          body: "Verified on the preview. I deleted 'Temp' while a draft was open, refreshed, and the draft was still in Drafts with the body intact. Good.",
        }),
      ],
    }),
    thread({
      id: "t-garden",
      subject: "The tomatoes finally did something",
      category: "primary",
      labels: ["inbox", "personal"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-garden-1",
          from: helen,
          to: [ME],
          date: ago(110),
          body: "The Early Girls that did nothing in July are suddenly serious. I picked a bowl this morning and your dad has already planned a sauce he will oversalt.\n\nCome take some on Sunday if you want them. They will not survive the week on the counter, and I refuse to can anything.",
          attachments: [file("tomatoes", "garden-tuesday.jpg", 1_840_000, "image/jpeg")],
        }),
      ],
    }),
    thread({
      id: "t-utilities",
      subject: "Utilities for September",
      category: "primary",
      labels: ["inbox", "personal", "finance"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-utilities-1",
          from: alex,
          to: [ME],
          date: ago(120),
          body: "PG&E was $86.40 and the water bill was $41.10. I paid both from the joint account.\n\nYour half is $63.75. No rush — fold it into October if that's easier. I attached the two PDFs so we're not reconstructing this in March.",
          attachments: [
            file("pge", "PGE-september.pdf", 96_000, "application/pdf"),
            file("water", "Water-september.pdf", 88_000, "application/pdf"),
          ],
        }),
      ],
    }),
    thread({
      id: "t-github-review",
      subject: "[northwind/mail-web] Review requested: #481 thread index",
      category: "social",
      labels: ["inbox"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-github-review-1",
          from: github,
          to: [ME],
          date: ago(1.5),
          body: "sam.okonkwo requested your review on northwind/mail-web #481.\n\nmigrate thread index off the legacy table\n\nThe preview check is red. Sam asked you to look at the migration step before it runs against production. 14 files changed, +612 −240.",
        }),
      ],
    }),
    thread({
      id: "t-linkedin",
      subject: "Noah Berg sent you a message",
      category: "social",
      labels: ["inbox"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-linkedin-1",
          from: linkedin,
          to: [ME],
          date: ago(10),
          body: "Noah Berg sent a message:\n\n'Maya — the empty-state frames are in the shared file, not in a post. Ignoring LinkedIn after this. If the message notification is the only way their UI will tell you, so be it.'\n\nReply on LinkedIn. This mailbox cannot send that reply for you.",
        }),
      ],
    }),
    thread({
      id: "t-figma",
      subject: "Priya Shah commented on Inbox / Reading pane",
      category: "social",
      labels: ["inbox", "projects"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-figma-1",
          from: figma,
          to: [ME],
          date: ago(52),
          body: "Priya Shah commented on Inbox / Reading pane:\n\n'The star and the checkbox are too close at compact density. Give the star the row, not a 16px slot it shares with the hover toolbar.'\n\nOpen in Figma to reply. 3 other comments are unresolved on that page.",
        }),
      ],
    }),
    thread({
      id: "t-ci",
      subject: "[northwind/mail-web] CI failed on main",
      category: "social",
      labels: ["inbox", "work"],
      starred: false,
      read: false,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-ci-1",
          from: github,
          to: [ME],
          date: ago(0.4),
          body: "Build failed on main at 7:41am.\n\nmail-web / typecheck — failed in src/search/operators.ts\nThe assertion expected 'has:attachment' to ignore trash. A trashed receipt still matches.\n\nCommit 8c21ae by sam.okonkwo. This is the third red main build this week, all in the search suite.",
        }),
      ],
    }),
    thread({
      id: "t-signal",
      subject: "Dense Signal: the queue is the product",
      category: "promotions",
      labels: ["inbox"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-signal-1",
          from: signal,
          to: [ME],
          date: ago(15),
          body: "This week: a long interview with a support lead who deleted her inbox categories and went back to one list. She says the tabs were sorting mail the company wanted her to see, not the mail she needed to answer.\n\nAlso: a short note on snooze. People use it as a second inbox, then never open that inbox. If your snooze view doesn't show a count, it is a drawer.\n\n— The editors",
        }),
      ],
    }),
    thread({
      id: "t-uniqlo",
      subject: "Extra 20% off flannel, today only",
      category: "promotions",
      labels: ["inbox"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-uniqlo-1",
          from: uniqlo,
          to: [ME],
          date: ago(28),
          body: "Maya, the flannel overshirts you looked at last week are an extra 20% off until midnight. In-store sizes are patchy. The website still has the navy in S.\n\nThis is a promotion. It will not follow you to Sent if you ignore it.",
        }),
      ],
    }),
    thread({
      id: "t-notion",
      subject: "New templates for product specs",
      category: "promotions",
      labels: ["inbox"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-notion-1",
          from: notion,
          to: [ME],
          date: ago(200),
          body: "A set of product-spec templates landed in the gallery: one-pager, risk log, and a decision record that is just a date, a sentence, and a name.\n\nYou already have a decision record. You don't need a second one. Unsubscribe is at the bottom of their real emails; this copy lives entirely in your sample mailbox.",
        }),
      ],
    }),
    thread({
      id: "t-summit",
      subject: "You're invited: AWS Summit workshops",
      category: "promotions",
      labels: ["inbox", "work"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-summit-1",
          from: aws,
          to: [ME],
          date: ago(60),
          body: "Workshops in San Francisco on October 16. The useful one is 'Searching tenant data without standing up a second cluster.' The keynote is optional and you know it.\n\nRegistration is free and will absolutely email you three reminders. The calendar hold is not included.",
        }),
      ],
    }),
    thread({
      id: "t-stripe",
      subject: "Your receipt from Figma #1842-2291",
      category: "updates",
      labels: ["inbox", "finance", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-stripe-1",
          from: stripe,
          to: [ME],
          date: ago(9),
          body: "Receipt for Northwind's Figma organization plan.\n\nAmount paid: $75.00\nDate: this morning\nPayment method: Visa •• 4242\nInvoice: 1842-2291\n\nThe seat count is 12. If that's wrong, the invoice is the place to notice, not the credit card statement in three weeks.",
          attachments: [file("stripe-invoice", "Invoice-1842-2291.pdf", 54_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-delta",
      subject: "Your trip to SFO on Oct 9",
      category: "updates",
      labels: ["inbox", "travel"],
      starred: true,
      read: true,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-delta-1",
          from: delta,
          to: [ME],
          date: ago(40),
          body: "You're confirmed on Delta 532, Thursday Oct 9.\n\nDepart SEA 7:40am\nArrive SFO 9:48am\nSeat 14A\nConfirmation HX4Q2M\n\nThe offsite house is a 40-minute rideshare from SFO if you land on time, which this flight sometimes does. Bag is carry-on. No hotel — you're in the house with everyone else.",
          attachments: [file("itin", "Delta-HX4Q2M.pdf", 120_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-ups",
      subject: "Delivered: package from MUJI",
      category: "updates",
      labels: ["inbox", "personal"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-ups-1",
          from: ups,
          to: [ME],
          date: ago(18),
          body: "Delivered today at 2:14pm to the front desk at 418 Harbor Ave.\n\nTracking 1Z 884 220 03 4412 8\nFrom MUJI\nSigned for by 'FRONT DESK'\n\nIf the front desk says they don't have it, they put it on the shelf under the mailboxes, not behind the desk.",
        }),
      ],
    }),
    thread({
      id: "t-bank",
      subject: "Your September statement is ready",
      category: "updates",
      labels: ["inbox", "finance", "personal"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-bank-1",
          from: bank,
          to: [ME],
          date: ago(22),
          body: "Your checking statement for September is ready. Ending balance $4,218.06.\n\nTwo items worth a look: the Delta charge posted as two amounts ($186.40 and $31.20) because the seat upgrade settled later, and a $12.00 hold from the Marin house grocery run hasn't posted.\n\nWe will not link you to a sign-in page from this sample. The PDF is the statement.",
          attachments: [file("statement", "Checking-September.pdf", 310_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-calendar",
      subject: "Invitation: Roadmap review @ Thu 2:00pm",
      category: "updates",
      labels: ["inbox", "work"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-calendar-1",
          from: calendar,
          to: [ME],
          cc: [jordan, lena, priya],
          date: ago(7),
          body: "Jordan Hale invited you to Roadmap review.\n\nThursday, 2:00–3:10pm\nNorthwind HQ, room 4 / also on the video link in the invite\n\nAgenda lives in the Q3 roadmap thread. You're down to present the search slide. Lena is optional and already accepted.",
        }),
      ],
    }),
    thread({
      id: "t-billing",
      subject: "AWS billing alert: 80% of the monthly budget",
      category: "updates",
      labels: ["inbox", "finance", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-billing-1",
          from: aws,
          to: [ME],
          date: ago(90),
          body: "The Northwind preview account has spent 80% of its $400 monthly budget.\n\nMost of it is the search-cluster experiment Sam left running over the weekend. The cluster id is srch-preview-03. It is not serving traffic. It is also not free.\n\nThis alert will not shut it down. Someone with the console password has to.",
        }),
      ],
    }),
    thread({
      id: "t-redlines-snooze",
      subject: "Follow up: contract redlines with ClientWorks",
      category: "primary",
      labels: ["work", "projects"],
      starred: false,
      read: true,
      important: true,
      snoozedUntil: ahead(20),
      messages: [
        message({
          id: "t-redlines-snooze-1",
          from: ivy,
          to: [ME],
          date: ago(70),
          body: "Parking this with you. Legal accepted the fee and rejected the date. I don't need an answer tonight — snooze it until you have an hour, then tell me whether '10 business days after the label export' is a sentence you can defend.\n\nIf you can't defend it, say what you can defend. Don't leave me with 'soon'.",
        }),
      ],
    }),
    thread({
      id: "t-vendor",
      subject: "Vendor quote for the offsite dinner",
      category: "primary",
      labels: ["work"],
      starred: true,
      read: true,
      important: false,
      snoozedUntil: ahead(70),
      messages: [
        message({
          id: "t-vendor-1",
          from: marco,
          to: [ME],
          date: ago(14),
          body: "The Marin caterer came back at $68 a head, family style, shellfish on the side so you can actually eat. They need a yes by next Wednesday or they give the night to a wedding.\n\nI snoozed the decision onto your list because you're the one who knows the dietary list. Quote is attached.",
          attachments: [file("catering", "Marin-table-quote.pdf", 140_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-standup",
      subject: "Notes from standup",
      category: "primary",
      labels: ["sent", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-standup-1",
          from: ME,
          to: [jordan, sam, priya],
          date: ago(5),
          body: "Three things from standup, so they exist somewhere other than the call:\n\n• Sam is blocked on the trash/inbox row in the backfill. I'm looking at it today.\n• Priya's reading-pane notes are the plan, not a suggestion.\n• I'm presenting the search slide Thursday. Jordan has the timeline.\n\nNo other blockers. I'll be offline from 3 to 4 for the benefits form, which I have already saved once and not submitted.",
        }),
      ],
    }),
    thread({
      id: "t-headcount",
      subject: "Re: hiring bar for the inbox role",
      category: "primary",
      labels: ["sent", "work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-headcount-1",
          from: lena,
          to: [ME],
          date: ago(80),
          body: "Send me the hiring bar as a page, not a spreadsheet. I want to know what this person has shipped, and what you will not train.",
        }),
        message({
          id: "t-headcount-2",
          from: ME,
          to: [lena],
          date: ago(27),
          body: "One page, as asked.\n\nThey have shipped a real inbox or a real queue. Not a settings screen that sits next to one. They can defend a search syntax without adding operators for the demo.\n\nI will not train taste for empty states, and I will not train the habit of reading a thread before changing its labels.\n\nI'll turn this into the job post after Thursday.",
        }),
      ],
    }),
    thread({
      id: "t-timeline-sent",
      subject: "Updated ClientWorks timeline",
      category: "primary",
      labels: ["sent", "work", "projects"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-timeline-sent-1",
          from: ME,
          to: [ivy],
          cc: [marco],
          date: ago(80),
          body: "Ivy,\n\nAttached is the timeline with search tied to the label export, not to a calendar week. If the export lands on a Friday, the ten business days start Monday.\n\nMarco is on cc because the offsite dinner and this contract are trying to occupy the same Wednesday.",
          attachments: [file("timeline", "ClientWorks-timeline.pdf", 210_000, "application/pdf")],
        }),
      ],
    }),
    thread({
      id: "t-webinar",
      subject: "Your recording of 'Inbox zero in 14 days'",
      category: "promotions",
      labels: ["trash"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-webinar-1",
          from: signal,
          to: [ME],
          date: ago(400),
          body: "The recording is ready. It is forty minutes of someone renaming folders. You deleted it on purpose.",
        }),
      ],
    }),
    thread({
      id: "t-old-sale",
      subject: "We saved your cart",
      category: "promotions",
      labels: ["trash"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-old-sale-1",
          from: uniqlo,
          to: [ME],
          date: ago(800),
          body: "You left a navy overshirt in a cart in March. The shirt is gone. The reminder stayed, until you threw the reminder away.",
        }),
      ],
    }),
    thread({
      id: "t-prize",
      subject: "You have been selected for a prepaid reward",
      category: "promotions",
      labels: ["spam"],
      starred: false,
      read: false,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-prize-1",
          from: prize,
          to: [ME],
          date: ago(12),
          body: "MAYA CHEN this is your final notice to claim a prepaid reward of $840. Reply with your date of birth and the mailbox password to release the transfer.\n\nThis is spam. Reporting it keeps it out of the inbox. Nothing in here is a real prize.",
        }),
      ],
    }),
    thread({
      id: "t-wallet",
      subject: "Action required: wallet sync interrupted",
      category: "updates",
      labels: ["spam"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-wallet-1",
          from: wallet,
          to: [ME],
          date: ago(36),
          body: "We detected an interrupted sync on your wallet. Confirm your recovery phrase to resume. The phrase field below is not a form, and this sender is not your bank.\n\nMarked as spam so it stays out of Primary.",
        }),
      ],
    }),
    thread({
      id: "t-retro",
      subject: "Retro notes — what we keep",
      category: "primary",
      labels: ["work"],
      starred: false,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-retro-1",
          from: sam,
          to: [ME, jordan],
          date: ago(300),
          body: "Archived on purpose. The only note worth keeping: we ship the operator when the test exists, not when the slide needs it.\n\nEverything else from that retro was status.",
        }),
      ],
    }),
    thread({
      id: "t-logo",
      subject: "Logo finals, for the record",
      category: "primary",
      labels: ["projects"],
      starred: true,
      read: true,
      important: false,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-logo-1",
          from: priya,
          to: [ME],
          date: ago(500),
          body: "Final mark is the four-color envelope, wordmark in the product gray, nothing else in the header. Archived so it stops surfacing in Inbox and still turns up in search.\n\nSVG attached.",
          attachments: [file("logo", "mark.svg", 4_200, "image/svg+xml")],
        }),
      ],
    }),
  ];

  const held: Thread[] = [
    thread({
      id: "t-moved",
      subject: "Can we move the review to 4?",
      category: "primary",
      labels: ["inbox", "work"],
      starred: false,
      read: false,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-moved-1",
          from: jordan,
          to: [ME, lena],
          date: ago(0.05),
          body: "Lena has a conflict at 2. Can we move the roadmap review to 4:00 today, same room? The search slide still fits. I need a yes or a no before 11 so I can rebook the room.\n\nIf 4 doesn't work, we do it Friday morning and I would rather not.",
        }),
      ],
    }),
    thread({
      id: "t-dispute",
      subject: "A payment was disputed",
      category: "updates",
      labels: ["inbox", "finance", "work"],
      starred: false,
      read: false,
      important: true,
      snoozedUntil: null,
      messages: [
        message({
          id: "t-dispute-1",
          from: stripe,
          to: [ME],
          date: ago(0.02),
          body: "A customer disputed the $75.00 Figma charge on Visa •• 4242. The reason code is 'product not received', which is a strange thing to say about a seat you used this morning.\n\nYou have until the 30th to submit the invoice. The invoice is already in the receipt thread. This note arrived because you checked for new mail.",
          attachments: [file("dispute", "Dispute-1842.pdf", 46_000, "application/pdf")],
        }),
      ],
    }),
  ];

  const drafts: Draft[] = [
    {
      id: "d-erin",
      mode: "new",
      to: [erin.email],
      cc: [],
      bcc: [],
      subject: "Re: Northwind conversation",
      bodyHtml: "<p>Erin,</p><p>Tuesday at 9:40 works. I'll keep it to the shared-inbox problem and skip the tour of our stack.</p>",
      attachments: [],
      confidential: false,
      scheduledFor: null,
      showCc: false,
      showBcc: false,
      updatedAt: ago(1),
    },
    {
      id: "d-lease",
      threadId: "t-lease",
      messageId: "t-lease-4",
      mode: "replyAll",
      to: [robin.email, alex.email],
      cc: [],
      bcc: [],
      subject: "Re: Harbor apartment lease renewal",
      bodyHtml: "<p>Robin, Alex,</p><p>We'll sign v2. Spot B7 is correct and the paint sentence is gone. I'll send the signed PDF tomorrow morning.</p>",
      quote: "On the latest note, Robin Peck sent the updated addendum.",
      attachments: [],
      confidential: false,
      scheduledFor: null,
      showCc: false,
      showBcc: false,
      updatedAt: ago(3),
    },
    {
      id: "d-menu",
      mode: "new",
      to: [marco.email],
      cc: [],
      bcc: [],
      subject: "Offsite menu",
      bodyHtml: "<p>Marco,</p><p>Yes on the Marin caterer if they keep shellfish on the side. Add Amina as no nuts. I'll confirm the headcount after Lena's plus-one answers.</p>",
      attachments: [],
      confidential: false,
      scheduledFor: ahead(26),
      showCc: false,
      showBcc: false,
      updatedAt: ago(2),
    },
  ];

  const ids = new Set<string>();
  for (const item of [...threads, ...held]) {
    if (ids.has(item.id)) throw new Error(`Duplicate thread ${item.id}`);
    ids.add(item.id);
  }

  return { threads, drafts, labels: defaultLabels(), held, settings: defaultSettings() };
}

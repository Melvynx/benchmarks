import type { Attachment, CalendarInvite, Category, Contact, Draft, Label, Message, Thread } from "./types";
import { ME, kindFromName, textToHtml, time } from "./format";

const c = (name: string, email: string): Contact => ({ name, email });

export const People = {
  priya: c("Priya Raman", "priya@fieldnote.io"),
  marcus: c("Marcus Chen", "marcus.chen@fieldnote.io"),
  wren: c("Wren Alvarez", "wren@fieldnote.io"),
  hana: c("Hana Suzuki", "hana.suzuki@fieldnote.io"),
  elena: c("Elena Rossi", "elena@studiorossi.it"),
  aisha: c("Aisha Bello", "aisha@northbeam.vc"),
  noah: c("Noah Kim", "noah.kim@harborresidences.com"),
  mom: c("Linda Carter", "linda.carter@outlook.com"),
  theo: c("Theo Carter", "theo@carter.family"),
  dana: c("Dana Whitfield", "dana.w@fastmail.com"),
  jonas: c("Jonas Weber", "jonas@halcyonlabs.com"),
  ines: c("Inês Duarte", "ines.duarte@gmail.com"),
  mira: c("Mira Framing Co.", "hello@miraframing.com"),
  ravi: c("Ravi Patel", "ravi@patelcpa.com"),
  okafor: c("Bayview Family Clinic", "appointments@bayviewclinic.org"),
  github: c("GitHub", "notifications@github.com"),
  linear: c("Linear", "digest@linear.app"),
  vercel: c("Vercel", "notifications@vercel.com"),
  figma: c("Figma", "no-reply@figma.com"),
  stripe: c("Stripe", "receipts@stripe.com"),
  notion: c("Notion Team", "team@makenotion.com"),
  aerolis: c("Aerolis Airlines", "bookings@aerolis.air"),
  staylio: c("Staylio", "hello@staylio.com"),
  meridian: c("Meridian Bank", "statements@meridianbank.com"),
  ridely: c("Ridely Receipts", "receipts@ridely.app"),
  frontend: c("Frontend Weekly", "issue@frontendweekly.dev"),
  linkedin: c("LinkedIn", "messages-noreply@linkedin.com"),
  strava: c("Strava", "no-reply@strava.com"),
  producthunt: c("Product Hunt", "hello@producthunt.com"),
  northfold: c("Northfold Outfitters", "news@northfold.co"),
  brewline: c("Brewline Coffee", "hello@brewline.coffee"),
  kinfolk: c("Kinfolk Home", "studio@kinfolkhome.com"),
  loop: c("Loop Audio", "offers@loopaudio.com"),
  meetup: c("Meetup", "info@meetup.com"),
  hr: c("Fieldnote People Team", "people@fieldnote.io"),
  spam1: c("Rewards Center", "claim@rewards-center-winner.biz"),
  spam2: c("Account Security", "security@acc0unt-verify.net"),
  spam3: c("Dr. James Okoro", "jokoro.funds@protonmail.xyz"),
  webinar: c("DesignOps Summit", "events@designopssummit.com"),
  passport: c("Travel.State Notices", "noreply@passports-notice.gov"),
  bookclub: c("Hollis Grant", "hollis.grant@fastmail.com"),
};

export const seedLabels: Label[] = [
  { id: "work", name: "Work", color: "#4285f4" },
  { id: "design", name: "Design", color: "#e91e63" },
  { id: "personal", name: "Personal", color: "#16a765" },
  { id: "travel", name: "Travel", color: "#fb8c00" },
  { id: "finance", name: "Finance", color: "#8e24aa" },
  { id: "receipts", name: "Receipts", color: "#78909c" },
];

type SeedAttachment = [name: string, kb: number, hue?: number];

interface SeedMsg {
  from: Contact;
  to?: Contact[];
  cc?: Contact[];
  ago: number;
  text?: string;
  html?: string;
  quote?: string;
  files?: SeedAttachment[];
  invite?: Omit<CalendarInvite, "start" | "end"> & { weekday: number; hour: number; hours: number };
}

export interface SeedThread {
  id: string;
  subject: string;
  cat?: Category;
  labels?: string[];
  starred?: boolean;
  important?: boolean;
  unread?: boolean;
  inbox?: boolean;
  trashed?: boolean;
  spam?: boolean;
  snoozeIn?: number;
  msgs: SeedMsg[];
}

const M = 1;
const H = 60;
const D = 60 * 24;

function promo(color: string, eyebrow: string, headline: string, body: string, cta: string) {
  return `<div style="max-width:560px;margin:0 auto;font-family:inherit">
<div style="background:${color};color:#fff;border-radius:16px;padding:36px 32px;text-align:center">
<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">${eyebrow}</div>
<div style="font-size:30px;font-weight:700;line-height:1.15;margin:12px 0 10px">${headline}</div>
<div style="font-size:15px;opacity:.92;line-height:1.5">${body}</div>
<div style="display:inline-block;margin-top:22px;background:#fff;color:${color};font-weight:600;padding:11px 22px;border-radius:999px">${cta}</div>
</div>
<p style="font-size:12px;color:#80868b;text-align:center;margin-top:18px">You're receiving this because you subscribed. Unsubscribe · Preferences</p>
</div>`;
}

function card(title: string, rows: [string, string][], foot = "") {
  return `<div style="max-width:560px;border:1px solid rgba(128,134,139,.3);border-radius:12px;padding:20px 24px">
<div style="font-size:18px;font-weight:600;margin-bottom:14px">${title}</div>
<table style="width:100%;border-collapse:collapse;font-size:14px">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:7px 0;color:#80868b;border-top:1px solid rgba(128,134,139,.18)">${k}</td><td style="padding:7px 0;text-align:right;border-top:1px solid rgba(128,134,139,.18);font-weight:500">${v}</td></tr>`,
    )
    .join("")}</table>${foot ? `<p style="font-size:13px;color:#80868b;margin-top:14px">${foot}</p>` : ""}</div>`;
}

export const seedThreads: SeedThread[] = [
  {
    id: "t-atlas-go",
    subject: "Atlas launch — final go/no-go on Thursday",
    labels: ["work"],
    important: true,
    unread: true,
    msgs: [
      {
        from: People.priya,
        to: [ME, People.marcus],
        cc: [People.wren],
        ago: 5 * H,
        text: `Hi both,\n\nWe're on track for the Atlas public launch next Tuesday. I'd like to lock the go/no-go on Thursday at 2pm so marketing has the weekend to prep.\n\nOpen items I'm tracking:\n• Sync queue race condition (Marcus) — fix in review\n• Onboarding illustrations round 2 (Sam / Elena)\n• Pricing page copy sign-off (me)\n\nChecklist attached. Shout if anything's missing.\n\nPriya`,
        files: [["Atlas_Launch_Checklist.pdf", 412]],
      },
      {
        from: ME,
        to: [People.priya, People.marcus],
        cc: [People.wren],
        ago: 4 * H,
        text: `Thanks Priya — Elena is sending round 2 this afternoon. I'll review tonight and we should be able to drop them into the build Wednesday.\n\nOne more item for the list: the empty-state for shared workspaces still uses the old illustration. Small, but worth catching.\n\nSam`,
      },
      {
        from: People.marcus,
        to: [People.priya, ME],
        cc: [People.wren],
        ago: 38 * M,
        text: `The sync queue fix is up as #482. I reproduced the race with a stress test and it's clean after 10k runs. Hana is reviewing now.\n\nIf CI stays green I'm a "go" from the engineering side.\n\n— Marcus`,
      },
    ],
  },
  {
    id: "t-elena-illos",
    subject: "Illustrations for onboarding — round 2",
    labels: ["design", "work"],
    starred: true,
    msgs: [
      {
        from: ME,
        to: [People.elena],
        ago: 2 * D + 3 * H,
        text: `Hi Elena,\n\nThe team loved round 1. For round 2, could we push the palette slightly warmer and give the "invite teammates" scene a bit more motion? Everything else is spot on.\n\nThanks!\nSam`,
      },
      {
        from: People.elena,
        to: [ME],
        ago: 2 * H + 12 * M,
        text: `Ciao Sam,\n\nHere's round 2! I warmed up the palette (the peach is now closer to the brand coral) and reworked the invite scene with paper planes crossing between the two desks.\n\nI also exported everything at 2x and 3x. Let me know if you want the source files as well.\n\nUn abbraccio,\nElena`,
        files: [
          ["onboarding-01-welcome.png", 1843, 18],
          ["onboarding-02-invite.png", 2210, 200],
          ["onboarding-03-done.png", 1602, 140],
        ],
      },
    ],
  },
  {
    id: "t-aisha-coffee",
    subject: "Coffee next week?",
    important: true,
    unread: true,
    msgs: [
      {
        from: People.aisha,
        to: [ME],
        ago: 3 * H + 40 * M,
        text: `Hi Sam,\n\nI saw the Atlas teaser Priya posted — looks fantastic. I'll be in the Mission next Wednesday and Thursday; any chance you're free for a coffee? I'd love to hear how the design system work landed.\n\nBest,\nAisha\n\n—\nAisha Bello · Partner, Northbeam Ventures`,
      },
    ],
  },
  {
    id: "t-gh-482",
    subject: "[fieldnote/atlas] Fix race in sync queue (#482)",
    cat: "updates",
    labels: ["work"],
    unread: true,
    msgs: [
      {
        from: People.github,
        to: [ME],
        ago: 55 * M,
        html: `<p><b>@marcuschen</b> requested your review on: <b>fieldnote/atlas#482</b> Fix race in sync queue.</p><p>This PR serializes writes to the pending-ops table behind a per-workspace mutex and adds a regression test that runs 10k concurrent enqueue/flush cycles.</p><div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12.5px;background:rgba(128,134,139,.1);border-radius:8px;padding:12px 14px;line-height:1.6">packages/sync/src/queue.ts <span style="color:#188038">+48</span> <span style="color:#d93025">−17</span><br>packages/sync/test/queue.race.test.ts <span style="color:#188038">+112</span></div><p style="color:#80868b;font-size:12px">— Reply to this email directly or view it on GitHub. You are receiving this because your review was requested.</p>`,
      },
      {
        from: People.github,
        to: [ME],
        ago: 22 * M,
        html: `<p><b>@hanasuzuki</b> approved these changes.</p><blockquote style="border-left:3px solid rgba(128,134,139,.4);margin:0;padding-left:12px;color:inherit">Nice — the mutex keyed on workspace id is exactly right. Left one nit about the test timeout but it's non-blocking. 🚢</blockquote><p style="color:#80868b;font-size:12px">— Reply to this email directly or view it on GitHub.</p>`,
      },
    ],
  },
  {
    id: "t-vercel-fail",
    subject: "Failed preview deployment on atlas-web",
    cat: "updates",
    unread: true,
    msgs: [
      {
        from: People.vercel,
        to: [ME],
        ago: 1 * H + 5 * M,
        html: card(
          "❌ Deployment failed",
          [
            ["Project", "atlas-web"],
            ["Branch", "sam/onboarding-illos"],
            ["Commit", "a41f9c2 · swap onboarding art"],
            ["Error", "Module not found: ./onboarding-04.png"],
          ],
          "View build logs in the Vercel dashboard to see the full output.",
        ),
      },
    ],
  },
  {
    id: "t-invite-review",
    subject: "Invitation: Atlas launch review @ Thu 2pm – 3pm",
    labels: ["work"],
    msgs: [
      {
        from: People.priya,
        to: [ME, People.marcus, People.wren, People.hana],
        ago: 4 * H + 50 * M,
        text: `Priya Raman has invited you to a meeting.\n\nAgenda: go/no-go for Tuesday's launch, open risks, comms plan.`,
        files: [["invite.ics", 2]],
        invite: {
          title: "Atlas launch review",
          weekday: 4,
          hour: 14,
          hours: 1,
          location: "Fieldnote HQ — Room Tamarack / Meet link",
          organizer: People.priya,
        },
      },
    ],
  },
  {
    id: "t-lease",
    subject: "Lease renewal for Unit 4B",
    labels: ["personal", "finance"],
    unread: true,
    msgs: [
      {
        from: People.noah,
        to: [ME],
        ago: 7 * H,
        text: `Hello Sam,\n\nYour current lease for Unit 4B ends on November 30. We'd be glad to have you stay! The renewal offer is attached — a 12-month term at the current rate plus 3%, or a 6-month term at +5%.\n\nPlease sign and return by October 15 to lock in the rate. Happy to answer any questions.\n\nWarm regards,\nNoah Kim\nProperty Manager, Harbor Residences`,
        files: [["Lease_Renewal_Unit4B_2027.pdf", 286]],
      },
    ],
  },
  {
    id: "t-mom-photos",
    subject: "Photos from Sunday 📷",
    labels: ["personal"],
    starred: true,
    msgs: [
      {
        from: People.mom,
        to: [ME, People.theo],
        ago: 1 * D + 2 * H,
        text: `Hi sweethearts,\n\nIt was so lovely having you both over. Here are a few photos — your dad insists the one by the lemon tree is the best one he has ever taken.\n\nLove,\nMom`,
        files: [
          ["IMG_4021.jpg", 3120, 45],
          ["IMG_4025.jpg", 2984, 95],
          ["IMG_4031.jpg", 3342, 30],
          ["IMG_4040.jpg", 2711, 210],
        ],
      },
      {
        from: People.theo,
        to: [People.mom, ME],
        ago: 22 * H,
        text: `Dad's right, the lemon tree one is great. Framing it for your birthday, Mom. (Sam, pretend you didn't read that.)`,
      },
    ],
  },
  {
    id: "t-lisbon",
    subject: "Lisbon plan — Oct 16–20?",
    labels: ["travel", "personal"],
    msgs: [
      {
        from: People.theo,
        to: [ME],
        cc: [People.ines],
        ago: 3 * D + 5 * H,
        text: `Okay, flights are cheap for Oct 16–20. Inês says she can host us for the first two nights and then we could do Sintra for a day.\n\nAre you in?`,
      },
      {
        from: ME,
        to: [People.theo],
        cc: [People.ines],
        ago: 3 * D + 2 * H,
        text: `I'm in! Booking now. Inês, thank you — we'll bring pastries (or whatever the Portuguese equivalent of bringing pastries to Portugal is).`,
      },
      {
        from: People.ines,
        to: [People.theo, ME],
        ago: 2 * D + 20 * H,
        text: `Hahaha, bring nothing, I will feed you. I made a little list of places — the tasca near my flat is non-negotiable.\n\nBeijinhos,\nInês`,
        files: [["Lisbon_food_list.pdf", 118]],
      },
    ],
  },
  {
    id: "t-aerolis-booking",
    subject: "Your booking is confirmed: SFO → LIS · Confirmation K7Q2XM",
    cat: "updates",
    labels: ["travel"],
    msgs: [
      {
        from: People.aerolis,
        to: [ME],
        ago: 3 * D + 1 * H,
        html: card(
          "You're going to Lisbon ✈️",
          [
            ["Confirmation", "K7Q2XM"],
            ["Outbound", "Thu Oct 15 · SFO 4:10 PM → LIS 12:35 PM +1"],
            ["Return", "Tue Oct 20 · LIS 11:20 AM → SFO 3:05 PM"],
            ["Passenger", "Sam Carter"],
            ["Seat", "24A · 24A"],
            ["Total", "$742.60"],
          ],
          "Online check-in opens 24 hours before departure.",
        ),
        files: [["Eticket_K7Q2XM.pdf", 94]],
      },
    ],
  },
  {
    id: "t-postmortem",
    subject: "Postmortem: sync outage on Sep 24",
    labels: ["work"],
    msgs: [
      {
        from: People.marcus,
        to: [People.priya, ME, People.hana, People.wren],
        ago: 5 * D + 3 * H,
        text: `Team,\n\nSharing the postmortem draft for last Wednesday's 42-minute sync outage. TL;DR: a burst of reconnecting clients exhausted the queue workers, and our backoff wasn't jittered.\n\nWould love comments before Friday.`,
        files: [["Postmortem_2026-09-24.docx", 64]],
      },
      {
        from: People.hana,
        to: [People.marcus, People.priya, ME, People.wren],
        ago: 5 * D + 1 * H,
        text: `Great write-up. Suggest we add the alert-threshold change to the action items — we paged ~9 minutes after users noticed.`,
      },
      {
        from: ME,
        to: [People.marcus, People.priya, People.hana, People.wren],
        ago: 4 * D + 22 * H,
        text: `+1 to Hana. From the product side I'd like a status banner in the app when sync is degraded — users thought they'd lost data. I can mock it up this week.`,
      },
      {
        from: People.marcus,
        to: [People.priya, ME, People.hana, People.wren],
        ago: 4 * D + 20 * H,
        text: `Both added. Sam, banner mock would be great — let's pair on the states (degraded / offline / recovered).`,
      },
    ],
  },
  {
    id: "t-crit",
    subject: "Design crit moved to 3pm today",
    labels: ["design"],
    msgs: [
      {
        from: People.wren,
        to: [ME, People.hana, People.elena],
        ago: 6 * H + 20 * M,
        text: `Heads up — crit moves to 3pm (conflict with the all-hands). Same room. Sam, you're first up with the sync banner states.`,
      },
    ],
  },
  {
    id: "t-figma-comment",
    subject: "Elena Rossi commented on “Onboarding v3”",
    cat: "updates",
    labels: ["design"],
    msgs: [
      {
        from: People.figma,
        to: [ME],
        ago: 2 * H,
        html: `<p><b>Elena Rossi</b> replied in <b>Onboarding v3</b> · Frame “Invite teammates”</p><blockquote style="border-left:3px solid #a259ff;margin:0;padding:4px 12px">Swapped in the paper-plane version here so you can see it in context. The planes loop every 6s.</blockquote><p style="color:#80868b;font-size:12px">Reply in Figma · Mute this file</p>`,
      },
    ],
  },
  {
    id: "t-linear-digest",
    subject: "Weekly digest: 14 issues completed in Atlas",
    cat: "updates",
    msgs: [
      {
        from: People.linear,
        to: [ME],
        ago: 1 * D + 6 * H,
        html: card("Atlas · Week 39", [
          ["Completed", "14 issues"],
          ["In progress", "9 issues"],
          ["Cycle progress", "78%"],
          ["Top contributor", "Marcus Chen (6)"],
        ]),
      },
    ],
  },
  {
    id: "t-stripe",
    subject: "Your receipt from Fieldnote Inc. #2291-4471",
    cat: "updates",
    labels: ["receipts", "finance"],
    msgs: [
      {
        from: People.stripe,
        to: [ME],
        ago: 2 * D + 7 * H,
        html: card(
          "Receipt from Fieldnote Inc.",
          [
            ["Amount paid", "$24.00"],
            ["Date paid", "Sep 28, 2026"],
            ["Payment method", "Visa •••• 4242"],
            ["Plan", "Fieldnote Pro — monthly"],
          ],
          "Questions? Contact billing@fieldnote.io.",
        ),
        files: [["Receipt-2291-4471.pdf", 38]],
      },
    ],
  },
  {
    id: "t-jonas",
    subject: "Staff Product Designer at Halcyon Labs",
    msgs: [
      {
        from: People.jonas,
        to: [ME],
        ago: 1 * D + 9 * H,
        text: `Hi Sam,\n\nI lead design hiring at Halcyon Labs. Your work on Fieldnote's sync UX came up in a conversation with our founders — we're building collaborative tools for research labs and are looking for a Staff Product Designer.\n\nNo pressure at all, but would you be open to a 20-minute chat?\n\nBest,\nJonas`,
      },
    ],
  },
  {
    id: "t-clinic",
    subject: "Appointment reminder: Friday at 9:30 AM",
    cat: "updates",
    msgs: [
      {
        from: People.okafor,
        to: [ME],
        ago: 9 * H,
        text: `This is a reminder of your upcoming appointment with Dr. Adaeze Okafor on Friday at 9:30 AM.\n\nPlease arrive 10 minutes early and bring your insurance card. To reschedule, reply to this email or call (415) 555-0142.`,
      },
    ],
  },
  {
    id: "t-bookclub",
    subject: "Book club: October pick",
    labels: ["personal"],
    msgs: [
      {
        from: People.bookclub,
        to: [ME, People.dana],
        ago: 4 * D + 8 * H,
        text: `Votes are in — October's pick is "Tomorrow, and Tomorrow, and Tomorrow". We'll meet at Dana's on the 27th. Bring snacks, opinions.`,
      },
      {
        from: People.dana,
        to: [People.bookclub, ME],
        ago: 4 * D + 6 * H,
        text: `Can confirm my apartment has been cleaned in anticipation. I'll make the good dumplings.`,
      },
    ],
  },
  {
    id: "t-meridian",
    subject: "Your September statement is ready",
    cat: "updates",
    labels: ["finance"],
    msgs: [
      {
        from: People.meridian,
        to: [ME],
        ago: 1 * D + 14 * H,
        text: `Your statement for the account ending in 8812 is now available in online banking. For your security, we never include account details in email.`,
      },
    ],
  },
  {
    id: "t-ridely",
    subject: "Your Tuesday evening trip with Ridely",
    cat: "updates",
    labels: ["receipts"],
    msgs: [
      {
        from: People.ridely,
        to: [ME],
        ago: 1 * D + 18 * H,
        html: card("Thanks for riding, Sam", [
          ["Trip", "Fieldnote HQ → 4B Harbor Residences"],
          ["Distance", "3.8 mi · 17 min"],
          ["Fare", "$16.42"],
          ["Tip", "$3.00"],
          ["Total", "$19.42"],
        ]),
      },
    ],
  },
  {
    id: "t-frontend-weekly",
    subject: "Frontend Weekly #312: View transitions everywhere",
    cat: "updates",
    msgs: [
      {
        from: People.frontend,
        to: [ME],
        ago: 2 * D + 12 * H,
        html: `<h2 style="margin:0 0 8px;font-size:20px">Frontend Weekly — Issue #312</h2><p>This week: cross-document view transitions land in every major engine, a deep dive on container query units, and why your CSS reset might be hurting accessibility.</p><ol><li><b>View transitions, everywhere</b> — what changed and how to progressively enhance.</li><li><b>Scroll-driven animations in practice</b> — three patterns that don't hurt performance.</li><li><b>The case for boring state management</b> — an essay.</li></ol><p style="color:#80868b;font-size:12px">You're getting this because you subscribed at frontendweekly.dev.</p>`,
      },
    ],
  },
  {
    id: "t-linkedin",
    subject: "You appeared in 38 searches this week",
    cat: "social",
    msgs: [
      {
        from: People.linkedin,
        to: [ME],
        ago: 1 * D + 3 * H,
        text: `Sam, you appeared in 38 searches this week. Recruiters from Halcyon Labs, Loom Systems and 4 other companies viewed your profile.`,
      },
    ],
  },
  {
    id: "t-strava",
    subject: "Theo Carter gave you kudos",
    cat: "social",
    unread: true,
    msgs: [
      {
        from: People.strava,
        to: [ME],
        ago: 8 * H,
        text: `Theo Carter gave you kudos on "Morning run along the Embarcadero" — 8.2 km · 5:12 /km.`,
      },
    ],
  },
  {
    id: "t-producthunt",
    subject: "Fieldnote Atlas is on the upcoming launches list",
    cat: "social",
    msgs: [
      {
        from: People.producthunt,
        to: [ME],
        ago: 2 * D + 4 * H,
        text: `Good news: Fieldnote Atlas has been added to Upcoming. 213 people have subscribed to be notified on launch day.`,
      },
    ],
  },
  {
    id: "t-meetup",
    subject: "New event: SF Design Systems — October meetup",
    cat: "social",
    msgs: [
      {
        from: People.meetup,
        to: [ME],
        ago: 3 * D + 9 * H,
        text: `SF Design Systems just scheduled a new event: "Tokens at scale" on Oct 22 at 6:30 PM. 84 people are going.`,
      },
    ],
  },
  {
    id: "t-northfold",
    subject: "30% off fall layers — this weekend only",
    cat: "promotions",
    unread: true,
    msgs: [
      {
        from: People.northfold,
        to: [ME],
        ago: 6 * H,
        html: promo("#3d5a45", "Fall Collection", "30% off fall layers", "Fleece, flannel, and the waxed-cotton jacket you keep looking at. Ends Sunday at midnight.", "Shop the sale"),
      },
    ],
  },
  {
    id: "t-loop",
    subject: "Final hours: Loop Pro 2 for $179",
    cat: "promotions",
    unread: true,
    msgs: [
      {
        from: People.loop,
        to: [ME],
        ago: 11 * H,
        html: promo("#111827", "Ends tonight", "Loop Pro 2 — $179", "Adaptive noise cancelling, 32-hour battery, and spatial audio. Our lowest price ever.", "Get yours"),
      },
    ],
  },
  {
    id: "t-staylio",
    subject: "Lisbon stays you might like",
    cat: "promotions",
    labels: ["travel"],
    msgs: [
      {
        from: People.staylio,
        to: [ME],
        ago: 2 * D + 16 * H,
        html: promo("#e0565b", "For your Oct 16 trip", "Stays in Alfama from $94/night", "Tiled terraces, river views, and hosts rated 4.9+. Free cancellation on most listings.", "Explore Lisbon"),
      },
    ],
  },
  {
    id: "t-kinfolk",
    subject: "New arrivals: stoneware for slow mornings",
    cat: "promotions",
    msgs: [
      {
        from: People.kinfolk,
        to: [ME],
        ago: 4 * D + 3 * H,
        html: promo("#a0775a", "New arrivals", "Stoneware for slow mornings", "Hand-thrown mugs and bowls in three new glazes: oat, moss, and harbor.", "See the collection"),
      },
    ],
  },
  {
    id: "t-aerolis-promo",
    subject: "Fly to Europe from $389 round trip",
    cat: "promotions",
    msgs: [
      {
        from: People.aerolis,
        to: [ME],
        ago: 6 * D,
        html: promo("#1a4e8a", "Limited fares", "Europe from $389", "Lisbon, Porto, Madrid and Barcelona. Book by Oct 6 for travel through March.", "Find flights"),
      },
    ],
  },
  {
    id: "t-notion",
    subject: "Your annual plan renews in 7 days",
    cat: "updates",
    msgs: [
      {
        from: People.notion,
        to: [ME],
        ago: 12 * D,
        text: `Hi Sam — a heads up that your Notion Plus annual plan renews on October 12 for $96.00. No action is needed to keep your subscription.`,
      },
    ],
  },
  {
    id: "t-ravi-taxes",
    subject: "2025 tax documents — ready for signature",
    labels: ["finance"],
    starred: true,
    msgs: [
      {
        from: People.ravi,
        to: [ME],
        ago: 34 * D,
        text: `Hi Sam,\n\nYour 2025 return is ready. Please review and sign the attached 8879 so we can e-file. Your refund estimate is $1,284.\n\nThanks,\nRavi Patel, CPA`,
        files: [["Form_8879_Carter_2025.pdf", 172], ["Return_Summary_2025.pdf", 244]],
      },
      {
        from: ME,
        to: [People.ravi],
        ago: 33 * D,
        text: `Signed and attached. Thanks Ravi!`,
        files: [["Form_8879_Carter_2025_signed.pdf", 181]],
      },
    ],
  },
  {
    id: "t-dana-dinner",
    subject: "Dinner Saturday?",
    labels: ["personal"],
    msgs: [
      {
        from: People.dana,
        to: [ME],
        ago: 8 * D,
        text: `Want to try that new Burmese place on Clement? I can book for 7:30.`,
      },
      {
        from: ME,
        to: [People.dana],
        ago: 8 * D - 40,
        text: `Yes please! 7:30 works.`,
      },
    ],
  },
  {
    id: "t-welcome",
    subject: "Welcome to Fieldnote 👋",
    inbox: false,
    msgs: [
      {
        from: People.hr,
        to: [ME],
        ago: 420 * D,
        text: `Welcome aboard, Sam! Your laptop ships Monday. Your first week's schedule is attached — Wren will be your onboarding buddy.`,
        files: [["First_Week_Schedule.pdf", 88]],
      },
    ],
  },
  {
    id: "t-offsite",
    subject: "Offsite photos + thank you",
    labels: ["work"],
    inbox: false,
    msgs: [
      {
        from: People.priya,
        to: [ME, People.marcus, People.wren, People.hana],
        ago: 62 * D,
        text: `Thank you all for an amazing offsite in Tahoe. Photos are in the shared album. Special shout-out to Marcus for the midnight s'mores operation.`,
        files: [["tahoe-group.jpg", 4120, 170]],
      },
    ],
  },
  // Sent-only threads
  {
    id: "t-roadmap",
    subject: "Q4 roadmap draft for review",
    labels: ["work"],
    inbox: false,
    msgs: [
      {
        from: ME,
        to: [People.priya, People.marcus],
        ago: 1 * D + 1 * H,
        text: `Hi both,\n\nAttached is my first pass at the Q4 design roadmap. Biggest bets: collaborative cursors, the offline banner, and a refreshed settings IA.\n\nComments welcome — I'll fold them in before Monday's planning.\n\nSam`,
        files: [["Q4_Design_Roadmap.pdf", 1320], ["Q4_estimates.xlsx", 46]],
      },
    ],
  },
  {
    id: "t-framing",
    subject: "Quote request: framing for 3 prints",
    inbox: false,
    msgs: [
      {
        from: ME,
        to: [People.mira],
        ago: 2 * D + 1 * H,
        text: `Hello!\n\nCould I get a quote for framing three 12×16 prints? I'm thinking a thin natural oak frame with a white mat. No rush.\n\nThank you,\nSam`,
      },
    ],
  },
  {
    id: "t-theo-bday",
    subject: "Happy birthday!! 🎂",
    inbox: false,
    msgs: [
      {
        from: ME,
        to: [People.theo],
        ago: 48 * D,
        text: `Happy birthday little brother! Dinner's on me next week. Pick anywhere (within reason).`,
      },
    ],
  },
  // Spam
  {
    id: "t-spam-giftcard",
    subject: "CONGRATULATIONS!!! You've been selected for a $1000 gift card",
    spam: true,
    inbox: false,
    msgs: [
      {
        from: People.spam1,
        to: [ME],
        ago: 14 * H,
        text: `Dear Valued Customer, you have been randomly selected!!! Click here to claim your $1000 gift card before it expires in 24 hours.`,
      },
    ],
  },
  {
    id: "t-spam-verify",
    subject: "Urgent: verify your acc0unt within 24 hours",
    spam: true,
    inbox: false,
    msgs: [
      {
        from: People.spam2,
        to: [ME],
        ago: 2 * D,
        text: `We detected unusual sign-in activity. Your mailbox will be suspended unless you verify your password immediately.`,
      },
    ],
  },
  {
    id: "t-spam-funds",
    subject: "Confidential business proposal",
    spam: true,
    inbox: false,
    msgs: [
      {
        from: People.spam3,
        to: [ME],
        ago: 5 * D,
        text: `Good day. I am contacting you regarding the transfer of US$14.5 million in dormant funds. Your discretion is required.`,
      },
    ],
  },
  // Trash
  {
    id: "t-trash-webinar",
    subject: "Webinar: Scaling design systems across 12 teams",
    cat: "promotions",
    trashed: true,
    inbox: false,
    msgs: [
      {
        from: People.webinar,
        to: [ME],
        ago: 3 * D,
        text: `Join us Thursday for a live session on governance, tokens, and contribution models for large design systems.`,
      },
    ],
  },
  {
    id: "t-trash-brew",
    subject: "Your cart is waiting ☕",
    cat: "promotions",
    trashed: true,
    inbox: false,
    msgs: [
      {
        from: People.brewline,
        to: [ME],
        ago: 6 * D,
        html: promo("#6b3f2a", "Still thinking?", "Your cart is waiting", "Ethiopia Guji, 12oz, whole bean. Free shipping on orders over $30.", "Complete checkout"),
      },
    ],
  },
  // Snoozed
  {
    id: "t-passport",
    subject: "Reminder: passport expires in 6 months",
    inbox: false,
    snoozeIn: 18 * H,
    msgs: [
      {
        from: People.passport,
        to: [ME],
        ago: 4 * D,
        text: `Our records indicate your passport expires in about six months. Many countries require six months of validity for entry. Renewals currently take 6–8 weeks.`,
      },
    ],
  },
  {
    id: "t-elena-invoice",
    subject: "Invoice #0932 — onboarding illustrations",
    labels: ["design", "finance"],
    inbox: false,
    snoozeIn: 3,
    msgs: [
      {
        from: People.elena,
        to: [ME],
        ago: 1 * D + 5 * H,
        text: `Hi Sam, attaching the invoice for rounds 1 and 2. Net 30 as usual. Grazie!`,
        files: [["Invoice_0932_StudioRossi.pdf", 52]],
      },
    ],
  },
];

/** Mail that "arrives" while the app is open, to make the mailbox feel alive. */
export const incomingSeeds: SeedThread[] = [
  {
    id: "t-atlas-go",
    subject: "Atlas launch — final go/no-go on Thursday",
    msgs: [
      {
        from: People.priya,
        to: [People.marcus, ME],
        cc: [People.wren],
        ago: 0,
        text: `Amazing, thanks both. Pricing copy is signed off as of this morning, so the only open item is the illustrations. Sam, can you confirm by EOD tomorrow?\n\nP.`,
      },
    ],
  },
  {
    id: "t-marcus-q",
    subject: "Quick q about the offline banner",
    labels: ["work"],
    important: true,
    msgs: [
      {
        from: People.marcus,
        to: [ME],
        ago: 0,
        text: `Hey — for the offline banner, do we want it to auto-dismiss when sync recovers, or stay until the user closes it? I can wire either, just want to match your mock.\n\nM`,
      },
    ],
  },
  {
    id: "t-brewline-ship",
    subject: "Your subscription ships Friday ☕",
    cat: "updates",
    msgs: [
      {
        from: People.brewline,
        to: [ME],
        ago: 0,
        html: card("Your next bag is on the way soon", [
          ["Coffee", "Colombia Huila · 12oz"],
          ["Grind", "Whole bean"],
          ["Ships", "Friday"],
          ["Total", "$18.00"],
        ]),
      },
    ],
  },
  {
    id: "t-lisbon",
    subject: "Lisbon plan — Oct 16–20?",
    msgs: [
      {
        from: People.theo,
        to: [ME, People.ines],
        ago: 0,
        text: `Also found a fado place in Alfama that takes reservations — booked us for Saturday at 9. Non-refundable, so you're both contractually obligated to enjoy it.`,
      },
    ],
  },
  {
    id: "t-gh-ci",
    subject: "[fieldnote/atlas] CI passed: Fix race in sync queue (#482)",
    cat: "updates",
    labels: ["work"],
    msgs: [
      {
        from: People.github,
        to: [ME],
        ago: 0,
        html: `<p>✅ All checks have passed on <b>fieldnote/atlas#482</b>.</p><p style="font-family:ui-monospace,Menlo,monospace;font-size:12.5px">build · lint · unit (3,412 tests) · e2e · race-stress</p>`,
      },
    ],
  },
];

let attCounter = 0;
function toAttachment(f: SeedAttachment): Attachment {
  return { id: `a${++attCounter}`, name: f[0], size: f[1] * 1024, kind: kindFromName(f[0]), hue: f[2] };
}

export function buildMessage(s: SeedMsg, threadId: string, idx: number, now: number): Message {
  const date = now - s.ago * time.MIN;
  return {
    id: `${threadId}-m${idx}-${date}`,
    from: s.from,
    to: s.to ?? [ME],
    cc: s.cc ?? [],
    date,
    html: s.html ?? textToHtml(s.text ?? ""),
    quoteHtml: s.quote,
    attachments: (s.files ?? []).map(toAttachment),
    invite: s.invite
      ? {
          title: s.invite.title,
          location: s.invite.location,
          organizer: s.invite.organizer,
          start: nextWeekday(now, s.invite.weekday, s.invite.hour),
          end: nextWeekday(now, s.invite.weekday, s.invite.hour) + s.invite.hours * time.HOUR,
        }
      : undefined,
  };
}

function nextWeekday(now: number, weekday: number, hour: number) {
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  let add = (weekday - d.getDay() + 7) % 7;
  if (add === 0 && d.getTime() <= now) add = 7;
  d.setDate(d.getDate() + add);
  return d.getTime();
}

export function buildThread(s: SeedThread, now: number): Thread {
  return {
    id: s.id,
    subject: s.subject,
    messages: s.msgs.map((m, i) => buildMessage(m, s.id, i, now)),
    labelIds: s.labels ?? [],
    category: s.cat ?? "primary",
    starred: !!s.starred,
    important: !!s.important,
    unread: !!s.unread,
    inInbox: s.inbox ?? true,
    trashed: !!s.trashed,
    spam: !!s.spam,
    snoozedUntil: s.snoozeIn ? now + s.snoozeIn * time.MIN : undefined,
  };
}

export function buildSeed(now = Date.now()) {
  const threads: Record<string, Thread> = {};
  for (const s of seedThreads) threads[s.id] = buildThread(s, now);

  const drafts: Record<string, Draft> = {
    "d-toast": {
      id: "d-toast",
      mode: "new",
      to: [],
      cc: [],
      bcc: [],
      subject: "Toast for Theo & Maya's engagement party",
      html: textToHtml(
        "For those who don't know me, I'm Theo's older sibling — which means I've had a front-row seat to every questionable haircut and every great decision he's ever made.\n\nMaya is by far the greatest decision.",
      ),
      attachments: [],
      updatedAt: now - 20 * time.HOUR,
    },
    "d-lisbon": {
      id: "d-lisbon",
      mode: "new",
      to: [People.theo, People.ines],
      cc: [],
      bcc: [],
      subject: "Lisbon itinerary ideas",
      html: textToHtml("Day 1: land, nap, pastéis de nata\nDay 2: Alfama + fado\nDay 3: Sintra (early train!)\nDay 4: LX Factory, Belém"),
      attachments: [],
      updatedAt: now - 2 * time.DAY,
    },
    "d-update": {
      id: "d-update",
      mode: "new",
      to: [People.aisha],
      cc: [People.priya],
      bcc: [],
      subject: "Fieldnote monthly design update — September",
      html: textToHtml(
        "Hi Aisha,\n\nQuick September update from the design side: we shipped the new sync states, finished onboarding illustrations with Studio Rossi, and are two weeks out from the Atlas launch.\n\nMore detail in the deck — happy to walk through it over coffee.\n\nSam",
      ),
      attachments: [],
      updatedAt: now - 3 * time.HOUR,
      scheduledAt: nextMorning(now),
    },
  };

  return { threads, drafts, labels: seedLabels };
}

function nextMorning(now: number) {
  const d = new Date(now + time.DAY);
  d.setHours(8, 0, 0, 0);
  return d.getTime();
}

export const cannedReplies: Record<string, string[]> = {
  "priya@fieldnote.io": ["Perfect, thank you! Adding it to the launch doc now.", "Got it — let's sync on this at standup tomorrow."],
  "marcus.chen@fieldnote.io": ["Makes sense. I'll wire it up and ping you for a review.", "👍 on it."],
  "elena@studiorossi.it": ["Grazie Sam! I'll get started this week and send a preview by Friday."],
  "theo@carter.family": ["Haha perfect. See you soon!", "Deal. You're the best."],
  "linda.carter@outlook.com": ["Thank you sweetheart! Call me this weekend? Love, Mom"],
  "aisha@northbeam.vc": ["Wonderful — Wednesday at 10 at Sightglass works for me. See you then!"],
  "dana.w@fastmail.com": ["Yesss. Counting on you for dessert."],
  "ines.duarte@gmail.com": ["Que bom! Can't wait to see you both 💛"],
  "noah.kim@harborresidences.com": ["Thank you Sam, received. I'll countersign and send a copy back this week."],
};
export const genericReplies = [
  "Thanks for the note — I'll take a look and get back to you shortly.",
  "Received, thank you! Will follow up soon.",
];

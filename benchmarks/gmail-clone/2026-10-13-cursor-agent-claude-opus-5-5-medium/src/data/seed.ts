import type { Attachment, Category, Draft, Label, Location, MailState, Message, Settings, Thread } from "../types";
import { CONTACTS, ME } from "./contacts";

export const SEED_LABELS: Label[] = [
  { id: "work", name: "Work", color: "#1a73e8" },
  { id: "atlas", name: "Project Atlas", color: "#00897b" },
  { id: "personal", name: "Personal", color: "#0b8043" },
  { id: "family", name: "Family", color: "#d01884" },
  { id: "travel", name: "Travel", color: "#e8710a" },
  { id: "receipts", name: "Receipts", color: "#8e24aa" },
  { id: "finance", name: "Finance", color: "#c5221f" },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  density: "default",
  readingPane: "none",
  inboxTabs: true,
  pageSize: 50,
  undoSeconds: 5,
  signature: "Sam Carter\nSenior Product Engineer · Northwind",
  shortcuts: true,
  sidebarCollapsed: false,
  autoReplies: true,
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

let attSeq = 0;
function att(name: string, kb: number): Attachment {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const type: Attachment["type"] =
    ext === "pdf"
      ? "pdf"
      : ["png", "jpg", "jpeg", "gif", "heic", "webp"].includes(ext)
        ? "image"
        : ["doc", "docx", "txt", "md"].includes(ext)
          ? "doc"
          : ["xls", "xlsx", "csv"].includes(ext)
            ? "sheet"
            : ["ppt", "pptx", "key"].includes(ext)
              ? "slides"
              : ext === "zip"
                ? "zip"
                : "other";
  return { id: `a${++attSeq}`, name, size: Math.round(kb * 1024), type };
}

const P = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join("");

interface MsgSpec {
  from: string;
  to?: string[];
  cc?: string[];
  at: number;
  html: string;
  att?: Attachment[];
  quote?: string;
}
interface ThreadSpec {
  subject: string;
  cat?: Category;
  labels?: string[];
  star?: boolean;
  imp?: boolean;
  unread?: boolean;
  loc?: Location;
  snoozed?: number;
  msgs: MsgSpec[];
}

export function buildSeed(now = Date.now()): MailState {
  attSeq = 0;
  const m = (mins: number) => now - mins * MIN;
  const h = (hrs: number) => now - hrs * HOUR;
  const today = new Date(now);
  const d = (days: number, hour = 9, min = 0) => {
    const x = new Date(today);
    x.setDate(x.getDate() - days);
    x.setHours(hour, min, 0, 0);
    return Math.min(x.getTime(), now - 2 * MIN);
  };
  const me = ME.email;
  const priya = "priya@northwind.dev";
  const marcus = "marcus.chen@northwind.dev";
  const elena = "elena@northwind.dev";
  const diego = "diego.alvarez@northwind.dev";
  const aisha = "aisha@northwind.dev";
  const tom = "tom.becker@northwind.dev";
  const hannah = "hannah.kim@lumen-talent.com";
  const theo = "theo.bennett@gmail.com";
  const mom = "linda.carter52@gmail.com";
  const jules = "jules.carter@icloud.com";
  const noah = "noah@fischer-studio.de";
  const rachel = "rachel.osei@acmecorp.com";
  const kenji = "kenji@watanabe.jp";
  const team = "team@northwind.dev";

  const specs: ThreadSpec[] = [
    {
      subject: "Atlas launch checklist — final pass before Thursday",
      labels: ["work", "atlas"],
      imp: true,
      unread: true,
      star: true,
      msgs: [
        {
          from: elena,
          to: [me, priya, marcus, diego],
          at: h(20),
          html: P(
            "Hi all,",
            "We're two days out from the Atlas launch. I've consolidated everything into one checklist so nothing slips through. Please take a pass and mark your items <b>done</b> or flag blockers by end of day tomorrow.",
            "<b>Highlights</b>",
            "<ul><li>Marketing site copy is locked (thanks Marcus)</li><li>Billing migration dry-run is scheduled for Wednesday 10am</li><li>Status page and incident runbook need an owner</li><li>Support macros are drafted, needs eng review</li></ul>",
            "The full sheet is attached. Shout if anything looks off.",
            "Elena"
          ),
          att: [att("Atlas-launch-checklist.xlsx", 84), att("Launch-timeline.pdf", 412)],
        },
        {
          from: diego,
          to: [elena, me, priya, marcus],
          at: h(6),
          html: P(
            "I can own the status page + runbook. I'll pair with Sam on the alerting thresholds since the new queue metrics are his.",
            "One blocker: the billing dry-run needs prod read replicas and Tom hasn't granted access yet. Tom, can you look?",
            "— D"
          ),
        },
        {
          from: priya,
          to: [elena, me, diego, marcus],
          at: m(42),
          html: P(
            "Thanks Elena, this is great. Sam — can you confirm the queue latency dashboards are wired to PagerDuty before the dry-run? Would love that in place before we flip any flags.",
            "Also, let's do a 15 min go/no-go Thursday 9:30. I'll send an invite.",
            "Priya"
          ),
        },
      ],
    },
    {
      subject: "Quick question about the onboarding flow",
      labels: ["work"],
      unread: true,
      msgs: [
        {
          from: marcus,
          to: [me],
          at: m(18),
          html: P(
            "Hey Sam,",
            "I'm iterating on the onboarding empty states. Do we actually have the workspace size at sign-up time, or does that only arrive after the first sync? I want to show a personalised checklist but don't want to fake it.",
            "Attached the two directions I'm torn between. Leaning towards B but curious what you think from a data standpoint.",
            "Thanks!<br>Marcus"
          ),
          att: [att("onboarding-direction-A.png", 1840), att("onboarding-direction-B.png", 2210)],
        },
      ],
    },
    {
      subject: "Dinner Sunday? 🍝",
      labels: ["family"],
      unread: true,
      cat: "primary",
      msgs: [
        {
          from: mom,
          to: [me, jules],
          at: h(2.2),
          html: P(
            "Hi sweethearts,",
            "Dad is making his famous lasagna on Sunday and we'd love to have you both over around 6. Jules, bring Max if he's free!",
            "Sam, could you pick up a loaf of that sourdough from the bakery near you? The one with the olives. Your father won't stop talking about it.",
            "Love,<br>Mom"
          ),
        },
        {
          from: jules,
          to: [mom, me],
          at: h(1.1),
          html: P("Count us in! Max is bringing dessert 🍰", "Sam you better not be late again lol"),
        },
      ],
    },
    {
      subject: "Your flight to Lisbon is confirmed — DL 128",
      cat: "updates",
      labels: ["travel"],
      star: true,
      msgs: [
        {
          from: "deltaairlines@t.delta.com",
          to: [me],
          at: h(4),
          html: P(
            "<b>Your trip is confirmed.</b> Confirmation number: <b>HXK4PZ</b>",
            "<b>Outbound</b> — Thu, Nov 12 · JFK 7:45 PM → LIS 7:50 AM (+1) · Delta One · Seat 3A",
            "<b>Return</b> — Sun, Nov 22 · LIS 11:20 AM → JFK 2:05 PM · Delta One · Seat 3A",
            "Check-in opens 24 hours before departure. Add your SkyMiles number to earn approximately 9,840 miles on this trip.",
            "Your e-ticket receipt is attached."
          ),
          att: [att("eTicket-HXK4PZ.pdf", 186)],
        },
      ],
    },
    {
      subject: "[northwind/atlas] Fix race condition in queue consumer (#1482)",
      cat: "updates",
      labels: ["atlas"],
      unread: true,
      msgs: [
        {
          from: "notifications@github.com",
          to: [me],
          at: m(65),
          html: P(
            "<b>@diego-alvarez</b> requested your review on this pull request.",
            "<code>consumer.ts</code>: acquire the lease before reading the offset so two workers can't double-process a batch when a rebalance happens mid-flight. Adds a regression test that reproduces the issue with a fake clock.",
            "<b>+142 −37</b> · 4 files changed · All checks have passed",
            "Reply to this email directly or view it on GitHub."
          ),
        },
        {
          from: "notifications@github.com",
          to: [me],
          at: m(31),
          html: P(
            "<b>@priya-n</b> commented on this pull request:",
            "<blockquote>Nice catch. Can we also emit a metric when we lose a lease? Would make it much easier to spot this in prod.</blockquote>"
          ),
        },
      ],
    },
    {
      subject: "Contract for the Fischer Studio rebrand — signed copy",
      labels: ["work"],
      imp: true,
      msgs: [
        {
          from: noah,
          to: [me],
          cc: [elena],
          at: d(1, 16, 12),
          html: P(
            "Hi Sam,",
            "Please find the countersigned agreement attached. We're excited to get going. Kickoff is pencilled in for the 21st — I'll send over a questionnaire before then so we can hit the ground running.",
            "Invoices go to accounts@northwind.dev, correct?",
            "Best,<br>Noah Fischer<br>Fischer Studio · Berlin"
          ),
          att: [att("Northwind-x-Fischer-SOW-signed.pdf", 640)],
        },
        {
          from: me,
          to: [noah],
          cc: [elena],
          at: d(1, 17, 3),
          html: P(
            "Thanks Noah — received, and yes that's the right address.",
            "Looking forward to the kickoff. I'll make sure Elena and Marcus are on the invite.",
            "Sam"
          ),
        },
      ],
    },
    {
      subject: "Re: Climbing Saturday?",
      labels: ["personal"],
      msgs: [
        {
          from: kenji,
          to: [me, theo],
          at: d(1, 8, 40),
          html: P("Gym or outside? The forecast for the Gunks looks perfect — 18°C and dry.", "I can drive, leaving 7am."),
        },
        {
          from: theo,
          to: [kenji, me],
          at: d(1, 9, 15),
          html: P("Outside, obviously. I'll bring the second rope and the new cams."),
        },
        {
          from: me,
          to: [kenji, theo],
          at: d(1, 10, 2),
          html: P("I'm in. I'll bring sandwiches and coffee. Pick me up at 7?"),
        },
        {
          from: kenji,
          to: [me, theo],
          at: d(1, 10, 30),
          html: P("Deal. 7 sharp. Don't forget your harness this time 😅"),
        },
      ],
    },
    {
      subject: "Exciting Staff Engineer role at Acme — open to a chat?",
      labels: [],
      unread: true,
      msgs: [
        {
          from: hannah,
          to: [me],
          at: h(9),
          html: P(
            "Hi Sam,",
            "I came across your talk on event-driven billing at QCon and was really impressed. I'm working with Acme Corp on a Staff Engineer role on their platform team — they're rebuilding their usage metering pipeline and your background is a near-perfect fit.",
            "Comp range is $260–310k base plus meaningful equity, fully remote within US time zones.",
            "Would you be open to a 20 minute call this week? No pressure at all.",
            "Warmly,<br>Hannah Kim<br>Lumen Talent"
          ),
          att: [att("Acme-Staff-Engineer-JD.pdf", 132)],
        },
      ],
    },
    {
      subject: "Q3 metrics review deck",
      labels: ["work"],
      msgs: [
        {
          from: aisha,
          to: [me, priya, elena],
          at: d(2, 14, 20),
          html: P(
            "Hey team, attaching the draft deck for Thursday's metrics review.",
            "Key callouts: activation is up 11% QoQ, but week-4 retention for self-serve dipped 2 pts. I have a hypothesis it's related to the sync latency regressions in August — Sam, could you sanity check slide 9?",
            "Aisha"
          ),
          att: [att("Q3-metrics-review-draft.pptx", 5320), att("retention-cohorts.csv", 48)],
        },
        {
          from: me,
          to: [aisha, priya, elena],
          at: d(2, 16, 45),
          html: P(
            "Slide 9 looks right to me. The p95 sync latency was ~4.2s for the first three weeks of August before the index fix shipped on the 24th — that lines up suspiciously well with the cohort dip.",
            "I'd add a footnote that the fix is in, so we expect recovery in the October cohorts."
          ),
        },
        {
          from: aisha,
          to: [me, priya, elena],
          at: d(2, 17, 10),
          html: P("Perfect, added. Thanks Sam! 🙏"),
        },
      ],
    },
    {
      subject: "Invitation: Atlas go/no-go @ Thu 9:30am – 9:45am",
      cat: "updates",
      labels: ["atlas"],
      unread: true,
      msgs: [
        {
          from: "calendar-notification@google.com",
          to: [me],
          at: m(38),
          html: P(
            "<b>Atlas go/no-go</b>",
            "<b>When</b> Thursday 9:30am – 9:45am (Eastern Time)<br><b>Where</b> Zoom · northwind.zoom.us/j/8813<br><b>Organizer</b> Priya Natarajan",
            "<b>Guests</b> Elena Petrova, Diego Alvarez, Marcus Chen, Sam Carter",
            "Going? Yes · No · Maybe"
          ),
          att: [att("invite.ics", 2)],
        },
      ],
    },
    {
      subject: "Lease renewal for Apt 4B",
      labels: ["personal", "finance"],
      imp: true,
      msgs: [
        {
          from: "oliver.grant@hearthhomes.com",
          to: [me],
          at: d(3, 11, 0),
          html: P(
            "Dear Sam,",
            "Your current lease at 218 Bergen St, Apt 4B ends on December 31. We'd be happy to renew for another 12 months at $3,150/month (a 3% increase), or 24 months at the current rate of $3,060.",
            "Please let us know your preference by November 15. The renewal agreement is attached for review.",
            "Kind regards,<br>Oliver Grant<br>Hearth Homes Property Management"
          ),
          att: [att("Lease-Renewal-4B.pdf", 298)],
        },
      ],
    },
    {
      subject: "Your receipt from Vercel Inc. #2391-0177",
      cat: "updates",
      labels: ["receipts"],
      msgs: [
        {
          from: "receipts@stripe.com",
          to: [me],
          at: d(3, 6, 12),
          html: P(
            "<b>Receipt from Vercel Inc.</b>",
            "Amount paid <b>$40.00</b> · Date paid Oct 11 · Payment method Visa •••• 4242",
            "Pro plan — 2 seats × $20.00",
            "Questions? Contact Vercel at billing@vercel.com."
          ),
          att: [att("Receipt-2391-0177.pdf", 38)],
        },
      ],
    },
    {
      subject: "Hardware refresh — pick your laptop by Friday",
      labels: ["work"],
      msgs: [
        {
          from: tom,
          to: [team],
          at: d(4, 10, 5),
          html: P(
            "Hi everyone,",
            "It's that time again! If your laptop is older than 3 years, you're eligible for a refresh. Options this cycle:",
            "<ul><li>MacBook Pro 14\" M5 Pro, 36GB / 1TB</li><li>MacBook Pro 16\" M5 Max, 64GB / 2TB (eng + design only)</li><li>ThinkPad X1 Carbon Gen 13</li></ul>",
            "Reply with your choice by Friday. Old devices must be returned within 2 weeks of receiving the new one.",
            "Tom · IT"
          ),
        },
      ],
    },
    {
      subject: "Photos from Jules' birthday 📸",
      labels: ["family"],
      star: true,
      msgs: [
        {
          from: jules,
          to: [me, mom],
          at: d(5, 21, 33),
          html: P("Finally got around to exporting these! The cake one is my favourite. Thanks for coming everyone ❤️"),
          att: [att("IMG_4021.jpg", 3200), att("IMG_4033.jpg", 2900), att("IMG_4057.jpg", 3410), att("cake.heic", 2100)],
        },
        {
          from: mom,
          to: [jules, me],
          at: d(5, 22, 10),
          html: P("These are beautiful!! Printing the cake one for the fridge."),
        },
      ],
    },
    {
      subject: "Security alert: new sign-in on Mac",
      cat: "updates",
      msgs: [
        {
          from: "no_reply@email.apple.com",
          to: [me],
          at: d(4, 23, 48),
          html: P(
            "Your Apple Account was used to sign in to iCloud on a MacBook Pro.",
            "<b>Date and time:</b> Oct 10, 11:48 PM EDT<br><b>Location:</b> Brooklyn, NY",
            "If you signed in recently, you can disregard this email. If you didn't, change your password immediately."
          ),
        },
      ],
    },
    {
      subject: "Partnership intro: Acme × Northwind",
      labels: ["work"],
      msgs: [
        {
          from: rachel,
          to: [me, priya],
          at: d(6, 13, 30),
          html: P(
            "Hi Sam, Priya,",
            "Great meeting you at the infra summit. As promised, I'd love to explore whether Atlas could replace our in-house metering for the self-serve tier. We process ~2.3B usage events a month today.",
            "Could we grab 45 minutes next week for a technical deep dive? Happy to bring our lead architect.",
            "Rachel Osei<br>VP Engineering, Acme Corp"
          ),
        },
        {
          from: priya,
          to: [rachel, me],
          at: d(6, 15, 2),
          html: P("Hi Rachel — lovely to hear from you. Sam is the best person for the deep dive; I'll let him coordinate times. Looking forward to it!"),
        },
      ],
    },
    {
      subject: "Your Amazon order has shipped (#112-4471023)",
      cat: "updates",
      labels: ["receipts"],
      msgs: [
        {
          from: "shipment-tracking@amazon.com",
          to: [me],
          at: d(2, 7, 55),
          html: P(
            "Hi Sam, your package is on its way!",
            "<b>Arriving Thursday</b>",
            "Black Diamond Momentum Harness (M) · Qty 1<br>Petzl GriGri+ Belay Device · Qty 1",
            "Order total: $214.89"
          ),
        },
      ],
    },
    {
      subject: "Weekly digest: 6 new issues assigned to you",
      cat: "updates",
      labels: ["atlas"],
      msgs: [
        {
          from: "notifications@linear.app",
          to: [me],
          at: d(1, 7, 0),
          html: P(
            "<b>Your week in Linear</b>",
            "<ul><li>ATL-412 Backfill job OOMs on large tenants — <i>High</i></li><li>ATL-417 Add lease-lost metric — <i>Medium</i></li><li>ATL-420 Rate limit admin export endpoint — <i>Medium</i></li><li>ATL-421 Flaky test: invoice rollover at DST boundary — <i>Low</i></li><li>ATL-425 Dashboard: p99 consumer lag — <i>Medium</i></li><li>ATL-428 Docs: idempotency keys — <i>Low</i></li></ul>",
            "You closed 9 issues last week. Nice work!"
          ),
        },
      ],
    },
    {
      subject: "Marcus Chen commented on Atlas — Billing settings v3",
      cat: "updates",
      labels: ["atlas"],
      msgs: [
        {
          from: "no-reply@figma.com",
          to: [me],
          at: d(2, 11, 18),
          html: P(
            "<b>Marcus Chen</b> mentioned you in <b>Atlas — Billing settings v3</b>",
            "<blockquote>@Sam does the proration preview need to be live, or is it OK to compute it on submit? Live is nicer but I know the API is chatty.</blockquote>"
          ),
        },
      ],
    },
    {
      subject: "Deployment failed for atlas-web (production)",
      cat: "updates",
      labels: ["atlas"],
      msgs: [
        {
          from: "notifications@vercel.com",
          to: [me],
          at: d(3, 18, 41),
          html: P(
            "<b>atlas-web</b> failed to deploy to production.",
            "Commit <code>a91f3c2</code> — \"feat: proration preview\" by diego-alvarez",
            "<code>Type error: Property 'periodEnd' does not exist on type 'InvoicePreview'.</code>",
            "The previous deployment is still serving traffic."
          ),
        },
        {
          from: "notifications@vercel.com",
          to: [me],
          at: d(3, 19, 7),
          html: P("<b>atlas-web</b> was successfully deployed to production.", "Commit <code>b02e771</code> — \"fix: invoice preview types\""),
        },
      ],
    },
    {
      subject: "Lenny's Newsletter: How the best PMs run launch week",
      cat: "updates",
      msgs: [
        {
          from: "lenny@substack.com",
          to: [me],
          at: d(2, 8, 2),
          html: P(
            "👋 Hey, I'm Lenny and welcome to a free edition of my weekly newsletter.",
            "This week: I talked to 14 product leaders about how they run launch week — from war rooms to pre-mortems. The surprising theme: the best teams spend more time on the <i>day after</i> launch than the day of.",
            "<b>1. Write the rollback plan first.</b> Every team I talked to that had a calm launch had a written, rehearsed rollback.",
            "<b>2. Make go/no-go boring.</b> If the meeting has drama, you're not ready.",
            "<b>3. Staff the support queue with engineers.</b> Nothing teaches faster."
          ),
        },
      ],
    },
    {
      subject: "Stratechery: The Agentic Platform Shift",
      cat: "updates",
      msgs: [
        {
          from: "email@stratechery.com",
          to: [me],
          at: d(4, 6, 30),
          html: P(
            "Good morning,",
            "Today's Article explores how agent-driven interfaces change the aggregation dynamics that defined the last two decades of consumer internet — and why the companies that own the context, not the model, may end up capturing the value.",
            "<i>This Daily Update is available to subscribers.</i>"
          ),
        },
      ],
    },
    {
      subject: "Sam, you appeared in 23 searches this week",
      cat: "social",
      unread: true,
      msgs: [
        {
          from: "messages-noreply@linkedin.com",
          to: [me],
          at: h(7),
          html: P("You appeared in 23 searches this week. Recruiters from Acme Corp, Stripe, and 4 others viewed your profile.", "See who's looking →"),
        },
      ],
    },
    {
      subject: "Rachel Osei sent you a connection request",
      cat: "social",
      unread: true,
      msgs: [
        {
          from: "messages-noreply@linkedin.com",
          to: [me],
          at: d(6, 18, 0),
          html: P("<b>Rachel Osei</b> · VP Engineering at Acme Corp", "\"Great chatting at the infra summit, Sam!\"", "Accept · Ignore"),
        },
      ],
    },
    {
      subject: "Kenji Watanabe uploaded an activity: Morning Ride",
      cat: "social",
      msgs: [
        {
          from: "no-reply@strava.com",
          to: [me],
          at: d(2, 9, 30),
          html: P("<b>Kenji Watanabe</b> just completed a ride.", "<b>Morning Ride</b> · 62.4 km · 2h 14m · 820 m elevation", "Give kudos →"),
        },
      ],
    },
    {
      subject: "New posts from people you follow",
      cat: "social",
      msgs: [
        {
          from: "info@x.com",
          to: [me],
          at: d(3, 12, 0),
          html: P("Top posts this week from @rauchg, @swyx and 12 others.", "\"Shipping is a muscle. The more you do it, the less it hurts.\""),
        },
      ],
    },
    {
      subject: "NYC Systems Meetup: Event-sourcing in production — Oct 28",
      cat: "social",
      msgs: [
        {
          from: "info@meetup.com",
          to: [me],
          at: d(5, 17, 0),
          html: P("A new event was scheduled in <b>NYC Systems</b>.", "<b>Event-sourcing in production: lessons from 5 years</b><br>Tue, Oct 28 · 6:30 PM · Datadog HQ", "142 going · RSVP →"),
        },
      ],
    },
    {
      subject: "Last chance: 30% off Better Sweaters 🧥",
      cat: "promotions",
      unread: true,
      msgs: [
        {
          from: "patagonia@email.patagonia.com",
          to: [me],
          at: h(5),
          html: P("<b>Ends tonight.</b> Our warmest fleece is 30% off — in 14 colors.", "Every purchase supports grassroots environmental groups.", "Shop now →"),
        },
      ],
    },
    {
      subject: "Meet the Tree Runner Go — now in 6 new colors",
      cat: "promotions",
      msgs: [
        {
          from: "hello@allbirds.com",
          to: [me],
          at: d(1, 11, 0),
          html: P("Lightweight, breathable, and made from eucalyptus tree fiber.", "Free shipping on orders over $75."),
        },
      ],
    },
    {
      subject: "$0 delivery fees for the next 3 orders 🍜",
      cat: "promotions",
      unread: true,
      msgs: [
        {
          from: "no-reply@doordash.com",
          to: [me],
          at: d(2, 12, 30),
          html: P("Hungry? Enjoy $0 delivery fees on your next 3 orders over $15. Offer ends Sunday.", "Order now →"),
        },
      ],
    },
    {
      subject: "Member exclusive: up to 40% off climbing gear",
      cat: "promotions",
      msgs: [
        {
          from: "rei@notices.rei.com",
          to: [me],
          at: d(3, 9, 0),
          html: P("As a co-op member you get early access to our fall clearance — ropes, shoes and harnesses up to 40% off.", "Plus, your 2026 dividend is ready: <b>$48.20</b>."),
        },
      ],
    },
    {
      subject: "Your Daily Mix is ready",
      cat: "promotions",
      msgs: [
        {
          from: "no-reply@spotify.com",
          to: [me],
          at: d(4, 8, 0),
          html: P("New music from Khruangbin, Fred again.. and more, picked just for you.", "Listen now →"),
        },
      ],
    },
    {
      subject: "🦉 You're on a 41 day streak!",
      cat: "promotions",
      msgs: [
        {
          from: "hello@duolingo.com",
          to: [me],
          at: d(1, 20, 0),
          html: P("Keep it going! A 5-minute Portuguese lesson today keeps your streak alive. Perfect timing before Lisbon ✈️"),
        },
      ],
    },
    {
      subject: "Medium Daily Digest: Why your queue is lying to you",
      cat: "promotions",
      msgs: [
        {
          from: "noreply@medium.com",
          to: [me],
          at: d(5, 7, 0),
          html: P("<b>Why your queue is lying to you</b> — 8 min read", "<b>The 10x engineer is a myth. The 10x team isn't.</b> — 6 min read"),
        },
      ],
    },
    {
      subject: "Your Uber trip receipt",
      cat: "updates",
      labels: ["receipts"],
      msgs: [
        {
          from: "noreply@uber.com",
          to: [me],
          at: d(5, 23, 59),
          html: P("Thanks for riding, Sam.", "<b>Total $23.48</b> · UberX · 6.2 mi · 21 min", "Williamsburg → Park Slope"),
        },
      ],
    },
    {
      subject: "Your statement is ready",
      cat: "updates",
      labels: ["finance"],
      msgs: [
        {
          from: "no.reply.alerts@chase.com",
          to: [me],
          at: d(7, 6, 0),
          html: P("Your Sapphire Reserve statement ending in 7781 is now available.", "Statement balance: <b>$2,418.06</b><br>Minimum payment due: $40.00 by Nov 4"),
        },
      ],
    },
    {
      subject: "Airbnb reservation confirmed — Alfama loft, Lisbon",
      cat: "updates",
      labels: ["travel"],
      msgs: [
        {
          from: "automated@airbnb.com",
          to: [me],
          at: d(8, 14, 20),
          html: P(
            "<b>You're going to Lisbon!</b>",
            "Sunny loft with river view in Alfama · Hosted by Inês",
            "Check-in Fri, Nov 13 after 3:00 PM · Checkout Sun, Nov 22 by 11:00 AM",
            "Total (USD) $1,412.60"
          ),
          att: [att("Itinerary-HM3Q2ZK9.pdf", 96)],
        },
      ],
    },
    {
      subject: "Lisbon itinerary ideas",
      labels: ["travel", "personal"],
      star: true,
      msgs: [
        {
          from: theo,
          to: [me],
          at: d(9, 19, 0),
          html: P(
            "Heard you're going to Lisbon! Jealous. My must-dos:",
            "<ul><li>Pastéis de Belém early (before 9) to skip the line</li><li>Sunset at Miradouro da Senhora do Monte</li><li>Day trip to Sintra — go to Pena Palace first thing</li><li>Dinner at Taberna da Rua das Flores (no reservations, get there at 6:45)</li><li>Surf lesson in Carcavelos if the swell is up</li></ul>",
            "Bring me back some ginjinha."
          ),
        },
        {
          from: me,
          to: [theo],
          at: d(9, 21, 15),
          html: P("This is gold, thank you! Sintra is now officially on the list. Ginjinha secured in advance 🍒"),
        },
      ],
    },
    {
      subject: "Dental cleaning reminder — Tue, Oct 20 at 8:30 AM",
      cat: "updates",
      msgs: [
        {
          from: "appointments@brightsmile-dental.com",
          to: [me],
          at: d(6, 9, 0),
          html: P("Hi Sam, this is a reminder of your upcoming appointment with Dr. Maya Lin on <b>Tuesday, October 20 at 8:30 AM</b>.", "Reply C to confirm or call (718) 555-0142 to reschedule."),
        },
      ],
    },
    {
      subject: "Design review notes — Billing settings",
      labels: ["atlas", "work"],
      msgs: [
        {
          from: marcus,
          to: [me, elena, diego],
          at: d(8, 15, 40),
          html: P(
            "Notes from today's crit:",
            "<ol><li>Proration preview: compute on submit for v1, live preview behind a flag</li><li>Seat count stepper needs min/max validation states</li><li>Invoice history table — add CSV export (Sam to scope)</li><li>Copy pass on downgrade warning — Elena</li></ol>",
            "Updated file is in Figma. Thanks all, good session."
          ),
        },
        {
          from: diego,
          to: [marcus, me, elena],
          at: d(8, 16, 5),
          html: P("+1 on submit-time proration. Live preview would add ~6 req/s per active user at peak, not worth it for v1."),
        },
      ],
    },
    {
      subject: "Offsite planning — vote on location",
      labels: ["work"],
      msgs: [
        {
          from: priya,
          to: [team],
          at: d(10, 12, 0),
          html: P(
            "Team! We have budget for a 3-day offsite in January. Please vote by Friday:",
            "<ol><li>Hudson Valley — cabins, hiking, cozy</li><li>Mexico City — food, culture, a bit of sun</li><li>Montréal — winter festival, poutine</li></ol>",
            "Reply with your top choice. Priya"
          ),
        },
        {
          from: me,
          to: [priya],
          at: d(10, 13, 22),
          html: P("Mexico City gets my vote 🌮"),
        },
      ],
    },
    {
      subject: "Tax documents for 2025",
      labels: ["finance"],
      imp: true,
      msgs: [
        {
          from: "no.reply.alerts@chase.com",
          to: [me],
          at: d(14, 7, 0),
          html: P("Your 1099-INT for tax year 2025 is ready to view in the Documents section of chase.com."),
          att: [att("1099-INT-2025.pdf", 52)],
        },
      ],
    },
    {
      subject: "Book club: next pick?",
      labels: ["personal"],
      msgs: [
        {
          from: theo,
          to: [me, kenji],
          at: d(12, 20, 40),
          html: P("We finished Tomorrow, and Tomorrow, and Tomorrow. Candidates for next month: <i>The Ministry of Time</i>, <i>James</i>, or <i>Intermezzo</i>. Thoughts?"),
        },
        {
          from: kenji,
          to: [theo, me],
          at: d(12, 21, 2),
          html: P("James. No contest."),
        },
      ],
    },
    {
      subject: "On-call handoff — week 41",
      labels: ["work"],
      msgs: [
        {
          from: diego,
          to: [me],
          at: d(13, 9, 0),
          html: P(
            "Handing on-call to you. Quiet week overall:",
            "<ul><li>2 pages for consumer lag on tenant 8812 (backfill, self-resolved)</li><li>1 false positive from the disk alert on worker-07 — I bumped the threshold to 90%</li></ul>",
            "Runbook is up to date. Good luck 🍀"
          ),
          att: [att("oncall-week41-notes.md", 6)],
        },
      ],
    },
    {
      subject: "Welcome to Northwind Notion 👋",
      cat: "updates",
      msgs: [
        {
          from: "notify@mail.notion.so",
          to: [me],
          at: d(30, 10, 0),
          html: P("Elena Petrova invited you to the <b>Atlas</b> teamspace.", "Open in Notion →"),
        },
      ],
    },
    {
      subject: "Proposal: deprecate the v1 webhooks API",
      labels: ["work", "atlas"],
      msgs: [
        {
          from: me,
          to: [priya, diego],
          cc: [elena],
          at: d(16, 14, 0),
          html: P(
            "Hi both,",
            "I've written up a proposal to deprecate v1 webhooks. TL;DR: 94% of traffic is already on v2, the remaining 31 tenants can be migrated with a compatibility shim, and it removes ~4k lines of retry logic we keep having to patch.",
            "Proposed timeline: announce Nov 1, shim live Dec 1, sunset Mar 31.",
            "Doc attached — comments welcome."
          ),
          att: [att("RFC-017-deprecate-webhooks-v1.pdf", 210)],
        },
        {
          from: priya,
          to: [me, diego],
          cc: [elena],
          at: d(15, 10, 30),
          html: P("Strongly support. Let's make sure CS has a migration template for the 31 tenants. Approved from my side."),
        },
      ],
    },
    {
      subject: "Thanks for the referral!",
      labels: ["personal"],
      msgs: [
        {
          from: theo,
          to: [me],
          at: d(20, 18, 0),
          html: P("Just signed the offer at Linear 🎉 Couldn't have done it without your intro. Drinks are on me next week."),
        },
        {
          from: me,
          to: [theo],
          at: d(20, 18, 30),
          html: P("Congrats!! So deserved. Holding you to those drinks 🍻"),
        },
      ],
    },
    {
      subject: "Mom's birthday gift — split?",
      labels: ["family"],
      msgs: [
        {
          from: jules,
          to: [me],
          at: d(22, 12, 10),
          html: P("Thinking we get her that pottery class she keeps mentioning + a nice vase? ~$180 total, split 50/50?"),
        },
        {
          from: me,
          to: [jules],
          at: d(22, 13, 0),
          html: P("Perfect idea. Venmo'd you $90 just now."),
        },
      ],
    },
    // Sent-only threads
    {
      subject: "Re: Hardware refresh — pick your laptop by Friday",
      labels: ["work"],
      loc: "archive",
      msgs: [
        {
          from: me,
          to: [tom],
          at: d(3, 15, 22),
          html: P("Hi Tom, I'll take the 16\" M5 Max please. Happy to drop the old one at your desk once the new one arrives. Thanks!"),
          quote: "<p>It's that time again! If your laptop is older than 3 years, you're eligible for a refresh.</p>",
        },
      ],
    },
    {
      subject: "Atlas: queue latency dashboards",
      labels: ["atlas"],
      loc: "archive",
      msgs: [
        {
          from: me,
          to: [diego],
          at: d(2, 10, 15),
          html: P("Diego — dashboards are live in Grafana under Atlas / Consumers. I added p50/p95/p99 lag per partition plus the new lease-lost counter. Let me know if you want different alert windows."),
        },
      ],
    },
    {
      subject: "Sourdough order for Sunday",
      labels: ["personal"],
      loc: "archive",
      msgs: [
        {
          from: me,
          to: ["orders@sullivanstreetbakery.com"],
          at: d(0, 7, 5),
          html: P("Hi there, could I reserve one olive sourdough loaf for pickup Sunday morning? Name: Sam Carter. Thank you!"),
        },
      ],
    },
    // Snoozed
    {
      subject: "Reminder: renew passport before Lisbon",
      labels: ["travel"],
      snoozed: now + 2 * DAY,
      msgs: [
        {
          from: jules,
          to: [me],
          at: d(11, 9, 0),
          html: P("Hey, didn't you say your passport expires in February? Portugal needs 3 months validity past your return date. Don't leave it to the last minute!!"),
        },
      ],
    },
    {
      subject: "Coffee next week?",
      labels: [],
      snoozed: now + 5 * HOUR,
      msgs: [
        {
          from: rachel,
          to: [me],
          at: d(4, 16, 0),
          html: P("Separate from the partnership stuff — would love to pick your brain on hiring for platform roles. Coffee next week, my treat?"),
        },
      ],
    },
    // Spam
    {
      subject: "⚠️ Unusual activity — verify your wallet within 24h",
      loc: "spam",
      unread: true,
      msgs: [
        {
          from: "security@c0inbase-alerts.net",
          to: [me],
          at: h(11),
          html: P("We detected an unusual login to your account. To avoid suspension, verify your identity immediately by clicking the link below and entering your recovery phrase.", "VERIFY NOW"),
        },
      ],
    },
    {
      subject: "Congratulations!!! You have been selected 🎁",
      loc: "spam",
      msgs: [
        {
          from: "winner@claim-rewards.biz",
          to: [me],
          at: d(2, 3, 14),
          html: P("You are our lucky visitor of the month! Claim your FREE iPhone 17 Pro by completing a short survey. Only 3 left!"),
        },
      ],
    },
    {
      subject: "Business proposal of mutual benefit",
      loc: "spam",
      msgs: [
        {
          from: "felix.adebayo@consultant-mail.org",
          to: [me],
          at: d(5, 2, 0),
          html: P("Dear friend, I am contacting you regarding the transfer of a substantial sum ($14,500,000 USD) that requires a trusted foreign partner…"),
        },
      ],
    },
    // Trash
    {
      subject: "Your weekly screen time report",
      loc: "trash",
      cat: "updates",
      msgs: [
        {
          from: "no_reply@email.apple.com",
          to: [me],
          at: d(6, 8, 0),
          html: P("Your screen time was down 12% last week, for an average of 3 hours, 41 minutes a day."),
        },
      ],
    },
    {
      subject: "Flash sale: 48 hours only",
      loc: "trash",
      cat: "promotions",
      msgs: [
        {
          from: "hello@allbirds.com",
          to: [me],
          at: d(9, 10, 0),
          html: P("Our best-sellers, up to 50% off. 48 hours only."),
        },
      ],
    },
  ];

  let tSeq = 0;
  let mSeq = 0;
  const threads: Thread[] = specs.map((sp) => {
    const id = `t${++tSeq}`;
    const fromMeOnly = sp.msgs.every((x) => x.from === me);
    const messages: Message[] = sp.msgs.map((x, i) => ({
      id: `m${++mSeq}`,
      from: x.from,
      to: x.to ?? [me],
      cc: x.cc,
      date: x.at,
      html: x.html,
      quote: x.quote,
      attachments: x.att ?? [],
      unread: !!sp.unread && x.from !== me && i === sp.msgs.length - 1,
    }));
    return {
      id,
      subject: sp.subject,
      messages,
      labels: sp.labels ?? [],
      category: sp.cat ?? "primary",
      location: sp.loc ?? (fromMeOnly ? "archive" : "inbox"),
      unread: !!sp.unread,
      starred: !!sp.star,
      important: sp.imp ?? (sp.cat ?? "primary") === "primary",
      snoozedUntil: sp.snoozed,
    };
  });

  const drafts: Draft[] = [
    {
      id: "d1",
      mode: "new",
      to: [rachel],
      cc: [priya],
      bcc: [],
      subject: "Atlas deep dive — proposed times",
      html: "<p>Hi Rachel,</p><p>Thanks again for reaching out. For the technical deep dive, would any of these work for you and your architect?</p><ul><li>Tue 2–3pm ET</li><li>Wed 11am–12pm ET</li></ul><p>I'll put together a short overview of our ingestion path beforehand.</p>",
      attachments: [],
      updatedAt: h(3),
    },
    {
      id: "d2",
      mode: "new",
      to: [hannah],
      cc: [],
      bcc: [],
      subject: "Re: Exciting Staff Engineer role at Acme",
      html: "<p>Hi Hannah,</p><p>Thanks for thinking of me. I'm quite happy at Northwind right now, but</p>",
      attachments: [],
      updatedAt: h(8),
    },
    {
      id: "d3",
      mode: "new",
      to: [elena, priya],
      cc: [],
      bcc: [],
      subject: "Atlas launch: post-launch monitoring plan",
      html: "<p>Hi Elena, Priya,</p><p>Here's the plan for the 72 hours after launch: dashboards are wired to PagerDuty, Diego and I split on-call, and we'll run a short retro on Monday.</p><p>Sam</p>",
      attachments: [],
      updatedAt: h(1),
      scheduledAt: (() => {
        const x = new Date(now);
        x.setDate(x.getDate() + 1);
        x.setHours(8, 0, 0, 0);
        return x.getTime();
      })(),
    },
  ];

  return {
    version: 3,
    threads,
    drafts,
    labels: SEED_LABELS,
    contacts: CONTACTS,
    settings: DEFAULT_SETTINGS,
    incomingQueue: 0,
  };
}

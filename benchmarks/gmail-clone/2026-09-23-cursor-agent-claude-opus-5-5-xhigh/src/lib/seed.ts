import { ME, PEOPLE } from "./contacts";
import { atHour, nextWeekday } from "./format";
import { flight, md, newsletter, notice, promo, receipt } from "./templates";
import type { Attachment, Category, Contact, Label, Message, PendingDelivery, Thread } from "./types";

type Who = keyof typeof PEOPLE | "me";

interface MsgSpec {
  from: Who;
  to?: Who[];
  cc?: Who[];
  ago: string;
  unread?: boolean;
  body: string;
  att?: [string, number][];
  draft?: boolean;
  scheduledAt?: number;
}

interface ThreadSpec {
  subject: string;
  category?: Category;
  labels?: string[];
  starred?: boolean;
  important?: boolean;
  inbox?: boolean;
  spam?: boolean;
  trashed?: boolean;
  snoozedUntil?: number;
  messages: MsgSpec[];
}

export const SEED_LABELS: Label[] = [
  { id: "work", name: "Work", color: "blue" },
  { id: "clients", name: "Clients", color: "red" },
  { id: "design", name: "Design", color: "purple" },
  { id: "family", name: "Family", color: "pink" },
  { id: "personal", name: "Personal", color: "green" },
  { id: "travel", name: "Travel", color: "orange" },
  { id: "finance", name: "Finance", color: "teal" },
  { id: "receipts", name: "Receipts", color: "gray" },
];

function parseAgo(s: string) {
  let ms = 0;
  for (const [, n, unit] of s.matchAll(/(\d+)\s*([mhd])/g)) {
    const v = Number(n);
    ms += unit === "m" ? v * 60_000 : unit === "h" ? v * 3_600_000 : v * 86_400_000;
  }
  return ms;
}

const who = (w: Who): Contact => (w === "me" ? ME : { name: PEOPLE[w].name, email: PEOPLE[w].email });

function buildThreads(now: number): ThreadSpec[] {
  const tomorrow9 = atHour(now, 1, 9);
  const tomorrow8 = atHour(now, 1, 8);
  const nextMonday = nextWeekday(now, 1, 8);

  return [
    // ───────────────────────── PRIMARY ─────────────────────────
    {
      subject: "Atlas launch — final checklist for Thursday",
      labels: ["work"],
      starred: true,
      important: true,
      messages: [
        {
          from: "maya",
          to: ["me"],
          cc: ["jordan", "priya"],
          ago: "5h",
          att: [["Atlas_Launch_Checklist.pdf", 284_000]],
          body: `Hi Avery,

Here's where we are for Thursday's launch. I've attached the full checklist, but the short version:

- **Feature flags:** atlas_v2 is at 25% internally, ramping to 100% Wednesday at 4pm
- **Rollback plan:** Jordan wrote the runbook, one command and we're back on v1 in under 3 minutes
- **Support macros:** drafted, waiting on your review
- **Status page copy:** Leo has it, needs final sign-off

The only real open question is whether we send the announcement email Thursday morning or wait until we've seen 24 hours of error rates. I'd lean toward waiting, but it's your call.

Thanks,
Maya`,
        },
        {
          from: "jordan",
          to: ["maya", "me"],
          cc: ["priya"],
          ago: "3h",
          body: `+1 on waiting for the email. Load test last night held at 3.2x peak with p95 under 180ms, so I'm not worried about capacity. I just want a clean day of metrics before we shout about it.

One more thing: the billing webhook migration (PR #482) needs to land before we ramp. Avery, can you give it a look today?

— J`,
        },
        {
          from: "maya",
          to: ["me"],
          cc: ["jordan", "priya"],
          ago: "22m",
          unread: true,
          body: `Update: Priya finished the empty-state illustrations, so design is fully done. 🎉

Avery, if you can confirm the email timing by end of day, I'll update the launch doc and send the go/no-go invite for Wednesday 3pm.

Maya`,
        },
      ],
    },
    {
      subject: "Brightpath onboarding flow — feedback",
      labels: ["clients"],
      important: true,
      messages: [
        {
          from: "me",
          to: ["rachel"],
          ago: "1d2h",
          body: `Hi Rachel,

Thanks for walking us through the patient onboarding research on Tuesday. We've put together a revised flow that cuts the intake from 7 screens to 4:

1. Account + insurance card scan (combined)
2. Health history, with smart skips based on age
3. Care preferences
4. Review & book

Mockups are in the shared folder. Would love your team's reactions before our sync on Friday.

Best,
Avery`,
        },
        {
          from: "rachel",
          to: ["me"],
          ago: "1h",
          unread: true,
          att: [["onboarding-annotated.png", 1_840_000]],
          body: `Avery, this is a big improvement. Our clinical team loved the insurance-card scan combined with account creation.

A few notes (annotated screenshot attached):

- The "smart skips" in step 2 need a visible way to go back. Our compliance folks flagged that patients must be able to review every answer.
- Can we show an estimated time ("about 3 minutes") on the first screen?
- Step 4 should surface the cancellation policy before the Book button, not after.

Otherwise we're ready to move into a usability round next week. Could your team have a clickable prototype by Wednesday?

Rachel Nguyen
VP Product · Brightpath Health`,
        },
      ],
    },
    {
      subject: "Dinner Sunday? 🥟",
      labels: ["family"],
      messages: [
        {
          from: "mom",
          to: ["me"],
          cc: ["ethan"],
          ago: "2h",
          unread: true,
          body: `Hi sweetheart,

Are you free for dinner this Sunday? Dad wants to try the new dumpling recipe from Auntie May (the one with the chives), and Ethan said he can come around 5.

Bring Miso! Dad bought her one of those squeaky toys shaped like a carrot. 🥕

Let me know so I know how much to make. Love you.

Mom`,
        },
      ],
    },
    {
      subject: "Q4 planning offsite — agenda draft",
      labels: ["work"],
      important: true,
      messages: [
        {
          from: "hannah",
          to: ["me", "maya", "leo", "tom"],
          ago: "4h",
          unread: true,
          att: [["Q4_Offsite_Agenda.docx", 96_000]],
          body: `Team,

Attached is a first draft of the agenda for the Q4 offsite (Oct 28–29, Sonoma). A few things I'd like each of you to bring:

- **Avery:** a 20-minute product strategy readout, where Atlas goes after launch and what we're saying no to
- **Maya:** hiring plan + platform investment asks
- **Leo:** brand refresh direction (one concept, not three 🙂)
- **Tom:** FY27 budget scenarios

I want day one to be mostly listening. Day two is decisions. Please send comments on the agenda by Friday.

Hannah`,
        },
      ],
    },
    {
      subject: "Invitation: Design critique — Atlas empty states @ Thu 2pm – 3pm",
      labels: ["work", "design"],
      messages: [
        {
          from: "calendar",
          to: ["me", "maya", "kai"],
          ago: "6h",
          att: [["invite.ics", 2_100]],
          body: notice({
            brand: "Calendar",
            color: "#1a73e8",
            icon: "📅",
            title: "Design critique — Atlas empty states",
            body: `<b>When</b><br>Thursday · 2:00 – 3:00pm (Pacific Time)<br><br><b>Where</b><br>Room 4B “Fern” / video link in the event<br><br><b>Organizer</b><br>Priya Raman<br><br><b>Guests</b><br>Avery Chen · Maya Patel · Kai Tanaka<br><br>Walking through the final empty-state illustrations and copy for Atlas. Please look at the Framewise file beforehand and drop comments inline.`,
            cta: "Yes · Maybe · No",
            meta: "Invitation from Calendar. You are receiving this email because you are an attendee on the event.",
          }),
        },
      ],
    },
    {
      subject: "Illustrations for the help center",
      labels: ["design", "clients"],
      starred: true,
      messages: [
        {
          from: "elena",
          to: ["me"],
          ago: "2d5h",
          body: `Hi Avery!

Quick check-in on the help center illustrations. I have the hero at about 80% and six of the ten spot illustrations sketched. Before I go to color:

- Are we still going with the warm palette from the brand refresh, or should I stay on current brand colors?
- For the "billing" spot, do you want the calculator motif or something more abstract?

Talk soon,
Elena`,
        },
        {
          from: "me",
          to: ["elena"],
          ago: "2d3h",
          body: `Hey Elena,

Stay on current brand colors for now. Leo's refresh won't ship until Q1, and we can recolor later.

For billing, go abstract. The calculator felt a bit 2012 in the last round. 😄

Can't wait to see them.
Avery`,
        },
        {
          from: "elena",
          to: ["me"],
          ago: "8h",
          unread: true,
          att: [
            ["help-center-hero_v3.png", 2_450_000],
            ["spot-illustrations.zip", 18_900_000],
            ["Invoice_0147_StudioOrbit.pdf", 142_000],
          ],
          body: `Here they are! Hero v3 plus all ten spots (SVG + PNG @2x in the zip).

I went with overlapping cards for billing. Abstract but still reads as "money stuff". Let me know if anything needs another pass; I have time next week.

Invoice for this milestone is attached as well. Net 30 as usual.

✨ Elena
Studio Orbit`,
        },
      ],
    },
    {
      subject: "Climbing Saturday?",
      labels: ["personal"],
      messages: [
        {
          from: "ben",
          to: ["me"],
          ago: "1d6h",
          body: `Yo! Crag or gym this Saturday? Forecast says 68° and sunny, which feels illegal for October.

I'm thinking Castle Rock, the 5.9 corner we bailed on last time. Redemption arc.`,
        },
        {
          from: "me",
          to: ["ben"],
          ago: "1d4h",
          body: `Castle Rock for sure. I'll bring the rack and the 70m rope.

Leave at 7:30? I can pick you up.`,
        },
        {
          from: "ben",
          to: ["me"],
          ago: "20h",
          body: `7:30 works. Nora might join too, she just got new shoes and won't stop talking about them.

I'll bring breakfast burritos. You bring coffee. Deal?`,
        },
        {
          from: "ben",
          to: ["me"],
          ago: "12h",
          body: `Also, found this: the upper parking lot is closed for repairs, so we'll need to park at the lower lot and hike an extra 15 min. Still worth it. 🧗`,
        },
      ],
    },
    {
      subject: "Your lease renewal — Unit 3B",
      labels: ["personal", "finance"],
      messages: [
        {
          from: "greg",
          to: ["me"],
          ago: "1d9h",
          att: [["Lease_Renewal_2027_Unit3B.pdf", 412_000]],
          body: `Hi Avery,

Your current lease for Unit 3B ends on December 31. I'm happy to renew for another 12 months at $2,840/month (a 3% increase, below the city cap).

The renewal agreement is attached. If you could sign and return it by November 15, that'd be great. Let me know if you'd prefer a month-to-month arrangement instead, but the rate would be higher.

Also, the building will be repainting the stairwells the week of the 20th. Sorry in advance for the smell!

Best,
Greg Paulson
Paulson Properties`,
        },
      ],
    },
    {
      subject: "Expense reports due Friday — September",
      labels: ["work", "finance"],
      messages: [
        {
          from: "tom",
          to: ["me"],
          ago: "1d11h",
          body: `Hi Avery,

Friendly reminder that September expense reports are due this Friday. I see two pending items on your card:

- Sep 14 · Brightpath client dinner · $186.40
- Sep 22 · Framewise annual seat · $144.00

Just attach receipts in Groundwork and submit. Thanks!

Tom`,
        },
      ],
    },
    {
      subject: "Coffee next week?",
      important: true,
      messages: [
        {
          from: "marcus",
          to: ["me"],
          ago: "2d2h",
          body: `Avery,

Been hearing great things about the Atlas beta from a couple of founders in our portfolio. Would love to grab coffee next week and hear how the launch goes. No agenda, just catching up.

I'm free Tuesday or Wednesday morning near Hayes Valley. Does either work?

Marcus`,
        },
        {
          from: "me",
          to: ["marcus"],
          ago: "1d",
          draft: true,
          body: `Hi Marcus,

Would love to. Wednesday at 9 works. How about Ritual on Octavia?

`,
        },
      ],
    },
    {
      subject: "Photos from the lake house 📸",
      labels: ["family"],
      starred: true,
      messages: [
        {
          from: "ethan",
          to: ["me", "mom"],
          ago: "3d4h",
          att: [
            ["IMG_2041.jpg", 3_200_000],
            ["IMG_2047.jpg", 2_900_000],
            ["IMG_2063.jpg", 3_400_000],
            ["IMG_2088.jpg", 2_750_000],
          ],
          body: `Finally got these off my camera. The sunset one from the dock is my new lock screen.

Miso in the kayak is an all-timer. 🐕🛶`,
        },
        {
          from: "me",
          to: ["ethan", "mom"],
          ago: "3d2h",
          body: `These are amazing!! Printing the dock one for Mom's birthday.

Same time next year? I'll book the place early this time.`,
        },
        {
          from: "mom",
          to: ["me", "ethan"],
          ago: "3d",
          body: `Beautiful! Dad says he wants the one of him "catching" the fish. We all know it was 4 inches. 😂

Yes to next year!`,
        },
      ],
    },
    {
      subject: "Senior Product Lead at Northstar — quick intro?",
      messages: [
        {
          from: "sam",
          to: ["me"],
          ago: "3d6h",
          body: `Hi Avery,

I'm working with Northstar (Series C, climate analytics, ~180 people) on a Senior Product Lead search. Your work on Atlas came up more than once in conversations with their leadership.

I know you're likely heads-down, but would you be open to a 15-minute call? Even if the timing isn't right, happy to keep you in mind for the future.

Best,
Sam Okafor
TalentBridge`,
        },
      ],
    },
    {
      subject: "Appointment reminder: Thu, Oct 2 at 8:30 AM",
      labels: ["personal"],
      messages: [
        {
          from: "dental",
          to: ["me"],
          ago: "3d9h",
          body: notice({
            brand: "Riverside Dental",
            color: "#00897b",
            icon: "🦷",
            title: "See you soon, Avery!",
            body: `This is a reminder of your upcoming appointment:<br><br><b>Cleaning & exam</b> with Dr. Alicia Moreau<br>Thursday, October 2 · 8:30 AM<br>1420 Riverside Ave, Suite 200<br><br>Please arrive 10 minutes early. Need to reschedule? Reply to this email or call (415) 555-0142 at least 24 hours in advance.`,
            cta: "Confirm appointment",
          }),
        },
      ],
    },
    {
      subject: "Miso's vaccination records",
      labels: ["personal"],
      messages: [
        {
          from: "vet",
          to: ["me"],
          ago: "4d3h",
          att: [["Miso_Vaccination_Record.pdf", 198_000]],
          body: `Hi Avery,

As requested, attached is Miso's full vaccination record, including the rabies booster from last week. This should be everything the boarding facility needs.

Miso was a star patient as always. She got two treats and a lot of praise. 🐾

Warmly,
The team at Maple Street Vet`,
        },
      ],
    },
    {
      subject: "Analytics dashboard numbers look off",
      labels: ["work"],
      important: true,
      messages: [
        {
          from: "sofia",
          to: ["me", "diego"],
          ago: "5d4h",
          att: [["retention_cohorts.csv", 48_000]],
          body: `Hey both,

The weekly active number on the Atlas dashboard jumped 38% overnight, which, as much as I'd love it, isn't real. The cohort export (attached) shows a spike of sessions with no user id starting Tuesday at 02:00 UTC.

Diego, did anything change in the event pipeline around then?`,
        },
        {
          from: "diego",
          to: ["sofia", "me"],
          ago: "5d2h",
          body: `Ugh, yes. We deployed the new SDK version Monday night. It fires a session_start on every background refresh for logged-out users. So we're double-counting anonymous sessions.

Fix is small. I can have it out tomorrow. Backfill will take longer.`,
        },
        {
          from: "me",
          to: ["sofia", "diego"],
          ago: "4d8h",
          body: `Thanks for catching this so fast. Let's:

1. Ship the SDK fix tomorrow
2. Add an annotation on the dashboard so nobody quotes the spike
3. Backfill whenever it's safe. No rush, but before the board deck on the 10th

Sofia, can you also add an alert for >20% day-over-day swings?`,
        },
        {
          from: "sofia",
          to: ["me", "diego"],
          ago: "4d6h",
          body: `Annotation is up, and the alert is configured (20% threshold, Slack #data-alerts). 👍`,
        },
        {
          from: "diego",
          to: ["sofia", "me"],
          ago: "4d1h",
          body: `SDK fix is live. Backfill job is running overnight; I'll post in #atlas when it's done. Numbers should be back to normal by tomorrow's standup.`,
        },
      ],
    },
    {
      subject: "Please welcome Kai Tanaka to the design team!",
      labels: ["work"],
      messages: [
        {
          from: "people",
          to: ["me"],
          ago: "5d7h",
          body: `Hi everyone,

Please join us in welcoming **Kai Tanaka**, who joins us today as a Product Designer on Priya's team! Kai comes to us from a healthtech startup where they led design for a patient-facing mobile app.

A few fun facts:
- Has visited 31 national parks (and counting)
- Makes a mean miso ramen from scratch
- Once won a regional pinball championship

Kai's onboarding buddy is Avery. Say hi in #general! 👋

The People Team`,
        },
      ],
    },
    {
      subject: "Happy birthday!! 🎂",
      labels: ["personal"],
      starred: true,
      messages: [
        {
          from: "nora",
          to: ["me"],
          ago: "8d3h",
          body: `HAPPY BIRTHDAY AVERY!!! 🎉🎂🥳

Another trip around the sun. Hope today is full of cake, zero Slack notifications, and at least one nap.

Drinks on me Friday. I've already told Ben he's not allowed to talk about climbing gear the whole time.

Love you lots,
Nora`,
        },
      ],
    },
    {
      subject: "Lisbon trip — itinerary ideas",
      labels: ["travel", "personal"],
      messages: [
        {
          from: "nora",
          to: ["me"],
          ago: "9d",
          body: `OK I've been doing research (obviously). Rough plan:

- **Day 1:** Alfama, get lost, Miradouro da Senhora do Monte for sunset
- **Day 2:** Sintra day trip (Pena Palace early before the crowds!)
- **Day 3:** LX Factory + Belém, pastéis de nata taste test
- **Day 4:** Cascais beach day
- **Day 5:** Free day / fado night

Thoughts? Too ambitious?`,
        },
        {
          from: "me",
          to: ["nora"],
          ago: "8d20h",
          body: `This is perfect. Maybe swap days 3 and 4 so the beach day isn't right before we fly home?

Also I'm adding a Time Out Market dinner somewhere. Non-negotiable.`,
        },
        {
          from: "nora",
          to: ["me"],
          ago: "7d",
          body: `Swapped! And yes to Time Out Market. I've booked the Sintra train tickets. We're officially doing this. 🇵🇹✈️`,
        },
      ],
    },
    {
      subject: "Brand refresh — first concepts",
      labels: ["work", "design"],
      messages: [
        {
          from: "leo",
          to: ["me", "priya"],
          ago: "10d",
          att: [
            ["Lumen_Brand_Concepts_v1.pdf", 4_200_000],
            ["Brand_Refresh_Kickoff.pptx", 7_800_000],
          ],
          body: `Hi Avery, Priya,

First round of brand concepts from the agency attached. Three directions:

- **Aurora:** soft gradients, rounded type, very approachable
- **Lattice:** geometric system, strong grid, feels "infrastructure"
- **Ember:** warm palette, editorial serif, most distinctive

My gut says Lattice for credibility with enterprise buyers, but Ember is the one people remember. Would love your takes before Thursday's review.

Leo`,
        },
      ],
    },
    {
      subject: "Laptop refresh program: pick your new machine",
      labels: ["work"],
      messages: [
        {
          from: "it",
          to: ["me"],
          ago: "12d",
          body: `Hi Avery,

Your laptop is eligible for our refresh program. Please pick your preferred configuration by October 15:

- 14" (M-series, 32 GB, 1 TB), recommended for most roles
- 16" (M-series Max, 64 GB, 2 TB), engineering & design

Your current machine will be securely wiped and donated to our partner nonprofit. Reply with your choice or submit it in the IT portal.

Lumen IT`,
        },
      ],
    },
    {
      subject: "Your 1099-INT for 2025 is ready",
      labels: ["finance"],
      category: "updates",
      messages: [
        {
          from: "harbor",
          to: ["me"],
          ago: "40d",
          body: notice({
            brand: "Harbor Bank",
            color: "#0b4f6c",
            icon: "⚓",
            title: "Your tax documents are available",
            body: `Your 2025 Form 1099-INT for account ending in <b>4821</b> is now available in online banking under <b>Statements & Documents → Tax forms</b>.<br><br>For your security, we never attach tax documents to email.`,
            cta: "View documents",
          }),
        },
      ],
    },
    {
      subject: "Save the date: Jess & Omar 💍",
      labels: ["personal"],
      starred: true,
      messages: [
        {
          from: "jess",
          to: ["me"],
          ago: "62d",
          body: `Avery!!

It's official: Omar and I are getting married on **June 13, 2027** in Santa Barbara! 🌊💍

Formal invitation to come, but please save the date. We'd love for you (and a plus one 👀) to be there.

xo,
Jess`,
        },
      ],
    },

    // ───────────────────────── PROMOTIONS ─────────────────────────
    {
      subject: "Fall layers are here — 25% off jackets this weekend 🍂",
      category: "promotions",
      messages: [
        {
          from: "trailhead",
          to: ["me"],
          ago: "3h",
          unread: true,
          body: promo({
            brand: "TRAILHEAD OUTFITTERS",
            color: "#2e5e4e",
            kicker: "Weekend event",
            headline: "Layer up. Save 25% on every jacket.",
            body: "From featherweight wind shells to our warmest down parka, gear up for crisp mornings on the trail.",
            cta: "Shop jackets",
            hero: "linear-gradient(135deg,#f3e7d3,#e8c9a0)",
            heroEmoji: "🧥",
            code: "LAYERUP25",
            tiles: [
              { title: "Ridgeline Down Parka", sub: "$239 → $179", emoji: "🧥", bg: "#e7efe9" },
              { title: "Switchback Fleece", sub: "$89 → $66", emoji: "🧶", bg: "#f5ece1" },
              { title: "Summit Beanie", sub: "$28 → $21", emoji: "🧢", bg: "#e9ecf5" },
            ],
            address: "Trailhead Outfitters · 88 Alpine Way, Boulder, CO",
          }),
        },
      ],
    },
    {
      subject: "Your October roast: Ethiopia Guji 🌸",
      category: "promotions",
      messages: [
        {
          from: "bean",
          to: ["me"],
          ago: "1d1h",
          unread: true,
          body: promo({
            brand: "Bean & Barrel",
            color: "#6f4e37",
            kicker: "Subscriber exclusive",
            headline: "Floral, jammy, and ready to ship Monday",
            body: "This month's single origin comes from the Hambela Wamena washing station: notes of jasmine, blueberry and bergamot. Your bag roasts Friday.",
            cta: "Manage my subscription",
            hero: "linear-gradient(135deg,#3b2a20,#6f4e37)",
            heroEmoji: "☕",
            dark: true,
            tiles: [
              { title: "Pour-over guide", sub: "1:16 ratio · 94°C", emoji: "🫖", bg: "#f4ede6" },
              { title: "Add a mug", sub: "Stoneware · $24", emoji: "🍵", bg: "#efe7f3" },
            ],
            address: "Bean & Barrel Roasters · 410 Mission St, San Francisco",
          }),
        },
      ],
    },
    {
      subject: "Members' preview: The Quiet Orbit — tickets open now",
      category: "promotions",
      messages: [
        {
          from: "lumiere",
          to: ["me"],
          ago: "2d4h",
          body: promo({
            brand: "LUMIÈRE CINEMAS",
            color: "#b3261e",
            kicker: "Members first",
            headline: "The Quiet Orbit, in 70mm",
            body: "Two nights only before general release. Members get early access and a free large popcorn with every ticket.",
            cta: "Choose your seats",
            hero: "linear-gradient(160deg,#0f1b3d,#3a1c4a)",
            heroEmoji: "🎬",
            dark: true,
            address: "Lumière Cinemas · 2201 Castro St, San Francisco",
          }),
        },
      ],
    },
    {
      subject: "Last chance: 40% off linen bedding",
      category: "promotions",
      messages: [
        {
          from: "nordhaus",
          to: ["me"],
          ago: "3d5h",
          body: promo({
            brand: "NORDHAUS",
            color: "#44403c",
            kicker: "Ends tonight",
            headline: "Stonewashed linen, softer with every wash",
            body: "Our best-selling sheet sets, duvet covers and pillowcases, now 40% off in all eight seasonal colors.",
            cta: "Shop the sale",
            hero: "linear-gradient(135deg,#ede6dc,#d9cfc1)",
            heroEmoji: "🛏️",
            tiles: [
              { title: "Sheet set", sub: "from $132", emoji: "🛏️", bg: "#f1ede7" },
              { title: "Duvet cover", sub: "from $168", emoji: "☁️", bg: "#e8edf1" },
              { title: "Throw blanket", sub: "$84", emoji: "🧺", bg: "#efe9e1" },
            ],
            address: "Nordhaus Home · Copenhagen · Brooklyn",
          }),
        },
      ],
    },
    {
      subject: "Your September picks + a free tote 📚",
      category: "promotions",
      messages: [
        {
          from: "paperback",
          to: ["me"],
          ago: "5d2h",
          body: promo({
            brand: "Paperback Club",
            color: "#c2410c",
            kicker: "Book of the month",
            headline: "Three new picks, one very cute tote",
            body: "A literary thriller set in a Norwegian lighthouse, a warm debut about a family bakery, and the most talked-about essay collection of the year.",
            cta: "Make my pick",
            hero: "linear-gradient(135deg,#fde7d3,#fbd0b4)",
            heroEmoji: "📚",
            address: "Paperback Club · 12 Bookbinder Ln, Portland, OR",
          }),
        },
      ],
    },
    {
      subject: "Your Autumn Mix is ready 🎧",
      category: "promotions",
      messages: [
        {
          from: "tempo",
          to: ["me"],
          ago: "6d",
          body: promo({
            brand: "tempo",
            color: "#7c3aed",
            kicker: "Made for Avery",
            headline: "50 songs for shorter days",
            body: "Based on your late-night lo-fi sessions and that indie folk phase you're definitely still in.",
            cta: "Listen now",
            hero: "linear-gradient(135deg,#312e81,#7c3aed,#db2777)",
            heroEmoji: "🎧",
            dark: true,
            address: "Tempo Music Inc.",
          }),
        },
      ],
    },
    {
      subject: "$10 off your next 3 orders 🍕",
      category: "promotions",
      messages: [
        {
          from: "forkful",
          to: ["me"],
          ago: "8d",
          body: promo({
            brand: "forkful",
            color: "#e11d48",
            kicker: "We miss you",
            headline: "Dinner's on us (sort of)",
            body: "Get $10 off each of your next three orders of $25+. Valid through Sunday at participating restaurants.",
            cta: "Order now",
            hero: "linear-gradient(135deg,#ffe4e6,#fecdd3)",
            heroEmoji: "🍕",
            code: "BACK4MORE",
            address: "Forkful Delivery · Oakland, CA",
          }),
        },
      ],
    },
    {
      subject: "Fly to Tokyo from $689 round trip ✈️",
      category: "promotions",
      messages: [
        {
          from: "skylineDeals",
          to: ["me"],
          ago: "12d",
          body: promo({
            brand: "SKYLINE AIRWAYS",
            color: "#0b57d0",
            kicker: "Fare sale · 72 hours",
            headline: "Cherry blossom season is closer than you think",
            body: "Round-trip fares from San Francisco to Tokyo, Osaka and Seoul, for travel January through April.",
            cta: "Find flights",
            hero: "linear-gradient(135deg,#fce7f3,#dbeafe)",
            heroEmoji: "🌸",
            tiles: [
              { title: "Tokyo", sub: "from $689", emoji: "🗼", bg: "#fdecef" },
              { title: "Osaka", sub: "from $712", emoji: "🏯", bg: "#eef2fd" },
              { title: "Seoul", sub: "from $654", emoji: "🌆", bg: "#eefaf3" },
            ],
            address: "Skyline Airways · SFO Terminal 2",
          }),
        },
      ],
    },

    // ───────────────────────── SOCIAL ─────────────────────────
    {
      subject: "Maya Patel endorsed you for Product Strategy",
      category: "social",
      messages: [
        {
          from: "connectly",
          to: ["me"],
          ago: "5h",
          unread: true,
          body: notice({
            brand: "Connectly",
            color: "#0a66c2",
            icon: "in",
            title: "Maya Patel endorsed you for Product Strategy",
            body: "Maya Patel, Engineering Manager at Lumen Labs, endorsed you for <b>Product Strategy</b>. You now have 42 endorsements for this skill.<br><br>Endorse Maya back for <b>Engineering Management</b>?",
            cta: "View profile",
          }),
        },
      ],
    },
    {
      subject: "Ben Adeyemi mentioned you in a post",
      category: "social",
      messages: [
        {
          from: "circle",
          to: ["me"],
          ago: "1d3h",
          unread: true,
          body: notice({
            brand: "Circle",
            color: "#f97316",
            icon: "◎",
            title: "Ben mentioned you",
            body: `<i>“Sending the Castle Rock corner this weekend with @avery. Third time's the charm 🧗‍♂️”</i><br><br>14 likes · 3 comments`,
            cta: "See post",
          }),
        },
      ],
    },
    {
      subject: "Design Systems Meetup — Thursday at Foundry Hall",
      category: "social",
      messages: [
        {
          from: "gather",
          to: ["me"],
          ago: "2d6h",
          body: notice({
            brand: "Gather Events",
            color: "#16a34a",
            icon: "✦",
            title: "SF Design Systems Meetup #41",
            body: "<b>Thursday, 6:30 PM</b> · Foundry Hall, 550 Townsend St<br><br>Talks: “Tokens at scale: lessons from 3 rebrands” and “Accessible motion without the jank”. Pizza and drinks provided. 87 people going, including 3 people you know.",
            cta: "RSVP",
          }),
        },
      ],
    },
    {
      subject: "You crushed your weekly goal 🏃",
      category: "social",
      messages: [
        {
          from: "stride",
          to: ["me"],
          ago: "3d1h",
          body: notice({
            brand: "Stride",
            color: "#fc4c02",
            icon: "⚡",
            title: "21.4 km this week, 107% of your goal",
            body: "Longest run: 9.2 km along the Embarcadero. Your average pace improved by 12 seconds per km compared to last week. Ben gave you kudos. 👏",
            cta: "See your week",
          }),
        },
      ],
    },
    {
      subject: "You appeared in 34 searches this week",
      category: "social",
      messages: [
        {
          from: "connectly",
          to: ["me"],
          ago: "6d4h",
          body: notice({
            brand: "Connectly",
            color: "#0a66c2",
            icon: "in",
            title: "Your profile is getting noticed",
            body: "You appeared in <b>34 searches</b> this week. People who searched for you work at Northstar, Brightpath Health and Webb Ventures.",
            cta: "See all searches",
          }),
        },
      ],
    },
    {
      subject: "Nora shared an album with you: “Big Sur weekend”",
      category: "social",
      messages: [
        {
          from: "circle",
          to: ["me"],
          ago: "9d2h",
          body: notice({
            brand: "Circle",
            color: "#f97316",
            icon: "◎",
            title: "Nora shared 48 photos with you",
            body: "“Big Sur weekend 🌊🌲”. Nora added you as a contributor. Add your own photos from the trip!",
            cta: "Open album",
          }),
        },
      ],
    },

    // ───────────────────────── UPDATES ─────────────────────────
    {
      subject: "[lumen/atlas] Migrate billing webhooks to queue (PR #482)",
      category: "updates",
      labels: ["work"],
      messages: [
        {
          from: "pixelhub",
          to: ["me"],
          ago: "40m",
          unread: true,
          body: notice({
            brand: "Pixelhub",
            color: "#24292f",
            icon: "⌘",
            title: "@jordan requested your review on #482",
            body: `<b>Migrate billing webhooks to queue</b><br><br>Moves Stripe-style webhook handling from the request thread into the job queue with idempotency keys and exponential backoff.<br><br><code style="background:#f6f8fa;padding:2px 6px;border-radius:4px">+412 −186</code> across 14 files · All checks passed ✅`,
            cta: "Review pull request",
            meta: "You are receiving this because your review was requested. Reply to this email directly or view it on Pixelhub.",
          }),
        },
      ],
    },
    {
      subject: "The Morning Byte: chips, courts, and the quiet AI rollout",
      category: "updates",
      messages: [
        {
          from: "morningbyte",
          to: ["me"],
          ago: "2h30m",
          unread: true,
          body: newsletter({
            name: "The Morning Byte",
            color: "#d97706",
            date: new Date(now).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
            intro: "Good morning! Today: a chip shortage that isn't, a courtroom showdown over app stores, and why the most interesting AI launches of the year are the ones nobody announced.",
            stories: [
              {
                tag: "Hardware",
                title: "The chip shortage that wasn't",
                body: "Inventory data suggests the much-feared memory crunch has quietly eased, with contract prices down 8% quarter over quarter.",
              },
              {
                tag: "Policy",
                title: "App store fees head back to court",
                body: "A federal appeals panel will hear arguments on whether in-app payment rules violate competition law. A ruling could arrive before year end.",
              },
              {
                tag: "AI",
                title: "The quiet rollout",
                body: "Enterprise software vendors are shipping assistants without press releases, and customers are using them more than the loud launches.",
              },
            ],
          }),
        },
      ],
    },
    {
      subject: "Weekly digest: 12 tasks completed in Atlas",
      category: "updates",
      labels: ["work"],
      messages: [
        {
          from: "groundwork",
          to: ["me"],
          ago: "7h",
          body: notice({
            brand: "Groundwork",
            color: "#5b5bd6",
            icon: "◆",
            title: "Atlas · Week 39 summary",
            body: `<b>12 completed</b> · 5 in progress · 2 blocked<br><br>✅ Empty state illustrations (Priya)<br>✅ Load test at 3x peak (Jordan)<br>✅ SDK session fix (Diego)<br>⏳ Billing webhook migration (in review)<br>⛔ Status page copy (waiting on Leo)`,
            cta: "Open project",
          }),
        },
      ],
    },
    {
      subject: "Priya commented on “Atlas — Empty states”",
      category: "updates",
      labels: ["design"],
      messages: [
        {
          from: "framewise",
          to: ["me"],
          ago: "9h",
          unread: true,
          body: notice({
            brand: "Framewise",
            color: "#a142f4",
            icon: "✎",
            title: "New comment in Atlas — Empty states",
            body: `<b>Priya Raman</b> on frame “No projects yet”:<br><br><i>“@Avery I shortened the headline to fit on one line at 320px. Can you double-check the tone? ‘Nothing here yet’ vs ‘Start your first project’.”</i>`,
            cta: "Reply in Framewise",
          }),
        },
      ],
    },
    {
      subject: "Your package is out for delivery 📦",
      category: "updates",
      messages: [
        {
          from: "swiftship",
          to: ["me"],
          ago: "1d",
          unread: true,
          body: notice({
            brand: "SwiftShip",
            color: "#f59e0b",
            icon: "📦",
            title: "Arriving today by 8 PM",
            body: "Your package from <b>Parcel & Co</b> (order PC-20418) is on the truck.<br><br>Tracking number: <b>SS 7741 2208 9913</b><br>Delivery address: 1188 Fell St, Unit 3B<br><br>No signature required.",
            cta: "Track package",
          }),
        },
      ],
    },
    {
      subject: "Security alert: new sign-in on Mac",
      category: "updates",
      messages: [
        {
          from: "accounts",
          to: ["me"],
          ago: "1d5h",
          body: notice({
            brand: "Lumen Accounts",
            color: "#188038",
            icon: "🔒",
            title: "New sign-in to your account",
            body: "We noticed a new sign-in to <b>avery@lumenlabs.io</b> on a Mac (Safari) near San Francisco, CA.<br><br>If this was you, you don't need to do anything. If not, we'll help you secure your account.",
            cta: "Check activity",
          }),
        },
      ],
    },
    {
      subject: "Your September statement is ready",
      category: "updates",
      labels: ["finance"],
      messages: [
        {
          from: "harbor",
          to: ["me"],
          ago: "1d8h",
          body: notice({
            brand: "Harbor Bank",
            color: "#0b4f6c",
            icon: "⚓",
            title: "Statement available for checking ••4821",
            body: "Your statement for the period ending September 30 is ready to view.<br><br>Ending balance: <b>$8,412.36</b><br>Deposits: $11,240.00 · Withdrawals: $7,905.19",
            cta: "View statement",
          }),
        },
      ],
    },
    {
      subject: "Your Tuesday evening ride with Glide",
      category: "updates",
      labels: ["receipts"],
      messages: [
        {
          from: "glide",
          to: ["me"],
          ago: "2d9h",
          body: receipt({
            brand: "Glide",
            color: "#111827",
            title: "Thanks for riding, Avery",
            intro: "Tuesday 7:42 PM · Mission District → Hayes Valley · 3.1 mi, 14 min",
            orderNo: "GL-88A1-24F",
            items: [
              { name: "Trip fare", detail: "Glide Comfort", qty: 1, price: 14.8 },
              { name: "Tip", detail: "Driver: Marco", qty: 1, price: 3 },
            ],
            tax: 0.94,
          }),
        },
      ],
    },
    {
      subject: "Order confirmed: #PC-20418",
      category: "updates",
      labels: ["receipts"],
      messages: [
        {
          from: "parcel",
          to: ["me"],
          ago: "3d7h",
          body: receipt({
            brand: "Parcel & Co",
            color: "#1f2937",
            title: "Order confirmed ✨",
            intro: "Thanks for your order, Avery! We'll email you when it ships.",
            orderNo: "#PC-20418",
            items: [
              { name: "Ceramic pour-over set", detail: "Speckled sand", qty: 1, price: 48 },
              { name: "Linen tea towels", detail: "Set of 3 · Sage", qty: 1, price: 26 },
              { name: "Walnut desk tray", detail: "Large", qty: 1, price: 64 },
            ],
            shipping: 0,
            tax: 11.73,
          }),
        },
      ],
    },
    {
      subject: "Your September bill: $84.12",
      category: "updates",
      labels: ["finance", "receipts"],
      messages: [
        {
          from: "brightwater",
          to: ["me"],
          ago: "4d2h",
          att: [["Brightwater_Bill_Sep2026.pdf", 156_000]],
          body: notice({
            brand: "Brightwater Energy",
            color: "#0284c7",
            icon: "⚡",
            title: "Amount due: $84.12",
            body: "Your bill for service at 1188 Fell St, Unit 3B is ready.<br><br>Usage: 312 kWh (↓ 9% vs last month)<br>Due date: October 18<br>Autopay: <b>On</b>, we'll charge your card ending in 0921.",
            cta: "View bill",
          }),
        },
      ],
    },
    {
      subject: "You've used 90% of your storage",
      category: "updates",
      messages: [
        {
          from: "cloudvault",
          to: ["me"],
          ago: "5d6h",
          body: notice({
            brand: "CloudVault",
            color: "#2563eb",
            icon: "☁️",
            title: "Your storage is almost full",
            body: "You're using <b>180 GB of 200 GB</b>. When you run out of space, new photos and files won't back up.<br><br>Largest items: Photos (122 GB) · Videos (41 GB) · Documents (17 GB)",
            cta: "Free up space",
          }),
        },
      ],
    },
    {
      subject: "Booking confirmed: San Francisco → Lisbon · QX7R2P",
      category: "updates",
      labels: ["travel"],
      starred: true,
      important: true,
      messages: [
        {
          from: "skyline",
          to: ["me"],
          ago: "14d",
          att: [["E-ticket_SK4821_QX7R2P.pdf", 88_000]],
          body: flight({
            airline: "Skyline Airways",
            color: "#0b57d0",
            confirmation: "QX7R2P",
            passenger: "Avery Chen",
            legs: [
              { flight: "SK 4821", date: "Fri, Oct 17", from: "SFO", fromCity: "San Francisco", dep: "3:45 PM", to: "LIS", toCity: "Lisbon", arr: "11:20 AM +1", seat: "24A", cabin: "Economy Plus" },
              { flight: "SK 4822", date: "Wed, Oct 22", from: "LIS", fromCity: "Lisbon", dep: "1:10 PM", to: "SFO", toCity: "San Francisco", arr: "4:35 PM", seat: "22C", cabin: "Economy Plus" },
            ],
          }),
        },
      ],
    },
    {
      subject: "Reservation confirmed: Oct 18 – 22 · The Wren Lisbon",
      category: "updates",
      labels: ["travel"],
      messages: [
        {
          from: "wren",
          to: ["me"],
          ago: "13d",
          body: notice({
            brand: "The Wren Lisbon",
            color: "#9a3412",
            icon: "🏨",
            title: "We can't wait to welcome you, Avery",
            body: "<b>Check-in:</b> Sat, Oct 18 from 3:00 PM<br><b>Check-out:</b> Wed, Oct 22 by 11:00 AM<br><b>Room:</b> Deluxe Double, balcony with Tagus view<br><b>Guests:</b> 2 adults<br><b>Confirmation:</b> WRN-55193<br><br>Our rooftop bar opens at 5 PM daily. Let us know if you'd like us to arrange an airport transfer.",
            cta: "Manage reservation",
          }),
        },
      ],
    },

    // ───────────────────────── SNOOZED ─────────────────────────
    {
      subject: "Reminder: check your passport expiration before international travel",
      snoozedUntil: tomorrow8,
      inbox: false,
      labels: ["travel"],
      messages: [
        {
          from: "passport",
          to: ["me"],
          ago: "6d",
          body: notice({
            brand: "Passport Services",
            color: "#1e3a8a",
            icon: "🛂",
            title: "Traveling soon? Check your passport.",
            body: "Many countries require your passport to be valid for at least <b>six months</b> beyond your travel dates. Routine renewals currently take 6–8 weeks; expedited service takes 2–3 weeks.",
            cta: "Renew online",
          }),
        },
      ],
    },
    {
      subject: "OKR check-in due Friday",
      snoozedUntil: nextMonday,
      inbox: false,
      category: "updates",
      labels: ["work"],
      messages: [
        {
          from: "groundwork",
          to: ["me"],
          ago: "2d",
          body: notice({
            brand: "Groundwork",
            color: "#5b5bd6",
            icon: "◆",
            title: "3 key results need an update",
            body: "<b>Q3 · Product</b><br>• Atlas weekly active teams: 1,240 / 1,500<br>• Onboarding completion: 61% / 70%<br>• Time-to-first-value: 4.2 days / 3 days",
            cta: "Update progress",
          }),
        },
      ],
    },

    // ───────────────────────── SENT ONLY ─────────────────────────
    {
      subject: "Atlas metrics summary for the board deck",
      inbox: false,
      labels: ["work"],
      messages: [
        {
          from: "me",
          to: ["hannah"],
          cc: ["sofia"],
          ago: "2d1h",
          att: [["Atlas_Metrics_Q3.xlsx", 64_000]],
          body: `Hi Hannah,

Attached is the Q3 metrics summary for the board deck. Headlines:

- Weekly active teams up 34% QoQ (corrected for the SDK double-count)
- Net revenue retention at 118%
- Onboarding completion 61%, below our 70% target, which is the main thing Brightpath work should help with

Sofia double-checked every number. Happy to walk through before the meeting.

Avery`,
        },
      ],
    },
    {
      subject: "Interview loop for backend candidates",
      inbox: false,
      labels: ["work"],
      messages: [
        {
          from: "me",
          to: ["jordan"],
          cc: ["maya"],
          ago: "6d3h",
          body: `Hey Jordan,

For next week's backend loop, can you own the system design round? I'd suggest the webhook-delivery problem. It maps well to what we actually do.

I'll take product sense, and Maya is on values/collaboration.

Thanks!
Avery`,
        },
        {
          from: "jordan",
          to: ["me"],
          cc: ["maya"],
          ago: "6d1h",
          body: `Happy to. I'll update the rubric so it rewards asking about idempotency early.`,
        },
      ],
    },
    {
      subject: "Kai onboarding — week one plan",
      inbox: false,
      labels: ["work"],
      messages: [
        {
          from: "me",
          to: ["kai"],
          cc: ["priya"],
          ago: "5d5h",
          body: `Welcome aboard, Kai! 🎉

I'm your onboarding buddy. Here's a light plan for week one:

- **Mon:** laptop setup, meet the team, lunch with Priya and me
- **Tue:** Atlas product walkthrough + customer call recordings
- **Wed:** shadow design critique
- **Thu:** pick a small starter project from the backlog
- **Fri:** coffee chat with Hannah

No question is too small. Ping me anytime.

Avery`,
        },
      ],
    },

    // ───────────────────────── DRAFTS ─────────────────────────
    {
      subject: "Offsite session ideas",
      inbox: false,
      messages: [
        {
          from: "me",
          to: ["hannah"],
          ago: "1d3h",
          draft: true,
          body: `Hannah,

A few ideas for the product strategy slot:

- Start with 3 customer quotes, not a roadmap
- "What we're saying no to" as its own section
- `,
        },
      ],
    },
    {
      subject: "Notes for 1:1 with Maya",
      inbox: false,
      messages: [
        {
          from: "me",
          to: [],
          ago: "3d",
          draft: true,
          body: `- Launch retro format?
- Jordan promo packet: timeline
- Hiring: 2 backend, 1 design systems
- Her growth goals for Q4`,
        },
      ],
    },

    // ───────────────────────── SCHEDULED ─────────────────────────
    {
      subject: "Happy work anniversary! 🎉",
      inbox: false,
      messages: [
        {
          from: "me",
          to: ["priya"],
          ago: "4h",
          scheduledAt: tomorrow9,
          body: `Priya!

Three years at Lumen today. The Atlas design system, the brand work, and somehow keeping all of us sane during launch season. Thank you for everything. 💜

Lunch is on me this week.

Avery`,
        },
      ],
    },

    // ───────────────────────── ARCHIVED ─────────────────────────
    {
      subject: "Atlas beta feedback survey results",
      inbox: false,
      labels: ["work"],
      messages: [
        {
          from: "sofia",
          to: ["me", "maya", "priya"],
          ago: "15d",
          att: [["Atlas_Beta_Survey_Results.pdf", 1_240_000]],
          body: `Hi all,

Beta survey is closed: **312 responses**, 41% response rate. Top findings:

- NPS 52 (up from 38 in alpha)
- #1 request: bulk editing (mentioned by 44% of respondents)
- #1 complaint: onboarding is too long

Full report attached.

Sofia`,
        },
      ],
    },
    {
      subject: "Your talk was accepted to Product Summit 2026 🎤",
      inbox: false,
      starred: true,
      messages: [
        {
          from: "summit",
          to: ["me"],
          ago: "31d",
          body: notice({
            brand: "Product Summit",
            color: "#7c3aed",
            icon: "🎤",
            title: "Congratulations, Avery!",
            body: "Your talk <b>“Saying no at scale: roadmap decisions in a 40-person company”</b> has been accepted for Product Summit 2026.<br><br>Session length: 25 minutes + 5 minutes Q&A<br>Slides due: two weeks before the event",
            cta: "Confirm your slot",
          }),
        },
      ],
    },
    {
      subject: "Move-in checklist — Unit 3B",
      inbox: false,
      labels: ["personal"],
      messages: [
        {
          from: "greg",
          to: ["me"],
          ago: "410d",
          att: [["Move-in_Checklist_3B.pdf", 220_000]],
          body: `Hi Avery,

Welcome to the building! Attached is the move-in checklist. Please note any existing damage within 7 days. Keys and fobs are in the lockbox; code is the last 4 digits of your phone number.

Trash pickup is Tuesday and Friday. Recycling is Friday only.

Greg`,
        },
      ],
    },

    // ───────────────────────── TRASH ─────────────────────────
    {
      subject: "Flash sale: 60% off everything, today only",
      category: "promotions",
      trashed: true,
      inbox: false,
      messages: [
        {
          from: "nordhaus",
          to: ["me"],
          ago: "4d8h",
          body: promo({
            brand: "NORDHAUS",
            color: "#44403c",
            kicker: "Today only",
            headline: "60% off. Seriously.",
            body: "Every throw, towel and table linen. No code needed.",
            cta: "Shop now",
            hero: "linear-gradient(135deg,#fee2e2,#fef3c7)",
            heroEmoji: "🏷️",
            address: "Nordhaus Home",
          }),
        },
      ],
    },
    {
      subject: "Your free trial ends in 3 days",
      category: "updates",
      trashed: true,
      inbox: false,
      messages: [
        {
          from: "streambox",
          to: ["me"],
          ago: "7d",
          body: notice({
            brand: "StreamBox",
            color: "#e50914",
            icon: "▶",
            title: "Your trial is almost over",
            body: "After your trial ends on Friday, you'll be charged $15.99/month. Cancel anytime in account settings.",
            cta: "Manage plan",
          }),
        },
      ],
    },
    {
      subject: "Canceled: Atlas sync (moved to Thursday)",
      trashed: true,
      inbox: false,
      messages: [
        {
          from: "calendar",
          to: ["me"],
          ago: "9d",
          body: `This event has been canceled and removed from your calendar.

**Atlas sync**
Tuesday 11:00am – 11:30am

Priya: "Folding this into Thursday's critique. See you there!"`,
        },
      ],
    },

    // ───────────────────────── SPAM ─────────────────────────
    {
      subject: "Congratulations!! You've been selected for a $1,000 gift card",
      spam: true,
      inbox: false,
      messages: [
        {
          from: "prize",
          to: ["me"],
          ago: "1d7h",
          body: `<div style="font-family:Arial;text-align:center;padding:30px;background:#fffbe6;border:3px dashed #f5a623">
<h1 style="color:#d0021b">🎁 YOU'RE A WINNER 🎁</h1>
<p style="font-size:16px">Dear valued customer, you have been randomly selected to receive a <b>$1,000 gift card</b>!!!</p>
<p>To claim, simply confirm your shipping details and pay a small processing fee of $4.99.</p>
<p style="font-size:22px"><a href="https://claim-reward-now.biz">CLAIM NOW &gt;&gt;&gt;</a></p>
<p style="font-size:11px;color:#999">Offer expires in 23:59:12</p></div>`,
        },
      ],
    },
    {
      subject: "URGENT: Your account has been suspended",
      spam: true,
      inbox: false,
      messages: [
        {
          from: "phish",
          to: ["me"],
          ago: "3d2h",
          body: `Dear Customer,

We detected unusual activity on your Harbor Bank account. For your protection, access has been **temporarily suspended**.

To restore access, verify your identity within 24 hours: [Verify account](https://harb0rbank-verify.com/login)

Failure to verify will result in permanent closure.

Harbor Bank Security Team`,
        },
      ],
    },
    {
      subject: "Exclusive: 40x returns on the next big token (guaranteed)",
      spam: true,
      inbox: false,
      messages: [
        {
          from: "crypto",
          to: ["me"],
          ago: "5d",
          body: `Hi friend,

Our analysts have identified the next 40x opportunity before it hits the major exchanges. Only **50 spots** remain in our private allocation.

Reply "IN" to reserve yours. Minimum entry 0.5 ETH.

To the moon 🚀`,
        },
      ],
    },
  ];
}

export function buildIncoming(now: number): PendingDelivery[] {
  const m = 60_000;
  return [
    {
      id: "in1",
      deliverAt: now + 45_000,
      subject: "Quick one: can you approve the ramp plan?",
      from: who("jordan"),
      category: "primary",
      labels: ["work"],
      important: true,
      html: md(`Hey Avery,

Billing webhook PR is merged. Before I bump atlas_v2 to 50%, can you give a thumbs up on the ramp plan in the launch doc? Two-line reply is fine.

Thanks!
J`),
    },
    {
      id: "in2",
      deliverAt: now + 3 * m,
      subject: "[lumen/atlas] Deployment to staging succeeded",
      from: who("pixelhub"),
      category: "updates",
      labels: ["work"],
      html: notice({
        brand: "Pixelhub",
        color: "#24292f",
        icon: "⌘",
        title: "Deployment succeeded · staging",
        body: "<b>lumen/atlas</b> @ <code>8f3c2a1</code> “Migrate billing webhooks to queue (#482)”<br><br>Deployed by jordan · 2m 41s · All health checks passing ✅",
        cta: "View deployment",
      }),
    },
    {
      id: "in3",
      deliverAt: now + 6 * m,
      subject: "Updated empty-state mocks",
      from: who("priya"),
      category: "primary",
      labels: ["design"],
      attachments: [{ id: "att_in3", name: "empty-states_v4.png", size: 1_320_000, mime: "image/png" }],
      html: md(`Hi Avery,

Went with "Start your first project". It tested better with Kai's hallway users. Updated mocks attached; the Framewise file is current too.

Priya`),
    },
    {
      id: "in4",
      deliverAt: now + 9 * m,
      subject: "Mom's birthday gift: split?",
      from: who("ethan"),
      category: "primary",
      labels: ["family"],
      html: md(`Hey!

Thinking we go in together on that pottery class Mom keeps mentioning, plus a frame for the dock photo. ~$180 total, so $90 each?

E`),
    },
    {
      id: "in5",
      deliverAt: now + 12 * m,
      subject: "Still thinking it over? Your cart is waiting 🧥",
      from: who("trailhead"),
      category: "promotions",
      html: promo({
        brand: "TRAILHEAD OUTFITTERS",
        color: "#2e5e4e",
        kicker: "Saved for you",
        headline: "The Ridgeline Parka is almost sold out in your size",
        body: "Your 25% off code is still good through Sunday night.",
        cta: "Return to cart",
        hero: "linear-gradient(135deg,#e7efe9,#cfe0d6)",
        heroEmoji: "🛒",
        code: "LAYERUP25",
        address: "Trailhead Outfitters · 88 Alpine Way, Boulder, CO",
      }),
    },
    {
      id: "in6",
      deliverAt: now + 15 * m,
      subject: "Nora reacted to your comment",
      from: who("circle"),
      category: "social",
      html: notice({
        brand: "Circle",
        color: "#f97316",
        icon: "◎",
        title: "Nora reacted ❤️ to your comment",
        body: "On Ben's post: <i>“Third time's the charm 🧗‍♂️”</i><br>Your comment: <i>“Bringing extra chalk this time”</i>",
        cta: "See post",
      }),
    },
  ];
}

export function buildSeed(now: number) {
  const specs = buildThreads(now);
  const threads: Record<string, Thread> = {};
  const messages: Record<string, Message> = {};

  specs.forEach((spec, ti) => {
    const threadId = `t${ti + 1}`;
    const ids: string[] = [];
    spec.messages.forEach((ms, mi) => {
      const id = `${threadId}m${mi + 1}`;
      const attachments: Attachment[] = (ms.att ?? []).map(([name, size], ai) => ({
        id: `${id}a${ai}`,
        name,
        size,
        mime: mimeFor(name),
      }));
      const status = ms.draft ? "draft" : ms.scheduledAt ? "scheduled" : ms.from === "me" ? "sent" : "received";
      messages[id] = {
        id,
        threadId,
        from: who(ms.from),
        to: (ms.to ?? (ms.from === "me" ? [] : ["me"])).map(who),
        cc: (ms.cc ?? []).map(who),
        bcc: [],
        date: now - parseAgo(ms.ago),
        html: ms.body.trim().startsWith("<") ? ms.body : md(ms.body),
        attachments,
        unread: !!ms.unread,
        status,
        scheduledAt: ms.scheduledAt,
      };
      ids.push(id);
    });
    const onlyMine = spec.messages.every((m) => m.from === "me");
    threads[threadId] = {
      id: threadId,
      subject: spec.subject,
      messageIds: ids,
      labels: spec.labels ?? [],
      inInbox: spec.inbox ?? (!spec.spam && !spec.trashed && !onlyMine),
      trashed: !!spec.trashed,
      spam: !!spec.spam,
      starred: !!spec.starred,
      important: !!spec.important,
      category: spec.category ?? "primary",
      snoozedUntil: spec.snoozedUntil,
    };
  });

  return { threads, messages, incoming: buildIncoming(now) };
}

export function mimeFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    zip: "application/zip",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv",
    ics: "text/calendar",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

export const AUTO_REPLIES: Record<string, string[]> = {
  work: [
    "Thanks Avery, got it. I'll take a look this afternoon and circle back before EOD.",
    "Makes sense to me. 👍 I'll update the doc and loop in the rest of the team.",
    "Appreciate the quick turnaround! Let's sync on this in tomorrow's standup.",
  ],
  client: [
    "Thanks so much, Avery. I'll share this with the team and get back to you by Friday.",
    "This is helpful, thank you! Let me review and I'll follow up with any questions.",
  ],
  personal: [
    "Haha love it. Talk soon! ❤️",
    "Yes!! Sounds perfect. See you then 😊",
    "Got it, thanks! Call you this weekend?",
  ],
};

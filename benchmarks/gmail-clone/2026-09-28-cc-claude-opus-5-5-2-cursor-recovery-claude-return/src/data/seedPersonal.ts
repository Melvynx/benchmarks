import type { Contact, SeedDraft, SeedThread } from './types';

/*
 * Personal side of Robin Hale's mailbox, plus sent mail and drafts.
 * Same conventions as seedThreads.ts: "today" is a Tuesday in late September; 2d/3d, 9d/10d … are weekends.
 */

export const PERSONAL_CONTACTS: Record<string, Contact> = {
  p_marisol: { name: 'Marisol Vega', email: 'marisol.vega@pinemail.com', org: 'Rose City Striders', kind: 'person' },
};

export const PERSONAL: SeedThread[] = [
  /* ------------------------------------------------------------------ */
  /* Inbox — family & friends                                            */
  /* ------------------------------------------------------------------ */
  {
    id: 't-thanksgiving',
    subject: 'Thanksgiving at my place this year?',
    category: 'primary',
    labels: ['personal'],
    important: true,
    unread: true,
    messages: [
      {
        from: 'nora',
        to: ['mom', 'dad', 'me'],
        at: '3d@10:12',
        body: `Hi all,

Floating something before Mom starts brining things in her head: what if we do Thanksgiving at my place this year? The new kitchen has the double oven, the dining room fits ten if nobody minds a bench, and it would mean Mom and Dad don't have to host for the first time in about thirty years.

Rough idea:
- Mom and Dad drive down Wednesday and stay in the guest room
- I do the turkey (yes, really — I've watched Mom do it thirty times)
- Everyone brings one or two things
- Robin, you're on the miso squash again. That's not a request.

Thoughts? Be honest. Mom, especially you.

N`,
      },
      {
        from: 'mom',
        to: ['nora', 'me'],
        cc: ['dad'],
        at: '3d@13:47',
        body: `Oh honey, what a lovely idea. I'll admit my very first thought was "but the turkey," and then I thought, well, she did watch me do it thirty times, and she was always the one reading the recipe card over my shoulder and telling me I'd skipped a step. So yes. Yes! Your father is pretending to be neutral but he is visibly relieved about not having to move the dining table again.

A few things I'd like to bring, if that's alright:
- My stuffing (the chestnut one, not the cornbread one, we are not doing that again)
- Cranberry relish
- The good gravy boat, because I don't trust anyone else's

Should we invite June and the boys, if they can get down from Seattle? She's been rattling around that house since they moved out. I don't want to overload you though. And I'll need your oven for about forty minutes at some point. We'll figure it out.

I'm so proud of you for the house. Did I say that already? I'm saying it again.

Love, Mom`,
      },
      {
        from: 'me',
        to: ['nora', 'mom'],
        cc: ['dad'],
        at: '3d@17:20',
        body: `Love this. Nora, that double oven has been waiting its whole life for this.

Sam and I are in. We'll bring:
- The miso squash (fine, fine)
- Two pies — pumpkin, and the apple-cheddar one Dad pretends not to like
- A case of cider from the orchard stand outside Hood River, if Mom and Dad can grab it on the way down

We can come over Wednesday evening to help prep and set up tables. Sam's mom might be in town that week — I'll find out and let you know.

Mom, yes to June and the boys. The more the merrier.

R`,
      },
      {
        from: 'dad',
        to: ['nora', 'mom', 'me'],
        at: '2d@09:05',
        body: `Count me in. I'll bring folding chairs, the carving knife and my opinions, in that order.

For the record, the turkey fryer was retired by committee. I was not on the committee.

Dad`,
      },
      {
        from: 'nora',
        to: ['mom', 'dad', 'me'],
        at: '1d@20:10',
        body: `Okay, it's happening!! Current headcount is 10:
- Mom + Dad
- Robin + Sam (+ Sam's mom? Robin, let me know by next weekend)
- Aunt June, Caleb and Wes
- Me + Hollis

Plan: dinner at 3, turkey out by 1:30 so it can rest, which I'm told is the important part.

Mom — the oven is yours from 11:00 to 11:40 for the stuffing. I made a spreadsheet. I'm not sorry.

N`,
      },
      {
        from: 'mom',
        to: ['nora', 'me'],
        cc: ['dad'],
        at: '1h',
        body: `Nora, a spreadsheet! You are your father's daughter.

Robin, sweetheart, please tell Sam's mother she is very welcome and that we'd love to have her. I'll send her a note myself if you give me her email. Does she have any dietary things? I can make a small batch of the stuffing without the sausage, it's no trouble at all.

Also, and don't laugh, should I bring the leaf for the table? Your father says Nora's table doesn't take a leaf. I said how would he know. He said he measured it when we visited in August. I said nothing.

Love you both,
Mom`,
      },
    ],
  },
  {
    id: 't-coast-weekend',
    subject: 'coast weekend?',
    category: 'primary',
    labels: ['travel', 'personal'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'sam',
        to: ['me'],
        at: '6d@12:41',
        body: `weekend after denver? you'll need it.

two options, both have woodstoves:
https://tidepoolcottages.com/manzanita/heron
https://kiwandahideaway.com/cabins/driftwood

I like the first one. outdoor shower.`,
      },
      {
        from: 'me',
        to: ['sam'],
        at: '6d@19:05',
        body: `Yes. Yes. The Heron — outdoor shower wins, and Manzanita means we can do Neahkahnie on Saturday morning if it isn't sideways rain.

Also: this is officially your birthday present, so put the card away. I mean it.

R`,
      },
      {
        from: 'sam',
        to: ['me'],
        at: '5d@21:30',
        body: `too late. booked it. fri + sat night. you can buy dinner at the fish place.

confirmation attached`,
        attachments: [
          {
            name: 'cabin-confirmation.pdf',
            size: 186_402,
            preview: `Tidepool Cottages — Reservation Confirmed
Confirmation no. TPC-48213

Guest: Sam Okafor · 2 adults
Cabin: No. 4 "The Heron" — 1 bedroom, woodstove, outdoor cedar shower
Location: Manzanita, Oregon · 4-minute walk to the beach
Arrive: Friday, check-in from 4:00 PM
Depart: Sunday, check-out by 11:00 AM

2 nights × $265.00 ........ $530.00
Cleaning fee ................ $85.00
Lodging taxes (11.5%) ....... $70.73
Total charged .............. $685.73

Free cancellation up to 7 days before arrival. Door code is emailed 48 hours before check-in.`,
          },
        ],
      },
      {
        from: 'me',
        to: ['sam'],
        at: '5d@22:02',
        body: `Fine. Dinner AND the good wine.

I'll leave the studio at 2 on Friday so we beat the Highway 26 mess. Can you grab firewood on the way out? The listing says they provide some, which in my experience means three damp logs and a hopeful note.`,
      },
      {
        from: 'sam',
        to: ['me'],
        at: '1d@18:48',
        body: `cabin people emailed. there's a record player and a shelf of old jazz. also late checkout sunday is $40. doing it unless you object

(you won't)`,
      },
    ],
  },
  {
    id: 't-lease-renewal',
    subject: 'Lease renewal — 2218 SE Clinton, Unit B',
    category: 'primary',
    labels: ['personal', 'finance'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'gary',
        to: ['me'],
        cc: ['sam'],
        at: '13d@11:05',
        body: `Hi Robin, hi Sam,

Your current lease ends at the end of November, and I'd love to have you both stay on. I'm proposing a 12-month renewal at $2,475/month, up from $2,350 (about 5.3%). Property taxes and insurance on the building went up quite a bit this year, and I've tried to pass along only part of it.

If you'd prefer to go month-to-month after November, that's an option at $2,575.

Let me know which way you're leaning and I'll send the paperwork.

Best,
Gary Lindgren
Lindgren Property Management`,
      },
      {
        from: 'me',
        to: ['gary'],
        cc: ['sam'],
        at: '12d@19:40',
        body: `Hi Gary,

Thanks for the heads-up — we'd definitely like to stay.

Would you consider $2,425 for the 12 months? We've been here three years, paid on time every month, and handled a few small things ourselves (the bathroom fan, the side gate latch) without calling you out. Happy to sign right away at that number.

Robin`,
      },
      {
        from: 'gary',
        to: ['me'],
        cc: ['sam'],
        at: '8d@10:15',
        body: `Fair enough — you've been great tenants, and I did notice the gate. $2,425 for 12 months it is.

Renewal is attached. You can sign in the tenant portal, or print, sign and drop it in the box by the garage. I'd appreciate it back by mid-October.

Gary`,
        attachments: [
          {
            name: 'Lease-Renewal-2027.pdf',
            size: 241_833,
            preview: `LINDGREN PROPERTY MANAGEMENT
Residential Lease Renewal Agreement

Premises: 2218 SE Clinton St, Unit B, Portland, OR 97202
Tenants: Robin Hale, Sam Okafor
Landlord: Lindgren Property Management LLC

Renewal term: 12 months (December 2026 through November 2027)
Monthly rent: $2,425.00, due on the 1st (5-day grace period)
Security deposit: $2,350.00 held from original lease (no change)
Utilities: water/sewer/garbage included; electricity paid by Tenant
All other terms of the original lease remain in full effect.

Tenant signature: ______________________   Date: __________`,
          },
        ],
      },
      {
        from: 'me',
        to: ['gary'],
        cc: ['sam'],
        at: '6d@21:10',
        body: `Signed in the portal just now, and Sam signed too. Thanks for meeting us halfway, Gary.

Robin`,
      },
    ],
  },
  {
    id: 't-jules-portfolio',
    subject: 'Portfolio review? (brutal honesty welcome)',
    category: 'primary',
    messages: [
      {
        from: 'jules',
        to: ['me'],
        at: '9d@16:20',
        body: `Hiii.

I'm applying for the Lead Product Designer role at Kestrel Grid (they make software for community solar co-ops — it's very me). Applications close Friday.

Would you look at the attached and tell me what isn't working? I've stared at it so long that everything looks fine and also terrible at the same time.

No pressure if you're slammed. I know Q4 is eating you alive.

J`,
        attachments: [
          {
            name: 'Jules-Moreau-Portfolio-2026.pdf',
            size: 18_402_117,
            preview: `Jules Moreau — Product & Brand Designer
Portfolio 2026 · julesmoreau.studio

Contents
01  Salt Line Ferments — brand system, packaging and DTC shop
02  Commons Clinic — appointment booking for a community health nonprofit
03  Tidal — rider alerts for a regional ferry (concept)
04  Type experiments & side projects

About
Nine years independent. Clients across food, health and civic tech.
I like messy problems, plain language and shipping.`,
          },
        ],
      },
      {
        from: 'me',
        to: ['jules'],
        at: '7d@21:05',
        body: `Jules — I went through it twice: once as me, and once pretending to be a hiring manager with ninety seconds and a cold coffee. Honest version: the work is strong, the story isn't there yet.

What's working:
- Salt Line is the best thing in here. The before/after of the shop checkout is exactly the kind of evidence a lead role wants to see.
- Your writing. It sounds like you, which almost nobody's portfolio does. Keep it.

What I'd change:
- Lead with Commons Clinic, not Salt Line. It's the closest to what Kestrel does (scheduling, trust, people who aren't technical), so let them see themselves on page 2.
- Commons needs an outcome. You say bookings "improved" — by how much? Even a rough no-show number beats an adjective.
- Cut Tidal, or move it to the very end. A concept project next to shipped work reads as filler for a lead role.
- Add one page on how you work: engineers, stakeholders, saying no. For a lead role they're hiring your judgement, not your screens. The story about talking the clinic out of the chatbot is perfect for it.
- It's 18 MB. Get it under 10 — some application systems silently choke on big uploads.

Happy to do a quick call Thursday night if you want to talk it through.

R`,
      },
      {
        from: 'jules',
        to: ['me'],
        at: '6d@08:10',
        body: `Okay, you're a genius and also rude (correctly).

Reordered so Commons is first, cut Tidal, wrote a "How I work" page with the chatbot story, and squished it down to 7 MB. The no-show number was in my notes the whole time — 22% down to 13%. It's now in very large type.

Submitted at 1am. Dumplings on me whenever you want them. 🥟

J`,
      },
      {
        from: 'jules',
        to: ['me'],
        at: '1d@18:10',
        body: `THEY WANT A PRESENTATION ROUND!!! 45 minutes, next Wednesday, with the head of product and two engineers.

Would you let me do a dry run on you this weekend? Saturday afternoon? I'll bring the dumplings I already owe you, plus more dumplings as interest.

J`,
      },
    ],
  },
  {
    id: 't-striders-10k',
    subject: 'Fall Classic — could you pace the 55:00 group?',
    category: 'primary',
    labels: ['personal'],
    unread: true,
    messages: [
      {
        from: 'owen',
        to: ['me'],
        at: '8d@20:10',
        body: `Hi Robin,

We've got 340 registered for the Fall Classic this year — the most ever — and I'm one pacer short. Any chance you'd take the 55:00 group? You ran 52-something at the spring 10K, so it should feel comfortable.

Pacer bib, a sign on a stick and eternal gratitude provided.

Owen
Rose City Striders`,
      },
      {
        from: 'me',
        to: ['owen'],
        at: '7d@07:15',
        body: `Owen — I'd love to, but I've only been doing easy miles since the calf thing in August, and I don't trust myself to hold 8:50s for 6.2 miles with thirty people following my sign. I'd hate to blow up at mile 4.

Could I do a water station instead? I'm free the whole morning. If you're truly stuck I could pace the 60:00 group, but I'd rather not.

Robin`,
      },
      {
        from: 'owen',
        to: ['me'],
        cc: ['p_marisol'],
        at: '7d@12:40',
        body: `Totally understood — calves are not to be messed with.

Marisol runs Station 2 at the Sellwood Riverfront Park turnaround and has been begging for help. Marisol, meet Robin; Robin, meet the most organised person in the club. She'll send you the details.

Good news: I found a 60:00 pacer, so you're off the hook entirely.

Owen`,
      },
      {
        from: 'p_marisol',
        to: ['me'],
        cc: ['owen'],
        at: '1d@19:55',
        body: `Hi Robin! Thrilled to have you on Station 2. Details for Sunday:

- Arrive by 6:45 AM. Park on SE Spokane St, not in the park lot — it closes to cars at 7.
- Look for the red Striders canopy just before the turnaround cone.
- Lead runners hit us around 8:20; the last walkers come through by about 9:40.
- We pour roughly 900 cups. Water on the left table, electrolyte on the right. Shout what's on your table — nobody reads the signs.
- Bring gloves (everything gets sticky) and a warm layer. It's cold by the river at 7.

We're usually packed up by 10:15, and there are breakfast burritos at the finish for volunteers.

Thank you!
Marisol`,
      },
    ],
  },
  {
    id: 't-mom-dahlias',
    subject: 'Dahlias + a very muddy Pepper',
    category: 'primary',
    labels: ['personal'],
    unread: true,
    messages: [
      {
        from: 'mom',
        to: ['me'],
        at: '2d@16:40',
        body: `Hi sweetheart,

The dahlias have completely lost their minds this year. The big coral ones by the fence are the size of dinner plates, I'm not exaggerating. Your father held one up next to his face for scale and I made him stop because he was getting pollen in his mustache. I've attached the best two.

The second one is Pepper after she found the only wet corner of the entire yard. She's had a bath. She's not speaking to me.

I'll dig up some tubers for you and Sam this fall if you'd like them. They'd do well on the sunny side of your porch, as long as Gary doesn't mind.

Talk soon. Call your mother (that's me).

Love,
Mom
xo`,
        attachments: [
          { name: 'IMG_4821.jpg', size: 3_204_551 },
          { name: 'IMG_4822.jpg', size: 2_876_094 },
        ],
      },
    ],
  },
  {
    id: 't-rita-q3-estimate',
    subject: 'Q3 estimated tax payment — worksheet',
    category: 'primary',
    labels: ['finance'],
    important: true,
    messages: [
      {
        from: 'rita',
        to: ['me'],
        at: '25d@10:05',
        body: `Hi Robin,

Your Q3 federal and Oregon estimated payments are due a week from Tuesday. The worksheet is attached, based on the year-to-date figures you sent in July.

Amounts due for Q3:
- Federal: $1,775
- Oregon: $460

Pay federal through IRS Direct Pay and Oregon through Revenue Online. In both cases select "Estimated payment" and tax year 2026, and please forward me the confirmation numbers.

Best regards,
Rita Gomez, CPA
Gomez & Associates CPA`,
        attachments: [
          {
            name: '2026-Q3-estimate-worksheet.xlsx',
            size: 38_417,
            preview: `2026 Estimated Tax Worksheet — Q3
Client: Robin Hale · Prepared by Rita Gomez, CPA

Line                                  | Federal | Oregon
Projected W-2 wages (Fernbrook)       | 148,000 | 148,000
Projected 1099 income (teaching etc.) |  12,800 |  12,800
Projected total tax                   |  31,940 |  12,610
Expected withholding                  |  24,840 |  10,770
Balance to cover by estimates         |   7,100 |   1,840

Q1 paid  | 1,775 | 460
Q2 paid  | 1,775 | 460
Q3 due   | 1,775 | 460`,
          },
        ],
      },
      {
        from: 'me',
        to: ['rita'],
        at: '24d@20:40',
        body: `Thanks Rita. One question before I pay: I did another round of work for Jules Moreau that wasn't in the July numbers — $4,200, paid in August. Should I bump Q3 to cover it, or catch up in Q4?

Robin`,
      },
      {
        from: 'rita',
        to: ['me'],
        at: '21d@09:20',
        body: `Good catch — bump Q3.

The additional $4,200 adds roughly $1,530 federal (income tax plus self-employment tax) and $370 Oregon for the year. The underpayment penalty is calculated quarter by quarter, and since you received the money in August, covering it now avoids a small penalty in Q3.

Revised Q3 amounts:
- Federal: $3,305
- Oregon: $830

Q4 stays at $1,775 and $460. Please also keep the receipt for the monitor you mentioned — it's a deductible expense for your consulting work.

Rita`,
      },
      {
        from: 'me',
        to: ['rita'],
        at: '15d@12:05',
        body: `Paid both this morning.

- Federal: $3,305, confirmation 4721-9930-1182
- Oregon: $830, confirmation OR-7Q2K-88410

Monitor receipt is in the shared folder.`,
      },
      {
        from: 'rita',
        to: ['me'],
        at: '14d@09:10',
        body: `Thank you — both recorded. Q4 is due in mid-January; I'll send the worksheet after the holidays.

Rita`,
      },
    ],
  },
  {
    id: 't-leah-sam-40th',
    subject: "SAM'S 40TH 🤫 (do not forward, obviously)",
    category: 'primary',
    labels: ['personal'],
    starred: true,
    unread: true,
    messages: [
      {
        from: 'leah',
        to: ['me'],
        at: '5d@21:48',
        body: `Robin. Robin. It's in three weeks and we have no plan. That's fine!! I work well under pressure.

My pitch: surprise party the Saturday after your coast trip. Sam will think the coast IS the birthday, which is the perfect cover.

Venue options:
- My backyard — free, patio heaters, but if it rains it's 25 people in my living room
- The back room at Holloway's on Division — $400 food minimum, they do the good fries
- Tomás's band's rehearsal space — no. I looked. No.

Guest list: thinking ~25. Can you send me Sam's work people? I only know Dami and the tall one.

Leah 💛`,
      },
      {
        from: 'me',
        to: ['leah'],
        at: '5d@22:31',
        body: `YES. You're a genius. Sam booked the cabin personally and has absolutely no idea.

Holloway's, no question — October rain isn't a risk, it's a guarantee. I'll cover the minimum.

Work people: Dami, Ferris (the tall one) and Ngozi from the old job. I'll email them from my phone so nothing shows up on the laptop Sam borrows.

Ground rules:
- No speeches. Sam will literally leave.
- Cake from Crumb & Cedar, the black sesame one
- I'll get Sam there by 7:30 with a fake dinner reservation

R`,
      },
      {
        from: 'leah',
        to: ['me'],
        at: '3d@12:10',
        body: `BOOKED!! Holloway's back room, Saturday from 7. They're holding it with a $100 deposit, which I paid because I love you both.

Invites went out on the group text minus Sam (I triple-checked). 19 yeses already 🎉

One thing: Tomás wants to DJ. I said yes before I thought about it. Is that a problem`,
      },
      {
        from: 'leah',
        to: ['me'],
        at: '25m',
        body: `UPDATE: Tomás made a playlist called "Sam's 40th — DO NOT SHOW SAM" and it was on his PUBLIC profile. I've made him rename it. Crisis averted. I need a nap 😮‍💨`,
      },
    ],
  },
  {
    id: 't-tomas-tent',
    subject: 'tent + your turntable',
    category: 'primary',
    unread: true,
    messages: [
      {
        from: 'tomas',
        to: ['me'],
        at: '1d@19:22',
        body: `yo. two things.

1. can I borrow the tent and the little stove this weekend? me + ana are doing trillium lake sat-sun. will return it cleaner than I found it (low bar, I've seen your garage)

2. your turntable lives!! it was the belt (dead) and the tonearm lift was sticking. new belt was $14, the lift just needed cleaning. you owe me $14 and a beer, or just the beer

t`,
      },
      {
        from: 'me',
        to: ['tomas'],
        at: '1d@21:05',
        body: `You're a wizard. Beer AND the $14, I insist.

Tent's in the garage, blue bin on the left marked CAMP. Take the blue tent, not the green one — the green one has the cracked pole we keep meaning to fix. The stove's in the same bin; there's a new fuel canister on the shelf above it, use that one.

Garage code is the same as last time. Come by whenever — if we're home, stay for dinner.

R`,
      },
      {
        from: 'tomas',
        to: ['me'],
        at: '12m',
        body: `perfect. I'll swing by thursday around 7 with the turntable.

also leah has instructed me to "act normal" around sam until further notice. I have never acted normal in my life. this will be hard`,
      },
    ],
  },
  {
    id: 't-dad-smart-tv',
    subject: 'Fwd: Your smart TV is probably watching you back',
    category: 'primary',
    messages: [
      {
        from: 'dad',
        to: ['me'],
        at: '4d@07:55',
        body: `Robin — your mother sent me this, which means she wants me to "do something about it." Is it real? And if so, how do I turn it off on ours? The remote has 51 buttons. I counted.

Dad

---------- Forwarded message ----------
From: The Cascade Ledger <newsletter@cascadeledger.com>
Subject: Your smart TV is probably watching you back

Most smart TVs sold in the last five years use a feature called automatic content recognition to identify what's on screen — including shows from your cable box and game console — and share that data with advertisers. The setting is usually on by default and buried several menus deep.

Read more: https://cascadeledger.com/tech/smart-tv-viewing-data`,
      },
      {
        from: 'me',
        to: ['dad'],
        at: '4d@12:30',
        body: `It's real, but it's easy to turn off. On your TV:

- Press the button with the little gear on it (bottom right of the remote)
- Go to Settings → Privacy → Viewing Information
- Switch "Viewing information services" to Off
- While you're in there, turn off "Interest-based ads" too

Should take two minutes. If the menus look different, take a photo of the screen and send it to me — or I'll do it next time we're up.

R`,
      },
      {
        from: 'dad',
        to: ['me'],
        at: '3d@08:10',
        body: `Done. It took four minutes, not two, but I'll allow it.

Your mother is now convinced the refrigerator is also listening. I have not ruled it out.

Dad`,
      },
    ],
  },
  {
    id: 't-sam-voice-memo',
    subject: 'voice memo',
    category: 'primary',
    unread: true,
    messages: [
      {
        from: 'sam',
        to: ['me'],
        at: '5h',
        body: `on the bike. 40 sec. figured out the chorus from the ferry song. don't laugh

also we're out of coffee`,
        attachments: [{ name: 'voice-memo.m4a', size: 412_736 }],
      },
    ],
  },
  {
    id: 't-dentist-reminder',
    subject: 'Reminder: your appointment on Thursday at 8:30 AM',
    category: 'updates',
    unread: true,
    messages: [
      {
        from: 'dentist',
        to: ['me'],
        at: '1d@10:00',
        body: `Hi Robin,

This is a friendly reminder of your upcoming appointment at Alder Street Dental.

When: Thursday at 8:30 AM
With: Dr. Anika Shah — cleaning and exam
Where: 1420 SE Alder St, Suite 200, Portland, OR 97214

Please reply C to confirm, or call us at (503) 555-0187 to reschedule. We ask for 24 hours' notice for any changes.

Manage your appointment: https://alderstreetdental.com/appointments/confirm?ref=RH-20931

See you soon,
Alder Street Dental`,
      },
    ],
  },
  {
    id: 't-leah-book-club',
    subject: 'Book club — October pick 📚',
    category: 'primary',
    snoozeHours: 5,
    messages: [
      {
        from: 'leah',
        to: ['me'],
        at: '1d@12:30',
        body: `Book club friends!!

October pick is in: "The Salt Orchard" by Imogen Tate. About 300 pages. It's two sisters trying to save a failing cider farm and it made me cry on the MAX, so plan accordingly.

We're at mine, Thursday three weeks from now, 7pm. I'm doing soup. Someone else please do bread.

(Robin, I know October is eating you alive. Come even if you only get halfway — we mostly talk about other things anyway.)

Leah`,
      },
    ],
  },
  {
    id: 't-nora-lunch',
    subject: 'lunch today',
    category: 'primary',
    unread: true,
    messages: [
      {
        from: 'nora',
        to: ['me'],
        at: '2h',
        body: `Still on for 12:30? I might be ten minutes late — my 11:30 always runs over. Grab the table by the window if you get there first.

Also I'm bringing the Thanksgiving seating chart. Brace yourself.

N`,
      },
    ],
  },
  {
    id: 't-gary-gutters',
    subject: 'Gutter cleaning Thursday morning',
    category: 'primary',
    messages: [
      {
        from: 'gary',
        to: ['me'],
        at: '15d@09:05',
        body: `Hi Robin,

Quick heads-up: a crew will be cleaning the gutters and doing a moss treatment on the roof this Thursday between 8 and noon. They'll need the driveway side clear, so please park on the street Wednesday night.

No need to be home. They won't need to come inside.

Thanks,
Gary Lindgren
Lindgren Property Management · (503) 555-0142`,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Sent — conversations started by me, no replies yet                  */
  /* ------------------------------------------------------------------ */
  {
    id: 't-sent-dishwasher',
    subject: 'Dishwasher not draining (Unit B)',
    category: 'primary',
    labels: ['personal'],
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['gary'],
        at: '2d@19:40',
        body: `Hi Gary,

Our dishwasher has stopped draining. There's about an inch of standing water after every cycle, and it's making a grinding noise during the drain phase. I've cleaned the filter and checked the sink disposal connection, with no luck. Photo attached.

Could someone take a look this week? I'm working from home Wednesday after 4, or Friday morning. Otherwise you're welcome to use the lockbox.

Thanks,
Robin`,
        attachments: [{ name: 'dishwasher-standing-water.jpg', size: 2_418_903 }],
      },
    ],
  },
  {
    id: 't-sent-rita-1099',
    subject: 'Corrected 1099-NEC + HSA form for the 2025 return',
    category: 'primary',
    labels: ['finance'],
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['rita'],
        at: '10d@09:40',
        body: `Hi Rita,

Lantern School finally reissued my 1099-NEC — the original showed the prior year's amount, which is why we held the return. Corrected copy attached.

That should be the last piece you needed to finish the return ahead of the October deadline. Let me know if anything else is missing.

Robin`,
        attachments: [
          {
            name: '1099-NEC-Lantern-School-corrected.pdf',
            size: 96_214,
            preview: `Form 1099-NEC (CORRECTED) — Nonemployee Compensation · Tax Year 2025
PAYER: Lantern School of Design · 1180 NW Everett St, Portland, OR 97209
RECIPIENT: Robin Hale · SE Clinton St, Portland, OR 97202
Recipient TIN: XXX-XX-6093

Box 1  Nonemployee compensation ........ $6,400.00
Box 4  Federal income tax withheld ..... $0.00
Box 5  State tax withheld (OR) ......... $0.00
Box 7  State income (OR) ............... $6,400.00

Copy B — For Recipient`,
          },
        ],
      },
      {
        from: 'me',
        to: ['rita'],
        at: '10d@09:52',
        body: `And the HSA form you asked about on our call — forgot to attach it the first time. Sorry!`,
        attachments: [
          {
            name: '5498-SA-2025.pdf',
            size: 71_880,
            preview: `Form 5498-SA — HSA, Archer MSA, or Medicare Advantage MSA Information (2025)
TRUSTEE: Ridgeline Health Savings, Boise, ID
PARTICIPANT: Robin Hale
Account number: ••••2217

Box 2  Total contributions made in 2025 ............... $4,300.00
Box 3  Contributions made in 2026 for 2025 ............ $0.00
Box 5  Fair market value of HSA account ............... $11,842.17
Box 6  Account type: HSA [X]`,
          },
        ],
      },
    ],
  },
  {
    id: 't-sent-atlas-naming',
    subject: 'Atlas token naming RFC — my comments (part 1)',
    category: 'primary',
    labels: ['work'],
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['devon'],
        cc: ['marcus'],
        at: '1d@21:15',
        body: `Devon — first pass on the naming RFC. I got through sections 1–3; I'll do the semantic aliases section tomorrow after the roadmap session.

Overall: yes to the three-tier model (primitive → semantic → component). It's the right foundation for dark mode in Q1.

Specifics:
- Primitives: "blue-500" style naming is fine, but let's not expose primitives in the Canvasly library at all. If designers can pick them, they will.
- Semantic names: I'd prefer "color.text.subtle" over "color.text.secondary". "Secondary" already means something for buttons and it'll confuse people.
- Ordering: the RFC mixes "bg.hover.brand" and "bg.brand.hover". Let's pick role → emphasis → state and stick to it everywhere.
- "danger" vs "critical": Harbor uses "critical" for clinical alerts, which isn't the same thing as a destructive action. Keep both and document the difference.

Marcus — how painful is a rename once the v2.0 migration lands? If it's another 300-file PR, I'd rather we decide now.

Robin`,
      },
    ],
  },
  {
    id: 't-sent-tessellate-travel',
    subject: 'Speaker travel details — Robin Hale',
    category: 'primary',
    labels: ['work', 'travel'],
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['mira'],
        at: '18d@14:30',
        body: `Hi Mira,

Here are my details for the speaker travel form:

- Flying from Portland (PDX), arriving the evening before Day 2
- Departing the morning after Day 2, so two hotel nights is plenty
- Hotel: happy to be in the speaker block
- Dietary: vegetarian
- A/V: I'll present from my own laptop (USB-C to HDMI). A confidence monitor and a clicker would be lovely.
- My partner, Sam, will be traveling with me. I'll cover any difference on the room.

Updated bio and headshot attached. The bio is about 70 words; happy to trim if you need it shorter.

Best,
Robin`,
        attachments: [
          { name: 'Robin-Hale-headshot-2026.jpg', size: 3_812_004 },
          {
            name: 'Robin-Hale-speaker-bio.docx',
            size: 24_318,
            preview: `Robin Hale — Speaker bio (short)

Robin Hale is Design Lead at Fernbrook, a product design and engineering studio in Portland, Oregon. For the past three years Robin has led design for a regional health system's patient portal, used by more than 400,000 patients. Robin runs Fernbrook's weekly design critique, co-maintains the Atlas design system and teaches an evening interaction design course. Off the clock: trail running and far too many houseplants.

Talk: "Designing for trust in patient-facing software"
Track: Day 2, morning`,
          },
        ],
      },
    ],
  },
  {
    id: 't-sent-squash-recipe',
    subject: 'Miso-maple squash, as demanded',
    category: 'primary',
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['nora'],
        at: '3d@18:30',
        body: `As requested. Scaled for 10, which is a lot of squash.

Ingredients:
- 3 medium delicata or 2 kabocha (about 5 lb), cut into wedges
- 3 tbsp white miso
- 3 tbsp maple syrup
- 3 tbsp olive oil
- 1 tbsp rice vinegar
- 2 cloves garlic, grated
- Toasted sesame seeds, sliced scallions and flaky salt to finish

Method:
1. Oven to 425°F. Whisk everything except the toppings.
2. Toss the squash in two-thirds of the glaze and spread it over two sheet pans. Don't crowd them or they'll steam.
3. Roast 25 minutes, flip, brush with the rest of the glaze and roast another 10–15 until the edges are dark.
4. Scatter the sesame, scallions and salt right before serving.

Oven math for your planning: it needs about 40 minutes at 425°F, so it can't share with the turkey. It's great at room temperature though — make it first and rewarm for 5 minutes.

R`,
      },
    ],
  },
  {
    id: 't-sent-fieldnote-sow',
    subject: 'Signed: Harbor batch 1 SOW',
    category: 'primary',
    labels: ['work'],
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['hannah'],
        cc: ['felix'],
        at: '8d@15:30',
        body: `Hi Hannah,

Signed SOW for the first Harbor batch is attached — Felix countersigned this morning, so we're good to go.

Two notes for your recruiters:
- Please over-index on adults 65+. That group struggled most in round 2, and we'd like at least 7 of the 18.
- Sessions on Tuesdays and Thursdays only, 10am–3pm Pacific. Harbor's clinical team observes on those days.

Thanks for turning this around so quickly.

Robin`,
        attachments: [
          {
            name: 'Fieldnote-SOW-Harbor-Batch1-signed.pdf',
            size: 204_577,
            preview: `STATEMENT OF WORK #1 — Harbor Health patient sessions (Batch 1)
Under the MSA between Fieldnote Research LLC and Fernbrook Studio, Inc.

Sessions: 18 completed patient sessions (remote, 45 minutes)
Segments: adults 65+, caregivers, patients with a recent missed appointment
Recruiting: 18 × $125 = $2,250 (Schedule A volume pricing)
Incentives: 18 × $100 = $1,800, passed through at cost
Rush fee: waived (counts toward the 10-session allowance)
Estimated total: $4,050

Signed for Client: Felix Novak, Finance Manager · Robin Hale, Design Lead
Signed for Fieldnote: Hannah Ortiz, Partnerships`,
          },
        ],
      },
    ],
  },
  {
    id: 't-sent-design-notes',
    subject: 'Design notes — Friday wrap',
    category: 'primary',
    labels: ['work'],
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['designTeam'],
        at: '4d@16:50',
        body: `Hi team — this week's notes.

Shipped / approved
- Harbor v4: appointments and messaging are approved by Rachel's team, as of about twenty minutes ago. Big one. Full walkthrough next week.
- Juniper findings: Aisha has clips cleared for the Denver readout

In progress
- "Visit summary" label test is live, results early next week (Kai)
- Atlas v2.0 token migration — Marcus is close; expect the PR Monday and a color-ramp review from me
- Denver workshop deck (Aisha, Lena, me)

Shoutouts
- Kai, for turning an incident action item into a genuinely good error state in two days
- Theo, for the docs audit nobody wanted to do and everybody needed

Reminders
- Benefits open enrollment closes today at 5pm. The FSA doesn't roll over — re-elect it.
- Offsite workshop: bring one client story where something went sideways. More soon.

Have a good weekend,
Robin`,
      },
    ],
  },
  {
    id: 't-sent-winter-series',
    subject: 'Winter Series volunteer sign-up',
    category: 'primary',
    location: 'sent',
    messages: [
      {
        from: 'me',
        to: ['owen'],
        at: '20d@08:10',
        body: `Hi Owen,

Saw the call for Winter Series volunteers in Sunday's digest — count me in.

- Course marshal for Race 1 and Race 3. Happy to take the Mt. Tabor summit loop again; I like yelling encouragement uphill.
- I can redo the finisher cards too. Last year's file is still in my Driftbox, so it's a 30-minute job.

Race 2 is out for me — family stuff that weekend.

Robin`,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Trash                                                               */
  /* ------------------------------------------------------------------ */
  {
    id: 't-trash-hood-carpool',
    subject: 'Mt. Hood carpool Saturday??',
    category: 'primary',
    location: 'trash',
    messages: [
      {
        from: 'tomas',
        to: ['leah', 'sam', 'me'],
        at: '41d@20:15',
        body: `who's driving saturday. I can fit 4 + packs but my car smells like wet dog (I do not have a dog)`,
      },
      {
        from: 'leah',
        to: ['tomas', 'sam', 'me'],
        at: '41d@20:32',
        body: `I can drive!! Leaving 7am from mine? Mirror Lake, then up to Tom Dick & Harry if everyone's legs agree. Bring layers ☁️`,
      },
      {
        from: 'sam',
        to: ['tomas', 'leah', 'me'],
        at: '41d@21:04',
        body: `7 is violent. 7:30`,
      },
      {
        from: 'me',
        to: ['tomas', 'leah', 'sam'],
        at: '41d@21:20',
        body: `7:30 from Leah's. I'll bring the good snacks and the bear spray nobody has ever used.`,
      },
      {
        from: 'leah',
        to: ['tomas', 'sam', 'me'],
        at: '40d@07:12',
        body: `7:15 compromise. Final answer. 🏔️`,
      },
    ],
  },
  {
    id: 't-trash-cowork',
    subject: 'Cowork at the studio Friday?',
    category: 'primary',
    location: 'trash',
    messages: [
      {
        from: 'jules',
        to: ['me'],
        at: '23d@19:10',
        body: `Want to cowork at my studio Friday? The new espresso machine arrived and I need someone to impress.`,
      },
      {
        from: 'me',
        to: ['jules'],
        at: '23d@20:02',
        body: `Yes! I'm out of the office Friday anyway. I'll bring pastries and my loudest headphones.`,
      },
      {
        from: 'jules',
        to: ['me'],
        at: '20d@08:40',
        body: `Scratch Friday — the upstairs neighbor's water heater burst and the studio is a swamp. Espresso machine survived, thank god. Rain check 😩`,
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  /* Archive — older, resolved                                           */
  /* ------------------------------------------------------------------ */
  {
    id: 't-thanksgiving-2025',
    subject: 'Photos from Thursday!',
    category: 'primary',
    labels: ['personal'],
    starred: true,
    location: 'archive',
    messages: [
      {
        from: 'mom',
        to: ['me', 'nora'],
        cc: ['dad'],
        at: '304d@10:20',
        body: `Here are the best ones from Thursday. I took 212 photos and your father says 209 of them are of the pie, which is not true, it's maybe 150.

The one of the four of you on the porch is going on the fridge. Nora, you're blinking in two of them but you look lovely anyway.

Next year maybe someone else does the turkey. Your father says his back has opinions. I said so does mine.

Love, Mom`,
        attachments: [
          { name: 'IMG_3107.jpg', size: 3_512_880 },
          { name: 'IMG_3112.jpg', size: 2_998_415 },
          { name: 'IMG_3120.jpg', size: 3_140_207 },
        ],
      },
      {
        from: 'nora',
        to: ['mom', 'me'],
        cc: ['dad'],
        at: '304d@12:05',
        body: `Dad's face in the second one 😂 I'm framing it.

(Also, noted re: next year. Just saying.)`,
      },
      {
        from: 'me',
        to: ['mom', 'nora'],
        cc: ['dad'],
        at: '304d@18:40',
        body: `The porch one is perfect. Thank you for all of it, Mom — best one in years. Sam is already asking about leftovers.`,
      },
    ],
  },
  {
    id: 't-rita-engagement-2025',
    subject: '2025 tax year — engagement letter & organizer',
    category: 'primary',
    labels: ['finance'],
    location: 'archive',
    messages: [
      {
        from: 'rita',
        to: ['me'],
        at: '274d@10:15',
        body: `Hi Robin,

Happy almost-new-year. Attached is our engagement letter for your 2025 return; please sign it through the client portal when you have a moment.

Once your forms arrive (usually by early February), I'll need:
- W-2 from Fernbrook
- 1099-NEC from Lantern School, plus any other teaching or consulting income
- 1099-INT and 1099-DIV from your bank and brokerage
- Form 5498-SA and 1099-SA for your HSA
- Receipts for equipment or software used for your consulting work

My fee is unchanged from last year. If you expect any major changes — a move, a new business, a large stock sale — please tell me early.

Best regards,
Rita Gomez, CPA
Gomez & Associates CPA`,
        attachments: [
          {
            name: 'Gomez-CPA-Engagement-Letter-2025.pdf',
            size: 164_220,
            preview: `GOMEZ & ASSOCIATES CPA
Engagement Letter — Individual Tax Services (Tax Year 2025)

Client: Robin Hale
Services: Preparation of 2025 federal Form 1040 and Oregon Form OR-40,
including Schedule C and Schedule SE for self-employment income.
Quarterly estimated tax calculations for 2026 are included.

Fee: $1,150 flat, payable on delivery of the completed return.
Client responsibilities: provide complete and accurate records on request.
Record retention: copies of returns are kept for seven years.`,
          },
        ],
      },
      {
        from: 'me',
        to: ['rita'],
        at: '274d@20:30',
        body: `Thanks Rita — signed in the portal. I'll send everything over as the forms show up. Happy New Year!

Robin`,
      },
    ],
  },
  {
    id: 't-nora-moving-day',
    subject: 'Moving day — THANK YOU',
    category: 'primary',
    labels: ['personal'],
    location: 'archive',
    messages: [
      {
        from: 'nora',
        to: ['me', 'sam'],
        at: '66d@21:30',
        body: `You two are heroes. The couch is in, the bed is assembled, and only one lamp died in the process (RIP).

Sam has earned a lifetime supply of beer. Robin, you've earned first pick of the guest room whenever you want it.

N`,
      },
      {
        from: 'me',
        to: ['nora', 'sam'],
        at: '65d@10:15',
        body: `Sam wants to know if the lifetime beer is transferable.

Seriously, the house is gorgeous. That kitchen! Next up: a housewarming. And — bold idea — Thanksgiving at yours this year?`,
      },
      {
        from: 'nora',
        to: ['me', 'sam'],
        at: '65d@11:02',
        body: `Do NOT say that where Mom can hear you.

…Maybe.`,
      },
    ],
  },
  {
    id: 't-jules-salt-line',
    subject: 'Salt Line — they signed off!! (+ invoice pls)',
    category: 'primary',
    labels: ['finance'],
    location: 'archive',
    messages: [
      {
        from: 'jules',
        to: ['me'],
        at: '96d@15:20',
        body: `The label system is APPROVED. All four flavors, zero changes. The founder literally said "don't touch it."

I owe you forever. Send me your invoice whenever and I'll pay it this week.

J`,
      },
      {
        from: 'me',
        to: ['jules'],
        at: '95d@20:45',
        body: `Yay!! That shelf is going to look so good.

Invoice attached — 24 hours, as we scoped. No rush.

R`,
        attachments: [
          {
            name: 'Invoice-RH-2026-03.pdf',
            size: 88_412,
            preview: `INVOICE RH-2026-03
From: Robin Hale — Design consulting · Portland, OR
Bill to: Jules Moreau Studio

Project: Salt Line Ferments — label system & flavor variants

Description                              | Hours | Rate | Amount
Label system + 4 flavor variants         |  24   | $150 | $3,600.00

Total due: $3,600.00 · Terms: net 15
Payment: bank transfer (details on file)`,
          },
        ],
      },
      {
        from: 'jules',
        to: ['me'],
        at: '94d@09:12',
        body: `Paid! Check your account 💸

Also… they want a holiday edition. Are you in? 👀`,
      },
    ],
  },
];

export const SEED_DRAFTS: SeedDraft[] = [
  {
    to: ['nora'],
    subject: 'the table leaf situation',
    at: '35m',
    body: `Hey — off-thread so Mom doesn't see this.

Two things before it snowballs:
1. Sam's mom is probably coming, but she won't confirm until her flights are booked. Can we pencil her in?
2. Let Mom bring the leaf. Even if it doesn't fit, she needs to have brought it.

Also, what do you actually need help with on Wednesday night? I was thinking Sam could`,
  },
  {
    to: ['hannah'],
    subject: 'Juniper prototype sessions — recruiting',
    at: '1d@21:40',
    body: `Hi Hannah,

With the Harbor batch underway, we're ready to start recruiting for the Juniper prototype sessions. Rough shape:
- 16 sessions, remote, 60 minutes
- Sole proprietors and LLCs with 1–10 employees who opened a business account in the last 18 months
- At least 4 who abandoned an application partway through

Timing-wise, we'd want sessions in the two weeks after our Denver workshop, so`,
  },
  {
    threadId: 't-tidewater-questions',
    to: ['jess'],
    cc: ['priya'],
    subject: 'Tidewater proposal — a few questions',
    at: '2h',
    body: `Hi Jess,

Great to hear your leadership team is keen — thank you. Answers below:

1. Early November start: yes. With a signed SOW by mid-October, we can kick off discovery in the first week of November. We'd front-load the in-store work so you have findings well before peak-season planning starts in December.

2. In-store sessions in Astoria: happy to. Our suggestion is to swap 4 of the 12 remote interviews for in-store sessions at the flagship, which keeps the fee the same. If you'd rather have 12 remote plus 4 in-store, that adds roughly

3. Fee: the $86,000 is fixed for the scope as written.

4. Day-to-day contact: `,
  },
  {
    to: ['designTeam'],
    subject: 'Crit tomorrow — agenda + running order',
    at: '50m',
    scheduleInHours: 24,
    body: `Hi team,

Agenda for tomorrow's crit, 2:00–3:30 at the big table. Same rules as always: five minutes of context, the rest is feedback, and the presenter picks what kind of feedback they want.

Running order:
- 2:00 Lena — homepage hero v3 (6-tile mosaic, headline test)
- 2:25 Kai — Harbor auth-failure error state, ahead of Friday's sprint demo
- 2:50 Theo — Atlas docs information architecture for the v2.0 relaunch
- 3:15 Open floor — bring anything half-baked

If you're presenting, drop your link in #design-crit by noon so people can look beforehand.

Robin`,
  },
];

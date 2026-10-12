import type { Contact } from '../lib/types';
import type { SeedThread } from './seedTypes';

/**
 * "Mailbox states" seed: sent mail, drafts, scheduled sends, snoozed threads,
 * trash, spam and older archived conversations. Extra contacts are prefixed m_.
 */
export const contacts: Contact[] = [
  // Professional / personal
  { id: 'm_yusuf', name: 'Yusuf Demir', email: 'yusuf.demir@studiokappa.example', org: 'Studio Kappa', title: 'Creative Director (former colleague)', color: '#137333', replies: true },
  { id: 'm_lena', name: 'Lena Voss', email: 'lena.voss@fernhill.example', org: 'Fernhill', title: 'Head of Design', color: '#a142f4', replies: true },
  { id: 'm_ilse', name: 'Ilse Brandt', email: 'ilse.brandt@prismly.example', org: 'Prismly', title: 'Account Executive', color: '#0b57d0', replies: true },
  { id: 'm_fontkit', name: 'Fontkit Support', email: 'support@fontkit.example', org: 'Fontkit', color: '#5f6368' },
  { id: 'm_nadia', name: 'Nadia Roy', email: 'nadia.roy@frameconf.example', org: 'FrameConf', title: 'Attendee Experience', color: '#e8710a' },
  { id: 'm_ingrid', name: 'Ingrid Vale', email: 'ingrid.vale@cobaltlabs.example', org: 'Cobalt Labs', title: 'Head of Product', color: '#12a4af', replies: true },
  { id: 'm_carol', name: 'Carol Whitfield', email: 'carol@whitfieldbuilders.example', org: 'Whitfield Builders', title: 'Project Manager', color: '#b06000' },
  // Automated / promo senders that ended up in the trash
  { id: 'm_calendar', name: 'Northlight Calendar', email: 'calendar-noreply@northlight.example', org: 'Northlight', color: '#1967d2' },
  { id: 'm_threadhouse', name: 'Threadhouse Outlet', email: 'deals@threadhouse.example', org: 'Threadhouse', color: '#d93025' },
  { id: 'm_pixelpine', name: 'Pixel & Pine Weekly', email: 'hello@pixelandpine.example', org: 'Pixel & Pine', color: '#188038' },
  { id: 'm_skylark', name: 'Skylark Air Deals', email: 'fares@skylarkair.example', org: 'Skylark Air', color: '#0b57d0' },
  { id: 'm_lumen', name: 'Lumen Circle', email: 'notifications@lumencircle.example', org: 'Lumen Circle', color: '#e52592' },
  // Spam
  { id: 'm_coinnova', name: 'CoinNova Rewards', email: 'claim@coinnova-rewards.example', color: '#f29900' },
  { id: 'm_swiftparcel', name: 'SwiftParcel Delivery', email: 'notice@swiftparcel-track.example', color: '#c5221f' },
  { id: 'm_ledgerpoint', name: 'Accounts Receivable', email: 'billing@ledgerpoint-invoices.example', color: '#5f6368' },
  { id: 'm_lottery', name: 'Pan-Continental Lottery Board', email: 'winners@pcl-claims-office.example', color: '#9334e6' },
  { id: 'm_rankrocket', name: 'Brent Kowal', email: 'brent@rankrocket-seo.example', org: 'RankRocket', title: 'Growth Consultant', color: '#e8710a' },
  { id: 'm_fake_tom', name: 'Tom Becker', email: 'tom.becker.ceo@nlight-mail.example', color: '#80868b' },
];

/* -------------------------------------------------------------------------- */
/* SENT                                                                        */
/* -------------------------------------------------------------------------- */

const sentOnly: SeedThread[] = [
  {
    subject: 'Running 10 min late',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['marcus'],
        ago: '9m',
        md: `Hey Marcus, my train just decided to sit in a field for a while. I'll be about 10 minutes late to the design sync. Start without me, the Figma frame for the empty states is already linked in the invite.

— Jordan`,
      },
    ],
  },
  {
    subject: 'Onboarding v4 is ready for eng review',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'me',
        to: ['priya'],
        cc: ['marcus', 'kenji'],
        ago: '1h 20m',
        files: [['Onboarding-v4.pdf', 2400000]],
        md: `Hi Priya,

Onboarding v4 is ready for a first eng pass. The PDF walks through the full flow, from accepting the invite to saving the first dashboard. Frame numbers match the Figma file, so you can leave comments there.

Three things I'd love your eyes on:

1. The workspace-name step is now optional and defaults to the company domain. Does that break anything in provisioning?
2. Step 3 loads sample data while the user is still choosing a template. I think that's doable with the current API, but you would know.
3. The "Skip for now" link on the integrations step. Product wants it, I'm nervous it will quietly kill half our integration starts.

No rush before the sync. Even a "looks feasible / looks scary" on each would be great.

Thanks!
— Jordan`,
      },
    ],
  },
  {
    subject: 'Invoice 0143: Brightwave discovery sprint',
    labels: ['finance'],
    messages: [
      {
        from: 'me',
        to: ['rachel'],
        ago: '3h',
        files: [['Invoice-0143.pdf', 96000]],
        md: `Hi Rachel,

Attached is invoice 0143 for the discovery sprint (four weeks, as per the SOW). Payment terms are net 30, and the PO number you sent over is on the invoice.

If your AP team needs a different billing contact or a W-9, tell me and I'll send it right away.

Thanks again for a great sprint. The stakeholder interviews were my favourite part.

Best,
Jordan

--
Jordan Hayes
Product designer · hayes.example`,
      },
    ],
  },
  {
    subject: 'Bug: date range picker resets when a filter changes',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['kenji'],
        cc: ['priya'],
        ago: '5h 40m',
        files: [['picker-reset.mov', 8700000]],
        md: `Hi Kenji,

Found a reproducible bug on the Explore page while prepping the demo:

1. Open Explore and set the date range to "Last 90 days"
2. Add any filter (I used Plan = Team)
3. The date picker snaps back to "Last 7 days", but the chart title still says 90 days

Expected: the range stays put. Actual: the picker resets but the query doesn't, so the chart and the control disagree. That mismatch is the confusing part for users.

Seen on staging with the latest build, in Chrome and Safari. Screen recording attached. I didn't dig into the code, but it smells like the filter change re-mounts the toolbar.

Not a blocker, but it's on the demo path. Could someone take a look before the customer walkthrough?

Thanks,
Jordan`,
      },
    ],
  },
  {
    subject: 'Thanks for yesterday (my forearms disagree)',
    messages: [
      {
        from: 'me',
        to: ['noah'],
        ago: '1d 4h',
        md: `Noah, thank you for dragging me up that overhang yesterday. My forearms have filed a formal complaint.

Same time next week? I'll bring the good chalk and a slightly less optimistic attitude towards the 6b.

— Jordan`,
      },
    ],
  },
  {
    subject: 'Intro: Elena <> Lucia (data storytelling)',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['elena', 'lucia'],
        cc: ['marcus'],
        ago: '1d 20h',
        md: `Hi both,

I'm writing to introduce you two, since I keep telling each of you about the other.

Lucia teaches an information design studio at the Politecnico and is looking for a practitioner who can bring real analytics data to her students for a one-off session. Elena is the data scientist at Northlight who built our retention cohort views, and who gives the best "why is this chart lying to me" talk I've ever heard in a hallway.

Elena, Lucia has been my mentor for years and is generous with her time. Lucia, Elena is extremely good at making uncertainty visible without scaring anyone.

I'll get out of the way now. Marcus is cc'd only because he will want to claim credit later.

Thanks both!
Jordan`,
      },
    ],
  },
  {
    subject: 'Updated customer-story slides for the enterprise deck',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['amara'],
        ago: '2d 6h',
        files: [['Enterprise-Deck-Story-Slides.key', 12400000]],
        md: `Hi Amara,

Here are the refreshed customer-story slides for the enterprise deck. Three changes from the last version:

- One story per slide, with the number first ("41% faster setup") and the quote second
- A consistent screenshot crop, so the product doesn't jump around between slides
- The Kestrel story is now the opener, since it's the one prospects ask about

The .key file has speaker notes with the source of every number. Ping me if legal wants any of them softened.

Thanks!
Jordan`,
      },
    ],
  },
  {
    subject: 'Cancelling my Fontkit Pro subscription',
    labels: ['finance'],
    messages: [
      {
        from: 'me',
        to: ['m_fontkit'],
        ago: '3d',
        md: `Hi Fontkit team,

Please cancel my Fontkit Pro subscription (account: jordan.hayes@hayes.example) at the end of the current billing period, and confirm that I won't be charged for the next annual renewal.

I'm moving to the licensed families we already have at the studio, so nothing wrong on your side. The specimen tool is lovely.

Could you send a confirmation email once it's done? Thanks!

Jordan Hayes`,
      },
    ],
  },
  {
    subject: 'Thoughts on the settings page redesign',
    labels: ['design', 'work'],
    starred: true,
    messages: [
      {
        from: 'me',
        to: ['marcus'],
        ago: '4d 3h',
        md: `Hi Marcus,

Thanks for sharing the settings redesign. I spent an hour with it and wanted to write my thoughts down properly instead of scribbling comments all over the frames. Overall: the direction is right. Moving from one endless page to grouped sections with a sticky left nav is exactly what the current page needs, and the account/billing split will save support tickets.

What's working well:

- The hierarchy in the profile section is much calmer. Avatar, name, email, done.
- The inline save state (the little "Saved" check) is a lovely touch and a big step up from the modal confirm.
- The danger zone is restrained. It's clearly separate without screaming.

Where I'd push back, gently:

1. **Too many toggles at the same visual weight.** Notifications has 14 toggles that all look equally important. Users can't tell what's the default and what's a risk. I'd group them by "what happens if I turn this off" and demote the low-stakes ones.
2. **The left nav has 9 items.** That's on the edge. "Security" and "Sessions" could be one thing, and I'm not convinced "Labs" deserves top-level real estate before it has three features in it.
3. **Empty and error states aren't designed yet.** What does the API keys section look like for a brand-new workspace? It's the only section where I couldn't picture the first-run experience.

One bigger question, and feel free to ignore it: are we sure people come to settings to browse? Most of the support tickets I've read are "how do I change X", which suggests that people arrive with a task. A search field at the top might do more than any amount of regrouping. Even a rough command-palette version would cover most of it.

I'm happy to sketch the notifications grouping if it's useful, and I can take the empty states off your plate this week. Tell me which is more helpful.

Thanks again for letting me poke at this early.

— Jordan`,
      },
    ],
  },
  {
    subject: 'Quick status ping: sample-data endpoint',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['priya'],
        ago: '7d 3h',
        md: `Hi Priya, quick status ping: is the sample-data endpoint still on track for the v4 build? I don't want to design step 3 around something that has slipped. A one-line "yes / no / it's complicated" is all I need.

Thanks!
— Jordan`,
      },
    ],
  },
  {
    subject: 'Prismly team plan: can we talk price?',
    labels: ['work', 'finance'],
    messages: [
      {
        from: 'me',
        to: ['m_ilse'],
        ago: '6d 2h',
        md: `Hi Ilse,

Thanks for the quote for the Prismly Team plan. I'm helping the Northlight design team pick a prototyping tool, and Marcus is signing off on the budget. We're keen to move forward, but the numbers need some work on our side.

Where we are: 8 seats on the annual plan come to $10,752 at list price, which is hard to justify next to the tools we already pay for. Here's what would make this an easy yes:

- 20% off the annual list price as a first-year discount
- The same rate locked in for the renewal year
- Viewer seats for engineers and PMs included, not billed as full seats

In return we can sign this week, pay annually up front, and I'm happy to be a reference customer once we've rolled it out. I've also already sent the team three "how did we ever live without this" messages, so word of mouth is working in your favour.

If those aren't all possible, tell me which one has room and we'll find a middle ground.

Thanks,
Jordan

--
Jordan Hayes
Product designer · hayes.example`,
      },
    ],
  },
  {
    subject: "15 minutes on Fernhill's first-run experience?",
    messages: [
      {
        from: 'me',
        to: ['m_lena'],
        ago: '8d 5h',
        md: `Hi Lena,

I'm Jordan, a freelance product designer. I've admired Fernhill's sign-up flow for a while, especially the way the reschedule step lets you change a booking without re-entering everything. It's the kind of small decision most teams skip.

I'm reaching out because I've been working on onboarding and activation for B2B analytics tools (currently at Northlight), and it looks like our two products have the same problem: a lot of setup for people who just want to see value fast. I'd love to swap notes for 15 minutes. No pitch, promise, I'm not looking for work. I'm just curious how you decided what to cut from the first session.

If you want context on what I do, here's a short case study: hayes.example/work/northlight-onboarding

If you're the wrong person for this, I'd be grateful for a pointer to whoever is.

Thanks for reading,
Jordan

--
Jordan Hayes
Product designer · hayes.example`,
      },
    ],
  },
  {
    subject: 'Thank you for the offsite',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['sofia'],
        ago: '10d 4h',
        md: `Hi Sofia,

I just wanted to say thank you for the offsite. I know how much invisible work went into it. The bus schedule alone must have needed a spreadsheet the size of a small country. And the half-day of "no meetings, just walking and talking" turned out to be where the best ideas came from, at least for the design crew.

Also: whoever chose the venue's coffee deserves a promotion.

I'm glad to help with the next one, even if it's just moving chairs.

Thanks again!
Jordan`,
      },
    ],
  },
  {
    subject: 'Proposal: extending my Northlight engagement next quarter',
    labels: ['work', 'finance'],
    starred: true,
    messages: [
      {
        from: 'me',
        to: ['tom'],
        cc: ['priya'],
        ago: '12d',
        files: [['Northlight-Extension-Proposal.pdf', 520000]],
        md: `Hi Tom,

Thank you for the conversation yesterday. As promised, here's my proposal for continuing at Northlight next quarter. The short version:

- Same three days a week, embedded with the product team
- Focus on activation and onboarding (the v4 rollout), then the billing revamp
- A monthly retainer instead of a day rate, which simplifies things for both of us
- A written handoff plan, so the design system doesn't depend on me being around

The PDF has the scope, the milestones and the pricing. I've kept the rate flat even though the scope is growing a bit, because I like working with this team and I'd rather have a long engagement than a squeezed one.

If it helps, I'm happy to talk it through with you and Priya together. Take whatever time you need. I'm flexible on when the new period starts.

Thanks,
Jordan

--
Jordan Hayes
Product designer · hayes.example`,
      },
    ],
  },
  {
    subject: 'Receipts for the workshop trip + mileage log',
    labels: ['finance', 'receipts'],
    messages: [
      {
        from: 'me',
        to: ['wes'],
        ago: '14d 2h',
        files: [
          ['Receipts-Workshop-Trip.zip', 5300000],
          ['Mileage-Log.xlsx', 48000],
        ],
        md: `Hi Wes,

Here's the pile for this quarter's business expenses: receipts from the Lisbon workshop trip (flights, two hotel nights, the train) and my mileage log for client visits.

A couple of questions:

1. The co-working day pass in Lisbon was €28 and I paid on a personal card. I assume that's still deductible?
2. The laptop stand and the second monitor were bought together on one invoice. Do I split them or claim them as one?

No rush, whenever you get to it before the estimated payment is due. Thanks for always making my shoebox look organised.

Jordan`,
      },
    ],
  },
  {
    subject: 'Photos from the lake (the fish is smaller than it looks)',
    labels: ['family'],
    messages: [
      {
        from: 'me',
        to: ['linda', 'frank'],
        ago: '15d 20h',
        files: [
          ['IMG_2041.jpg', 3400000],
          ['IMG_2058.jpg', 2900000],
          ['lake-sunset.jpg', 4100000],
        ],
        md: `Hi Mom, hi Dad,

As promised, here are the best photos from the lake weekend. The one with Dad and the fish is the one I'm getting printed. Yes, the fish is smaller than it looks. We all agreed not to say anything.

Mom, the sunset one is for the fridge. I'll put the rest in a shared album so you can grab whichever ones you like.

Love you both. Call this weekend?
— Jordan`,
      },
    ],
  },
  {
    subject: 'Bedroom radiator still cold',
    messages: [
      {
        from: 'me',
        to: ['marta'],
        ago: '21d',
        md: `Hi Marta,

Following up on my earlier message: the radiator in the bedroom still isn't heating up. The living room one is fine, so it's probably just that one valve. I've bled it twice already.

I'm home most days after 6 pm and on weekends, so any time works for the plumber. Could you let me know when they can come by?

Thank you!
Jordan Hayes (Apartment 4B)`,
      },
    ],
  },
  {
    subject: 'Portfolio: fresh eyes on the case study order?',
    labels: ['design'],
    messages: [
      {
        from: 'me',
        to: ['chloe'],
        ago: '28d',
        files: [['Portfolio-Draft-v3.pdf', 6800000]],
        md: `Chloé,

Fresh eyes needed. I'm rebuilding my portfolio and can't decide whether to lead with the Northlight onboarding story (bigger numbers) or the Larkspur brand work (prettier pictures). Draft attached.

Honest opinion please, especially on the intro paragraph. I've rewritten it eleven times and now every sentence looks like a typo.

I'll owe you a coffee and a very long bike ride.

— Jordan`,
      },
    ],
  },
  {
    subject: "Flights for Mom's 60th are booked",
    labels: ['family', 'travel'],
    starred: true,
    messages: [
      {
        from: 'me',
        to: ['riley'],
        ago: '41d',
        md: `Riley, flights are sorted!

I booked the outbound on the morning flight and the return on the evening one, so we get a full day at Mom's. I've held a seat for you too. Send me your passport name exactly as it appears so I can add you before the fare goes back up.

Total is $214 each. Pay me back whenever, or in the form of birthday cake.

Also: let's not tell Dad the theme. He'd overthink it.

— J`,
      },
    ],
  },
  {
    subject: 'Retention chart: two colour options',
    labels: ['design'],
    messages: [
      {
        from: 'me',
        to: ['elena'],
        ago: '56d',
        files: [
          ['Retention-Options-A.png', 640000],
          ['Retention-Options-B.png', 710000],
        ],
        md: `Elena, two options for the retention cohort chart are attached. A uses a single-hue ramp (cleaner, but the 30-day cliff is easy to miss). B uses a diverging palette centred on the median (louder, but it shows which cohorts are behaving differently).

My vote is B for the exec dashboard and A for the docs. Which one makes the data look more honest to you?

Thanks!
Jordan`,
      },
    ],
  },
  {
    subject: "Coffee when you're at FrameConf?",
    messages: [
      {
        from: 'me',
        to: ['m_yusuf'],
        ago: '70d',
        md: `Yusuf!

I saw on the internet that you're now a Creative Director. Very well deserved, and very annoying, because now I have to be polite to you.

Are you still coming through town for FrameConf? If so, let's do coffee. I'll buy, in honour of every time you covered for me on the Kappa rebrand while I was having a 4 a.m. Figma meltdown.

— Jordan`,
      },
    ],
  },
];

/** Sent threads that got a reply, so they also live in the inbox. */
const sentWithReplies: SeedThread[] = [
  {
    subject: 'Empty states: illustrations or icons for launch?',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'me',
        to: ['priya'],
        ago: '4h 30m',
        md: `Hi Priya,

Quick scoping question on the v4 empty states. I have two options for launch:

- **Illustrations:** a custom set for dashboards, reports and alerts. Nicer, but about three days of my time plus review.
- **Icons:** the existing icon set, plus one line of copy and one clear button. Much faster, and still on-brand.

My instinct is icons for launch and illustrations later. Does that fit your timeline, or is engineering already planning around the illustrations?

Thanks,
Jordan`,
      },
      {
        from: 'priya',
        ago: '2h 10m',
        unread: true,
        md: `Icons for launch, 100%. We're already tight on the release branch and I'd hate to put asset loading on the critical path.

One request: can the button on the dashboards empty state link straight to "Create from template" instead of a blank canvas? Kenji says that's a one-line change on our side.

Illustrations can be a good fast follow. Put it on the wishlist for next quarter and I'll back you.

— Priya`,
      },
    ],
  },
  {
    subject: 'Pricing page copy: can we freeze it this week?',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['rachel'],
        ago: '2d 3h',
        md: `Hi Rachel,

Quick check on the pricing page. Design is ready to go to build, but the copy on the three plan cards is still the version from the workshop. Can we freeze it by the end of this week? Engineering would like a full week of build time before your launch.

Two open decisions:

1. "Contact sales" vs. "Talk to us" on the Enterprise card
2. Whether the annual toggle defaults to on

My vote is "Talk to us" and annual on by default, but it's your call.

Thanks,
Jordan`,
      },
      {
        from: 'rachel',
        ago: '1d 22h',
        md: `Hi Jordan,

Good timing. Legal signed off on the plan-card wording yesterday, so I can freeze the copy by end of day tomorrow.

"Talk to us" wins. Annual default on is a yes from me, but our CFO wants to see a version with monthly first before we commit. Can you mock both? Quick and dirty is fine.

Thanks for pushing on this!
Rachel`,
      },
      {
        from: 'me',
        to: ['rachel'],
        ago: '1d 21h',
        md: `Perfect, I'll send both toggle variants tomorrow morning. Thanks Rachel!

— Jordan`,
      },
    ],
  },
  {
    subject: 'Larkspur checkout: free-shipping threshold',
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['omar'],
        ago: '1d 6h',
        md: `Hi Omar,

I'm finishing the cart page for the new subscription checkout and I need one number from you: what should the free-shipping threshold be? Right now the mockups say $35, but I made that up, so it looks confident and wrong.

If it helps: the progress bar ("You're $8 away from free shipping") works best when the threshold is roughly 20 to 30 percent above your average order. What's the average right now?

Thanks!
Jordan`,
      },
      {
        from: 'omar',
        ago: '20h',
        unread: true,
        md: `Ha, that's a confident number. Our average order is $29 this month, so $35 isn't crazy. I'd go with $40 and see if it nudges people to add a second bag of the Ethiopian.

Also, can we make "subscribe and save" preselected? Pretty please. My accountant says it's the only thing that makes the numbers work.

— Omar`,
      },
    ],
  },
  {
    subject: 'Borrowing your 4-person tent?',
    labels: ['travel'],
    messages: [
      {
        from: 'me',
        to: ['dev'],
        ago: '20d 3h',
        md: `Dev, do you still have that 4-person tent? Noah and I are trying to sneak in a night at the lake before it gets cold, and the zipper on mine has decided to retire. I'll return it clean and dry, on my honour.

— J`,
      },
      {
        from: 'dev',
        ago: '19d 22h',
        md: `Yes! It's in the garage, so come by whenever. It's a 3-season tent, so bring a warmer sleeping bag than you think you need.

Also: which lake? I want to hear where you're taking it before I lend you $400 of nylon.`,
      },
      {
        from: 'me',
        to: ['dev'],
        ago: '19d 21h',
        md: `Lake Merrow, the north shore campground. I'll pick the tent up tomorrow evening and bring beer as collateral. Thanks!

— J`,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* DRAFTS                                                                      */
/* -------------------------------------------------------------------------- */

const drafts: SeedThread[] = [
  {
    subject: 'Cover letter: Senior Product Designer, Tidewater Health',
    messages: [
      {
        from: 'me',
        to: [],
        ago: '1d 2h',
        draft: true,
        md: `Dear hiring team at Tidewater Health,

I'm writing to apply for the Senior Product Designer role on your patient-experience team. I've spent the last six years designing software people would rather not have to use (analytics tools, booking flows, billing screens), and I've learned that the best thing you can do for someone in a stressful moment is get out of their way. That's the idea I'd bring to Tidewater.

For the past two years I've worked as a freelance product designer, embedded three days a week at Northlight, a B2B analytics start-up. The project I'm proudest of is the onboarding redesign: we replaced a nine-step setup wizard with a three-step guided flow that starts with sample data. Activation went up by roughly a third (I need to check the exact number with Elena before I put it in writing) and support tickets that began "where do I start" dropped to almost nothing.

What I'd like you to know about how I work:

- I start with the people who actually use the product. For Northlight that meant sitting in on 14 support calls before I drew a single screen.
- I write down my reasoning. Every decision I ship comes with a short doc on what we tried, what we chose, and what we'd change if the numbers disagree.
- I like engineers. I pair early and often, and I have never handed off a design I wasn't ready to defend in code review.

Healthcare is new to me, and I want to be honest about that. What I bring instead is a habit of asking the boring questions early, and I noticed that your job post mentions the appointment-reminder flow as a priority. I looked at it on the`,
      },
    ],
  },
  {
    subject: '',
    messages: [
      {
        from: 'me',
        to: ['omar'],
        ago: '3m',
        draft: true,
        md: `Omar, before I forget: can you send me the roastery photos you like best for the homepage hero? The real ones with the steam and the burlap sacks, not the stock ones. Anything over 2000px wide is perfect.`,
      },
    ],
  },
  {
    subject: "Talk proposal: 'Design reviews that don't hurt'",
    labels: ['ideas'],
    messages: [
      {
        from: 'me',
        to: [],
        ago: '6d',
        draft: true,
        md: `Hi,

I'd like to propose a talk for the meetup: **Design reviews that don't hurt**.

The pitch (rough):

- Most design critique fails for the same three reasons: no shared goal, feedback about taste, and too many people in the room
- A 20-minute format I've used at Northlight that cut our review meetings in half
- Live demo: rewriting a bad critique comment into a useful one

Format: 25 minutes plus Q&A. I can bring printable one-page templates.

Still to add: my bio, a better title, and who I'm actually sending this to.`,
      },
    ],
  },
  {
    subject: 'Handoff checklist for the billing revamp',
    labels: ['work'],
    messages: [
      {
        from: 'priya',
        ago: '1d 3h',
        md: `Hey Jordan,

Before we kick off the billing revamp, can you put together a handoff checklist? Kenji wants to know:

1. Which components are new and which are reused from the design system
2. Where the error states live (he couldn't find them in the file)
3. Whether the annual/monthly toggle needs its own spec

No rush, just before the kickoff.

— Priya`,
      },
      {
        from: 'me',
        to: ['priya'],
        ago: '50m',
        draft: true,
        md: `Hi Priya,

Happy to. Quick answers while I write up the full checklist:

1. New components: the plan selector and the invoice table row. Everything else is reused from the design system.
2. Error states are on a page called "Billing / edge cases". It's at the very end of the file and I clearly hid it too well. I'll rename it and link it from the cover page.
3. Yes, the toggle needs its own spec, since it changes how the price is displayed on`,
      },
    ],
  },
  {
    subject: "Dad's birthday dinner",
    labels: ['family'],
    messages: [
      {
        from: 'linda',
        ago: '2d 4h',
        unread: true,
        md: `Hi sweetheart,

Your father is asking (again) whether you're coming to his birthday dinner. I told him I'd ask you instead of him calling you at work, which he would.

We're thinking of the Italian place he likes, around 7. Riley says she's in. Can you let me know soon so I can book the big table?

Also, did you eat this week? You sounded tired on the phone.

Love,
Mom`,
      },
      {
        from: 'me',
        to: ['linda'],
        ago: '5h',
        draft: true,
        md: `Hi Mom,

Yes, I'm coming! Please book the big table. I'll take the afternoon train, so I should get there in time for dinner, and I'll stay over so I don't have to run for the last train.

I'm fine, I promise. Just a big project at work. I ate. There was a salad. It had croutons, so it counts.

Can I bring anything? I'm thinking of a cake from that bakery near the station, so Dad can pretend he doesn't like it and then have two slices.

Love you,
Jordan`,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* SCHEDULED                                                                   */
/* -------------------------------------------------------------------------- */

const scheduled: SeedThread[] = [
  {
    subject: "Design status update: what's moving this week",
    labels: ['work'],
    messages: [
      {
        from: 'me',
        to: ['priya', 'marcus', 'elena', 'kenji', 'hannah'],
        ago: '0m',
        scheduledIn: '17h',
        md: `Morning all,

Here's where design stands as we start the week.

**Shipping**
- Onboarding v4: eng review is done and the build starts this week. Empty states use icons, not illustrations.
- Explore date picker fix: spec approved, waiting on a slot in the sprint.

**In progress**
- Billing revamp: the plan selector and invoice table are in review with Priya.
- Settings redesign: I'm picking up the empty states from Marcus.

**Needs a decision**
- Dark mode in the v4 launch, or hold it for the next release? I'd hold it, but I'd like to hear from Engineering.

I'm at Northlight three days this week, so grab me for anything that shouldn't wait for the next update.

Thanks,
Jordan`,
      },
    ],
  },
  {
    subject: 'Happy birthday, Riley!',
    labels: ['family'],
    messages: [
      {
        from: 'me',
        to: ['riley'],
        ago: '0m',
        scheduledIn: '2d 9h',
        md: `Happy birthday to my favourite sister, and my only sister, which makes this a unanimous victory.

I'm sending this in advance so it lands at breakfast, before the flood of texts. Your present is in the mail and may arrive late, in which case it's a "birthday extension", a well-known Hayes tradition.

Have a fantastic day, eat cake before noon, and call me after dinner so I can hear how many people sang off-key. (Actually let them. It's tradition.)

Love,
J`,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* SNOOZED                                                                     */
/* -------------------------------------------------------------------------- */

const snoozed: SeedThread[] = [
  {
    subject: 'Your FrameConf registration is almost complete',
    category: 'updates',
    labels: ['travel'],
    snoozed: '4h',
    messages: [
      {
        from: 'm_nadia',
        ago: '1d 3h',
        md: `Hi Jordan,

You started registering for FrameConf but haven't finished checking out. Your spot isn't held yet, and early-bird pricing ends soon.

**What's in your cart**
- 2-day conference pass (design track): $395 early-bird
- Workshop, "Prototyping with real data" (limited to 40 seats): $120

Complete your registration to lock in the early-bird rate and get access to the attendee community.

Questions about group rates, accessibility or invoicing for your employer? Just reply to this email.

--
Nadia Roy
Attendee Experience, FrameConf`,
      },
    ],
  },
  {
    subject: 'Can you look over the Kestrel case study?',
    labels: ['work'],
    snoozed: '1d 18h',
    messages: [
      {
        from: 'hannah',
        ago: '2d 5h',
        md: `Hi Jordan,

Would you have 20 minutes to look at the Kestrel Logistics case study before it goes to marketing? I've written it as a story (problem, what we did, the result), and I want the design section to sound like it was written by someone who actually knows design.

Specifically:

1. Is the section on the new route-planning dashboard accurate? I called it a "redesign" and I have a feeling you'd say "rethink".
2. Are the screenshots okay to publish, or should we blur the driver names?

The doc is in the shared Customer Stories folder, with suggestions mode on.

Thanks so much, I owe you a coffee (again).
Hannah`,
      },
    ],
  },
  {
    subject: 'Lease renewal: form to sign and return',
    snoozed: '6d',
    messages: [
      {
        from: 'marta',
        ago: '3d',
        files: [['Lease-Renewal-Form.pdf', 184000]],
        md: `Dear Jordan,

Please find attached the lease renewal form for your apartment. Our records show your current lease ends in about two months. If you plan to stay, could you sign page 3 and return the form to me within two weeks of receiving this?

The rent for the renewal term will increase by 2.5%, which is below the regional average. All other terms stay the same. If you have any concerns about the new amount, please don't hesitate to reach out.

Kind regards,

--
Marta Kowalski
Kowalski Properties`,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* TRASH                                                                       */
/* -------------------------------------------------------------------------- */

const trash: SeedThread[] = [
  {
    subject: '48 hours only: 60% off everything',
    category: 'promotions',
    trashed: true,
    trashedAgo: '2h',
    messages: [
      {
        from: 'm_threadhouse',
        ago: '2d 6h',
        unsubscribe: true,
        md: `**Our biggest sale of the season starts now.**

For 48 hours only, take 60% off everything, including new arrivals, denim, and the jackets you've been eyeing since the last sale. Free shipping on orders over $75.

Use code **STAYWARM60** at checkout. Ends when the timer does.

Happy shopping,
The Threadhouse team`,
      },
    ],
  },
  {
    subject: 'Invitation: Design crit, Onboarding v4 (2 of 2)',
    category: 'updates',
    trashed: true,
    trashedAgo: '2d 20h',
    messages: [
      {
        from: 'm_calendar',
        ago: '3d 1h',
        md: `Marcus Chen has invited you to a meeting.

**Design crit: Onboarding v4**
2:00 PM to 2:45 PM (your local time)
Where: Design room 2 / video link in the event
Who: Marcus Chen (organiser), Priya Nair, Kenji Watanabe, Jordan Hayes

You're receiving this again because the event was re-created by a calendar sync. It's identical to the invitation you already accepted, so you can safely ignore or delete this copy.

Yes | No | Maybe`,
      },
    ],
  },
  {
    subject: 'Onboarding audit proposal for Cobalt Labs',
    labels: ['work'],
    trashed: true,
    trashedAgo: '6d',
    messages: [
      {
        from: 'me',
        to: ['m_ingrid'],
        ago: '12d',
        files: [['Cobalt-Onboarding-Audit-Proposal.pdf', 1450000]],
        md: `Hi Ingrid,

Thank you for the call last week. As discussed, attached is my proposal for a two-week onboarding audit: a teardown of the current sign-up flow, five user sessions, and a prioritised list of fixes with rough effort estimates.

It's a fixed fee, and I can start as early as the week after you confirm.

Happy to answer any questions.

Best,
Jordan`,
      },
      {
        from: 'm_ingrid',
        ago: '9d',
        md: `Hi Jordan,

Thanks for putting this together. It's clear and well priced. Unfortunately we've decided to bring the work in-house for now. Our new design hire starts next month, and she'd like to own the audit herself.

Nothing to do with your proposal. I'd be glad to keep in touch, and I'll reach out if that changes.

All the best,
Ingrid`,
      },
    ],
  },
  {
    subject: 'Revised quote for the kitchen extension',
    trashed: true,
    trashedAgo: '14d',
    messages: [
      {
        from: 'm_carol',
        ago: '15d 3h',
        files: [['Quote-Kitchen-Extension.pdf', 220000]],
        md: `Hi Jordan,

Following up on our site visit. Attached is the revised quote for the kitchen extension: $18,400 including the steel beam and the new patio doors. The lead time on the doors is six weeks, so if you'd like to keep to the original schedule, we should confirm this week.

Let me know if you have any questions.

Carol`,
      },
      {
        from: 'me',
        to: ['m_carol'],
        ago: '15d 1h',
        md: `Hi Carol,

I think this might be meant for a different Jordan. I'm a product designer, and I don't own a kitchen that needs a steel beam (yet). Good luck with the extension!

— Jordan Hayes`,
      },
      {
        from: 'm_carol',
        ago: '14d 20h',
        md: `Oh no, I'm so sorry! Wrong Jordan H. in my contacts. Please delete all of that, and forgive the rambling.

Carol`,
      },
    ],
  },
  {
    subject: 'Pixel & Pine Weekly #212: Design tokens are dead, long live tokens?',
    category: 'updates',
    trashed: true,
    trashedAgo: '4d',
    messages: [
      {
        from: 'm_pixelpine',
        ago: '4d 2h',
        unsubscribe: true,
        md: `Hello, designers and the people who love them.

**This week in Pixel & Pine**

- Design tokens are dead, long live tokens? A veteran's take on what the last three years taught us
- Six tiny animation details that make a form feel expensive
- A teardown: why your empty states are losing you sign-ups
- Reader mailbag: "How do I say no to a stakeholder without a meeting?"

Also this week: our annual reader survey is open. It takes four minutes and one of you wins a very nice desk lamp.

Until next week,
The Pixel & Pine team`,
      },
    ],
  },
  {
    subject: 'Fare alert: 3 cities under $129 this week',
    category: 'promotions',
    trashed: true,
    trashedAgo: '7d 22h',
    messages: [
      {
        from: 'm_skylark',
        ago: '8d',
        unsubscribe: true,
        md: `**Your fare alert just got interesting.**

Flights from your home airport at prices we can't believe we're allowed to print:

- Lisbon: from $118 round trip
- Copenhagen: from $127 round trip
- Porto: from $124 round trip

Seats at these fares are limited and disappear quickly. Book by the end of the week to lock in the price.

Fly well,
Skylark Air`,
      },
    ],
  },
  {
    subject: 'You have 3 new connection suggestions and 1 unread message',
    category: 'social',
    trashed: true,
    trashedAgo: '26d',
    messages: [
      {
        from: 'm_lumen',
        ago: '27d',
        unsubscribe: true,
        md: `Hi Jordan,

People you may know on Lumen Circle:

- Ines Carvalho, Design Systems Lead
- Theo Lindgren, Product Designer
- Priyanka Rao, UX Researcher

You also have 1 unread message waiting for you. Sign in to read it.

Grow your circle,
The Lumen Circle team`,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* SPAM                                                                        */
/* -------------------------------------------------------------------------- */

const spam: SeedThread[] = [
  {
    subject: 'Congratulations! You have been selected for a 2.5 BTC community giveaway',
    spam: true,
    category: 'promotions',
    messages: [
      {
        from: 'm_coinnova',
        ago: '2d 11h',
        unsubscribe: true,
        md: `Hello lucky user!!!

Your email address was randomly selected in our monthly community giveaway. You have won **2.5 BTC**!

To release your prize, verify your wallet within 24 HOURS by sending a small refundable deposit of 0.01 BTC to the address below. Your deposit will be returned together with your winnings.

https://coinnova-rewards.example/claim/JH-7731

Hurry, unclaimed prizes are given to the next lucky winner.

CoinNova Rewards Team`,
      },
    ],
  },
  {
    subject: 'Action required: your parcel is on hold (Ref SP-88231)',
    spam: true,
    messages: [
      {
        from: 'm_swiftparcel',
        ago: '1d 5h',
        md: `Dear customer,

We attempted to deliver your parcel today but the address information was incomplete. Your package is now on hold at our depot.

To schedule redelivery, please pay a small handling fee of **$1.99** within 12 hours. Unpaid parcels are returned to sender.

https://swiftparcel-track.example/pay/88231

Thank you for your understanding,
SwiftParcel Delivery Service`,
      },
    ],
  },
  {
    subject: 'Invoice #INV-88213 overdue: final notice',
    spam: true,
    messages: [
      {
        from: 'm_ledgerpoint',
        ago: '5d',
        files: [['INV-88213.zip', 41000]],
        md: `Dear Customer,

Our records show that invoice INV-88213 for **$1,489.00** remains unpaid. Please review the attached invoice and remit payment within 24 hours to avoid collection action and additional fees.

If you believe this is an error, open the attached file for the full account statement.

Accounts Receivable
Ledgerpoint Services`,
      },
    ],
  },
  {
    subject: 'WINNER NOTIFICATION: Your email has won $850,000.00',
    spam: true,
    messages: [
      {
        from: 'm_lottery',
        ago: '9d',
        unsubscribe: true,
        md: `OFFICIAL WINNING NOTICE

Your email address has been drawn in the Pan-Continental Online Lottery, ticket number 4471-0092-JH. You have been awarded a lump sum of **$850,000.00**.

To claim your prize, reply with your full name, phone number, home address and a copy of your ID to our claims agent. A processing fee of $250 is required before release of funds. Please keep this notice CONFIDENTIAL.

Dr. Alistair Nkemelu
Claims Office, Pan-Continental Lottery Board`,
      },
    ],
  },
  {
    subject: 'Get hayes.example to #1 on Google in 7 days',
    spam: true,
    messages: [
      {
        from: 'm_rankrocket',
        ago: '12d',
        unsubscribe: true,
        md: `Hi there,

I was looking at hayes.example and noticed you're not on the first page for any of your key terms. That's a lot of missed traffic!

At RankRocket we guarantee **#1 ranking in 7 days** or your money back, using our proprietary AI link-boosting technology. Our packages start at just $99/month for 500 premium backlinks.

Can I send you a free audit? It takes me five minutes.

Best,
Brent Kowal
Growth Consultant, RankRocket`,
      },
      {
        from: 'm_rankrocket',
        ago: '6d',
        md: `Hi again, just bumping this to the top of your inbox in case it got buried.

I'm holding your free audit slot until the end of the week. After that I'm afraid it goes to another business in your area.

Talk soon,
Brent`,
      },
    ],
  },
  {
    subject: 'Quick favour, are you at your desk?',
    spam: true,
    messages: [
      {
        from: 'm_fake_tom',
        ago: '6h',
        md: `Jordan,

Are you available? I'm in a meeting and can't take calls, but I need a quick favour and I'd like to keep it between us.

I need you to buy 5 gift cards at $200 each for a client. Scratch off the backs and send me photos of the codes. I'll reimburse you today. Reply as soon as you see this.

Tom

Sent from my iPhone`,
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* ARCHIVED                                                                    */
/* -------------------------------------------------------------------------- */

const archived: SeedThread[] = [
  {
    subject: 'Design token naming: tie-breaker needed',
    labels: ['design', 'work'],
    archived: true,
    messages: [
      {
        from: 'marcus',
        ago: '62d',
        md: `Hey Jordan,

I've been staring at token names for two days and need a tie-breaker. We have two camps:

- **Value-based:** blue-500, gray-900. Easy to understand, terrible when the brand colour changes.
- **Role-based:** color-text-primary, color-surface-raised. More typing, survives a rebrand.

Kenji likes role-based, but Elena says nobody will remember 40 names. You've worked on more design systems than I have, so what's your vote?

Marcus`,
      },
      {
        from: 'me',
        to: ['marcus'],
        ago: '61d 22h',
        md: `Role-based, with a small twist: keep the raw palette as a private layer (blue-500 and friends) that only the role tokens can point to. Designers and engineers never use the palette directly, so the 40 names Elena is worried about are really about 15 that you use every day.

Bonus: a rebrand becomes a one-file change. I've done it twice and it's oddly satisfying.

— Jordan`,
      },
      {
        from: 'marcus',
        ago: '61d 20h',
        md: `That's the piece I was missing, the private layer. Elena is now on team role-based, on the condition that we ship a cheat sheet. Can you draft one?`,
      },
      {
        from: 'me',
        to: ['marcus'],
        ago: '61d 10h',
        md: `Done. One page, in the design system file under "Start here". I also added a lint-rule idea for Kenji: fail the build if anyone references a palette token directly. Please tell him it was Elena's idea. I'll take credit for the cheat sheet only.

— Jordan`,
      },
    ],
  },
  {
    subject: 'Retro notes + a favour',
    labels: ['work'],
    archived: true,
    messages: [
      {
        from: 'priya',
        ago: '44d',
        md: `Hi Jordan,

Thanks for joining the retro. The "what confused us" board was the most useful one we've had in a while. Three take-aways:

- Handoffs from design need a "what's still fuzzy" section
- Engineers want to see states, not just screens
- Nobody knows who owns the copy in error messages (Marketing? Product? You?)

The favour: would you facilitate the next retro? You're good at getting quiet people to talk, and I'd love to be a participant for once.

— Priya`,
      },
      {
        from: 'me',
        to: ['priya'],
        ago: '43d 21h',
        md: `Happy to! I'll steal a format I like: everyone writes their own sticky notes silently for five minutes before anyone speaks. It stops the loudest voice from setting the tone.

On the error-message copy: let me own the first draft, and Marketing reviews. I'll add it to the handoff doc.

Thanks for trusting me with the sticky notes.
— Jordan`,
      },
      {
        from: 'priya',
        ago: '43d 19h',
        md: `Deal. Silent sticky notes it is. Please bring the good markers this time. Somebody stole ours.`,
      },
    ],
  },
  {
    subject: "Grandma's lemon cake recipe",
    labels: ['family'],
    archived: true,
    messages: [
      {
        from: 'linda',
        ago: '48d',
        md: `Hi honey,

Here's Grandma's lemon cake, as promised. She never wrote it down, so this is from memory and my hands:

- 200 g butter, soft
- 200 g sugar
- 4 eggs
- 200 g flour plus 2 tsp baking powder
- zest of 2 lemons and the juice of 1
- a pinch of salt

Cream the butter and sugar until pale, add the eggs one at a time, fold in the flour, then the zest and juice. 170 degrees, about 45 minutes. **Do not open the oven door.** Your grandmother would know.

Love,
Mom`,
      },
      {
        from: 'me',
        to: ['linda'],
        ago: '47d 3h',
        md: `Made it last night. It collapsed in the middle because I opened the oven door (I'm sorry, Grandma), but it tasted exactly like her kitchen. My neighbour asked for the recipe. I told her it's a family secret and then gave it to her anyway.

Thank you for sending it. Love you!
— Jordan`,
      },
    ],
  },
  {
    subject: 'Reading list for the plane',
    labels: ['design'],
    starred: true,
    archived: true,
    messages: [
      {
        from: 'lucia',
        ago: '58d',
        md: `Caro Jordan,

You asked for something to read on the plane. Three books, in the order I would read them:

1. *The Visual Display of Quantitative Information*, by Tufte. Yes, you've read it. Read it again, this time ignoring the parts where he is grumpy.
2. *Thinking in Systems*, by Donella Meadows. Short and wise. It changed how I look at every product, including the ones I don't like.
3. *The Design of Everyday Things*, by Don Norman. The chapter on errors alone is worth the flight.

Tell me which one annoys you most. That's usually the one you need.

Un abbraccio,
Lucia`,
      },
      {
        from: 'me',
        to: ['lucia'],
        ago: '57d 4h',
        md: `Grazie mille! Meadows first. I'll report back with complaints.

One more thing, if you have a minute: I'm talking to a group of students soon about designing for data-heavy products, and I have no idea how to start. Any advice from someone who does this for a living?

Jordan`,
      },
      {
        from: 'lucia',
        ago: '56d 20h',
        md: `Start with a failure, never with a success. Show them a dashboard that confused a real person and let them find out why. Students remember being surprised. They forget being told.

Then give them a very small exercise. One chart, one question, ten minutes. You will be amazed.

Ciao,
Lucia`,
      },
    ],
  },
  {
    subject: 'Estimated payment for this quarter',
    labels: ['finance'],
    archived: true,
    messages: [
      {
        from: 'wes',
        ago: '40d',
        md: `Hi Jordan,

A reminder that your quarterly estimated payment is due in about two weeks. Based on your income so far this year, I'd set aside **$4,850**. You can pay online through the government portal, and I'll email you the voucher details.

Let me know if any big invoices landed that I haven't seen.

Wes

--
Wes Holloway
Holloway & Co.`,
      },
      {
        from: 'me',
        to: ['wes'],
        ago: '39d 22h',
        md: `Thanks Wes, I'll pay it today. One invoice you haven't seen: the Larkspur brand project closed out this week, about $6,200. Attached to my next batch of documents.

Also, is it worth opening a separate savings account just for tax money? I keep spending it by accident.

Jordan`,
      },
      {
        from: 'wes',
        ago: '39d 18h',
        md: `Yes, and it's the best five-minute admin task you'll do this year. Set up an automatic transfer of 25% of every invoice the day it's paid, and you'll never have to think about it.

Send me the Larkspur invoice and I'll update the estimate.

Wes`,
      },
    ],
  },
  {
    subject: 'A design lead role you might like (remote, 4-day week)',
    archived: true,
    messages: [
      {
        from: 'jenna',
        ago: '33d',
        md: `Hi Jordan,

I'm working on a Design Lead search for a Series B climate-data company. Remote-first, four-day week, and a design team of five. The founder specifically asked for someone who has led onboarding work in a B2B analytics product. Your name came up twice, which is a good sign.

Would you be open to a 20-minute chat? Even if it's not the right time, I'd love to keep you on my radar.

Best,
Jenna Walsh
Senior Recruiter, TalentBridge`,
      },
      {
        from: 'me',
        to: ['jenna'],
        ago: '32d 20h',
        md: `Hi Jenna,

Thanks for thinking of me, and that does sound like a lovely role. I'm going to pass for now. I've committed to a few client projects through the rest of the year and I don't want to leave any of them half-finished.

Please keep me on your radar though. A four-day week is exactly the kind of thing that would tempt me next year.

Jordan`,
      },
      {
        from: 'jenna',
        ago: '32d 6h',
        md: `Understood, and thanks for the honest answer! I'll check in early next year. In the meantime, if you know a great design lead who'd like a four-day week, send them my way.

Jenna`,
      },
    ],
  },
  {
    subject: 'Offsite: dietary needs and travel form (2 minutes)',
    labels: ['travel', 'work'],
    archived: true,
    messages: [
      {
        from: 'sofia',
        ago: '38d',
        md: `Hi everyone,

The offsite is coming together! To book the venue and transport, I need each of you to fill in the short form below (it takes about two minutes):

- Dietary needs and allergies
- Whether you're travelling by train, car or the shuttle bus
- Whether you'll stay the second night

https://forms.northlight.example/offsite-logistics

Please complete it by the end of next week. And yes, there will be good coffee this time.

Thanks!
Sofia

--
Sofia Lindqvist
People Operations, Northlight`,
      },
    ],
  },
  {
    subject: 'Design office hours for Harbor portfolio companies',
    labels: ['work'],
    starred: true,
    archived: true,
    messages: [
      {
        from: 'david',
        ago: '27d',
        md: `Hi Jordan,

Tom mentioned you did the onboarding work at Northlight, and the results are impressive. We're putting together a small "office hours" programme for Harbor's portfolio companies: early-stage teams that need product design advice but can't afford a full-time designer yet.

Would you be open to doing two one-hour sessions a month? We'd pay your standard hourly rate through Harbor, and I'd handle the scheduling. Founders would sign up for 30-minute slots.

No pressure at all. If it sounds interesting, I can share more about the first cohort.

Best,
David Kim
Partner, Harbor Capital`,
      },
      {
        from: 'me',
        to: ['david'],
        ago: '26d 20h',
        md: `Hi David,

Thank you, that's kind of Tom, and it sounds like a great programme. I'm happy to do it. Two hours a month works, as long as the sessions are batched (say, back-to-back on one afternoon) so they don't fragment the week.

Two questions: who owns the confidentiality of what founders share in the sessions, and would it be alright if I sometimes shared anonymised patterns in a talk or blog post?

Happy to get on a call if that's easier.

Jordan`,
      },
      {
        from: 'david',
        ago: '26d 6h',
        md: `Batching is no problem. I'll have our counsel send a short mutual NDA, and anonymised patterns are fine as long as no company is identifiable.

The first cohort is six teams, and I'll send you the names once they've signed up. Welcome aboard!

David`,
      },
    ],
  },
];

export const threads: SeedThread[] = [
  ...sentOnly,
  ...sentWithReplies,
  ...drafts,
  ...scheduled,
  ...snoozed,
  ...trash,
  ...spam,
  ...archived,
];

import type { SeedThread, SeedDraft } from './types';

/*
 * Seed mailbox for Robin Hale, Design Lead at Fernbrook (Portland, OR).
 * Timestamps are relative ("25m", "3h", "4d@10:15") and resolved when the mailbox is first created.
 * The content assumes "today" is a Tuesday in late September, so 2d/3d, 9d/10d, 16d/17d … are weekend days.
 */

/* ------------------------------------------------------------------ */
/* Work — Fernbrook, clients and vendors                               */
/* ------------------------------------------------------------------ */

const WORK: SeedThread[] = [
  {
    id: 't-roadmap-q4',
    subject: 'Q4 roadmap — Atlas, Harbor Phase 2, Juniper',
    category: 'primary',
    labels: ['work'],
    starred: true,
    important: true,
    unread: true,
    messages: [
      {
        from: 'priya',
        to: ['maya', 'devon', 'aisha', 'me'],
        at: '6d@09:12',
        body: `Hi all,

Attached is v2 of the Q4 roadmap. I'd like us to lock this by the end of next week so we can share it with the whole team before the offsite.

Four themes, in rough priority order:
- Atlas v2.0 (tokens, dark mode, docs relaunch)
- Harbor patient portal Phase 2
- Juniper onboarding revamp
- Tidewater discovery, if they sign

I know this is more than we can comfortably do. Please reply with where you think it breaks — be specific about people and weeks, not vibes.

Priya`,
        attachments: [
          {
            name: 'Q4-roadmap-v2.pdf',
            size: 2_311_870,
            preview: `Fernbrook — Q4 Roadmap (DRAFT v2)
Owner: Priya Raman · Status: for discussion

1. Atlas design system v2.0
   - OKLCH color tokens, dark mode, docs site relaunch
2. Harbor patient portal — Phase 2
   - Appointments, secure messaging, WCAG 2.2 AA audit
3. Juniper onboarding revamp
   - Research synthesis, prototypes, pilot readiness
4. Tidewater Outfitters (pending signature)
   - Discovery sprint`,
          },
        ],
      },
      {
        from: 'devon',
        to: ['priya'],
        cc: ['maya', 'aisha', 'me'],
        at: '6d@10:41',
        body: `Where it breaks: engineering is ~18% over in Oct/Nov on this plan. Capacity sheet attached.

Biggest single item is Atlas dark mode — it touches every component and needs a full visual regression pass. If that moves to Q1 we're roughly even.

Also flagging that Ines is on-call for Harbor through November, so she's at ~75%.`,
        attachments: [
          {
            name: 'eng-capacity-q4.xlsx',
            size: 48_902,
            preview: `Engineering capacity — Q4 (person-weeks)

Team member   | Oct | Nov | Dec | Notes
Devon Price   |  3  |  4  |  3  | lead, 50% mgmt
Marcus Bell   |  4  |  4  |  3  | Atlas
Ines Duarte   |  4  |  3  |  3  | Harbor on-call
(+3 others)   | 12  | 12  |  9  | holidays in Dec
Total         | 23  | 23  | 18  |
Demand (v2)   | 27  | 27  | 21  | over by ~17%`,
          },
        ],
      },
      {
        from: 'me',
        to: ['priya'],
        cc: ['maya', 'devon', 'aisha'],
        at: '6d@13:05',
        body: `Same story on design. With Theo, Lena and Kai (plus a senior hire in November if the offer we're about to make lands), we can realistically carry three streams, not four.

My proposal:
- Keep Atlas v2.0 tokens + docs site in Q4, move dark mode to Q1
- Harbor Phase 2 gets Theo full-time and Kai at 50%
- Juniper gets Lena full-time; I'll co-run research synthesis with Aisha
- Tidewater discovery only if they sign before November — and then I lead it myself

Dark mode is the thing I most want to do, so it hurts to say this, but it's the right call.

Robin`,
      },
      {
        from: 'aisha',
        to: ['me', 'priya'],
        cc: ['maya', 'devon'],
        at: '5d@08:52',
        body: `+1 to Robin's split. One caveat from the Juniper side: Grace's team wants clickable prototypes before their pilot go/no-go in mid-November, so Lena's time can't get borrowed for Harbor fire drills. If that's a risk I'd rather know now.

Happy to co-run synthesis — I've already tagged about half of the session notes in Driftbox.`,
      },
      {
        from: 'maya',
        to: ['priya', 'me'],
        cc: ['devon', 'aisha'],
        at: '5d@11:20',
        body: `Agree with moving dark mode. For Harbor, the WCAG 2.2 AA audit is written into the Phase 2 SOW, so it has to land in Q4 — Rachel asked about it on our last call too.

Theo + half of Kai works for me as long as Kai's time is protected on Tuesdays and Thursdays, when we sit with Ben's clinical team.`,
      },
      {
        from: 'priya',
        to: ['maya', 'devon', 'aisha', 'me'],
        at: '4d@10:15',
        body: `Thanks — this is exactly the conversation I wanted. Decisions:

1. Atlas dark mode moves to Q1. Atlas v2.0 tokens and the docs site stay in Q4.
2. Design staffing per Robin's note, with Maya's Tue/Thu constraint for Kai.
3. Tidewater discovery is contingent on signature; Robin leads if it happens.

Maya, can you fold this into v3? I'll review Monday.`,
      },
      {
        from: 'maya',
        to: ['priya'],
        cc: ['devon', 'aisha', 'me'],
        at: '1d@16:30',
        body: `v3 attached with everything above folded in. Changes from v2:
- Dark mode moved to Q1 (with a small spike in December so we don't lose the thread)
- Owner column added
- Tidewater row marked contingent

Priya, it's ready for your review.`,
        attachments: [
          {
            name: 'Q4-roadmap-v3.pdf',
            size: 2_480_133,
            preview: `Fernbrook — Q4 Roadmap v3 (for sign-off)

Theme           | Owner  | Oct        | Nov         | Dec
----------------|--------|------------|-------------|------------
Atlas v2.0      | Devon  | tokens     | docs site   | release
Harbor Phase 2  | Maya   | appts      | messaging   | AA audit
Juniper revamp  | Aisha  | synthesis  | prototypes  | pilot prep
Tidewater       | Priya  | —          | discovery*  | discovery*

Moved to Q1: Atlas dark mode (spike in Dec)
* contingent on SOW signature`,
          },
        ],
      },
      {
        from: 'priya',
        to: ['maya'],
        cc: ['devon', 'aisha', 'me'],
        at: '2h',
        body: `Looks right. Locking v3 — I'll present it at Thursday's all-hands.

Robin, can you turn the staffing column into a proper design staffing plan (including Alex's ramp-up) by Friday? Doesn't need to be pretty.`,
      },
    ],
  },
  {
    id: 't-harbor-feedback-r2',
    subject: 'Harbor patient portal — round 2 feedback',
    category: 'primary',
    labels: ['clients', 'work'],
    important: true,
    messages: [
      {
        from: 'rachel',
        to: ['me', 'maya'],
        cc: ['ben'],
        at: '8d@10:15',
        body: `Hi Robin, hi Maya,

Thank you for the round 2 designs. We walked the full team through them on Friday and the reaction was very positive — the new appointments flow in particular.

Our consolidated feedback is attached. The headlines:
- Appointment cancellation needs a clearer confirmation step (compliance flagged this)
- The secure messaging inbox should show which care team member will respond, not just the clinic
- Several patients on our advisory panel struggled with the "Visit summary" label; can we test alternatives?
- The medication list feels small on mobile

Ben has a couple of clinical notes to add separately.

Best regards,
Rachel Okoye
Director of Digital Experience, Harbor Health`,
        attachments: [
          {
            name: 'Harbor-R2-feedback.docx',
            size: 184_220,
            preview: `Harbor Health — Patient Portal Phase 2
Design Review: Round 2 Consolidated Feedback
Prepared by: Digital Experience team

1. Appointments
   1.1 Cancel flow: add explicit confirmation + 24h policy text (Compliance)
   1.2 Reschedule: surface next 3 available slots first
2. Secure messaging
   2.1 Show responding care-team member, not only the clinic
3. Visit summary
   3.1 Label tested poorly with advisory panel (4 of 9 confused)
4. Medications
   4.1 Minimum 16px body text on mobile`,
          },
        ],
      },
      {
        from: 'me',
        to: ['rachel'],
        cc: ['maya', 'ben'],
        at: '8d@14:30',
        body: `Thanks Rachel — this is really clear, and it's great to hear the appointments flow landed.

Two quick questions before we start revising:
1. For the cancellation confirmation, does compliance need specific policy language, or can we draft it and have them review?
2. On "Visit summary" — do you know which alternatives the advisory panel suggested? If not, we'll run a quick unmoderated test with 3–4 options.

We'll aim to have revisions to you early next week.

Robin`,
      },
      {
        from: 'ben',
        to: ['me'],
        cc: ['rachel', 'maya'],
        at: '7d@09:05',
        body: `Robin,

Two clinical notes:

- For messaging, please don't promise a reply time in hours. Our nurses triage by acuity, so we'd prefer "usually within 2 business days" plus a line that says urgent issues should call the clinic.
- Medication list: dose and frequency need to stay on one line wherever possible. Clinicians read it top to bottom during visits and wrapping has caused errors in the old portal.

On Rachel's question 1: compliance will want to review, but they're fine with you drafting.

Ben`,
      },
      {
        from: 'me',
        to: ['ben', 'rachel'],
        cc: ['maya'],
        at: '7d@11:40',
        body: `Thanks Ben, both make sense. We've updated messaging to "usually within 2 business days", with an urgent-care callout at the top of every thread.

Attached are early v4 screens for appointments and messaging so you can see the direction. The medication list is next; we're testing a condensed row that keeps dose + frequency on one line down to 320px wide.

Full set coming shortly.`,
        attachments: [
          { name: 'portal-appointments-v4.png', size: 1_318_442 },
          { name: 'portal-messages-v4.png', size: 1_102_907 },
        ],
      },
      {
        from: 'rachel',
        to: ['me'],
        cc: ['maya', 'ben'],
        at: '4d@16:20',
        body: `These look great. The team is happy with appointments and messaging as shown — consider those approved.

The only open item is the "Visit summary" label. Let's go with whatever wins your quick test; we trust your process.

Could we do a 45-minute walkthrough of the full v4 set next week?

Rachel`,
      },
      {
        from: 'maya',
        to: ['rachel'],
        cc: ['me', 'ben'],
        at: '4d@17:02',
        body: `Wonderful — thank you, Rachel. I'll send an invite for a 45-minute walkthrough on Wednesday afternoon; let me know if that doesn't work for anyone on your side.

Maya`,
      },
    ],
  },
  {
    id: 't-harbor-walkthrough-move',
    subject: 'Harbor v4 walkthrough — could we move to Thursday?',
    category: 'primary',
    labels: ['clients'],
    important: true,
    unread: true,
    messages: [
      {
        from: 'ben',
        to: ['maya', 'me'],
        cc: ['rachel'],
        at: '40m',
        body: `Hi Maya, Robin,

Apologies for the late change — I've been asked to cover clinic tomorrow afternoon. Could we move the v4 walkthrough to Thursday at 10? Rachel is available then.

If Thursday doesn't work, Friday morning is also fine.

Ben`,
      },
    ],
  },
  {
    id: 't-hiring-debrief',
    subject: 'Debrief: Alex Moreno — Senior Product Designer',
    category: 'primary',
    labels: ['work'],
    important: true,
    unread: true,
    messages: [
      {
        from: 'carmen',
        to: ['me', 'theo', 'devon'],
        at: '5d@17:10',
        body: `Hi all,

Thanks for making time for Alex's onsite today. Scorecards are compiled in the attached PDF — Theo and Devon, I've pulled yours from the form; Robin, yours is still marked draft.

Summary so far:
- Portfolio deep-dive: strong hire (Theo)
- Eng collaboration: hire (Devon)
- Whiteboard: hire (Lena)
- Hiring manager: pending

Can we do the debrief async here by tomorrow noon? Alex has another offer with a Tuesday deadline.

Carmen`,
        attachments: [
          {
            name: 'Alex-Moreno-scorecards.pdf',
            size: 412_336,
            preview: `Candidate: Alex Moreno
Role: Senior Product Designer (Req FB-114)
Interview loop — Onsite

Interviewer    | Session                     | Rating
Theo Marsh     | Portfolio deep-dive         | Strong hire
Devon Price    | Eng collaboration           | Hire
Lena Fischer   | Whiteboard: patient intake  | Hire
Robin Hale     | Hiring manager              | (draft)

Overall: 3 hire / 1 pending`,
          },
        ],
      },
      {
        from: 'theo',
        to: ['carmen'],
        cc: ['me', 'devon'],
        at: '5d@17:48',
        body: `Strong hire from me. Alex's case study on the pharmacy refill flow was the best I've seen this year — clear problem framing, real constraints, and they talked about what didn't work without being prompted.

Only concern: they've mostly worked in-house, so the pace of client work might be a shift.`,
      },
      {
        from: 'devon',
        to: ['carmen'],
        cc: ['me', 'theo'],
        at: '4d@09:20',
        body: `Hire. Asked good questions about how we hand off tokens and was comfortable reading a PR diff. Would pair well with Marcus on Atlas.`,
      },
      {
        from: 'me',
        to: ['carmen'],
        cc: ['theo', 'devon'],
        at: '4d@10:05',
        body: `Hire — and I'd go strong hire. Submitted my scorecard just now.

Theo's point about client pace is fair, but Alex ran design for three product lines at once in their last role, and their answer on pushing back on a stakeholder was exactly how I'd want someone to handle a room with Rachel's team at Harbor.

Carmen, let's move quickly given the other offer. I'm happy to call Alex this afternoon if it helps. Level: Senior, and the top of the band is justified.

Robin`,
      },
      {
        from: 'carmen',
        to: ['me'],
        cc: ['theo', 'devon'],
        at: '4d@15:30',
        body: `Perfect. Priya approved the top of the band. Offer is going out tonight — Robin, I'll text you once it's sent so you can call.`,
      },
      {
        from: 'carmen',
        to: ['me', 'theo', 'devon'],
        at: '1d@16:05',
        body: `Alex accepted! 🎉

Start date is the first Monday of November. I'll kick off onboarding and send the equipment request to Jonah.

Thank you all for turning this around so fast.

Carmen`,
      },
    ],
  },
  {
    id: 't-priya-1on1',
    subject: 'Before our 1:1 tomorrow',
    category: 'primary',
    labels: ['work'],
    important: true,
    unread: true,
    messages: [
      {
        from: 'priya',
        to: ['me'],
        at: '4h',
        body: `Hey Robin — can we use the first 15 minutes tomorrow on Q1 design headcount? With Alex joining and Tidewater possibly signing, I want to understand whether we need one more designer or a contractor for the discovery phase.

No prep needed beyond gut feel. Numbers can come later.

P`,
      },
    ],
  },
  {
    id: 't-atlas-tokens',
    subject: 'Atlas v2.0 — color ramp sign-off',
    category: 'primary',
    labels: ['work'],
    important: true,
    unread: true,
    messages: [
      {
        from: 'marcus',
        to: ['me', 'devon'],
        at: '1d@15:10',
        body: `Token migration PR is up (#482). 312 files touched, but most are mechanical renames.

The one thing that needs design eyes: the OKLCH ramps shift a few mid-tones noticeably, especially blue-500 and amber-400. Side-by-side comparison is in the PR description. Visual regression shows 41 diffs, all in those two ramps.`,
      },
      {
        from: 'devon',
        to: ['me'],
        cc: ['marcus'],
        at: '50m',
        body: `Robin — need your call on the ramp shifts before we cut v2.0. If blue-500 is a no-go we can pin it to the old value and ship the rest. Want to cut the release candidate tomorrow morning.`,
      },
    ],
  },
  {
    id: 't-design-crit',
    subject: 'Crit: fernbrook.co homepage hero — v2 explorations',
    category: 'primary',
    labels: ['work'],
    unread: true,
    messages: [
      {
        from: 'lena',
        to: ['designTeam'],
        at: '1d@10:20',
        body: `Hi team,

Three directions for the homepage hero ahead of Thursday's crit, attached:

1. homepage-hero-v2 — the big type + project mosaic we talked about
2. hero-alt-dark — same structure, dark background, single featured case study (Harbor)
3. hero-mobile-375 — how v2 collapses on small screens

Things I'd love feedback on:
- Is the mosaic too busy? It's 9 tiles right now
- Headline: "We design the software people depend on" vs. "Product design for the moments that matter"
- Does the dark version feel too far from Atlas?

Be brutal 🙂

Lena`,
        attachments: [
          { name: 'homepage-hero-v2.png', size: 1_204_551 },
          { name: 'hero-alt-dark.png', size: 986_320 },
          { name: 'hero-mobile-375.png', size: 642_118 },
        ],
      },
      {
        from: 'theo',
        to: ['lena'],
        cc: ['designTeam'],
        at: '1d@11:05',
        body: `Direction 1 for me, but the mosaic needs to drop to 6 tiles max. Right now my eye doesn't know where to land.

Headline: the first one. The second sounds like an insurance ad.`,
      },
      {
        from: 'me',
        to: ['lena'],
        cc: ['designTeam'],
        at: '1d@13:40',
        body: `Really nice work, Lena. Agree with Theo on direction 1 and the headline.

A few specifics:
- Cut the mosaic to 6 and make one tile (Harbor) double size — it gives the eye a place to start
- The headline wraps awkwardly at 1280; try tightening the tracking or dropping to 72px
- Dark version: love it as a case-study page treatment, not for the homepage
- Mobile: the CTA falls below the fold on a 375 screen — let's pull it above the mosaic

Let's look at v3 on Thursday.`,
      },
      {
        from: 'kai',
        to: ['lena'],
        cc: ['me', 'theo', 'designTeam'],
        at: '5h',
        body: `Tried a quick version of Robin's 6-tile idea with Harbor doubled and a tighter crop on the tiles — attached in case it's useful for v3. Totally fine to throw it away!`,
        attachments: [{ name: 'hero-tight-crop.png', size: 1_088_904 }],
      },
    ],
  },
  {
    id: 't-tidewater-questions',
    subject: 'Tidewater proposal — a few questions',
    category: 'primary',
    labels: ['clients'],
    starred: true,
    important: true,
    unread: true,
    messages: [
      {
        from: 'jess',
        to: ['me'],
        cc: ['priya'],
        at: '3h',
        body: `Hi Robin,

Thanks again for the proposal and for the time your team put into it. Our leadership team reviewed it on Friday and we're keen to move forward.

A few questions before we sign:
1. Could the discovery phase start in early November instead of mid-November? Our peak-season planning begins in December.
2. The proposal mentions "up to 12 customer interviews". Would you be open to including 4 in-store sessions at our Astoria flagship?
3. Is the $86,000 discovery fee fixed, or does it flex if scope changes?
4. Who would be our day-to-day contact on your team?

We'd love to get this signed before the end of October.

All the best,
Jess Calloway
Head of Ecommerce, Tidewater Outfitters`,
      },
    ],
  },
  {
    id: 't-tidewater-intro',
    subject: 'Intro: Fernbrook <> Tidewater Outfitters',
    category: 'primary',
    labels: ['clients'],
    location: 'archive',
    messages: [
      {
        from: 'priya',
        to: ['jess', 'me'],
        at: '33d@08:45',
        body: `Jess, meet Robin Hale — our Design Lead, and the person I mentioned who led ecommerce design for an outdoor brand before joining Fernbrook. Robin, Jess runs ecommerce at Tidewater Outfitters and is planning a redesign of their online store and gear-rental booking next year.

I'll let you two take it from here.

Priya`,
      },
      {
        from: 'jess',
        to: ['me'],
        cc: ['priya'],
        at: '33d@12:20',
        body: `Thanks Priya! Robin, lovely to e-meet you.

We're a 40-store outdoor retailer based in Astoria, and our online rental booking is… not great. I've attached our current brand assets so you can get a feel for who we are.

Would you have 30 minutes next week?

Jess`,
        attachments: [{ name: 'Tidewater-brand-assets.zip', size: 48_213_004 }],
      },
      {
        from: 'me',
        to: ['jess'],
        at: '32d@09:10',
        body: `Hi Jess — thanks, Priya (moving you to bcc).

Great to meet you. I'd love to chat — how about Tuesday at 10 or Wednesday at 2? I'll send an invite for whichever works. Fair warning: I've already spent too long clicking through your rental flow, so I'll come with questions.

Robin`,
      },
      {
        from: 'jess',
        to: ['me'],
        at: '32d@10:02',
        body: `Wednesday at 2 is perfect. Looking forward to it!`,
      },
    ],
  },
  {
    id: 't-offsite',
    subject: 'Fall offsite — Silver Fir Lodge',
    category: 'primary',
    labels: ['work'],
    starred: true,
    messages: [
      {
        from: 'jonah',
        to: ['priya', 'devon', 'maya', 'me'],
        at: '21d@10:00',
        body: `Hi all,

Proposing we do the fall offsite at Silver Fir Lodge again — two days at the end of October, whole team. They're holding the main lodge + 14 rooms for us until Friday.

Rough cost is $18.6k all-in including food and the bus, which is within what Felix set aside.

Any objections before I sign? Robin — you ran the workshop portion last year; would you do it again?

Jonah`,
      },
      {
        from: 'me',
        to: ['jonah'],
        cc: ['priya', 'devon', 'maya'],
        at: '21d@11:32',
        body: `No objections — Silver Fir was great last year. And yes, I'll run the workshop block again.

Two requests: a room with actual walls for the workshop (last year's open loft was loud), and can we skip the 7am group hike? Half the team was a zombie by lunch.`,
      },
      {
        from: 'priya',
        to: ['jonah'],
        cc: ['devon', 'maya', 'me'],
        at: '20d@09:15',
        body: `Approved. Keep the hike, make it optional and at 8 🙂

Jonah, please loop in the lodge's events person so Robin can sort out the workshop room directly.`,
      },
      {
        from: 'jonah',
        to: ['priya', 'devon', 'maya', 'me'],
        cc: ['dana'],
        at: '14d@14:05',
        body: `Signed and confirmed. Draft agenda attached — Robin, the Day 1 afternoon block is yours.

Looping in Dana Whitlock, events coordinator at Silver Fir, for room setup questions.

Jonah`,
        attachments: [
          {
            name: 'offsite-agenda.pdf',
            size: 318_775,
            preview: `Fernbrook Fall Offsite — Silver Fir Lodge
DRAFT agenda v1

Day 1
  09:00  Bus departs Fernbrook office
  11:00  Arrive, coffee, room keys
  11:30  Priya: Q3 wrap + Q4 roadmap
  13:00  Lunch (Timber Hall)
  14:00  Workshop: "Designing with our clients" (Robin) — Cedar Room
  17:30  Free time / sauna
  19:00  Dinner + team awards

Day 2
  08:00  Optional hike (Lost Creek loop)
  10:00  Team retros
  13:00  Lunch · bus departs 14:30`,
          },
        ],
      },
      {
        from: 'dana',
        to: ['me'],
        cc: ['jonah'],
        at: '13d@09:40',
        body: `Hi Robin,

Nice to meet you! For your workshop I've reserved the Cedar Room — it seats 30, has two large displays and four rolling whiteboards. It's a separate building from the main lodge, so it's nice and quiet.

Do you need anything else? We can provide sticky notes, markers and butcher paper, or you're welcome to bring your own.

Warmly,
Dana Whitlock
Events Coordinator, Silver Fir Lodge`,
      },
      {
        from: 'me',
        to: ['dana'],
        cc: ['jonah'],
        at: '13d@11:15',
        body: `Hi Dana — the Cedar Room sounds perfect, thank you.

Butcher paper and markers would be great. Could we also get a small table at the back for a coffee station during the afternoon? We'll bring our own sticky notes (we're weirdly particular about them).

Robin`,
      },
      {
        from: 'dana',
        to: ['me'],
        cc: ['jonah'],
        at: '12d@10:05',
        body: `Done and done — coffee station at the back from 2 to 5, butcher paper and markers on every table. See you at the end of October!

Dana`,
      },
    ],
  },
  {
    id: 't-incident-postmortem',
    subject: 'Postmortem: Harbor portal login outage (INC-2291)',
    category: 'primary',
    labels: ['work', 'clients'],
    important: true,
    location: 'archive',
    messages: [
      {
        from: 'ines',
        to: ['devon', 'maya', 'me'],
        cc: ['priya'],
        at: '11d@16:30',
        body: `Postmortem for Wednesday's login outage is attached. Blameless format, draft for review.

TL;DR
- 47 minutes of failed logins for all Harbor patient portal users
- Root cause: Harbor's identity provider rotated its SAML signing certificate, and our metadata refresh job had been failing silently for 9 days
- Detection was via Harbor's support line, not our alerts. That's the part I most want to fix.

Please add comments by Tuesday. Review meeting is Wednesday at 11.

Ines`,
        attachments: [
          {
            name: 'INC-2291-postmortem.pdf',
            size: 264_019,
            preview: `INC-2291 — Harbor Patient Portal: Login Failures
Severity: SEV-2 · Duration: 47 min · Status: Resolved
Author: Ines Duarte · Format: Blameless

Timeline (PT)
  10:02  IdP rotates SAML signing certificate
  10:04  First failed patient logins
  10:31  Harbor support escalates to Fernbrook
  10:38  Ines paged; metadata refresh job found failing
  10:49  Metadata refreshed manually; logins recover

Contributing factors
  - Metadata refresh job failing silently for 9 days
  - No alert on SSO error rate
  - Error page said "Something went wrong" with no next step`,
          },
        ],
      },
      {
        from: 'devon',
        to: ['ines'],
        cc: ['maya', 'me', 'priya'],
        at: '8d@09:10',
        body: `Great write-up. Two additions for action items:
- Alert on SAML assertion failures > 2% over 5 min
- Make the metadata job fail loudly (page on 2 consecutive failures)

I'll own the first one.`,
      },
      {
        from: 'me',
        to: ['ines'],
        cc: ['devon', 'maya', 'priya'],
        at: '8d@10:25',
        body: `From the design side: the error page was a real problem. Patients saw "Something went wrong" with no next step, and Harbor's support line took 300+ calls in under an hour.

I'd like to add an action item for a proper auth-failure state: a plain-language explanation, a link to a status page, and the clinic's phone number for anyone who needs to reach their care team. Kai can pick this up this sprint — it's small.`,
      },
      {
        from: 'maya',
        to: ['ines'],
        cc: ['devon', 'me', 'priya'],
        at: '8d@11:00',
        body: `+1 Robin. I'll let Rachel know we're doing this proactively — she'll appreciate it after the week they had.`,
      },
      {
        from: 'ines',
        to: ['devon', 'maya', 'me'],
        cc: ['priya'],
        at: '6d@15:45',
        body: `Thanks for a good review this morning. Final version is in Driftbox. Action items:

- [Devon] SAML failure-rate alert — due next Friday
- [Ines] Metadata job pages on 2 consecutive failures — done
- [Kai / Robin] Auth-failure error state with support path — this sprint
- [Maya] Share summary with Harbor — done

Closing the incident.`,
      },
    ],
  },
  {
    id: 't-vendor-contract',
    subject: 'Fieldnote Research — MSA & Q4 panel pricing',
    category: 'primary',
    labels: ['work', 'finance'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'hannah',
        to: ['me'],
        at: '19d@11:00',
        body: `Hi Robin,

Great speaking yesterday. As promised, attached are our Master Services Agreement and Q4 pricing for participant recruiting.

For the Harbor and Juniper studies you described (roughly 60 sessions between now and December, a mix of patients and small-business banking customers), our standard rates would apply:
- Recruiting & screening: $140 per completed session
- Participant incentive: $100 per session (pass-through)
- Rush fee (under 5 business days): +$35

Happy to walk your ops team through the MSA.

Best,
Hannah Ortiz
Partnerships, Fieldnote Research`,
        attachments: [
          {
            name: 'Fieldnote-MSA-2026.docx',
            size: 96_512,
            preview: `MASTER SERVICES AGREEMENT
Fieldnote Research LLC ("Fieldnote") and Fernbrook Studio, Inc. ("Client")

1. Services. Fieldnote will recruit, screen and schedule research participants as set out in each Statement of Work.
2. Fees. Fees are set out in each SOW. Incentives are passed through at cost.
3. Payment. Invoices are due net 30 from date of issue.
4. Confidentiality. Each party will protect the other's Confidential Information.
5. Participant data. Client receives de-identified profiles only.
6. Term. 12 months, renewing automatically unless terminated with 30 days' notice.`,
          },
          {
            name: 'Fieldnote-Q4-pricing.pdf',
            size: 142_880,
            preview: `Fieldnote Research — Q4 Rate Card

Service                          | Unit        | Rate
Recruit & screen (general pop.)  | per session | $140
Recruit & screen (B2B / SMB)     | per session | $165
Participant incentive            | per session | pass-through
Rush (< 5 business days)         | per session | +$35
No-show replacement              | per session | included

Volume tiers available for 50+ sessions per quarter.`,
          },
        ],
      },
      {
        from: 'me',
        to: ['hannah'],
        cc: ['felix'],
        at: '18d@10:30',
        body: `Thanks Hannah — this is helpful. Looping in Felix from our finance team.

Since we're committing to ~60 sessions this quarter, could you do a volume rate? We were thinking $120 per session for recruiting, with the small-business banking participants at the same rate rather than the B2B tier. We'd also like the rush fee waived for up to 10 sessions, since clinical schedules shift a lot.

The MSA looks fine overall; Felix will comment on payment terms.

Robin`,
      },
      {
        from: 'felix',
        to: ['hannah'],
        cc: ['me'],
        at: '18d@13:10',
        body: `Hi Hannah, Felix here. Only one change on our side: we'd ask for net 45 on invoices, which is our standard for vendors. Everything else in section 3 is fine.

Thanks,
Felix Novak
Finance, Fernbrook`,
      },
      {
        from: 'hannah',
        to: ['me', 'felix'],
        at: '13d@09:45',
        body: `Hi Robin and Felix,

Thanks for your patience — I ran this by our ops lead. Here's where we landed:
- $125 per session for all 60, including the small-business participants
- Rush fee waived for up to 10 sessions
- Net 45 is fine

Redlined MSA attached with the payment terms and a volume schedule. If this works, I'll send the SOW for the first Harbor batch.

Hannah`,
        attachments: [
          {
            name: 'Fieldnote-MSA-2026-v2-redline.docx',
            size: 101_337,
            preview: `MASTER SERVICES AGREEMENT — v2 (redline)

3. Payment. Invoices are due net [-30-] [+45+] from date of issue.

SCHEDULE A — Volume pricing (Q4)
  Recruit & screen, all segments: [+$125 per completed session+]
  Committed volume: [+60 sessions+]
  Rush fee: [+waived for up to 10 sessions+]

All other terms unchanged.`,
          },
        ],
      },
      {
        from: 'me',
        to: ['hannah'],
        cc: ['felix'],
        at: '12d@14:00',
        body: `This works for us — thank you, Hannah. Felix will sign on our side today.

Please send the Harbor SOW whenever it's ready; the first batch is 18 patient sessions.`,
      },
      {
        from: 'hannah',
        to: ['me', 'felix'],
        at: '11d@10:20',
        body: `Wonderful! Countersigned MSA attached for your records. The Harbor SOW is coming Monday.

Looking forward to working together.

Hannah`,
        attachments: [
          {
            name: 'Fieldnote-MSA-2026-countersigned.pdf',
            size: 356_104,
            preview: `MASTER SERVICES AGREEMENT — EXECUTED
Fieldnote Research LLC & Fernbrook Studio, Inc.

Signed for Fieldnote: Hannah Ortiz, Partnerships
Signed for Client: Felix Novak, Finance Manager

Effective: upon countersignature
Schedule A: $125 per session, 60 sessions, rush fee waived (10)
Payment terms: net 45`,
          },
        ],
      },
    ],
  },
  {
    id: 't-juniper-denver',
    subject: 'Denver workshop — logistics',
    category: 'primary',
    labels: ['clients', 'travel'],
    important: true,
    messages: [
      {
        from: 'grace',
        to: ['me', 'aisha'],
        at: '4d@11:30',
        body: `Hi Robin, hi Aisha,

We're all set for your visit — Wednesday and Thursday, the week after next. Logistics:
- Location: Juniper HQ, Innovation Lab (14th floor)
- Wednesday 1–5pm: synthesis workshop with CX, fraud and branch operations (12 people)
- Thursday 9–12: prototype review with our executive sponsor
- Lunch is provided both days

Agenda attached. Could you confirm AV needs by Monday? The lab has one large display and a document camera.

Grace Whitfield
VP, Customer Experience — Juniper Bank`,
        attachments: [
          {
            name: 'Denver-workshop-agenda.pdf',
            size: 227_610,
            preview: `Juniper Bank × Fernbrook — Onboarding Revamp
On-site Workshop · Juniper HQ, Innovation Lab (14th floor)

WEDNESDAY
 13:00  Welcome & goals (Grace Whitfield)
 13:20  Research highlights (Robin Hale, Aisha Karim)
 14:15  Synthesis: drop-off moments, in groups
 15:30  Break
 15:45  How might we… (fraud, branch ops, CX)
 16:45  Wrap-up

THURSDAY
 09:00  Prototype walkthrough
 10:30  Executive sponsor review
 11:30  Pilot criteria & next steps`,
          },
        ],
      },
      {
        from: 'me',
        to: ['grace'],
        cc: ['aisha'],
        at: '4d@13:10',
        body: `Thanks Grace — this looks great.

For AV: we'll need an HDMI connection for a laptop and, if possible, a second display or projector for the synthesis wall. We'll bring printed session highlights and plenty of sticky notes.

My flight lands Wednesday late morning, so I'll be at your office by 12:30. Aisha is flying in Tuesday night.

Robin`,
      },
      {
        from: 'aisha',
        to: ['grace'],
        cc: ['me'],
        at: '4d@13:32',
        body: `Confirming — I land Tuesday around 9pm. Grace, is there anything your sponsor wants to see specifically on Thursday? Happy to tailor the prototype walkthrough.`,
      },
      {
        from: 'grace',
        to: ['aisha', 'me'],
        at: '1d@09:15',
        body: `Second display is sorted.

Our sponsor, Daniel Kwan (COO), mostly wants to see how the new flow handles business verification — that's where he hears the most complaints from branches. See you both next week!

Grace`,
      },
    ],
  },
  {
    id: 't-juniper-findings',
    subject: 'Juniper usability sessions — top findings',
    category: 'primary',
    labels: ['clients', 'work'],
    messages: [
      {
        from: 'aisha',
        to: ['me', 'lena'],
        at: '11d@11:10',
        body: `Hi both,

First pass at the top findings from the 14 small-business sessions is attached. The big one: 9 of 14 participants stalled at the business verification step, and 5 gave up entirely when asked for their EIN confirmation letter.

Would love your reactions before we build the Denver readout.

Aisha`,
        attachments: [
          {
            name: 'Juniper-usability-findings.pdf',
            size: 1_874_220,
            preview: `Juniper SMB Onboarding — Usability Findings (draft)
Sessions: 14 moderated, remote · recruited from Juniper's customer panel

Top findings
1. Business verification is the main drop-off (9/14 stalled, 5/14 abandoned)
2. Applicants don't know which documents they'll need until mid-flow
3. "Beneficial owner" language confuses sole proprietors (8/14)
4. Save-and-resume is hard to find; 6/14 thought progress was lost
5. Branches are the fallback — 7/14 said they'd "just go in"

Opportunities: document checklist upfront, plain-language ownership step, visible save state`,
          },
        ],
      },
      {
        from: 'lena',
        to: ['aisha'],
        cc: ['me'],
        at: '11d@13:25',
        body: `This matches what I saw live. The EIN moment was painful to watch — one participant literally went to find a shoebox.

Proposal for Denver: lead with a document checklist concept, before step 1. I can mock it up by Wednesday.`,
      },
      {
        from: 'me',
        to: ['aisha', 'lena'],
        at: '11d@14:02',
        body: `Yes to the checklist concept. And let's show a clip of the shoebox moment in the readout — nothing convinces an exec like watching a real customer struggle.

Aisha, can we get clips cleared for internal Juniper use?`,
      },
      {
        from: 'aisha',
        to: ['me', 'lena'],
        at: '8d@10:05',
        body: `Cleared! Grace's team signed off on clips for the workshop. I'll cut 3 highlights, 90 seconds max each.`,
      },
    ],
  },
  {
    id: 't-juniper-kickoff',
    subject: 'Juniper onboarding revamp — kickoff deck',
    category: 'primary',
    labels: ['clients', 'work'],
    location: 'archive',
    messages: [
      {
        from: 'aisha',
        to: ['grace', 'omar'],
        cc: ['me', 'priya'],
        at: '40d@09:30',
        body: `Hi Grace, hi Omar,

Ahead of next Tuesday's kickoff, attached is the deck we'll walk through. The main things we'd like to align on:
- Goals and success metrics for the new small-business onboarding
- Who from your team should observe research sessions
- The pilot timeline and go/no-go criteria

Robin will lead the research and design portion. Looking forward to it!

Aisha Karim
Product Manager, Fernbrook`,
        attachments: [
          {
            name: 'kickoff-deck.pptx',
            size: 8_904_312,
            preview: `Juniper Bank × Fernbrook
Small Business Onboarding Revamp — Kickoff

1. Why we're here: 38% of SMB applicants drop off before identity verification
2. Goals: halve drop-off, time-to-open under 10 minutes
3. Approach: research → concepts → prototypes → pilot
4. Team: Aisha Karim (PM), Robin Hale (Design Lead), Lena Fischer (Designer)
5. Timeline: 14 weeks, pilot go/no-go mid-November
6. Open questions`,
          },
        ],
      },
      {
        from: 'grace',
        to: ['aisha'],
        cc: ['omar', 'me', 'priya'],
        at: '40d@14:10',
        body: `Thank you, Aisha. The deck is excellent. Two thoughts:

- Please add our fraud team's constraints to the "open questions" slide. Identity verification is where most of the drop-off happens, but it's also where we have the least flexibility.
- I'd like Omar to attend research readouts — procurement will ultimately approve any vendor changes that come out of this work.

See you Tuesday.

Grace`,
      },
      {
        from: 'me',
        to: ['grace'],
        cc: ['aisha', 'omar', 'priya'],
        at: '39d@10:05',
        body: `Thanks Grace — great points. We'll add a slide on fraud and KYC constraints, and I'd love 30 minutes with someone from the fraud team before the first sessions so we design within the real boundaries, not imagined ones.

Omar, I'll make sure you're on every readout invite.

Robin`,
      },
      {
        from: 'omar',
        to: ['me'],
        cc: ['grace', 'aisha'],
        at: '39d@11:40',
        body: `Appreciated, Robin. I'll connect you with Wen Li on fraud operations — she's the right person and she'll be glad someone asked.

Omar Haddad
Procurement, Juniper Bank`,
      },
    ],
  },
  {
    id: 't-harbor-sow',
    subject: 'Harbor Health — Phase 2 SOW for signature',
    category: 'primary',
    labels: ['clients', 'finance'],
    starred: true,
    important: true,
    location: 'archive',
    messages: [
      {
        from: 'rachel',
        to: ['priya', 'me'],
        cc: ['maya'],
        at: '47d@11:00',
        body: `Hi Priya, Robin,

Attached is the final Phase 2 SOW with the edits from our legal team (sections 4.2 and 7). Please countersign when ready.

We're thrilled to keep working together.

Rachel`,
        attachments: [
          {
            name: 'Harbor-Health-SOW-2026.docx',
            size: 211_468,
            preview: `STATEMENT OF WORK #2 — Patient Portal Phase 2
Harbor Health & Fernbrook Studio, Inc.

1. Scope
   1.1 Appointments: booking, rescheduling, cancellation
   1.2 Secure messaging with care teams
   1.3 Accessibility audit and remediation to WCAG 2.2 AA
2. Timeline: 20 weeks from kickoff
3. Team: Design Lead (Robin Hale), Senior PM (Maya Chen), 2 designers, 3 engineers
4. Fees: $412,000 fixed fee, invoiced monthly
   4.2 Change requests billed at $185/hour
7. Data protection: Business Associate Agreement applies`,
          },
        ],
      },
      {
        from: 'priya',
        to: ['rachel'],
        cc: ['me', 'maya'],
        at: '46d@09:20',
        body: `Signed and returned — thank you, Rachel! Robin and Maya, it's official 🎉`,
      },
      {
        from: 'me',
        to: ['rachel'],
        cc: ['priya', 'maya'],
        at: '46d@09:45',
        body: `Wonderful news. Rachel, we'll send the Phase 2 kickoff invite for next week — looking forward to it.`,
      },
    ],
  },
  {
    id: 't-felix-budget',
    subject: 'FY27 design budget — draft forecast',
    category: 'primary',
    labels: ['work', 'finance'],
    important: true,
    messages: [
      {
        from: 'felix',
        to: ['me'],
        at: '13d@10:40',
        body: `Hi Robin,

Attached is the draft FY27 forecast for the design team. I've assumed the senior hire starts in November and a 3% merit increase across the board.

Two lines I'd like you to check:
- Tools: I have Canvasly at 22 seats. We pay for 22, but I think only 17 are active.
- Research: I've put $48k based on the Fieldnote agreement. Does that cover Tidewater if it happens?

Comments by the end of next week would be great.

Felix`,
        attachments: [
          {
            name: 'budget-forecast.xlsx',
            size: 88_214,
            preview: `FY27 Forecast — Design (DRAFT)

Line item              | Q1      | Q2      | Q3      | Q4      | Total
Salaries & benefits    | 214,500 | 214,500 | 221,000 | 221,000 |   871,000
Contractors            |  18,000 |  12,000 |  12,000 |  12,000 |    54,000
Tools (Canvasly x22)   |   5,940 |   5,940 |   5,940 |   5,940 |    23,760
Research & incentives  |  12,000 |  12,000 |  12,000 |  12,000 |    48,000
Training & conferences |   4,500 |   3,000 |   6,500 |   2,000 |    16,000
Total                  | 254,940 | 247,440 | 257,440 | 252,940 | 1,012,760`,
          },
        ],
      },
      {
        from: 'me',
        to: ['felix'],
        at: '12d@16:20',
        body: `Thanks Felix. Comments:
- Canvasly: drop to 18 seats — 17 active plus Alex. I'll handle the true-up with them.
- Research: $48k covers Harbor and Juniper. If Tidewater signs, their discovery fee includes ~$9k of research costs we bill through, so no change needed here.
- Training: can we move $2k from Q3 to Q1? Tessellate is in the spring and I'd like to send Kai and Lena.

Otherwise it looks right to me.`,
      },
      {
        from: 'felix',
        to: ['me'],
        at: '12d@17:05',
        body: `All makes sense. Updated — Canvasly at 18 seats and $2k moved into Q1 training. New total is $1,006,820; I'll send the final version with the full company forecast.`,
      },
    ],
  },
  {
    id: 't-atlas-docs-audit',
    subject: 'Atlas docs — content audit results',
    category: 'primary',
    labels: ['work'],
    messages: [
      {
        from: 'theo',
        to: ['me'],
        cc: ['marcus'],
        at: '22d@15:30',
        body: `Finished the content audit for the Atlas docs site. Sheet attached.

Headline: 142 pages — 61 are outdated, 23 are duplicates, and 11 components have no usage guidance at all. The good news is the top 20 pages by traffic are in decent shape.

Proposal: archive the 23 duplicates now and handle the rest as part of the v2.0 docs relaunch.

Theo`,
        attachments: [
          {
            name: 'atlas-docs-audit.xlsx',
            size: 64_775,
            preview: `Atlas Docs — Content Audit

Status            | Pages | % of total
Current           |   47  | 33%
Outdated          |   61  | 43%
Duplicate         |   23  | 16%
Missing guidance  |   11  |  8%
Total             |  142  | 100%

Most-visited outdated pages: Button, Modal, DatePicker, Toast, Table, Tabs`,
          },
        ],
      },
      {
        from: 'me',
        to: ['theo'],
        cc: ['marcus'],
        at: '22d@16:45',
        body: `This is great, Theo. Agree — archive the duplicates this week.

I'll take DatePicker myself. I've been meaning to rewrite that guidance anyway, and the thread on the Pinecone forum about accessible date pickers had some good ideas.`,
      },
      {
        from: 'marcus',
        to: ['theo', 'me'],
        at: '21d@10:00',
        body: `Archived the 23 duplicates and set up redirects 👍`,
      },
    ],
  },
  {
    id: 't-kai-empty-states',
    subject: 'Harbor empty states — would love your eyes',
    category: 'primary',
    labels: ['work'],
    location: 'archive',
    messages: [
      {
        from: 'kai',
        to: ['me'],
        at: '27d@14:15',
        body: `Hi Robin,

I took a pass at empty states for the Harbor portal (no appointments, no messages, no test results yet). Attached. I'm not sure the illustrations fit the rest of the portal — they feel a bit playful for healthcare?

No rush, whenever you have 10 minutes.

Kai`,
        attachments: [{ name: 'harbor-empty-states.png', size: 1_540_332 }],
      },
      {
        from: 'me',
        to: ['kai'],
        at: '26d@09:30',
        body: `Kai, these are a great start — and your instinct is right.

- Illustrations: keep them, but go more muted. Think Atlas neutral-300 line work, no fills. Playful is okay; cheerful about test results is not.
- Copy: "No test results yet" is good. Add what happens next: "Results usually appear 2–3 days after your visit."
- Every empty state should have exactly one action. The messages one has two.
- Check contrast on the secondary text — it's under 4.5:1.

Want to pair on it tomorrow at 2? I'll bring coffee.`,
      },
      {
        from: 'kai',
        to: ['me'],
        at: '26d@09:44',
        body: `Yes please! Thank you, this is really helpful. See you at 2.`,
      },
    ],
  },
  {
    id: 't-maya-sprint-demo',
    subject: 'Sprint 42 demo — anything from design?',
    category: 'primary',
    labels: ['work'],
    snoozeHours: 5,
    messages: [
      {
        from: 'maya',
        to: ['me'],
        at: '1d@09:30',
        body: `Hi Robin — sprint 42 demo is Friday. Anything from design you'd like to show? Kai's auth-failure error state would be a nice one given the incident, and Rachel is joining this time.`,
      },
    ],
  },
  {
    id: 't-review-cycle',
    subject: 'Fall review cycle — manager timeline',
    category: 'primary',
    labels: ['work'],
    important: true,
    snoozeHours: 30,
    messages: [
      {
        from: 'jonah',
        to: ['me', 'devon', 'maya', 'aisha'],
        at: '5d@14:00',
        body: `Hi managers,

The fall review cycle kicks off the week after the offsite. Timeline:
- Week 1: self-reviews open
- Week 2: peer feedback (3–5 peers per person)
- Week 3: manager reviews due
- Week 4: calibration with Priya, then conversations

Robin, you'll have 3 reviews (Theo, Lena, Kai). Alex will be too new — just a 30-day check-in.

The template and guide are in Driftbox → People → Reviews.

Jonah`,
      },
    ],
  },
  {
    id: 't-open-enrollment',
    subject: 'Reminder: benefits open enrollment closes Friday',
    category: 'primary',
    labels: ['work'],
    messages: [
      {
        from: 'jonah',
        to: ['everyone'],
        at: '6d@09:00',
        body: `Hi all,

Friendly reminder that open enrollment for next year's benefits closes this Friday at 5pm.

What's changing:
- Dental now covers two cleanings plus one deep cleaning per year
- The FSA limit went up
- We've added 12 weeks of paid caregiver leave (details in the handbook)

If you don't do anything, your current elections roll over — except the FSA, which you need to re-elect every year.

Enroll in Paystream → Benefits. Questions to me or Carmen.

Jonah`,
      },
    ],
  },
  {
    id: 't-recruiter',
    subject: 'Principal Product Designer at Lumen Labs',
    category: 'primary',
    location: 'archive',
    messages: [
      {
        from: 'paige',
        to: ['me'],
        at: '15d@10:30',
        body: `Hi Robin,

I lead design recruiting at Lumen Labs — we build clinical documentation tools for hospitals, and your work on patient-facing products caught my eye (the Harbor portal case study on your site is excellent).

We're hiring a Principal Product Designer to lead our clinician experience. Fully remote, with a competitive package including equity.

Would you be open to a 20-minute chat this week or next? Even if the timing isn't right, I'd love to connect.

Best,
Paige Donnelly
Design Recruiting, Lumen Labs`,
      },
      {
        from: 'me',
        to: ['paige'],
        at: '14d@17:40',
        body: `Hi Paige — thank you for reaching out, and for the kind words about the Harbor work.

I'm happy at Fernbrook and not looking right now, but I'll keep Lumen Labs in mind. I do know a couple of strong senior designers with healthcare experience — happy to pass the role along.

Best,
Robin`,
      },
      {
        from: 'paige',
        to: ['me'],
        at: '14d@18:02',
        body: `Totally understand, and thank you! Yes, please do — here's the listing: https://lumenlabs.io/careers/principal-designer`,
      },
    ],
  },
  {
    id: 't-marcus-pto',
    subject: 'PTO the week after the offsite',
    category: 'primary',
    labels: ['work'],
    location: 'archive',
    messages: [
      {
        from: 'marcus',
        to: ['me', 'devon'],
        at: '8d@15:40',
        body: `Heads up — I'm taking the week after the offsite off to visit family in Atlanta. The Atlas v2.0 release candidate will be cut before then, and I'll write up the release checklist so Devon can ship if anything slips.

Already in Paystream.`,
      },
      {
        from: 'me',
        to: ['marcus'],
        cc: ['devon'],
        at: '8d@16:02',
        body: `Enjoy it! Thanks for the checklist — that's exactly right.`,
      },
    ],
  },
  {
    id: 't-allhands-slides',
    subject: 'All-hands Thursday — Q3 wrap slides',
    category: 'primary',
    labels: ['work'],
    location: 'archive',
    messages: [
      {
        from: 'priya',
        to: ['me', 'devon', 'maya', 'aisha', 'jonah'],
        at: '34d@09:05',
        body: `Hi leads,

For Thursday's all-hands, I'd love one slide from each of you on Q3: one win, one miss, one thing you learned. Please drop them in the shared deck by tomorrow at 10.

Priya`,
      },
      {
        from: 'me',
        to: ['priya'],
        at: '34d@16:40',
        body: `Done — design slide is in. Spoiler: the win is Harbor round 1, the miss is the Atlas docs, and the lesson is "stop letting docs be everyone's side project."`,
      },
    ],
  },
  {
    id: 't-year-end-review',
    subject: 'Your 2025 year-end review',
    category: 'primary',
    labels: ['work'],
    starred: true,
    location: 'archive',
    messages: [
      {
        from: 'priya',
        to: ['me'],
        at: '285d@16:00',
        body: `Robin,

Your written review is attached ahead of our conversation on Monday. Short version: this was a standout year. Harbor Phase 1 shipped on time, Rachel's team now asks for you by name, and the design team is noticeably more confident since you started running crits.

The growth area we'll talk about is delegation — you're still the bottleneck on final reviews, and that won't scale as the team grows.

Looking forward to talking.

Priya`,
        attachments: [
          {
            name: 'Robin-Hale-2025-review.pdf',
            size: 198_553,
            preview: `Fernbrook — Annual Review 2025
Employee: Robin Hale · Role: Design Lead · Manager: Priya Raman

Overall rating: Exceeds expectations

Highlights
  - Led Harbor patient portal Phase 1 to an on-time launch
  - Introduced weekly crit; team engagement score +18 pts
  - Grew Atlas adoption to 4 client projects

Growth areas
  - Delegate final design approvals to senior designers
  - Build a hiring pipeline ahead of demand

Compensation: 6% merit increase, effective January`,
          },
        ],
      },
      {
        from: 'me',
        to: ['priya'],
        at: '285d@18:30',
        body: `Thank you, Priya — this means a lot.

Noted on delegation. I'll come on Monday with a plan for Theo to own final reviews on Harbor.`,
      },
    ],
  },
  {
    id: 't-holiday-party',
    subject: 'Holiday party — RSVP by Friday',
    category: 'primary',
    labels: ['work'],
    location: 'archive',
    messages: [
      {
        from: 'jonah',
        to: ['everyone'],
        at: '292d@10:00',
        body: `Hi everyone,

Our holiday party is on the last Friday before the break, at Burnside Hall from 6pm. Partners and plus-ones welcome!

- Dinner and drinks provided
- White elephant: $25 limit, please wrap it
- There will be karaoke. This is not optional for leadership.

RSVP by Friday: https://fernbrook.co/party-rsvp

Jonah`,
      },
      {
        from: 'me',
        to: ['jonah'],
        at: '292d@10:30',
        body: `Two of us (me + Sam). Sam is already practicing for karaoke, which should be read as a threat.`,
      },
    ],
  },
  {
    id: 't-tessellate-talk',
    subject: 'Talk proposal: Designing for trust in patient-facing software',
    category: 'primary',
    labels: ['work'],
    starred: true,
    location: 'archive',
    messages: [
      {
        from: 'me',
        to: ['mira'],
        at: '305d@14:00',
        body: `Hi Mira,

I'd like to submit a talk for Tessellate in the spring. Working title: "Designing for trust in patient-facing software".

Abstract: Patients don't read healthcare interfaces the way we test them. They're anxious, often on a phone in a waiting room, and one confusing label can mean a missed appointment or a wrong dose. Drawing on two years of work on a regional health system's patient portal, I'll share the research methods, language patterns and accessibility choices that moved our task success rate from 61% to 89%.

Happy to share slides from an earlier version of the talk.

Best,
Robin Hale
Design Lead, Fernbrook`,
      },
      {
        from: 'mira',
        to: ['me'],
        at: '281d@11:20',
        body: `Hi Robin,

I'm delighted to say the program committee accepted your talk! It was one of the highest-rated submissions this year.

You're scheduled for the Day 2 morning track (30 minutes + 10 minutes of Q&A). Speaker details and travel info will follow in January.

Congratulations,
Mira Solberg
Program Chair, Tessellate Conf`,
      },
      {
        from: 'me',
        to: ['mira'],
        at: '281d@12:05',
        body: `This is wonderful news — thank you, Mira! Looking forward to it.`,
      },
    ],
  },
];

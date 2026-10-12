import type { Contact } from '../lib/types';
import type { SeedThread } from './seedTypes';

/** Everyone in a group thread except the sender (used for `to`). */
const group = (ids: string[]) => (from: string) => ids.filter((i) => i !== from);

export const contacts: Contact[] = [
  { id: 'p_leah', name: 'Leah Sandoval', email: 'leah.sandoval@brightwave.example', org: 'Brightwave', title: 'Product Marketing Manager', color: '#c26401', replies: true },
  { id: 'p_nadia', name: 'Nadia Rahman', email: 'nadia@larkspurcoffee.example', org: 'Larkspur Coffee', title: 'Head of Operations', color: '#8d6e3f', replies: true },
  { id: 'p_cal', name: 'Cal Whitaker', email: 'cal@pressandpine.example', org: 'Press & Pine Printers', title: 'Account Manager', color: '#4e6b3a', replies: true },
  { id: 'p_mara', name: 'Mara Lindholm', email: 'mara@tidewell.example', org: 'Tidewell', title: 'Founder & CEO', color: '#0e7c86', replies: true },
  { id: 'p_hollis', name: 'Hollis Grant', email: 'hollis.grant@frontierdesign.example', org: 'Frontier Design Summit', title: 'Programme Chair', color: '#7e57c2', replies: true },
  { id: 'p_grace', name: 'Grace Whitfield', email: 'grace.whitfield@postbox.example', title: 'Neighbour (4B)', color: '#ad1457', replies: true },
  { id: 'p_theo', name: 'Theo Lindgren', email: 'theo.lindgren@fieldwork.example', org: 'Fieldwork Studio', title: 'Design Director', color: '#455a64', replies: true },
];

const onboarding = group(['marcus', 'priya', 'elena', 'kenji', 'me']);
const offsite = group(['sofia', 'tom', 'priya', 'marcus', 'kenji', 'me']);
const retro = group(['kenji', 'hannah', 'priya', 'me']);
const birthday = group(['linda', 'riley', 'me']);

export const threads: SeedThread[] = [
  // ───────────────────────── Last 24 hours ─────────────────────────
  {
    subject: 'Slide 7 before the deck goes out',
    labels: ['work'],
    important: true,
    messages: [
      {
        from: 'tom',
        ago: '4m',
        unread: true,
        md: `Jordan, slide 7 is too busy. The legend is eating the funnel chart and I can't read it on my phone.

Can you clean it up before the deck goes to the board? Need it out by 4.

Thx
T

Sent from my phone`,
      },
    ],
  },
  {
    subject: 'Onboarding v3: design review',
    labels: ['work', 'design'],
    important: true,
    messages: [
      {
        from: 'marcus',
        to: onboarding('marcus'),
        ago: '2d 3h 12m',
        files: [['Onboarding-v3-review.pdf', 4_812_000]],
        md: `Hi all,

Onboarding v3 is ready for a proper look. The PDF walks through every screen, and the Figma file has the prototype if you want to click around.

The flow is five steps: name your workspace, connect a data source, invite teammates, pick a starter board, and land on a first insight with the little count-up animation I've been obsessing over (700ms, ease-out, I'm not going to apologise for it).

Things I'd love eyes on:
- Step 2: the connect-a-source cards. Is the Snowflake logo lockup too loud next to Postgres?
- Step 4: the template picker. I honestly think it's the nicest screen we've ever shipped.
- The progress copy: "Step 2 of 5" vs. plain dots

Comments by end of tomorrow if you can. Thanks!

Marcus`,
      },
      {
        from: 'priya',
        to: onboarding('priya'),
        ago: '1d 20h 41m',
        md: `Engineering read, quickly:

- Steps 1, 3 and 5 are straightforward.
- Step 2 is the risk. Snowflake and BigQuery both use an OAuth redirect, so we need a "waiting for authorization" state and a failure state. Neither is in the PDF.
- Five steps feels long for a product where the first minute matters.

Can we get the pending and error states designed before sprint planning?

P`,
      },
      {
        from: 'elena',
        to: onboarding('elena'),
        ago: '1d 16h 5m',
        md: `Some numbers to anchor this, from the baseline I sent round a couple of weeks ago (last 8 weeks, 1,204 new workspaces):

- 39% never connect a data source
- Of those who connect, 71% reach a first insight within 24 hours
- Of those who don't, 9% do

So I'd argue step 2 is the whole ballgame, and length matters less than what we ask before it. I'm nervous about anything that makes connecting optional. Our "skip" screens historically turn into "never".

Happy to pull the same cut for invited users vs. workspace creators if that's useful.

Elena`,
      },
      {
        from: 'me',
        to: onboarding('me'),
        ago: '1d 9h 30m',
        md: `Went through the PDF properly this morning. Great work, Marcus. The visual system is coherent and the step 4 template picker really is lovely.

My concern is order rather than count. Asking people to invite teammates (step 3) before they've seen a single number from their own data feels premature. Nobody invites colleagues to an empty room.

Proposal:
1. Name your workspace
2. Connect a source, or explore with sample data
3. First insight

Then a pinned checklist on the home board: invite teammates, pick a starter board, set up a weekly Pulse. Three steps, and everything else becomes something you do once you care.

I'll mock the pending and error states for the connect step either way.

Jordan`,
      },
      {
        from: 'marcus',
        to: onboarding('marcus'),
        ago: '1d 2h 48m',
        md: `OK, I'm annoyed at how good that is.

The checklist gives the template picker a second life too, so I don't have to bury my baby. Two questions:

- Sample data means the count-up plays on fake numbers. Are we fine with that? (I say yes, it's a demo of the *feeling*.)
- Elena, would sample-data users wreck your funnel?

Marcus`,
      },
      {
        from: 'elena',
        to: onboarding('elena'),
        ago: '22h 15m',
        md: `Not if we tag them. I'll add a data_source_type property (real vs. sample) and report the two as separate cohorts.

My one condition: "Connect your data" stays pinned at the top of the checklist until it's done, sample data or not.

Elena`,
      },
      {
        from: 'kenji',
        to: onboarding('kenji'),
        ago: '5h 20m',
        md: `Sample data is easy. We already have the demo tenant sales uses, so I can put it behind a flag this sprint.

One request: make the checklist server-driven (ordered list of items with a completed flag) instead of hard-coding it in the client. Then we can reorder or add items without a release, and Elena gets her events for free.

K`,
      },
      {
        from: 'priya',
        to: onboarding('priya'),
        ago: '1h 12m',
        unread: true,
        md: `Decision, then:

- Three steps, sample data as an option in step 2
- Pinned checklist on the home board, "Connect your data" first until done
- Sample-data users tracked as their own cohort (Elena)
- Kenji: demo-tenant flag + server-driven checklist this sprint
- Marcus: update the PDF to v4
- Jordan: pending and error states for step 2

Marcus, you keep the count-up. Don't make me regret it.

P`,
      },
    ],
  },
  {
    subject: 'Did I leave my charger at yours??',
    labels: ['family'],
    messages: [
      {
        from: 'riley',
        ago: '2h 31m',
        unread: true,
        md: `ok so hypothetically

white cable, slightly chewed by a dog that is not mine, possibly holding a small piece of my dignity. did it stay at yours after the pizza night

asking because my phone is at 3% and so is my will to live

also Bernard says hi. he's settled in and has opinions about the rug.

R`,
      },
    ],
  },
  {
    subject: 'Assets for the pricing announcement',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'p_leah',
        ago: '3h 8m',
        md: `Hi Jordan,

Quick one from marketing. For the pricing announcement we need:

- The hero illustration at 2x for the email (1200px wide)
- A LinkedIn banner crop (1584 x 396)
- The plan icons as SVGs, so the web team doesn't have to trace them

Any chance you can get these to me by the end of the week? Happy to jump on a call if it's easier to walk through.

Thanks so much,
Leah
--
Leah Sandoval
Product Marketing, Brightwave`,
      },
    ],
  },
  {
    subject: 'Sprint 24 planning: design capacity',
    labels: ['work'],
    messages: [
      {
        from: 'priya',
        ago: '1d 3h 40m',
        md: `Jordan, sprint 24 planning is coming up. How many design days can I count on?

On the board for you right now: the 3-step onboarding, the pending/error states for connect, and empty states for Board. I estimated 8 days.

P`,
      },
      {
        from: 'me',
        ago: '23h 48m',
        md: `Honest count is 6, not 8. One of my days this sprint goes to the Brightwave readout.

I'd get the pending/error states and the onboarding frames done by mid-sprint and drop the Board empty states to stretch. Marcus might have room for those if he isn't buried in the dashboard work.

Jordan`,
      },
      {
        from: 'priya',
        ago: '9h 3m',
        md: `Works. Empty states go to stretch and I'll ask Marcus. Estimates updated on the board. Please sanity check them before planning.

P`,
      },
      {
        from: 'me',
        ago: '4h 52m',
        md: `Checked, all fine except the onboarding frames. I'd bump those from 3 days to 4 to include the pending state. Updated in the ticket. Thanks!`,
      },
    ],
  },
  {
    subject: 'Bouldering tomorrow?',
    messages: [
      {
        from: 'noah',
        ago: '1d 4h 15m',
        md: `Session tomorrow after work? They reset the overhang wall yesterday and there's a new purple 6B that I have beef with.

7?`,
      },
      {
        from: 'me',
        ago: '1d 1h 50m',
        md: `In. Can we do 6:30? My last call ends at 6 and the walk over takes 20.`,
      },
      {
        from: 'noah',
        ago: '6h 23m',
        md: `6:30 works. Bring your own shoes this time. Last time you climbed in rentals "for the story" and I had to hear about it for a week.

Slot is booked.`,
      },
    ],
  },
  {
    subject: 'Your package is with me (4B)',
    messages: [
      {
        from: 'p_grace',
        ago: '7h 40m',
        md: `Hi Jordan! It's Grace from 4B.

The courier left a big flat box for you at my door this morning, marked FRAGILE. I hope it's not the monitor you were waiting on! I'm home all evening, so just knock whenever.

Also, the hallway light on our floor is flickering again. I emailed Marta about it weeks ago and got a very polite nothing. It might land better coming from two of us.

Grace`,
      },
    ],
  },
  {
    subject: 'Pop-up this weekend: do we have a sign?',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'omar',
        ago: '9h 15m',
        unread: true,
        md: `Jordan! Tiny emergency (the fun kind).

We got a table at the farmers market this weekend, our first time. Do we have anything that says LARKSPUR that I can put in front of it by Saturday morning? It doesn't need to be perfect. It needs to not look like it was made in Word.

I'd happily pay a rush fee. Also, is there a version of the lark that works at three feet wide? Asking for a banner I may have already ordered.

Nadia says we're out of the 12oz bags, so samples will be in paper cups. Please don't tell the design community.

Omar`,
      },
    ],
  },
  {
    subject: 'Lisbon itinerary',
    labels: ['travel'],
    starred: true,
    messages: [
      {
        from: 'chloe',
        ago: '5d 2h 10m',
        files: [['lisbon-itinerary.pdf', 1_240_000]],
        md: `Ok. I have been living inside a spreadsheet for two days and I have Feelings. Draft one of Lisbon is attached.

Rough shape:
- Day 1: land, drop bags, wander Alfama, early dinner (we will be dead)
- Day 2: Belém. Pastéis de nata at the original place, the Jerónimos monastery, MAAT at sunset
- Day 3: Sintra day trip
- Day 4: Time Out Market, then wherever the day takes us
- Day 5: LX Factory, the market, flight at 5

Tell me what to cut. I am not attached. (I am extremely attached.)

C x`,
      },
      {
        from: 'me',
        ago: '4d 21h 30m',
        md: `This is beautiful and I love you. Notes from a person who has read about Sintra more than is healthy:

- Sintra is a whole day, and the Pena Palace queue can eat two hours of it. Early train or not at all.
- Day 4 is doing a lot of "wherever the day takes us". I love it, but I'd also like one thing on the list that isn't food.
- I want to see the tile museum. Please indulge the designer.`,
      },
      {
        from: 'chloe',
        ago: '4d 15h 3m',
        md: `The Museu do Azulejo is the design-nerd tax and I gladly pay it. Adding it to Day 4 morning, food after.

For Sintra I found an 8:40 train from Rossio. Before you type it: yes, that is early. Yes, it is worth it.`,
      },
      {
        from: 'me',
        ago: '3d 22h 47m',
        md: `8:40 on holiday is a hate crime. Counter-offer: 9:40 train, skip the palace interior, do Quinta da Regaleira instead (weird gardens, a well you can walk down into, far fewer people).

Also, pastéis math. How many is too many on Day 2? Asking for a friend who is me.`,
      },
      {
        from: 'chloe',
        ago: '3d 19h 20m',
        md: `9:40 accepted, Regaleira accepted. You're being very reasonable and I don't trust it.

Pastéis: two at Belém, then one at every bakery we happen to pass. It's basically a walking tour.

Flights are confirmed, by the way. Costs are in the sheet from before and we'll settle everything else in the Splitwise group.`,
      },
      {
        from: 'me',
        ago: '2d 11h 8m',
        md: `Found something for Day 4: a two-hour azulejo painting workshop in Alfama, €45 each, small groups, you leave with a tile you painted yourself. 10:30 start. It replaces the museum or comes before it, your call.

I need to be able to say I hand-painted a tile in Lisbon at least once in my life.`,
      },
      {
        from: 'chloe',
        ago: '1d 18h',
        md: `YES. Book it. I refuse to be judged on my tile, however.

The museum moves to Day 5 morning, before LX Factory. I've rebalanced everything and the itinerary is now allegedly "relaxed".`,
      },
      {
        from: 'me',
        ago: '22h 30m',
        md: `Booked for Day 4 at 10:30 and I've forwarded you the confirmation. €90 total, I'll add it to Splitwise.

Question: do we do the 28 tram, or is that a tourist trap?`,
      },
      {
        from: 'chloe',
        ago: '11h 2m',
        unread: true,
        files: [['lisbon-itinerary-v2.pdf', 1_310_000]],
        md: `The 28 is both a tourist trap and a rite of passage. We ride it at 8am on the last morning when it's empty and we're groggy and we can pretend we live there.

Updated itinerary attached (v2). I colour-coded the "eat" blocks. I have a problem.`,
      },
    ],
  },
  {
    subject: 'Leaking kitchen tap',
    labels: ['finance'],
    important: true,
    messages: [
      {
        from: 'me',
        to: ['marta'],
        ago: '1d 6h 25m',
        files: [['IMG_4930.jpg', 2_740_000]],
        md: `Hi Marta,

The kitchen tap has started dripping constantly, roughly one drop a second, and there's a little water in the cabinet underneath. I've attached a photo of the pipe joint in case that helps.

Could someone take a look sometime this week? Happy to be home for it.

Thanks,
Jordan`,
      },
      {
        from: 'marta',
        ago: '1d 1h 40m',
        md: `Hi Jordan,

Thank you for letting me know, and I'm sorry about the tap. I've asked Darko, our plumber, to take a look. He can come this afternoon or tomorrow morning between 9 and noon. Which do you prefer?

In the meantime, please put a towel or small bowl under the sink and use the shut-off valve if the drip gets worse. It's the small oval handle on the left-hand pipe.

Best regards,
Marta`,
      },
      {
        from: 'me',
        ago: '22h 12m',
        md: `Tomorrow morning is better. I'm working from home so I can let him in. Found the shut-off valve and it's done the trick for now.

Thanks for the quick response!`,
      },
      {
        from: 'marta',
        ago: '14h 20m',
        md: `Perfect. Darko is confirmed for tomorrow between 9 and noon and will bring a replacement cartridge. He'll call you when he's 15 minutes away.

Thank you for the photo, it made it easy to work out what he needs to bring.

Marta`,
      },
    ],
  },
  {
    subject: 'Long run this weekend: 16 miles',
    messages: [
      {
        from: 'sam',
        ago: '17h 5m',
        md: `Hey Jordan!

This weekend's long run is 16 miles, meeting at the boathouse at 7:30. We'll take the river path out to the far bridge and back, with a coffee stop at mile 10 (yes, we're that kind of club).

Bring a gel or two. There are no water stops after mile 6, and I say that as someone who has learned the hard way.

Let me know if you're in so I can count heads for the pacer groups. The 9:00/mile group is looking a little thin.

Sam
--
Sam Ortega
Eastside Runners · Captain`,
      },
    ],
  },
  {
    subject: 'Retro: dashboard slowdown during the export job',
    labels: ['work'],
    messages: [
      {
        from: 'kenji',
        to: retro('kenji'),
        ago: '3d 4h',
        files: [['incident-timeline.pdf', 386_000]],
        md: `Retro doc attached. Short version:

**What happened:** the nightly customer CSV export ran against the same replica as normal dashboard traffic. Dashboard p95 went from 1.2s to 14s for 47 minutes.
**Impact:** 31 workspaces saw slow or blank charts. No data loss.
**Detection:** our alert fired after 22 minutes. Hannah's first ticket arrived at minute 9.
**Cause:** the export job has no concurrency limit and nothing isolating it from read traffic.

Proposed actions are on the last page. I'd like to walk through them at standup.

K`,
      },
      {
        from: 'hannah',
        to: retro('hannah'),
        ago: '2d 20h',
        md: `Adding the customer side. Six tickets in total, two from enterprise trials (one was Meridian Logistics, and Amara was not thrilled).

The thing people kept saying: they thought it was broken, not slow. A couple refreshed repeatedly, which probably made it worse.

Two asks: a status page post as soon as we detect something like this, and something on the dashboard itself that says "still loading" so people don't assume it's dead.`,
      },
      {
        from: 'priya',
        to: retro('priya'),
        ago: '2d 8h',
        md: `Actions:
1. Move the export to its own replica. Owner: Kenji
2. Alert threshold from 5 min to 2 min. Owner: Kenji
3. Status page comms template. Owner: Hannah
4. Slow-load state on the dashboard. Owner: Jordan

Jordan, can you take #4?

P`,
      },
      {
        from: 'me',
        to: retro('me'),
        ago: '21h 40m',
        md: `Happy to take #4. Proposal: after 4 seconds the charts swap to skeletons with a quiet "Still working on it" line, and after 10 seconds it adds a Retry button and a link to the status page. I'll have a first pass by the end of the sprint.

Question for Hannah: of the six tickets, how many said "blank charts" and how many said "spinner forever"? That tells me which state is actually confusing people.

Jordan`,
      },
    ],
  },

  // ───────────────────────── 1 to 7 days ─────────────────────────
  {
    subject: 'Frontier Design Summit: your talk has been accepted',
    labels: ['work', 'ideas'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'p_hollis',
        ago: '1d 19h 47m',
        unread: true,
        md: `Dear Jordan,

Congratulations! On behalf of the programme committee, I'm delighted to offer you a 25-minute slot at Frontier Design Summit for "Designing the Empty State".

We received 212 proposals for 36 slots. Yours was in every reviewer's top five, and one of them wrote, "finally, someone talking about the screen users see first." You're scheduled in the afternoon track on day two.

What comes with a speaker slot:
- A full conference pass, plus a guest pass for a colleague
- A travel stipend of up to $600 and one hotel night
- A 20-minute tech check the day before

Could you confirm by the end of next week so we can lock the schedule? I'll send the speaker agreement and a short bio template as soon as you do.

Warm regards,
--
Hollis Grant
Programme Chair, Frontier Design Summit`,
      },
    ],
  },
  {
    subject: 'Team offsite: venue options',
    labels: ['work'],
    messages: [
      {
        from: 'sofia',
        to: offsite('sofia'),
        ago: '5d 3h',
        files: [['offsite-options.pdf', 2_130_000]],
        md: `Hi team,

Offsite time! I've narrowed it to three options (details, photos and per-person costs are in the attached PDF):

- **A: The lakehouse.** 90 minutes from the city, sleeps 14, kitchen big enough to cook together. About $650 per person all-in.
- **B: City hotel.** Conference room plus a group dinner. About $420 per person.
- **C: Coastal town.** Ferry ride, a converted boathouse for workshops. About $890 per person.

Please reply-all with your vote by the end of the week. If you have dietary or accessibility needs, tell me now rather than at the buffet.

Sofia`,
      },
      {
        from: 'tom',
        to: offsite('tom'),
        ago: '4d 22h',
        md: `A. Lakehouse. Bring speakers.

Sent from my phone`,
      },
      {
        from: 'priya',
        to: offsite('priya'),
        ago: '4d 19h',
        md: `A is the only option that isn't just a meeting with better snacks.

Practical constraint: two days, not three. I need two people reachable on call at all times and the rota can't stretch past that. Kenji and I will swap shifts so we're both there for the main day.

P`,
      },
      {
        from: 'marcus',
        to: offsite('marcus'),
        ago: '4d 7h',
        md: `Option C!! There's a FERRY. I've already imagined the group photo on the deck, wind in everyone's hair, Priya pretending not to be cold.

I know, I know, it's $240 more per person. But think of the workshop I could run in a boathouse: "Design Crits, But Kind". I've been workshopping the title.

(Fine. I can see the vote. A is good too.)

Marcus`,
      },
      {
        from: 'me',
        to: offsite('me'),
        ago: '3d 20h',
        md: `A for me too. One request: keep at least one afternoon fully unstructured. The last offsite ran 9 to 6 with a working dinner and everyone came home wrecked.

I'm also happy to run a 60-minute session on the new onboarding flow if anyone wants a live critique. And Sofia, I can help collect dietary info so it's not all on you.

Jordan`,
      },
      {
        from: 'sofia',
        to: offsite('sofia'),
        ago: '2d 6h 15m',
        md: `Tally: A has 5 votes, C has 1 (Marcus, noted with love), B has none.

The lakehouse is booked. Two days, an unstructured afternoon on day two (Jordan's request, approved), and a karaoke machine is being sourced against my better judgment.

I'll send the dietary form tomorrow. Please fill it in the same day. I will be chasing.

Sofia`,
      },
    ],
  },
  {
    subject: 'Scope: settings redesign + mobile billing',
    labels: ['work'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'rachel',
        ago: '5d 6h',
        md: `Hi Jordan,

Great news: leadership loved the pricing direction. Two asks came out of the review, and I'm hoping we can fold both into the current engagement:

1. Redesign account settings (profile, team, notifications)
2. Make the whole billing flow work well on mobile web

Same timeline if possible. The exec team is expecting all of it live before their customer conference, and I've told them it's in hand.

Can you confirm?

Rachel
--
Rachel Adeyemi
VP Product, Brightwave`,
      },
      {
        from: 'me',
        ago: '5d 1h',
        md: `Hi Rachel,

Thrilled it landed! Both asks make sense, but I don't want to over-promise, so here's my honest read.

The current SOW covers the pricing page and checkout, and that work is already tight against the timeline. My estimates for the new items:
- Account settings redesign: about 6 days
- Mobile billing flow (invoices, payment methods, plan changes): about 8 days

Options as I see them:
1. Change order for both, and the launch moves out by about two weeks
2. Settings now, mobile billing as a phase 2
3. Keep the SOW as it is and treat both as a follow-on

I'd suggest option 2. Happy to talk it through whenever suits.

Jordan`,
      },
      {
        from: 'rachel',
        ago: '4d 18h',
        md: `I hear you, and I appreciate the honesty. But I have to be straight too: budget is fixed until next quarter, and I told the exec team this was covered.

Could mobile billing count as part of "responsive design" for checkout? I'd argue that was always implied.

Rachel`,
      },
      {
        from: 'me',
        ago: '4d 2h',
        files: [['SOW-addendum-draft.docx', 46_200]],
        md: `I understand the position you're in, and I want to help you land this.

Responsive pricing and checkout are absolutely in scope, and I've already designed them mobile-first. But billing *management* (invoices, payment methods, plan changes) is a different surface that wasn't in the SOW. Calling it responsive design would mean underpricing about eight days of real work.

Here's what I can do: I'll absorb two days of the settings work as goodwill, and we do a short change order for the rest at the same day rate. The draft addendum is attached so you have numbers to take to finance.

Jordan`,
      },
      {
        from: 'rachel',
        ago: '3d 6h',
        md: `Thank you, the goodwill matters, and finance is far more open to a change order than to a "how did this get missed?" conversation.

I can get approval for settings plus a first phase of mobile billing: invoices list and payment method only, not plan changes. Can you re-cost on that basis?

Rachel`,
      },
      {
        from: 'me',
        ago: '2d 22h',
        files: [['SOW-addendum-v2.docx', 48_100]],
        md: `Re-costed. With settings (less my two goodwill days) plus mobile invoices and payment methods, the total comes to 9 days, down from 12. Revised addendum attached. Plan changes go in a phase 2 note so nobody is surprised later.

If you're comfortable with it, I can start on the settings screens in parallel this week while the paperwork goes through.

Jordan`,
      },
    ],
  },
  {
    subject: 'Visiting next week: dinner?',
    messages: [
      {
        from: 'ana',
        ago: '6d 20h',
        md: `Jordan!! I'm coming to town for work next week, three nights. Can I steal an evening? I want to see your apartment and eat something that didn't come out of a hotel buffet.

Ana xx`,
      },
      {
        from: 'me',
        ago: '6d 9h',
        md: `YES. Come to dinner at mine the first night, I'll cook. Or we can go out if you'd rather not be fed by someone who owns four spatulas and one pan.

Are you still vegetarian?`,
      },
      {
        from: 'ana',
        ago: '5d 2h',
        md: `Still veg, only now I also don't eat tomatoes. Don't ask. Yours, obviously. I'll bring wine and questionable cheese.

What time?`,
      },
      {
        from: 'me',
        ago: '3d 8h',
        md: `7:30. I'm making the mushroom thing you liked in junior year, minus tomatoes. Same building, 4A. The buzzer is broken so text me when you're downstairs and I'll come get you.

Can't wait!`,
      },
    ],
  },
  {
    subject: "Dad's birthday dinner",
    labels: ['family'],
    starred: true,
    messages: [
      {
        from: 'linda',
        to: birthday('linda'),
        ago: '6d 8h',
        md: `Hi sweetheart! I hope work isn't too crazy this week.

I wanted to start planning Dad's 65th. He says he doesn't want a fuss (he says that every year) so I'm thinking a small dinner, just the four of us plus Riley's friend Cass if she's around, at Trattoria Fiore. The place with the gnocchi he raved about last time.

Would this weekend at 6:30 work for you both? I'll book as soon as I hear back. Riley, can you tell me if Cass is coming, so I can give them a number?

Love, Mom 🙂`,
      },
      {
        from: 'riley',
        to: birthday('riley'),
        ago: '6d 5h',
        md: `Yes to the gnocchi. Cass is possibly coming. Possibly it's just a very tired me. Will confirm by tomorrow.

Also can we get a cake that's NOT the restaurant's? They do the sad tiramisu-with-a-candle thing and Dad hates being sung to.

Counter-proposal: we sing quietly and fast. Speedrun.

R`,
      },
      {
        from: 'me',
        to: birthday('me'),
        ago: '5d 21h',
        md: `I'm in. I can pick up a cake from the bakery near my place (lemon olive oil, Dad's favourite). I'll bring it in a box and we can smuggle it in.

Gifts? I was going to frame the photo from the fishing trip, the one where he's holding the tiny trout like it's a marlin.`,
      },
      {
        from: 'linda',
        to: birthday('linda'),
        ago: '5d 14h',
        md: `Oh Jordan, that's so thoughtful, he'll love it! I already got him the new waders (don't tell him, he thinks I forgot what he mentioned in the summer).

Riley, what are you giving him? And please don't let him grab the check, you know how he gets. Xx Mom`,
      },
      {
        from: 'riley',
        to: birthday('riley'),
        ago: '5d 9h',
        md: `waders?? bold. i got him a sweater with a fish on it. ironic and also sincere, the way he likes his gifts.

Cass is in, so that's five. I'll be there at 6:15 like a functioning adult (I will not be).

R`,
      },
      {
        from: 'linda',
        to: birthday('linda'),
        ago: '4d 16h',
        md: `Booked for five at 6:30! 🎂 They asked if it was a special occasion and I said "just family", because I didn't want them to bring out a candle.

Jordan, could you and Dad ride together? He'll want to drive, but he'll grumble and then go. I'll tell him you're picking him up as a favour to you.

Love you both. Mom`,
      },
      {
        from: 'me',
        to: birthday('me'),
        ago: '3d 21h',
        md: `Done. I'll get him at 6 and tell him I need a lift because of parking. Cake is ordered for pickup at 5.

Riley, if you sing loudly I will leave the restaurant.

J`,
      },
    ],
  },
  {
    subject: 'Intro: Jordan / Mara (Tidewell)',
    labels: ['work'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'david',
        to: ['me', 'p_mara'],
        ago: '4d 22h',
        md: `Mara, Jordan: meet each other.

Mara founded Tidewell (scheduling software for small clinics; we led their seed round). Jordan is the best product designer I know who isn't tied to a single company, and just did excellent work on Northlight's onboarding.

Mara's team is at the stage where they need design but can't yet justify a full-time hire. Jordan freelances. I'll let you two take it from here. Coffee beats email.

David
--
David Kim
Partner, Harbor Capital`,
      },
      {
        from: 'p_mara',
        to: ['me'],
        cc: ['david'],
        ago: '4d 19h 10m',
        md: `Thanks for the intro, David. Jordan, lovely to meet you (virtually).

We're nine people, no designer, and our clinic onboarding is a mess. One clinic manager told me it "feels like filing taxes". I'd love 30 minutes to show you what we have and get your honest reaction.

Would sometime next week work?

Mara`,
      },
      {
        from: 'me',
        to: ['p_mara'],
        cc: ['david'],
        ago: '4d 12h',
        md: `Hi Mara, and thanks David for the intro!

"Feels like filing taxes" is painful and also the most useful design brief I've read all month. Happy to talk. I'm on client days early in the week, so late in the week is best: Thursday afternoon or Friday morning?

If you can send a screen recording or a few screenshots of the current flow beforehand, I can come with real questions instead of polite ones.

Jordan`,
      },
      {
        from: 'p_mara',
        to: ['me'],
        cc: ['david'],
        ago: '4d 5h',
        md: `Friday at 10 works. Calendar invite coming, and I'll add a Loom of the walkthrough (7 minutes, sorry, I ramble).

Mara`,
      },
    ],
  },
  {
    subject: 'Meridian demo: can you mock the alerts screen?',
    labels: ['work'],
    messages: [
      {
        from: 'amara',
        ago: '5d 2h',
        md: `Jordan! The Meridian Logistics call went great. They're 400 seats, and their VP asked whether we can alert on anomalies in delivery times.

We don't have alerts yet. But even a clickable mock would help me close the second call. Could you put together 2-3 screens? The alert rule builder, an alert landing in Slack, and the alerts list.

I need it by the end of next week. I'll owe you a very nice lunch.

Amara`,
      },
    ],
  },
  {
    subject: 'Estimated tax payment: what to set aside',
    labels: ['finance'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'wes',
        ago: '7d 4h',
        files: [['1040-ES-voucher.pdf', 212_000]],
        md: `Jordan,

Your next federal estimated payment is coming up. Based on your income so far ($61,400 through last month), I recommend setting aside $4,850 federal and $1,120 state. That assumes the Brightwave invoice lands before quarter-end. If it slips, we can lower the amount, but I'd rather you overpay slightly than get hit with an underpayment penalty.

The payment voucher is attached. You can pay online or by check.

Best,
--
Wes Holloway
Holloway & Co.`,
      },
      {
        from: 'me',
        ago: '6d 20h',
        md: `Thanks Wes. Two questions:

1. Can I deduct my coworking membership? It's $320 a month and I work from there on non-Northlight days.
2. I've been thinking about a SEP-IRA. Is it too late to open one for this year?

Jordan`,
      },
      {
        from: 'wes',
        ago: '5d 11h',
        md: `1. Yes, if the space is used primarily for business, and it is. Keep the monthly invoices. You can also claim a home-office deduction, but not for the same hours in both places, so pick the one you actually use more.
2. Not too late. You can open and fund a SEP-IRA up to the filing deadline. A rough rule is up to about 20% of net self-employment earnings. I'd like to model it properly at the year-end call.

Pay the estimate by the deadline. Everything else can wait.

Best,
--
Wes Holloway
Holloway & Co.`,
      },
    ],
  },
  {
    subject: "Grandma Rose's lentil soup",
    labels: ['family'],
    messages: [
      {
        from: 'linda',
        ago: '6d 15h',
        md: `Jordan honey, you asked for Grandma Rose's lentil soup so I dug out the recipe card. She never wrote down amounts, so here is my best translation after thirty years of making it:

- 2 cups brown lentils, rinsed
- 1 large onion, 2 carrots and 2 celery stalks, all chopped small
- 4 cloves of garlic
- 1 can of crushed tomatoes
- 8 cups of stock (or water plus a bouillon cube, don't tell her)
- Bay leaf, a little thyme, salt and lots of black pepper

Sauté the vegetables until soft, add everything else and simmer about 40 minutes. The secret is a splash of red wine vinegar at the very end. She always said the soup wakes up.

Serve with crusty bread. Are you eating enough vegetables?

Love, Mom ❤️`,
      },
      {
        from: 'me',
        ago: '6d 9h',
        md: `Mom, this is perfect, thank you. Two questions: do you use smoked paprika? I remember it tasting smoky. And do you soak the lentils?`,
      },
      {
        from: 'linda',
        ago: '6d 2h',
        md: `Yes! A teaspoon of smoked paprika, Grandma called it "the Spanish thing". No soaking for brown lentils, just rinse them well.

Send me a picture when you've made it! I want to see if you've done the vinegar. xo`,
      },
    ],
  },

  // ───────────────────────── 1 to 4 weeks ─────────────────────────
  {
    subject: 'Dashboard redesign: KPI row + empty states',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'marcus',
        to: dashboard('marcus'),
        ago: '11d 6h',
        files: [['dashboard-redesign-v2.fig', 21_400_000]],
        md: `Dashboard redesign round 2, hot off the Figma press.

What's new:
- KPI row: each card now has a sparkline and a delta chip (vs. previous period)
- Chart grid moves to 12 columns, so charts can be 4, 6 or 8 wide
- Dark mode is *finally* good. I redid every surface in the new tokens and it's so crisp

File attached (it's a big one, sorry). Would love reactions from the customer side (Hannah) and the numbers side (Elena) especially.

Marcus`,
      },
      {
        from: 'hannah',
        to: dashboard('hannah'),
        ago: '10d 20h',
        md: `Love the direction! Some customer-side notes:

- Two customers this month asked to pin one chart as the "hero" of a board, so it's the first thing execs see.
- The delta chips: green up arrow = good, but for churn, up is BAD. One customer literally emailed asking why churn was celebrating.
- The empty KPI card (no data yet) looks broken rather than waiting. Could it say what it needs?

Hannah`,
      },
      {
        from: 'elena',
        to: dashboard('elena'),
        ago: '10d 9h',
        md: `Adding two data points:

- Sparklines with 7 points are misleading for weekly metrics. The median customer has 12+ weeks of history, so 12 points would tell the honest story. Axis on hover, please.
- On chips, I agree with Hannah. Use a neutral colour unless the metric has a defined good direction. We can store that in the metric definition.

Elena`,
      },
      {
        from: 'me',
        to: dashboard('me'),
        ago: '9d 22h',
        md: `Agree with both. Proposal:

- Metric definitions get a "good direction" field (up / down / neutral) that drives chip colour. Neutral by default.
- Sparklines show the last 12 periods, with the axis on hover.
- Hero chart: "Pin as hero" in the chart menu, and the pinned chart spans 8 columns.
- Empty KPI cards say what they're waiting for ("Waiting for first event").

Marcus, one gripe: the 4-up KPI row breaks at 1280px wide and the labels truncate ("Monthly recurring reve…"). I know you designed at 1440.

Jordan`,
      },
      {
        from: 'marcus',
        to: dashboard('marcus'),
        ago: '8d 4h',
        files: [['dashboard-redesign-v3.fig', 22_100_000]],
        md: `Ha, fair. I was designing at 1440 like a criminal. New rule: 3-up at 1280 and below.

I've folded in the good-direction idea. It's such a clean solve I'm a little jealous. Updated file attached (v3).

Marcus`,
      },
    ],
  },
  {
    subject: 'Design tokens PR: naming check',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'kenji',
        ago: '8d 20h',
        md: `Jordan,

[PR #1187](https://git.example/northlight/app/pull/1187) moves our colours over to semantic tokens: surface-1/2/3, text-default, text-muted, border-subtle, accent. Diff is small, no visual changes intended.

Before I merge, can you sanity check the names against your Figma variables? Two open questions:
1. text-muted vs. text-secondary. I picked muted, Marcus prefers secondary.
2. Do we need a surface-inverse for the toast component, or should it just use a dark surface token?

K`,
      },
    ],
  },
  {
    subject: 'Rebrand: logo direction',
    labels: ['work', 'design'],
    important: true,
    messages: [
      {
        from: 'me',
        to: rebrand('me'),
        ago: '19d 6h',
        files: [
          ['Larkspur-directions-v1.pdf', 9_400_000],
          ['brand-moodboard.fig', 14_800_000],
        ],
        md: `Hi Omar, Nadia,

Here are the three logo directions, plus the moodboard that led to them. The PDF is the story; the Figma file has everything if you want to poke around.

1. **Ember.** A flame-shaped L. Warm, a little bold, very "roastery".
2. **Lark.** A small songbird, wings up, drawn in one continuous line. The nod to the name.
3. **Roast mark.** Type only, a custom wordmark with a tall L. The quietest of the three.

I have a favourite, but I'd like your gut reactions first, before I contaminate them.

Jordan`,
      },
      {
        from: 'omar',
        to: rebrand('omar'),
        ago: '19d 1h',
        md: `Jordan. JORDAN.

I have looked at these eleven times. The bird!! But is it a lark or a sparrow? My mother says sparrow and she has never been wrong about a bird.

Also, can the brown stay? Dark brown is the roast. It's who we are.

Omar`,
      },
      {
        from: 'p_nadia',
        to: rebrand('p_nadia'),
        ago: '18d 20h',
        md: `Some operational thoughts, since I'm the one who has to put this on things:

- The bird survives one-colour printing, which matters for cup sleeves and stamps. Ember looks like a candle brand to me.
- Our current logo is on 40 roasters' shelves. A hard switch loses recognition. Could the bird sit in a lockup with the old wordmark for a while?
- Agree with Omar on brown. Not *that* brown, but something in the family.

Nadia`,
      },
      {
        from: 'me',
        to: rebrand('me'),
        ago: '18d 8h',
        md: `Lark it is. (It's a lark: forked tail, thinner beak. I have looked at a lot of birds this week. Please tell your mother.)

Notes:
- Brown stays, but warmer. I'm calling it "roasted amber". It reads as coffee rather than chocolate.
- Transition lockup with the old wordmark for six months: yes, good call, Nadia.
- Next round: a refined bird and three wordmark options.

Jordan`,
      },
      {
        from: 'omar',
        to: rebrand('omar'),
        ago: '17d 2h',
        md: `Warmer brown, fine, as long as it looks like coffee and not gravy.

One more request: can the bird hold a tiny coffee cherry in its beak? Nadia says no. I say yes. You be the judge.

Omar`,
      },
      {
        from: 'p_nadia',
        to: rebrand('p_nadia'),
        ago: '16d 19h',
        md: `No. It's a bird holding a cherry, at 16 pixels, on a receipt printer. It's a smudge.

Nadia`,
      },
      {
        from: 'me',
        to: rebrand('me'),
        ago: '15d 21h',
        files: [['Larkspur-logo-round2.pdf', 5_620_000]],
        md: `You're both right, which is inconvenient.

Compromise: the primary mark stays clean, no cherry, so it works at 16px and on the receipt printer. The cherry gets promoted to a secondary illustration for packaging, tote bags and the banner Omar has probably already ordered.

Round two attached: refined bird, three wordmarks, and the amber palette on kraft, on white and on the dark roast. My pick is wordmark 2.

Jordan`,
      },
      {
        from: 'omar',
        to: rebrand('omar'),
        ago: '9d 13h',
        md: `Signed off! Wordmark 2, bird, amber, cherry on the bags.

I showed it to my mother. She said "that's a sparrow" and then she cried, so I think it's a win.

Can you send the final files whenever you have them? Nadia wants to get the printer going.

Omar`,
      },
    ],
  },
  {
    subject: 'Senior Product Designer at Ledgerly',
    labels: ['work'],
    messages: [
      {
        from: 'jenna',
        ago: '14d 3h',
        md: `Hi Jordan,

I hope you're well. I'm working with Ledgerly, a fintech (Series B, about 120 people), on a Senior Product Designer role. Remote-friendly, $165-185k plus equity. Your portfolio, especially the Northlight onboarding work, caught the hiring manager's eye.

Would you be open to a 20-minute chat to hear more? No pressure at all if the timing's wrong.

Best,
--
Jenna Walsh
Senior Recruiter, TalentBridge`,
      },
      {
        from: 'me',
        ago: '13d 20h',
        md: `Hi Jenna,

Thanks for thinking of me, and for the specifics. I'm freelance by choice and pretty happy with it, but I'm curious. Two questions before I say yes to a call:

- Is the role flexible on days per week, or strictly full-time?
- How big is the design team, and who would I report to?

Jordan`,
      },
      {
        from: 'jenna',
        ago: '13d 7h',
        md: `Good questions! Full-time is the default, but the design lead has said she'd consider four days for the right person. The team is six designers, reporting to the Head of Design (previously at a large payments company). It's a real seat at the table for product decisions.

Would a 20-minute intro with the lead work next week?

Best,
--
Jenna Walsh
Senior Recruiter, TalentBridge`,
      },
      {
        from: 'me',
        ago: '10d 7h',
        md: `Hi Jenna,

Thanks for pushing on this, and for the honest answers. I've thought about it properly and I'm going to pass for now. I have two projects I want to see through, and I'm not ready to trade the freelance setup for a single seat, even a good one.

Please keep me in mind for the next one. If it helps, I know a designer who would be excellent for Ledgerly, and I'm happy to make an intro.

Jordan`,
      },
    ],
  },
  {
    subject: 'Bag packaging: dieline + print quote',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'p_cal',
        to: ['me', 'p_nadia'],
        ago: '12d 4h',
        files: [
          ['Larkspur-12oz-dieline.pdf', 1_620_000],
          ['PressPine-quote.pdf', 184_000],
        ],
        md: `Hi Jordan,

Nadia asked me to send you the dieline for the 12oz stand-up pouch, plus a quote. Specs:

- Flat size 130 x 210 x 80mm
- Matte kraft stock, two spot colours plus one spot gloss
- 3mm bleed; keep type at least 5mm inside the seal

Quotes for 5,000 and 10,000 units are in the PDF. Happy to send a physical proof before the full run.

Cal
--
Cal Whitaker
Account Manager, Press & Pine Printers`,
      },
      {
        from: 'me',
        to: ['p_cal'],
        cc: ['p_nadia'],
        ago: '11d 22h',
        md: `Thanks Cal, this is very clear. Two questions:

1. Can the spot gloss hold a hairline detail? The bird has a 0.25pt wing line.
2. Colour on kraft shifts a lot. Could we get a printed proof of the amber before the run?

Jordan`,
      },
      {
        from: 'p_nadia',
        to: ['me', 'omar'],
        cc: ['p_cal'],
        ago: '11d 15h',
        md: `Looking at the quote: 5,000 bags is $0.62 each and 10,000 is $0.48. We'd use 10k by spring anyway, and it saves about $1,400 over two smaller runs. Omar, cash is tight but I think 10k is right.

Jordan, if the proof passes, the hairline is the only open item.

Nadia`,
      },
      {
        from: 'omar',
        to: ['p_nadia', 'me'],
        cc: ['p_cal'],
        ago: '10d 8h',
        md: `10k. Do it. If we run out of coffee before we run out of bags, I'll frame one.

Cal, please send the proof to the roastery. I want to smell it.

Omar`,
      },
    ],
  },
  {
    subject: "Bachelor weekend (Dev's last stand)",
    labels: ['travel'],
    messages: [
      {
        from: 'dev',
        to: bachelor('dev'),
        ago: '16d 4h',
        md: `Right. Bachelor weekend. I'm told I'm "not allowed to plan it", but I'm also told nobody else has, so here we are.

Two nights. Budget under $300 each. Options:

A) Cabin by a lake, kayaks, fire pit (Noah)
B) Brewery hop in the city plus a day at the climbing gym (Jordan, obviously)
C) "Surprise me" (Anika says no)

Reply with a letter. Majority wins. The groom's tiebreaker is the groom.

Dev`,
      },
      {
        from: 'noah',
        to: bachelor('noah'),
        ago: '16d 1h',
        md: `A. Kayaks. Cabin. Fire pit. I will personally bring the s'mores.

Jordan is voting B purely so there's a wall involved, which is a conflict of interest.

N`,
      },
      {
        from: 'me',
        to: bachelor('me'),
        ago: '15d 21h',
        md: `Conflict noted, and I stand by it. But fine: A, with a stop at the crag on the drive up (40 minutes from the cabin, easy routes, we can all pretend to be good).

I found a place: sleeps 8, two nights is $1,120, has a hot tub. [Cabin listing](https://stays.example/cabin/pinewood-lodge-38)`,
      },
      {
        from: 'dev',
        to: bachelor('dev'),
        ago: '15d 15h',
        md: `Hot tub is non-negotiable now. $1,120 split five ways (I'm the guest of honour and pay in gratitude) is $224 each, plus food and gas. Under $300 all in. Approved.

Who's booking? I think the deposit is 25%?

Dev`,
      },
      {
        from: 'noah',
        to: bachelor('noah'),
        ago: '15d 3h',
        md: `$224 is fine. Who's driving? I can take four in the Subaru if nobody minds the dog. The dog is very good. The dog is also going to eat a s'more.

N`,
      },
      {
        from: 'me',
        to: bachelor('me'),
        ago: '11d 16h',
        md: `Booked. Deposit was $280, so send me $56 each whenever you get a chance, whatever app you like. The rest is due when we arrive.

Dog is welcome. Dog gets a s'more.

Jordan`,
      },
    ],
  },
  {
    subject: 'Customer feedback roundup: top asks this month',
    labels: ['work'],
    messages: [
      {
        from: 'hannah',
        ago: '12d',
        md: `Hi Jordan,

Here's the monthly customer feedback roundup (the full list is in the shared Drive folder). Top requests, by number of mentions:

1. Pin one chart as the "hero" of a board (14)
2. Weekly Pulse digest delivered in Slack, not just email (11)
3. Better contrast in dark-mode tables (9)
4. CSV exports that skip hidden columns (7)

Quote of the month, from a logistics ops manager: "Northlight feels like it was made by people who've actually been paged at 2am." I have printed it and stuck it on my monitor.

The hero-chart request is the one I'd look at for the dashboard redesign. Happy to connect you with two of those customers if you want to talk to them directly.

Hannah`,
      },
    ],
  },
  {
    subject: 'Q3 roadmap: draft + capacity',
    labels: ['work'],
    messages: [
      {
        from: 'priya',
        to: roadmap('priya'),
        ago: '15d 9h',
        files: [['Q3-roadmap.xlsx', 88_400]],
        md: `Draft Q3 roadmap attached. Three themes:

- **Activation:** onboarding v3, sample data, empty states
- **Reliability:** export isolation, faster alerting
- **Insights:** anomaly alerts (beta)

Everything is sized in engineering weeks. Total planned: 34. Total available: 30. Something has to give.

Comments before the planning meeting please. Jordan, the design column is a rough guess, correct me.

P`,
      },
      {
        from: 'amara',
        to: roadmap('amara'),
        ago: '15d 2h',
        md: `Anomaly alerts must stay. Three of my five late-stage deals mention them explicitly. If something slips, please don't let it be alerts for the sake of polish.

Reliability matters, but nobody buys us for faster alert latency.

Amara`,
      },
      {
        from: 'tom',
        to: roadmap('tom'),
        ago: '14d 23h',
        md: `Amara has a point. But I don't want reliability to slip either. Compromise: alerts beta ships email-only, no Slack. Slack goes into Q4.

Priya, does that get us to 30?

Sent from my phone`,
      },
      {
        from: 'priya',
        to: roadmap('priya'),
        ago: '12d 5h',
        files: [['Q3-roadmap-v2.xlsx', 91_200]],
        md: `It does. Alerts beta email-only saves 3 weeks, and trimming onboarding to the essentials saves 1. New total: 30. Updated sheet attached.

Locked unless someone objects by end of week.

P`,
      },
    ],
  },
  {
    subject: 'Moving day: the van situation',
    labels: ['family'],
    messages: [
      {
        from: 'riley',
        ago: '26d 7h',
        md: `Ok so. The lease on Alder St ends next weekend and the new place (Marlowe St, third floor, no elevator, described by the landlord as "a charming staircase") is ready the same day.

I need: a van, two strong friends, and emotional support. You are one of the three.

R`,
      },
      {
        from: 'me',
        ago: '26d 2h',
        md: `Emotional support is my specialty. I'm bad at lifting but excellent at holding doors and saying "you've got this."

Van options: a cargo van from the rental place near the station is about $60 for four hours plus mileage. Dad's truck is also available, but it comes with Dad.

Noah has a dolly and a strong back. I'll ask him.`,
      },
      {
        from: 'riley',
        ago: '25d 20h',
        files: [['IMG_4907.jpg', 3_050_000]],
        md: `Dad's truck comes with commentary. Book the van.

Bigger problem. The couch. Bernard. He's 2.3 metres long and I've attached a photo of him in the doorway of the OLD apartment, where he took 45 minutes and two swear words to get in. Do you think he fits through a door?

R`,
      },
      {
        from: 'me',
        ago: '25d 10h',
        md: `I looked at your new floor plan. The doorway is 80cm wide and there's a tight turn at the top of the stairs. Bernard does not fit as is.

Good news: look at the underside of the couch. I think the legs unscrew. Without legs he's 15cm shorter and he'll pivot on the landing. If not, he goes over the balcony and we say a few words.`,
      },
      {
        from: 'riley',
        ago: '25d 3h',
        md: `HE HAS LEGS THAT UNSCREW. I have been living with a couch that could have travelled flat for four years. Nobody told me. Bernard never told me.

The original screws are in a ziplock bag in the junk drawer. Old me was smarter than current me.`,
      },
      {
        from: 'me',
        ago: '24d 22h',
        md: `Plan:
- 8:00 van pickup
- 9:00 Noah and Dev arrive, coffee provided by you
- 9:00 to 11:00 load (boxes first, Bernard last, legs off)
- Noon at Marlowe St
- Pizza by 1, on me

Label the boxes by room. "MISC" is not a room.`,
      },
      {
        from: 'riley',
        ago: '14d 2h',
        md: `IT'S DONE. Bernard is in. I am lying on him right now and everything hurts.

Thank you thank you thank you. I owe you a lifetime supply of dumplings. I also owe Noah and Dev, but mostly you, because you carried the box marked MISC up three flights and never once asked what was in it.

R`,
      },
      {
        from: 'me',
        ago: '13d 20h',
        md: `Dumplings accepted. Ledger of the day: one couch, forty-seven boxes, one lamp I'm now convinced is haunted, and a staircase that sounds like a xylophone.

For the record, the box marked MISC contained a single oven mitt and a bag of cables. I have questions.

Jordan`,
      },
    ],
  },
  {
    subject: 'Feedback: design candidate panel (Isabel R.)',
    labels: ['work'],
    messages: [
      {
        from: 'sofia',
        ago: '18d 4h',
        md: `Hi Jordan,

Thanks for joining the portfolio review with Isabel Ramos yesterday. Could you submit your scorecard in the hiring tool by end of day tomorrow? Marcus and I are debriefing then.

Prompts if they help: craft, systems thinking, communication, and anything that would worry you in a team setting.

Thanks!
Sofia`,
      },
      {
        from: 'me',
        to: ['sofia'],
        cc: ['marcus'],
        ago: '17d 8h',
        md: `Submitted. Short version for the debrief:

- **Craft:** strong yes. The checkout redesign case study was thoughtful and she could explain every trade-off.
- **Systems thinking:** strong. She'd built a component library and talked about deprecating things, which almost nobody does.
- **Flag:** she said "we" for the whole team project and I couldn't tell what she personally owned. Worth probing in the final round.

Recommendation: advance.

Jordan`,
      },
      {
        from: 'marcus',
        to: ['sofia', 'me'],
        ago: '16d 6h',
        md: `Agree with Jordan on every count. That checkout error state? I want to steal it.

Let's move her to the final round. Sofia, can we do a paid design exercise? I'd keep it under 3 hours, no free labour, and something close to what she'd really do here: an empty state for a new feature.

Marcus`,
      },
    ],
  },
  {
    subject: 'Onboarding funnel: baseline numbers',
    labels: ['work'],
    messages: [
      {
        from: 'elena',
        ago: '16d',
        files: [['onboarding-funnel-baseline.png', 412_000]],
        md: `Hi Jordan,

Baseline for the onboarding work, before anyone redesigns anything. Last 8 weeks, 1,204 new workspaces:

- Named their workspace: 96%
- Connected a data source: 61%
- Invited a teammate: 44%
- Picked a starter board: 39%

First insight within 24 hours: 71% of those who connected, 9% of those who didn't. Blended, that's about 47% of all new workspaces. Median time to first insight is 26 minutes for people who connect a source in their first session, and 4.1 days for people who don't. Chart attached (log scale on the second panel, please forgive me).

The biggest drop is between steps 1 and 2. I'd start there.

Elena`,
      },
    ],
  },
  {
    subject: 'Pricing page: tier structure',
    labels: ['work', 'design'],
    important: true,
    messages: [
      {
        from: 'rachel',
        to: ['me', 'p_leah'],
        ago: '30d 5h',
        md: `Hi Jordan,

Kickoff notes for the pricing page, so we're aligned before you start.

Goal: lift self-serve conversion from 2.1% to 3% in the first quarter after launch. We have three paid tiers today (Starter, Team, Business) plus Enterprise as "Contact us".

Two open debates internally:
- Marketing wants to hide prices behind a "See plans" click. I want them visible. Transparent pricing is a differentiator for us.
- Should annual billing be the default toggle?

I've added Leah (product marketing) so you have both perspectives. Tell me what you need from us.

Rachel
--
Rachel Adeyemi
VP Product, Brightwave`,
      },
      {
        from: 'me',
        to: ['rachel', 'p_leah'],
        ago: '29d 20h',
        md: `Thanks Rachel, this is a clear brief. My first instincts:

- I'm with you on visible prices. Hiding them is a trust cost you pay on every visit.
- Annual by default, but show the monthly price clearly so nobody feels tricked. Test it.
- I'd like to explore two layouts: cards (friendlier) and a comparison table (better for evaluators).

Wireframes for both are in the Figma file: [Brightwave pricing wireframes](https://figma.example/file/brightwave-pricing). Let me know what you think.

Jordan`,
      },
      {
        from: 'p_leah',
        to: ['me', 'rachel'],
        ago: '29d 8h',
        md: `Love the cards! Feedback from the marketing side:

- Can Team be highlighted as "recommended"? It's our most-sold plan.
- The annual toggle should say "Save 20%", not "Save $240". Less math for people.
- Enterprise could be a full-width row under the cards, so it doesn't look like a fourth-class citizen.

Leah`,
      },
      {
        from: 'rachel',
        to: ['me', 'p_leah'],
        ago: '28d 22h',
        md: `Enterprise as a full-width row: yes.

Highlighting Team: I'm torn. Margin is best on Business, but the data says Team wins deals. Ugh. Jordan, what would you do?

Rachel`,
      },
      {
        from: 'me',
        to: ['rachel', 'p_leah'],
        ago: '28d 3h',
        md: `I'd highlight Team with "Most popular", but make Business the visual anchor at the right end with the strongest contrast. The eye lands on Team, then reads Business as the aspirational option. It nudges some people up without lying about which plan is popular.

Both variants (highlight / no highlight) are in the Figma file now so you can test properly. I'd suggest a two-week A/B once it's live.

Jordan`,
      },
      {
        from: 'rachel',
        to: ['me', 'p_leah'],
        ago: '21d 6h',
        md: `We're going with the highlight variant and an A/B against the plain layout. Engineering kicks off next week. Thank you for making this easy to decide.

Rachel`,
      },
      {
        from: 'p_leah',
        to: ['me'],
        cc: ['rachel'],
        ago: '17d 9h',
        md: `Final FAQ copy is below. Can you drop it into the page as an accordion?

1. **Can I change plans later?** Yes, any time. Changes are prorated.
2. **What counts as a seat?** Anyone who logs in during the billing period.
3. **Do you offer discounts for nonprofits?** Yes, 30% off Team and Business.

Thanks again for all of this!

Leah`,
      },
    ],
  },
  {
    subject: 'Save the date (+ a question)',
    labels: ['travel'],
    starred: true,
    messages: [
      {
        from: 'dev',
        ago: '24d 3h',
        files: [['Dev-Anika-save-the-date.pdf', 1_120_000]],
        md: `Jordan. Anika and I are getting married! (Okay, you knew that.) Formal save-the-date attached, so it's official.

Real question: will you do a reading during the ceremony? Not a toast, just a two-minute reading. Please don't say no. If you say no I will be very sad, quietly, for years.

Dev`,
      },
      {
        from: 'me',
        ago: '23d 17h',
        md: `Of course I'll do a reading. I'd be honoured. Send me the text when you have it. If it's Tennyson I'm quitting.

J`,
      },
      {
        from: 'dev',
        ago: '23d 6h',
        md: `It's Rilke. Or maybe Mary Oliver. Anika hasn't decided and I'm not allowed an opinion. I'll send it as soon as she does.

Registry is live, by the way. (Please don't buy the $400 stand mixer. That's a joke Anika's cousin added and nobody removed it.)

Dev`,
      },
      {
        from: 'me',
        ago: '18d 2h',
        md: `Registry viewed. I'm getting you the salt and pepper grinders, don't fight me.

RSVP is in: yes, and flights are booked. Congratulations again. I'm already nervous about the reading.`,
      },
    ],
  },
  {
    subject: 'Half marathon: group registration',
    messages: [
      {
        from: 'sam',
        ago: '24d 6h',
        files: [['race-waiver.pdf', 140_000]],
        md: `Registration for the river half marathon is open! The club is signing up as a group, so use the code EASTSIDE10 for 10% off. We have 22 of us so far, which makes us the biggest club in the race by a mile (pun regretted).

The race director needs a signed waiver from everyone before packet pickup. PDF attached. Print, sign, scan, and send it back to me and I'll bundle them.

Sam`,
      },
      {
        from: 'me',
        ago: '23d 21h',
        md: `In! I'll sign up tonight. Goal: sub 1:50. Is the training block still starting next week?`,
      },
      {
        from: 'sam',
        ago: '23d 8h',
        md: `It is. 12 weeks, three runs a week plus the long run on the weekend. Sub 1:50 is very doable. You ran the tune-up 10-miler at 8:20 pace with a cold.

I'll put you in the 8:15 group for the long runs. If it's too fast, tell me. If it's too slow, also tell me, but louder.

Sam`,
      },
      {
        from: 'me',
        ago: '19d 5h',
        files: [['race-waiver-signed.pdf', 152_000]],
        md: `Registered! Bib number 2417. Signed waiver attached. Thanks for the code, saved me $12.`,
      },
    ],
  },
  {
    subject: 'Invoice 0142: PO number and hours breakdown',
    labels: ['work', 'finance'],
    important: true,
    messages: [
      {
        from: 'sofia',
        ago: '22d 5h',
        md: `Hi Jordan,

Our finance system rejected Invoice 0142 because there's no PO number on it. Could you re-send with PO NL-2291?

Finance also asks for hours broken out by project (Onboarding, Dashboard, Design system) rather than one line.

Thanks, and sorry for the admin!
Sofia`,
      },
      {
        from: 'me',
        ago: '21d 20h',
        files: [['Invoice-0142.pdf', 96_400]],
        md: `Sorry about that. Corrected invoice attached, with the PO number added and hours split out:

- Onboarding: 41h
- Dashboard: 36h
- Design system: 19h

That's 96h at $95, so $9,120 in total, unchanged from the first version.

Jordan`,
      },
      {
        from: 'sofia',
        ago: '21d 3h',
        md: `Got it, thank you! It's in the approval queue. Net-30, so you should see payment within the usual window. Sorry again for the friction.

Sofia`,
      },
    ],
  },
  {
    subject: 'Found THE mono font for the query editor',
    labels: ['work', 'design', 'ideas'],
    messages: [
      {
        from: 'marcus',
        ago: '22d',
        md: `JORDAN. I found it.

The monospace font for the query editor. It has:
- A slashed zero (so 0 and O are never in doubt)
- Ligatures that don't get in the way (I turned off the arrow ones, you're welcome)
- A lowercase l that isn't a crime
- Tabular numbers, so query results line up like tiny soldiers

I made a comparison of five candidates in Figma, all set at 13px on our real dark editor background. It's the last frame. Please look at it before Kenji says "we should just use the system font".

Marcus`,
      },
    ],
  },
  {
    subject: 'Talk proposal: "Designing the Empty State"',
    labels: ['work', 'ideas'],
    messages: [
      {
        from: 'me',
        to: ['lucia'],
        ago: '24d 6h',
        files: [['talk-proposal-draft.docx', 38_400]],
        md: `Ciao Lucia,

As promised, here's a draft of the Frontier proposal. Working title: "Designing the Empty State". The pitch is that the empty state is the first real screen most people see, and we spend nearly all our design time on the full one.

I'm not sure the abstract lands. It reads a bit like a list of good things. Would love your honest read.

Jordan`,
      },
      {
        from: 'lucia',
        ago: '23d 15h',
        md: `Caro Jordan,

The idea is strong and the title is fine. The abstract buries the point. Two suggestions:

1. Open with a story. The screen that made you care: the empty dashboard a customer stared at for ten minutes. Start there, not with a definition.
2. End with something an audience can do the next morning. Three concrete takeaways. Committees love a list, and audiences remember one.

Also, cut "in today's fast-paced product world". Nobody has ever believed that sentence.

Un abbraccio,
--
Lucia Ferraro
Politecnico`,
      },
      {
        from: 'me',
        ago: '22d 20h',
        files: [['talk-proposal-final.docx', 41_000]],
        md: `Rewritten with the story first and three takeaways at the end, and the fast-paced sentence has been deleted with prejudice. Submitted this morning. Final version attached.

Thank you. I'd never have cut that opening paragraph on my own.`,
      },
    ],
  },
  {
    subject: 'Lisbon: flights + Airbnb (who owes who)',
    labels: ['travel', 'finance'],
    messages: [
      {
        from: 'chloe',
        ago: '28d 5h',
        files: [['lisbon-costs.xlsx', 34_800]],
        md: `Flights are booked! I put them on my card, plus the first Airbnb deposit. I made a little sheet so we don't argue later. (We will argue later.)

- Flights: $436 each
- Airbnb total: $1,240 for five nights, deposit already paid: $310 (your half is $155)
- You owe me for now: $591

The balance of $930 is due before we arrive, so $465 each. Sheet attached.

C x`,
      },
      {
        from: 'me',
        ago: '27d 22h',
        md: `Sent $591 by bank transfer just now, reference LISBON. Sheet looks right.

Can we add a tab for shared expenses (food, taxis, gelato) and settle at the end instead of every time one of us buys a coffee? Splitwise?`,
      },
      {
        from: 'chloe',
        ago: '24d 6h',
        md: `Splitwise it is. I made a group called "Lisbon or bust" and invited you. Got your $591, thank you ✅

I've also started an itinerary. I'll send it soon and you can tell me everything I got wrong.`,
      },
    ],
  },
  {
    subject: 'Advice: freelance vs. full-time',
    labels: ['work', 'ideas'],
    messages: [
      {
        from: 'me',
        to: ['lucia'],
        ago: '33d 5h',
        md: `Ciao Lucia,

I hope Milan is treating you well. I wanted to ask for your perspective on something I keep going around in circles about.

Three years into freelancing, things are good: Northlight three days a week, Brightwave and Larkspur on the side, and I'm rarely short of work. But I've started to feel like I'm doing three jobs plus a fourth one called "context switching". Tom has floated bringing me on full-time at Northlight, and a couple of recruiters have been getting in touch.

I don't know whether I want more stability, or more focus, or if I'm just tired. What would you ask yourself in my position?

Jordan`,
      },
      {
        from: 'lucia',
        ago: '32d 20h',
        md: `Caro Jordan,

Lovely to hear from you. Milan is grey and I am happy.

I don't think this is a dilemma yet. It sounds like tiredness dressed up as a career question. But let me ask what I always ask my students:

1. What are you optimising for over the next three years: craft depth, income stability, or leverage (the ability to choose what you work on)?
2. Which of your three clients gives you energy, and which one takes it?
3. If Tom offered full-time tomorrow, what would you feel first: relief or a small drop in your stomach?

Answer in an email. Don't answer in your head. Your head lies more than your inbox.

Un abbraccio,
--
Lucia Ferraro
Politecnico`,
      },
      {
        from: 'me',
        ago: '31d 8h',
        md: `Ok, I wrote it down, as instructed.

1. Craft depth and leverage. Stability matters less than I thought.
2. Northlight and Larkspur give me energy. The third one, a client I'll leave unnamed, mostly takes it.
3. A small drop in my stomach. Definitely.

So maybe the answer is fewer clients and longer engagements, not a job. Keep Northlight at three days, keep Larkspur, wind down the rest.

Jordan`,
      },
      {
        from: 'lucia',
        ago: '30d 11h',
        md: `That is a decision, not a dilemma. I'm pleased.

Three things:
- Raise your rate on new work by 20%. Say it without apologising. If nobody flinches, you were too low.
- Write. One essay a quarter about something you've learned from your work. It compounds, and it turns clients into people who come to you.
- Speak. The Frontier Design Summit call for proposals opens soon. Your empty-state work would be perfect.

Send me the draft when you have one.

Un abbraccio,
--
Lucia Ferraro
Politecnico`,
      },
      {
        from: 'me',
        ago: '25d 4h',
        md: `Update: new clients are now at $110/hour, and the two conversations I've had since didn't blink. The essay has an outline (working title: "The screen nobody designs").

And yes, I'm submitting to Frontier. Draft to you in a day or two.

Thank you, truly.

Jordan`,
      },
    ],
  },
  {
    subject: 'Lease renewal offer',
    labels: ['finance'],
    starred: true,
    important: true,
    messages: [
      {
        from: 'marta',
        ago: '40d 6h',
        files: [['lease-renewal-draft.docx', 58_600]],
        md: `Dear Jordan,

Your lease ends in about two months, and I'd love for you to stay. I'm offering a 12-month renewal at $2,150 per month (currently $2,050). The draft is attached; please have a read.

Everything else stays the same. If you'd like to renew, let me know by the end of the month and I'll prepare the final paperwork.

Kind regards,
--
Marta Kowalski
Kowalski Properties`,
      },
      {
        from: 'me',
        ago: '39d 21h',
        md: `Hi Marta,

Thank you, I'd like to renew. The increase is a bit more than I'd budgeted, though. I've been here three years without a late payment, and I've always been easy about access and repairs. Would $2,100 be possible?

Jordan`,
      },
      {
        from: 'marta',
        ago: '38d 12h',
        md: `Thank you for being upfront, Jordan. Property taxes went up this year, so I can't go as low as $2,100. Here is what I can do: $2,125 on a two-year term, and I'll replace the old fridge (twelve years old and increasingly dramatic). That locks the rent for two years.

Marta`,
      },
      {
        from: 'me',
        ago: '35d 8h',
        md: `A two-year term with the new fridge works for me. Two small requests:

- Could the fridge replacement be written into the lease, within 30 days of signing?
- Could we add a clause allowing me to leave early with 60 days' notice? My income is variable, and I'd rather not feel trapped in year two.

Jordan`,
      },
      {
        from: 'marta',
        ago: '27d 4h',
        files: [['lease-renewal-final.docx', 61_200]],
        md: `Both agreed. The fridge is in clause 7 (within 30 days), and the early exit is in clause 9 with 60 days' notice and a two-month rent penalty, which is the most I can offer.

New version attached. Please sign and return, and I'll countersign.

Best,
Marta`,
      },
      {
        from: 'me',
        ago: '26d 20h',
        files: [['lease-renewal-signed.pdf', 1_950_000]],
        md: `Signed copy attached. Thanks Marta, and thanks for being reasonable about all of it. Looking forward to the fridge!

Jordan`,
      },
    ],
  },
  {
    subject: 'Research readout: billing pain points',
    labels: ['work', 'design'],
    messages: [
      {
        from: 'me',
        to: ['rachel'],
        ago: '31d 9h',
        files: [['Brightwave-research-readout.pdf', 6_420_000]],
        md: `Hi Rachel,

The research readout is attached. Twelve interviews with billing admins across your customer segments. The three findings that matter most:

1. **They can't find invoices** (7 of 12). Most searched their email instead of the product.
2. **"Seats" vs. "members" is confusing** (9 of 12). Several assumed a member who never logs in is still billed.
3. **They want to change payment methods without contacting support** (5 of 12).

Favourite quote, from a finance manager: *"I just want to know what I'm going to be charged next month."* That sentence is the design brief for the whole billing area.

Clips and full notes are in the appendix.

Jordan`,
      },
      {
        from: 'rachel',
        ago: '30d 17h',
        md: `This is gold. The seats vs. members finding especially. Support gets around 40 tickets a week on exactly that and nobody had connected it to the pricing language.

Can you present it to the product leads? 30 minutes next week, maybe with the clips.

Rachel`,
      },
      {
        from: 'me',
        ago: '28d 10h',
        md: `Happy to. I'll cut it to ten slides and lead with the finance manager clip. I'd also like to walk through the invoice list mock, since it directly answers finding #1.

Should Leah join? The seats/members language is really a marketing question too.`,
      },
    ],
  },

  // ───────────────────────── 1 to 2.5 months ─────────────────────────
  // @@MORE@@
];

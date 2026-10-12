import type { Att, Category, Label, Msg, Person, State, Thread } from './types'

export const ME: Person = { name: 'Alex Morgan', email: 'alex.morgan@gmail.com' }
const P = (name: string, email: string): Person => ({ name, email })
export const PEOPLE = {
  priya: P('Priya Nair', 'priya@lumen.design'), marcus: P('Marcus Webb', 'marcus.webb@northbeam.io'),
  sofia: P('Sofia Reyes', 'sofia.reyes@northbeam.io'), dan: P('Dan Okafor', 'dan.okafor@northbeam.io'),
  mom: P('Mom', 'linda.morgan@hey.com'), jonah: P('Jonah Fischer', 'jonah.fischer@gmail.com'),
  hana: P('Hana Sato', 'hana.sato@outlook.com'), leo: P('Leo Bianchi', 'leo@bianchi.studio'),
  tessa: P('Tessa Whitmore', 'tessa.whitmore@brightpath.edu'), ravi: P('Ravi Menon', 'ravi@menon.dev'),
  north: P('Skyline Airways', 'reservations@skyline-air.com'), pay: P('Paylane', 'receipts@paylane.com'),
  forge: P('Forge', 'notifications@forge.dev'), cal: P('Google Calendar', 'calendar-notification@calendar.example'),
  brief: P('The Daily Brief', 'editor@dailybrief.news'), linkup: P('Linkup', 'messages@linkup.example'),
  bank: P('Harbor Bank', 'alerts@harborbank.com'), grocer: P('Fieldstone Market', 'hello@fieldstone.market'),
  gym: P('Pulse Fitness', 'team@pulsefit.club'), stream: P('Streamly', 'no-reply@streamly.tv'),
  landlord: P('Carla Jimenez', 'carla@oakhurstproperties.com'), ship: P('ParcelHub', 'tracking@parcelhub.co'),
  cloud: P('Nimbus Cloud', 'billing@nimbus.cloud'), photo: P('Snapshelf', 'hello@snapshelf.app'),
  alumni: P('Brightpath Alumni', 'alumni@brightpath.edu'), doctor: P('Dr. Amara Osei', 'frontdesk@eastsidefamily.health'),
  notion: P('Notebook', 'team@notebook.so'), trail: P('Trailhead', 'hikes@trailhead.club'), 
}
const H = 3600e3
let mid = 0
const NOW = Date.now()
const at = (h: number) => NOW - h * H
const att = (name: string, size: number, kind: Att['kind']): Att => ({ id: 'a' + (++mid), name, size, kind })
const p = (...s: string[]) => s.map((x) => `<p>${x}</p>`).join('')
const m = (from: Person, h: number, html: string, o: { to?: Person[]; cc?: Person[]; atts?: Att[] } = {}): Msg =>
  ({ id: 'm' + (++mid), from, to: o.to ?? (from.email === ME.email ? [PEOPLE.priya] : [ME]), cc: o.cc, date: at(h), html, atts: o.atts })
let tid = 0
const T = (subject: string, category: Category, msgs: Msg[], f: Partial<Thread> = {}): Thread =>
  ({ id: 't' + (++tid), subject, category, labels: [], inbox: true, starred: false, unread: false, trashed: false, spam: false, important: false, messages: msgs, ...f })

export const LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#1a73e8' }, { id: 'personal', name: 'Personal', color: '#188038' },
  { id: 'travel', name: 'Travel', color: '#e37400' }, { id: 'finance', name: 'Finance', color: '#8430ce' },
  { id: 'receipts', name: 'Receipts', color: '#12857a' },
]

function threads(): Thread[] {
  const { priya, marcus, sofia, dan, mom, jonah, hana, leo, tessa, ravi } = PEOPLE
  return [
    T('Q4 roadmap — final review before Thursday', 'primary', [
      m(marcus, 52, p('Hi team,', 'I pulled together the Q4 roadmap draft. Three big bets: the new onboarding flow, offline mode, and the pricing experiment. Please leave comments in the doc by Wednesday EOD so we can lock it Thursday.', 'Marcus'), { to: [ME, sofia, dan], atts: [att('Q4-roadmap-draft-v3.pdf', 2_400_000, 'pdf')] }),
      m(sofia, 30, p('Looks great overall. One concern: offline mode feels like a two-quarter effort to me. Can we scope down to read-only for Q4?'), { to: [marcus, ME, dan] }),
      m(dan, 26, p('+1 on Sofia. Engineering can commit to read-only cache + queued writes for the messaging surface. Full conflict resolution can be Q1.'), { to: [marcus, ME, sofia] }),
      m(marcus, 5, p('Great, that is the direction. Alex, can you update the milestone slide and the risk table? I will present to leadership at 2pm Thursday.', 'Also — shout if the pricing experiment timeline looks tight from your side.'), { to: [ME, sofia, dan] }),
    ], { unread: true, starred: true, important: true, labels: ['work'] }),
    T('Your boarding pass for SKY 482 · SFO → JFK', 'updates', [
      m(PEOPLE.north, 20, p('<b>You are checked in.</b> Your boarding pass for Friday, Oct 3 is attached.', 'Departure 7:05 AM · Gate 22B · Seat 14A', 'Boarding closes 20 minutes before departure. Please arrive at least 90 minutes before your flight.'), { atts: [att('boarding-pass-SKY482.pdf', 184_000, 'pdf')] }),
    ], { unread: true, labels: ['travel'], important: true }),
    T('Dinner Sunday?', 'primary', [
      m(mom, 9, p('Hi sweetheart, are you still coming for dinner on Sunday? Dad wants to make his famous lasagna. Bring Jonah if he is free!', 'Love, Mom')),
      m(ME, 7, p('Yes! I will be there around 5. I will ask Jonah — and I can bring dessert.'), { to: [mom] }),
      m(mom, 3, p('Wonderful. Nothing too fancy, your father has already bought three kinds of cheese. 🧀'), {}),
    ], { unread: true, labels: ['personal'], starred: true }),
    T('Invitation: Design critique @ Wed Oct 1, 3pm – 4pm (PDT)', 'updates', [
      m(PEOPLE.cal, 14, p('<b>Design critique</b>', 'Wednesday, Oct 1 · 3:00 – 4:00pm (Pacific Time)', 'Organizer: Priya Nair · Guests: Alex Morgan, Marcus Webb, Sofia Reyes, +4 more', 'Join with video call: meet.example/dsg-crit'), { atts: [att('invite.ics', 2_100, 'cal')] }),
    ], { unread: true, labels: ['work'] }),
    T('Re: Brand refresh — illustration options', 'primary', [
      m(priya, 80, p('Hey Alex! Attaching the three illustration directions we discussed. My favorite is B — friendlier and it scales better in the product UI.', 'Let me know what you think and I will refine.'), { atts: [att('illustration-A.png', 1_800_000, 'image'), att('illustration-B.png', 2_100_000, 'image'), att('illustration-C.png', 1_950_000, 'image')] }),
      m(ME, 70, p('These are fantastic. I agree on B. Could we try a warmer palette for the hero? The current blues feel a little cold next to our new type.'), { to: [priya] }),
      m(priya, 48, p('Great note. I will send warmer variants by Friday. Also: could you share the final copy for the empty states? I would like to design around real text.'), {}),
      m(ME, 46, p('Will do — pulling it together now.'), { to: [priya] }),
      m(priya, 2, p('Perfect, thank you! Speak Wednesday at the critique.'), {}),
    ], { unread: true, labels: ['work'] }),
    T('Receipt from Paylane — $42.00 to Fieldstone Market', 'updates', [
      m(PEOPLE.pay, 27, p('<b>Payment receipt</b>', 'You paid <b>$42.00</b> to Fieldstone Market on Sep 28.', 'Card ending in 4417 · Receipt #PL-88214'), { atts: [att('receipt-88214.pdf', 42_000, 'pdf')] }),
    ], { labels: ['receipts'] }),
    T('[forge/atlas] Pull request #482: Add offline queue for outgoing messages', 'updates', [
      m(PEOPLE.forge, 38, p('<b>ravi-menon</b> opened a pull request in <b>forge/atlas</b>', '<b>Add offline queue for outgoing messages</b>', '+412 −38 across 9 files. Reviewers requested: alex-morgan.', 'View pull request on Forge.')),
      m(ravi, 12, p('Hey Alex — when you get a chance, could you review #482? It unblocks the offline milestone. No rush before tomorrow afternoon.'), {}),
    ], { unread: true, labels: ['work'] }),
    T('Weekend hike? Forecast looks perfect', 'primary', [
      m(jonah, 6, p('Yo. Saturday looks clear — 68°F and no wind. Want to do Ridgeline Loop? ~9 miles, leave at 7:30 so we beat the crowd.'), {}),
      m(ME, 5, p('In. I will bring the good coffee.'), { to: [jonah] }),
    ], { labels: ['personal'] }),
    T('Your September statement is ready', 'updates', [
      m(PEOPLE.bank, 60, p('Your Harbor Bank checking statement for September is now available in the app.', 'Account ending 2209 · Ending balance $6,418.22'), { atts: [att('statement-2025-09.pdf', 310_000, 'pdf')] }),
    ], { labels: ['finance'] }),
    T('Notes from user research sessions (5 of 8 done)', 'primary', [
      m(sofia, 100, p('Sharing the raw synthesis so far. Big themes: people love the search speed, hate the way labels are buried on mobile, and almost nobody discovers keyboard shortcuts.', 'Spreadsheet has all quotes tagged by theme.'), { to: [ME, marcus], atts: [att('research-synthesis.xlsx', 96_000, 'sheet'), att('session-clips.zip', 48_200_000, 'zip')] }),
      m(ME, 90, p('This is gold, thanks Sofia. The label discoverability point lines up with what support tickets say. Let me draft a proposal.'), { to: [sofia, marcus] }),
    ], { starred: true, labels: ['work'] }),
    T('The Daily Brief: chips, cheese, and a very quiet Fed meeting', 'promotions', [
      m(PEOPLE.brief, 4, p('<b>Good morning.</b> Here is what matters today.', '1. Chipmakers rally after supply guidance beat expectations.', '2. A quiet central bank meeting leaves markets guessing on rates.', '3. Scientists report a cheaper way to make green hydrogen.', 'Read the full edition online.')),
    ], { unread: true }),
    T('30% off everything — this weekend only', 'promotions', [
      m(PEOPLE.gym, 11, p('<b>Fall Refresh Sale</b>', 'Get 30% off annual memberships and bring a friend free through Sunday. Use code <b>FALL30</b> at checkout.')),
    ]),
    T('Your package is out for delivery', 'updates', [
      m(PEOPLE.ship, 3, p('<b>Out for delivery</b> — arriving today by 8 PM.', 'Package from Bianchi Studio · Tracking 1Z 999 AA1 01 2345 6784', 'Delivery photo will be sent once dropped off.')),
    ], { unread: true, labels: ['receipts'] }),
    T('Lease renewal — 2410 Oak St #4', 'primary', [
      m(PEOPLE.landlord, 150, p('Hi Alex, your lease ends Nov 30. I am happy to renew for 12 months at $2,180/mo (a 3% increase). Please confirm by Oct 15 so I can prepare the paperwork.'), { atts: [att('lease-renewal-2026.pdf', 520_000, 'pdf')] }),
      m(ME, 120, p('Thanks Carla. Could we do 12 months at $2,150? I have been a reliable tenant and would love to stay long-term.'), { to: [PEOPLE.landlord] }),
      m(PEOPLE.landlord, 100, p('Let me check with the owner and get back to you by Friday.')),
    ], { labels: ['personal', 'finance'], important: true }),
    T('Congrats on 3 years at Northbeam!', 'social', [
      m(PEOPLE.linkup, 40, p('<b>Hana Sato</b> and 12 others congratulated you on your work anniversary.', 'See who is celebrating with you this week.')),
    ], { unread: true }),
    T('New connection request from Tessa Whitmore', 'social', [
      m(PEOPLE.linkup, 70, p('<b>Tessa Whitmore</b>, Professor at Brightpath University, wants to connect.', 'You have 4 mutual connections.')),
    ]),
    T('Photo book: your summer trip is ready', 'promotions', [
      m(PEOPLE.photo, 130, p('We turned <b>Lisbon, July 2025</b> into a photo book draft. 62 pages, 148 photos.', 'Finish it by Oct 6 to get free shipping.')),
    ]),
    T('Guest lecture next month?', 'primary', [
      m(tessa, 200, p('Dear Alex, I am organizing the autumn speaker series at Brightpath and would love for you to give a 45-minute talk on designing fast interfaces. Dates open: Nov 6 or Nov 13.', 'We can do it remotely if easier. Honorarium included.', 'Warmly, Tessa')),
      m(ME, 180, p('Hi Tessa — what an honor. Nov 13 works well. Happy to do remote. What audience size should I expect?'), { to: [tessa] }),
      m(tessa, 160, p('Roughly 120 students plus faculty. I will send a formal invite and logistics next week. Thank you!')),
    ], { labels: ['work'] }),
    T('Lisbon photos 📸', 'primary', [
      m(hana, 700, p('Finally got the photos sorted! The one of us at the tram stop is my favorite. Link to the shared album below.', 'https://photos.example/lisbon-2025'), { atts: [att('tram-stop.jpg', 3_200_000, 'image'), att('sunset-miradouro.jpg', 2_800_000, 'image')] }),
      m(ME, 690, p('Oh these are so good!! The sunset one is going on my wall.'), { to: [hana] }),
    ], { labels: ['travel', 'personal'], starred: true }),
    T('Logo files + invoice #0142', 'primary', [
      m(leo, 300, p('Hey Alex, here are the final logo files (SVG, PNG, and the dark variant) along with invoice #0142. Thanks again for being such a great client!', 'Leo'), { atts: [att('logo-pack-final.zip', 8_400_000, 'zip'), att('invoice-0142.pdf', 88_000, 'pdf')] }),
    ], { labels: ['receipts', 'finance'] }),
    T('Reminder: annual checkup on Oct 9 at 10:20 AM', 'updates', [
      m(PEOPLE.doctor, 96, p('This is a reminder of your appointment with <b>Dr. Amara Osei</b> on <b>Thursday, Oct 9 at 10:20 AM</b>.', 'Please arrive 10 minutes early. Reply C to confirm or R to reschedule.')),
    ], { labels: ['personal'] }),
    T('Your Streamly bill is going up', 'promotions', [
      m(PEOPLE.stream, 220, p('Starting Nov 1 your plan will cost $17.99/mo (was $15.99). You can change or cancel your plan anytime in Account settings.')),
    ]),
    T('Nimbus Cloud: usage alert — 85% of storage used', 'updates', [
      m(PEOPLE.cloud, 42, p('Your workspace has used <b>85%</b> of its 200 GB storage.', 'Upgrade to 1 TB for $9.99/mo or clean up large files to stay under your limit.')),
    ], { labels: ['finance'] }),
    T('Trail day recap + gear list', 'social', [
      m(PEOPLE.trail, 260, p('Thanks for joining Saturday\'s group hike! 14 hikers, 7.2 miles, zero blisters (mostly).', 'Next hike: Fern Canyon on Oct 11. RSVP inside.')),
    ]),
    T('Notebook: 5 templates our team loves', 'promotions', [
      m(PEOPLE.notion, 88, p('Meeting notes, roadmaps, OKRs, and more — see the five most-duplicated templates this month.')),
    ]),
    T('Pairing on the search index?', 'primary', [
      m(ravi, 170, p('I have an idea for making search results appear as you type without hitting the network — precomputed trigram index in IndexedDB. Want to pair on Thursday morning?'), {}),
      m(ME, 165, p('Love it. 10am works. I will bring a few edge cases (diacritics, CJK).'), { to: [ravi] }),
      m(ravi, 160, p('Booked. 🚀')),
    ], { labels: ['work'] }),
    T('Farmers market this weekend', 'promotions', [
      m(PEOPLE.grocer, 50, p('Apples, squash, and fresh sourdough are back. Members get first pick Saturday 8–9am.')),
    ]),
    T('Congratulations! You have been selected 🎉', 'promotions', [
      m(P('Prize Center', 'winner@claim-your-prize.biz'), 30, p('You won a $500 gift card!! Click here within 24 hours to claim. Limited time.')),
    ], { inbox: false, spam: true }),
    T('Old thread: apartment furniture', 'primary', [
      m(jonah, 900, p('Selling my old desk if you want it. $60, bring a friend to carry it.')),
      m(ME, 880, p('I am set, thanks though!'), { to: [jonah] }),
    ], { inbox: false, labels: ['personal'] }),
    T('Sprint planning notes — Sept 15', 'primary', [
      m(dan, 330, p('Notes from planning: velocity 34, carry-over 3 stories, we agreed to timebox the sync-engine spike to 3 days.'), { to: [ME, marcus, sofia] }),
    ], { inbox: false, labels: ['work'] }),
    T('Welcome to Trailhead!', 'social', [
      m(PEOPLE.trail, 1400, p('Welcome aboard, Alex! Here is how to find your first group hike.')),
    ], { inbox: false, trashed: true }),
    T('Return label for order #55210', 'updates', [
      m(PEOPLE.ship, 500, p('Your return label is attached. Drop the package at any ParcelHub location within 14 days.'), { atts: [att('return-label.pdf', 60_000, 'pdf')] }),
    ], { inbox: false, trashed: true }),
  ]
}

export function seedState(): State {
  const ts = threads()
  const contacts: Person[] = Object.values(PEOPLE).filter((x) => !x.email.match(/no-reply|notifications|receipts|alerts|calendar|messages|editor|billing|tracking|reservations|team@|hello@|hikes@|winner/))
  return {
    threads: ts, drafts: [
      { id: 'd1', to: ['tessa.whitmore@brightpath.edu'], cc: [], bcc: [], subject: 'Talk abstract for Nov 13', html: p('Hi Tessa,', 'Here is a first pass at the abstract for the talk: <i>Designing interfaces that feel instant</i>. We will look at perceived performance, optimistic UI, and why every millisecond of feedback matters.'), atts: [], updatedAt: at(8) },
      { id: 'd2', to: [], cc: [], bcc: [], subject: '', html: p('Ideas for the offsite agenda: ...'), atts: [], updatedAt: at(30) },
    ], scheduled: [
      { id: 's1', sendAt: NOW + 20 * H, draft: { id: 's1d', to: ['marcus.webb@northbeam.io'], cc: [], bcc: [], subject: 'Milestone slide + risk table', html: p('Hi Marcus,', 'Updated the milestone slide and the risk table. Pricing experiment risk is now flagged amber.', 'Alex'), atts: [], updatedAt: at(1) } },
    ],
    labels: LABELS, contacts, recent: ['from:priya', 'has:attachment', 'is:unread'],
    settings: { theme: 'system', density: 'comfortable', tabs: true, signature: '— Alex', undoSeconds: 8, autoReply: true, preview: true },
  }
}

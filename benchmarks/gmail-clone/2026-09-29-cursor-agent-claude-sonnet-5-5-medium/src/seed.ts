import type { Attachment, Box, Category, Contact, MailState, Message, Thread } from './types'

export const ME = 'alex.morgan@mail.com'
export const ME_NAME = 'Alex Morgan'

export const CONTACTS: Contact[] = [
  { name: 'Priya Raman', email: 'priya.raman@northwind.dev' },
  { name: 'Marcus Lee', email: 'marcus.lee@northwind.dev' },
  { name: 'Sofia Alvarez', email: 'sofia@alvarez.design' },
  { name: 'Grace Liu', email: 'grace.liu@northwind.dev' },
  { name: 'Hannah Weiss', email: 'hannah.weiss@fastmail.com' },
  { name: 'Tom Bennett', email: 'tom.bennett@outlook.com' },
  { name: 'Elena Petrova', email: 'elena@talentbridge.io' },
  { name: 'Jamal Carter', email: 'jamal.carter@gmail.com' },
  { name: 'Daniel Okafor', email: 'daniel.okafor@okaforlaw.com' },
  { name: 'Dr. Mei Tanaka', email: 'frontdesk@bayviewdental.com' },
  { name: 'Noah Fischer', email: 'noah.fischer@northwind.dev' },
  { name: 'GitHub', email: 'notifications@github.com' },
  { name: 'Stripe', email: 'receipts@stripe.com' },
  { name: 'Linear', email: 'notifications@linear.app' },
  { name: 'Skyline Airways', email: 'bookings@skylineair.com' },
  { name: 'Loop Coffee', email: 'hello@loopcoffee.co' },
  { name: 'Fable Outfitters', email: 'deals@fableoutfitters.com' },
  { name: 'Circle', email: 'no-reply@circle.social' },
  { name: 'Pinnacle Bank', email: 'alerts@pinnaclebank.com' },
  { name: 'The Weekly Byte', email: 'news@weeklybyte.dev' },
  { name: 'Stayly', email: 'trips@stayly.com' },
  { name: 'Northwind Calendar', email: 'calendar@northwind.dev' },
  { name: 'Deploybot', email: 'deploybot@northwind.dev' },
  { name: 'Trailhead', email: 'events@trailhead.club' },
]

const H = 3600e3
const D = 24 * H

const p = (...x: string[]) => x.map((t) => `<p>${t}</p>`).join('')
const att = (name: string, size: number, kind: Attachment['kind']): Attachment => ({ name, size, kind })

interface TOpts {
  box?: Box
  cat?: Category
  labels?: string[]
  starred?: boolean
  read?: boolean
  snoozedUntil?: number
}

export function seedState(): MailState {
  const now = Date.now()
  let mid = 0
  const m = (from: string, ago: number, html: string, o: { to?: string[]; cc?: string[]; att?: Attachment[] } = {}): Message => ({
    id: `m${++mid}`,
    from,
    to: o.to || (from === ME ? [] : [ME]),
    cc: o.cc,
    date: now - ago,
    html,
    attachments: o.att,
  })
  const threads: Thread[] = []
  const t = (subject: string, messages: Message[], o: TOpts = {}) => {
    threads.push({
      id: `t${threads.length + 1}`,
      subject,
      messages: messages.sort((a, b) => a.date - b.date),
      box: o.box || 'inbox',
      category: o.cat || 'primary',
      labels: o.labels || [],
      starred: !!o.starred,
      read: o.read ?? false,
      snoozedUntil: o.snoozedUntil,
    })
  }

  const priya = 'priya.raman@northwind.dev', marcus = 'marcus.lee@northwind.dev', sofia = 'sofia@alvarez.design', grace = 'grace.liu@northwind.dev'
  const hannah = 'hannah.weiss@fastmail.com', tom = 'tom.bennett@outlook.com', elena = 'elena@talentbridge.io', jamal = 'jamal.carter@gmail.com'
  const daniel = 'daniel.okafor@okaforlaw.com', noah = 'noah.fischer@northwind.dev'

  t('Q4 roadmap review – pre-read and open questions', [
    m(priya, 26 * H, p('Hi team,', 'Sharing the draft Q4 roadmap ahead of Thursday. Three things I&rsquo;d like everyone to react to before the review:', '<ol><li>Do we ship the offline sync beta in October or hold for the reliability work?</li><li>Is the billing migration realistic with two engineers?</li><li>What are we willing to cut if the mobile release slips?</li></ol>', 'Comments in the doc are fine; I&rsquo;ll consolidate on Wednesday night.', 'Thanks,<br>Priya'), { to: [ME, marcus, grace, sofia], att: [att('Q4-roadmap-draft.pdf', 2411000, 'pdf')] }),
    m(marcus, 22 * H, p('Offline sync is close, but I&rsquo;d hold it until the conflict-resolution bug (ATL-482) is fixed. We&rsquo;ve seen two data-loss reports in staging.', 'Billing migration with two engineers: possible only if we drop the invoice PDF redesign.'), { to: [priya, ME, grace, sofia] }),
    m(ME, 20 * H, p('Agree with Marcus on sync. I can take the billing migration if Noah pairs on the webhook handlers. Let&rsquo;s cut the PDF redesign and revisit in Q1.'), { to: [priya, marcus, grace, sofia] }),
    m(grace, 3 * H, p('Good discussion. Let&rsquo;s lock: <b>hold sync</b>, <b>ship billing migration</b>, cut PDF redesign. Priya, please update the doc and I&rsquo;ll bring it to leadership on Thursday.', 'One more ask: can someone estimate the mobile release risk in a few bullets?'), { to: [priya, ME, marcus, sofia] }),
  ], { labels: ['work'], starred: true })

  t('Your receipt from Stripe – Invoice #INV-20931', [
    m('receipts@stripe.com', 5 * H, p('<b>Receipt from Northwind Labs</b>', 'Amount paid: <b>$249.00</b><br>Paid on ' + new Date(now - 5 * H).toDateString(), 'This charge will appear on your statement as NORTHWIND LABS.'), { att: [att('Invoice-INV-20931.pdf', 84000, 'pdf')] }),
  ], { cat: 'updates', labels: ['receipts', 'finance'] })

  t('[northwind/atlas] Fix race condition in sync queue (#1284)', [
    m('notifications@github.com', 40 * 60e3, p('<b>marcus-lee</b> requested your review on <a href="#">#1284</a>.', 'This PR guards the sync queue with a per-document lock and adds a regression test for interleaved writes.', '<pre>+ const release = await lock.acquire(doc.id)\n+ try { await flush(doc) } finally { release() }</pre>', '&mdash;<br>Reply to this email directly or view it on GitHub.')),
  ], { cat: 'updates', labels: ['work'] })

  t('Weekend in Lisbon – flight confirmation SK 418', [
    m('bookings@skylineair.com', 3 * D, p('<b>You&rsquo;re going to Lisbon!</b>', 'Confirmation code: <b>X7Q2LM</b>', '<table class="kv"><tr><td>Outbound</td><td>Fri, Oct 16 &middot; SFO 6:45 PM &rarr; LIS 1:20 PM+1</td></tr><tr><td>Return</td><td>Tue, Oct 20 &middot; LIS 11:05 AM &rarr; SFO 3:10 PM</td></tr><tr><td>Seat</td><td>23A</td></tr></table>', 'Check-in opens 24 hours before departure.'), { att: [att('Boarding-pass-SK418.pdf', 212000, 'pdf'), att('Itinerary.ics', 3200, 'cal')] }),
    m(ME, 3 * D - 2 * H, p('Booked! Sending the itinerary your way so you can line up the apartment.'), { to: [jamal], att: [att('Itinerary.ics', 3200, 'cal')] }),
    m(jamal, 3 * D - 5 * H, p('Legend. I found an Airbnb in Alfama with a terrace, will send the link tonight. Bring a jacket, it gets windy.')),
  ], { cat: 'primary', labels: ['travel'], starred: true, read: true })

  t('Lunch Thursday?', [
    m(tom, 2 * H, p('Hey! In town Thursday. Free for lunch? That ramen place on Valencia you keep talking about?')),
  ], { labels: ['personal'] })

  t('Design review: new onboarding flow (Figma link inside)', [
    m(sofia, 7 * H, p('Hey Alex,', 'I updated the onboarding flow with the feedback from last week: shorter steps, better empty states, and a skip option on the permissions screen.', '<a href="#">figma.com/file/onboarding-v3</a>', 'Can you check whether the animation specs are feasible in React Native? Attached the frames as a reference.'), { att: [att('onboarding-v3-frames.zip', 18400000, 'zip'), att('empty-states.png', 940000, 'image')] }),
  ], { labels: ['work'] })

  t('Your monthly statement is ready', [
    m('alerts@pinnaclebank.com', 1 * D + 3 * H, p('Your September statement for account ending <b>4821</b> is now available.', 'Available balance: <b>$8,412.66</b>', 'For your security, we never include account numbers or links to sign in in email. Open the Pinnacle app to view your statement.')),
  ], { cat: 'updates', labels: ['finance'], read: true })

  t('Dentist appointment reminder – Tue, Oct 6 at 9:30 AM', [
    m('frontdesk@bayviewdental.com', 18 * H, p('Hello Alex,', 'This is a friendly reminder of your cleaning appointment with Dr. Tanaka on <b>Tuesday, October 6 at 9:30 AM</b>.', 'Please reply <b>C</b> to confirm or call us at (415) 555-0142 to reschedule.', 'Bayview Dental')),
  ], { labels: ['personal'] })

  t('Happy belated birthday + Mom’s 70th plans', [
    m(hannah, 2 * D + 4 * H, p('Alex! Sorry I&rsquo;m late with this. Hope the birthday was great.', 'Mom&rsquo;s 70th is on Nov 14. I&rsquo;m thinking a small dinner at Osteria, ~14 people. Can you handle the cake and the slideshow of old photos? I&rsquo;ll do the booking and invites.', 'Love,<br>Hannah')),
    m(ME, 2 * D, p('Happy to! I&rsquo;ll dig through the old albums this weekend. Cake: lemon or chocolate?'), { to: [hannah] }),
    m(hannah, 1 * D + 20 * H, p('Lemon. Always lemon. She&rsquo;ll pretend she doesn&rsquo;t care but she does.')),
  ], { labels: ['personal'], starred: true, read: true })

  t('Interview loop scheduled: Staff Engineer @ Helix', [
    m(elena, 2 * D + 2 * H, p('Hi Alex,', 'Great news: Helix would like to move you to the final loop. Proposed slots next week:', '<ul><li>Mon 10:00 AM &ndash; 3:00 PM PT</li><li>Wed 9:00 AM &ndash; 2:00 PM PT</li></ul>', 'Let me know what works and I&rsquo;ll send calendar holds.', 'Best,<br>Elena Petrova<br><span class="muted">TalentBridge</span>')),
  ], { labels: ['personal'] })

  t('Standup notes + action items (Sep 29)', [
    m(noah, 24 * H, p('Quick recap:', '<ul><li><b>Atlas</b>: sync lock PR is in review (Marcus)</li><li><b>Billing</b>: webhook handlers 60% (Noah)</li><li><b>Mobile</b>: crash on Android 12 reproduced (Sofia&rsquo;s build)</li></ul>', 'Action items in Linear.')),
  ], { labels: ['work'], read: true })

  t('Invitation: Sprint planning @ Mon Oct 5, 10am – 11am (PT)', [
    m('calendar@northwind.dev', 9 * H, p('<b>Sprint planning</b><br>Mon Oct 5, 10:00 AM – 11:00 AM (PT)<br>Where: Room Oslo / meet.northwind.dev/sprint', 'Guests: Priya, Marcus, Grace, Sofia, Noah, you', '<a class="btn" href="#">Yes</a> <a class="btn" href="#">No</a> <a class="btn" href="#">Maybe</a>'), { att: [att('invite.ics', 2100, 'cal')] }),
  ], { cat: 'updates', labels: ['work'], read: true })

  t('Your build failed: atlas-web (main)', [
    m('deploybot@northwind.dev', 4 * H, p('Build <b>#3921</b> on <code>main</code> failed at step <b>lint</b>.', '<pre>src/sync/queue.ts:88  error  \'release\' is assigned but never used</pre>', 'Re-run: <a href="#">deploy.northwind.dev/builds/3921</a>')),
    m('deploybot@northwind.dev', 3 * H + 40 * 60e3, p('Build <b>#3922</b> on <code>main</code> succeeded in 4m 12s.')),
  ], { cat: 'updates', labels: ['work'], read: true })

  t('ATL-482: Conflict resolution drops edits on reconnect', [
    m('notifications@linear.app', 30 * H, p('<b>Marcus Lee</b> assigned this issue to you.', 'Priority: <b>Urgent</b> &middot; Status: In Progress', 'Steps: go offline, edit on two devices, reconnect. The later device wins wholesale instead of merging.')),
  ], { cat: 'updates', labels: ['work'], starred: false })

  t('Your Saturday just got better: 30% off the Fall Collection', [
    m('deals@fableoutfitters.com', 6 * H, p('<b>Fall Collection is here.</b>', 'Take 30% off jackets, knitwear and boots through Sunday. Use code <b>LEAVES30</b>.', '<a class="btn" href="#">Shop the sale</a>')),
  ], { cat: 'promotions' })

  t('Free pastry with any drink this week ☕', [
    m('hello@loopcoffee.co', 2 * D + 6 * H, p('Hey Alex, you&rsquo;ve earned <b>3 stamps</b> this month.', 'Show this email at any Loop location for a free pastry with any drink through Friday.')),
  ], { cat: 'promotions', read: true })

  t('Stayly: your host replied about Alfama Terrace Loft', [
    m('trips@stayly.com', 8 * H, p('<b>Rui</b> replied to your inquiry:', '<blockquote>Hi Alex! The loft is available Oct 16–20. Self check-in after 3 PM, lockbox code will be sent the day before.</blockquote>', '<a class="btn" href="#">View message</a>')),
  ], { cat: 'updates', labels: ['travel'] })

  t('Jamal Carter mentioned you in a post', [
    m('no-reply@circle.social', 10 * H, p('<b>Jamal Carter</b> mentioned you: &ldquo;@alex you have to see this trail photo from Mt. Tam.&rdquo;', '<a class="btn" href="#">See post</a>')),
  ], { cat: 'social' })

  t('You have 4 new connection requests', [
    m('no-reply@circle.social', 2 * D + 9 * H, p('Elena Petrova, Kevin Ho and 2 others want to connect with you.', '<a class="btn" href="#">Review requests</a>')),
  ], { cat: 'social', read: true })

  t('The Weekly Byte #212: Local-first is eating the world', [
    m('news@weeklybyte.dev', 1 * D + 9 * H, p('<b>This week</b>', '<ul><li>CRDTs in production: lessons from three teams</li><li>SQLite in the browser, benchmarked</li><li>Why your &ldquo;offline mode&rdquo; probably isn&rsquo;t</li><li>Tool of the week: a tiny Postgres-compatible sync engine</li></ul>', '<a class="btn" href="#">Read online</a>')),
  ], { cat: 'promotions', read: true })

  t('Contract review: contractor agreement v3', [
    m(daniel, 4 * D, p('Alex,', 'Attached is v3 of the contractor agreement with the changes we discussed (IP assignment clause tightened, payment terms net-15). Please review section 4 in particular.', 'I need your sign-off by Friday so we can send to the counterparty.', 'Daniel Okafor<br>Okafor &amp; Partners'), { att: [att('Contractor-Agreement-v3.pdf', 512000, 'pdf'), att('Redline-v2-v3.docx', 128000, 'doc')] }),
    m(ME, 3 * D + 20 * H, p('Thanks Daniel. Section 4 looks good. One question on 4.2: does &ldquo;deliverables&rdquo; cover derivative tooling? I&rsquo;ll get you a final answer by Friday.'), { to: [daniel] }),
  ], { labels: ['finance'], read: true, snoozedUntil: now + 20 * H })

  t('Trailhead: Bay Area Ridge Trail day hike – Sat Oct 10', [
    m('events@trailhead.club', 5 * D, p('12 miles, ~2,400 ft gain, lunch at the summit. Meet at 8 AM at Skyline Gate.', 'Spots left: <b>6</b>. <a href="#">RSVP</a>')),
  ], { cat: 'social', read: true })

  t('Budget spreadsheet – Q3 actuals', [
    m(grace, 6 * D, p('Alex, attaching the Q3 actuals so you can sanity check the infra line before finance closes the books.'), { att: [att('Q3-actuals.xlsx', 356000, 'sheet')] }),
  ], { labels: ['finance', 'work'], read: true })

  t('Congrats on the launch!! 🎉', [
    m(jamal, 8 * D, p('Saw the announcement. Huge. Drinks on me next time you&rsquo;re in the city.')),
    m(ME, 8 * D - 3 * H, p('Thank you!! Holding you to that. Friday?'), { to: [jamal] }),
  ], { labels: ['personal'], read: true })

  t('Win a free cruise!!! Claim NOW', [
    m('prize-desk@lucky-winner-blast.biz', 2 * D, p('CONGRATULATIONS!!! You have been selected. Click here to claim your prize within 24 hours.')),
  ], { box: 'spam' })

  t('Old thread: parking permit renewal', [
    m('permits@sfmta-parking.org', 12 * D, p('Your residential parking permit expires Oct 31. Renew online to avoid a lapse.')),
  ], { box: 'trash', read: true })

  t('Re: Kitchen renovation quote', [
    m('quotes@brightbuild.co', 15 * D, p('Please find the updated quote attached. Valid for 30 days.'), { att: [att('Quote-kitchen-2026.pdf', 640000, 'pdf')] }),
  ], { box: 'archive', read: true, labels: ['personal'] })

  t('Team offsite logistics', [
    m(priya, 14 * D, p('Offsite is Oct 22–23 at Half Moon Bay. Rooms are booked; please add dietary restrictions to the sheet.')),
    m(ME, 14 * D - 2 * H, p('Added mine. Thanks for organizing!'), { to: [priya] }),
  ], { box: 'archive', read: true, labels: ['work'] })

  t('Sent: notes from the sync design session', [
    m(ME, 5 * D, p('Team, notes from today&rsquo;s session:', '<ul><li>Use per-document vector clocks</li><li>Server is the arbiter for schema changes</li><li>Add a conflict-resolution UI only if telemetry demands it</li></ul>', 'Doc is in the shared drive.'), { to: [priya, marcus, noah], att: [att('sync-design-notes.pdf', 320000, 'pdf')] }),
  ], { box: 'archive', read: true, labels: ['work'] })

  t('Thanks for dinner', [
    m(ME, 6 * D + 3 * H, p('Hannah, thanks so much for hosting. The lasagna was outstanding and the kids are adorable.'), { to: [hannah] }),
  ], { box: 'archive', read: true, labels: ['personal'] })

  return {
    threads,
    drafts: [
      {
        id: 'd1',
        to: [priya],
        cc: [],
        bcc: [],
        subject: 'Mobile release risk summary',
        html: '<p>Priya, three risks for the mobile release:</p><ul><li>Android 12 crash (repro, fix in flight)</li><li></li></ul>',
        attachments: [],
        updatedAt: now - 50 * 60e3,
      },
    ],
    labels: [
      { id: 'work', name: 'Work', color: '#1a73e8' },
      { id: 'personal', name: 'Personal', color: '#a142f4' },
      { id: 'travel', name: 'Travel', color: '#188038' },
      { id: 'finance', name: 'Finance', color: '#e37400' },
      { id: 'receipts', name: 'Receipts', color: '#007b83' },
    ],
    settings: { theme: 'system', density: 'default', signature: 'Alex Morgan\nStaff Engineer, Northwind Labs' },
    recent: ['has:attachment', 'from:priya'],
    extraContacts: [],
  }
}

export interface Incoming {
  from: string
  subject: string
  html: string
  cat: Category
  att?: Attachment[]
}

export const INCOMING: Incoming[] = [
  { from: 'marcus.lee@northwind.dev', subject: 'Re: [northwind/atlas] Fix race condition in sync queue', html: p('Pushed a fix for the lint failure and added the interleaved write test. Ready for another look when you have a minute.'), cat: 'primary' },
  { from: 'grace.liu@northwind.dev', subject: 'Leadership sync: moved to 2 PM', html: p('Heads up, leadership sync moved to 2 PM Thursday. Can you have the billing migration estimate ready by then?'), cat: 'primary' },
  { from: 'sofia@alvarez.design', subject: 'Animation specs – Lottie exports', html: p('Exported the onboarding animations as Lottie JSON, 60fps. Let me know if the file sizes are a problem.'), cat: 'primary', att: [att('onboarding-lottie.zip', 2100000, 'zip')] },
  { from: 'receipts@stripe.com', subject: 'Payment received: $49.00 from Acme Co', html: p('You received a payment of <b>$49.00</b> from Acme Co.'), cat: 'updates' },
  { from: 'deals@fableoutfitters.com', subject: 'Last call: 30% off ends tonight', html: p('Final hours! <b>LEAVES30</b> expires at midnight.'), cat: 'promotions' },
]

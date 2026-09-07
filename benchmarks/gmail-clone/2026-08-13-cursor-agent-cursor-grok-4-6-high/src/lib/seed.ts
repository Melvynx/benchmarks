import { ME } from './contacts'
import { at, hoursFromNow, makeAttachment, uid } from './format'
import { SYS, type Category, type Label, type Message, type Settings, type Thread } from './types'

const P = 'priya.mehta@northline.io'
const S = 'sam.okonkwo@northline.io'
const E = 'elena.voss@northline.io'
const M = 'marcus.chen@northline.io'
const A = 'aisha.rahman@northline.io'
const T = 'theo.lang@northline.io'
const N = 'nora.patel@northline.io'
const J = 'jules.park@northline.io'
const R = 'ren.alvarez@northline.io'
const MN = 'mina.cho@northline.io'
const O = 'owen.blake@harborand.co'
const L = 'lina@kitefield.studio'
const ME_ = ME.email

type At = [daysAgo: number, hour: number, minute: number]

interface MsgSpec {
  from: string
  to?: string[]
  cc?: string[]
  at: At
  body: string
  atts?: [name: string, size: number, preview?: string][]
  unread?: boolean
  draft?: boolean
  sendAt?: number
}

interface ThreadSpec {
  subject: string
  cat?: Category
  labels?: string[]
  starred?: boolean
  important?: boolean
  where?: 'inbox' | 'archive' | 'trash' | 'spam' | 'draft' | 'scheduled' | 'snoozed' | 'sent'
  wakeIn?: number
  msgs: MsgSpec[]
}

const p = (...paras: string[]) => paras.map((x) => `<p>${x}</p>`).join('')
const sig = (name: string, role: string) =>
  `<p><span style="color:#5f6368">—<br>${name}<br>${role}, Northline</span></p>`

export const DEFAULT_LABELS: Label[] = [
  { id: 'lbl_work', name: 'Work', color: '#0b57d0', visible: true },
  { id: 'lbl_personal', name: 'Personal', color: '#188038', visible: true },
  { id: 'lbl_finance', name: 'Finance', color: '#018b6e', visible: true },
  { id: 'lbl_travel', name: 'Travel', color: '#e37400', visible: true },
  { id: 'lbl_followup', name: 'Follow-up', color: '#d93025', visible: true },
  { id: 'lbl_waiting', name: 'Waiting', color: '#9334e6', visible: true },
]

export const DEFAULT_SETTINGS: Settings = {
  theme: 'light',
  density: 'default',
  readingPane: 'none',
  senderImages: true,
  categoryTabs: true,
  conversationView: true,
  shortcuts: true,
  undoSendSeconds: 5,
  snippets: true,
  starredFirst: false,
  signature: 'Jordan Hale\nProduct · Northline',
}

const SPECS: ThreadSpec[] = [
  {
    subject: 'Re: Harbor kickoff — they want the workspace live by the 28th',
    cat: 'primary',
    labels: ['lbl_work', 'lbl_followup'],
    important: true,
    starred: true,
    msgs: [
      {
        from: T,
        to: [ME_, P],
        cc: [M],
        at: [2, 9, 14],
        body: p(
          'Jordan, Owen confirmed Harbor wants the shared workspace live before their board on the 28th. That is 15 days.',
          'They will pay for the enterprise seat if we can staff a dedicated success channel. I told him we would not commit until you and Priya signed off on capacity.',
          'Can you look at the attached SOW tonight? I need a yes/no by tomorrow 10am so I can get it in front of Nora.',
        ) + sig('Theo Lang', 'Account Executive'),
        atts: [
          ['Harbor-SOW-v4.pdf', 428_032],
          ['kickoff-agenda.docx', 52_480],
        ],
      },
      {
        from: P,
        to: [ME_, T],
        cc: [M],
        at: [2, 11, 41],
        body: p(
          'Capacity is tight but doable if we freeze the mobile widget for two sprints. Sam already flagged that in the roadmap thread.',
          'Jordan, I need you to own the workspace template. Elena can spare two days for the empty states. Do not promise custom SSO in this window.',
        ),
      },
      {
        from: O,
        to: [ME_, T],
        cc: [P],
        at: [0, 8, 6],
        body: p(
          'Jordan — looping you in directly. Our board packet locks Thursday. If the workspace is not ready we will slip a quarter, which I would rather not explain.',
          'Happy to jump on a 20-minute call this afternoon. Theo has my calendar.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Design review: onboarding v7 (please comment in Figma, not here)',
    cat: 'primary',
    labels: ['lbl_work'],
    important: true,
    msgs: [
      {
        from: E,
        to: [ME_, P, J],
        at: [1, 16, 22],
        body: p(
          'v7 is up. I cut the 5-step wizard down to 3 and moved the sample workspace to after the first save, not before.',
          'The empty canvas still feels cold. I tried a faint grid and a single starter card. Curious if that reads as helpful or as clutter.',
          'Figma: <a href="#">northline.io/figma/onboarding-v7</a> — comments by 4pm so I can ship to staging tonight.',
        ) + sig('Elena Voss', 'Design Lead'),
        atts: [['onboarding-v7-flows.pdf', 1_204_224]],
        unread: true,
      },
    ],
  },
  {
    subject: 'Incident: search latency p95 spiked to 1.8s after the index swap',
    cat: 'primary',
    labels: ['lbl_work'],
    important: true,
    starred: true,
    msgs: [
      {
        from: S,
        to: [ME_, P, MN],
        at: [0, 7, 18],
        body: p(
          'Paging. After last night’s index cutover, p95 search is 1.8s (budget 400ms). Error rate is fine. This is a hot-cache miss, not a crash.',
          'I rolled the query planner back to the previous scoring weights. Latency is coming down but not to baseline.',
          'Mina is pulling the slow-query sample. I need a product call: do we keep the new ranking (better recall, slower) or revert fully?',
        ),
        atts: [['search-p95-overnight.png', 312_000, 'linear-gradient(135deg,#0b57d0,#c2e7ff)']],
        unread: true,
      },
      {
        from: MN,
        to: [ME_, S, P],
        at: [0, 7, 44],
        body: p(
          'Sample attached. 62% of the slow queries are the new “similar threads” expansion. If we gate that behind a flag for accounts over 50k messages, p95 drops to 520ms.',
          'I would ship the flag this morning and keep ranking. Reverting loses the recall win we just sold Harbor on.',
        ),
        atts: [['slow-query-sample.csv', 88_064]],
        unread: true,
      },
    ],
  },
  {
    subject: 'Your Q3 goals — draft for 1:1 on Thursday',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: P,
        to: [ME_],
        at: [1, 10, 5],
        body: p(
          'Putting this in writing so Thursday is a conversation, not a surprise.',
          '1. Harbor live by the 28th, no custom SSO. 2. Onboarding completion +18% vs June. 3. Cut P1 incident time-to-ack under 12 minutes.',
          'The stretch is the search ranking work. If we miss it I will not hold it against the other three. Come with what you want to drop.',
        ),
      },
    ],
  },
  {
    subject: 'Re: offer for the staff designer role — Lina is in',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: A,
        to: [ME_, E],
        at: [3, 14, 2],
        body: p(
          'Lina accepted, start date Sept 8. Comp as discussed. She asked about the design-eng pairing model in week one — Elena, can you own that?',
          'I will send the equipment form this afternoon. Jordan, she mentioned she wants 30 minutes with you on the Harbor work before she starts.',
        ),
      },
      {
        from: E,
        to: [A, ME_],
        at: [3, 15, 11],
        body: p('Yes. I will put a pairing doc in Notion today. Thrilled she said yes.'),
      },
      {
        from: L,
        to: [ME_, A, E],
        at: [0, 9, 28],
        body: p(
          'Jordan — Aisha said you might have 30 minutes next week. I have been living in the public changelog and I have opinions about the empty states.',
          'Anytime Tuesday or Wednesday after 11 Pacific works. Looking forward to it.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Legal: Harbor DPA redlines (need your product notes)',
    cat: 'primary',
    labels: ['lbl_work', 'lbl_waiting'],
    msgs: [
      {
        from: N,
        to: [ME_, T],
        at: [4, 11, 33],
        body: p(
          'Harbor’s counsel marked subprocessors and retention. The 30-day deletion clause conflicts with our search index rebuild window.',
          'I can live with 45 days if product confirms we can actually do it. Please comment in the doc, not over email, by Friday.',
        ),
        atts: [['Harbor-DPA-redlines.docx', 210_944]],
      },
    ],
  },
  {
    subject: 'Brand: homepage hero still says “the workspace for teams who write”',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: J,
        to: [ME_, E, M],
        at: [5, 13, 48],
        body: p(
          'We retired that line in May. The marketing site still has it in the hero and the OG image. I have a replacement: “Northline keeps the work in one thread.”',
          'Need a product yes before I push. Also the screenshot in the hero is from v4 chrome. Elena has a newer one.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Weekly product review — notes and the clip of the Harbor demo',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: P,
        to: [ME_, S, E, MN, T],
        at: [6, 17, 2],
        body: p(
          'Notes in the doc. Two decisions: we are not building a native mobile app this half, and search ranking ships behind a flag.',
          'Jordan, your Harbor walkthrough was the best part of the meeting. Clip attached if you want to send it to Owen.',
        ),
        atts: [
          ['PBR-notes-aug.pdf', 640_512],
          ['harbor-demo-clip.mp4', 8_388_608],
        ],
      },
    ],
  },
  {
    subject: 'Re: dinner Friday? (the new place on Valencia)',
    cat: 'primary',
    labels: ['lbl_personal'],
    starred: true,
    msgs: [
      {
        from: 'ada.okonkwo@gmail.com',
        to: [ME_],
        at: [1, 19, 41],
        body: p(
          'Sam said you might actually leave the office before 8 this week. There is a walk-in place on Valencia that does the grilled artichokes you like.',
          'I can do 7:30. If you flake I am eating your share and I will tell Helen.',
        ),
      },
      {
        from: ME_,
        to: ['ada.okonkwo@gmail.com'],
        at: [1, 20, 5],
        body: p('7:30. I will not flake. If Harbor explodes I will still show up hungry.'),
      },
      {
        from: 'ada.okonkwo@gmail.com',
        to: [ME_],
        at: [0, 10, 12],
        body: p('Good. I booked the counter. Do not wear the conference badge lanyard.'),
        unread: true,
      },
    ],
  },
  {
    subject: 'Photos from the lake — your mother wants these printed',
    cat: 'primary',
    labels: ['lbl_personal'],
    msgs: [
      {
        from: 'helen.hale@gmail.com',
        to: [ME_],
        at: [8, 15, 3],
        body: p(
          'Jordan, these are from July. The one of you and your father at the dock is the one I want on the wall. Can you send a print file that is actually high-res this time?',
          'Also call me this weekend. I keep getting your voicemail.',
        ),
        atts: [
          ['dock-july.jpg', 2_458_624, 'linear-gradient(135deg,#4a6fa5,#e8d5b7)'],
          ['cabin-porch.jpg', 1_890_304, 'linear-gradient(135deg,#6b8f71,#f0e6d2)'],
        ],
      },
    ],
  },
  {
    subject: 'Support: Harbor admin cannot add guests (repro attached)',
    cat: 'primary',
    labels: ['lbl_work', 'lbl_followup'],
    msgs: [
      {
        from: R,
        to: [ME_, S],
        at: [0, 11, 2],
        body: p(
          'Owen’s admin hits a 403 on POST /guests when the workspace is in “pending template” state. We never exposed that state in the UI so they think it is broken.',
          'Workaround: finish the template. Real fix: allow guests in pending, or don’t show the invite button. I would like the second one today.',
        ),
        atts: [['guest-403-repro.zip', 1_572_864]],
        unread: true,
      },
    ],
  },
  {
    subject: 'Calendar: Product review moved to 3:30 (room 4B)',
    cat: 'updates',
    msgs: [
      {
        from: 'calendar-notification@google.com',
        to: [ME_],
        at: [0, 9, 0],
        body: p(
          'Priya Mehta moved Product review to today, 3:30–4:15pm, Room 4B · 2nd floor.',
          'Guests: Jordan Hale, Sam Okonkwo, Elena Voss, Mina Cho.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: '[northline/app] CI failed on main — search/planner_test.go',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: 'notifications@github.com',
        to: [ME_],
        at: [0, 6, 51],
        body: p(
          'Workflow: ci / test (go) — failed on main after merge of #2841.',
          'planner_test.go:88: expected latency budget 400ms, got 512ms in the fixture that still has similar-threads on.',
          '<a href="#">View run</a> · <a href="#">Open #2841</a>',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Receipt from Stripe: Northline, Inc. — $2,400.00',
    cat: 'updates',
    labels: ['lbl_finance'],
    msgs: [
      {
        from: 'receipts@stripe.com',
        to: [ME_],
        at: [2, 4, 12],
        body: p(
          'You paid $2,400.00 to Figma, Inc. for Organization · Northline.',
          'Last 4: 1009 · Invoice INV-2026-08-09. Reply to this email if this was not you (it will not help, but we have to say it).',
        ),
        atts: [['INV-2026-08-09.pdf', 64_512]],
      },
    ],
  },
  {
    subject: 'Your Uber trip with Marco on Tuesday',
    cat: 'updates',
    labels: ['lbl_finance'],
    msgs: [
      {
        from: 'uber.receipts@uber.com',
        to: [ME_],
        at: [3, 21, 8],
        body: p('Tuesday 9:14pm · Mission to Potrero · $18.62 · Visa 1009. Thanks for riding.'),
      },
    ],
  },
  {
    subject: 'Your trip: SFO → JFK on Sep 12 (change of equipment)',
    cat: 'updates',
    labels: ['lbl_travel'],
    starred: true,
    msgs: [
      {
        from: 'deltaairlines@delta.com',
        to: [ME_],
        at: [4, 6, 40],
        body: p(
          'Flight DL 404 on Sep 12 now operates as a 737-900, not an A321. Seat 12A is still yours. Cabin is the same. Complimentary beer is not a guarantee.',
          'Check in opens 24 hours before departure.',
        ),
        atts: [['DL404-Sep12.pdf', 120_832]],
      },
    ],
  },
  {
    subject: 'Your August statement is ready',
    cat: 'updates',
    labels: ['lbl_finance'],
    msgs: [
      {
        from: 'americanexpress@welcome.americanexpress.com',
        to: [ME_],
        at: [7, 7, 0],
        body: p('Platinum Card ending 1009 · New balance $4,218.33 · Minimum due $35 · Due Aug 28.'),
        atts: [['Amex-August-2026.pdf', 340_992]],
      },
    ],
  },
  {
    subject: 'AWS: your bill for July is $1,184.22 (search cluster is the spike)',
    cat: 'updates',
    labels: ['lbl_finance', 'lbl_work'],
    msgs: [
      {
        from: 'no-reply@amazon.com',
        to: [ME_, MN],
        at: [9, 5, 15],
        body: p(
          'Account 4492-1183 · July 2026 · $1,184.22 (June was $612.04).',
          'The OpenSearch domain search-prod-2 accounts for $490 of the delta. Mina already has the thread.',
        ),
      },
    ],
  },
  {
    subject: 'Priya Mehta accepted your invitation to connect',
    cat: 'social',
    msgs: [
      {
        from: 'messages-noreply@linkedin.com',
        to: [ME_],
        at: [0, 12, 18],
        body: p('You are now connected to Priya Mehta, Head of Product at Northline. Send a message.'),
        unread: true,
      },
    ],
  },
  {
    subject: 'You appeared in 3 searches this week',
    cat: 'social',
    msgs: [
      {
        from: 'messages-noreply@linkedin.com',
        to: [ME_],
        at: [5, 8, 22],
        body: p('People from Harbor & Co, Figma, and a stealth company viewed your profile. That last one is probably a recruiter with a clever tab name.'),
      },
    ],
  },
  {
    subject: 'Jules Park tagged you in a photo',
    cat: 'social',
    msgs: [
      {
        from: 'info@x.com',
        to: [ME_],
        at: [6, 18, 9],
        body: p('@julespark tagged you in a photo from the offsite. “Jordan explaining search ranking with a napkin.” Flattering.'),
      },
    ],
  },
  {
    subject: 'Your Discover Weekly is ready',
    cat: 'social',
    msgs: [
      {
        from: 'no-reply@spotify.com',
        to: [ME_],
        at: [3, 6, 0],
        body: p('A mix of what you have been playing in the office after 7pm. Track 4 is the one Elena keeps asking about.'),
      },
    ],
  },
  {
    subject: '30% off annual: Figma Organization',
    cat: 'promotions',
    msgs: [
      {
        from: 'team@figma.com',
        to: [ME_],
        at: [1, 11, 0],
        body: p(
          'Your Organization plan renews in 21 days. Pay annually this week and save 30%.',
          'This is the same offer as last year. It will also be the offer next year.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: 'Notion: your team hit the block limit on the Harbor wiki',
    cat: 'promotions',
    msgs: [
      {
        from: 'team@makenotion.com',
        to: [ME_],
        at: [4, 12, 30],
        body: p('The Harbor shared wiki is at 1,000 blocks. Upgrade to Business or archive the meeting notes from 2024 that nobody will open.'),
      },
    ],
  },
  {
    subject: 'Dribbble: 12 shots you might like (product empty states)',
    cat: 'promotions',
    msgs: [
      {
        from: 'hello@dribbble.com',
        to: [ME_],
        at: [8, 9, 45],
        body: p('Based on Elena’s likes. A lot of grids, a lot of “friendly” illustrations of people pointing at laptops. Some of it is actually good.'),
      },
    ],
  },
  {
    subject: 'The Morning: a very normal Tuesday',
    cat: 'promotions',
    msgs: [
      {
        from: 'nytdirect@nytimes.com',
        to: [ME_],
        at: [0, 5, 2],
        body: p('Good morning. Markets, a confirmation hearing, and a newsletter that still thinks you have time to read it on the train.'),
        unread: true,
      },
    ],
  },
  {
    subject: 'Stratechery: Aggregation and the inbox',
    cat: 'promotions',
    msgs: [
      {
        from: 'ben@stratechery.com',
        to: [ME_],
        at: [2, 6, 30],
        body: p('On why email remains the unbundled protocol everyone keeps trying to bundle, and why that keeps failing in the same way.'),
      },
    ],
  },
  {
    subject: 'Linear: 14 issues assigned to you are due this week',
    cat: 'updates',
    labels: ['lbl_work'],
    msgs: [
      {
        from: 'hello@linear.app',
        to: [ME_],
        at: [0, 8, 30],
        body: p(
          'Due this week: NTH-1842 Harbor template, NTH-1849 guest 403, NTH-1851 search flag, plus 11 more you are pretending are next week.',
        ),
        unread: true,
      },
    ],
  },
  {
    subject: '[design-crit] Empty canvas copy — vote on the three lines',
    cat: 'forums',
    labels: ['lbl_work'],
    msgs: [
      {
        from: E,
        to: [ME_, J, P],
        at: [2, 15, 20],
        body: p(
          'Posted in #design-crit. Three candidates for the empty canvas:',
          '1. “Start with a thread.” 2. “Nothing here yet. That is the point.” 3. “Drop a file, paste a link, or just write.”',
          'I am voting 3. Jules wants 1. Product should break the tie.',
        ),
      },
    ],
  },
  {
    subject: 'Re: the napkin ranking diagram (please never do that in a customer meeting)',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: M,
        to: [ME_],
        at: [6, 18, 40],
        body: p(
          'The napkin was charming in the offsite. Do not recreate it for Harbor’s board. Use Elena’s diagram. I say this with love and with legal in cc in spirit.',
        ),
      },
      {
        from: ME_,
        to: [M],
        at: [6, 19, 2],
        body: p('Heard. The napkin stays in the #random channel where it belongs.'),
      },
    ],
  },
  {
    subject: 'Draft: notes for Owen before Thursday’s packet lock',
    where: 'draft',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: ME_,
        to: [O],
        cc: [T, P],
        at: [0, 13, 10],
        draft: true,
        body: p(
          'Owen — confirming we can have the workspace live on the 27th, a day before your packet lock.',
          'What we will ship: shared workspace, guest invites, the template you saw, and a dedicated success channel.',
          'What we will not ship in this window: custom SSO. We can sequence that for October if the board still wants it.',
          'Happy to walk through the guest-invite fix on a call this afternoon.',
        ),
      },
    ],
  },
  {
    subject: 'Draft: thank-you to Lina',
    where: 'draft',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: ME_,
        to: [L],
        at: [1, 21, 4],
        draft: true,
        body: p('Lina — delighted you are joining. Tuesday 11:30 works. I will send a calendar hold. Bring the empty-state opinions, we need them.'),
      },
    ],
  },
  {
    subject: 'Sent: intro for Owen ↔ Mina (search numbers)',
    where: 'sent',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: ME_,
        to: [O, MN],
        cc: [T],
        at: [1, 9, 20],
        body: p(
          'Owen, meeting Mina, who owns our search metrics. Mina, Owen is the Harbor VP who will care about p95 more than anyone in this thread.',
          'Mina can share the flag plan we discussed this morning. I will stay out of the way unless you need a product call.',
        ),
      },
    ],
  },
  {
    subject: 'Sent: Friday dinner confirmed',
    where: 'sent',
    cat: 'primary',
    labels: ['lbl_personal'],
    msgs: [
      {
        from: ME_,
        to: ['ada.okonkwo@gmail.com'],
        at: [0, 10, 20],
        body: p('Counter at 7:30. No lanyard. I may be 10 minutes late if the 3:30 review runs. Order the artichokes if I am.'),
      },
    ],
  },
  {
    subject: 'Scheduled: Harbor go-live checklist for the team',
    where: 'scheduled',
    cat: 'primary',
    labels: ['lbl_work'],
    wakeIn: 18,
    msgs: [
      {
        from: ME_,
        to: [P, S, E, R, T],
        at: [0, 14, 0],
        draft: true,
        sendAt: hoursFromNow(18),
        body: p(
          'Sending this tomorrow morning so it hits inboxes at 8.',
          'Checklist: template frozen, guest invite unblocked, success channel created, SSO explicitly out of scope, Owen has the walkthrough recording.',
          'Reply in thread if any of those is not true by 10am.',
        ),
      },
    ],
  },
  {
    subject: 'Snoozed: write the Q3 self-review',
    where: 'snoozed',
    cat: 'primary',
    labels: ['lbl_work'],
    wakeIn: 26,
    msgs: [
      {
        from: A,
        to: [ME_],
        at: [10, 9, 0],
        body: p(
          'Self-reviews are due the 22nd. Please do not write it the night before this year. The form is in the people tool. I will nag once more and then I will nag Marcus.',
        ),
      },
    ],
  },
  {
    subject: 'Old: summer offsite house rules',
    where: 'archive',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: A,
        to: [ME_, P, S, E, J, T, R, MN],
        at: [40, 11, 0],
        body: p('Cabin wifi is a rumor. Bring a hotspot if you need to ship. Quiet hours at 11. Jordan is on coffee duty Saturday because he lost the last trivia round.'),
      },
    ],
  },
  {
    subject: 'You have (not) won $2,500,000',
    where: 'spam',
    cat: 'promotions',
    msgs: [
      {
        from: 'winner@prize-desk.biz',
        to: [ME_],
        at: [1, 3, 14],
        body: p('CONGRATULATIONS Jordan Hale. Click here to claim your award. Provide routing number for verification. This is definitely real.'),
        unread: true,
      },
    ],
  },
  {
    subject: 'Re: parking garage invoice from June (done)',
    where: 'trash',
    cat: 'updates',
    labels: ['lbl_finance'],
    msgs: [
      {
        from: ME_,
        to: ['billing@potrero-park.com'],
        at: [20, 12, 0],
        body: p('Paid. Please stop sending the red-text version of this email.'),
      },
    ],
  },
  {
    subject: 'Welcome to Northline (your first-week thread)',
    where: 'archive',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: A,
        to: [ME_],
        at: [400, 10, 0],
        body: p('Jordan, welcome. Laptop on your desk, people tool login in the next email, lunch with Priya at 12:30. We are glad you are here.'),
      },
      {
        from: P,
        to: [ME_],
        at: [400, 10, 20],
        body: p('See you at 12:30. I will try not to talk about search ranking until at least dessert.'),
      },
    ],
  },
  {
    subject: 'Re: can we put a reading pane in the new chrome?',
    cat: 'primary',
    labels: ['lbl_work'],
    msgs: [
      {
        from: E,
        to: [ME_, S],
        at: [12, 16, 10],
        body: p(
          'I mocked a right-hand reading pane for accounts who live in the inbox all day. It is on by default at 1280px and off below that.',
          'Sam says the virtual list already supports it. Want this in v7 or v8?',
        ),
      },
      {
        from: S,
        to: [E, ME_],
        at: [12, 16, 40],
        body: p('v7 if product wants it. The list virtualizer does not care. Please do not animate the pane width.'),
      },
      {
        from: ME_,
        to: [E, S],
        at: [12, 17, 5],
        body: p('v7. Default off, setting to turn it on. Power users will find it. Everyone else should not have their list crushed.'),
      },
    ],
  },
]

export interface SeedMailbox {
  threads: Thread[]
  messages: Message[]
  labels: Label[]
  settings: Settings
}

export function buildSeed(now = Date.now()): SeedMailbox {
  const threads: Thread[] = []
  const messages: Message[] = []

  for (const spec of SPECS) {
    const threadId = uid('th')
    const messageIds: string[] = []
    const last = spec.msgs[spec.msgs.length - 1]!
    for (let i = 0; i < spec.msgs.length; i++) {
      const m = spec.msgs[i]!
      const id = uid('msg')
      messageIds.push(id)
      const isLast = i === spec.msgs.length - 1
      messages.push({
        id,
        threadId,
        from: m.from,
        to: m.to ?? [ME_],
        cc: m.cc,
        date: m.sendAt ?? at(m.at[0], m.at[1], m.at[2], now),
        body: m.body,
        attachments: m.atts?.map((a) => makeAttachment(a[0], a[1], a[2])),
        unread: isLast ? m.unread : false,
        draft: m.draft,
        sendAt: m.sendAt,
        inReplyTo: i > 0 ? messageIds[i - 1] : undefined,
      })
    }

    const labels = new Set<string>(spec.labels ?? [])
    const where = spec.where ?? 'inbox'
    if (where === 'inbox') labels.add(SYS.INBOX)
    if (where === 'trash') labels.add(SYS.TRASH)
    if (where === 'spam') labels.add(SYS.SPAM)
    if (where === 'draft') labels.add(SYS.DRAFT)
    if (where === 'scheduled') {
      labels.add(SYS.SCHEDULED)
      labels.add(SYS.DRAFT)
    }
    if (where === 'snoozed') labels.add(SYS.SNOOZED)
    if (where === 'sent') labels.add(SYS.SENT)
    if (spec.starred) labels.add(SYS.STARRED)
    if (spec.important) labels.add(SYS.IMPORTANT)
    if (last.from === ME_ && where !== 'draft' && where !== 'scheduled') labels.add(SYS.SENT)

    const lastMsg = messages.find((m) => m.id === messageIds[messageIds.length - 1])!
    threads.push({
      id: threadId,
      subject: spec.subject,
      messageIds,
      labels: [...labels],
      category: spec.cat ?? 'primary',
      snoozeUntil: where === 'snoozed' ? hoursFromNow(spec.wakeIn ?? 24, now) : undefined,
      lastActivity: lastMsg.date,
    })
  }

  return {
    threads,
    messages,
    labels: DEFAULT_LABELS.map((l) => ({ ...l })),
    settings: { ...DEFAULT_SETTINGS },
  }
}

import type { Contact, MailThread } from '../domain/mail';

export const CURRENT_USER: Contact = {
  name: 'Alex Morgan',
  email: 'alex.morgan@solmail.local',
  avatar: 'AM',
  color: '#0b57d0',
};

const MAYA_CHEN: Contact = {
  name: 'Maya Chen',
  email: 'maya.chen@northstar.studio',
  avatar: 'MC',
  color: '#7c4dff',
};

const THEO_BENNETT: Contact = {
  name: 'Theo Bennett',
  email: 'theo@bennett.design',
  avatar: 'TB',
  color: '#00695c',
};

const SOFIA_RAMIREZ: Contact = {
  name: 'Sofia Ramirez',
  email: 'sofia.ramirez@northstar.studio',
  avatar: 'SR',
  color: '#c62828',
};

const JORDAN_LEE: Contact = {
  name: 'Jordan Lee',
  email: 'jordan.lee@northstar.studio',
  avatar: 'JL',
  color: '#1565c0',
};

const PRIYA_NAIR: Contact = {
  name: 'Priya Nair',
  email: 'priya@nair.ventures',
  avatar: 'PN',
  color: '#ad1457',
};

const MARCUS_WEBB: Contact = {
  name: 'Marcus Webb',
  email: 'marcus@studiojuniper.co',
  avatar: 'MW',
  color: '#ef6c00',
};

const ELENA_PETROVA: Contact = {
  name: 'Elena Petrova',
  email: 'elena@petrova.works',
  avatar: 'EP',
  color: '#5e35b1',
};

const LEO_PARK: Contact = {
  name: 'Leo Park',
  email: 'leo.park@northstar.studio',
  avatar: 'LP',
  color: '#00838f',
};

const NORTHSTAR_DIGEST: Contact = {
  name: 'Northstar Digest',
  email: 'digest@northstar.studio',
  avatar: 'ND',
  color: '#3949ab',
};

const FIELDNOTES: Contact = {
  name: 'Fieldnotes',
  email: 'hello@fieldnotes.weekly',
  avatar: 'F',
  color: '#2e7d32',
};

const LEDGERLY: Contact = {
  name: 'Ledgerly',
  email: 'receipts@ledgerly.co',
  avatar: 'L',
  color: '#455a64',
};

const HARBOR_AIR: Contact = {
  name: 'Harbor Air',
  email: 'trips@harborair.example',
  avatar: 'HA',
  color: '#0277bd',
};

const CODEBASE: Contact = {
  name: 'Codebase',
  email: 'notifications@codebase.dev',
  avatar: 'C',
  color: '#24292f',
};

const PARCEL: Contact = {
  name: 'Parcel',
  email: 'updates@parcel.example',
  avatar: 'P',
  color: '#6d4c41',
};

const CANVAS_CIRCLE: Contact = {
  name: 'Canvas Circle',
  email: 'notify@canvas-circle.social',
  avatar: 'CC',
  color: '#d81b60',
};

const EVERGREEN_BANK: Contact = {
  name: 'Evergreen Bank',
  email: 'alerts@evergreen.example',
  avatar: 'EB',
  color: '#1b5e20',
};

const CASA_LUMINA: Contact = {
  name: 'Casa Lumina',
  email: 'reservations@casalumina.example',
  avatar: 'CL',
  color: '#8d6e63',
};

const STUDIO_MARKET: Contact = {
  name: 'Studio Market',
  email: 'curation@studiomarket.example',
  avatar: 'SM',
  color: '#8e24aa',
};

const PAPER_PLANE: Contact = {
  name: 'Paper Plane',
  email: 'dispatch@paperplane.example',
  avatar: 'PP',
  color: '#f4511e',
};

const SHIELD_SECURITY: Contact = {
  name: 'Sol Security',
  email: 'security@solmail.local',
  avatar: 'SS',
  color: '#b3261e',
};

export const CONTACT_SUGGESTIONS: Contact[] = [
  MAYA_CHEN,
  THEO_BENNETT,
  SOFIA_RAMIREZ,
  JORDAN_LEE,
  PRIYA_NAIR,
  MARCUS_WEBB,
  ELENA_PETROVA,
  LEO_PARK,
];

export const seedThreads: MailThread[] = [
  {
    id: 'thread-launch-narrative',
    subject: 'Q3 launch narrative: final pass',
    snippet:
      'The story is much sharper now. I resolved the comments on the opening and added the customer proof point we discussed.',
    participants: [MAYA_CHEN, CURRENT_USER, SOFIA_RAMIREZ],
    messages: [
      {
        id: 'message-launch-1',
        sender: MAYA_CHEN,
        recipients: [CURRENT_USER, SOFIA_RAMIREZ],
        timestamp: '2026-07-14T15:18:00+03:00',
        body: [
          'Hi Alex, I pulled the launch narrative into one document and tightened the first two sections. The product story now starts with the customer tension, then earns the reveal instead of leading with features.',
          'Could you focus your pass on the proof points and the final call to action? Sofia is checking the customer language against the approved quotes this afternoon.',
          'I attached the brief we reviewed on Monday so the original decisions are easy to trace.',
        ],
        attachments: [
          {
            id: 'attachment-launch-brief',
            name: 'Q3-launch-brief-v8.pdf',
            size: '2.4 MB',
            kind: 'pdf',
            accent: '#d93025',
          },
        ],
      },
      {
        id: 'message-launch-2',
        sender: CURRENT_USER,
        recipients: [MAYA_CHEN, SOFIA_RAMIREZ],
        timestamp: '2026-07-14T18:06:00+03:00',
        body: [
          'This is landing well. I left a few comments where the evidence can do more work and rewrote the closing paragraph so it echoes the opening tension.',
          'The only open question from me is whether we name the beta cohort or keep it broad. I lean toward naming them if Legal clears the line by tomorrow morning.',
        ],
        attachments: [],
      },
      {
        id: 'message-launch-3',
        sender: MAYA_CHEN,
        recipients: [CURRENT_USER, SOFIA_RAMIREZ],
        timestamp: '2026-07-15T09:42:00+03:00',
        body: [
          'The story is much sharper now. I resolved the comments on the opening and added the customer proof point we discussed. Legal approved naming the beta cohort as long as we use the shortened attribution.',
          'I also moved the feature matrix into the appendix; it was interrupting the pace. If there are no objections by 14:00, I’ll hand this version to the web team for the staging build.',
          'The clean copy is attached for one last skim. Thank you both, this finally sounds like us.',
        ],
        attachments: [
          {
            id: 'attachment-launch-copy',
            name: 'Launch-narrative-clean.docx',
            size: '186 KB',
            kind: 'document',
            accent: '#1a73e8',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'primary',
    labels: ['Work'],
    isRead: false,
    isStarred: true,
    isImportant: true,
  },
  {
    id: 'thread-security-alert',
    subject: 'New sign-in confirmed on your MacBook Pro',
    snippet:
      'We noticed a sign-in to your Sol account from Kyiv, Ukraine. You confirmed this activity a few minutes later.',
    participants: [SHIELD_SECURITY, CURRENT_USER],
    messages: [
      {
        id: 'message-security-alert',
        sender: SHIELD_SECURITY,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-15T08:11:00+03:00',
        body: [
          'We noticed a sign-in to your Sol account from a MacBook Pro in Kyiv, Ukraine. You confirmed this activity a few minutes later, so no further action is required.',
          'If this was not you, review your recent devices immediately and change your password. For your security, we never include a direct password-reset link in alert messages.',
          'Device: MacBook Pro · Browser: Chrome · Time: 08:07 EEST on July 15, 2026.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'updates',
    labels: ['Important'],
    isRead: true,
    isStarred: false,
    isImportant: true,
  },
  {
    id: 'thread-activity-digest',
    subject: 'Your workspace, week 28',
    snippet:
      '12 decisions closed, 4 milestones shipped, and one project could use your attention before Friday.',
    participants: [NORTHSTAR_DIGEST, CURRENT_USER],
    messages: [
      {
        id: 'message-activity-digest',
        sender: NORTHSTAR_DIGEST,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-15T07:30:00+03:00',
        body: [
          'Good morning, Alex. Last week your team closed 12 decisions, shipped 4 milestones, and replied to 86% of project questions within one business day.',
          'Launch readiness moved from “at risk” to “on track.” The only project that could use your attention is Partner Enablement, where two dependencies have been waiting since Monday.',
          'The attached activity export includes every status change and owner, ready for your Wednesday operations review.',
        ],
        attachments: [
          {
            id: 'attachment-activity-export',
            name: 'Workspace-activity-W28.xlsx',
            size: '94 KB',
            kind: 'sheet',
            accent: '#188038',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'updates',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-fieldnotes-summer',
    subject: 'A quieter kind of summer studio: 48 hours only',
    snippet:
      'Natural linen, low light, and the objects we keep within reach. The summer studio collection closes Thursday.',
    participants: [FIELDNOTES, CURRENT_USER],
    messages: [
      {
        id: 'message-fieldnotes-summer',
        sender: FIELDNOTES,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-15T06:45:00+03:00',
        body: [
          'This week’s edit is built around the quiet end of the workday: washed linen, warm task light, and useful objects that age well instead of asking for attention.',
          'Members receive early access through Thursday evening, along with complimentary delivery on the complete summer studio collection.',
          'No countdown theater, just a small production run and a clear closing time. We hope you find something worth keeping.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'promotions',
    labels: [],
    isRead: false,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-canvas-mention',
    subject: 'Sofia mentioned you in “Launch directions”',
    snippet:
      '“Alex, this feels closest to the confident direction you described. Would you keep the softer illustration here?”',
    participants: [CANVAS_CIRCLE, SOFIA_RAMIREZ, CURRENT_USER],
    messages: [
      {
        id: 'message-canvas-mention',
        sender: CANVAS_CIRCLE,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-14T22:16:00+03:00',
        body: [
          'Sofia Ramirez mentioned you on frame 18 of “Launch directions.”',
          '“Alex, this feels closest to the confident direction you described. Would you keep the softer illustration here, or bring back the technical linework from direction B?”',
          'There are three new replies in the thread and the presentation was updated 12 minutes ago.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'social',
    labels: ['Work'],
    isRead: false,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-lisbon-offsite',
    subject: 'Re: Lisbon offsite: rooms, flights, and Friday dinner',
    snippet:
      'All nine rooms are confirmed. I added the airport transfer windows and a backup dinner option within walking distance.',
    participants: [ELENA_PETROVA, CURRENT_USER, JORDAN_LEE],
    messages: [
      {
        id: 'message-lisbon-1',
        sender: ELENA_PETROVA,
        recipients: [CURRENT_USER, JORDAN_LEE],
        timestamp: '2026-07-12T11:24:00+03:00',
        body: [
          'I have provisional holds on nine rooms from September 17–20. The hotel can keep them until Tuesday without a deposit, and breakfast plus the small courtyard room are included.',
          'Before I confirm, can you check the arrival grid? Three people are landing after 22:00, so a shared transfer may be simpler than reimbursing separate rides.',
        ],
        attachments: [
          {
            id: 'attachment-lisbon-hotel',
            name: 'Casa-Amarela-courtyard.jpg',
            size: '1.8 MB',
            kind: 'image',
            accent: '#f9ab00',
          },
        ],
      },
      {
        id: 'message-lisbon-2',
        sender: CURRENT_USER,
        recipients: [ELENA_PETROVA, JORDAN_LEE],
        timestamp: '2026-07-13T09:10:00+03:00',
        body: [
          'The rooms look right, and the courtyard gives us a useful place for the Saturday working session. Please go ahead with the refundable rate.',
          'I marked the four people who need transfers. Let’s keep Friday dinner informal and close to the hotel; everyone will have had a long travel day.',
        ],
        attachments: [],
      },
      {
        id: 'message-lisbon-3',
        sender: ELENA_PETROVA,
        recipients: [CURRENT_USER, JORDAN_LEE],
        timestamp: '2026-07-14T17:53:00+03:00',
        body: [
          'All nine rooms are confirmed. I added the airport transfer windows and a backup dinner option within walking distance in case the terrace is closed for weather.',
          'The itinerary now leaves Saturday afternoon open after 15:00, as requested. Please flag any dietary updates before August 28 so the restaurant can adjust the shared menu.',
          'Confirmation numbers and cancellation dates are in the attached itinerary.',
        ],
        attachments: [
          {
            id: 'attachment-lisbon-itinerary',
            name: 'Lisbon-offsite-itinerary.pdf',
            size: '742 KB',
            kind: 'pdf',
            accent: '#d93025',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'primary',
    labels: ['Travel', 'Work'],
    isRead: true,
    isStarred: true,
    isImportant: true,
  },
  {
    id: 'thread-ledgerly-invoice',
    subject: 'Receipt for Ledgerly Pro: July 2026',
    snippet:
      'Your €29.00 payment was successful. The receipt and VAT invoice are attached for your records.',
    participants: [LEDGERLY, CURRENT_USER],
    messages: [
      {
        id: 'message-ledgerly-invoice',
        sender: LEDGERLY,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-14T13:04:00+03:00',
        body: [
          'We received your €29.00 payment for Ledgerly Pro. Your subscription is active through August 14, 2026, and no action is needed.',
          'The attached VAT invoice includes your company details and transaction reference. You can update billing information before the next renewal from your workspace settings.',
          'Thank you for choosing Ledgerly to keep the paperwork pleasantly uneventful.',
        ],
        attachments: [
          {
            id: 'attachment-ledgerly-invoice',
            name: 'Ledgerly-invoice-2026-07.pdf',
            size: '112 KB',
            kind: 'pdf',
            accent: '#d93025',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'updates',
    labels: ['Finance', 'Receipts'],
    isRead: false,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-dinner-wednesday',
    subject: 'Dinner Wednesday?',
    snippet:
      'Perfect. I booked the little table by the open kitchen for 19:30. Come hungry, they brought back the burnt honey dessert.',
    participants: [PRIYA_NAIR, CURRENT_USER],
    messages: [
      {
        id: 'message-dinner-1',
        sender: PRIYA_NAIR,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-13T18:31:00+03:00',
        body: [
          'I’m in town for two days and realized we haven’t had a conversation without a calendar agenda since spring. Are you free for dinner Wednesday?',
          'There’s a tiny place near the river I think you’d like: six tables, seasonal menu, mercifully no networking energy. I can do anytime after 19:00.',
        ],
        attachments: [],
      },
      {
        id: 'message-dinner-2',
        sender: CURRENT_USER,
        recipients: [PRIYA_NAIR],
        timestamp: '2026-07-14T08:46:00+03:00',
        body: [
          'Yes, absolutely. Wednesday after 19:00 works, and six tables with no networking energy is an extremely persuasive pitch.',
          'Book whatever time is easiest. I’ll come straight from the studio.',
        ],
        attachments: [],
      },
      {
        id: 'message-dinner-3',
        sender: PRIYA_NAIR,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-14T10:02:00+03:00',
        body: [
          'Perfect. I booked the little table by the open kitchen for 19:30 under my name.',
          'Come hungry, they brought back the burnt honey dessert you talked about last time. Looking forward to a properly unstructured catch-up.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'primary',
    labels: [],
    isRead: false,
    isStarred: true,
    isImportant: false,
  },
  {
    id: 'thread-studio-market',
    subject: 'Objects for a more considered desk',
    snippet:
      'This month: a cast-aluminum tray, a lamp that disappears into the room, and notebooks bound in Kyoto.',
    participants: [STUDIO_MARKET, CURRENT_USER],
    messages: [
      {
        id: 'message-studio-market',
        sender: STUDIO_MARKET,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-13T07:55:00+03:00',
        body: [
          'July’s collection is an exercise in restraint: a cast-aluminum tray, a dimmable lamp that disappears into the room, and lay-flat notebooks bound by a family workshop in Kyoto.',
          'We photographed every object in a working studio, scratches and cables included. Good tools should make room for the work rather than pretend the work is spotless.',
          'Subscribers receive complimentary EU shipping through Sunday.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'promotions',
    labels: [],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-leo-photo',
    subject: 'Leo shared a photo with you',
    snippet:
      '“The prototype wall finally looks like a real investigation instead of a conspiracy board.”',
    participants: [CANVAS_CIRCLE, LEO_PARK, CURRENT_USER],
    messages: [
      {
        id: 'message-leo-photo',
        sender: CANVAS_CIRCLE,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-12T20:19:00+03:00',
        body: [
          'Leo Park shared a photo from Northstar Studio with you.',
          '“The prototype wall finally looks like a real investigation instead of a conspiracy board. Your sequencing suggestion fixed the whole left side.”',
          'Sofia and four others reacted to the post. Replies are visible to members of the Northstar circle.',
        ],
        attachments: [
          {
            id: 'attachment-prototype-wall',
            name: 'Prototype-wall.jpg',
            size: '3.1 MB',
            kind: 'image',
            accent: '#a142f4',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'social',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-design-review',
    subject: 'Design review notes and the two decisions we owe',
    snippet:
      'I consolidated the review into two decisions: navigation depth and the default dashboard density.',
    participants: [THEO_BENNETT, CURRENT_USER],
    messages: [
      {
        id: 'message-design-review',
        sender: THEO_BENNETT,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-12T16:28:00+03:00',
        body: [
          'I consolidated the review notes into two actual decisions: whether projects live one or two levels deep, and whether the dashboard defaults to comfortable or compact density.',
          'My recommendation is one level deep and compact by default, with generous rhythm inside the detail view. That keeps scanning fast without making the product feel anxious.',
          'The attached notes include the rejected paths so we do not reopen them accidentally next week.',
        ],
        attachments: [
          {
            id: 'attachment-design-review',
            name: 'Design-review-decisions.docx',
            size: '228 KB',
            kind: 'document',
            accent: '#1a73e8',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'primary',
    labels: ['Work'],
    isRead: false,
    isStarred: false,
    isImportant: true,
    snoozedUntil: '2026-07-16T08:30:00+03:00',
  },
  {
    id: 'thread-bank-card',
    subject: 'Your virtual card was used for €84.20',
    snippet:
      'A virtual card ending in 1842 was used at Atelier Supply. This purchase matches your usual activity.',
    participants: [EVERGREEN_BANK, CURRENT_USER],
    messages: [
      {
        id: 'message-bank-card',
        sender: EVERGREEN_BANK,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-11T19:47:00+03:00',
        body: [
          'Your virtual card ending in 1842 was used for €84.20 at Atelier Supply. The transaction is currently pending and may appear under a shortened merchant name when it settles.',
          'This purchase matches your usual activity, so we have not paused the card. If you do not recognize it, freeze the card from your banking app and contact support.',
          'Merchant location: Berlin, DE · Category: Office supplies · Authorized: July 11 at 19:46 EEST.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'updates',
    labels: ['Finance'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-mentorship',
    subject: 'Notes after our mentorship session',
    snippet:
      'I tried the “show the work earlier” approach in today’s critique, and the conversation changed completely.',
    participants: [LEO_PARK, CURRENT_USER],
    messages: [
      {
        id: 'message-mentorship-1',
        sender: CURRENT_USER,
        recipients: [LEO_PARK],
        timestamp: '2026-07-09T14:12:00+03:00',
        body: [
          'A few notes while the conversation is fresh: show the rough work before you feel ready, separate the quality of an idea from the polish of its presentation, and ask for the decision you actually need.',
          'For next time, bring one project where the team is aligned and one where the energy feels stuck. The contrast will make the patterns easier to see.',
        ],
        attachments: [],
      },
      {
        id: 'message-mentorship-2',
        sender: LEO_PARK,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-11T17:26:00+03:00',
        body: [
          'I tried the “show the work earlier” approach in today’s critique, and the conversation changed completely. People commented on the premise instead of polishing details around a direction they did not believe in.',
          'I also asked directly for the decision we needed. We finished in 35 minutes and the team left with energy rather than homework. Thank you, I’m keeping these notes beside my desk.',
        ],
        attachments: [],
      },
    ],
    folder: 'inbox',
    category: 'primary',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-parcel-delivered',
    subject: 'Delivered: your Atelier Supply order',
    snippet:
      'Your package was left with the reception desk at 14:06. A delivery photo is attached.',
    participants: [PARCEL, CURRENT_USER],
    messages: [
      {
        id: 'message-parcel-delivered',
        sender: PARCEL,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-10T14:08:00+03:00',
        body: [
          'Your Atelier Supply order was delivered at 14:06 and signed for by the reception desk. Tracking number PX-2048-1193 is now complete.',
          'The courier photographed the package at the handoff point. If anything is missing or damaged, report it within 48 hours so the delivery record can be reviewed.',
          'Thanks for choosing consolidated weekday delivery.',
        ],
        attachments: [
          {
            id: 'attachment-delivery-photo',
            name: 'Delivery-photo.jpg',
            size: '684 KB',
            kind: 'image',
            accent: '#f9ab00',
          },
        ],
      },
    ],
    folder: 'inbox',
    category: 'updates',
    labels: ['Receipts'],
    isRead: false,
    isStarred: false,
    isImportant: false,
    snoozedUntil: '2026-07-18T10:00:00+03:00',
  },
  {
    id: 'thread-lease-renewal',
    subject: 'Studio lease renewal: comparison and recommendation',
    snippet:
      'The three-year option is still the strongest once we price in the fit-out credit. I highlighted the two clauses worth negotiating.',
    participants: [MARCUS_WEBB, CURRENT_USER],
    messages: [
      {
        id: 'message-lease-1',
        sender: MARCUS_WEBB,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-07T10:40:00+03:00',
        body: [
          'I modeled the two-year and three-year renewal options against a move to the smaller space upstairs. The headline rent upstairs is lower, but the fit-out and two months of disruption erase most of the savings.',
          'The three-year renewal looks best if the landlord keeps the current fit-out credit and caps the annual service-charge increase. I put both assumptions in the comparison.',
        ],
        attachments: [
          {
            id: 'attachment-lease-comparison',
            name: 'Studio-lease-comparison.xlsx',
            size: '76 KB',
            kind: 'sheet',
            accent: '#188038',
          },
        ],
      },
      {
        id: 'message-lease-2',
        sender: CURRENT_USER,
        recipients: [MARCUS_WEBB],
        timestamp: '2026-07-08T12:15:00+03:00',
        body: [
          'The comparison is clear, and I agree the disruption cost is easy to underestimate. Let’s use the three-year option as our base case.',
          'Can you push on the service-charge cap and clarify whether the fit-out credit can cover acoustic work? Those are the only two items that would change my comfort level.',
        ],
        attachments: [],
      },
      {
        id: 'message-lease-3',
        sender: MARCUS_WEBB,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-10T09:22:00+03:00',
        body: [
          'The three-year option is still the strongest once we price in the fit-out credit. The landlord agreed in principle to a 4% service-charge cap and confirmed acoustic treatment is eligible.',
          'I highlighted two remaining clauses worth negotiating: the reinstatement language and the notice period for building works. Neither is a blocker, but both are easier to settle before the draft goes to lawyers.',
        ],
        attachments: [],
      },
    ],
    folder: 'archive',
    category: 'primary',
    labels: ['Work', 'Finance'],
    isRead: true,
    isStarred: true,
    isImportant: true,
  },
  {
    id: 'thread-codebase-review',
    subject: '[sol-web] Review requested: simplify onboarding state',
    snippet:
      'Jordan Lee requested your review on pull request #482. Two checks passed and preview deployment is ready.',
    participants: [CODEBASE, JORDAN_LEE, CURRENT_USER],
    messages: [
      {
        id: 'message-codebase-review',
        sender: CODEBASE,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-09T16:03:00+03:00',
        body: [
          'Jordan Lee requested your review on pull request #482: “Simplify onboarding state and remove the legacy migration path.”',
          'Two checks passed in 4 minutes 18 seconds. The preview deployment is ready, and the change updates 8 files with 142 additions and 219 deletions.',
          'Jordan’s note: “The new reducer makes every transition explicit. I’d especially like a second pair of eyes on returning-user restoration.”',
        ],
        attachments: [],
      },
    ],
    folder: 'archive',
    category: 'updates',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-paper-plane',
    subject: 'Issue 74: The usefulness of unfinished things',
    snippet:
      'A field guide to prototypes, marginal notes, and resisting the urge to make every idea presentable too early.',
    participants: [PAPER_PLANE, CURRENT_USER],
    messages: [
      {
        id: 'message-paper-plane',
        sender: PAPER_PLANE,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-06T08:10:00+03:00',
        body: [
          'The most useful artifact in a project is often the one nobody would put in a portfolio: a rough map, an ugly prototype, a sentence with three alternatives still attached.',
          'This issue looks at teams that protect unfinished work long enough for it to teach them something. Their shared habit is simple: they agree on what the artifact is meant to answer before discussing how polished it appears.',
          'Plus: five marginal-note systems, a beautifully direct museum wayfinding study, and a reader’s defense of paper index cards.',
        ],
        attachments: [],
      },
    ],
    folder: 'archive',
    category: 'promotions',
    labels: [],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-coffee-machine',
    subject: 'Incident report: the coffee machine has opinions',
    snippet:
      'I have restored peace between the grinder and the water tank. Root cause: one heroic coffee bean in the wrong place.',
    participants: [SOFIA_RAMIREZ, CURRENT_USER, LEO_PARK],
    messages: [
      {
        id: 'message-coffee-1',
        sender: SOFIA_RAMIREZ,
        recipients: [CURRENT_USER, LEO_PARK],
        timestamp: '2026-07-03T09:14:00+03:00',
        body: [
          'The studio coffee machine is flashing every light it owns and making a sound that suggests we have disappointed it personally.',
          'I performed the approved troubleshooting ritual: power cycle, water tank, grounds tray, encouraging words. No change. Escalating to people with greater mechanical courage.',
        ],
        attachments: [],
      },
      {
        id: 'message-coffee-2',
        sender: LEO_PARK,
        recipients: [SOFIA_RAMIREZ, CURRENT_USER],
        timestamp: '2026-07-03T09:38:00+03:00',
        body: [
          'I have restored peace between the grinder and the water tank. Root cause: one heroic coffee bean wedged beneath the sensor.',
          'The machine has completed two successful test espressos. I accepted the burden of drinking both in the interest of quality assurance.',
        ],
        attachments: [],
      },
    ],
    folder: 'archive',
    category: 'primary',
    labels: ['Work'],
    isRead: true,
    isStarred: true,
    isImportant: false,
  },
  {
    id: 'thread-quarterly-tax',
    subject: 'Q2 tax estimate and August payment schedule',
    snippet:
      'The estimate is lower than April because the equipment credit landed this quarter. I included a conservative cash buffer.',
    participants: [MARCUS_WEBB, CURRENT_USER],
    messages: [
      {
        id: 'message-quarterly-tax',
        sender: MARCUS_WEBB,
        recipients: [CURRENT_USER],
        timestamp: '2026-07-01T11:05:00+03:00',
        body: [
          'The Q2 estimate is lower than April because the equipment credit landed this quarter and two contractor invoices moved into July.',
          'I included a conservative 12% cash buffer so the August payment does not compete with the offsite deposit. The workbook shows the base case, the buffer, and the effect of the two outstanding invoices.',
          'Please confirm the equipment list is complete before July 22. After that, I’ll prepare the final filing package.',
        ],
        attachments: [
          {
            id: 'attachment-tax-estimate',
            name: 'Q2-tax-estimate.xlsx',
            size: '138 KB',
            kind: 'sheet',
            accent: '#188038',
          },
          {
            id: 'attachment-tax-summary',
            name: 'Q2-payment-summary.pdf',
            size: '206 KB',
            kind: 'pdf',
            accent: '#d93025',
          },
        ],
      },
    ],
    folder: 'archive',
    category: 'updates',
    labels: ['Finance'],
    isRead: true,
    isStarred: true,
    isImportant: true,
  },
  {
    id: 'thread-intro-maya-theo',
    subject: 'Intro: Maya Chen ↔ Theo Bennett',
    snippet:
      'You both think unusually clearly about product language, and the launch system is exactly where those perspectives should meet.',
    participants: [CURRENT_USER, MAYA_CHEN, THEO_BENNETT],
    messages: [
      {
        id: 'message-intro-1',
        sender: CURRENT_USER,
        recipients: [MAYA_CHEN, THEO_BENNETT],
        timestamp: '2026-07-08T10:17:00+03:00',
        body: [
          'Maya, meet Theo. Theo, meet Maya. You both think unusually clearly about product language, and the launch system is exactly where those perspectives should meet.',
          'Maya is leading the narrative and rollout. Theo has been shaping the interaction principles and can share the reasoning behind the quieter product direction.',
          'I’ll let you take it from here, but would love to join the first 20 minutes if you find a time this week.',
        ],
        attachments: [],
      },
      {
        id: 'message-intro-2',
        sender: MAYA_CHEN,
        recipients: [CURRENT_USER, THEO_BENNETT],
        timestamp: '2026-07-08T11:02:00+03:00',
        body: [
          'Thanks, Alex. Theo, I’ve heard excellent things and have a suspiciously tidy list of questions about how the interaction principles should show up in launch language.',
          'I’m free Thursday morning or Friday after 14:00. Happy to send the current narrative ahead of time so we can spend the call on the unresolved parts.',
        ],
        attachments: [],
      },
      {
        id: 'message-intro-3',
        sender: THEO_BENNETT,
        recipients: [MAYA_CHEN, CURRENT_USER],
        timestamp: '2026-07-08T12:20:00+03:00',
        body: [
          'Great to meet you, Maya. Friday at 14:30 works well. Please send the narrative, and I’ll bring the decision log rather than another deck.',
          'Alex, consider your matchmaking successful. I’ll include you on the invite for the opening section and leave the rest optional.',
        ],
        attachments: [],
      },
    ],
    folder: 'sent',
    category: 'primary',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: true,
  },
  {
    id: 'thread-board-update',
    subject: 'June board update: final',
    snippet:
      'The headline is durable growth with a healthier delivery rhythm. I kept the risks direct and paired each one with an owner.',
    participants: [CURRENT_USER, PRIYA_NAIR],
    messages: [
      {
        id: 'message-board-update',
        sender: CURRENT_USER,
        recipients: [PRIYA_NAIR],
        timestamp: '2026-07-05T16:42:00+03:00',
        body: [
          'Attached is the final June board update. The headline is durable growth with a healthier delivery rhythm: retention improved, launch timing held, and the team reduced work in progress for the third month.',
          'I kept the risks direct and paired each one with an owner and next checkpoint. The only material change since our review is the revised enterprise pipeline weighting on page seven.',
          'Thank you for pushing on the opening. It now reads like an operating update rather than a victory lap.',
        ],
        attachments: [
          {
            id: 'attachment-board-update',
            name: 'June-board-update.pdf',
            size: '4.7 MB',
            kind: 'pdf',
            accent: '#d93025',
          },
        ],
      },
    ],
    folder: 'sent',
    category: 'primary',
    labels: ['Work', 'Finance'],
    isRead: true,
    isStarred: true,
    isImportant: true,
  },
  {
    id: 'thread-porto-photos',
    subject: 'Porto photos, finally',
    snippet:
      'A very edited selection: tiled facades, the windy bridge walk, and exactly one photograph of the legendary sandwich.',
    participants: [CURRENT_USER, ELENA_PETROVA, JORDAN_LEE],
    messages: [
      {
        id: 'message-porto-photos',
        sender: CURRENT_USER,
        recipients: [ELENA_PETROVA, JORDAN_LEE],
        timestamp: '2026-06-29T20:18:00+03:00',
        body: [
          'As promised, here is a very edited selection from Porto: tiled facades, the windy bridge walk, and exactly one photograph of the legendary sandwich.',
          'I included the full-resolution files in the archive and a smaller team photo separately for anyone who wants it without downloading everything.',
          'Thanks for making the weekend feel longer than two days. We should repeat the no-itinerary afternoon on every future trip.',
        ],
        attachments: [
          {
            id: 'attachment-porto-archive',
            name: 'Porto-weekend-selects.zip',
            size: '18.6 MB',
            kind: 'archive',
            accent: '#5f6368',
          },
          {
            id: 'attachment-porto-team',
            name: 'Team-by-the-Douro.jpg',
            size: '2.9 MB',
            kind: 'image',
            accent: '#a142f4',
          },
        ],
      },
    ],
    folder: 'sent',
    category: 'primary',
    labels: ['Travel'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-draft-keynote',
    subject: 'Keynote outline: designing for momentum',
    snippet:
      'A product should leave people with more momentum than they brought into it. The best interfaces clarify the next move…',
    participants: [CURRENT_USER, SOFIA_RAMIREZ],
    messages: [
      {
        id: 'message-draft-keynote',
        sender: CURRENT_USER,
        recipients: [SOFIA_RAMIREZ],
        timestamp: '2026-07-14T21:36:00+03:00',
        body: [
          'A product should leave people with more momentum than they brought into it. The best interfaces clarify the next move without flattening the complexity of the work.',
          'I want to show three examples: an inbox, a project handoff, and a difficult settings screen. Each one can either return energy to the user or quietly tax it.',
          'Still need: the transition into the second example, one honest failure story, and a closing that does not sound like a manifesto.',
        ],
        attachments: [
          {
            id: 'attachment-keynote-notes',
            name: 'Keynote-speaker-notes.docx',
            size: '164 KB',
            kind: 'document',
            accent: '#1a73e8',
          },
        ],
      },
    ],
    folder: 'drafts',
    category: 'primary',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: false,
    draft: {
      id: 'thread-draft-keynote',
      to: 'Sofia Ramirez <sofia.ramirez@northstar.studio>',
      cc: '',
      bcc: '',
      subject: 'Keynote outline: designing for momentum',
      body:
        'A product should leave people with more momentum than they brought into it. The best interfaces clarify the next move without flattening the complexity of the work.\n\nI want to show three examples: an inbox, a project handoff, and a difficult settings screen. Each one can either return energy to the user or quietly tax it.\n\nStill need: the transition into the second example, one honest failure story, and a closing that does not sound like a manifesto.',
      attachments: [
        {
          id: 'attachment-keynote-notes',
          name: 'Keynote-speaker-notes.docx',
          size: '164 KB',
          kind: 'document',
          accent: '#1a73e8',
        },
      ],
      isMinimized: false,
      updatedAt: '2026-07-14T21:36:00+03:00',
    },
  },
  {
    id: 'thread-draft-partnership',
    subject: 'Following up on the studio partnership',
    snippet:
      'Thank you again for the generous conversation last Thursday. I’ve been thinking about the shared residency model you described…',
    participants: [CURRENT_USER, MARCUS_WEBB],
    messages: [
      {
        id: 'message-draft-partnership',
        sender: CURRENT_USER,
        recipients: [MARCUS_WEBB],
        timestamp: '2026-07-13T23:18:00+03:00',
        body: [
          'Thank you again for the generous conversation last Thursday. I’ve been thinking about the shared residency model you described and where our teams could create something neither studio would run alone.',
          'The strongest starting point may be a two-week working residency around product storytelling, capped at twelve participants and ending with an open critique rather than a polished showcase.',
          'I’m drafting a one-page shape for it now. Would you be open to reviewing it before we involve the wider teams?',
        ],
        attachments: [],
      },
    ],
    folder: 'drafts',
    category: 'primary',
    labels: ['Work'],
    isRead: true,
    isStarred: false,
    isImportant: false,
    draft: {
      id: 'thread-draft-partnership',
      to: 'Marcus Webb <marcus@studiojuniper.co>',
      cc: '',
      bcc: '',
      subject: 'Following up on the studio partnership',
      body:
        'Thank you again for the generous conversation last Thursday. I’ve been thinking about the shared residency model you described and where our teams could create something neither studio would run alone.\n\nThe strongest starting point may be a two-week working residency around product storytelling, capped at twelve participants and ending with an open critique rather than a polished showcase.\n\nI’m drafting a one-page shape for it now. Would you be open to reviewing it before we involve the wider teams?',
      attachments: [],
      isMinimized: true,
      updatedAt: '2026-07-13T23:18:00+03:00',
    },
  },
  {
    id: 'thread-casa-reservation',
    subject: 'Your table at Casa Lumina is confirmed',
    snippet:
      'Reservation for two on June 26 at 20:00. We’ll hold the table for 15 minutes after your booking time.',
    participants: [CASA_LUMINA, CURRENT_USER],
    messages: [
      {
        id: 'message-casa-reservation',
        sender: CASA_LUMINA,
        recipients: [CURRENT_USER],
        timestamp: '2026-06-24T12:32:00+03:00',
        body: [
          'Your reservation for two is confirmed for Friday, June 26 at 20:00. We have noted your preference for the terrace and will do our best to accommodate it.',
          'We’ll hold the table for 15 minutes after your booking time. Please reply before noon on Friday if your plans change or if we should note any allergies.',
          'We look forward to welcoming you to Casa Lumina.',
        ],
        attachments: [],
      },
    ],
    folder: 'trash',
    category: 'updates',
    labels: ['Travel'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-market-last-chance',
    subject: 'Last chance: archive furniture at 30% off',
    snippet:
      'The archive closes tonight. Floor samples and discontinued finishes are available while the remaining pieces last.',
    participants: [STUDIO_MARKET, CURRENT_USER],
    messages: [
      {
        id: 'message-market-last-chance',
        sender: STUDIO_MARKET,
        recipients: [CURRENT_USER],
        timestamp: '2026-06-21T09:08:00+03:00',
        body: [
          'Our archive closes tonight at 23:00. The remaining collection includes floor samples, discontinued finishes, and a handful of pieces from last winter’s exhibition.',
          'Every item has been inspected and photographed individually. Condition notes appear beneath the dimensions, including the small imperfections we think make each piece more interesting.',
          'Archive purchases are final, and local delivery can be scheduled through July 10.',
        ],
        attachments: [],
      },
    ],
    folder: 'trash',
    category: 'promotions',
    labels: [],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-social-digest',
    subject: 'A week of studio updates you may have missed',
    snippet:
      'Maya published a process note, Leo added six prototype photos, and your launch board received 18 reactions.',
    participants: [CANVAS_CIRCLE, CURRENT_USER],
    messages: [
      {
        id: 'message-social-digest',
        sender: CANVAS_CIRCLE,
        recipients: [CURRENT_USER],
        timestamp: '2026-06-18T08:00:00+03:00',
        body: [
          'While you were away, Maya published a process note about editing the launch story, Leo added six prototype photos, and your launch board received 18 reactions.',
          'The Northstar circle also welcomed two new members. Your most active conversation was “What should feel faster?” with 24 replies across three days.',
          'You can adjust weekly digest frequency or mute individual circles from notification settings.',
        ],
        attachments: [],
      },
    ],
    folder: 'trash',
    category: 'social',
    labels: [],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
  {
    id: 'thread-harbor-flight',
    subject: 'Your flight credit expires August 31',
    snippet:
      'You have €146.80 in flight credit remaining from booking HA-80419. Apply it to travel completed by February 2027.',
    participants: [HARBOR_AIR, CURRENT_USER],
    messages: [
      {
        id: 'message-harbor-flight',
        sender: HARBOR_AIR,
        recipients: [CURRENT_USER],
        timestamp: '2026-06-16T10:25:00+03:00',
        body: [
          'You have €146.80 in flight credit remaining from booking HA-80419. The credit must be applied by August 31, 2026, to travel completed before February 28, 2027.',
          'Credits can be combined with a card payment but cannot be transferred to another traveler. Your original route does not limit where the credit can be used.',
          'Keep this message for reference; the credit code appears in your Harbor Air profile under Wallet.',
        ],
        attachments: [],
      },
    ],
    folder: 'archive',
    category: 'updates',
    labels: ['Travel'],
    isRead: true,
    isStarred: false,
    isImportant: false,
  },
];

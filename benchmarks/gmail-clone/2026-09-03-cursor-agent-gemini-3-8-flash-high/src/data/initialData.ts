import { Thread, Label, UserAccount, MailSettings } from '../types/mail';

export const CURRENT_USER: UserAccount = {
  id: 'user-1',
  name: 'Melvyn Malherbe',
  email: 'melvyn@example.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&auto=format&fit=crop&q=80',
  storageUsed: '11.4 GB',
  storageLimit: '15 GB',
  storagePercent: 76,
};

export const ALTERNATE_ACCOUNTS: UserAccount[] = [
  {
    id: 'user-2',
    name: 'Melvyn (Work)',
    email: 'melvyn.work@company.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&auto=format&fit=crop&q=80',
    storageUsed: '42.8 GB',
    storageLimit: '100 GB',
    storagePercent: 43,
  },
  {
    id: 'user-3',
    name: 'Melvyn (Open Source)',
    email: 'melvyn.dev@github.community',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&auto=format&fit=crop&q=80',
    storageUsed: '2.1 GB',
    storageLimit: '15 GB',
    storagePercent: 14,
  },
];

export const INITIAL_LABELS: Label[] = [
  { id: 'work', name: 'Work', color: '#1a73e8', bgColor: '#e8f0fe', textColor: '#174ea6' },
  { id: 'personal', name: 'Personal', color: '#188038', bgColor: '#e6f4ea', textColor: '#137333' },
  { id: 'finance', name: 'Finance', color: '#12b5cb', bgColor: '#e4f7fb', textColor: '#0e8090' },
  { id: 'travel', name: 'Travel', color: '#9334e6', bgColor: '#f3e8fd', textColor: '#7b1fa2' },
  { id: 'urgent', name: 'Urgent', color: '#d93025', bgColor: '#fce8e6', textColor: '#c5221f' },
  { id: 'projects', name: 'Projects', color: '#e37400', bgColor: '#fef7e0', textColor: '#b06000' },
];

export const INITIAL_SETTINGS: MailSettings = {
  density: 'default',
  theme: 'light',
  signature: `--\nMelvyn Malherbe\nLead Software Engineer\nSent with gemini-3.8-flash-high Mail`,
  vacationResponder: {
    enabled: false,
    subject: 'Out of Office: Vacation',
    message: 'Thanks for reaching out! I am currently away with limited access to email. For urgent matters, please contact support.',
  },
  keyboardShortcuts: true,
  smartReply: true,
  conversationView: true,
};

const now = Date.now();
const min = 60 * 1000;
const hour = 60 * min;
const day = 24 * hour;

export const INITIAL_THREADS: Thread[] = [
  // 1. PRIMARY - Strategy Offsite (Multi-message thread, attachments, unread)
  {
    id: 'thread-1',
    subject: 'Q3 Strategy Offsite - Agenda & Travel Details',
    snippet: 'Hey team, here is the updated schedule for next week in Lake Tahoe. Please review the deck and let me know if anyone needs dietary adjustments...',
    lastMessageDate: now - 14 * min,
    participants: [
      { name: 'Sarah Lin', email: 'sarah.lin@techcorp.io', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80' },
      { name: 'Alex Chen', email: 'alex.chen@techcorp.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' },
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
    ],
    unreadCount: 1,
    isStarred: true,
    isImportant: true,
    labels: ['work', 'urgent'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-1-1',
        threadId: 'thread-1',
        from: { name: 'Sarah Lin', email: 'sarah.lin@techcorp.io', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }, { name: 'Alex Chen', email: 'alex.chen@techcorp.io' }],
        subject: 'Q3 Strategy Offsite - Agenda & Travel Details',
        body: `<p>Hi Melvyn and Alex,</p>
<p>Excited for next week! I've finalized our offsite itinerary in Lake Tahoe. Our main goals are:</p>
<ul class="list-disc pl-5 my-2 space-y-1">
  <li>Lock down Q3 and Q4 product roadmaps</li>
  <li>Architectural decisions for the real-time sync engine</li>
  <li>Team building and hiking at Emerald Bay</li>
</ul>
<p>Attached is the full briefing PDF and our presentation deck. Take a look and let me know if you want any sessions adjusted.</p>
<p>Best,<br>Sarah</p>`,
        snippet: "Excited for next week! I've finalized our offsite itinerary in Lake Tahoe...",
        date: now - 2 * day,
        read: true,
        starred: false,
        important: true,
        labels: ['work'],
        category: 'primary',
        attachments: [
          { id: 'att-1-1', filename: 'Q3-Offsite-Agenda.pdf', size: '2.4 MB', type: 'pdf' },
          { id: 'att-1-2', filename: 'Sync-Engine-Architecture.pdf', size: '4.8 MB', type: 'pdf' },
        ],
      },
      {
        id: 'msg-1-2',
        threadId: 'thread-1',
        from: { name: 'Alex Chen', email: 'alex.chen@techcorp.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' },
        to: [{ name: 'Sarah Lin', email: 'sarah.lin@techcorp.io' }, { name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Re: Q3 Strategy Offsite - Agenda & Travel Details',
        body: `<p>Looks great Sarah! I've booked my rental car from Reno airport so I can pick up 3 other people if anyone is arriving Tuesday afternoon.</p>
<p>Also, could we carve out 45 minutes on Wednesday morning for benchmarking results review?</p>
<p>Alex</p>`,
        snippet: "Looks great Sarah! I've booked my rental car from Reno airport...",
        date: now - 1 * day,
        read: true,
        starred: false,
        important: false,
        labels: ['work'],
        category: 'primary',
      },
      {
        id: 'msg-1-3',
        threadId: 'thread-1',
        from: { name: 'Sarah Lin', email: 'sarah.lin@techcorp.io', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }, { name: 'Alex Chen', email: 'alex.chen@techcorp.io' }],
        subject: 'Re: Q3 Strategy Offsite - Agenda & Travel Details',
        body: `<p>Added the benchmarking slot right after coffee on Wednesday at 10:15 AM!</p>
<p>Melvyn, can you confirm if you'll need a projector adapter for your keynote demo?</p>
<p>See you all very soon!</p>`,
        snippet: 'Added the benchmarking slot right after coffee on Wednesday at 10:15 AM! Melvyn, can you confirm...',
        date: now - 14 * min,
        read: false,
        starred: true,
        important: true,
        labels: ['work', 'urgent'],
        category: 'primary',
      },
    ],
  },

  // 2. PRIMARY - Flight Confirmation (Rich travel email, attachment)
  {
    id: 'thread-2',
    subject: 'Flight Confirmation: San Francisco (SFO) to New York (JFK) - DL 482',
    snippet: 'Your booking is confirmed! Confirmation Code: H8XK9P. Flight DL 482 departs SFO at 08:30 AM on Sep 12. Terminal 2, Gate C4...',
    lastMessageDate: now - 45 * min,
    participants: [{ name: 'Delta Air Lines', email: 'ticketreceipt@delta.com' }],
    unreadCount: 1,
    isStarred: true,
    isImportant: true,
    labels: ['travel'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-2-1',
        threadId: 'thread-2',
        from: { name: 'Delta Air Lines', email: 'ticketreceipt@delta.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Flight Confirmation: San Francisco (SFO) to New York (JFK) - DL 482',
        body: `<div class="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800 my-2">
  <div class="flex justify-between items-center border-b border-blue-200 dark:border-blue-800 pb-3 mb-3">
    <div>
      <span class="text-xs uppercase font-bold tracking-wider text-blue-600 dark:text-blue-400">Confirmation Code</span>
      <div class="text-2xl font-bold font-mono tracking-widest text-gray-900 dark:text-white">H8XK9P</div>
    </div>
    <span class="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-semibold">CONFIRMED</span>
  </div>
  <div class="grid grid-cols-2 gap-4 text-sm">
    <div>
      <div class="text-gray-500 dark:text-gray-400 text-xs">DEPARTURE</div>
      <div class="font-bold text-base">San Francisco (SFO)</div>
      <div>Sep 12, 2026 · 08:30 AM</div>
      <div class="text-xs text-gray-600 dark:text-gray-300">Terminal 2 · Gate C4</div>
    </div>
    <div>
      <div class="text-gray-500 dark:text-gray-400 text-xs">ARRIVAL</div>
      <div class="font-bold text-base">New York (JFK)</div>
      <div>Sep 12, 2026 · 04:55 PM</div>
      <div class="text-xs text-gray-600 dark:text-gray-300">Terminal 4 · Gate B22</div>
    </div>
  </div>
  <div class="mt-4 pt-3 border-t border-blue-200 dark:border-blue-800 flex justify-between text-xs text-gray-600 dark:text-gray-400">
    <span>Passenger: <strong>Melvyn Malherbe</strong></span>
    <span>Seat: <strong>14A (Comfort+)</strong></span>
  </div>
</div>
<p class="text-sm mt-3">Please arrive at the airport at least 2 hours before scheduled departure. Check-in opens 24 hours prior to flight time.</p>`,
        snippet: 'Your booking is confirmed! Confirmation Code: H8XK9P. Flight DL 482 departs SFO at 08:30 AM...',
        date: now - 45 * min,
        read: false,
        starred: true,
        important: true,
        labels: ['travel'],
        category: 'primary',
        attachments: [
          { id: 'att-2-1', filename: 'Delta-E-Ticket-H8XK9P.pdf', size: '340 KB', type: 'pdf' },
          { id: 'att-2-2', filename: 'Boarding-Pass-DL482.pkpass', size: '85 KB', type: 'other' },
        ],
      },
    ],
  },

  // 3. PRIMARY - Design System RC (Attachments with UI previews)
  {
    id: 'thread-3',
    subject: 'Design System v2.4 Release Candidate Feedback',
    snippet: 'Hey Melvyn, we just pushed the v2.4 candidate tokens and component specs to Figma. We overhauled the modal layering, accessible contrast ratios...',
    lastMessageDate: now - 2 * hour,
    participants: [
      { name: 'Maya Patel', email: 'maya.patel@designstudio.co', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80' },
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
    ],
    unreadCount: 0,
    isStarred: false,
    isImportant: true,
    labels: ['work', 'projects'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-3-1',
        threadId: 'thread-3',
        from: { name: 'Maya Patel', email: 'maya.patel@designstudio.co', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Design System v2.4 Release Candidate Feedback',
        body: `<p>Hey Melvyn,</p>
<p>We've polished the component spec for the v2.4 release. Key highlights:</p>
<ul class="list-disc pl-5 my-2 space-y-1">
  <li>Refined surface elevations (lighter dropshadows, crisper borders)</li>
  <li>WCAG AAA color compliance on all primary and secondary buttons</li>
  <li>New animation spring curves for micro-interactions</li>
</ul>
<p>Here are two screenshot mockups showcasing the light and dark mail themes side-by-side.</p>
<p>Let me know what you think before we tag the npm release!</p>
<p>Cheers,<br>Maya</p>`,
        snippet: 'Hey Melvyn, we just pushed the v2.4 candidate tokens and component specs to Figma...',
        date: now - 2 * hour,
        read: true,
        starred: false,
        important: true,
        labels: ['work', 'projects'],
        category: 'primary',
        attachments: [
          { id: 'att-3-1', filename: 'theme-spec-light.png', size: '1.2 MB', type: 'image', previewUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80' },
          { id: 'att-3-2', filename: 'theme-spec-dark.png', size: '1.1 MB', type: 'image', previewUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80' },
        ],
      },
    ],
  },

  // 4. PRIMARY - Dinner this Friday
  {
    id: 'thread-4',
    subject: 'Dinner this Friday in Hayes Valley?',
    snippet: 'Are you free around 7:30 PM? David and I were thinking of checking out that new Italian spot on Gough Street. They take walk-ins before 8...',
    lastMessageDate: now - 3 * hour,
    participants: [
      { name: 'Emily Zhao', email: 'emily.zhao@gmail.com', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80' },
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
    ],
    unreadCount: 0,
    isStarred: true,
    isImportant: false,
    labels: ['personal'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-4-1',
        threadId: 'thread-4',
        from: { name: 'Emily Zhao', email: 'emily.zhao@gmail.com', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Dinner this Friday in Hayes Valley?',
        body: `<p>Hey Melvyn!</p>
<p>Are you free this Friday around 7:30 PM? David and I want to celebrate finishing our demo and check out that new handmade pasta spot on Gough.</p>
<p>Let us know if you can make it and I'll put our name on the waitlist early!</p>
<p>Best,<br>Emily</p>`,
        snippet: 'Are you free around 7:30 PM? David and I were thinking of checking out...',
        date: now - 3 * hour,
        read: true,
        starred: true,
        important: false,
        labels: ['personal'],
        category: 'primary',
      },
    ],
  },

  // 5. PRIMARY - Doctor Appointment Reminder
  {
    id: 'thread-5',
    subject: 'Appointment Reminder: Dr. Jessica Weiss on Tuesday, Sep 8',
    snippet: 'This is a confirmation of your upcoming appointment on Tuesday, September 8 at 10:00 AM PST at Pacific Medical Center, Suite 410...',
    lastMessageDate: now - 5 * hour,
    participants: [{ name: 'Pacific Health Center', email: 'reminders@pacifichealth.org' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: ['personal'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-5-1',
        threadId: 'thread-5',
        from: { name: 'Pacific Health Center', email: 'reminders@pacifichealth.org' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Appointment Reminder: Dr. Jessica Weiss on Tuesday, Sep 8',
        body: `<p>Dear Melvyn,</p>
<p>Your upcoming visit with <strong>Dr. Jessica Weiss (Annual Wellness Exam)</strong> is scheduled for:</p>
<p class="font-bold text-gray-800 dark:text-gray-200">Tuesday, September 8, 2026 at 10:00 AM PST</p>
<p>Location: 2100 Webster Street, Suite 410, San Francisco, CA 94115.</p>
<p>Please bring a valid photo ID and insurance card. If you need to reschedule, reply to this message or call (415) 555-0199 at least 24 hours in advance.</p>`,
        snippet: 'This is a confirmation of your upcoming appointment on Tuesday, September 8 at 10:00 AM PST...',
        date: now - 5 * hour,
        read: true,
        starred: false,
        important: false,
        labels: ['personal'],
        category: 'primary',
        attachments: [
          { id: 'att-5-1', filename: 'appointment-invite.ics', size: '4 KB', type: 'other' },
        ],
      },
    ],
  },

  // 6. PRIMARY - Apartment Lease Renewal
  {
    id: 'thread-6',
    subject: 'Apartment Lease Renewal - Notice & Options for 2026-2027',
    snippet: 'Dear Melvyn, Your current residential lease agreement expires on October 31, 2026. We are pleased to offer renewal options with zero rate increase...',
    lastMessageDate: now - 1 * day,
    participants: [{ name: 'Mission Bay Property Mgmt', email: 'leasing@missionbayliving.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: true,
    labels: ['finance'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-6-1',
        threadId: 'thread-6',
        from: { name: 'Mission Bay Property Mgmt', email: 'leasing@missionbayliving.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Apartment Lease Renewal - Notice & Options for 2026-2027',
        body: `<p>Dear Melvyn,</p>
<p>Your lease for Unit 402 at 1200 4th Street expires on October 31, 2026.</p>
<p>We would love to have you continue staying with us. As a thank-you for being a resident for over two years, we are locking in your existing monthly rate for a 12-month extension.</p>
<p>Please review the attached DocuSign agreement and sign electronically by September 20, 2026.</p>
<p>Warm regards,<br>Katherine Bell, Community Director</p>`,
        snippet: 'Dear Melvyn, Your current residential lease agreement expires on October 31, 2026...',
        date: now - 1 * day,
        read: true,
        starred: false,
        important: true,
        labels: ['finance'],
        category: 'primary',
        attachments: [
          { id: 'att-6-1', filename: 'Lease-Renewal-Agreement-Unit402.pdf', size: '1.8 MB', type: 'pdf' },
        ],
      },
    ],
  },

  // 7. SOCIAL - GitHub Pull Request
  {
    id: 'thread-7',
    subject: '[agent-benchmarks] Pull Request #142: Speed up transcript parsing & token analysis',
    snippet: 'codex-bot opened a new pull request #142. Closes #139. 4 files changed, +184 lines, -29 lines. All checks passed (4/4)...',
    lastMessageDate: now - 22 * min,
    participants: [{ name: 'GitHub Notifications', email: 'notifications@github.com' }],
    unreadCount: 1,
    isStarred: true,
    isImportant: true,
    labels: ['projects', 'work'],
    category: 'social',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-7-1',
        threadId: 'thread-7',
        from: { name: 'GitHub Notifications', email: 'notifications@github.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: '[agent-benchmarks] Pull Request #142: Speed up transcript parsing & token analysis',
        body: `<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
  <div class="flex items-center gap-2 mb-2">
    <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Open</span>
    <span class="font-bold text-gray-900 dark:text-gray-100">#142: Speed up transcript parsing & token analysis</span>
  </div>
  <p class="text-sm text-gray-600 dark:text-gray-300 mb-3"><strong>@codex-bot</strong> wants to merge 3 commits into <code>main</code> from <code>bot/fast-parse</code></p>
  <div class="bg-gray-50 dark:bg-gray-900/50 p-3 rounded font-mono text-xs border border-gray-200 dark:border-gray-800 space-y-1">
    <div class="text-green-600 dark:text-green-400">+ parse-transcript: streaming regex scan reduction (4.2x speedup)</div>
    <div class="text-green-600 dark:text-green-400">+ cache model pricing tables in memory across multi-run audits</div>
    <div class="text-blue-600 dark:text-blue-400">* test: add benchmark fixture with 12k lines of raw terminal output</div>
  </div>
  <div class="mt-4 flex gap-3">
    <a href="#/view-pr" class="px-3 py-1.5 bg-[#1a73e8] text-white rounded text-xs font-medium hover:bg-blue-600">Review Pull Request</a>
    <a href="#/diff" class="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700">View Diffs (+184 / -29)</a>
  </div>
</div>`,
        snippet: 'codex-bot opened a new pull request #142. Closes #139. 4 files changed...',
        date: now - 22 * min,
        read: false,
        starred: true,
        important: true,
        labels: ['projects'],
        category: 'social',
      },
    ],
  },

  // 8. SOCIAL - LinkedIn Updates
  {
    id: 'thread-8',
    subject: 'Elena Rostova and 3 other connections shared new engineering posts',
    snippet: 'Elena Rostova: "Excited to announce our open-source release of high-throughput vector indexing on macOS Metal..." See who else shared updates...',
    lastMessageDate: now - 6 * hour,
    participants: [{ name: 'LinkedIn', email: 'updates@linkedin.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: [],
    category: 'social',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-8-1',
        threadId: 'thread-8',
        from: { name: 'LinkedIn', email: 'updates@linkedin.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Elena Rostova and 3 other connections shared new engineering posts',
        body: `<p>Trending in your network today:</p>
<p><strong>Elena Rostova</strong> (Staff Engineer at Anthropic):<br>
"Excited to share our technical writeup on memory-efficient context window indexing. Check out the benchmarks below!"</p>
<p class="text-xs text-gray-500 mt-4">You have 14 new profile views this week.</p>`,
        snippet: 'Elena Rostova: "Excited to announce our open-source release of high-throughput vector indexing..."',
        date: now - 6 * hour,
        read: true,
        starred: false,
        important: false,
        labels: [],
        category: 'social',
      },
    ],
  },

  // 9. SOCIAL - Twitter / X Mentions
  {
    id: 'thread-9',
    subject: 'Alex Vance (@alexv) liked and replied to your post on benchmarks',
    snippet: 'Alex Vance (@alexv): "The difference in tool-call latency between 3.7 and 3.8 is staggering. Really great visualization!"',
    lastMessageDate: now - 1 * day,
    participants: [{ name: 'X Notifications', email: 'notify@x.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: [],
    category: 'social',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-9-1',
        threadId: 'thread-9',
        from: { name: 'X Notifications', email: 'notify@x.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Alex Vance (@alexv) liked and replied to your post on benchmarks',
        body: `<p><strong>Alex Vance (@alexv)</strong> replied to your post:</p>
<blockquote class="border-l-4 border-blue-500 pl-3 my-2 text-gray-700 dark:text-gray-300 italic">
  "The difference in tool-call latency between 3.7 and 3.8 is staggering. Really great visualization! Are you releasing the evaluation script as open source?"
</blockquote>
<p class="text-xs text-gray-500 mt-3">28 likes · 9 retweets · 4 bookmarks</p>`,
        snippet: 'Alex Vance (@alexv): "The difference in tool-call latency between 3.7 and 3.8 is staggering..."',
        date: now - 1 * day,
        read: true,
        starred: false,
        important: false,
        labels: [],
        category: 'social',
      },
    ],
  },

  // 10. PROMOTIONS - Stripe Sessions 2026
  {
    id: 'thread-10',
    subject: 'Stripe Sessions 2026: Keynotes, Workshops, and Early Bird Access',
    snippet: 'Join us May 19-21 in San Francisco. Discover the future of AI payments, programmable billing, and merchant global commerce. Early bird tickets end Friday...',
    lastMessageDate: now - 3 * hour,
    participants: [{ name: 'Stripe Events', email: 'sessions@stripe.com' }],
    unreadCount: 1,
    isStarred: false,
    isImportant: false,
    labels: [],
    category: 'promotions',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-10-1',
        threadId: 'thread-10',
        from: { name: 'Stripe Events', email: 'sessions@stripe.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Stripe Sessions 2026: Keynotes, Workshops, and Early Bird Access',
        body: `<div class="text-center p-6 bg-gradient-to-r from-[#635BFF] to-[#0A2540] text-white rounded-xl mb-4">
  <h2 class="text-2xl font-bold mb-2">Stripe Sessions 2026</h2>
  <p class="text-sm opacity-90 mb-4">May 19–21, 2026 · Moscone Center, San Francisco</p>
  <span class="inline-block px-4 py-2 bg-white text-[#635BFF] font-bold rounded-md text-sm shadow">Claim 40% Early Bird Pass</span>
</div>
<p>Sessions is Stripe's annual user conference where builders discuss what's next in payments, autonomous billing, and agentic commerce.</p>
<ul class="list-disc pl-5 my-3 space-y-1 text-sm">
  <li>40+ breakout technical sessions with core architects</li>
  <li>Hands-on code labs with the Stripe developer platform</li>
  <li>Founder firesides and networking lounges</li>
</ul>`,
        snippet: 'Join us May 19-21 in San Francisco. Discover the future of AI payments...',
        date: now - 3 * hour,
        read: false,
        starred: false,
        important: false,
        labels: [],
        category: 'promotions',
      },
    ],
  },

  // 11. PROMOTIONS - Substack Lenny's Newsletter
  {
    id: 'thread-11',
    subject: "Lenny's Newsletter: How high-performing product orgs execute without friction",
    snippet: 'Deep dive into roadmapping frameworks used by Figma, Linear, and Notion. Plus: why 80% of quarterly planning rituals are counterproductive...',
    lastMessageDate: now - 8 * hour,
    participants: [{ name: "Lenny's Newsletter", email: 'lenny@substack.com' }],
    unreadCount: 0,
    isStarred: true,
    isImportant: false,
    labels: ['personal'],
    category: 'promotions',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-11-1',
        threadId: 'thread-11',
        from: { name: "Lenny's Newsletter", email: 'lenny@substack.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: "Lenny's Newsletter: How high-performing product orgs execute without friction",
        body: `<p>Welcome to this week's edition of Lenny's Newsletter. Today we are unpacking one of the hardest problems in tech: <strong>how to align 200 engineers without a million review meetings.</strong></p>
<p>Here are the 3 foundational operating principles:</p>
<ol class="list-decimal pl-5 my-3 space-y-2">
  <li><strong>Extreme ownership over end-to-end features</strong> - No handoff bottlenecks between designers and developers.</li>
  <li><strong>Async RFC culture</strong> - Decisions documented in Markdown before code is written.</li>
  <li><strong>Continuous customer signals</strong> - Telemetry over committee opinions.</li>
</ol>
<p>Read the full 18-minute essay on Substack.</p>`,
        snippet: 'Deep dive into roadmapping frameworks used by Figma, Linear, and Notion...',
        date: now - 8 * hour,
        read: true,
        starred: true,
        important: false,
        labels: ['personal'],
        category: 'promotions',
      },
    ],
  },

  // 12. PROMOTIONS - Patagonia End of Season
  {
    id: 'thread-12',
    subject: 'Patagonia: Up to 40% off Past-Season Favorites and Outerwear',
    snippet: 'Explore our latest Worn Wear and durable trail gear on sale. Free shipping on all orders over $75. Every garment backed by the Ironclad Guarantee...',
    lastMessageDate: now - 1 * day,
    participants: [{ name: 'Patagonia', email: 'patagonia@news.patagonia.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: [],
    category: 'promotions',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-12-1',
        threadId: 'thread-12',
        from: { name: 'Patagonia', email: 'patagonia@news.patagonia.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Patagonia: Up to 40% off Past-Season Favorites and Outerwear',
        body: `<p>Quality gear made to endure seasons of adventure. Save up to 40% on select waterproof shells, organic cotton fleeces, and recycled daypacks.</p>
<p>Guaranteed for life. If it breaks, we repair it.</p>`,
        snippet: 'Explore our latest Worn Wear and durable trail gear on sale...',
        date: now - 1 * day,
        read: true,
        starred: false,
        important: false,
        labels: [],
        category: 'promotions',
      },
    ],
  },

  // 13. UPDATES - Vercel Deployment Success
  {
    id: 'thread-13',
    subject: 'Deployment Succeeded: benchmark-workbench-v2 (Production)',
    snippet: 'Production deployment completed in 38s. Commit: 9b207a1 ("feat: add interactive timeline scrub"). Domains: benchmarks.internal.dev...',
    lastMessageDate: now - 35 * min,
    participants: [{ name: 'Vercel Deployments', email: 'notifications@vercel.com' }],
    unreadCount: 1,
    isStarred: false,
    isImportant: true,
    labels: ['work', 'projects'],
    category: 'updates',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-13-1',
        threadId: 'thread-13',
        from: { name: 'Vercel Deployments', email: 'notifications@vercel.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Deployment Succeeded: benchmark-workbench-v2 (Production)',
        body: `<div class="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
  <div class="flex items-center gap-2 mb-3">
    <div class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
    <span class="font-bold text-gray-900 dark:text-gray-100">Production Deployment Ready</span>
  </div>
  <table class="w-full text-xs text-gray-600 dark:text-gray-300 space-y-2">
    <tr><td class="py-1 font-semibold text-gray-500">Project:</td><td class="py-1 font-mono">benchmark-workbench-v2</td></tr>
    <tr><td class="py-1 font-semibold text-gray-500">Commit:</td><td class="py-1 font-mono">9b207a1 (feat: add interactive timeline scrub)</td></tr>
    <tr><td class="py-1 font-semibold text-gray-500">Build Time:</td><td class="py-1 font-mono">38 seconds</td></tr>
    <tr><td class="py-1 font-semibold text-gray-500">URL:</td><td class="py-1 font-mono text-blue-600 dark:text-blue-400">https://benchmarks-v2-prod.vercel.app</td></tr>
  </table>
</div>`,
        snippet: 'Production deployment completed in 38s. Commit: 9b207a1...',
        date: now - 35 * min,
        read: false,
        starred: false,
        important: true,
        labels: ['work', 'projects'],
        category: 'updates',
      },
    ],
  },

  // 14. UPDATES - Linear Issue Assignment
  {
    id: 'thread-14',
    subject: 'Linear: Sarah Lin assigned you ENG-4091: Add optimistic UI to thread replies',
    snippet: 'Sarah Lin assigned you ENG-4091. Priority: High. Description: When clicking Send on a reply, immediately append the message bubble before waiting for server ack...',
    lastMessageDate: now - 2 * hour,
    participants: [{ name: 'Linear', email: 'notifications@linear.app' }],
    unreadCount: 0,
    isStarred: true,
    isImportant: true,
    labels: ['work', 'urgent'],
    category: 'updates',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-14-1',
        threadId: 'thread-14',
        from: { name: 'Linear', email: 'notifications@linear.app' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Linear: Sarah Lin assigned you ENG-4091: Add optimistic UI to thread replies',
        body: `<p><strong>Sarah Lin</strong> assigned you to <strong>ENG-4091</strong></p>
<div class="border-l-4 border-[#5E6AD2] pl-3 my-3">
  <h3 class="font-bold text-gray-900 dark:text-white">ENG-4091: Add optimistic UI to thread replies</h3>
  <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">Users expect instant feedback when sending a reply. The draft box should clear instantly, and an optimistic message bubble with a subtle sending status spinner should render in the conversation thread.</p>
</div>
<p class="text-xs text-gray-500">Estimate: 3 points · Sprint: 2026-W36</p>`,
        snippet: 'Sarah Lin assigned you ENG-4091. Priority: High...',
        date: now - 2 * hour,
        read: true,
        starred: true,
        important: true,
        labels: ['work', 'urgent'],
        category: 'updates',
      },
    ],
  },

  // 15. UPDATES - AWS Billing Alert
  {
    id: 'thread-15',
    subject: 'Amazon Web Services: Monthly Billing Forecast Alert',
    snippet: 'AWS Budget Alert: Your forecasted charges for account #8492-1049-3321 have exceeded 85% of your monthly $200.00 budget ($174.50 forecasted)...',
    lastMessageDate: now - 12 * hour,
    participants: [{ name: 'AWS CloudWatch Alerts', email: 'no-reply-aws@amazon.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: true,
    labels: ['finance'],
    category: 'updates',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-15-1',
        threadId: 'thread-15',
        from: { name: 'AWS CloudWatch Alerts', email: 'no-reply-aws@amazon.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Amazon Web Services: Monthly Billing Forecast Alert',
        body: `<p>Dear AWS Customer,</p>
<p>You requested that we alert you when your estimated monthly bill is forecasted to exceed $200.00.</p>
<p>Current month-to-date spend: <strong>$142.10</strong><br>
Forecasted end-of-month spend: <strong>$174.50</strong></p>
<p>Top services by spend:<br>
1. Amazon EC2 (g5.2xlarge GPU instances): $98.40<br>
2. Amazon S3 (Standard Storage): $24.80<br>
3. Amazon CloudFront: $18.90</p>`,
        snippet: 'AWS Budget Alert: Your forecasted charges for account #8492-1049-3321 have exceeded 85%...',
        date: now - 12 * hour,
        read: true,
        starred: false,
        important: true,
        labels: ['finance'],
        category: 'updates',
      },
    ],
  },

  // 16. SENT - Client Follow-up
  {
    id: 'thread-16',
    subject: 'Follow-up: Architecture review and migration milestones',
    snippet: 'Hi David, Great meeting earlier today. As discussed, our team will deliver the Phase 1 migration specification by Thursday. I have attached the milestone summary...',
    lastMessageDate: now - 1 * day,
    participants: [
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
      { name: 'David Miller', email: 'david.miller@clientcorp.com' },
    ],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: ['work'],
    category: 'primary',
    folder: 'sent',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-16-1',
        threadId: 'thread-16',
        from: { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
        to: [{ name: 'David Miller', email: 'david.miller@clientcorp.com' }],
        subject: 'Follow-up: Architecture review and migration milestones',
        body: `<p>Hi David,</p>
<p>Thank you for your time today during the technical review. As agreed, we've outlined the three delivery phases for migrating the data pipeline:</p>
<ul class="list-disc pl-5 my-2 space-y-1">
  <li>Phase 1 (Sep 15): Schema normalization and dual-write replication</li>
  <li>Phase 2 (Sep 29): Shadow validation & latency benchmarks</li>
  <li>Phase 3 (Oct 10): Zero-downtime cutover</li>
</ul>
<p>Attached is the full milestone sheet. Let me know if your security team has any questions.</p>
<p>Best regards,<br>Melvyn</p>`,
        snippet: 'Hi David, Great meeting earlier today. As discussed, our team will deliver...',
        date: now - 1 * day,
        read: true,
        starred: false,
        important: false,
        labels: ['work'],
        category: 'primary',
        attachments: [
          { id: 'att-16-1', filename: 'Migration-Milestones-2026.pdf', size: '512 KB', type: 'pdf' },
        ],
      },
    ],
  },

  // 17. SENT - Budget Spreadsheet
  {
    id: 'thread-17',
    subject: 'Updated Q3 Hardware & Compute Budget spreadsheet',
    snippet: 'Hi Finance team, Here is the reconciled sheet incorporating the new server nodes and cloud reservations for the model evaluation cluster...',
    lastMessageDate: now - 3 * day,
    participants: [
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
      { name: 'Finance Dept', email: 'finance@company.com' },
    ],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: ['finance'],
    category: 'primary',
    folder: 'sent',
    hasAttachments: true,
    messages: [
      {
        id: 'msg-17-1',
        threadId: 'thread-17',
        from: { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
        to: [{ name: 'Finance Dept', email: 'finance@company.com' }],
        subject: 'Updated Q3 Hardware & Compute Budget spreadsheet',
        body: `<p>Hi team,</p>
<p>Please find attached the updated Q3 compute projection sheet. We managed to secure a 1-year reserved instance discount which saves approximately $14,000 across the cluster.</p>
<p>Let me know if you need PO numbers.</p>
<p>Melvyn</p>`,
        snippet: 'Hi Finance team, Here is the reconciled sheet incorporating the new server nodes...',
        date: now - 3 * day,
        read: true,
        starred: false,
        important: false,
        labels: ['finance'],
        category: 'primary',
        attachments: [
          { id: 'att-17-1', filename: 'Q3-Compute-Budget.xlsx', size: '890 KB', type: 'sheet' },
        ],
      },
    ],
  },

  // 18. DRAFTS - Hackathon Ideas
  {
    id: 'thread-18',
    subject: 'Ideas for the upcoming Fall AI Hackathon',
    snippet: 'Draft: 1. Autonomous agent that browses and compares developer documentation across framework versions. 2. Real-time audio noise cancellation using WebAssembly...',
    lastMessageDate: now - 4 * hour,
    participants: [
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
      { name: 'Sarah Lin', email: 'sarah.lin@techcorp.io' },
    ],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: ['projects'],
    category: 'primary',
    folder: 'drafts',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-18-1',
        threadId: 'thread-18',
        from: { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
        to: [{ name: 'Sarah Lin', email: 'sarah.lin@techcorp.io' }],
        subject: 'Ideas for the upcoming Fall AI Hackathon',
        body: `<p>Hey Sarah,</p>
<p>Jotting down some project concepts for next month's 48-hour hackathon:</p>
<p>1. <strong>Context-aware CLI buddy:</strong> Integrates directly with shell history and detects failing commands to suggest exact fixes.</p>
<p>2. <strong>Browser-native benchmark visualizer:</strong> What if we could render interactive side-by-side run traces with zero backend dependencies?</p>
<p>(need to flesh out the tech stack and team roster)</p>`,
        snippet: 'Draft: 1. Autonomous agent that browses and compares developer documentation...',
        date: now - 4 * hour,
        read: true,
        starred: false,
        important: false,
        labels: ['projects'],
        category: 'primary',
        isDraft: true,
      },
    ],
  },

  // 19. SNOOZED - Supplier Contract Review
  {
    id: 'thread-19',
    subject: 'Supplier Agreement: Data Center Colocation Renewal (Snoozed)',
    snippet: 'Hello Melvyn, Following our call, please find the updated Master Services Agreement for our Santa Clara facility. Review sections 4.2 and 8.1...',
    lastMessageDate: now - 1 * day,
    participants: [{ name: 'Equinix Sales', email: 'colocation@equinix.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: ['work', 'finance'],
    category: 'primary',
    folder: 'snoozed',
    hasAttachments: true,
    snoozedUntil: now + 2 * day,
    messages: [
      {
        id: 'msg-19-1',
        threadId: 'thread-19',
        from: { name: 'Equinix Sales', email: 'colocation@equinix.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Supplier Agreement: Data Center Colocation Renewal (Snoozed)',
        body: `<p>Hello Melvyn,</p>
<p>Please find attached the revised MSA for the SV5 facility. We have incorporated your requested power redundancy SLA of 99.999%.</p>
<p>Take your time to review with your legal team.</p>`,
        snippet: 'Hello Melvyn, Following our call, please find the updated Master Services Agreement...',
        date: now - 1 * day,
        read: true,
        starred: false,
        important: false,
        labels: ['work', 'finance'],
        category: 'primary',
        snoozedUntil: now + 2 * day,
        attachments: [
          { id: 'att-19-1', filename: 'Equinix-MSA-SV5-2026.pdf', size: '3.1 MB', type: 'pdf' },
        ],
      },
    ],
  },

  // 20. TRASH - Old marketing email
  {
    id: 'thread-20',
    subject: 'Last Chance: 50% off domain registrations on Namecheap',
    snippet: 'Grab your .io, .ai, and .com domains before price increases go into effect. Offer expires at midnight UTC...',
    lastMessageDate: now - 5 * day,
    participants: [{ name: 'Namecheap Deals', email: 'promos@namecheap.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: [],
    category: 'promotions',
    folder: 'trash',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-20-1',
        threadId: 'thread-20',
        from: { name: 'Namecheap Deals', email: 'promos@namecheap.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Last Chance: 50% off domain registrations on Namecheap',
        body: `<p>Flash sale! Register your dream domain today starting at just $4.99/year.</p>`,
        snippet: 'Grab your .io, .ai, and .com domains before price increases go into effect...',
        date: now - 5 * day,
        read: true,
        starred: false,
        important: false,
        labels: [],
        category: 'promotions',
      },
    ],
  },

  // 21. SPAM - Fake Prize Scam
  {
    id: 'thread-21',
    subject: 'URGENT: You have won a $1,000 Walmart Gift Card! Claim now',
    snippet: 'Congratulations shopper! Your email address was randomly selected as our grand prize winner. Click the secure link below to verify identity...',
    lastMessageDate: now - 3 * day,
    participants: [{ name: 'Reward Notification Center', email: 'rewards@random-promo-winner-9912.xyz' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: [],
    category: 'promotions',
    folder: 'spam',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-21-1',
        threadId: 'thread-21',
        from: { name: 'Reward Notification Center', email: 'rewards@random-promo-winner-9912.xyz' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'URGENT: You have won a $1,000 Walmart Gift Card! Claim now',
        body: `<p>THIS IS NOT A DRILL! Click here immediately to claim your prize voucher.</p>`,
        snippet: 'Congratulations shopper! Your email address was randomly selected...',
        date: now - 3 * day,
        read: true,
        starred: false,
        important: false,
        labels: [],
        category: 'promotions',
      },
    ],
  },

  // 22. PRIMARY - Quick Sync Architecture
  {
    id: 'thread-22',
    subject: 'Quick sync regarding the architecture review tomorrow',
    snippet: 'Hey Melvyn, do you have 10 minutes tomorrow morning around 9:30 to run through the state machine changes? I want to make sure we are aligned on the error boundaries...',
    lastMessageDate: now - 40 * min,
    participants: [
      { name: 'Alex Chen', email: 'alex.chen@techcorp.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' },
      { name: 'Melvyn Malherbe', email: 'melvyn@example.com' },
    ],
    unreadCount: 1,
    isStarred: false,
    isImportant: true,
    labels: ['work'],
    category: 'primary',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-22-1',
        threadId: 'thread-22',
        from: { name: 'Alex Chen', email: 'alex.chen@techcorp.io', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Quick sync regarding the architecture review tomorrow',
        body: `<p>Hey Melvyn,</p>
<p>Do you have 10 minutes tomorrow morning around 9:30 AM before standup to run through the state machine changes?</p>
<p>I want to make sure we're aligned on the error boundaries and retry logic before presenting to the wider group.</p>
<p>Alex</p>`,
        snippet: 'Hey Melvyn, do you have 10 minutes tomorrow morning around 9:30...',
        date: now - 40 * min,
        read: false,
        starred: false,
        important: true,
        labels: ['work'],
        category: 'primary',
      },
    ],
  },

  // 23. UPDATES - Google Cloud Security Alert
  {
    id: 'thread-23',
    subject: 'Security Alert: New sign-in from Chrome on macOS in Paris, France',
    snippet: 'Your Google Account melvyn@example.com was just accessed from a new device. If this was you, no action is needed. If you did not sign in, secure your account...',
    lastMessageDate: now - 18 * hour,
    participants: [{ name: 'Google Accounts', email: 'no-reply@accounts.google.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: true,
    labels: ['urgent'],
    category: 'updates',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-23-1',
        threadId: 'thread-23',
        from: { name: 'Google Accounts', email: 'no-reply@accounts.google.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Security Alert: New sign-in from Chrome on macOS in Paris, France',
        body: `<div class="p-4 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
  <div class="font-bold text-gray-900 dark:text-white mb-2">New sign-in to your Google Account</div>
  <p class="text-sm text-gray-700 dark:text-gray-300">We noticed a new login to <code>melvyn@example.com</code> from Chrome on macOS.</p>
  <div class="mt-3 text-xs space-y-1 text-gray-600 dark:text-gray-400">
    <div><strong>Device:</strong> Mac (macOS 25.5.0)</div>
    <div><strong>Location:</strong> Paris, Île-de-France, France</div>
    <div><strong>IP:</strong> 194.254.12.98</div>
  </div>
</div>`,
        snippet: 'Your Google Account melvyn@example.com was just accessed from a new device...',
        date: now - 18 * hour,
        read: true,
        starred: false,
        important: true,
        labels: ['urgent'],
        category: 'updates',
      },
    ],
  },

  // 24. SOCIAL - Discord Community
  {
    id: 'thread-24',
    subject: 'Discord: 12 new messages in #react-performance',
    snippet: 'Dan Abramov posted: "The key mental model for concurrency in React 19 is understanding transitions as low-priority task branches..."',
    lastMessageDate: now - 7 * hour,
    participants: [{ name: 'Discord', email: 'notifications@discordapp.com' }],
    unreadCount: 0,
    isStarred: false,
    isImportant: false,
    labels: ['projects'],
    category: 'social',
    folder: 'inbox',
    hasAttachments: false,
    messages: [
      {
        id: 'msg-24-1',
        threadId: 'thread-24',
        from: { name: 'Discord', email: 'notifications@discordapp.com' },
        to: [{ name: 'Melvyn Malherbe', email: 'melvyn@example.com' }],
        subject: 'Discord: 12 new messages in #react-performance',
        body: `<p>New activity in <strong>React Developers / #react-performance</strong>:</p>
<p><strong>@dan_abramov:</strong> The key mental model for concurrency in modern React is understanding transitions as low-priority task branches that don't block layout calculation.</p>`,
        snippet: 'Dan Abramov posted: "The key mental model for concurrency in React 19 is understanding transitions..."',
        date: now - 7 * hour,
        read: true,
        starred: false,
        important: false,
        labels: ['projects'],
        category: 'social',
      },
    ],
  },
];

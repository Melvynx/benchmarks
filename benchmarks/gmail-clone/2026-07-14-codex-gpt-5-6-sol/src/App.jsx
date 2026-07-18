import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArchiveX,
  ArrowLeft,
  AtSign,
  Bell,
  Bold,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  ContactRound,
  ExternalLink,
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  Filter,
  Forward,
  Inbox,
  Italic,
  Keyboard,
  Link,
  Mail,
  MailOpen,
  Menu,
  MessageSquareText,
  Minimize2,
  Moon,
  MoreVertical,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings,
  Smile,
  Sparkles,
  Star,
  Sun,
  Tag,
  Trash2,
  Underline,
  X,
} from 'lucide-react'

const STORAGE_KEY = 'gpt-5.6-sol-mailbox-v4'
const CONTACTS = [
  'Maya Chen <maya@northstar.studio>',
  'Theo Martin <theo@fieldnotes.co>',
  'Jordan Lee <jordan@atelier.pm>',
  'Priya Kapoor <priya@vercel.com>',
  'Noah Williams <noah@orbital.design>',
]

const avatarPalette = {
  'Maya Chen': '#5c6bc0',
  'Figma': '#a142f4',
  'Theo Martin': '#00897b',
  'Notion': '#202124',
  'Linear': '#5e6ad2',
  'Jordan Lee': '#e8710a',
  'Arc': '#c5221f',
  'Priya Kapoor': '#137333',
  'Lina from Readwise': '#d93025',
  'GitHub': '#24292f',
  'Sofia Ramirez': '#9c27b0',
  'Google Calendar': '#1a73e8',
  'Noah Williams': '#b06000',
  'Monocle Weekend': '#37474f',
  'Vercel': '#000000',
  'Aperture Prints': '#ad1457',
  'Claude': '#c15f3c',
}

const seedMailbox = () => [
  {
    id: 'm-101',
    folder: 'inbox',
    category: 'primary',
    sender: 'Maya Chen',
    senderEmail: 'maya@northstar.studio',
    to: 'you@studio.dev',
    subject: 'Re: Lisbon offsite — final details',
    preview: 'Perfect. I moved the design review to Thursday and added the rooftop dinner.',
    timestamp: '2026-07-14T09:42:00',
    read: false,
    starred: true,
    labels: ['Travel', 'Team'],
    attachments: [
      { name: 'Lisbon itinerary.pdf', size: '1.8 MB', type: 'pdf' },
      { name: 'Guest list.xlsx', size: '84 KB', type: 'sheet' },
    ],
    messages: [
      {
        id: 'm-101-a',
        sender: 'You',
        email: 'you@studio.dev',
        to: 'Maya Chen',
        time: 'Mon, Jul 13, 4:18 PM',
        body: 'Hi Maya,\n\nThe flights are booked. Can we shift the design review to Thursday afternoon? It gives the London team a little more room after arrival.\n\nThanks!',
      },
      {
        id: 'm-101-b',
        sender: 'Maya Chen',
        email: 'maya@northstar.studio',
        to: 'you@studio.dev',
        time: '9:42 AM (2 hours ago)',
        body: 'Perfect. I moved the design review to Thursday at 2:30 PM and added the rooftop dinner reservation.\n\nThe final itinerary and guest list are attached. The hotel can accommodate early check-in for anyone arriving before noon — just reply here with names.\n\nSee you in Lisbon,\nMaya',
      },
    ],
  },
  {
    id: 'm-102',
    folder: 'inbox',
    category: 'updates',
    sender: 'Figma',
    senderEmail: 'notifications@figma.com',
    to: 'you@studio.dev',
    subject: '8 new comments in Project Aurora',
    preview: 'Mina, Elliot, and 3 others left feedback on your latest prototype.',
    timestamp: '2026-07-14T08:16:00',
    read: false,
    starred: false,
    labels: ['Design'],
    attachments: [],
    messages: [
      {
        id: 'm-102-a',
        sender: 'Figma',
        email: 'notifications@figma.com',
        to: 'you@studio.dev',
        time: '8:16 AM (3 hours ago)',
        body: 'There are 8 new comments in Project Aurora.\n\nMina: “The revised hierarchy reads much faster.”\nElliot: “Could we test this at 320px as well?”\nSam: “Ready from my side once motion specs are in.”\n\nOpen the file to review and resolve the full thread.',
      },
    ],
  },
  {
    id: 'm-103',
    folder: 'inbox',
    category: 'primary',
    sender: 'Theo Martin',
    senderEmail: 'theo@fieldnotes.co',
    to: 'you@studio.dev',
    subject: 'The quiet advantage of small teams',
    preview: 'I kept thinking about what you said after the workshop. Small teams can stay close to the work.',
    timestamp: '2026-07-13T20:05:00',
    read: false,
    starred: true,
    labels: ['Reading'],
    attachments: [],
    messages: [
      {
        id: 'm-103-a',
        sender: 'Theo Martin',
        email: 'theo@fieldnotes.co',
        to: 'you@studio.dev',
        time: 'Jul 13, 8:05 PM',
        body: 'Hey,\n\nI kept thinking about what you said after the workshop: small teams can stay close to the work in a way that larger organizations have to constantly recreate.\n\nI wrote a short piece about that quiet advantage — fewer layers, faster feedback, and more direct care. No grand framework, just a few patterns I have noticed.\n\nWould love to know what resonates.\n\nTheo',
      },
    ],
  },
  {
    id: 'm-104',
    folder: 'inbox',
    category: 'promotions',
    sender: 'Notion',
    senderEmail: 'team@mail.notion.so',
    to: 'you@studio.dev',
    subject: 'Build a calmer week with Projects',
    preview: 'Turn scattered plans into a system your whole team can actually follow.',
    timestamp: '2026-07-13T17:44:00',
    read: true,
    starred: false,
    labels: [],
    attachments: [],
    messages: [
      {
        id: 'm-104-a',
        sender: 'Notion',
        email: 'team@mail.notion.so',
        to: 'you@studio.dev',
        time: 'Jul 13, 5:44 PM',
        body: 'A calmer week starts with one clear place for the work.\n\nConnect projects, timelines, meeting notes, and team knowledge without building a complicated system. Start with our new product launch template and make it yours.',
      },
    ],
  },
  {
    id: 'm-105',
    folder: 'inbox',
    category: 'updates',
    sender: 'Linear',
    senderEmail: 'updates@linear.app',
    to: 'you@studio.dev',
    subject: 'Northstar workspace digest',
    preview: '12 issues completed · Cycle 41 ends tomorrow · 3 projects on track',
    timestamp: '2026-07-13T16:22:00',
    read: true,
    starred: false,
    labels: ['Team'],
    attachments: [],
    messages: [
      {
        id: 'm-105-a',
        sender: 'Linear',
        email: 'updates@linear.app',
        to: 'you@studio.dev',
        time: 'Jul 13, 4:22 PM',
        body: 'Your Northstar workspace digest\n\n12 issues completed this week\n3 projects are on track\nCycle 41 ends tomorrow at 6 PM\n\nMost active: Elliot (9), Mina (7), Sam (6)\n\nProject Aurora moved from In Progress to In Review.',
      },
    ],
  },
  {
    id: 'm-106',
    folder: 'inbox',
    category: 'primary',
    sender: 'Jordan Lee',
    senderEmail: 'jordan@atelier.pm',
    to: 'you@studio.dev',
    subject: 'Q3 product narrative — first pass',
    preview: 'Here is the first pass. I tried to keep the story anchored in customer momentum.',
    timestamp: '2026-07-13T14:38:00',
    read: true,
    starred: false,
    labels: ['Work'],
    attachments: [{ name: 'Q3 narrative v1.docx', size: '214 KB', type: 'doc' }],
    messages: [
      {
        id: 'm-106-a',
        sender: 'Jordan Lee',
        email: 'jordan@atelier.pm',
        to: 'you@studio.dev',
        time: 'Jul 13, 2:38 PM',
        body: 'Here is the first pass. I tried to keep the story anchored in customer momentum instead of feature volume.\n\nThe open question is the middle section: do we lead with reliability or collaboration? I left comments on both versions.\n\nNo rush today — feedback by Wednesday would be perfect.',
      },
    ],
  },
  {
    id: 'm-107',
    folder: 'inbox',
    category: 'promotions',
    sender: 'Arc',
    senderEmail: 'hello@arc.net',
    to: 'you@studio.dev',
    subject: 'Meet Dia: a new kind of browser',
    preview: 'A browser that helps you think, write, learn, and get things done.',
    timestamp: '2026-07-13T12:10:00',
    read: true,
    starred: false,
    labels: [],
    attachments: [],
    messages: [
      {
        id: 'm-107-a',
        sender: 'Arc',
        email: 'hello@arc.net',
        to: 'you@studio.dev',
        time: 'Jul 13, 12:10 PM',
        body: 'The browser should be more than a window to the internet.\n\nDia is built around the idea that your browser can understand the tabs you have open and help you move from reading to doing — without breaking your flow.',
      },
    ],
  },
  {
    id: 'm-108',
    folder: 'inbox',
    category: 'primary',
    sender: 'Priya Kapoor',
    senderEmail: 'priya@vercel.com',
    to: 'you@studio.dev',
    subject: 'Coffee when you are in London?',
    preview: 'I will be around Shoreditch next Tuesday. Would be lovely to catch up.',
    timestamp: '2026-07-12T18:25:00',
    read: false,
    starred: false,
    labels: ['Personal'],
    attachments: [],
    messages: [
      {
        id: 'm-108-a',
        sender: 'Priya Kapoor',
        email: 'priya@vercel.com',
        to: 'you@studio.dev',
        time: 'Jul 12, 6:25 PM',
        body: 'Hi!\n\nI will be around Shoreditch next Tuesday for a few meetings. Would be lovely to catch up if you have a spare hour — coffee at Ozone around 3?\n\nPriya',
      },
    ],
  },
  {
    id: 'm-109',
    folder: 'inbox',
    category: 'updates',
    sender: 'Lina from Readwise',
    senderEmail: 'hello@readwise.io',
    to: 'you@studio.dev',
    subject: 'Your weekly reading review is ready',
    preview: 'You saved 47 highlights from 6 sources this week.',
    timestamp: '2026-07-12T09:15:00',
    read: true,
    starred: false,
    labels: ['Reading'],
    attachments: [],
    messages: [
      {
        id: 'm-109-a',
        sender: 'Lina from Readwise',
        email: 'hello@readwise.io',
        to: 'you@studio.dev',
        time: 'Jul 12, 9:15 AM',
        body: 'Your weekly reading review is ready.\n\n47 highlights · 6 sources · 2 books\n\nA favorite from this week: “The quality of our attention determines the quality of our experience.”\n\nTake five minutes to revisit what stood out.',
      },
    ],
  },
  {
    id: 'm-110',
    folder: 'inbox',
    category: 'updates',
    sender: 'GitHub',
    senderEmail: 'notifications@github.com',
    to: 'you@studio.dev',
    subject: '[northstar/aurora] Release v2.4.0 is live',
    preview: 'Mina published v2.4.0 with 34 commits to main.',
    timestamp: '2026-07-11T22:06:00',
    read: true,
    starred: false,
    labels: ['Work'],
    attachments: [],
    messages: [
      {
        id: 'm-110-a',
        sender: 'GitHub',
        email: 'notifications@github.com',
        to: 'you@studio.dev',
        time: 'Jul 11, 10:06 PM',
        body: 'Mina published a new release: v2.4.0\n\nHighlights\n• Faster inbox rendering for large accounts\n• New command palette actions\n• Improved offline conflict resolution\n• 17 bug fixes\n\n34 commits were merged to main since v2.3.1.',
      },
    ],
  },
  {
    id: 'm-111',
    folder: 'inbox',
    category: 'primary',
    sender: 'Sofia Ramirez',
    senderEmail: 'sofia@commonthread.co',
    to: 'you@studio.dev',
    subject: 'Photos from the opening',
    preview: 'Such a good night. I picked twelve favorites and put the high-res files here.',
    timestamp: '2026-07-11T19:31:00',
    read: true,
    starred: true,
    labels: ['Personal'],
    attachments: [
      { name: 'opening-night-01.jpg', size: '3.2 MB', type: 'image' },
      { name: 'opening-night-02.jpg', size: '2.9 MB', type: 'image' },
      { name: 'All photos.zip', size: '18.4 MB', type: 'zip' },
    ],
    messages: [
      {
        id: 'm-111-a',
        sender: 'Sofia Ramirez',
        email: 'sofia@commonthread.co',
        to: 'you@studio.dev',
        time: 'Jul 11, 7:31 PM',
        body: 'Such a good night. I picked twelve favorites and attached a few previews here.\n\nThe light in the courtyard came out beautifully. High-res files are in the archive if you need anything for print.\n\nSofia',
      },
    ],
  },
  {
    id: 'm-112',
    folder: 'inbox',
    category: 'updates',
    sender: 'Google Calendar',
    senderEmail: 'calendar-notification@google.com',
    to: 'you@studio.dev',
    subject: 'Reminder: Design critique @ Tue Jul 14, 2:00 PM',
    preview: 'Design critique · 2:00 PM – 3:00 PM · Northstar Studio',
    timestamp: '2026-07-11T08:00:00',
    read: true,
    starred: false,
    labels: ['Team'],
    attachments: [],
    messages: [
      {
        id: 'm-112-a',
        sender: 'Google Calendar',
        email: 'calendar-notification@google.com',
        to: 'you@studio.dev',
        time: 'Jul 11, 8:00 AM',
        body: 'Upcoming event\n\nDesign critique\nTuesday, July 14 · 2:00 PM – 3:00 PM\nNorthstar Studio · Library\n\nGuests: Maya Chen, Elliot Woods, Mina Park, Sam Flores',
      },
    ],
  },
  {
    id: 'm-113',
    folder: 'inbox',
    category: 'primary',
    sender: 'Noah Williams',
    senderEmail: 'noah@orbital.design',
    to: 'you@studio.dev',
    subject: 'Re: Portfolio review',
    preview: 'Thank you again. Your note about showing the decisions, not just the output, really clicked.',
    timestamp: '2026-07-10T15:12:00',
    read: true,
    starred: false,
    labels: ['Mentorship'],
    attachments: [],
    messages: [
      {
        id: 'm-113-a',
        sender: 'You',
        email: 'you@studio.dev',
        to: 'Noah Williams',
        time: 'Jul 9, 5:40 PM',
        body: 'Noah — great work today. The craft is already there. I would spend the next pass making the reasoning visible: constraints, tradeoffs, and what changed because of what you learned.',
      },
      {
        id: 'm-113-b',
        sender: 'Noah Williams',
        email: 'noah@orbital.design',
        to: 'you@studio.dev',
        time: 'Jul 10, 3:12 PM',
        body: 'Thank you again. Your note about showing the decisions, not just the output, really clicked.\n\nI rewrote the first case study around three decisions and it already feels more honest. I will send the next pass at the end of the week.',
      },
    ],
  },
  {
    id: 'm-114',
    folder: 'inbox',
    category: 'promotions',
    sender: 'Monocle Weekend',
    senderEmail: 'weekend@monocle.com',
    to: 'you@studio.dev',
    subject: 'The places worth a detour',
    preview: 'A ceramic studio in Porto, a tiny hotel in Kyoto and the bakery reshaping Helsinki mornings.',
    timestamp: '2026-07-10T07:30:00',
    read: true,
    starred: false,
    labels: ['Reading'],
    attachments: [],
    messages: [
      {
        id: 'm-114-a',
        sender: 'Monocle Weekend',
        email: 'weekend@monocle.com',
        to: 'you@studio.dev',
        time: 'Jul 10, 7:30 AM',
        body: 'This weekend: the places worth a detour.\n\nWe visit a ceramic studio in Porto, check into a tiny hotel in Kyoto and meet the bakers reshaping Helsinki mornings. Plus: five books for a long train journey.',
      },
    ],
  },
  {
    id: 'm-115',
    folder: 'inbox',
    category: 'updates',
    sender: 'Vercel',
    senderEmail: 'notifications@vercel.com',
    to: 'you@studio.dev',
    subject: 'Deployment completed for northstar-web',
    preview: 'Production deployment completed successfully in 42s.',
    timestamp: '2026-07-09T21:53:00',
    read: true,
    starred: false,
    labels: ['Work'],
    attachments: [],
    messages: [
      {
        id: 'm-115-a',
        sender: 'Vercel',
        email: 'notifications@vercel.com',
        to: 'you@studio.dev',
        time: 'Jul 9, 9:53 PM',
        body: 'Production deployment completed successfully.\n\nProject: northstar-web\nBranch: main\nCommit: Refine onboarding handoff\nBuild time: 42s\nStatus: Ready',
      },
    ],
  },
  {
    id: 'm-116',
    folder: 'sent',
    category: 'primary',
    sender: 'You',
    senderEmail: 'you@studio.dev',
    to: 'Mina Park <mina@northstar.studio>',
    subject: 'Notes from today’s design critique',
    preview: 'The short version: the direction is right. Let’s simplify the first-run path.',
    timestamp: '2026-07-13T15:22:00',
    read: true,
    starred: false,
    labels: ['Work'],
    attachments: [{ name: 'Critique notes.pdf', size: '620 KB', type: 'pdf' }],
    messages: [
      {
        id: 'm-116-a',
        sender: 'You',
        email: 'you@studio.dev',
        to: 'Mina Park',
        time: 'Jul 13, 3:22 PM',
        body: 'Hi Mina,\n\nThe short version: the direction is right. Let’s simplify the first-run path and give the collaboration moment more space to breathe.\n\nI cleaned up the notes and grouped them by now / next / later. Attached here.\n\nExcellent work today.',
      },
    ],
  },
  {
    id: 'm-117',
    folder: 'sent',
    category: 'primary',
    sender: 'You',
    senderEmail: 'you@studio.dev',
    to: 'Alex Morgan <alex@paperplane.vc>',
    subject: 'Re: Introduction to Common Thread',
    preview: 'Happy to make the introduction. I think you two will have a lot to talk about.',
    timestamp: '2026-07-12T11:08:00',
    read: true,
    starred: false,
    labels: [],
    attachments: [],
    messages: [
      {
        id: 'm-117-a',
        sender: 'You',
        email: 'you@studio.dev',
        to: 'Alex Morgan',
        time: 'Jul 12, 11:08 AM',
        body: 'Happy to make the introduction. I think you two will have a lot to talk about — especially around durable local communities.\n\nI will send a note this afternoon and keep you both copied.',
      },
    ],
  },
  {
    id: 'm-118',
    folder: 'sent',
    category: 'primary',
    sender: 'You',
    senderEmail: 'you@studio.dev',
    to: 'Studio team <studio@northstar.studio>',
    subject: 'Friday field trip: Barbican',
    preview: 'Tickets are booked for the 11:30 architecture tour.',
    timestamp: '2026-07-10T10:41:00',
    read: true,
    starred: true,
    labels: ['Team'],
    attachments: [],
    messages: [
      {
        id: 'm-118-a',
        sender: 'You',
        email: 'you@studio.dev',
        to: 'Studio team',
        time: 'Jul 10, 10:41 AM',
        body: 'Tickets are booked for the 11:30 architecture tour. Let’s meet by the Silk Street entrance at 11:15.\n\nLunch is at the Barbican Kitchen afterwards. Bring a sketchbook if you feel like it.',
      },
    ],
  },
  {
    id: 'd-201',
    folder: 'draft',
    category: 'primary',
    sender: 'You',
    senderEmail: 'you@studio.dev',
    to: 'Aperture Prints <hello@apertureprints.com>',
    subject: 'Paper samples for the studio',
    preview: 'Hi — I loved the uncoated stock you used for the Field Guide issue…',
    timestamp: '2026-07-14T07:10:00',
    read: true,
    starred: false,
    labels: [],
    attachments: [],
    messages: [],
    draftBody: 'Hi — I loved the uncoated stock you used for the Field Guide issue. Could you send a sample pack to our London studio?\n\nWe are exploring options for a small publication.',
  },
  {
    id: 'd-202',
    folder: 'draft',
    category: 'primary',
    sender: 'You',
    senderEmail: 'you@studio.dev',
    to: '',
    subject: 'Ideas for the autumn retreat',
    preview: 'A few loose thoughts: no presentations on day one, long walks after lunch…',
    timestamp: '2026-07-12T17:00:00',
    read: true,
    starred: false,
    labels: ['Team'],
    attachments: [],
    messages: [],
    draftBody: 'A few loose thoughts:\n\n• No presentations on day one\n• Long walks after lunch\n• One session run by someone outside our field\n• A shared dinner we cook ourselves',
  },
  {
    id: 't-301',
    folder: 'trash',
    previousFolder: 'inbox',
    category: 'promotions',
    sender: 'Aperture Prints',
    senderEmail: 'hello@apertureprints.com',
    to: 'you@studio.dev',
    subject: 'Summer studio sale — ends tonight',
    preview: 'Save 20% on archival prints and custom framing.',
    timestamp: '2026-07-08T12:20:00',
    read: true,
    starred: false,
    labels: [],
    attachments: [],
    messages: [
      {
        id: 't-301-a',
        sender: 'Aperture Prints',
        email: 'hello@apertureprints.com',
        to: 'you@studio.dev',
        time: 'Jul 8, 12:20 PM',
        body: 'Our summer studio sale ends tonight. Save 20% on archival prints, artist editions, and custom framing.',
      },
    ],
  },
  {
    id: 't-302',
    folder: 'trash',
    previousFolder: 'inbox',
    category: 'updates',
    sender: 'Claude',
    senderEmail: 'team@anthropic.com',
    to: 'you@studio.dev',
    subject: 'Your monthly usage summary',
    preview: 'Here is a summary of your activity for June.',
    timestamp: '2026-07-01T09:01:00',
    read: true,
    starred: false,
    labels: [],
    attachments: [],
    messages: [
      {
        id: 't-302-a',
        sender: 'Claude',
        email: 'team@anthropic.com',
        to: 'you@studio.dev',
        time: 'Jul 1, 9:01 AM',
        body: 'Here is a summary of your activity for June.\n\nYou started 48 conversations, uploaded 19 documents, and used Projects 12 times.',
      },
    ],
  },
]

const mailboxConfig = {
  inbox: { label: 'Inbox', icon: Inbox },
  starred: { label: 'Starred', icon: Star },
  sent: { label: 'Sent', icon: Send },
  drafts: { label: 'Drafts', icon: File },
  trash: { label: 'Trash', icon: Trash2 },
  all: { label: 'All Mail', icon: Archive },
}

const labelColors = {
  Work: '#0b57d0',
  Team: '#137333',
  Travel: '#a142f4',
  Design: '#c5221f',
  Reading: '#b06000',
  Personal: '#ad1457',
  Mentorship: '#146c94',
  Scheduled: '#7c4dff',
}

function classNames(...names) {
  return names.filter(Boolean).join(' ')
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const today = new Date('2026-07-14T12:00:00')
  const diff = Math.floor((today - date) / 86400000)
  if (diff < 1 && date.getDate() === today.getDate()) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (diff < 6) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name) {
  if (name === 'You') return 'Y'
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function IconButton({ label, children, className, onClick, active = false, disabled = false, type = 'button' }) {
  return (
    <button
      type={type}
      className={classNames('icon-button', active && 'is-active', className)}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function Avatar({ name, size = 'medium' }) {
  const color = avatarPalette[name] || '#5f6368'
  return (
    <span className={classNames('avatar', 'avatar-' + size)} style={{ '--avatar-color': color }} aria-hidden="true">
      {getInitials(name)}
    </span>
  )
}

function AttachmentIcon({ type }) {
  if (type === 'image') return <FileImage size={20} />
  if (type === 'sheet') return <FileSpreadsheet size={20} />
  if (type === 'zip') return <FileArchive size={20} />
  return <File size={20} />
}

function App() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : seedMailbox()
    } catch {
      return seedMailbox()
    }
  })
  const [mailbox, setMailbox] = useState('inbox')
  const [category, setCategory] = useState('primary')
  const [selected, setSelected] = useState([])
  const [readingId, setReadingId] = useState(null)
  const [query, setQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('gpt-mail-theme') || 'light')
  const [density, setDensity] = useState(() => localStorage.getItem('gpt-mail-density') || 'default')
  const [toast, setToast] = useState(null)
  const [undoSnapshot, setUndoSnapshot] = useState(null)
  const [page, setPage] = useState(0)
  const [compose, setCompose] = useState({
    open: false,
    minimized: false,
    expanded: false,
    id: null,
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
    attachments: [],
  })
  const [draftStatus, setDraftStatus] = useState('')
  const [recipientFocused, setRecipientFocused] = useState(false)
  const searchRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  }, [conversations])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('gpt-mail-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('gpt-mail-density', density)
  }, [density])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => {
      setToast(null)
      setUndoSnapshot(null)
    }, 4800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (!compose.open || !compose.id) return undefined
    const hasContent = compose.to || compose.subject || compose.body || compose.attachments.length
    if (!hasContent) return undefined
    const timeout = window.setTimeout(() => {
      const preview = compose.body.replace(/\s+/g, ' ').trim().slice(0, 110)
      const draft = {
        id: compose.id,
        folder: 'draft',
        category: 'primary',
        sender: 'You',
        senderEmail: 'you@studio.dev',
        to: compose.to,
        cc: compose.cc,
        bcc: compose.bcc,
        subject: compose.subject || '(no subject)',
        preview,
        timestamp: new Date().toISOString(),
        read: true,
        starred: false,
        labels: [],
        attachments: compose.attachments,
        messages: [],
        draftBody: compose.body,
      }
      setConversations((current) => {
        const exists = current.some((item) => item.id === compose.id)
        return exists ? current.map((item) => (item.id === compose.id ? draft : item)) : [draft, ...current]
      })
      setDraftStatus('Saved to Drafts')
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [
    compose.open,
    compose.id,
    compose.to,
    compose.cc,
    compose.bcc,
    compose.subject,
    compose.body,
    compose.attachments,
  ])

  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target
      const typing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      if (event.key === '/' && !typing) {
        event.preventDefault()
        searchRef.current?.focus()
      }
      if (event.key.toLowerCase() === 'c' && !typing && !compose.open) {
        event.preventDefault()
        startCompose()
      }
      if (event.key === 'Escape') {
        if (searchFocused) {
          setQuery('')
          searchRef.current?.blur()
        } else if (readingId) {
          setReadingId(null)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const unreadCount = conversations.filter((item) => item.folder === 'inbox' && !item.read).length
  const draftCount = conversations.filter((item) => item.folder === 'draft').length
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const reading = conversations.find((item) => item.id === readingId)

  const filtered = useMemo(() => {
    let items = conversations
    const normalized = query.trim().toLowerCase()
    if (normalized) {
      const terms = normalized.match(/"[^"]+"|\S+/g) || []
      items = items.filter((item) =>
        terms.every((rawTerm) => {
          const term = rawTerm.replaceAll('"', '')
          if (term.startsWith('from:')) {
            return (item.sender + ' ' + item.senderEmail).toLowerCase().includes(term.slice(5))
          }
          if (term.startsWith('label:')) {
            return item.labels.some((label) => label.toLowerCase().includes(term.slice(6)))
          }
          if (term === 'has:attachment') return item.attachments.length > 0
          if (term === 'is:unread') return !item.read
          if (term === 'is:starred') return item.starred
          const haystack = [
            item.sender,
            item.senderEmail,
            item.to,
            item.subject,
            item.preview,
            item.labels.join(' '),
            item.messages.map((message) => message.body).join(' '),
          ]
            .join(' ')
            .toLowerCase()
          return haystack.includes(term)
        }),
      )
    } else if (mailbox.startsWith('label:')) {
      const activeLabel = mailbox.slice(6)
      items = items.filter((item) => item.folder !== 'trash' && item.labels.includes(activeLabel))
    } else {
      items = items.filter((item) => {
        if (mailbox === 'inbox') return item.folder === 'inbox' && item.category === category
        if (mailbox === 'starred') return item.starred && item.folder !== 'trash'
        if (mailbox === 'sent') return item.folder === 'sent'
        if (mailbox === 'drafts') return item.folder === 'draft'
        if (mailbox === 'trash') return item.folder === 'trash'
        return item.folder !== 'trash'
      })
    }
    return [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  }, [conversations, query, mailbox, category])

  const pageSize = 18
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice(page * pageSize, page * pageSize + pageSize)

  useEffect(() => {
    setPage(0)
    setSelected([])
  }, [mailbox, category, query])

  const showToast = (message) => setToast({ message })

  const commitWithUndo = (next, message) => {
    setUndoSnapshot(conversations)
    setConversations(next)
    setToast({ message, undo: true })
  }

  const undo = () => {
    if (undoSnapshot) setConversations(undoSnapshot)
    setUndoSnapshot(null)
    setToast({ message: 'Action undone' })
  }

  const openMailbox = (key) => {
    setMailbox(key)
    setReadingId(null)
    setQuery('')
    setMobileNavOpen(false)
    setLabelMenuOpen(false)
  }

  const openMessage = (item) => {
    if (item.folder === 'draft') {
      startCompose(item)
      return
    }
    setConversations((current) => current.map((mail) => (mail.id === item.id ? { ...mail, read: true } : mail)))
    setReadingId(item.id)
    setMobileNavOpen(false)
  }

  const toggleSelected = (id) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const selectAllVisible = () => {
    if (visible.length > 0 && visible.every((item) => selectedSet.has(item.id))) {
      setSelected([])
    } else {
      setSelected(visible.map((item) => item.id))
    }
  }

  const updateOne = (id, patch, message) => {
    const next = conversations.map((item) => (item.id === id ? { ...item, ...patch } : item))
    commitWithUndo(next, message)
  }

  const updateSelected = (action, message) => {
    if (!selected.length) return
    const next = conversations
      .map((item) => (selectedSet.has(item.id) ? action(item) : item))
      .filter(Boolean)
    commitWithUndo(next, message)
    setSelected([])
  }

  const archiveIds = (ids) => {
    const set = new Set(ids)
    const next = conversations.map((item) =>
      set.has(item.id) ? { ...item, folder: item.folder === 'inbox' ? 'archive' : item.folder } : item,
    )
    commitWithUndo(next, ids.length > 1 ? ids.length + ' conversations archived' : 'Conversation archived')
    setSelected([])
    if (readingId && set.has(readingId)) setReadingId(null)
  }

  const deleteIds = (ids) => {
    const set = new Set(ids)
    const inTrash = ids.every((id) => conversations.find((item) => item.id === id)?.folder === 'trash')
    const next = inTrash
      ? conversations.filter((item) => !set.has(item.id))
      : conversations.map((item) =>
          set.has(item.id) ? { ...item, previousFolder: item.folder, folder: 'trash' } : item,
        )
    commitWithUndo(next, inTrash ? 'Deleted forever' : ids.length > 1 ? ids.length + ' conversations moved to Trash' : 'Moved to Trash')
    setSelected([])
    if (readingId && set.has(readingId)) setReadingId(null)
  }

  const restoreIds = (ids) => {
    const set = new Set(ids)
    const next = conversations.map((item) =>
      set.has(item.id) ? { ...item, folder: item.previousFolder === 'inbox' ? 'inbox' : 'archive' } : item,
    )
    commitWithUndo(next, ids.length > 1 ? 'Conversations restored' : 'Conversation restored')
    setSelected([])
  }

  const applyLabel = (label) => {
    updateSelected(
      (item) => ({ ...item, labels: item.labels.includes(label) ? item.labels : [...item.labels, label] }),
      'Label “' + label + '” applied',
    )
    setLabelMenuOpen(false)
  }

  const startCompose = (draft = null, replyTo = null, forward = false) => {
    if (draft) {
      setCompose({
        open: true,
        minimized: false,
        expanded: false,
        id: draft.id,
        to: draft.to || '',
        cc: draft.cc || '',
        bcc: draft.bcc || '',
        subject: draft.subject === '(no subject)' ? '' : draft.subject,
        body: draft.draftBody || '',
        attachments: draft.attachments || [],
      })
      setDraftStatus('Saved to Drafts')
      return
    }
    const source = replyTo
    const subject = source
      ? (forward ? 'Fwd: ' : source.subject.startsWith('Re:') ? '' : 'Re: ') + source.subject
      : ''
    const body = forward
      ? '\n\n---------- Forwarded message ----------\nFrom: ' +
        source.sender +
        ' <' +
        source.senderEmail +
        '>\nSubject: ' +
        source.subject +
        '\n\n' +
        source.messages[source.messages.length - 1].body
      : ''
    setCompose({
      open: true,
      minimized: false,
      expanded: false,
      id: 'd-' + Date.now(),
      to: source ? source.sender + ' <' + source.senderEmail + '>' : '',
      cc: '',
      bcc: '',
      subject,
      body,
      attachments: [],
    })
    setDraftStatus('')
    window.setTimeout(() => bodyRef.current?.focus(), 50)
  }

  const changeCompose = (field, value) => {
    setCompose((current) => ({ ...current, [field]: value }))
    setDraftStatus('Saving…')
  }

  const closeCompose = () => {
    const empty = !compose.to && !compose.subject && !compose.body && !compose.attachments.length
    if (empty && compose.id) {
      setConversations((current) => current.filter((item) => item.id !== compose.id))
    }
    setCompose((current) => ({ ...current, open: false }))
  }

  const discardCompose = () => {
    setConversations((current) => current.filter((item) => item.id !== compose.id))
    setCompose((current) => ({ ...current, open: false }))
    showToast('Draft discarded')
  }

  const sendMessage = (scheduleLabel = null) => {
    if (!compose.to.trim()) {
      showToast('Add at least one recipient')
      return
    }
    const sent = {
      id: 'sent-' + Date.now(),
      folder: 'sent',
      category: 'primary',
      sender: 'You',
      senderEmail: 'you@studio.dev',
      to: compose.to,
      subject: compose.subject.trim() || '(no subject)',
      preview: compose.body.replace(/\s+/g, ' ').trim().slice(0, 120),
      timestamp: new Date().toISOString(),
      read: true,
      starred: false,
      labels: scheduleLabel ? ['Scheduled'] : [],
      scheduledFor: scheduleLabel,
      attachments: compose.attachments,
      messages: [
        {
          id: 'sent-message-' + Date.now(),
          sender: 'You',
          email: 'you@studio.dev',
          to: compose.to,
          time: 'Just now',
          body: compose.body,
        },
      ],
    }
    setConversations((current) => [sent, ...current.filter((item) => item.id !== compose.id)])
    setCompose((current) => ({ ...current, open: false }))
    setToast({ message: scheduleLabel ? 'Message scheduled for ' + scheduleLabel.split(' · ')[0] : 'Message sent', undo: false })
  }

  const addMockAttachment = () => {
    const files = [
      { name: 'Project brief.pdf', size: '428 KB', type: 'pdf' },
      { name: 'Studio notes.docx', size: '96 KB', type: 'doc' },
    ]
    const attachment = files[compose.attachments.length % files.length]
    if (!compose.attachments.some((item) => item.name === attachment.name)) {
      changeCompose('attachments', [...compose.attachments, attachment])
      showToast(attachment.name + ' attached')
    }
  }

  const insertFormatting = (before, after = before) => {
    const element = bodyRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    const selection = compose.body.slice(start, end)
    const next = compose.body.slice(0, start) + before + selection + after + compose.body.slice(end)
    changeCompose('body', next)
    window.setTimeout(() => {
      element.focus()
      element.setSelectionRange(start + before.length, end + before.length)
    }, 0)
  }

  const addLink = () => {
    const url = window.prompt('Paste a link')
    if (url) insertFormatting('[', '](' + url + ')')
  }

  const resetDemo = () => {
    setConversations(seedMailbox())
    setMailbox('inbox')
    setCategory('primary')
    setReadingId(null)
    setAccountOpen(false)
    setToast({ message: 'Demo mailbox restored' })
  }

  const currentTitle = query
    ? 'Search results'
    : mailbox.startsWith('label:')
      ? mailbox.slice(6)
      : mailboxConfig[mailbox]?.label || 'Inbox'

  const rangeStart = filtered.length ? page * pageSize + 1 : 0
  const rangeEnd = Math.min((page + 1) * pageSize, filtered.length)

  return (
    <div className={classNames('app', 'density-' + density)}>
      <header className="topbar">
        <div className="brand-area">
          <IconButton
            label="Main menu"
            onClick={() => {
              setSidebarOpen((open) => !open)
              setMobileNavOpen((open) => !open)
            }}
          >
            <Menu size={22} />
          </IconButton>
          <div className="brand-mark" aria-hidden="true">
            <span>M</span>
          </div>
          <h1>gpt-5.6-sol</h1>
        </div>

        <div className={classNames('search-shell', searchFocused && 'is-focused')}>
          <Search size={20} aria-hidden="true" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
            placeholder="Search mail"
            aria-label="Search mail"
          />
          {query ? (
            <IconButton label="Clear search" onClick={() => setQuery('')} className="search-action">
              <X size={18} />
            </IconButton>
          ) : (
            <IconButton label="Search options" onClick={() => showToast('Try from:, label:, is:unread, or has:attachment')} className="search-action">
              <Filter size={18} />
            </IconButton>
          )}
          {searchFocused && (
            <div className="search-suggestions">
              <div className="suggestion-title">Smart searches</div>
              {[
                ['is:unread', 'Unread messages', MailOpen],
                ['has:attachment', 'Messages with files', Paperclip],
                ['label:Work', 'Work label', Tag],
              ].map(([operator, label, SuggestionIcon]) => (
                <button key={operator} onMouseDown={() => setQuery(operator)}>
                  <SuggestionIcon size={18} />
                  <span>{label}</span>
                  <kbd>{operator}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="top-actions">
          <IconButton label="Help" onClick={() => showToast('Tip: press / to search and C to compose')}>
            <CircleHelp size={20} />
          </IconButton>
          <IconButton label="Settings" active={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
            <Settings size={20} />
          </IconButton>
          <IconButton label="Google apps" onClick={() => showToast('Workspace apps are available in the side rail')} className="desktop-only">
            <span className="apps-grid" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => (
                <i key={index} />
              ))}
            </span>
          </IconButton>
          <button className="account-button" aria-label="Account menu" onClick={() => setAccountOpen((open) => !open)}>
            <span>Y</span>
            <i aria-hidden="true" />
          </button>
        </div>

        {accountOpen && (
          <div className="account-popover">
            <IconButton label="Close account menu" className="account-close" onClick={() => setAccountOpen(false)}>
              <X size={18} />
            </IconButton>
            <div className="account-email">you@studio.dev</div>
            <div className="account-avatar">Y</div>
            <strong>Hi, there!</strong>
            <button className="outline-button" onClick={() => showToast('Account settings are local in this demo')}>
              Manage your account
            </button>
            <button className="account-reset" onClick={resetDemo}>
              <RefreshCw size={17} /> Restore demo mailbox
            </button>
          </div>
        )}
      </header>

      <div className="workspace">
        <aside className={classNames('sidebar', !sidebarOpen && 'is-collapsed', mobileNavOpen && 'is-mobile-open')}>
          <button className="compose-button" onClick={() => startCompose()}>
            <PenLine size={20} />
            <span>Compose</span>
          </button>

          <nav aria-label="Mailboxes">
            {Object.entries(mailboxConfig)
              .filter(([key]) => key !== 'all')
              .map(([key, config]) => {
                const NavIcon = config.icon
                const count = key === 'inbox' ? unreadCount : key === 'drafts' ? draftCount : null
                return (
                  <button
                    key={key}
                    className={classNames('nav-item', mailbox === key && !query && 'is-active')}
                    onClick={() => openMailbox(key)}
                    title={!sidebarOpen ? config.label : undefined}
                  >
                    <NavIcon size={19} fill={key === 'starred' && mailbox === key ? 'currentColor' : 'none'} />
                    <span>{config.label}</span>
                    {count !== null && <b>{count}</b>}
                  </button>
                )
              })}
            <button
              className={classNames('nav-item', mailbox === 'all' && !query && 'is-active')}
              onClick={() => openMailbox('all')}
              title={!sidebarOpen ? 'All Mail' : undefined}
            >
              <Archive size={19} />
              <span>All Mail</span>
            </button>
          </nav>

          <div className="nav-section-title">
            <span>Labels</span>
            <IconButton label="Create label" onClick={() => showToast('Labels are managed from the message toolbar')}>
              <Plus size={18} />
            </IconButton>
          </div>
          <nav aria-label="Labels" className="label-nav">
            {Object.keys(labelColors).map((label) => (
              <button
                key={label}
                className={classNames('nav-item', mailbox === 'label:' + label && 'is-active')}
                onClick={() => openMailbox('label:' + label)}
                title={!sidebarOpen ? label : undefined}
              >
                <span className="label-dot" style={{ '--label-color': labelColors[label] }} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="storage-card">
            <div>
              <span>Storage</span>
              <span>2.7 GB of 15 GB</span>
            </div>
            <progress value="2.7" max="15" />
          </div>
        </aside>

        {mobileNavOpen && <button className="mobile-scrim" aria-label="Close menu" onClick={() => setMobileNavOpen(false)} />}

        <main className="mail-surface">
          {reading ? (
            <Reader
              item={reading}
              onBack={() => setReadingId(null)}
              onArchive={() => archiveIds([reading.id])}
              onDelete={() => deleteIds([reading.id])}
              onStar={() => updateOne(reading.id, { starred: !reading.starred }, reading.starred ? 'Star removed' : 'Starred')}
              onUnread={() => {
                updateOne(reading.id, { read: false }, 'Marked as unread')
                setReadingId(null)
              }}
              onReply={() => startCompose(null, reading)}
              onForward={() => startCompose(null, reading, true)}
              onToast={showToast}
            />
          ) : (
            <>
              <div className="mail-toolbar">
                <div className="toolbar-primary">
                  <label className="select-control" title="Select all">
                    <input
                      type="checkbox"
                      checked={visible.length > 0 && visible.every((item) => selectedSet.has(item.id))}
                      onChange={selectAllVisible}
                    />
                    <span />
                  </label>
                  <IconButton label="Select options" onClick={selectAllVisible} className="tiny-chevron">
                    <ChevronDown size={14} />
                  </IconButton>
                  {selected.length ? (
                    <>
                      {mailbox === 'trash' ? (
                        <IconButton label="Restore" onClick={() => restoreIds(selected)}>
                          <ArchiveX size={19} />
                        </IconButton>
                      ) : (
                        <IconButton label="Archive" onClick={() => archiveIds(selected)}>
                          <Archive size={19} />
                        </IconButton>
                      )}
                      <IconButton label={mailbox === 'trash' ? 'Delete forever' : 'Delete'} onClick={() => deleteIds(selected)}>
                        <Trash2 size={19} />
                      </IconButton>
                      <IconButton
                        label="Mark as unread"
                        onClick={() => updateSelected((item) => ({ ...item, read: false }), 'Marked as unread')}
                      >
                        <Mail size={19} />
                      </IconButton>
                      <div className="menu-anchor">
                        <IconButton label="Add label" onClick={() => setLabelMenuOpen((open) => !open)}>
                          <Tag size={19} />
                        </IconButton>
                        {labelMenuOpen && (
                          <div className="dropdown label-dropdown">
                            <strong>Label as:</strong>
                            {Object.keys(labelColors).map((label) => (
                              <button key={label} onClick={() => applyLabel(label)}>
                                <span className="label-dot" style={{ '--label-color': labelColors[label] }} />
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="menu-anchor">
                        <IconButton label="More" onClick={() => setMoreMenuOpen((open) => !open)}>
                          <MoreVertical size={19} />
                        </IconButton>
                        {moreMenuOpen && (
                          <div className="dropdown more-dropdown">
                            <button
                              onClick={() => {
                                updateSelected((item) => ({ ...item, read: true }), 'Marked as read')
                                setMoreMenuOpen(false)
                              }}
                            >
                              Mark as read
                            </button>
                            <button
                              onClick={() => {
                                updateSelected((item) => ({ ...item, starred: true }), 'Starred')
                                setMoreMenuOpen(false)
                              }}
                            >
                              Add star
                            </button>
                          </div>
                        )}
                      </div>
                      <span className="selected-count">{selected.length} selected</span>
                    </>
                  ) : (
                    <>
                      <IconButton
                        label="Refresh"
                        onClick={() => {
                          showToast('Inbox is up to date')
                        }}
                      >
                        <RefreshCw size={18} />
                      </IconButton>
                      <IconButton label="More" onClick={() => showToast('Select messages for more actions')}>
                        <MoreVertical size={18} />
                      </IconButton>
                    </>
                  )}
                </div>
                <div className="toolbar-pagination">
                  <span>
                    {rangeStart}–{rangeEnd} of {filtered.length}
                  </span>
                  <IconButton label="Newer" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
                    <ChevronLeft size={18} />
                  </IconButton>
                  <IconButton
                    label="Older"
                    disabled={page >= pageCount - 1}
                    onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                </div>
              </div>

              <div className="mailbox-heading">
                <div>
                  <h2>{currentTitle}</h2>
                  {query && <span>{filtered.length} matching conversations</span>}
                </div>
                {query && (
                  <button className="clear-search-button" onClick={() => setQuery('')}>
                    Clear search
                  </button>
                )}
              </div>

              {mailbox === 'inbox' && !query && (
                <div className="category-tabs" role="tablist" aria-label="Inbox categories">
                  {[
                    ['primary', 'Primary', Inbox],
                    ['promotions', 'Promotions', Tag],
                    ['updates', 'Updates', Bell],
                  ].map(([key, label, TabIcon]) => {
                    const unread = conversations.filter(
                      (item) => item.folder === 'inbox' && item.category === key && !item.read,
                    ).length
                    return (
                      <button
                        key={key}
                        role="tab"
                        aria-selected={category === key}
                        className={category === key ? 'is-active' : ''}
                        onClick={() => setCategory(key)}
                      >
                        <TabIcon size={19} />
                        <span>{label}</span>
                        {unread > 0 && <b>{unread} new</b>}
                      </button>
                    )
                  })}
                </div>
              )}

              <div className="message-list" aria-live="polite">
                {visible.length ? (
                  visible.map((item) => (
                    <MessageRow
                      key={item.id}
                      item={item}
                      selected={selectedSet.has(item.id)}
                      onSelect={() => toggleSelected(item.id)}
                      onOpen={() => openMessage(item)}
                      onStar={() =>
                        updateOne(item.id, { starred: !item.starred }, item.starred ? 'Star removed' : 'Starred')
                      }
                      onArchive={() => archiveIds([item.id])}
                      onDelete={() => deleteIds([item.id])}
                      onRead={() =>
                        updateOne(item.id, { read: !item.read }, item.read ? 'Marked as unread' : 'Marked as read')
                      }
                    />
                  ))
                ) : (
                  <EmptyState query={query} mailbox={mailbox} onCompose={() => startCompose()} onClear={() => setQuery('')} />
                )}
              </div>

              {visible.length > 0 && (
                <div className="list-footer">
                  <span>Last account activity: 2 minutes ago</span>
                  <span>2.7 GB of 15 GB used</span>
                </div>
              )}
            </>
          )}
        </main>

        <aside className="side-rail" aria-label="Workspace apps">
          {[
            [CalendarDays, 'Calendar'],
            [MessageSquareText, 'Notes'],
            [Check, 'Tasks'],
            [ContactRound, 'Contacts'],
          ].map(([RailIcon, label]) => (
            <IconButton key={label} label={label} onClick={() => showToast(label + ' is ready in your workspace')}>
              <RailIcon size={19} />
            </IconButton>
          ))}
          <span className="rail-divider" />
          <IconButton label="Add apps" onClick={() => showToast('Workspace apps are managed locally')}>
            <Plus size={20} />
          </IconButton>
        </aside>
      </div>

      {settingsOpen && (
        <div className="settings-panel">
          <div className="panel-heading">
            <div>
              <span>Quick settings</span>
              <small>Changes save automatically</small>
            </div>
            <IconButton label="Close settings" onClick={() => setSettingsOpen(false)}>
              <X size={19} />
            </IconButton>
          </div>
          <section>
            <h3>Appearance</h3>
            <div className="segmented">
              <button className={theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}>
                <Sun size={18} /> Light
              </button>
              <button className={theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}>
                <Moon size={18} /> Dark
              </button>
            </div>
          </section>
          <section>
            <h3>Density</h3>
            <div className="density-options">
              {[
                ['default', 'Default', 'Comfortable rows with previews'],
                ['compact', 'Compact', 'Fit more messages on screen'],
              ].map(([value, title, description]) => (
                <button key={value} className={density === value ? 'is-active' : ''} onClick={() => setDensity(value)}>
                  <span className="radio">{density === value && <i />}</span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="shortcut-card">
            <Keyboard size={20} />
            <div>
              <strong>Keyboard shortcuts</strong>
              <span>
                <kbd>/</kbd> search · <kbd>C</kbd> compose · <kbd>Esc</kbd> close
              </span>
            </div>
          </section>
        </div>
      )}

      {compose.open && (
        <ComposeWindow
          compose={compose}
          status={draftStatus}
          bodyRef={bodyRef}
          recipientFocused={recipientFocused}
          onRecipientFocus={setRecipientFocused}
          onChange={changeCompose}
          onClose={closeCompose}
          onDiscard={discardCompose}
          onSend={sendMessage}
          onMinimize={() => setCompose((current) => ({ ...current, minimized: !current.minimized }))}
          onExpand={() => setCompose((current) => ({ ...current, expanded: !current.expanded, minimized: false }))}
          onAttach={addMockAttachment}
          onRemoveAttachment={(name) =>
            changeCompose(
              'attachments',
              compose.attachments.filter((item) => item.name !== name),
            )
          }
          onFormat={insertFormatting}
          onLink={addLink}
        />
      )}

      <button className="mobile-compose" aria-label="Compose" onClick={() => startCompose()}>
        <PenLine size={22} />
      </button>

      {toast && (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.undo && <button onClick={undo}>Undo</button>}
          <IconButton label="Dismiss" onClick={() => setToast(null)}>
            <X size={17} />
          </IconButton>
        </div>
      )}
    </div>
  )
}

function MessageRow({ item, selected, onSelect, onOpen, onStar, onArchive, onDelete, onRead }) {
  const threadCount = item.messages.length > 1 ? item.messages.length : null
  return (
    <article
      className={classNames('message-row', !item.read && 'is-unread', selected && 'is-selected')}
      onClick={onOpen}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen()
      }}
    >
      <div className="row-controls">
        <label className="select-control" title="Select conversation" onClick={(event) => event.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onSelect} />
          <span />
        </label>
        <IconButton
          label={item.starred ? 'Remove star' : 'Add star'}
          className={classNames('star-button', item.starred && 'is-starred')}
          onClick={(event) => {
            event.stopPropagation()
            onStar()
          }}
        >
          <Star size={18} fill={item.starred ? 'currentColor' : 'none'} />
        </IconButton>
      </div>
      <div className="row-avatar">
        <Avatar name={item.sender} size="small" />
      </div>
      <div className="sender">
        {item.folder === 'sent' && <span className="to-prefix">To: </span>}
        {item.folder === 'sent' ? item.to.split('<')[0].trim() : item.sender}
        {threadCount && <span className="thread-count">{threadCount}</span>}
      </div>
      <div className="message-summary">
        <span className="subject">{item.folder === 'draft' && <b className="draft-prefix">Draft</b>}{item.subject}</span>
        <span className="preview"> — {item.preview}</span>
        {item.labels.slice(0, 2).map((label) => (
          <span key={label} className="row-label" style={{ '--label-color': labelColors[label] }}>
            {label}
          </span>
        ))}
        {item.attachments.length > 0 && <Paperclip className="attachment-indicator" size={14} />}
      </div>
      <time dateTime={item.timestamp}>{formatDate(item.timestamp)}</time>
      <div className="row-actions">
        {item.folder !== 'trash' && (
          <IconButton
            label="Archive"
            onClick={(event) => {
              event.stopPropagation()
              onArchive()
            }}
          >
            <Archive size={18} />
          </IconButton>
        )}
        <IconButton
          label="Delete"
          onClick={(event) => {
            event.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 size={18} />
        </IconButton>
        <IconButton
          label={item.read ? 'Mark unread' : 'Mark read'}
          onClick={(event) => {
            event.stopPropagation()
            onRead()
          }}
        >
          {item.read ? <Mail size={18} /> : <MailOpen size={18} />}
        </IconButton>
      </div>
    </article>
  )
}

function EmptyState({ query, mailbox, onCompose, onClear }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {query ? <Search size={30} /> : mailbox === 'trash' ? <Trash2 size={30} /> : <Mail size={30} />}
      </div>
      <h3>{query ? 'No messages match this search' : mailbox === 'trash' ? 'Trash is empty' : 'You are all caught up'}</h3>
      <p>
        {query
          ? 'Try a sender, subject, label, or a search operator like is:unread.'
          : 'There are no conversations in this view.'}
      </p>
      {query ? <button onClick={onClear}>Clear search</button> : <button onClick={onCompose}>Compose a message</button>}
    </div>
  )
}

function Reader({ item, onBack, onArchive, onDelete, onStar, onUnread, onReply, onForward, onToast }) {
  const [expanded, setExpanded] = useState(() => new Set(item.messages.map((message) => message.id)))
  const [details, setDetails] = useState(null)

  return (
    <div className="reader">
      <div className="reader-toolbar">
        <div>
          <IconButton label="Back to inbox" onClick={onBack}>
            <ArrowLeft size={20} />
          </IconButton>
          {item.folder !== 'trash' && (
            <IconButton label="Archive" onClick={onArchive}>
              <Archive size={19} />
            </IconButton>
          )}
          <IconButton label="Delete" onClick={onDelete}>
            <Trash2 size={19} />
          </IconButton>
          <IconButton label="Mark unread" onClick={onUnread}>
            <Mail size={19} />
          </IconButton>
          <IconButton label={item.starred ? 'Remove star' : 'Add star'} active={item.starred} onClick={onStar}>
            <Star size={19} fill={item.starred ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton label="More" onClick={() => onToast('Conversation actions are up to date')}>
            <MoreVertical size={19} />
          </IconButton>
        </div>
        <div>
          <span>Conversation {item.id.replace(/\D/g, '') || '1'}</span>
          <IconButton label="Previous conversation" onClick={() => onToast('This is the newest conversation')}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton label="Next conversation" onClick={() => onToast('Use Back to choose another conversation')}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>

      <div className="reader-content">
        <div className="subject-line">
          <h2>{item.subject}</h2>
          <div className="subject-labels">
            {item.labels.map((label) => (
              <span key={label} style={{ '--label-color': labelColors[label] }}>
                {label}
              </span>
            ))}
          </div>
          <IconButton label="Print" onClick={() => window.print()} className="reader-print">
            <File size={18} />
          </IconButton>
        </div>

        <div className="conversation">
          {item.messages.map((message, index) => {
            const isExpanded = expanded.has(message.id)
            return (
              <article key={message.id} className={classNames('thread-message', isExpanded && 'is-expanded')}>
                <Avatar name={message.sender} />
                <button
                  className="message-header"
                  onClick={() => {
                    const next = new Set(expanded)
                    if (isExpanded) next.delete(message.id)
                    else next.add(message.id)
                    setExpanded(next)
                  }}
                >
                  <span>
                    <strong>{message.sender}</strong>
                    <small>&lt;{message.email}&gt;</small>
                  </span>
                  <span className="message-meta">
                    <time>{message.time}</time>
                    <ChevronDown size={15} />
                  </span>
                  {!isExpanded && <em>{message.body.replace(/\s+/g, ' ').slice(0, 100)}…</em>}
                </button>
                <div className="thread-actions">
                  <IconButton label="Star message" onClick={onStar}>
                    <Star size={17} fill={item.starred ? 'currentColor' : 'none'} />
                  </IconButton>
                  <IconButton label="Reply" onClick={onReply}>
                    <Reply size={17} />
                  </IconButton>
                  <IconButton label="More" onClick={() => setDetails(details === message.id ? null : message.id)}>
                    <MoreVertical size={17} />
                  </IconButton>
                </div>
                {details === message.id && (
                  <div className="message-details">
                    <span>from</span> {message.sender} &lt;{message.email}&gt;<br />
                    <span>to</span> {message.to}<br />
                    <span>date</span> {message.time}
                  </div>
                )}
                {isExpanded && (
                  <div className="message-body">
                    {message.body.split('\n').map((line, lineIndex) => (
                      <p key={lineIndex}>{line || '\u00a0'}</p>
                    ))}
                    {index === item.messages.length - 1 && item.attachments.length > 0 && (
                      <div className="attachments">
                        <div className="attachment-heading">
                          <Paperclip size={17} /> {item.attachments.length} attachment{item.attachments.length > 1 ? 's' : ''}
                        </div>
                        <div className="attachment-grid">
                          {item.attachments.map((attachment) => (
                            <button key={attachment.name} onClick={() => onToast(attachment.name + ' ready to preview')}>
                              <span className="file-preview">
                                <AttachmentIcon type={attachment.type} />
                              </span>
                              <span>
                                <strong>{attachment.name}</strong>
                                <small>{attachment.size}</small>
                              </span>
                              <ChevronDown size={16} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>

        <div className="reply-area">
          <button onClick={onReply}>
            <Reply size={18} /> Reply
          </button>
          <button onClick={onForward}>
            <Forward size={18} /> Forward
          </button>
          <div className="smart-replies">
            {['Thanks — sounds good!', 'I’ll take a look.', 'Perfect, thank you.'].map((reply) => (
              <button key={reply} onClick={onReply}>
                <Sparkles size={15} /> {reply}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ComposeWindow({
  compose,
  status,
  bodyRef,
  recipientFocused,
  onRecipientFocus,
  onChange,
  onClose,
  onDiscard,
  onSend,
  onMinimize,
  onExpand,
  onAttach,
  onRemoveAttachment,
  onFormat,
  onLink,
}) {
  const matchingContacts = CONTACTS.filter((contact) =>
    contact.toLowerCase().includes(compose.to.split(',').at(-1).trim().toLowerCase()),
  ).slice(0, 4)

  return (
    <section
      className={classNames('compose-window', compose.minimized && 'is-minimized', compose.expanded && 'is-expanded')}
      aria-label="New message"
    >
      <header>
        <strong>{compose.subject || 'New Message'}</strong>
        <div>
          <IconButton label={compose.minimized ? 'Restore' : 'Minimize'} onClick={onMinimize}>
            <Minimize2 size={15} />
          </IconButton>
          <IconButton label={compose.expanded ? 'Exit full screen' : 'Full screen'} onClick={onExpand}>
            <ExternalLink size={14} />
          </IconButton>
          <IconButton label="Save and close" onClick={onClose}>
            <X size={17} />
          </IconButton>
        </div>
      </header>
      {!compose.minimized && (
        <>
          <div className="compose-fields">
            <div className="recipient-row">
              <span>To</span>
              <input
                value={compose.to}
                onChange={(event) => onChange('to', event.target.value)}
                onFocus={() => onRecipientFocus(true)}
                onBlur={() => window.setTimeout(() => onRecipientFocus(false), 150)}
                aria-label="Recipients"
                autoFocus
              />
              <button onClick={() => onChange('showCc', true)}>Cc</button>
              <button onClick={() => onChange('showBcc', true)}>Bcc</button>
              {recipientFocused && matchingContacts.length > 0 && (
                <div className="contact-suggestions">
                  {matchingContacts.map((contact) => (
                    <button
                      key={contact}
                      onMouseDown={() => {
                        onChange('to', contact)
                        onRecipientFocus(false)
                      }}
                    >
                      <Avatar name={contact.split(' <')[0]} size="small" />
                      <span>{contact.split(' <')[0]}<small>{contact.match(/<(.+)>/)?.[1]}</small></span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {compose.showCc && (
              <div className="recipient-row">
                <span>Cc</span>
                <input value={compose.cc} onChange={(event) => onChange('cc', event.target.value)} aria-label="Cc" />
              </div>
            )}
            {compose.showBcc && (
              <div className="recipient-row">
                <span>Bcc</span>
                <input value={compose.bcc} onChange={(event) => onChange('bcc', event.target.value)} aria-label="Bcc" />
              </div>
            )}
            <input
              className="subject-input"
              value={compose.subject}
              onChange={(event) => onChange('subject', event.target.value)}
              placeholder="Subject"
              aria-label="Subject"
            />
          </div>
          <textarea
            ref={bodyRef}
            className="compose-body"
            value={compose.body}
            onChange={(event) => onChange('body', event.target.value)}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') onSend()
            }}
            aria-label="Message body"
          />
          {compose.attachments.length > 0 && (
            <div className="compose-attachments">
              {compose.attachments.map((attachment) => (
                <span key={attachment.name}>
                  <AttachmentIcon type={attachment.type} />
                  <span>
                    {attachment.name}
                    <small>{attachment.size}</small>
                  </span>
                  <button aria-label={'Remove ' + attachment.name} onClick={() => onRemoveAttachment(attachment.name)}>
                    <X size={15} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="compose-footer">
            <div className="send-group">
              <button className="send-button" onClick={() => onSend()}>
                Send
              </button>
              <button className="send-options" title="Schedule send" onClick={() => onChange('scheduleOpen', !compose.scheduleOpen)}>
                <ChevronDown size={15} />
              </button>
              {compose.scheduleOpen && (
                <div className="schedule-menu">
                  <strong>Schedule send</strong>
                  {['Tomorrow morning · 8:00 AM', 'Tomorrow afternoon · 1:00 PM', 'Monday morning · 8:00 AM'].map((time) => (
                    <button
                      key={time}
                      onClick={() => {
                        onChange('scheduleOpen', false)
                        onSend(time)
                      }}
                    >
                      <Clock3 size={17} /> {time}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="formatting">
              <IconButton label="Formatting options" onClick={() => onChange('formatOpen', !compose.formatOpen)}>
                <AtSign size={18} />
              </IconButton>
              {compose.formatOpen && (
                <div className="format-bar">
                  <IconButton label="Bold" onClick={() => onFormat('**')}>
                    <Bold size={17} />
                  </IconButton>
                  <IconButton label="Italic" onClick={() => onFormat('_')}>
                    <Italic size={17} />
                  </IconButton>
                  <IconButton label="Underline" onClick={() => onFormat('<u>', '</u>')}>
                    <Underline size={17} />
                  </IconButton>
                </div>
              )}
              <IconButton label="Attach files" onClick={onAttach}>
                <Paperclip size={19} />
              </IconButton>
              <IconButton label="Insert link" onClick={onLink}>
                <Link size={19} />
              </IconButton>
              <IconButton label="Insert emoji" onClick={() => onChange('body', compose.body + ' 🙂')}>
                <Smile size={19} />
              </IconButton>
            </div>
            <span className="draft-status">{status}</span>
            <IconButton label="Discard draft" onClick={onDiscard} className="discard-button">
              <Trash2 size={18} />
            </IconButton>
          </div>
        </>
      )}
    </section>
  )
}

export default App

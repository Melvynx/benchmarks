import {
  Archive,
  Ban,
  CalendarClock,
  Clock,
  File,
  Inbox,
  Mail,
  Megaphone,
  Send,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  Users,
} from 'lucide-react'
import type { Category, ViewId } from './types'

export interface ViewDef {
  id: ViewId
  title: string
  icon: typeof Inbox
  emptyTitle: string
  emptySubtitle: string
}

export const VIEWS: Record<ViewId, ViewDef> = {
  inbox: {
    id: 'inbox',
    title: 'Inbox',
    icon: Inbox,
    emptyTitle: 'Your inbox is empty',
    emptySubtitle: 'Nothing left to deal with. Enjoy it while it lasts.',
  },
  starred: {
    id: 'starred',
    title: 'Starred',
    icon: Star,
    emptyTitle: 'No starred conversations',
    emptySubtitle: 'Stars let you give a conversation a special status.',
  },
  snoozed: {
    id: 'snoozed',
    title: 'Snoozed',
    icon: Clock,
    emptyTitle: 'Nothing snoozed',
    emptySubtitle: 'Snoozed mail comes back to the top of your inbox when you ask it to.',
  },
  important: {
    id: 'important',
    title: 'Important',
    icon: Tag,
    emptyTitle: 'No important conversations',
    emptySubtitle: 'Mark a conversation important and it will show up here.',
  },
  sent: {
    id: 'sent',
    title: 'Sent',
    icon: Send,
    emptyTitle: 'No sent mail',
    emptySubtitle: 'Messages you send land here.',
  },
  scheduled: {
    id: 'scheduled',
    title: 'Scheduled',
    icon: CalendarClock,
    emptyTitle: 'Nothing scheduled',
    emptySubtitle: 'Schedule a message and it will wait here until it goes out.',
  },
  drafts: {
    id: 'drafts',
    title: 'Drafts',
    icon: File,
    emptyTitle: 'No drafts',
    emptySubtitle: 'Unfinished messages are saved here automatically.',
  },
  all: {
    id: 'all',
    title: 'All Mail',
    icon: Archive,
    emptyTitle: 'No mail',
    emptySubtitle: 'Everything except trash and spam shows up here.',
  },
  spam: {
    id: 'spam',
    title: 'Spam',
    icon: Ban,
    emptyTitle: 'No spam',
    emptySubtitle: 'Messages marked as spam are deleted after 30 days.',
  },
  trash: {
    id: 'trash',
    title: 'Trash',
    icon: Trash2,
    emptyTitle: 'Trash is empty',
    emptySubtitle: 'Messages in Trash are deleted after 30 days.',
  },
}

export interface CategoryDef {
  id: Category
  title: string
  icon: typeof Inbox
  accent: string
}

export const CATEGORIES: CategoryDef[] = [
  { id: 'primary', title: 'Primary', icon: Inbox, accent: '#d93025' },
  { id: 'promotions', title: 'Promotions', icon: ShoppingBag, accent: '#1e8e3e' },
  { id: 'social', title: 'Social', icon: Users, accent: '#1a73e8' },
  { id: 'updates', title: 'Updates', icon: Mail, accent: '#e37400' },
  { id: 'forums', title: 'Forums', icon: Megaphone, accent: '#9334e6' },
]

/** Sidebar grouping, in order. */
export const SIDEBAR_PRIMARY: ViewId[] = ['inbox', 'starred', 'snoozed', 'sent', 'drafts']
export const SIDEBAR_MORE: ViewId[] = ['important', 'scheduled', 'all', 'spam', 'trash']

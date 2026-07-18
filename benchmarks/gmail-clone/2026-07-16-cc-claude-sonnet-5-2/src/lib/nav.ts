import type { SystemLabelId } from './types'

export interface NavItem {
  id: SystemLabelId
  label: string
  icon: 'inbox' | 'star' | 'clock' | 'send' | 'file' | 'tag-important' | 'archive' | 'alert' | 'trash'
}

export const PRIMARY_NAV: NavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'snoozed', label: 'Snoozed', icon: 'clock' },
  { id: 'sent', label: 'Sent', icon: 'send' },
  { id: 'draft', label: 'Drafts', icon: 'file' },
]

export const MORE_NAV: NavItem[] = [
  { id: 'important', label: 'Important', icon: 'tag-important' },
  { id: 'all', label: 'All Mail', icon: 'archive' },
  { id: 'spam', label: 'Spam', icon: 'alert' },
  { id: 'trash', label: 'Trash', icon: 'trash' },
]

export const CATEGORY_TABS: { id: string; label: string }[] = [
  { id: 'category_primary', label: 'Primary' },
  { id: 'category_social', label: 'Social' },
  { id: 'category_promotions', label: 'Promotions' },
  { id: 'category_updates', label: 'Updates' },
  { id: 'category_forums', label: 'Forums' },
]

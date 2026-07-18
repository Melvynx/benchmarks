import { Archive, Clock, FileText, Inbox, Send, ShieldAlert, Star, Tag, Trash2 } from 'lucide-react'
import type { NavItem } from '@/lib/nav'

const ICONS: Record<NavItem['icon'], typeof Inbox> = {
  inbox: Inbox,
  star: Star,
  clock: Clock,
  send: Send,
  file: FileText,
  'tag-important': Tag,
  archive: Archive,
  alert: ShieldAlert,
  trash: Trash2,
}

export function NavIcon({ icon, className }: { icon: NavItem['icon']; className?: string }) {
  const Icon = ICONS[icon]
  return <Icon className={className} />
}

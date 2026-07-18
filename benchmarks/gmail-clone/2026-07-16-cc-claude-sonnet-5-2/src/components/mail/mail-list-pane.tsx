import { useMemo } from 'react'
import {
  Archive,
  Bell,
  FileText,
  Inbox as InboxIcon,
  Search as SearchIcon,
  Send,
  ShieldAlert,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { useMailStore } from '@/store/mail-store'
import { filterThreadsForView, searchThreads } from '@/lib/mail-queries'
import { CategoryTabs } from './category-tabs'
import { MailListToolbar } from './mail-list-toolbar'
import { MailListItem } from './mail-list-item'
import { EmptyState } from './empty-state'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { LucideIcon } from 'lucide-react'

const FOLDER_EMPTY_STATE: Record<string, { icon: LucideIcon; title: string; description?: string }> = {
  inbox: { icon: InboxIcon, title: 'No conversations here', description: 'New mail will show up in this tab.' },
  starred: { icon: Star, title: 'No starred conversations', description: 'Star important messages to find them faster.' },
  snoozed: { icon: Bell, title: 'No snoozed conversations', description: "Snoozed mail comes back when you need it." },
  sent: { icon: Send, title: 'No sent messages yet' },
  draft: { icon: FileText, title: 'No drafts', description: 'Unsent messages will be saved here automatically.' },
  important: { icon: Tag, title: 'No important conversations' },
  spam: { icon: ShieldAlert, title: 'No spam here', description: 'Nice and clean.' },
  trash: { icon: Trash2, title: 'Trash is empty' },
  all: { icon: Archive, title: 'Nothing here yet' },
}

export function MailListPane() {
  const threads = useMailStore((s) => s.threads)
  const view = useMailStore((s) => s.view)
  const category = useMailStore((s) => s.category)
  const searchQuery = useMailStore((s) => s.searchQuery)
  const clearSearch = useMailStore((s) => s.clearSearch)
  const selectedIds = useMailStore((s) => s.selectedIds)
  const toggleSelected = useMailStore((s) => s.toggleSelected)
  const openThread = useMailStore((s) => s.openThread)
  const openCompose = useMailStore((s) => s.openCompose)
  const labels = useMailStore((s) => s.labels)

  const isSearching = searchQuery.trim().length > 0

  const items = useMemo(() => {
    if (isSearching) return searchThreads(threads, searchQuery)
    return filterThreadsForView(threads, view, view.kind === 'folder' && view.id === 'inbox' ? category : null)
  }, [threads, view, category, searchQuery, isSearching])

  const showCategoryTabs = !isSearching && view.kind === 'folder' && view.id === 'inbox'

  function handleOpen(threadId: string) {
    const thread = threads.find((t) => t.id === threadId)
    if (!thread) return
    if (thread.labelIds.includes('draft')) {
      const draftMsg = thread.messages[thread.messages.length - 1]
      openCompose('new', {
        threadId: thread.id,
        to: draftMsg.to,
        cc: draftMsg.cc,
        subject: thread.subject === '(no subject)' ? '' : thread.subject,
        bodyText: draftMsg.bodyText,
      })
      return
    }
    openThread(threadId)
  }

  const emptyMeta =
    view.kind === 'folder'
      ? FOLDER_EMPTY_STATE[view.id]
      : { icon: Tag, title: `No conversations labeled "${labels.find((l) => l.id === view.id)?.name ?? ''}"` }

  return (
    <div className="flex h-full flex-col">
      {isSearching ? (
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
          <SearchIcon className="size-4 text-muted-foreground" />
          <p className="flex-1 truncate text-sm">
            Search results for <span className="font-medium text-foreground">"{searchQuery}"</span>
          </p>
          <button
            onClick={clearSearch}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:bg-surface-hover"
          >
            <X className="size-3.5" />
            Clear
          </button>
        </div>
      ) : (
        showCategoryTabs && <CategoryTabs />
      )}

      <MailListToolbar />

      {items.length === 0 ? (
        <EmptyState
          icon={isSearching ? SearchIcon : emptyMeta.icon}
          title={isSearching ? 'No results found' : emptyMeta.title}
          description={
            isSearching ? 'Try different keywords or check your search operators.' : emptyMeta.description
          }
        />
      ) : (
        <ScrollArea className="flex-1">
          <div>
            {items.map((thread) => (
              <MailListItem
                key={thread.id}
                thread={thread}
                selected={selectedIds.includes(thread.id)}
                onToggleSelect={() => toggleSelected(thread.id)}
                onOpen={() => handleOpen(thread.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: 'c', description: 'Compose new message' },
  { keys: 'r', description: 'Reply (open conversation)' },
  { keys: 'a', description: 'Reply all (open conversation)' },
  { keys: 'f', description: 'Forward (open conversation)' },
  { keys: 'e', description: 'Archive' },
  { keys: '#', description: 'Move to Trash' },
  { keys: 's', description: 'Star / unstar (open conversation)' },
  { keys: 'u', description: 'Mark as unread and return to list' },
  { keys: '/', description: 'Focus the search bar' },
  { keys: 'g then i', description: 'Go to Inbox' },
  { keys: 'g then s', description: 'Go to Starred' },
  { keys: 'g then t', description: 'Go to Sent' },
  { keys: 'g then d', description: 'Go to Drafts' },
  { keys: 'Esc', description: 'Close conversation or clear search' },
]

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Shortcuts apply while not typing in a field.</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-96 flex-col gap-2 overflow-auto">
          {SHORTCUTS.map((s) => (
            <li key={s.keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="shrink-0 rounded border border-border-strong bg-muted px-2 py-0.5 font-mono text-xs">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

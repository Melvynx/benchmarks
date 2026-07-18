import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const OPERATORS: { token: string; description: string }[] = [
  { token: 'from:sarah', description: 'Sent from a matching name or email' },
  { token: 'to:priya', description: 'Sent to a matching name or email' },
  { token: 'subject:roadmap', description: 'Words in the subject line' },
  { token: 'label:work', description: 'Has a specific label' },
  { token: 'in:sent', description: 'Search inbox, sent, drafts, trash or spam' },
  { token: 'is:unread', description: 'Unread conversations' },
  { token: 'is:starred', description: 'Starred conversations' },
  { token: 'has:attachment', description: 'Conversations with attachments' },
]

export function SearchHelpPopover({ children }: { children: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <p className="mb-2 text-sm font-medium">Search options</p>
        <ul className="flex flex-col gap-1.5">
          {OPERATORS.map((op) => (
            <li key={op.token} className="flex items-baseline gap-2 text-xs">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {op.token}
              </code>
              <span className="text-muted-foreground">{op.description}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { LABEL_PALETTE } from '@/data/labels'
import { useMailActions } from '@/hooks/use-mail-actions'
import { SYSTEM } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useMail } from '@/store/mail-store'
import { Button, Checkbox } from './ui/bits'
import { Popover } from './ui/popover'

interface LabelMenuProps {
  anchorRef: React.RefObject<HTMLElement | null>
  open: boolean
  onClose: () => void
  threadIds: string[]
  align?: 'start' | 'end' | 'center'
}

/** Gmail's "Label as" picker: filter, tri-state checkboxes, inline create. */
export function LabelMenu({ anchorRef, open, onClose, threadIds, align = 'start' }: LabelMenuProps) {
  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={onClose}
      align={align}
      role="dialog"
      ariaLabel="Label as"
      className="w-[17.5rem] py-0"
    >
      <LabelMenuBody threadIds={threadIds} onClose={onClose} />
    </Popover>
  )
}

function LabelMenuBody({ threadIds, onClose }: { threadIds: string[]; onClose: () => void }) {
  const { data } = useMail()
  const actions = useMailActions()
  const [filter, setFilter] = useState('')

  const state = useMemo(() => {
    const map = new Map<string, number>()
    for (const id of threadIds) {
      const t = data.threads[id]
      if (!t) continue
      for (const l of t.labelIds) map.set(l, (map.get(l) ?? 0) + 1)
    }
    return map
  }, [data.threads, threadIds])

  const q = filter.trim().toLowerCase()
  const visible = data.labels.filter((l) => !q || l.name.toLowerCase().includes(q))
  const exact = data.labels.some((l) => l.name.toLowerCase() === q)

  const create = () => {
    const name = filter.trim()
    if (!name || exact) return
    const color = LABEL_PALETTE[data.labels.length % LABEL_PALETTE.length]
    const id = actions.createLabel(name, color)
    if (threadIds.length) actions.applyLabel(threadIds, id, true)
    onClose()
  }

  return (
    <div className="py-2">
      <div className="px-4 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-4">
        Label as
      </div>
      <div className="flex items-center gap-2 border-b border-line-soft px-4 pb-2 pt-1">
        <Search className="h-4 w-4 shrink-0 text-ink-3" />
        <input
          data-autofocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (visible.length === 1) {
                const l = visible[0]
                actions.applyLabel(threadIds, l.id, (state.get(l.id) ?? 0) < threadIds.length)
                onClose()
              } else {
                create()
              }
            }
          }}
          placeholder="Search labels"
          aria-label="Search labels"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-ink-4"
        />
      </div>

      <div className="max-h-[15rem] overflow-y-auto scrollbar-thin py-1">
        {visible.map((l) => {
          const count = state.get(l.id) ?? 0
          const all = count === threadIds.length && count > 0
          return (
            <div
              key={l.id}
              className="flex items-center gap-1 pl-1.5 pr-4 hover:bg-surface-2"
            >
              <Checkbox
                checked={all}
                indeterminate={count > 0 && !all}
                label={l.name}
                stopPropagation={false}
                onChange={(next) => actions.applyLabel(threadIds, l.id, next)}
              />
              <span className="min-w-0 flex-1 truncate py-1.5 text-[13px]">{l.name}</span>
              <span
                aria-hidden
                style={{ backgroundColor: l.color.bg }}
                className="h-2.5 w-2.5 shrink-0 rounded-full"
              />
            </div>
          )
        })}
        {!visible.length && (
          <p className="px-4 py-3 text-[12px] text-ink-3">No labels match “{filter}”.</p>
        )}
      </div>

      <div className="border-t border-line-soft px-2 pt-2">
        <Button
          variant="text"
          disabled={!filter.trim() || exact}
          onClick={create}
          className={cn('w-full justify-start', !filter.trim() && 'opacity-60')}
        >
          <Plus />
          {filter.trim() && !exact ? `Create “${filter.trim()}”` : 'Create new label'}
        </Button>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Move to                                                                    */
/* -------------------------------------------------------------------------- */

export function moveTargets() {
  return [
    { id: SYSTEM.inbox, label: 'Inbox' },
    { id: SYSTEM.spam, label: 'Spam' },
    { id: SYSTEM.trash, label: 'Trash' },
  ]
}

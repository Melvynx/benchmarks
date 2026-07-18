import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useMail } from '../store/store'
import { Menu, MenuDivider, MenuItem } from './ui'
import { snoozeOptions } from '../lib/time'
import { cx } from '../lib/utils'

/** Label assignment menu for one or more threads. */
export function LabelMenu(props: {
  open: boolean
  onClose: () => void
  threadIds: string[]
  align?: 'left' | 'right'
  direction?: 'down' | 'up'
}) {
  const labels = useMail((s) => s.labels)
  const threads = useMail((s) => s.threads)
  const applyLabel = useMail((s) => s.applyLabel)
  const createLabel = useMail((s) => s.createLabel)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const targets = threads.filter((t) => props.threadIds.includes(t.id))
  const stateOf = (labelId: string): 'all' | 'some' | 'none' => {
    const withLabel = targets.filter((t) => t.labelIds.includes(labelId)).length
    if (withLabel === 0) return 'none'
    return withLabel === targets.length ? 'all' : 'some'
  }

  return (
    <Menu open={props.open} onClose={props.onClose} align={props.align} direction={props.direction} width="w-64">
      <div className="px-4 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-ink-3">Label as</div>
      {labels.map((label) => {
        const state = stateOf(label.id)
        return (
          <MenuItem
            key={label.id}
            onClick={() => applyLabel(props.threadIds, label.id, state !== 'all')}
            icon={
              <span
                className={cx(
                  'flex h-4 w-4 items-center justify-center rounded-xs border-2',
                  state === 'all' ? 'border-accent bg-accent text-white dark:text-[#0e1014]' : 'border-ink-3 text-transparent',
                  state === 'some' && 'border-accent bg-accent/40 text-white',
                )}
              >
                <Check className="h-3 w-3" strokeWidth={3.5} />
              </span>
            }
            trailing={<span className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />}
          >
            {label.name}
          </MenuItem>
        )
      })}
      <MenuDivider />
      {creating ? (
        <div className="flex items-center gap-2 px-4 py-1.5">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                const label = createLabel(newName, '#4a86e8')
                if (label) applyLabel(props.threadIds, label.id, true)
                setNewName('')
                setCreating(false)
              }
              if (e.key === 'Escape') setCreating(false)
            }}
            placeholder="New label name"
            className="w-full rounded border border-line-strong bg-transparent px-2 py-1 text-sm outline-none focus:border-accent"
          />
        </div>
      ) : (
        <MenuItem icon={<Plus />} onClick={() => setCreating(true)}>
          Create new
        </MenuItem>
      )}
    </Menu>
  )
}

/** Snooze options menu for one or more threads. */
export function SnoozeMenu(props: {
  open: boolean
  onClose: () => void
  threadIds: string[]
  align?: 'left' | 'right'
  direction?: 'down' | 'up'
}) {
  const snoozeThreads = useMail((s) => s.snoozeThreads)
  const options = snoozeOptions()

  return (
    <Menu open={props.open} onClose={props.onClose} align={props.align} direction={props.direction} width="w-72">
      <div className="px-4 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-ink-3">Snooze until…</div>
      {options.map((opt) => (
        <MenuItem
          key={opt.label}
          onClick={() => {
            snoozeThreads(props.threadIds, opt.ts)
            props.onClose()
          }}
          trailing={<span className="text-xs text-ink-3">{opt.detail}</span>}
        >
          {opt.label}
        </MenuItem>
      ))}
    </Menu>
  )
}

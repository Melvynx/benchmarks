import { useState } from 'react'
import { Archive, BellRing, Clock, FolderInput, MailOpen, Mail, OctagonAlert, Star, Tag, Trash2, Undo2, Ban, EllipsisVertical, Plus } from 'lucide-react'
import { useStore } from '../lib/store'
import { useMailActions } from '../lib/actions'
import { labelState, snoozePresets, toLocalInputValue } from '../lib/view'
import { Dropdown, IconButton, MenuItem, MenuLabel } from './ui'
import type { SystemFolder, FolderId } from '../types'

interface ActionProps {
  ids: string[]
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function ArchiveButton({ ids, disabled, size }: ActionProps) {
  const { archive } = useMailActions()
  return (
    <IconButton title="Archive (e)" size={size} disabled={disabled || !ids.length} onClick={() => archive(ids)}>
      <Archive size={18} />
    </IconButton>
  )
}

export function SpamButton({ ids, disabled, size }: ActionProps) {
  const { move } = useMailActions()
  return (
    <IconButton title="Report spam (!)" size={size} disabled={disabled || !ids.length} onClick={() => move(ids, 'spam', 'Moved to Spam')}>
      <OctagonAlert size={18} />
    </IconButton>
  )
}

export function TrashButton({ ids, folder, disabled, size }: ActionProps & { folder: FolderId }) {
  const { trash } = useMailActions()
  const forever = folder === 'trash'
  return (
    <IconButton title={forever ? 'Delete forever (#)' : 'Delete (#)'} size={size} disabled={disabled || !ids.length} onClick={() => trash(ids)}>
      <Trash2 size={18} />
    </IconButton>
  )
}

export function ReadButton({ ids, disabled, size }: ActionProps) {
  const { markRead, data } = useMailActions()
  const anyUnread = ids.some((id) => data.messages[id]?.read === false)
  return (
    <IconButton title={anyUnread ? 'Mark as read (shift+i)' : 'Mark as unread (shift+u)'} size={size} disabled={disabled || !ids.length} onClick={() => markRead(ids)}>
      {anyUnread ? <MailOpen size={18} /> : <Mail size={18} />}
    </IconButton>
  )
}

export function LabelMenu({ ids, disabled, size }: ActionProps) {
  const { data, label, createLabel } = useMailActions()
  const [name, setName] = useState('')
  return (
    <Dropdown
      width="w-64"
      trigger={(toggle, open) => (
        <IconButton title="Label as (l)" size={size} disabled={disabled || !ids.length} active={open} onClick={toggle}>
          <Tag size={18} />
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <MenuLabel>Label as</MenuLabel>
          {data.labels.map((l) => {
            const st = labelState(data, ids, l.id)
            return (
              <MenuItem
                key={l.id}
                checked={st === 'all'}
                icon={<span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />}
                onClick={() => label(ids, l.id, st !== 'all')}
              >
                {l.name}
              </MenuItem>
            )
          })}
          <form
            className="flex gap-2 border-t border-line px-3 pt-2"
            onSubmit={(e) => {
              e.preventDefault()
              createLabel(name, ids)
              setName('')
              close()
            }}
          >
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New label" className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[13px] outline-none focus:border-accent" />
            <IconButton title="Create label" size="sm" type="submit" disabled={!name.trim()}>
              <Plus size={16} />
            </IconButton>
          </form>
        </div>
      )}
    </Dropdown>
  )
}

export function SnoozeMenu({ ids, disabled, size }: ActionProps) {
  const { state } = useStore()
  const { snooze, data } = useMailActions()
  const [custom, setCustom] = useState(toLocalInputValue(state.ui.now + 86_400_000))
  const inbox = ids.filter((id) => data.messages[id]?.folder === 'inbox')
  const presets = snoozePresets(state.ui.now)
  return (
    <Dropdown
      width="w-72"
      trigger={(toggle, open) => (
        <IconButton title="Snooze (b)" size={size} disabled={disabled || !inbox.length} active={open} onClick={toggle}>
          <Clock size={18} />
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <MenuLabel>Snooze until</MenuLabel>
          {presets.map((p) => (
            <MenuItem key={p.label} icon={<Clock size={15} />} onClick={() => { close(); snooze(inbox, p.at, `Snoozed until ${p.hint}`) }}>
              <span>{p.label}</span>
              <span className="ml-2 text-[12px] text-ink-3">{p.hint}</span>
            </MenuItem>
          ))}
          <form
            className="grid gap-2 border-t border-line px-3 pt-3 pb-2"
            onSubmit={(e) => {
              e.preventDefault()
              const at = new Date(custom).getTime()
              if (Number.isNaN(at) || at <= state.ui.now) return
              close()
              snooze(inbox, at, `Snoozed until ${new Date(at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`)
            }}
          >
            <span className="text-[12px] text-ink-3">Pick date and time</span>
            <div className="flex gap-2">
              <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)} className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-[13px]" />
              <button type="submit" className="rounded-full bg-accent px-3 text-[13px] font-medium text-accent-ink">Snooze</button>
            </div>
          </form>
        </div>
      )}
    </Dropdown>
  )
}

export function MoreMenu({ ids, disabled, size, folder }: ActionProps & { folder: FolderId }) {
  const { data, markRead, toggleStar, move, trash, toast: notifyToast } = useMailActions()
  const starred = ids.some((id) => data.messages[id]?.starred)
  const anyUnread = ids.some((id) => data.messages[id]?.read === false)
  const go = (f: SystemFolder, text: string) => move(ids, f, text)
  return (
    <Dropdown
      align="right"
      width="w-60"
      trigger={(toggle, open) => (
        <IconButton title="More" size={size} disabled={disabled || !ids.length} active={open} onClick={toggle}>
          <EllipsisVertical size={18} />
        </IconButton>
      )}
    >
      {(close) => (
        <div>
          <MenuItem icon={<MailOpen size={15} />} shortcut={anyUnread ? 'I' : 'U'} onClick={() => { close(); markRead(ids, anyUnread) }}>
            {anyUnread ? 'Mark as read' : 'Mark as unread'}
          </MenuItem>
          <MenuItem icon={<Star size={15} />} shortcut="S" onClick={() => { close(); toggleStar(ids) }}>
            {starred ? 'Remove star' : 'Add star'}
          </MenuItem>
          <MenuItem icon={<FolderInput size={15} />} onClick={() => { close(); go('inbox', 'Moved to Inbox') }}>
            Move to Inbox
          </MenuItem>
          {folder === 'spam' ? (
            <MenuItem icon={<Ban size={15} />} onClick={() => { close(); go('inbox', 'Not spam, moved to Inbox') }}>
              Not spam
            </MenuItem>
          ) : (
            <MenuItem icon={<OctagonAlert size={15} />} shortcut="!" onClick={() => { close(); go('spam', 'Reported as spam') }}>
              Report spam
            </MenuItem>
          )}
          {folder === 'trash' ? (
            <MenuItem icon={<Undo2 size={15} />} onClick={() => { close(); go('inbox', 'Restored from Trash') }}>
              Restore
            </MenuItem>
          ) : null}
          <MenuItem icon={<Archive size={15} />} shortcut="E" onClick={() => { close(); move(ids, 'archive', 'Conversation archived') }}>
            Archive
          </MenuItem>
          <MenuItem icon={<Trash2 size={15} />} danger shortcut="#" onClick={() => { close(); trash(ids) }}>
            {folder === 'trash' ? 'Delete forever' : 'Move to Trash'}
          </MenuItem>
          <MenuItem icon={<BellRing size={15} />} onClick={() => { close(); notifyToast('Notifications for this conversation are on') }}>
            Notifications
          </MenuItem>
        </div>
      )}
    </Dropdown>
  )
}

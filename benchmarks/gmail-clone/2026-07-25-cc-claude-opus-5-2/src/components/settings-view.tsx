import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { LABEL_PALETTE } from '@/data/labels'
import { useMailActions } from '@/hooks/use-mail-actions'
import type { Label } from '@/lib/types'
import { cn, pluralize } from '@/lib/utils'
import { useMail } from '@/store/mail-store'
import type { Route } from '@/store/router'
import { DEFAULT_SETTINGS, useSettings } from '@/store/settings'
import { useToast } from '@/store/toast'
import { Button, Radio, Switch } from './ui/bits'
import { Dialog } from './ui/dialog'
import { LabelChip } from './thread-row'

const TABS = [
  { id: 'general', title: 'General' },
  { id: 'inbox', title: 'Inbox' },
  { id: 'labels', title: 'Labels' },
  { id: 'advanced', title: 'Advanced' },
]

export function SettingsView({
  route,
  navigate,
}: {
  route: Route
  navigate: (r: Route) => void
}) {
  const tab = route.settingsTab ?? 'general'

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface sm:rounded-2xl">
      <header className="shrink-0 px-5 pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[20px] font-normal text-ink">Settings</h2>
          <Button variant="text" onClick={() => navigate({ view: 'inbox' })}>
            Back to Inbox
          </Button>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto no-scrollbar border-b border-line-soft">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate({ view: route.view, settingsTab: t.id })}
              className={cn(
                'relative shrink-0 px-4 py-2 text-[13px] font-medium transition-colors',
                tab === t.id ? 'text-accent-ink' : 'text-ink-3 hover:text-ink',
              )}
            >
              {t.title}
              {tab === t.id && (
                <span className="absolute inset-x-2 bottom-0 h-[3px] rounded-t bg-accent" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        {tab === 'general' && <GeneralTab />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'labels' && <LabelsTab />}
        {tab === 'advanced' && <AdvancedTab navigate={navigate} />}
      </div>
    </div>
  )
}

function Row({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-line-soft py-4 md:flex-row md:gap-8">
      <div className="md:w-[15rem] md:shrink-0">
        <p className="text-[13px] font-medium text-ink">{title}</p>
        {description && <p className="mt-0.5 text-[12px] leading-5 text-ink-3">{description}</p>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function GeneralTab() {
  const { settings, set } = useSettings()

  return (
    <div className="max-w-3xl">
      <Row title="Theme" description="Follows your system by default.">
        <div className="flex flex-wrap gap-2">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('theme', t)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] capitalize transition-colors',
                settings.theme === t
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-line text-ink-2 hover:bg-surface-2',
              )}
            >
              {settings.theme === t && <Check className="h-4 w-4" />}
              {t}
            </button>
          ))}
        </div>
      </Row>

      <Row title="Density" description="How tightly conversations are packed in the list.">
        <div className="space-y-1">
          {(['default', 'comfortable', 'compact'] as const).map((d) => (
            <Radio
              key={d}
              checked={settings.density === d}
              onChange={() => set('density', d)}
              label={<span className="capitalize">{d}</span>}
            />
          ))}
        </div>
      </Row>

      <Row title="Reading pane" description="Read conversations beside the list on wide screens.">
        <div className="space-y-1">
          <Radio
            checked={settings.readingPane === 'none'}
            onChange={() => set('readingPane', 'none')}
            label="No split"
            description="Opening a conversation replaces the list."
          />
          <Radio
            checked={settings.readingPane === 'right'}
            onChange={() => set('readingPane', 'right')}
            label="Right of list"
            description="List on the left, conversation on the right."
          />
        </div>
      </Row>

      <Row title="Conversation view" description="Collapse older messages in a thread.">
        <ToggleRow
          checked={settings.conversationView}
          onChange={(v) => set('conversationView', v)}
          label="Collapse read messages in a conversation"
        />
      </Row>

      <Row title="Preview text" description="Show a snippet of the message next to the subject.">
        <ToggleRow
          checked={settings.previewText}
          onChange={(v) => set('previewText', v)}
          label="Show snippets"
        />
      </Row>

      <Row title="Hover actions" description="Quick archive, delete, read and snooze on list rows.">
        <ToggleRow
          checked={settings.hoverActions}
          onChange={(v) => set('hoverActions', v)}
          label="Show hover actions"
        />
      </Row>

      <Row title="Keyboard shortcuts">
        <ToggleRow
          checked={settings.keyboardShortcuts}
          onChange={(v) => set('keyboardShortcuts', v)}
          label="Shortcuts on"
        />
      </Row>

      <Row title="Undo send" description="How long the undo option stays available after sending.">
        <select
          value={settings.undoSendSeconds}
          onChange={(e) => set('undoSendSeconds', Number(e.target.value))}
          className="rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
        >
          {[5, 8, 10, 20, 30].map((s) => (
            <option key={s} value={s}>
              {s} seconds
            </option>
          ))}
        </select>
      </Row>

      <Row title="Signature" description="Appended to new messages and replies.">
        <div className="space-y-2">
          <ToggleRow
            checked={settings.signatureEnabled}
            onChange={(v) => set('signatureEnabled', v)}
            label="Use a signature"
          />
          <textarea
            value={settings.signature}
            onChange={(e) => set('signature', e.target.value)}
            rows={3}
            disabled={!settings.signatureEnabled}
            className="w-full max-w-lg rounded border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent disabled:opacity-50"
          />
        </div>
      </Row>
    </div>
  )
}

function InboxTab() {
  const { settings, set } = useSettings()
  return (
    <div className="max-w-3xl">
      <Row title="Category tabs" description="Split the inbox into Primary, Promotions and more.">
        <ToggleRow
          checked={settings.showCategoryTabs}
          onChange={(v) => set('showCategoryTabs', v)}
          label="Show category tabs"
        />
      </Row>
      <Row title="Conversations per page">
        <select
          value={settings.pageSize}
          onChange={(e) => set('pageSize', Number(e.target.value))}
          className="rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
        >
          {[10, 25, 50, 100].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Row>
      <Row
        title="Mark as read"
        description="Delay before an opened conversation is marked as read."
      >
        <select
          value={settings.markAsReadDelayMs}
          onChange={(e) => set('markAsReadDelayMs', Number(e.target.value))}
          className="rounded border border-line bg-surface px-2 py-1.5 text-[13px] outline-none focus:border-accent"
        >
          <option value={0}>Immediately</option>
          <option value={2000}>After 2 seconds</option>
          <option value={5000}>After 5 seconds</option>
        </select>
      </Row>
      <Row title="Send and archive" description="Show a second send button that archives the thread.">
        <ToggleRow
          checked={settings.sendAndArchive}
          onChange={(v) => set('sendAndArchive', v)}
          label="Show “Send & Archive” in replies"
        />
      </Row>
    </div>
  )
}

function ToggleRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-[13px] text-ink-2">
      <Switch checked={checked} onChange={onChange} label={label} />
      {label}
    </label>
  )
}

function LabelsTab() {
  const { data } = useMail()
  const actions = useMailActions()
  const [editing, setEditing] = useState<Label | null>(null)
  const [creating, setCreating] = useState(false)

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between border-b border-line-soft py-3">
        <p className="text-[13px] text-ink-2">{pluralize(data.labels.length, 'label')}</p>
        <Button variant="outline" onClick={() => setCreating(true)}>
          <Plus />
          Create new label
        </Button>
      </div>
      <ul>
        {data.labels.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-3 border-b border-line-soft py-3"
          >
            <LabelChip name={l.name} bg={l.color.bg} fg={l.color.fg} />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{l.name}</span>
            <Button variant="text" onClick={() => setEditing(l)}>
              Edit
            </Button>
            <Button
              variant="text"
              className="text-danger"
              onClick={() => actions.deleteLabel(l.id)}
            >
              Remove
            </Button>
          </li>
        ))}
        {!data.labels.length && (
          <li className="py-8 text-center text-[13px] text-ink-3">
            No labels yet. Create one to start organising.
          </li>
        )}
      </ul>

      <LabelEditor
        open={creating || Boolean(editing)}
        label={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </div>
  )
}

function LabelEditor({
  open,
  label,
  onClose,
}: {
  open: boolean
  label: Label | null
  onClose: () => void
}) {
  const actions = useMailActions()
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState(label?.color ?? LABEL_PALETTE[0])
  const [seeded, setSeeded] = useState<string | null>(null)

  // Re-seed the form whenever a different label is opened.
  const key = label?.id ?? 'new'
  if (open && seeded !== key) {
    setSeeded(key)
    setName(label?.name ?? '')
    setColor(label?.color ?? LABEL_PALETTE[0])
  }
  if (!open && seeded !== null) setSeeded(null)

  const save = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (label) {
      actions.renameLabel(label.id, trimmed)
      actions.recolorLabel(label.id, color)
    } else {
      actions.createLabel(trimmed, color)
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={label ? 'Edit label' : 'New label'}
      footer={
        <>
          <Button variant="text" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!name.trim()}>
            {label ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="space-y-4 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="Label name"
          aria-label="Label name"
          className="w-full rounded border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <div>
          <p className="mb-2 text-[12px] text-ink-3">Colour</p>
          <div className="flex flex-wrap gap-2">
            {LABEL_PALETTE.map((c) => (
              <button
                key={c.bg}
                type="button"
                aria-label={`Colour ${c.bg}`}
                onClick={() => setColor(c)}
                style={{ backgroundColor: c.bg }}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full border',
                  color.bg === c.bg ? 'border-ink' : 'border-transparent',
                )}
              >
                {color.bg === c.bg && <Check className="h-4 w-4" style={{ color: c.fg }} />}
              </button>
            ))}
          </div>
        </div>
        <div className="pt-1">
          <p className="mb-2 text-[12px] text-ink-3">Preview</p>
          <LabelChip name={name.trim() || 'Label name'} bg={color.bg} fg={color.fg} />
        </div>
      </div>
    </Dialog>
  )
}

function AdvancedTab({ navigate }: { navigate: (r: Route) => void }) {
  const { data, resetMailbox } = useMail()
  const { reset } = useSettings()
  const { show } = useToast()
  const [confirm, setConfirm] = useState(false)

  const threadCount = Object.keys(data.threads).length
  const messageCount = Object.keys(data.messages).length

  return (
    <div className="max-w-3xl">
      <Row title="This mailbox" description="Everything lives in this browser's local storage.">
        <ul className="space-y-1 text-[13px] text-ink-2">
          <li>{pluralize(threadCount, 'conversation')}</li>
          <li>{pluralize(messageCount, 'message')}</li>
          <li>{pluralize(Object.keys(data.drafts).length, 'draft')}</li>
          <li>{pluralize(data.contacts.length, 'contact')}</li>
        </ul>
      </Row>

      <Row title="Reset settings" description="Restore theme, density and signature defaults.">
        <Button
          variant="outline"
          onClick={() => {
            reset()
            show('Settings restored to defaults')
          }}
        >
          Reset settings
        </Button>
      </Row>

      <Row
        title="Reset mailbox"
        description="Discards every change and rebuilds the seeded mailbox."
      >
        <Button variant="outline" className="text-danger" onClick={() => setConfirm(true)}>
          <Trash2 />
          Reset mailbox
        </Button>
      </Row>

      <p className="pt-6 text-[12px] leading-5 text-ink-4">
        Default settings for reference: {DEFAULT_SETTINGS.density} density,{' '}
        {DEFAULT_SETTINGS.pageSize} conversations per page, {DEFAULT_SETTINGS.undoSendSeconds}s undo
        send.
      </p>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset this mailbox?"
        footer={
          <>
            <Button variant="text" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                resetMailbox()
                setConfirm(false)
                navigate({ view: 'inbox' })
                show('Mailbox reset to the seeded state')
              }}
            >
              Reset
            </Button>
          </>
        }
      >
        <p className="py-2 text-[13px] leading-6 text-ink-2">
          Every read state, star, label, draft and sent message you have created will be discarded
          and the original seeded mailbox rebuilt. This cannot be undone.
        </p>
      </Dialog>
    </div>
  )
}

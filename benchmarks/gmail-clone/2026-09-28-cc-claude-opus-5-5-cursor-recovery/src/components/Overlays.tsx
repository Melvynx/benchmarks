import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Settings } from '../types'
import { useMail } from '../store/mail'
import { useUI } from '../store/ui'
import { goView } from '../lib/router'
import { actions } from '../actions'
import { Button, cx, IconButton, Modal } from './ui'
import { LABEL_SWATCHES } from './Sidebar'

export function ToastHost() {
  const toast = useUI((s) => s.toast)
  const hide = useUI((s) => s.hideToast)
  const composesOpen = useUI((s) => s.composes.length > 0)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(hide, toast.duration)
    return () => clearTimeout(id)
  }, [toast, hide])

  if (!toast) return null
  return (
    <div
      role="status"
      aria-live="polite"
      key={toast.id}
      className={cx(
        'no-print animate-slide-up fixed bottom-6 left-6 z-[80] flex min-h-12 max-w-[min(560px,calc(100vw-32px))] items-center gap-2 rounded-md bg-[#303030] py-1.5 pl-5 pr-2 text-[14px] text-[#f2f2f2] shadow-pop max-md:bottom-20 max-md:left-4 max-md:right-4',
        composesOpen && 'md:bottom-6',
      )}
    >
      <span className="min-w-0 flex-1 py-1.5">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.run()
            if (useUI.getState().toast?.id === toast.id) hide()
          }}
          className="h-9 shrink-0 rounded px-3 font-medium text-[#a8c7fa] hover:bg-white/10"
        >
          {toast.action.label}
        </button>
      )}
      {toast.secondary && (
        <button
          type="button"
          onClick={() => {
            toast.secondary!.run()
            if (useUI.getState().toast?.id === toast.id) hide()
          }}
          className="h-9 shrink-0 rounded px-3 font-medium text-[#a8c7fa] hover:bg-white/10"
        >
          {toast.secondary.label}
        </button>
      )}
      <IconButton label="Dismiss" size="sm" onClick={hide} className="text-[#f2f2f2] hover:bg-white/10" tipBelow={false}>
        <X size={18} />
      </IconButton>
    </div>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-4 last:border-none md:grid-cols-[200px_1fr] md:gap-6">
      <div>
        <div className="text-[14px] font-medium">{title}</div>
        {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px]">{children}</div>
    </div>
  )
}

function Radio<T extends string | number>({ name, value, current, onChange, children }: { name: string; value: T; current: T; onChange: (v: T) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="radio" name={name} checked={current === value} onChange={() => onChange(value)} className="h-4 w-4 accent-[var(--accent)]" />
      {children}
    </label>
  )
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useMail((s) => s.settings)
  const update = useMail((s) => s.updateSettings)
  const [f, setF] = useState<Settings>(settings)
  useEffect(() => {
    if (open) setF(useMail.getState().settings)
  }, [open])
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF((x) => ({ ...x, [k]: v }))
  const dirty = JSON.stringify(f) !== JSON.stringify(settings)

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={760}
      title="Settings"
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="filled"
            disabled={!dirty}
            onClick={() => {
              update(f)
              onClose()
              useUI.getState().showToast('Your preferences have been saved.', { duration: 3000 })
            }}
          >
            Save changes
          </Button>
        </>
      }
    >
      <Row title="Theme">
        {(['light', 'dark', 'system'] as const).map((t) => (
          <Radio key={t} name="theme" value={t} current={f.theme} onChange={(v) => set('theme', v)}>
            {t[0].toUpperCase() + t.slice(1)}
          </Radio>
        ))}
      </Row>
      <Row title="Density" hint="Row height in the conversation list">
        {(['default', 'comfortable', 'compact'] as const).map((d) => (
          <Radio key={d} name="density" value={d} current={f.density} onChange={(v) => set('density', v)}>
            {d[0].toUpperCase() + d.slice(1)}
          </Radio>
        ))}
      </Row>
      <Row title="Reading pane" hint="Open conversations next to the list on wide screens">
        <Radio name="pane" value="none" current={f.readingPane} onChange={(v) => set('readingPane', v)}>
          No split
        </Radio>
        <Radio name="pane" value="right" current={f.readingPane} onChange={(v) => set('readingPane', v)}>
          Right of inbox
        </Radio>
      </Row>
      <Row title="Inbox categories" hint="Primary, Promotions, Social and Updates tabs">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={f.categories} onChange={(e) => set('categories', e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Show category tabs
        </label>
      </Row>
      <Row title="Undo send" hint="Cancellation period after pressing Send">
        <select value={f.undoSeconds} onChange={(e) => set('undoSeconds', Number(e.target.value))} className="h-9 rounded border border-line-strong bg-surface px-2">
          {[0, 5, 10, 20, 30].map((s) => (
            <option key={s} value={s}>
              {s === 0 ? 'Off' : `${s} seconds`}
            </option>
          ))}
        </select>
      </Row>
      <Row title="Auto-advance" hint="After archiving or deleting an open conversation">
        <Radio name="adv" value="list" current={f.autoAdvance} onChange={(v) => set('autoAdvance', v)}>
          Go back to the list
        </Radio>
        <Radio name="adv" value="next" current={f.autoAdvance} onChange={(v) => set('autoAdvance', v)}>
          Open the next conversation
        </Radio>
      </Row>
      <Row title="Signature" hint="Appended to new messages and replies">
        <textarea
          value={f.signature}
          onChange={(e) => set('signature', e.target.value)}
          rows={3}
          className="w-full resize-y rounded border border-line-strong bg-surface p-2 text-[14px] outline-none focus:border-accent"
        />
      </Row>
    </Modal>
  )
}

const SHORTCUTS: [string, [string, string][]][] = [
  [
    'Navigation',
    [
      ['j / k', 'Older / newer conversation'],
      ['o or Enter', 'Open conversation'],
      ['u', 'Back to list'],
      ['/', 'Search mail'],
      ['g then i', 'Go to Inbox'],
      ['g then s', 'Go to Starred'],
      ['g then t', 'Go to Sent'],
      ['g then d', 'Go to Drafts'],
      ['g then a', 'Go to All Mail'],
      ['?', 'Show keyboard shortcuts'],
    ],
  ],
  [
    'Actions',
    [
      ['c', 'Compose'],
      ['x', 'Select conversation'],
      ['* then a / n', 'Select all / none'],
      ['s', 'Star / unstar'],
      ['e', 'Archive'],
      ['#', 'Delete'],
      ['!', 'Report spam'],
      ['Shift + i', 'Mark as read'],
      ['Shift + u', 'Mark as unread'],
      ['+ / -', 'Mark important / not important'],
      ['z', 'Undo last action'],
      ['Esc', 'Clear selection'],
    ],
  ],
  [
    'In a conversation',
    [
      ['r', 'Reply'],
      ['a', 'Reply all'],
      ['f', 'Forward'],
      ['⌘/Ctrl + Enter', 'Send (in compose)'],
    ],
  ],
]

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} width={820} title="Keyboard shortcuts" footer={<Button onClick={onClose}>Close</Button>}>
      <div className="grid gap-6 pb-2 md:grid-cols-3">
        {SHORTCUTS.map(([group, items]) => (
          <div key={group}>
            <div className="mb-2 text-[13px] font-medium text-accent">{group}</div>
            <dl className="flex flex-col gap-1.5">
              {items.map(([k, d]) => (
                <div key={k} className="flex items-baseline gap-3 text-[13px]">
                  <dt className="w-[108px] shrink-0">
                    <kbd className="rounded border border-line-strong bg-surface-2 px-1.5 py-0.5 font-mono text-[12px]">{k}</kbd>
                  </dt>
                  <dd className="text-muted">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Modal>
  )
}

export function LabelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const editId = useUI((s) => s.labelEdit)
  const labels = useMail((s) => s.labels)
  const editing = labels.find((l) => l.id === editId)
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_SWATCHES[0])
  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setColor(editing?.color ?? LABEL_SWATCHES[labels.length % LABEL_SWATCHES.length])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editId])

  const trimmed = name.trim()
  const clash = labels.some((l) => l.id !== editId && l.name.toLowerCase() === trimmed.toLowerCase())
  const close = () => {
    useUI.getState().setLabelEdit(null)
    onClose()
  }
  const submit = () => {
    if (!trimmed || clash) return
    const mail = useMail.getState()
    if (editing) {
      mail.updateLabel(editing.id, { name: trimmed, color })
      useUI.getState().showToast(`Label "${trimmed}" updated.`, { duration: 3000 })
    } else {
      const l = mail.createLabel(trimmed, color)
      const sel = useUI.getState().selected
      if (sel.length) actions.label(sel, l.id, true)
      else
        useUI.getState().showToast(`Label "${l.name}" created.`, {
          secondary: { label: 'View', run: () => goView({ kind: 'label', labelId: l.id }) },
        })
    }
    close()
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={editing ? 'Edit label' : 'New label'}
      footer={
        <>
          <Button onClick={close}>Cancel</Button>
          <Button variant="filled" disabled={!trimmed || clash} onClick={submit}>
            {editing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label className="block text-[13px] text-muted">
          Please enter a label name:
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="mt-2 block h-10 w-full rounded border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none focus:border-2 focus:border-accent"
          />
        </label>
        {clash && <p className="mt-1 text-[12px] text-danger">A label with this name already exists.</p>}
        <div className="mt-4 text-[13px] text-muted">Color</div>
        <div className="mt-2 flex flex-wrap gap-2 pb-2">
          {LABEL_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={c === color}
              onClick={() => setColor(c)}
              className={cx('h-7 w-7 rounded-full border-2', c === color ? 'border-ink' : 'border-transparent')}
              style={{ background: c }}
            />
          ))}
        </div>
      </form>
    </Modal>
  )
}

import { useState, type ReactNode } from 'react'
import { useApp } from '../lib/app'
import { hoursFromNow } from '../lib/format'
import { LABEL_COLORS } from '../lib/types'
import { useDispatch, useStore } from '../lib/store'
import { Button, Dialog } from './ui'

export function Dialogs() {
  const app = useApp()
  const d = app.dialog
  if (d.kind === 'none') return null
  if (d.kind === 'settings') return <SettingsDialog />
  if (d.kind === 'shortcuts') return <ShortcutsDialog />
  if (d.kind === 'labels') return <LabelsDialog />
  if (d.kind === 'snooze') return <SnoozeDialog ids={d.ids} />
  if (d.kind === 'schedule') return <ScheduleDialog composeId={d.composeId} />
  if (d.kind === 'newLabel') return <NewLabelDialog ids={d.ids} />
  return null
}

function SettingsDialog() {
  const app = useApp()
  const s = useStore().settings
  const dispatch = useDispatch()
  const set = (patch: Partial<typeof s>) => dispatch({ t: 'settings', patch })

  return (
    <Dialog title="Settings" onClose={() => app.setDialog({ kind: 'none' })}>
      <Section title="Appearance">
        <Row label="Theme">
          <select className="h-9 rounded-lg border border-line bg-transparent px-2" value={s.theme} onChange={(e) => set({ theme: e.target.value as typeof s.theme })}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">System</option>
          </select>
        </Row>
        <Row label="Inbox density">
          <select className="h-9 rounded-lg border border-line bg-transparent px-2" value={s.density} onChange={(e) => set({ density: e.target.value as typeof s.density })}>
            <option value="default">Default</option>
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </Row>
        <Row label="Reading pane">
          <select className="h-9 rounded-lg border border-line bg-transparent px-2" value={s.readingPane} onChange={(e) => set({ readingPane: e.target.value as typeof s.readingPane })}>
            <option value="none">No split</option>
            <option value="right">Right of list</option>
          </select>
        </Row>
      </Section>
      <Section title="Inbox">
        <Toggle label="Category tabs" checked={s.categoryTabs} onChange={(v) => set({ categoryTabs: v })} />
        <Toggle label="Conversation view" checked={s.conversationView} onChange={(v) => set({ conversationView: v })} />
        <Toggle label="Sender images" checked={s.senderImages} onChange={(v) => set({ senderImages: v })} />
        <Toggle label="Preview snippets" checked={s.snippets} onChange={(v) => set({ snippets: v })} />
        <Toggle label="Starred first" checked={s.starredFirst} onChange={(v) => set({ starredFirst: v })} />
        <Toggle label="Keyboard shortcuts" checked={s.shortcuts} onChange={(v) => set({ shortcuts: v })} />
      </Section>
      <Section title="Compose">
        <Row label="Undo send (seconds)">
          <input
            type="number"
            min={0}
            max={30}
            className="h-9 w-20 rounded-lg border border-line bg-transparent px-2"
            value={s.undoSendSeconds}
            onChange={(e) => set({ undoSendSeconds: Number(e.target.value) })}
          />
        </Row>
        <Row label="Signature">
          <textarea
            className="h-24 w-full rounded-lg border border-line bg-transparent p-2 text-[13px]"
            value={s.signature}
            onChange={(e) => set({ signature: e.target.value })}
          />
        </Row>
      </Section>
      <div className="mt-4 flex justify-end">
        <Button
          variant="danger"
          onClick={() => {
            if (confirm('Reset mailbox to the seeded demo?')) {
              dispatch({ t: 'reset' })
              app.setDialog({ kind: 'none' })
            }
          }}
        >
          Reset mailbox
        </Button>
      </div>
    </Dialog>
  )
}

function ShortcutsDialog() {
  const app = useApp()
  const rows: [string, string][] = [
    ['c', 'Compose'],
    ['/', 'Search'],
    ['j / k', 'Newer / older conversation'],
    ['o or Enter', 'Open'],
    ['u', 'Back to list'],
    ['e', 'Archive'],
    ['#', 'Delete'],
    ['s', 'Star'],
    ['x', 'Select'],
    ['r', 'Reply'],
    ['a', 'Reply all'],
    ['f', 'Forward'],
    ['I', 'Mark as read'],
    ['U', 'Mark as unread'],
    ['gi', 'Go to Inbox'],
    ['gs', 'Go to Starred'],
    ['gt', 'Go to Sent'],
    ['gd', 'Go to Drafts'],
    ['?', 'This help'],
    ['Esc', 'Close / deselect'],
  ]
  return (
    <Dialog title="Keyboard shortcuts" onClose={() => app.setDialog({ kind: 'none' })} width={480}>
      <div className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between py-2 text-[14px]">
            <span>{v}</span>
            <kbd className="rounded bg-chip px-2 py-0.5 font-mono text-[12px] text-ink-2">{k}</kbd>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

function LabelsDialog() {
  const app = useApp()
  const store = useStore()
  const dispatch = useDispatch()
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[0]!)
  return (
    <Dialog title="Labels" onClose={() => app.setDialog({ kind: 'none' })}>
      <div className="mb-4 flex gap-2">
        <input className="h-9 flex-1 rounded-lg border border-line px-3" placeholder="New label" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12" aria-label="Color" />
        <Button
          variant="filled"
          disabled={!name.trim()}
          onClick={() => {
            dispatch({ t: 'createLabel', name: name.trim(), color })
            setName('')
          }}
        >
          Create
        </Button>
      </div>
      <ul className="divide-y divide-line">
        {store.labels.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-2">
            <span className="size-3.5 rounded-sm" style={{ background: l.color }} />
            <span className="flex-1">{l.name}</span>
            <Button variant="danger" onClick={() => dispatch({ t: 'deleteLabel', id: l.id })}>
              Delete
            </Button>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

function NewLabelDialog({ ids }: { ids: string[] }) {
  const app = useApp()
  const dispatch = useDispatch()
  const [name, setName] = useState('')
  const [color, setColor] = useState(LABEL_COLORS[1]!)
  return (
    <Dialog title="New label" onClose={() => app.setDialog({ kind: 'none' })} width={400}>
      <input className="mb-3 h-10 w-full rounded-lg border border-line px-3" placeholder="Label name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      <div className="mb-4 flex flex-wrap gap-2">
        {LABEL_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className="size-7 rounded-full border-2"
            style={{ background: c, borderColor: color === c ? 'var(--ink)' : 'transparent' }}
            onClick={() => setColor(c)}
            aria-label={c}
          />
        ))}
      </div>
      <Button
        variant="filled"
        disabled={!name.trim()}
        onClick={() => {
          dispatch({ t: 'createLabel', name: name.trim(), color, applyTo: ids })
          app.setDialog({ kind: 'none' })
        }}
      >
        Create
      </Button>
    </Dialog>
  )
}

function SnoozeDialog({ ids }: { ids: string[] }) {
  const app = useApp()
  const dispatch = useDispatch()
  const pick = (until: number) => {
    dispatch({ t: 'snooze', ids, until })
    app.setDialog({ kind: 'none' })
  }
  const laterToday = (() => {
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    if (d.getTime() < Date.now()) d.setDate(d.getDate() + 1)
    return d.getTime()
  })()
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(8, 0, 0, 0)
    return d.getTime()
  })()
  const nextWeek = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    d.setHours(8, 0, 0, 0)
    return d.getTime()
  })()
  return (
    <Dialog title="Snooze until" onClose={() => app.setDialog({ kind: 'none' })} width={400}>
      <div className="flex flex-col">
        <button type="button" className="rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => pick(laterToday)}>
          Later today <span className="float-right text-ink-3">6:00 PM</span>
        </button>
        <button type="button" className="rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => pick(tomorrow)}>
          Tomorrow <span className="float-right text-ink-3">8:00 AM</span>
        </button>
        <button type="button" className="rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => pick(nextWeek)}>
          Next week <span className="float-right text-ink-3">{new Date(nextWeek).toLocaleDateString()}</span>
        </button>
        <button type="button" className="rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => pick(hoursFromNow(0.05))}>
          In a few minutes <span className="float-right text-ink-3">demo</span>
        </button>
      </div>
    </Dialog>
  )
}

function ScheduleDialog({ composeId }: { composeId: string }) {
  const app = useApp()
  const dispatch = useDispatch()
  const sendAt = (when: number) => {
    dispatch({ t: 'patchCompose', id: composeId, patch: { sendAt: when } })
    dispatch({ t: 'send', id: composeId })
    app.setDialog({ kind: 'none' })
  }
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(8, 0, 0, 0)
    return d.getTime()
  })()
  return (
    <Dialog title="Schedule send" onClose={() => app.setDialog({ kind: 'none' })} width={400}>
      <button type="button" className="w-full rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => sendAt(tomorrow)}>
        Tomorrow morning <span className="float-right text-ink-3">8:00 AM</span>
      </button>
      <button type="button" className="w-full rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => sendAt(hoursFromNow(18))}>
        Tomorrow evening
      </button>
      <button type="button" className="w-full rounded-lg px-3 py-3 text-left hover:bg-hov" onClick={() => sendAt(hoursFromNow(0.05))}>
        In a few minutes <span className="float-right text-ink-3">demo</span>
      </button>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 text-[13px] font-medium text-ink-3">{title}</h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-4 text-[14px]">
      <span>{label}</span>
      <div className="min-w-0 flex-1 text-right">{children}</div>
    </label>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 text-[14px]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

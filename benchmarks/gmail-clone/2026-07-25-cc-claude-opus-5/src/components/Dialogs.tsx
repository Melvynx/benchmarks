import { useEffect, useState } from 'react'
import { useApp } from '../lib/app'
import { ATTACHMENT_TINT, fileSize, fullDate, previewGradient } from '../lib/format'
import { DEFAULT_SETTINGS, useDispatch, useStore } from '../lib/store'
import type { Density, ReadingPane, Settings, ThemePref } from '../lib/types'
import { Icon } from './Icon'
import { SHORTCUTS } from '../lib/shortcuts'
import { Avatar, Button, cx, Dialog, IconButton, Kbd, Radio, Switch } from './ui'
import { ME, resolveContact } from '../lib/contacts'

const LABEL_COLORS = [
  '#1a73e8',
  '#8430ce',
  '#d01884',
  '#d93025',
  '#e8710a',
  '#f9ab00',
  '#188038',
  '#00838f',
  '#5f6368',
  '#3c4043',
  '#c5221f',
  '#b06000',
]

export function Dialogs() {
  const app = useApp()
  const d = app.dialog
  if (!d) return null
  switch (d.kind) {
    case 'settings':
      return <SettingsDialog />
    case 'shortcuts':
      return <ShortcutsDialog />
    case 'newLabel':
      return <LabelDialog seed={d.seed} applyTo={d.applyTo} />
    case 'editLabel':
      return <LabelDialog labelId={d.labelId} />
    case 'attachment':
      return <AttachmentDialog messageId={d.messageId} attachmentId={d.attachmentId} />
    default:
      return null
  }
}

/* ------------------------------------------------------------- settings */

function SettingsDialog() {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const s = state.settings
  const set = (patch: Partial<Settings>) => dispatch({ t: 'settings', patch })
  const close = () => app.setDialog(null)

  return (
    <Dialog
      open
      onClose={close}
      title="Settings"
      width={640}
      footer={
        <>
          <Button
            variant="text"
            onClick={() => {
              set(DEFAULT_SETTINGS)
              app.toast('Settings restored to defaults.')
            }}
          >
            Restore defaults
          </Button>
          <Button variant="filled" onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <Section title="Theme">
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['light', 'Light', 'lightMode'],
              ['dark', 'Dark', 'darkMode'],
              ['system', 'System', 'settings'],
            ] as const
          ).map(([value, title, icon]) => (
            <button
              key={value}
              type="button"
              onClick={() => set({ theme: value as ThemePref })}
              className={cx(
                'flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] transition-colors',
                s.theme === value
                  ? 'border-accent bg-selected-soft font-medium text-accent'
                  : 'border-line-2 text-ink-2 hover:bg-hov',
              )}
            >
              <Icon name={icon} size={17} />
              {title}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Density">
        {(
          [
            ['default', 'Default — comfortable rows with previews'],
            ['comfortable', 'Comfortable — taller rows'],
            ['compact', 'Compact — maximum information density'],
          ] as const
        ).map(([value, title]) => (
          <Radio
            key={value}
            name="density"
            checked={s.density === value}
            onChange={() => set({ density: value as Density })}
          >
            {title}
          </Radio>
        ))}
      </Section>

      <Section title="Reading pane">
        {(
          [
            ['none', 'No split — full-width conversations'],
            ['right', 'Right of list — read while you triage'],
          ] as const
        ).map(([value, title]) => (
          <Radio
            key={value}
            name="pane"
            checked={s.readingPane === value}
            onChange={() => set({ readingPane: value as ReadingPane })}
          >
            {title}
          </Radio>
        ))}
      </Section>

      <Section title="Inbox">
        <Toggle
          label="Category tabs"
          hint="Split the inbox into Primary, Promotions, Social, Updates and Forums."
          value={s.categoryTabs}
          onChange={(v) => set({ categoryTabs: v })}
        />
        <Toggle
          label="Starred first"
          hint="Float starred conversations to the top of the inbox."
          value={s.starredFirst}
          onChange={(v) => set({ starredFirst: v })}
        />
        <Toggle
          label="Preview snippets"
          hint="Show a line of body text next to each subject."
          value={s.snippets}
          onChange={(v) => set({ snippets: v })}
        />
        <Toggle
          label="Sender images"
          hint="Show avatars in the reading view."
          value={s.senderImages}
          onChange={(v) => set({ senderImages: v })}
        />
        <Toggle
          label="Conversation view"
          hint="Group replies into a single threaded conversation."
          value={s.conversationView}
          onChange={(v) => set({ conversationView: v })}
        />
        <Toggle
          label="Delay marking as read"
          hint="Wait 1.5s before a conversation is marked read."
          value={s.markAsReadDelay}
          onChange={(v) => set({ markAsReadDelay: v })}
        />
        <Toggle
          label="Keyboard shortcuts"
          hint="Enable j/k navigation, e to archive, c to compose and more."
          value={s.shortcuts}
          onChange={(v) => set({ shortcuts: v })}
        />
      </Section>

      <Section title="Undo send">
        <p className="mb-1 text-[12px] text-ink-3">
          How long a sent message can be pulled back before it leaves the outbox.
        </p>
        <div className="flex flex-wrap gap-2">
          {[5, 8, 15, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ undoSendSeconds: n })}
              className={cx(
                'h-8 rounded-full border px-3.5 text-[13px] transition-colors',
                s.undoSendSeconds === n
                  ? 'border-accent bg-selected-soft font-medium text-accent'
                  : 'border-line-2 text-ink-2 hover:bg-hov',
              )}
            >
              {n}s
            </button>
          ))}
        </div>
      </Section>

      <Section title="Signature">
        <textarea
          value={s.signature}
          onChange={(e) => set({ signature: e.target.value })}
          rows={3}
          className="w-full resize-y rounded-lg border border-line-2 bg-transparent px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
        />
      </Section>

      <Section title="Account">
        <div className="flex items-center gap-3 rounded-xl bg-panel-alt px-3 py-3">
          <Avatar name={ME.name} hue={ME.hue} size={44} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] text-ink">{ME.name}</p>
            <p className="truncate text-[12px] text-ink-3">{ME.email}</p>
          </div>
          <div className="text-right text-[12px] text-ink-3">
            {ME.storageUsedGb} / {ME.storageTotalGb} GB
          </div>
        </div>
      </Section>
    </Dialog>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line py-4 last:border-0">
      <h3 className="mb-2 text-[13px] font-medium text-ink">{title}</h3>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  )
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string
  hint: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1.5">
      <span className="mt-[3px]">
        <Switch checked={value} onChange={onChange} label={label} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-ink">{label}</span>
        <span className="block text-[12px] leading-4 text-ink-3">{hint}</span>
      </span>
    </label>
  )
}

/* ------------------------------------------------------------ shortcuts */

function ShortcutsDialog() {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const groups = [...new Set(SHORTCUTS.map((s) => s.group))]

  return (
    <Dialog
      open
      onClose={() => app.setDialog(null)}
      title="Keyboard shortcuts"
      width={720}
      footer={
        <>
          <label className="mr-auto flex items-center gap-2 text-[13px] text-ink-2">
            <Switch
              checked={state.settings.shortcuts}
              onChange={(v) => dispatch({ t: 'settings', patch: { shortcuts: v } })}
              label="Enable keyboard shortcuts"
            />
            Shortcuts {state.settings.shortcuts ? 'on' : 'off'}
          </label>
          <Button variant="filled" onClick={() => app.setDialog(null)}>
            Done
          </Button>
        </>
      }
    >
      <div className="grid gap-x-8 gap-y-1 pb-2 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g} className="mb-3">
            <h3 className="mb-1.5 text-[12px] font-medium tracking-wide text-ink-3 uppercase">
              {g}
            </h3>
            <ul className="flex flex-col gap-1">
              {SHORTCUTS.filter((s) => s.group === g).map((s) => (
                <li key={s.keys + s.label} className="flex items-baseline gap-3 text-[13px]">
                  <span className="flex flex-none gap-1">
                    {s.keys.split(' ').map((k, i) => (
                      <Kbd key={i}>{k}</Kbd>
                    ))}
                  </span>
                  <span className="min-w-0 flex-1 text-ink-2">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Dialog>
  )
}

/* ---------------------------------------------------------------- label */

function LabelDialog({
  labelId,
  seed,
  applyTo,
}: {
  labelId?: string
  seed?: string
  applyTo?: string[]
}) {
  const app = useApp()
  const state = useStore()
  const dispatch = useDispatch()
  const existing = state.labels.find((l) => l.id === labelId)

  const [name, setName] = useState(existing?.name ?? seed ?? '')
  const [color, setColor] = useState(existing?.color ?? LABEL_COLORS[0])
  const [visible, setVisible] = useState(existing?.visible ?? true)
  const close = () => app.setDialog(null)

  const taken = state.labels.some(
    (l) => l.id !== labelId && l.name.toLowerCase() === name.trim().toLowerCase(),
  )
  const valid = !!name.trim() && !taken

  const submit = () => {
    if (!valid) return
    if (existing) {
      dispatch({ t: 'label:update', id: existing.id, patch: { name: name.trim(), color, visible } })
      app.toast(`Label "${name.trim()}" updated.`)
    } else {
      const id = `lbl_${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${state.labels.length}`
      dispatch({ t: 'label:create', label: { id, name: name.trim(), color, visible } })
      if (applyTo?.length) {
        dispatch({ t: 'patchLabels', ids: applyTo, add: [id] })
        app.toast(`Created "${name.trim()}" and applied it to ${applyTo.length} conversation(s).`)
      } else {
        app.toast(`Label "${name.trim()}" created.`)
      }
    }
    close()
  }

  return (
    <Dialog
      open
      onClose={close}
      title={existing ? 'Edit label' : 'New label'}
      width={440}
      footer={
        <>
          {existing && (
            <Button
              variant="text"
              className="mr-auto !text-danger"
              onClick={() => {
                dispatch({ t: 'label:delete', id: existing.id })
                if (app.route.labelId === existing.id) app.navigate({ kind: 'inbox' })
                app.toast(`Label "${existing.name}" deleted.`)
                close()
              }}
            >
              Delete label
            </Button>
          )}
          <Button variant="text" onClick={close}>
            Cancel
          </Button>
          <Button variant="filled" disabled={!valid} onClick={submit}>
            {existing ? 'Save' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] text-ink-3">Label name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="e.g. Contracts"
            className="h-10 rounded-lg border border-line-2 bg-transparent px-3 text-[14px] text-ink outline-none focus:border-accent"
          />
          {taken && <span className="text-[12px] text-danger">A label with that name exists.</span>}
        </label>

        <div className="flex flex-col gap-2">
          <span className="text-[12px] text-ink-3">Colour</span>
          <div className="grid grid-cols-6 gap-2 justify-items-start sm:w-fit">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                onClick={() => setColor(c)}
                className={cx(
                  'grid size-7 place-items-center rounded-full transition-transform',
                  color === c ? 'ring-2 ring-accent ring-offset-2 ring-offset-raised' : 'hover:scale-110',
                )}
                style={{ background: c }}
              >
                {color === c && <Icon name="check" size={15} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3">
          <Switch checked={visible} onChange={setVisible} label="Show in sidebar" />
          <span className="text-[13px] text-ink">Show in the sidebar label list</span>
        </label>

        <div className="rounded-lg bg-panel-alt px-3 py-2.5">
          <span className="mb-1.5 block text-[11px] text-ink-3">Preview</span>
          <span className="flex items-center gap-2 text-[13px] text-ink">
            <Icon name="label" size={18} style={{ color }} />
            {name.trim() || 'Label name'}
            <span
              className="ml-1 rounded-[4px] px-1.5 py-[1px] text-[11px] font-medium"
              style={{ background: `${color}22`, color }}
            >
              {name.trim() || 'Label'}
            </span>
          </span>
        </div>
      </div>
    </Dialog>
  )
}

/* ----------------------------------------------------------- attachment */

function AttachmentDialog({
  messageId,
  attachmentId,
}: {
  messageId: string
  attachmentId: string
}) {
  const app = useApp()
  const state = useStore()
  const msg = state.messages[messageId]
  const att = msg?.attachments?.find((a) => a.id === attachmentId)
  const [downloaded, setDownloaded] = useState(false)

  useEffect(() => {
    if (!att) app.setDialog(null)
  }, [att, app])

  if (!msg || !att) return null
  const from = resolveContact(msg.from)

  return (
    <Dialog open onClose={() => app.setDialog(null)} width={860} bare>
      <div className="-mx-6 flex flex-col">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3">
          <span
            className="grid size-9 flex-none place-items-center rounded-lg text-white"
            style={{ background: ATTACHMENT_TINT[att.kind] }}
          >
            <Icon name={att.kind} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{att.name}</p>
            <p className="truncate text-[12px] text-ink-3">
              {fileSize(att.size)} · from {from.name} · {fullDate(msg.date)}
            </p>
          </div>
          <Button
            variant="tonal"
            onClick={() => {
              setDownloaded(true)
              app.toast(`“${att.name}” saved to this device (simulated).`)
            }}
          >
            <Icon name="download" size={17} />
            {downloaded ? 'Downloaded' : 'Download'}
          </Button>
          <IconButton icon="close" tip="Close" onClick={() => app.setDialog(null)} />
        </div>

        <div className="grid min-h-[320px] place-items-center bg-panel-alt p-6">
          {att.kind === 'image' ? (
            <div
              className="grid h-[46vh] w-full max-w-[720px] place-items-center rounded-lg shadow-e1"
              style={{ background: att.preview ?? previewGradient(att.name) }}
            >
              <span className="rounded-full bg-black/35 px-3 py-1 text-[12px] text-white backdrop-blur">
                {att.name}
              </span>
            </div>
          ) : (
            <div className="w-full max-w-[640px] rounded-lg bg-panel px-8 py-10 shadow-e1">
              <div className="mb-6 flex items-center gap-2">
                <span
                  className="grid size-7 place-items-center rounded text-white"
                  style={{ background: ATTACHMENT_TINT[att.kind] }}
                >
                  <Icon name={att.kind} size={16} />
                </span>
                <span className="text-[13px] font-medium text-ink-2">{att.name}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {[92, 78, 96, 61, 88, 45, 90, 70, 34].map((w, i) => (
                  <span
                    key={i}
                    className="h-2.5 rounded-full bg-line"
                    style={{ width: `${w}%` }}
                  />
                ))}
              </div>
              <p className="mt-8 text-center text-[12px] text-ink-4">
                Preview rendering is simulated — this mailbox is entirely local.
              </p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}

import { useState, type ReactNode } from 'react'
import { useStore } from '../lib/store'
import type { Settings as SettingsData, ThemeMode } from '../types'
import { Kbd, Modal, cx } from './ui'

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx('rounded-full px-4 py-1.5 text-[13px] transition', value === o.id ? 'bg-selected font-medium text-accent' : 'text-ink-2 hover:bg-hover')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-line py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 sm:pr-6">
        <div className="text-[14px] font-medium">{title}</div>
        {hint && <div className="text-[12px] text-ink-3">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const s = state.data.settings
  const patch = (p: Partial<SettingsData>) => dispatch({ type: 'settings', patch: p })
  const [sig, setSig] = useState(s.signature)

  return (
    <Modal title="Settings" onClose={onClose} width="max-w-xl">
      <Row title="Theme" hint="System follows your OS appearance.">
        <Segmented<ThemeMode>
          label="Theme"
          value={s.theme}
          onChange={(theme) => patch({ theme })}
          options={[
            { id: 'system', label: 'System' },
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
          ]}
        />
      </Row>
      <Row title="Density" hint="Compact fits more conversations on screen.">
        <Segmented
          label="Density"
          value={s.density}
          onChange={(density) => patch({ density })}
          options={[
            { id: 'comfortable', label: 'Comfortable' },
            { id: 'compact', label: 'Compact' },
          ]}
        />
      </Row>
      <Row title="Reading pane" hint="Show conversations beside the list on wide screens.">
        <Segmented
          label="Reading pane"
          value={s.readingPane}
          onChange={(readingPane) => patch({ readingPane })}
          options={[
            { id: 'right', label: 'Right' },
            { id: 'off', label: 'Off' },
          ]}
        />
      </Row>
      <Row title="Undo window" hint="How long the undo bar stays visible.">
        <select value={s.undoSeconds} onChange={(e) => patch({ undoSeconds: Number(e.target.value) })} className="h-9 rounded-full border border-line bg-surface px-3 text-[13px]">
          {[5, 8, 15, 30].map((n) => (
            <option key={n} value={n}>
              {n} seconds
            </option>
          ))}
        </select>
      </Row>
      <div className="border-b border-line py-4">
        <div className="mb-2 text-[14px] font-medium">Signature</div>
        <textarea
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          onBlur={() => patch({ signature: sig })}
          rows={3}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13px] outline-none focus:border-accent"
        />
        <p className="mt-1 text-[12px] text-ink-3">Added to new messages and replies. Saved when you leave the field.</p>
      </div>
      <Row title="Offline storage" hint="Mail, drafts and settings are kept in this browser, so the app works without a connection.">
        <span className="rounded-full bg-[#e6f4ea] px-3 py-1 text-[12px] font-medium text-[#137333] dark:bg-[#1e3a2a] dark:text-[#81c995]">Saved locally</span>
      </Row>
    </Modal>
  )
}

const SHORTCUTS: [string, string][] = [
  ['c', 'Compose'],
  ['/', 'Search'],
  ['j / k', 'Next / previous conversation'],
  ['o or Enter', 'Open conversation'],
  ['x', 'Select conversation'],
  ['e', 'Archive'],
  ['#', 'Delete'],
  ['!', 'Report spam'],
  ['s', 'Star / unstar'],
  ['u', 'Mark as read / unread'],
  ['l', 'Label'],
  ['b', 'Snooze'],
  ['r / a / f', 'Reply / reply all / forward'],
  ['g then i / s / d / t', 'Go to Inbox / Starred / Drafts / Trash'],
  ['Ctrl+Enter', 'Send message'],
  ['?', 'Show this list'],
]

export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Keyboard shortcuts" onClose={onClose} width="max-w-md">
      <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-[13px]">
        {SHORTCUTS.map(([keys, desc]) => (
          <div key={keys} className="contents">
            <dt className="text-ink-2">{desc}</dt>
            <dd>
              <Kbd>{keys}</Kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}

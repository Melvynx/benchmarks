import { useEffect } from 'react'
import { X } from 'lucide-react'
import { useMail } from '../store/store'
import { Kbd } from './ui'
import { cx } from '../lib/utils'

export function ToastHost() {
  const toast = useMail((s) => s.toastState)
  const dismiss = useMail((s) => s.dismissToast)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(dismiss, toast.duration)
    return () => clearTimeout(id)
  }, [toast?.id])

  if (!toast) return null
  return (
    <div className="pointer-events-none fixed bottom-6 left-4 z-[60] md:left-6">
      <div className="anim-toast pointer-events-auto flex items-center gap-1 rounded-lg bg-[#2d2e30] py-2 pl-4 pr-2 text-sm text-white shadow-[var(--shadow-menu)] dark:bg-[#e6e9ec] dark:text-[#1f1f1f]">
        <span className="mr-2">{toast.text}</span>
        {toast.actionLabel && toast.action && (
          <button
            type="button"
            onClick={toast.action}
            className="rounded px-2 py-1 font-medium text-[#8ab4f8] hover:bg-white/10 dark:text-[#0b57d0] dark:hover:bg-black/10"
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          title="Dismiss"
          onClick={dismiss}
          className="rounded-full p-1.5 hover:bg-white/10 dark:hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

const SHORTCUT_GROUPS: Array<{ title: string; items: Array<[string[], string]> }> = [
  {
    title: 'Navigation',
    items: [
      [['j'], 'Older conversation'],
      [['k'], 'Newer conversation'],
      [['Enter'], 'Open conversation'],
      [['u'], 'Back to list'],
      [['g', 'i'], 'Go to Inbox'],
      [['g', 's'], 'Go to Starred'],
      [['g', 't'], 'Go to Sent'],
      [['g', 'd'], 'Go to Drafts'],
      [['g', 'a'], 'Go to All Mail'],
      [['/'], 'Focus search'],
    ],
  },
  {
    title: 'Actions',
    items: [
      [['c'], 'Compose'],
      [['x'], 'Select conversation'],
      [['s'], 'Toggle star'],
      [['e'], 'Archive'],
      [['#'], 'Delete'],
      [['!'], 'Report spam'],
      [['⇧', 'i'], 'Mark as read'],
      [['⇧', 'u'], 'Mark as unread'],
      [['z'], 'Undo last action'],
    ],
  },
  {
    title: 'In a conversation',
    items: [
      [['r'], 'Reply'],
      [['a'], 'Reply all'],
      [['f'], 'Forward'],
      [['⌘', 'Enter'], 'Send (while composing)'],
      [['Esc'], 'Close compose / menus'],
      [['?'], 'Toggle this panel'],
    ],
  },
]

export function ShortcutsDialog() {
  const open = useMail((s) => s.shortcutsOpen)
  const setOpen = useMail((s) => s.setShortcutsOpen)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim p-4 anim-fade" onClick={() => setOpen(false)}>
      <div
        className="anim-pop max-h-[85vh] w-[720px] max-w-full overflow-y-auto rounded-2xl bg-surface p-6 shadow-[var(--shadow-compose)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink-1">Keyboard shortcuts</h2>
          <button type="button" title="Close" onClick={() => setOpen(false)} className="rounded-full p-2 text-ink-2 hover:bg-black/8 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-semibold text-accent">{group.title}</h3>
              <ul className="space-y-2.5">
                {group.items.map(([keys, desc]) => (
                  <li key={desc} className="flex items-center justify-between gap-3 text-sm text-ink-2">
                    <span>{desc}</span>
                    <span className="flex shrink-0 gap-1">
                      {keys.map((k, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-ink-3">then</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-ink-3">
          Shortcuts are active whenever you are not typing in a text field.
        </p>
      </div>
    </div>
  )
}

export function SettingsPanel() {
  const open = useMail((s) => s.settingsOpen)
  const setOpen = useMail((s) => s.setSettingsOpen)
  const settings = useMail((s) => s.settings)
  const setSettings = useMail((s) => s.setSettings)
  const resetData = useMail((s) => s.resetData)
  const setShortcutsOpen = useMail((s) => s.setShortcutsOpen)

  if (!open) return null

  const Radio = (props: { checked: boolean; onSelect: () => void; label: string; hint?: string }) => (
    <button type="button" onClick={props.onSelect} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-hover">
      <span
        className={cx(
          'mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border-2',
          props.checked ? 'border-accent' : 'border-ink-3',
        )}
      >
        {props.checked && <span className="h-2.5 w-2.5 rounded-full bg-accent" />}
      </span>
      <span>
        <span className="block text-sm text-ink-1">{props.label}</span>
        {props.hint && <span className="block text-xs text-ink-3">{props.hint}</span>}
      </span>
    </button>
  )

  return (
    <aside className="anim-panel z-30 flex w-full shrink-0 flex-col overflow-y-auto rounded-2xl bg-surface shadow-[var(--shadow-menu)] max-md:fixed max-md:inset-x-2 max-md:bottom-2 max-md:top-16 md:mb-4 md:mr-4 md:w-[320px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="text-base font-medium text-ink-1">Quick settings</h2>
        <button type="button" title="Close settings" onClick={() => setOpen(false)} className="rounded-full p-2 text-ink-2 hover:bg-black/8 dark:hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 px-3 py-4">
        <section className="mb-6">
          <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Theme</h3>
          <Radio checked={settings.theme === 'light'} onSelect={() => setSettings({ theme: 'light' })} label="Light" />
          <Radio checked={settings.theme === 'dark'} onSelect={() => setSettings({ theme: 'dark' })} label="Dark" />
          <Radio checked={settings.theme === 'system'} onSelect={() => setSettings({ theme: 'system' })} label="Device default" hint="Follows your OS appearance" />
        </section>

        <section className="mb-6">
          <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Density</h3>
          <Radio checked={settings.density === 'comfortable'} onSelect={() => setSettings({ density: 'comfortable' })} label="Comfortable" />
          <Radio checked={settings.density === 'compact'} onSelect={() => setSettings({ density: 'compact' })} label="Compact" hint="Fit more conversations on screen" />
        </section>

        <section className="mb-6">
          <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Sending</h3>
          <label className="flex items-center justify-between px-2 py-1 text-sm text-ink-1">
            Undo send window
            <select
              value={settings.undoSendSeconds}
              onChange={(e) => setSettings({ undoSendSeconds: Number(e.target.value) })}
              className="rounded-md border border-line-strong bg-surface px-2 py-1 text-sm outline-none"
            >
              {[5, 10, 20, 30].map((s) => (
                <option key={s} value={s}>
                  {s} seconds
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="mb-6">
          <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Help</h3>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setShortcutsOpen(true)
            }}
            className="w-full rounded-lg px-2 py-2 text-left text-sm text-ink-1 hover:bg-surface-hover"
          >
            View keyboard shortcuts
          </button>
        </section>

        <section>
          <h3 className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Data</h3>
          <p className="px-2 pb-3 text-xs text-ink-3">
            Everything is stored locally in your browser. Resetting restores the original demo mailbox.
          </p>
          <button
            type="button"
            onClick={resetData}
            className="mx-2 rounded-full border border-line-strong px-4 py-1.5 text-sm font-medium text-danger hover:bg-surface-hover"
          >
            Reset demo data
          </button>
        </section>
      </div>
    </aside>
  )
}

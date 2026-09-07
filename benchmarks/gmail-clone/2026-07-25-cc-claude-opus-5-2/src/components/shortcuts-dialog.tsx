import { Kbd, Switch } from './ui/bits'
import { Dialog } from './ui/dialog'
import { useSettings } from '@/store/settings'

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Navigation',
    items: [
      ['g then i', 'Go to Inbox'],
      ['g then s', 'Go to Starred'],
      ['g then t', 'Go to Sent'],
      ['g then d', 'Go to Drafts'],
      ['g then a', 'Go to All Mail'],
      ['/', 'Focus search'],
      ['j / k', 'Move down / up the list'],
      ['Enter', 'Open the highlighted conversation'],
      ['u', 'Back to the list'],
      ['[ / ]', 'Previous / next conversation'],
    ],
  },
  {
    title: 'Actions',
    items: [
      ['c', 'Compose'],
      ['x', 'Select conversation'],
      ['s', 'Star / unstar'],
      ['e', 'Archive'],
      ['#', 'Move to Trash'],
      ['!', 'Report spam'],
      ['b', 'Snooze'],
      ['l', 'Label as…'],
      ['r', 'Reply'],
      ['a', 'Reply all'],
      ['f', 'Forward'],
      ['Shift + i', 'Mark as read'],
      ['Shift + u', 'Mark as unread'],
      ['z', 'Undo the last action'],
    ],
  },
  {
    title: 'Application',
    items: [
      ['?', 'This dialog'],
      ['Esc', 'Close dialogs and menus'],
      ['Ctrl/⌘ + Enter', 'Send from the composer'],
    ],
  },
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { settings, set } = useSettings()
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Keyboard shortcuts"
      className="max-w-3xl"
      footer={
        <label className="mr-auto flex items-center gap-3 text-[13px] text-ink-2">
          <Switch
            checked={settings.keyboardShortcuts}
            onChange={(v) => set('keyboardShortcuts', v)}
            label="Keyboard shortcuts"
          />
          Keyboard shortcuts {settings.keyboardShortcuts ? 'on' : 'off'}
        </label>
      }
    >
      <div className="grid gap-x-10 gap-y-6 pb-4 sm:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h3 className="mb-2 border-b border-line-soft pb-1 text-[13px] font-medium text-ink">
              {g.title}
            </h3>
            <dl className="space-y-1.5">
              {g.items.map(([key, desc]) => (
                <div key={key} className="flex items-baseline gap-3">
                  <dt className="w-[7.5rem] shrink-0 text-right">
                    {key.split(' then ').map((part, i, arr) => (
                      <span key={part}>
                        <Kbd>{part}</Kbd>
                        {i < arr.length - 1 && <span className="px-1 text-ink-4">then</span>}
                      </span>
                    ))}
                  </dt>
                  <dd className="text-[13px] text-ink-2">{desc}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  )
}

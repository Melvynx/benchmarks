import { useUI } from '../../store/uiStore';
import { Modal } from '../ui/primitives';

const GROUPS: Array<{ title: string; rows: Array<[string[], string]> }> = [
  {
    title: 'Navigate',
    rows: [
      [['j', 'n'], 'Next conversation'],
      [['k', 'p'], 'Previous conversation'],
      [['o', 'Enter'], 'Open conversation'],
      [['u'], 'Back to list'],
      [['/'], 'Search'],
      [['g', 'i'], 'Go to Inbox'],
      [['g', 's'], 'Go to Starred'],
      [['g', 't'], 'Go to Sent'],
      [['g', 'd'], 'Go to Drafts'],
      [['g', 'c'], 'Go to Scheduled'],
      [['g', 'a'], 'Go to All Mail'],
    ],
  },
  {
    title: 'Manage',
    rows: [
      [['e'], 'Archive'],
      [['#'], 'Delete'],
      [['!'], 'Report spam'],
      [['s'], 'Star or unstar'],
      [['I'], 'Mark as read'],
      [['U'], 'Mark as unread'],
      [['x'], 'Select'],
      [['b'], 'Snooze'],
      [['l'], 'Labels'],
    ],
  },
  {
    title: 'Compose',
    rows: [
      [['c'], 'New message'],
      [['r'], 'Reply'],
      [['a'], 'Reply all'],
      [['f'], 'Forward'],
      [['Ctrl', 'Enter'], 'Send'],
      [['?'], 'Show shortcuts'],
    ],
  },
];

export function ShortcutsDialog() {
  const open = useUI((s) => s.shortcutsOpen);
  const setOpen = useUI((s) => s.setShortcutsOpen);
  if (!open) return null;

  return (
    <Modal title="Keyboard shortcuts" onClose={() => setOpen(false)} width="sm:max-w-3xl">
      <div className="grid gap-6 p-5 sm:grid-cols-3">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">{group.title}</h3>
            <dl className="flex flex-col gap-2">
              {group.rows.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
                  <dt className="text-ink-2">{label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {keys.map((k, i) => (
                      <span key={`${k}-${i}`} className="flex items-center gap-1">
                        {i > 0 && <span className="text-xs text-ink-3">{keys.length === 2 && keys[0] === 'g' ? 'then' : '/'}</span>}
                        <kbd className="min-w-[22px] rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-center font-sans text-xs text-ink">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

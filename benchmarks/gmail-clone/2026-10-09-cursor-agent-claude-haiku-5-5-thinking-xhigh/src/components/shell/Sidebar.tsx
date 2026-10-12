import { useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { CalendarClock, Clock, FileText, HardDrive, Inbox, Mails, OctagonAlert, Pencil, Send, Star, Trash } from 'lucide-react';
import { sidebarCounts, storageBytes } from '../../domain/selectors';
import type { Folder } from '../../domain/types';
import { FOLDER_LABELS } from '../../domain/types';
import { useMediaQuery } from '../../hooks/useApp';
import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import { goFolder, go, sectionKey, type Route } from '../../lib/route';
import { startNewCompose } from '../../store/commands';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { LABEL_DOT } from '../labelStyles';

const NAV: Array<{ folder: Folder; icon: LucideIcon }> = [
  { folder: 'inbox', icon: Inbox },
  { folder: 'starred', icon: Star },
  { folder: 'snoozed', icon: Clock },
  { folder: 'sent', icon: Send },
  { folder: 'drafts', icon: FileText },
  { folder: 'scheduled', icon: CalendarClock },
  { folder: 'all', icon: Mails },
  { folder: 'spam', icon: OctagonAlert },
  { folder: 'trash', icon: Trash },
];

const BASE_STORAGE_BYTES = 4.3 * 1024 ** 3;
const QUOTA_BYTES = 15 * 1024 ** 3;

export function Sidebar({ route }: { route: Route }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const sidebarMode = useUI((s) => s.sidebarMode);
  const drawerOpen = useUI((s) => s.drawerOpen);
  const setDrawerOpen = useUI((s) => s.setDrawerOpen);
  const setSettingsOpen = useUI((s) => s.setSettingsOpen);
  const data = useMail((s) => s.data);
  const counts = useMemo(() => sidebarCounts(data), [data]);
  const labels = useMail((s) => s.data.labels);
  const used = useMail((s) => storageBytes(s.data));

  const rail = isDesktop && sidebarMode === 'rail';
  const activeKey = sectionKey(route.section);
  const afterNav = () => {
    if (!isDesktop) setDrawerOpen(false);
  };
  const usage = BASE_STORAGE_BYTES + used;

  const countFor = (folder: Folder): number | null => {
    if (folder === 'inbox') return counts.inboxUnread;
    if (folder === 'drafts') return counts.drafts;
    if (folder === 'scheduled') return counts.scheduled;
    if (folder === 'spam') return counts.spamUnread;
    return null;
  };

  return (
    <>
      {!isDesktop && drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setDrawerOpen(false)} aria-hidden />
      )}
      <aside
        aria-label="Mailboxes"
        className={cn(
          'flex shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-app px-2 pb-4 pt-2 transition-[width,transform] duration-200',
          isDesktop ? (rail ? 'w-[72px]' : 'w-64') : 'fixed inset-y-0 left-0 z-50 w-[280px] bg-surface shadow-2xl',
          !isDesktop && (drawerOpen ? 'translate-x-0' : '-translate-x-full'),
        )}
      >
        <button
          type="button"
          onClick={() => {
            startNewCompose();
            afterNav();
          }}
          aria-label="Compose"
          className={cn(
            'mb-3 flex h-14 items-center gap-3 rounded-2xl bg-compose text-ink shadow-sm transition-shadow hover:shadow-md max-md:hidden',
            rail ? 'mx-auto w-14 justify-center' : 'w-[136px] pl-5 pr-6',
          )}
        >
          <Pencil className="size-5" />
          {!rail && <span className="text-sm font-medium">Compose</span>}
        </button>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ folder, icon: Icon }) => {
            const active = activeKey === `folder:${folder}`;
            const count = countFor(folder);
            return (
              <button
                key={folder}
                type="button"
                title={FOLDER_LABELS[folder]}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  goFolder(folder);
                  afterNav();
                }}
                className={cn(
                  'flex h-8 items-center gap-3 text-sm transition-colors',
                  rail ? 'mx-auto w-12 justify-center rounded-full' : 'rounded-r-full pl-5 pr-3',
                  active ? 'bg-primary-soft font-semibold text-ink' : 'text-ink-2 hover:bg-hover',
                  !active && folder === 'inbox' && count !== null && count > 0 && 'font-semibold text-ink',
                )}
              >
                <Icon className="size-[18px] shrink-0" />
                {!rail && <span className="flex-1 truncate text-left">{FOLDER_LABELS[folder]}</span>}
                {!rail && count !== null && count > 0 && <span className="text-xs">{count}</span>}
              </button>
            );
          })}
        </nav>

        {!rail && (
          <div className="mt-4 flex flex-col gap-0.5">
            <p className="px-5 pb-1 pt-2 text-xs font-medium text-ink-3">Labels</p>
            {labels.map((label) => {
              const active = activeKey === `label:${label.id}`;
              return (
                <button
                  key={label.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => {
                    go({ section: { kind: 'label', labelId: label.id }, threadId: null });
                    afterNav();
                  }}
                  className={cn(
                    'flex h-8 items-center gap-3 rounded-r-full pl-5 pr-3 text-sm transition-colors',
                    active ? 'bg-primary-soft font-semibold text-ink' : 'text-ink-2 hover:bg-hover',
                  )}
                >
                  <span className={cn('size-2.5 shrink-0 rounded-full', LABEL_DOT[label.color])} />
                  <span className="flex-1 truncate text-left">{label.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(true);
                afterNav();
              }}
              className="flex h-8 items-center rounded-r-full pl-5 pr-3 text-left text-sm text-primary hover:bg-hover"
            >
              Manage labels
            </button>
          </div>
        )}

        {!rail && (
          <div className="mt-auto px-5 pt-6 text-xs text-ink-3">
            <div className="mb-2 flex items-center gap-2">
              <HardDrive className="size-4" />
              <span>
                {formatBytes(usage)} of {formatBytes(QUOTA_BYTES)} used
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (usage / QUOTA_BYTES) * 100)}%` }} />
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

import { useMail, unreadIn } from '../store/mailStore';
import { useUi } from '../store/uiStore';
import { Icon, type IconName } from './Icon';
import type { MailboxId } from '../types';
import { formatSize } from '../lib/utils';
import { useMedia } from '../lib/hooks';

const NAV: Array<{ id: MailboxId; label: string; icon: IconName; count?: boolean }> = [
  { id: 'inbox', label: 'Inbox', icon: 'inbox', count: true },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'snoozed', label: 'Snoozed', icon: 'clock' },
  { id: 'sent', label: 'Sent', icon: 'sent' },
  { id: 'drafts', label: 'Drafts', icon: 'drafts', count: true },
  { id: 'all', label: 'All Mail', icon: 'mailUnread' },
  { id: 'spam', label: 'Spam', icon: 'spam', count: true },
  { id: 'trash', label: 'Trash', icon: 'trash' },
];

export function Sidebar() {
  const view = useMail((s) => s.view);
  const openMailbox = useMail((s) => s.openMailbox);
  const openLabel = useMail((s) => s.openLabel);
  const openCompose = useMail((s) => s.openCompose);
  const labels = useMail((s) => s.labels);
  const deleteLabel = useMail((s) => s.deleteLabel);
  const threads = useMail((s) => s.threads);
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);
  const openDialog = useUi((s) => s.openDialog);
  const isNarrow = useMedia('(max-width: 900px)');

  const usedBytes = threads.reduce(
    (sum, t) => sum + t.messages.reduce((s2, m) => s2 + (m.attachments ?? []).reduce((s3, a) => s3 + a.size, 0), 0),
    0,
  );

  const isMailboxActive = (m: MailboxId) => view.kind === 'mailbox' && view.mailbox === m;

  const go = (fn: () => void) => () => {
    fn();
    if (isNarrow) setSidebarOpen(false);
  };

  return (
    <>
      {isNarrow && sidebarOpen && <div className="drawer-backdrop" onClick={() => setSidebarOpen(false)} />}
      <nav
        className={`sidebar ${isNarrow ? 'sidebar-drawer' : ''} ${isNarrow && sidebarOpen ? 'open' : ''} ${!isNarrow && collapsed ? 'collapsed' : ''}`}
        aria-label="Mailboxes"
      >
        <button className="compose-btn" onClick={go(() => openCompose())} aria-label="Compose">
          <Icon name="pen" size={20} />
          <span>Compose</span>
        </button>

        <div className="nav-section">
          {NAV.map((n) => {
            const count = n.count ? unreadIn(threads, n.id) : 0;
            return (
              <button
                key={n.id}
                className={`nav-item ${isMailboxActive(n.id) ? 'active' : ''}`}
                onClick={go(() => openMailbox(n.id))}
                title={n.label}
              >
                <Icon name={n.icon} size={20} />
                <span className="nav-label">{n.label}</span>
                {count > 0 && <span className="nav-count">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="nav-labels-header">
          <span>Labels</span>
          <button className="icon-btn small" aria-label="Create label" title="Create label" onClick={() => openDialog('label')}>
            <Icon name="plus" size={18} />
          </button>
        </div>
        <div className="nav-section labels">
          {labels.map((l) => (
            <div
              key={l.id}
              className={`nav-item label-item ${view.kind === 'label' && view.labelId === l.id ? 'active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={go(() => openLabel(l.id))}
              onKeyDown={(e) => e.key === 'Enter' && openLabel(l.id)}
              title={l.name}
            >
              <Icon name="label" size={18} style={{ color: l.color }} />
              <span className="nav-label">{l.name}</span>
              <span
                className="label-delete"
                role="button"
                aria-label={`Delete label ${l.name}`}
                title={`Delete label ${l.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  deleteLabel(l.id);
                }}
              >
                <Icon name="close" size={14} />
              </span>
            </div>
          ))}
        </div>

        <div className="sidebar-storage">
          <div className="storage-bar">
            <div className="storage-fill" style={{ width: `${Math.min(100, (usedBytes / (15 * 1024 * 1024 * 1024)) * 100 * 400)}%` }} />
          </div>
          <div className="storage-text">{formatSize(usedBytes)} of 15 GB used</div>
        </div>
      </nav>
    </>
  );
}

import {
  Archive,
  ChevronDown,
  ChevronUp,
  Clock3,
  FilePenLine,
  Inbox,
  MailPlus,
  Pencil,
  Plus,
  Send,
  Star,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { MailboxId } from '../domain/mail';
import { MAILBOX_TITLES } from '../lib/format';

interface SidebarProps {
  currentMailbox: MailboxId;
  counts: Record<MailboxId, number>;
  labels: string[];
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCompose: () => void;
  onNavigate: (mailbox: MailboxId) => void;
  onLabelClick: (label: string) => void;
  onCloseMobile: () => void;
  onNotify: (message: string) => void;
}

const PRIMARY_ITEMS = [
  { id: 'inbox', icon: Inbox },
  { id: 'starred', icon: Star },
  { id: 'snoozed', icon: Clock3 },
  { id: 'sent', icon: Send },
  { id: 'drafts', icon: FilePenLine },
] as const;

const MORE_ITEMS = [
  { id: 'archive', icon: Archive },
  { id: 'trash', icon: Trash2 },
] as const;

export function Sidebar({
  currentMailbox,
  counts,
  labels,
  isCollapsed,
  isMobileOpen,
  onCompose,
  onNavigate,
  onLabelClick,
  onCloseMobile,
  onNotify,
}: SidebarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const navigate = (mailbox: MailboxId) => {
    onNavigate(mailbox);
    onCloseMobile();
  };

  return (
    <>
      {isMobileOpen ? (
        <button
          type="button"
          className="mobile-scrim"
          aria-label="Close navigation"
          onClick={onCloseMobile}
        />
      ) : null}
      <aside
        className={`sidebar${isCollapsed ? ' sidebar--collapsed' : ''}${
          isMobileOpen ? ' sidebar--mobile-open' : ''
        }`}
        aria-label="Mailbox navigation"
      >
        <div className="sidebar__mobile-header">
          <span className="sidebar__mobile-title">Mailboxes</span>
          <button type="button" aria-label="Close navigation" onClick={onCloseMobile}>
            <X aria-hidden="true" />
          </button>
        </div>
        <button type="button" className="compose-button" onClick={onCompose}>
          <Pencil aria-hidden="true" />
          <span>Compose</span>
        </button>

        <nav className="sidebar__nav">
          {PRIMARY_ITEMS.map(({ id, icon: NavIcon }) => (
            <button
              type="button"
              key={id}
              className={`nav-item${currentMailbox === id ? ' nav-item--active' : ''}`}
              aria-current={currentMailbox === id ? 'page' : undefined}
              onClick={() => navigate(id)}
              title={isCollapsed ? MAILBOX_TITLES[id] : undefined}
            >
              <NavIcon aria-hidden="true" />
              <span className="nav-item__label">{MAILBOX_TITLES[id]}</span>
              {counts[id] > 0 ? <span className="nav-item__count">{counts[id]}</span> : null}
            </button>
          ))}
          <button
            type="button"
            className="nav-item"
            aria-expanded={isMoreOpen}
            onClick={() => setIsMoreOpen((open) => !open)}
            title={isCollapsed ? 'More' : undefined}
          >
            {isMoreOpen ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
            <span className="nav-item__label">More</span>
          </button>
          {isMoreOpen
            ? MORE_ITEMS.map(({ id, icon: NavIcon }) => (
                <button
                  type="button"
                  key={id}
                  className={`nav-item${currentMailbox === id ? ' nav-item--active' : ''}`}
                  aria-current={currentMailbox === id ? 'page' : undefined}
                  onClick={() => navigate(id)}
                  title={isCollapsed ? MAILBOX_TITLES[id] : undefined}
                >
                  <NavIcon aria-hidden="true" />
                  <span className="nav-item__label">{MAILBOX_TITLES[id]}</span>
                  {counts[id] > 0 ? <span className="nav-item__count">{counts[id]}</span> : null}
                </button>
              ))
            : null}
        </nav>

        <section className="sidebar__labels" aria-label="Labels">
          <div className="sidebar__section-heading">
            <span>Labels</span>
            <button
              type="button"
              aria-label="Create label"
              title="Create label"
              onClick={() => onNotify('Select messages, then use the label button to organize them.')}
            >
              <Plus aria-hidden="true" />
            </button>
          </div>
          {labels.map((label) => (
            <button
              type="button"
              className="nav-item nav-item--label"
              key={label}
              onClick={() => {
                onLabelClick(label);
                onCloseMobile();
              }}
              title={isCollapsed ? label : undefined}
            >
              <Tag aria-hidden="true" />
              <span className="nav-item__label">{label}</span>
            </button>
          ))}
        </section>

        <button
          type="button"
          className="sidebar__storage"
          onClick={() => onNotify('2.8 GB of 15 GB used in this local mailbox.')}
        >
          <MailPlus aria-hidden="true" />
          <span>2.8 GB of 15 GB</span>
        </button>
      </aside>
    </>
  );
}

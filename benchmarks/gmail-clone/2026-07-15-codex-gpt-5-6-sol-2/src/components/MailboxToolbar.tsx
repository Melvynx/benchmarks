import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Mail,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import type { MailboxId } from '../domain/mail';
import { IconButton } from './IconButton';

interface MailboxToolbarProps {
  currentMailbox: MailboxId;
  visibleCount: number;
  totalCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  canArchiveSelection: boolean;
  canSnoozeSelection: boolean;
  labels: readonly string[];
  onToggleAll: () => void;
  onClearSelection: () => void;
  onArchiveSelected: () => void;
  onTrashSelected: () => void;
  onMarkSelectedUnread: () => void;
  onSnoozeSelected: () => void;
  onLabelSelected: (label: string) => void;
  onRestoreSelected: () => void;
  onDeleteForever: () => void;
  onNotify: (message: string) => void;
}

export function MailboxToolbar({
  currentMailbox,
  visibleCount,
  totalCount,
  selectedCount,
  isAllSelected,
  canArchiveSelection,
  canSnoozeSelection,
  labels,
  onToggleAll,
  onClearSelection,
  onArchiveSelected,
  onTrashSelected,
  onMarkSelectedUnread,
  onSnoozeSelected,
  onLabelSelected,
  onRestoreSelected,
  onDeleteForever,
  onNotify,
}: MailboxToolbarProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLabelMenuOpen, setIsLabelMenuOpen] = useState(false);
  const hasSelection = selectedCount > 0;

  const refresh = () => {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      onNotify('Mailbox is up to date.');
    }, 650);
  };

  return (
    <div className="mailbox-toolbar" aria-label="Mailbox actions">
      <div className="mailbox-toolbar__left">
        {hasSelection ? (
          <IconButton label="Clear selection" onClick={onClearSelection}>
            <X aria-hidden="true" />
          </IconButton>
        ) : (
          <div className="select-all-control">
            <label className="check-control" aria-label="Select all visible messages">
              <input type="checkbox" checked={isAllSelected} onChange={onToggleAll} />
              <span />
            </label>
            <ChevronDown aria-hidden="true" />
          </div>
        )}

        {hasSelection ? (
          <>
            <span className="selection-count">{selectedCount} selected</span>
            {currentMailbox === 'trash' ? (
              <>
                <button type="button" className="toolbar-text-action" onClick={onDeleteForever}>
                  Delete forever
                </button>
                <button type="button" className="toolbar-text-action" onClick={onRestoreSelected}>
                  <RotateCcw aria-hidden="true" />
                  Restore
                </button>
              </>
            ) : (
              <>
                {canArchiveSelection ? (
                  <IconButton label="Archive" onClick={onArchiveSelected}>
                    <Archive aria-hidden="true" />
                  </IconButton>
                ) : null}
                <IconButton label="Delete" onClick={onTrashSelected}>
                  <Trash2 aria-hidden="true" />
                </IconButton>
                <IconButton label="Mark as unread" onClick={onMarkSelectedUnread}>
                  <Mail aria-hidden="true" />
                </IconButton>
                {canSnoozeSelection ? (
                  <IconButton label="Snooze" onClick={onSnoozeSelected}>
                    <Clock3 aria-hidden="true" />
                  </IconButton>
                ) : null}
                <div className="menu-anchor">
                  <IconButton
                    label="Add label"
                    aria-expanded={isLabelMenuOpen}
                    onClick={() => setIsLabelMenuOpen((open) => !open)}
                  >
                    <Tag aria-hidden="true" />
                  </IconButton>
                  {isLabelMenuOpen ? (
                    <div className="label-menu popover" role="menu">
                      <strong>Label as</strong>
                      {labels.map((label) => (
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          key={label}
                          onClick={() => {
                            onLabelSelected(label);
                            setIsLabelMenuOpen(false);
                          }}
                        >
                          <Tag aria-hidden="true" />
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <IconButton label="Refresh" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw className={isRefreshing ? 'spin' : ''} aria-hidden="true" />
            </IconButton>
            <IconButton label="More mailbox options" onClick={() => onNotify(`${totalCount} messages in this mailbox.`)}>
              <MoreVertical aria-hidden="true" />
            </IconButton>
          </>
        )}
      </div>

      <div className="mailbox-toolbar__right">
        <span>
          {visibleCount === 0 ? '0' : `1–${visibleCount}`} of {totalCount}
        </span>
        <IconButton label="Newer" disabled>
          <ChevronLeft aria-hidden="true" />
        </IconButton>
        <IconButton label="Older" disabled={totalCount <= visibleCount}>
          <ChevronRight aria-hidden="true" />
        </IconButton>
      </div>
    </div>
  );
}

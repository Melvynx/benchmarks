import { useState } from 'react';
import { PAGE_SIZE, useMail, viewTitle } from '../store/mailStore';
import { useUi } from '../store/uiStore';
import type { Thread } from '../types';
import { Icon } from './Icon';
import { Popover } from './Popover';
import { snoozePresets } from '../lib/hooks';

function SelectMenu({ ids }: { ids: string[] }) {
  const [open, setOpen] = useState(false);
  const selection = useMail((s) => s.selection);
  const threads = useMail((s) => s.threads);
  const setSelection = useMail((s) => s.setSelection);
  const selectWhere = useMail((s) => s.selectWhere);

  const allSelected = ids.length > 0 && ids.every((id) => selection.includes(id));
  const someSelected = selection.length > 0 && !allSelected;

  return (
    <div className="select-wrap">
      <button
        className={`checkbox ${allSelected ? 'checked' : ''} ${someSelected ? 'indeterminate' : ''}`}
        aria-label="Select all"
        title="Select"
        onClick={() => setSelection(allSelected ? [] : ids)}
      >
        {(allSelected || someSelected) && <Icon name="check" size={14} />}
      </button>
      <button className="icon-btn small" aria-label="Select options" onClick={() => setOpen((o) => !o)}>
        <Icon name="chevronDown" size={16} />
      </button>
      <Popover open={open} onClose={() => setOpen(false)} className="menu-pop">
        <button className="menu-item" onClick={() => { setSelection(ids); setOpen(false); }}>All</button>
        <button className="menu-item" onClick={() => { setSelection([]); setOpen(false); }}>None</button>
        <button className="menu-item" onClick={() => { selectWhere(ids, (t: Thread) => t.read); setOpen(false); }}>Read</button>
        <button className="menu-item" onClick={() => { selectWhere(ids, (t: Thread) => !t.read); setOpen(false); }}>Unread</button>
        <button className="menu-item" onClick={() => { selectWhere(ids, (t: Thread) => t.starred); setOpen(false); }}>Starred</button>
        <button className="menu-item" onClick={() => { selectWhere(ids, (t: Thread) => !t.starred); setOpen(false); }}>Unstarred</button>
        <div className="menu-sep" />
        <div className="menu-note">{selection.length ? `${selection.length} selected` : `${threads.length} conversations`}</div>
      </Popover>
    </div>
  );
}

export function SnoozeMenu({ ids, onDone }: { ids: string[]; onDone?: () => void }) {
  const snooze = useMail((s) => s.snooze);
  const [custom, setCustom] = useState('');
  const presets = snoozePresets();
  return (
    <div>
      {presets.map((p) => (
        <button
          key={p.label}
          className="menu-item spread"
          onClick={() => { snooze(ids, p.at); onDone?.(); }}
        >
          <span>{p.label}</span>
          <span className="menu-hint">{p.hint}</span>
        </button>
      ))}
      <div className="menu-sep" />
      <div className="menu-custom">
        <input
          type="datetime-local"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          aria-label="Pick date and time"
        />
        <button
          className="btn small"
          disabled={!custom}
          onClick={() => { snooze(ids, new Date(custom).getTime()); onDone?.(); }}
        >
          Snooze
        </button>
      </div>
    </div>
  );
}

export function LabelsMenu({ ids, onDone }: { ids: string[]; onDone?: () => void }) {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const applyLabel = useMail((s) => s.applyLabel);
  const openDialog = useUi((s) => s.openDialog);
  return (
    <div>
      <div className="menu-title">Label as:</div>
      {labels.map((l) => {
        const selected = threads.filter((t) => ids.includes(t.id));
        const allHave = selected.length > 0 && selected.every((t) => t.labels.includes(l.id));
        return (
          <button
            key={l.id}
            className="menu-item"
            onClick={() => { applyLabel(ids, l.id, !allHave); onDone?.(); }}
          >
            <span className={`menu-check ${allHave ? 'on' : ''}`}>
              {allHave && <Icon name="check" size={14} />}
            </span>
            <Icon name="label" size={16} style={{ color: l.color }} />
            {l.name}
          </button>
        );
      })}
      <div className="menu-sep" />
      <button className="menu-item" onClick={() => { openDialog('label'); onDone?.(); }}>
        <Icon name="plus" size={16} /> Create new label
      </button>
    </div>
  );
}

export function ListToolbar({ visibleIds, total }: { visibleIds: string[]; total: number }) {
  const selection = useMail((s) => s.selection);
  const view = useMail((s) => s.view);
  const page = useMail((s) => s.page);
  const setPage = useMail((s) => s.setPage);
  const refresh = useMail((s) => s.refresh);
  const refreshing = useMail((s) => s.refreshing);
  const archive = useMail((s) => s.archive);
  const moveToTrash = useMail((s) => s.moveToTrash);
  const markRead = useMail((s) => s.markRead);
  const reportSpam = useMail((s) => s.reportSpam);
  const moveToInbox = useMail((s) => s.moveToInbox);
  const deleteForever = useMail((s) => s.deleteForever);
  const emptyTrash = useMail((s) => s.emptyTrash);
  const markAllRead = useMail((s) => s.markAllRead);
  const unsnooze = useMail((s) => s.unsnooze);
  const labels = useMail((s) => s.labels);
  const [menu, setMenu] = useState<null | 'snooze' | 'labels' | 'more'>(null);

  const has = selection.length > 0;
  const inTrash = view.kind === 'mailbox' && view.mailbox === 'trash';
  const inSpam = view.kind === 'mailbox' && view.mailbox === 'spam';
  const inSnoozed = view.kind === 'mailbox' && view.mailbox === 'snoozed';
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const end = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <div className="toolbar" role="toolbar" aria-label="Mail actions">
      <SelectMenu ids={visibleIds} />

      {!has && (
        <>
          <button className={`icon-btn ${refreshing ? 'spin' : ''}`} aria-label="Refresh" title="Refresh" onClick={refresh}>
            <Icon name="refresh" />
          </button>
          <div className="menu-anchor">
            <button className="icon-btn" aria-label="More" title="More" onClick={() => setMenu(menu === 'more' ? null : 'more')}>
              <Icon name="more" />
            </button>
            <Popover open={menu === 'more'} onClose={() => setMenu(null)} className="menu-pop">
              <button className="menu-item" onClick={() => { markAllRead(); setMenu(null); }}>Mark all as read</button>
              {inTrash && <button className="menu-item danger" onClick={() => { emptyTrash(); setMenu(null); }}>Empty Trash now</button>}
              {inSpam && <button className="menu-item" onClick={() => { moveToInbox(visibleIds); setMenu(null); }}>Move all to Inbox</button>}
            </Popover>
          </div>
        </>
      )}

      {has && (
        <>
          {!inTrash && (
            <button className="icon-btn" aria-label="Archive" title="Archive (e)" onClick={() => archive(selection)}>
              <Icon name="archive" />
            </button>
          )}
          {!inTrash && !inSpam && (
            <button className="icon-btn" aria-label="Report spam" title="Report spam (!)" onClick={() => reportSpam(selection, true)}>
              <Icon name="spam" />
            </button>
          )}
          <button
            className="icon-btn"
            aria-label={inTrash ? 'Delete forever' : 'Delete'}
            title={inTrash ? 'Delete forever' : 'Delete (#)'}
            onClick={() => (inTrash ? deleteForever(selection) : moveToTrash(selection))}
          >
            <Icon name="trash" />
          </button>
          <span className="toolbar-sep" />
          <button className="icon-btn" aria-label="Mark as read" title="Mark as read (⇧I)" onClick={() => markRead(selection, true)}>
            <Icon name="mailRead" />
          </button>
          <button className="icon-btn" aria-label="Mark as unread" title="Mark as unread (⇧U)" onClick={() => markRead(selection, false)}>
            <Icon name="mailUnread" />
          </button>
          {inSnoozed ? (
            <button className="icon-btn" aria-label="Unsnooze" title="Unsnooze" onClick={() => unsnooze(selection)}>
              <Icon name="clock" />
            </button>
          ) : (
            !inTrash && (
              <div className="menu-anchor">
                <button className="icon-btn" aria-label="Snooze" title="Snooze (b)" onClick={() => setMenu(menu === 'snooze' ? null : 'snooze')}>
                  <Icon name="snooze" />
                </button>
                <Popover open={menu === 'snooze'} onClose={() => setMenu(null)} className="menu-pop" width={240}>
                  <SnoozeMenu ids={selection} onDone={() => setMenu(null)} />
                </Popover>
              </div>
            )
          )}
          <div className="menu-anchor">
            <button className="icon-btn" aria-label="Labels" title="Labels (l)" onClick={() => setMenu(menu === 'labels' ? null : 'labels')}>
              <Icon name="label" />
            </button>
            <Popover open={menu === 'labels'} onClose={() => setMenu(null)} className="menu-pop" width={220}>
              <LabelsMenu ids={selection} onDone={() => setMenu(null)} />
            </Popover>
          </div>
          <div className="menu-anchor">
            <button className="icon-btn" aria-label="More" title="More" onClick={() => setMenu(menu === 'more' ? null : 'more')}>
              <Icon name="more" />
            </button>
            <Popover open={menu === 'more'} onClose={() => setMenu(null)} className="menu-pop">
              {(inTrash || inSpam) && (
                <button className="menu-item" onClick={() => { moveToInbox(selection); setMenu(null); }}>
                  <Icon name="inbox" size={16} /> Move to Inbox
                </button>
              )}
              {inSpam && (
                <button className="menu-item" onClick={() => { reportSpam(selection, false); setMenu(null); }}>
                  <Icon name="spam" size={16} /> Not spam
                </button>
              )}
              {inTrash && (
                <button className="menu-item danger" onClick={() => { deleteForever(selection); setMenu(null); }}>
                  <Icon name="trash" size={16} /> Delete forever
                </button>
              )}
              {!inTrash && !inSpam && (
                <button className="menu-item" onClick={() => { moveToTrash(selection); setMenu(null); }}>
                  <Icon name="trash" size={16} /> Move to Trash
                </button>
              )}
            </Popover>
          </div>
        </>
      )}

      <div className="toolbar-right">
        <span className="pager-text">
          {total === 0 ? viewTitle(view, labels) : `${start}–${end} of ${total}`}
        </span>
        <button className="icon-btn" aria-label="Newer" title="Newer" disabled={page === 0} onClick={() => setPage(page - 1)}>
          <Icon name="chevronLeft" />
        </button>
        <button className="icon-btn" aria-label="Older" title="Older" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
          <Icon name="chevronRight" />
        </button>
      </div>
    </div>
  );
}

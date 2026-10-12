import { useMemo, useState } from 'react';
import { Checkbox, Icon, IconButton } from './kit';
import { MenuItem, MenuSeparator, MenuTitle, Popover, useAnchor } from './Popover';
import { useMail } from '../lib/store';
import { clearSelection, confirmDialog, openDialog, useUI } from '../lib/ui';
import { CATEGORIES, FOLDER_META, isUnread } from '../lib/mail';
import type { ViewSpec } from '../lib/mail';
import { formatShortWhen, snoozePresets } from '../lib/dates';
import {
  applyLabels,
  archive,
  deleteForever,
  markRead,
  markSpam,
  moveTo,
  moveToInbox,
  muteThreads,
  notSpam,
  setImportant,
  setStarred,
  snooze,
  trash,
  unsnooze,
  type MoveDest,
} from '../lib/actions';
import type { Thread } from '../lib/types';

/* ------------------------------------------------------------------ */
/* Pickers                                                             */
/* ------------------------------------------------------------------ */

export function SnoozeMenu({ anchor, ids, onClose, onDone }: { anchor: HTMLElement | null; ids: string[]; onClose: () => void; onDone?: () => void }) {
  const { now } = useUI();
  const presets = snoozePresets(now);
  return (
    <Popover anchor={anchor} onClose={onClose} className="snooze-menu">
      <MenuTitle>Snooze until…</MenuTitle>
      {presets.map((p) => (
        <MenuItem
          key={p.id}
          label={p.label}
          hint={formatShortWhen(p.ts, now)}
          onClick={() => {
            snooze(ids, p.ts);
            clearSelection();
            onDone?.();
          }}
        />
      ))}
      <MenuSeparator />
      <MenuItem icon="calendar_month" label="Pick date & time" onClick={() => openDialog({ kind: 'snooze', ids })} />
    </Popover>
  );
}

export function LabelPicker({ anchor, ids, onClose, onDone }: { anchor: HTMLElement | null; ids: string[]; onClose: () => void; onDone?: () => void }) {
  const mail = useMail();
  const [q, setQ] = useState('');
  const initial = useMemo(() => {
    const out: Record<string, 'all' | 'some' | 'none'> = {};
    for (const l of mail.labels) {
      const n = ids.filter((id) => mail.threads[id]?.labelIds.includes(l.id)).length;
      out[l.id] = n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
    }
    return out;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [state, setState] = useState(initial);

  const toggle = (id: string) =>
    setState((cur) => ({ ...cur, [id]: cur[id] === 'all' ? 'none' : 'all' }));

  const apply = () => {
    const add: string[] = [];
    const remove: string[] = [];
    for (const [id, v] of Object.entries(state)) {
      if (v === initial[id]) continue;
      if (v === 'all') add.push(id);
      else if (v === 'none') remove.push(id);
    }
    applyLabels(ids, add, remove);
    onClose();
    onDone?.();
  };

  const labels = mail.labels.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()));
  const changed = Object.keys(state).some((id) => state[id] !== initial[id]);

  return (
    <Popover anchor={anchor} onClose={onClose} role="dialog" className="label-picker">
      <div className="picker-title">Label as:</div>
      <div className="picker-search">
        <input
          className="picker-input"
          placeholder="Search labels"
          aria-label="Search labels"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </div>
      <div className="picker-list" role="group" aria-label="Labels">
        {labels.map((l) => (
          <div key={l.id} className="picker-row" onClick={() => toggle(l.id)}>
            <Checkbox
              label={l.name}
              state={state[l.id] === 'all' ? 'checked' : state[l.id] === 'some' ? 'indeterminate' : 'unchecked'}
              onChange={() => toggle(l.id)}
            />
            <span className="label-dot" style={{ background: l.color }} aria-hidden="true" />
            <span className="picker-name">{l.name}</span>
          </div>
        ))}
        {!labels.length && <div className="picker-empty">No labels match “{q}”</div>}
      </div>
      <div className="picker-foot">
        <button
          type="button"
          className="menu-item"
          onClick={() => {
            onClose();
            openDialog({ kind: 'label', applyToIds: ids });
          }}
        >
          <Icon name="add" />
          <span>Create new</span>
        </button>
        <button type="button" className="menu-item" onClick={() => { onClose(); location.hash = '#/settings/labels'; }}>
          <Icon name="settings" />
          <span>Manage labels</span>
        </button>
      </div>
      <div className="picker-apply">
        <button type="button" className="btn primary" onClick={apply} disabled={!changed}>
          Apply
        </button>
      </div>
    </Popover>
  );
}

export function MovePicker({ anchor, ids, onClose, onDone }: { anchor: HTMLElement | null; ids: string[]; onClose: () => void; onDone?: () => void }) {
  const mail = useMail();
  const go = (dest: MoveDest) => {
    moveTo(ids, dest);
    clearSelection();
    onDone?.();
  };
  return (
    <Popover anchor={anchor} onClose={onClose} className="move-picker">
      <MenuTitle>Move to:</MenuTitle>
      <MenuItem icon={FOLDER_META.inbox.icon} label="Inbox" onClick={() => go('inbox')} />
      {CATEGORIES.filter((c) => c.id !== 'primary').map((c) => (
        <MenuItem key={c.id} icon={c.icon} label={c.label} onClick={() => go(`cat:${c.id}`)} />
      ))}
      <MenuItem icon={FOLDER_META.spam.icon} label="Spam" onClick={() => go('spam')} />
      <MenuItem icon={FOLDER_META.trash.icon} label="Trash" onClick={() => go('trash')} />
      {mail.labels.length > 0 && <MenuSeparator />}
      {mail.labels.map((l) => (
        <MenuItem key={l.id} label={l.name} onClick={() => go(`label:${l.id}`)}>
          <span className="menu-label-row">
            <span className="label-dot" style={{ background: l.color }} aria-hidden="true" />
            {l.name}
          </span>
        </MenuItem>
      ))}
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/* Triage toolbar                                                      */
/* ------------------------------------------------------------------ */

export interface TriageProps {
  ids: string[];
  view: ViewSpec | null;
  /** Called after an action that removes the conversation from the current view. */
  onRemoved?: () => void;
  small?: boolean;
  /** Buttons are grouped for mobile when limited. */
  compact?: boolean;
}

export function TriageButtons({ ids, view, onRemoved, small, compact }: TriageProps) {
  const mail = useMail();
  const snoozeA = useAnchor();
  const moveA = useAnchor();
  const labelA = useAnchor();
  const moreA = useAnchor();

  const threads = ids.map((id) => mail.threads[id]).filter(Boolean) as Thread[];
  const folder = view?.kind === 'folder' ? view.folder : undefined;
  const disabled = threads.length === 0;
  const allRead = threads.length > 0 && threads.every((t) => !isUnread(t));
  const allStarred = threads.length > 0 && threads.every((t) => t.starred);
  const allImportant = threads.length > 0 && threads.every((t) => t.important);
  const inTrash = folder === 'trash' || (threads.length > 0 && threads.every((t) => t.trashed));
  const inSpam = folder === 'spam' || (threads.length > 0 && threads.every((t) => t.spam && !t.trashed));
  const snoozed = folder === 'snoozed' || (threads.length > 0 && threads.every((t) => t.snoozedUntil));
  const noneInInbox = threads.length > 0 && threads.every((t) => !t.inbox);

  const done = () => {
    clearSelection();
    onRemoved?.();
  };
  const btn = { small } as const;
  const n = threads.length;

  const primary = (
    <>
      {inTrash ? (
        <>
          <IconButton {...btn} icon="move_to_inbox" label="Move to Inbox" disabled={disabled} onClick={() => { moveToInbox(ids); done(); }} />
          <IconButton
            {...btn}
            icon="delete_forever"
            label="Delete forever"
            disabled={disabled}
            onClick={() =>
              confirmDialog(
                { title: 'Delete forever?', body: `${n === 1 ? 'This conversation' : `${n} conversations`} will be permanently deleted. This can’t be undone.`, confirmLabel: 'Delete forever', danger: true },
                () => {
                  deleteForever(ids);
                  done();
                },
              )
            }
          />
        </>
      ) : inSpam ? (
        <>
          <IconButton {...btn} icon="report_off" label="Not spam" disabled={disabled} onClick={() => { notSpam(ids); done(); }} />
          <IconButton
            {...btn}
            icon="delete_forever"
            label="Delete forever"
            disabled={disabled}
            onClick={() =>
              confirmDialog(
                { title: 'Delete forever?', body: `${n === 1 ? 'This conversation' : `${n} conversations`} will be permanently deleted.`, confirmLabel: 'Delete forever', danger: true },
                () => {
                  deleteForever(ids);
                  done();
                },
              )
            }
          />
        </>
      ) : (
        <>
          {noneInInbox ? (
            <IconButton {...btn} icon="move_to_inbox" label="Move to Inbox" disabled={disabled} onClick={() => { moveToInbox(ids); done(); }} />
          ) : (
            <IconButton {...btn} icon="archive" label="Archive" disabled={disabled} onClick={() => { archive(ids); done(); }} />
          )}
          <IconButton {...btn} icon="report" label="Report spam" disabled={disabled} onClick={() => { markSpam(ids); done(); }} />
          <IconButton {...btn} icon="delete" label="Delete" disabled={disabled} onClick={() => { trash(ids); done(); }} />
        </>
      )}
    </>
  );

  return (
    <>
      {primary}
      {!compact && <span className="tb-sep" aria-hidden="true" />}
      <IconButton
        {...btn}
        icon={allRead ? 'mark_email_unread' : 'drafts'}
        label={allRead ? 'Mark as unread' : 'Mark as read'}
        disabled={disabled}
        onClick={() => {
          markRead(ids, !allRead);
          clearSelection();
        }}
      />
      {!compact && (
        <>
          <IconButton {...btn} icon="schedule" label="Snooze" disabled={disabled} onClick={snoozeA.toggle} active={snoozeA.open} />
          <IconButton {...btn} icon="drive_file_move" label="Move to" disabled={disabled} onClick={moveA.toggle} active={moveA.open} />
          <IconButton {...btn} icon="label" label="Labels" disabled={disabled} onClick={labelA.toggle} active={labelA.open} />
        </>
      )}
      <IconButton {...btn} icon="more_vert" label="More" disabled={disabled} onClick={moreA.toggle} active={moreA.open} />

      {snoozeA.open && <SnoozeMenu anchor={snoozeA.el} ids={ids} onClose={snoozeA.close} onDone={onRemoved} />}
      {moveA.open && <MovePicker anchor={moveA.el} ids={ids} onClose={moveA.close} onDone={onRemoved} />}
      {labelA.open && <LabelPicker anchor={labelA.el} ids={ids} onClose={labelA.close} />}
      {moreA.open && (
        <Popover anchor={moreA.el} onClose={moreA.close} align="end">
          {compact && (
            <>
              <MenuItem icon="schedule" label="Snooze" onClick={() => openDialog({ kind: 'snooze', ids })} />
              <MenuItem icon="drive_file_move" label="Move to" onClick={() => setTimeout(() => moveA.openAt(moreA.el!), 0)} />
              <MenuItem icon="label" label="Label as" onClick={() => setTimeout(() => labelA.openAt(moreA.el!), 0)} />
              <MenuSeparator />
            </>
          )}
          <MenuItem icon={allRead ? 'mark_email_unread' : 'drafts'} label={allRead ? 'Mark as unread' : 'Mark as read'} onClick={() => { markRead(ids, !allRead); clearSelection(); }} />
          <MenuItem
            icon="label_important"
            label={allImportant ? 'Mark as not important' : 'Mark as important'}
            onClick={() => setImportant(ids, !allImportant)}
          />
          <MenuItem icon="star" label={allStarred ? 'Remove star' : 'Add star'} onClick={() => setStarred(ids, !allStarred)} />
          {snoozed && <MenuItem icon="alarm_off" label="Unsnooze" onClick={() => { unsnooze(ids); done(); }} />}
          <MenuItem icon="notifications_off" label="Mute" onClick={() => { muteThreads(ids); done(); }} />
        </Popover>
      )}
    </>
  );
}

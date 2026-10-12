import { useMemo, useRef, useState } from 'react';
import { Check, Clock, FolderInput, Plus, Tag } from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { CATEGORIES } from '../lib/types';
import { snoozePresets, toLocalInputValue, HOUR } from '../lib/date';
import {
  applyLabel,
  moveToCategory,
  moveToInbox,
  snoozeThreads,
  spamThreads,
  trashThreads,
} from '../lib/actions';
import { navigate } from '../lib/router';
import { IconButton, MenuList, Popover } from './primitives';
import { readableOn } from '../lib/text';

export function SnoozeButton({ ids }: { ids: string[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState(() => toLocalInputValue(Date.now() + 24 * HOUR));
  const presets = open ? snoozePresets() : [];
  const close = () => {
    setOpen(false);
    setCustom(false);
  };
  return (
    <>
      <IconButton
        ref={ref}
        label="Snooze"
        onClick={() => {
          setValue(toLocalInputValue(Date.now() + 24 * HOUR));
          setOpen(!open);
        }}
        disabled={!ids.length}
      >
        <Clock size={20} />
      </IconButton>
      <Popover open={open} anchorRef={ref} onClose={close} className="popover--snooze">
        {!custom ? (
          <div className="menu">
            <div className="menu__header">Snooze until…</div>
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                className="menu__item"
                onClick={() => {
                  close();
                  snoozeThreads(p.at, ids);
                }}
              >
                <span className="menu__label">{p.label}</span>
                <span className="menu__hint">{p.detail}</span>
              </button>
            ))}
            <div className="menu__divider" />
            <button type="button" className="menu__item" onClick={() => setCustom(true)}>
              <span className="menu__label">Pick date &amp; time</span>
            </button>
          </div>
        ) : (
          <form
            className="snooze-custom"
            onSubmit={(e) => {
              e.preventDefault();
              const at = new Date(value).getTime();
              if (!Number.isFinite(at) || at <= Date.now()) {
                useUI.getState().toast('Pick a time in the future.');
                return;
              }
              close();
              snoozeThreads(at, ids);
            }}
          >
            <div className="menu__header">Pick date &amp; time</div>
            <input type="datetime-local" value={value} min={toLocalInputValue(Date.now())} onChange={(e) => setValue(e.target.value)} aria-label="Snooze until" />
            <div className="snooze-custom__actions">
              <button type="button" className="text-btn" onClick={() => setCustom(false)}>
                Back
              </button>
              <button type="submit" className="btn btn--primary">
                Save
              </button>
            </div>
          </form>
        )}
      </Popover>
    </>
  );
}

export function LabelButton({ ids }: { ids: string[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);

  const states = useMemo(() => {
    const out: Record<string, 'all' | 'some' | 'none'> = {};
    for (const l of labels) {
      const n = ids.filter((id) => threads[id]?.labelIds.includes(l.id)).length;
      out[l.id] = n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
    }
    return out;
  }, [labels, threads, ids]);

  const filtered = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
  const close = () => {
    setOpen(false);
    setQ('');
  };

  return (
    <>
      <IconButton ref={ref} label="Labels" onClick={() => setOpen(!open)} disabled={!ids.length}>
        <Tag size={20} />
      </IconButton>
      <Popover open={open} anchorRef={ref} onClose={close} className="popover--labels">
        <div className="label-menu">
          <div className="menu__header">Label as:</div>
          <input className="label-menu__search" placeholder="Search labels" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Search labels" />
          <div className="label-menu__list">
            {filtered.map((l) => {
              const st = states[l.id];
              return (
                <button key={l.id} type="button" className="label-menu__item" onClick={() => applyLabel(l.id, st !== 'all', ids)}>
                  <span className={`checkbox__box ${st !== 'none' ? 'is-on' : ''}`}>
                    {st === 'all' ? <Check size={14} strokeWidth={3.2} /> : st === 'some' ? <span className="checkbox__dash" /> : null}
                  </span>
                  <span className="label-menu__dot" style={{ background: l.color, color: readableOn(l.color) }} />
                  <span>{l.name}</span>
                </button>
              );
            })}
            {!filtered.length ? <div className="label-menu__empty">No labels match</div> : null}
          </div>
          <div className="menu__divider" />
          <button
            type="button"
            className="menu__item"
            onClick={() => {
              close();
              useUI.getState().set({ labelDialog: { applyTo: ids } });
            }}
          >
            <span className="menu__check">
              <Plus size={16} />
            </span>
            <span className="menu__label">Create new{q ? ` “${q}”` : ''}</span>
          </button>
          <button
            type="button"
            className="menu__item"
            onClick={() => {
              close();
              navigate({ view: 'settings', param: 'labels' });
            }}
          >
            <span className="menu__check" />
            <span className="menu__label">Manage labels</span>
          </button>
        </div>
      </Popover>
    </>
  );
}

export function MoveButton({ ids }: { ids: string[] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const labels = useMail((s) => s.labels);
  const close = () => setOpen(false);
  return (
    <>
      <IconButton ref={ref} label="Move to" onClick={() => setOpen(!open)} disabled={!ids.length}>
        <FolderInput size={20} />
      </IconButton>
      <Popover open={open} anchorRef={ref} onClose={close}>
        <MenuList
          onClose={close}
          items={[
            { label: 'Move to:', header: true },
            { label: 'Inbox', onClick: () => moveToInbox(ids) },
            ...CATEGORIES.map((c) => ({
              label: `Inbox · ${c[0].toUpperCase() + c.slice(1)} tab`,
              onClick: () => {
                moveToInbox(ids);
                moveToCategory(c, ids);
              },
            })),
            { label: 'Spam', onClick: () => spamThreads(ids) },
            { label: 'Trash', onClick: () => trashThreads(ids) },
            { divider: true, label: '' },
            ...labels.map((l) => ({
              label: l.name,
              onClick: () => {
                const undoLabel = useMail.getState().applyLabel(ids, l.id, true);
                const undoArchive = useMail.getState().archive(ids);
                useUI.getState().clearSelection();
                useUI.getState().toast(`Moved to “${l.name}”.`, [
                  {
                    label: 'Undo',
                    run: () => {
                      undoArchive();
                      undoLabel();
                    },
                  },
                ]);
              },
            })),
          ]}
        />
      </Popover>
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  MdOutlineCalendarToday, MdOutlineDelete, MdOutlineInbox, MdOutlineInfo, MdOutlineLabel, MdOutlineLocalOffer,
  MdOutlineReport, MdPeopleOutline,
} from 'react-icons/md';
import type { Category } from '../data/types';
import { moveTo, setLabel, snooze, snoozePresets, type Preset } from '../lib/actions';
import { TIME } from '../lib/format';
import { navigate } from '../lib/router';
import { useMail } from '../store/mail';
import { useUI } from '../store/ui';
import { Dialog, Menu, MenuDivider, MenuItem, useAnchor } from './primitives';

interface AnchoredProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  ids: string[];
}

function presetTime(p: Preset) {
  const d = new Date(p.at);
  const today = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return time;
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${time}`;
}

export function LabelMenu({ anchor, open, onClose, ids }: AnchoredProps) {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const list = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
  const state = (id: string) => {
    const n = ids.filter((t) => threads[t]?.labels.includes(id)).length;
    return n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
  };
  return (
    <Menu anchor={anchor} open={open} onClose={onClose} className="menu-labels" label="Label as">
      <div className="menu-header">Label as:</div>
      <div className="menu-search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search labels" aria-label="Search labels" autoFocus />
      </div>
      <div className="menu-scroll">
        {list.map((l) => {
          const s = state(l.id);
          return (
            <MenuItem key={l.id} checked={s === 'all'} onSelect={() => setLabel(ids, l.id, s !== 'all')} trailing={<span className="menu-dot" style={{ background: l.color }} />}>
              {l.name}
              {s === 'some' && <span className="menu-hint"> (some)</span>}
            </MenuItem>
          );
        })}
        {!list.length && <div className="menu-empty">No labels match “{q}”</div>}
      </div>
      <MenuDivider />
      <MenuItem
        onSelect={() => {
          onClose();
          useUI.getState().set({ labelDialog: { mode: 'create', applyTo: ids, name: q } });
        }}
      >
        {q ? `“${q}” (create new)` : 'Create new'}
      </MenuItem>
      <MenuItem onSelect={() => { onClose(); navigate({ view: 'settings', tab: 'labels' }); }}>Manage labels</MenuItem>
    </Menu>
  );
}

const CATEGORY_TARGETS: { id: Category; label: string; icon: typeof MdPeopleOutline }[] = [
  { id: 'primary', label: 'Primary', icon: MdOutlineInbox },
  { id: 'social', label: 'Social', icon: MdPeopleOutline },
  { id: 'updates', label: 'Updates', icon: MdOutlineInfo },
  { id: 'promotions', label: 'Promotions', icon: MdOutlineLocalOffer },
];

export function MoveMenu({ anchor, open, onClose, ids, exclude }: AnchoredProps & { exclude?: string }) {
  const labels = useMail((s) => s.labels);
  const categories = useMail((s) => s.settings.categories);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (open) setQ('');
  }, [open]);
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  return (
    <Menu anchor={anchor} open={open} onClose={onClose} className="menu-labels" label="Move to">
      <div className="menu-header">Move to:</div>
      <div className="menu-search">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search folders and labels" autoFocus />
      </div>
      <div className="menu-scroll">
        {exclude !== 'inbox' && match('Inbox') && <MenuItem icon={MdOutlineInbox} onSelect={() => { onClose(); moveTo(ids, 'inbox'); }}>Inbox</MenuItem>}
        {categories &&
          CATEGORY_TARGETS.filter((c) => match(c.label)).map((c) => (
            <MenuItem
              key={c.id}
              icon={c.icon}
              onSelect={() => {
                onClose();
                useMail.getState().setCategory(ids, c.id);
                useUI.getState().showToast(`${ids.length === 1 ? 'Conversation' : `${ids.length} conversations`} moved to ${c.label}.`);
                useUI.getState().clearSelection();
              }}
            >
              {c.label}
            </MenuItem>
          ))}
        {labels.filter((l) => match(l.name)).map((l) => (
          <MenuItem key={l.id} icon={MdOutlineLabel} onSelect={() => { onClose(); moveTo(ids, { labelId: l.id }); }}>
            {l.name}
          </MenuItem>
        ))}
        {exclude !== 'spam' && match('Spam') && <MenuItem icon={MdOutlineReport} onSelect={() => { onClose(); moveTo(ids, 'spam'); }}>Spam</MenuItem>}
        {exclude !== 'trash' && match('Trash') && <MenuItem icon={MdOutlineDelete} onSelect={() => { onClose(); moveTo(ids, 'trash'); }}>Trash</MenuItem>}
      </div>
      <MenuDivider />
      <MenuItem onSelect={() => { onClose(); useUI.getState().set({ labelDialog: { mode: 'create', applyTo: ids, move: true } }); }}>Create new</MenuItem>
      <MenuItem onSelect={() => { onClose(); navigate({ view: 'settings', tab: 'labels' }); }}>Manage labels</MenuItem>
    </Menu>
  );
}

export function SnoozeTrigger({ ids, icon: Icon, className = 'icon-btn icon-btn-md' }: { ids: string[]; icon: IconType; className?: string }) {
  const m = useAnchor<HTMLButtonElement>();
  return (
    <>
      <button type="button" className={`${className} ${m.open ? 'is-active' : ''}`} aria-label="Snooze" data-tip="Snooze" onClick={(e) => { e.stopPropagation(); m.toggle(e); }}>
        <Icon aria-hidden />
      </button>
      <SnoozeMenu anchor={m.anchor} open={m.open} onClose={m.close} ids={ids} />
    </>
  );
}

export function SnoozeMenu({ anchor, open, onClose, ids }: AnchoredProps) {
  const [picker, setPicker] = useState(false);
  const presets = useMemo(() => snoozePresets(), [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <Menu anchor={anchor} open={open} onClose={onClose} className="menu-snooze" label="Snooze until">
        <div className="menu-header">Snooze until…</div>
        {presets.map((p) => (
          <MenuItem key={p.id} onSelect={() => { onClose(); snooze(ids, p.at); }} hint={presetTime(p)}>
            {p.label}
          </MenuItem>
        ))}
        <MenuDivider />
        <MenuItem icon={MdOutlineCalendarToday} onSelect={() => { onClose(); setPicker(true); }}>Pick date & time</MenuItem>
      </Menu>
      <DateTimeDialog
        open={picker}
        title="Pick date & time"
        confirmLabel="Save"
        onClose={() => setPicker(false)}
        onConfirm={(at) => {
          setPicker(false);
          snooze(ids, at);
        }}
      />
    </>
  );
}

function toLocalInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
}

export function DateTimeDialog({
  open, title, confirmLabel, onClose, onConfirm,
}: { open: boolean; title: string; confirmLabel: string; onClose: () => void; onConfirm: (at: number) => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  useEffect(() => {
    if (!open) return;
    const init = toLocalInput(Date.now() + TIME.DAY);
    setDate(init.date);
    setTime('08:00');
  }, [open]);
  const at = date && time ? new Date(`${date}T${time}`).getTime() : NaN;
  const valid = Number.isFinite(at) && at > Date.now();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => onConfirm(at)}>{confirmLabel}</button>
        </>
      }
    >
      <div className="dt-fields">
        <label>
          <span>Date</span>
          <input type="date" value={date} min={toLocalInput(Date.now()).date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          <span>Time</span>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
      </div>
      {!valid && date && time && <p className="field-error">Choose a time in the future.</p>}
      {valid && <p className="dt-preview">{new Date(at).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>}
    </Dialog>
  );
}

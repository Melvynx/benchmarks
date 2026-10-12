import { useEffect, useMemo, useState } from 'react';
import {
  MdAdd,
  MdCheckBox,
  MdCheckBoxOutlineBlank,
  MdDateRange,
  MdIndeterminateCheckBox,
  MdInbox,
  MdInfoOutline,
  MdLabelOutline,
  MdLocalOffer,
  MdNextWeek,
  MdOutlineDelete,
  MdOutlinePeopleAlt,
  MdOutlineReport,
  MdToday,
  MdWbSunny,
  MdWeekend,
  MdNightsStay,
} from 'react-icons/md';
import type { IconType } from 'react-icons';
import type { Category } from '../types';
import { actions } from '../lib/actions';
import { snoozePresets, toLocalInput, DAY, atTime } from '../lib/date';
import { currentRoute } from '../lib/router';
import { cn } from '../lib/utils';
import { LABEL_COLORS } from '../lib/visuals';
import { useMail } from '../store/mail';
import { ui } from '../store/ui';
import { Button, MenuDivider, MenuHeading, MenuItem, Modal } from './ui';

export function LabelMenu({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const initial = useMemo(() => {
    const out: Record<string, 'all' | 'some' | 'none'> = {};
    for (const l of labels) {
      const n = ids.filter((id) => threads[id]?.labelIds.includes(l.id)).length;
      out[l.id] = n === 0 ? 'none' : n === ids.length ? 'all' : 'some';
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [state, setState] = useState(initial);
  const [q, setQ] = useState('');
  const filtered = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
  const dirty = labels.some((l) => state[l.id] !== initial[l.id]);
  const exact = labels.some((l) => l.name.toLowerCase() === q.trim().toLowerCase());

  const apply = () => {
    const add = labels.filter((l) => state[l.id] === 'all' && initial[l.id] !== 'all').map((l) => l.id);
    const remove = labels.filter((l) => state[l.id] === 'none' && initial[l.id] !== 'none').map((l) => l.id);
    if (add.length || remove.length) actions.applyLabels(ids, add, remove);
    onClose();
  };

  return (
    <div className="w-64" onKeyDown={(e) => e.key === 'Enter' && dirty && apply()}>
      <MenuHeading>Label as:</MenuHeading>
      <div className="px-3 pb-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search labels"
          className="h-8 w-full rounded border border-line-strong bg-transparent px-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((l) => {
          const s = state[l.id];
          const Icon = s === 'all' ? MdCheckBox : s === 'some' ? MdIndeterminateCheckBox : MdCheckBoxOutlineBlank;
          return (
            <button
              key={l.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={s === 'all' ? true : s === 'some' ? 'mixed' : false}
              className="flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-hover"
              onClick={() => setState((x) => ({ ...x, [l.id]: s === 'all' ? 'none' : 'all' }))}
            >
              <Icon size={20} className={s === 'none' ? 'text-fg3' : 'text-fg'} />
              <span className="size-2.5 rounded-full" style={{ background: LABEL_COLORS[l.color].dot }} />
              <span className="truncate">{l.name}</span>
            </button>
          );
        })}
        {!filtered.length && !q && <div className="px-4 py-2 text-fg3">No labels yet</div>}
      </div>
      <MenuDivider />
      {dirty ? (
        <MenuItem label={<span className="font-medium text-accent-text">Apply</span>} onClick={apply} />
      ) : (
        <>
          <MenuItem
            icon={MdAdd}
            label={q.trim() && !exact ? `"${q.trim()}" (create new)` : 'Create new'}
            onClick={() => {
              onClose();
              if (q.trim() && !exact) {
                const l = useMail.getState().createLabel(q.trim(), 'gray');
                actions.applyLabels(ids, [l.id], []);
              } else {
                ui.set({ labelDialog: { applyTo: ids } });
              }
            }}
          />
          <MenuItem
            icon={MdLabelOutline}
            label="Manage labels"
            onClick={() => {
              onClose();
              window.location.hash = '#settings/labels';
            }}
          />
        </>
      )}
    </div>
  );
}

const CATS: Array<[Exclude<Category, 'primary'> | 'primary', string, IconType]> = [
  ['primary', 'Primary', MdInbox],
  ['social', 'Social', MdOutlinePeopleAlt],
  ['updates', 'Updates', MdInfoOutline],
  ['promotions', 'Promotions', MdLocalOffer],
];

export function MoveMenu({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const labels = useMail((s) => s.labels);
  const [q, setQ] = useState('');
  const route = currentRoute();
  const match = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  const go = (fn: () => void) => {
    onClose();
    fn();
  };
  const inInbox = route.view === 'folder' && route.folder === 'inbox';
  return (
    <div className="w-64">
      <MenuHeading>Move to:</MenuHeading>
      <div className="px-3 pb-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search"
          className="h-8 w-full rounded border border-line-strong bg-transparent px-2 text-sm outline-none focus:border-accent"
        />
      </div>
      <div className="max-h-72 overflow-y-auto">
        {!inInbox && match('Inbox') && <MenuItem icon={MdInbox} label="Inbox" onClick={() => go(() => actions.moveTo(ids, { kind: 'inbox' }))} />}
        {CATS.filter(([, n]) => match(n)).map(([id, name, Icon]) => (
          <MenuItem key={id} icon={Icon} label={name} onClick={() => go(() => actions.moveTo(ids, { kind: 'category', id }))} />
        ))}
        {labels.filter((l) => match(l.name)).length > 0 && <MenuDivider />}
        {labels
          .filter((l) => match(l.name))
          .map((l) => (
            <MenuItem
              key={l.id}
              label={
                <span className="flex items-center gap-3">
                  <span className="size-2.5 rounded-full" style={{ background: LABEL_COLORS[l.color].dot }} />
                  {l.name}
                </span>
              }
              onClick={() => go(() => actions.moveTo(ids, { kind: 'label', id: l.id }))}
            />
          ))}
        <MenuDivider />
        {match('Spam') && <MenuItem icon={MdOutlineReport} label="Spam" onClick={() => go(() => actions.spam(ids))} />}
        {match('Trash') && <MenuItem icon={MdOutlineDelete} label="Trash" onClick={() => go(() => actions.trash(ids))} />}
      </div>
    </div>
  );
}

const SNOOZE_ICONS: Record<string, IconType> = { later: MdNightsStay, tomorrow: MdWbSunny, week: MdToday, weekend: MdWeekend, nextweek: MdNextWeek };

export function SnoozeMenu({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const presets = snoozePresets();
  return (
    <div className="w-72">
      <MenuHeading>Snooze until…</MenuHeading>
      {presets.map((p) => (
        <MenuItem
          key={p.id}
          icon={SNOOZE_ICONS[p.id]}
          label={p.label}
          hint={p.detail}
          onClick={() => {
            onClose();
            actions.snooze(ids, p.at);
          }}
        />
      ))}
      <MenuDivider />
      <MenuItem
        icon={MdDateRange}
        label="Pick date & time"
        onClick={() => {
          onClose();
          openDateTime({ title: 'Pick date & time', confirmLabel: 'Save', onPick: (ts) => actions.snooze(ids, ts) });
        }}
      />
    </div>
  );
}

type DateTimeRequest = { title: string; confirmLabel: string; onPick: (ts: number) => void };
let dtListener: ((r: DateTimeRequest | null) => void) | null = null;

export function openDateTime(r: DateTimeRequest) {
  dtListener?.(r);
}

export function DateTimeDialogHost() {
  const [req, setReq] = useState<DateTimeRequest | null>(null);
  const [value, setValue] = useState('');
  useEffect(() => {
    dtListener = (r) => {
      setReq(r);
      if (r) setValue(toLocalInput(atTime(Date.now() + DAY, 8)));
    };
    return () => {
      dtListener = null;
    };
  }, []);
  const ts = value ? new Date(value).getTime() : NaN;
  const valid = !Number.isNaN(ts) && ts > Date.now();
  return (
    <Modal open={!!req} onClose={() => setReq(null)} label={req?.title ?? 'Pick date'} className="max-w-sm p-6">
      <h2 className="text-lg text-fg">{req?.title}</h2>
      <label className="mt-5 block text-xs font-medium text-fg3" htmlFor="dt-input">
        Date &amp; time
      </label>
      <input
        id="dt-input"
        type="datetime-local"
        value={value}
        min={toLocalInput(Date.now())}
        onChange={(e) => setValue(e.target.value)}
        className={cn('mt-1 h-11 w-full rounded-md border bg-transparent px-3 text-sm text-fg outline-none focus:border-accent', valid ? 'border-line-strong' : 'border-danger')}
      />
      {!valid && value && <p className="mt-1 text-xs text-danger">Choose a time in the future.</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="text" onClick={() => setReq(null)}>
          Cancel
        </Button>
        <Button
          disabled={!valid}
          onClick={() => {
            req?.onPick(ts);
            setReq(null);
          }}
        >
          {req?.confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

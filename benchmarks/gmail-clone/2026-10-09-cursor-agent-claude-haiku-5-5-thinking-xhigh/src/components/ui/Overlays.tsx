import { useMemo, useState, type FormEvent } from 'react';
import { Clock, Tag, X } from 'lucide-react';
import { LABEL_COLORS, type LabelColor } from '../../domain/types';
import { cn } from '../../lib/cn';
import { formatSendAt, fromLocalInput, snoozePresets, toLocalInput } from '../../lib/time';
import * as commands from '../../store/commands';
import { createLabel } from '../../store/actions';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { LABEL_DOT } from '../labelStyles';
import { Button } from './Button';
import { MenuItem } from './primitives';

/* Toasts ---------------------------------------------------------------- */

export function Toaster() {
  const toasts = useUI((s) => s.toasts);
  const dismiss = useUI((s) => s.dismissToast);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-4 z-[80] flex flex-col items-start gap-2 sm:inset-x-auto sm:left-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="animate-toast pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg bg-[#303030] py-2.5 pl-4 pr-2 text-sm text-[#f5f5f5] shadow-xl sm:w-auto sm:min-w-[300px]"
        >
          <span className="flex-1">{t.message}</span>
          {t.actionLabel && (
            <button
              type="button"
              className="rounded px-2 py-1 font-medium text-[#a8c7fa] hover:bg-white/10"
              onClick={() => {
                t.onAction?.();
                dismiss(t.id);
              }}
            >
              {t.actionLabel}
            </button>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10"
            onClick={() => dismiss(t.id)}
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* Floating menus (snooze + labels) -------------------------------------- */

export function FloatingMenus() {
  const menu = useUI((s) => s.menu);
  const close = useUI((s) => s.closeMenu);
  if (!menu) return null;
  const left = Math.max(8, Math.min(menu.x, window.innerWidth - 308));
  const top = Math.max(8, Math.min(menu.y + 6, window.innerHeight - 440));
  return (
    <>
      <div className="fixed inset-0 z-[55]" onMouseDown={close} aria-hidden />
      <div
        role="menu"
        className="fixed z-[60] w-[300px] rounded-xl border border-line bg-surface p-1.5 text-ink shadow-2xl max-sm:inset-x-2 max-sm:bottom-2 max-sm:top-auto max-sm:w-auto"
        style={window.innerWidth >= 640 ? { left, top } : undefined}
      >
        {menu.kind === 'snooze' ? <SnoozePanel ids={menu.ids} onDone={close} /> : <LabelPanel ids={menu.ids} onDone={close} />}
      </div>
    </>
  );
}

function SnoozePanel({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const now = Date.now();
  const presets = snoozePresets(now);
  const [custom, setCustom] = useState(() => toLocalInput(now + 3 * 3_600_000));
  const anySnoozed = useMail((s) => s.data.threads.some((t) => ids.includes(t.id) && t.snoozedUntil !== null));

  const apply = (at: number) => {
    commands.snoozeThreads(ids, at, formatSendAt(at, Date.now()));
    onDone();
  };

  const submitCustom = (e: FormEvent) => {
    e.preventDefault();
    const at = fromLocalInput(custom);
    if (Number.isFinite(at) && at > Date.now()) apply(at);
  };

  return (
    <div>
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-3">Snooze until</p>
      {presets.map((p) => (
        <MenuItem key={p.key} icon={<Clock />} onSelect={() => apply(p.at)}>
          <span className="flex items-center justify-between gap-3">
            <span>{p.label}</span>
            <span className="text-xs text-ink-3">{formatSendAt(p.at, now)}</span>
          </span>
        </MenuItem>
      ))}
      <form onSubmit={submitCustom} className="mt-1 border-t border-line px-2 pb-1 pt-2">
        <label className="mb-1.5 block text-xs text-ink-3" htmlFor="snooze-custom">
          Pick date and time
        </label>
        <div className="flex items-center gap-2">
          <input
            id="snooze-custom"
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" size="sm">
            Snooze
          </Button>
        </div>
      </form>
      {anySnoozed && (
        <div className="border-t border-line pt-1">
          <MenuItem
            onSelect={() => {
              commands.unsnoozeThreads(ids);
              onDone();
            }}
          >
            Remove snooze
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function LabelPanel({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const labels = useMail((s) => s.data.labels);
  const allThreads = useMail((s) => s.data.threads);
  const threads = useMemo(() => allThreads.filter((t) => ids.includes(t.id)), [allThreads, ids]);
  const [name, setName] = useState('');

  const stateOf = (labelId: string): 'all' | 'some' | 'none' => {
    const count = threads.filter((t) => t.labelIds.includes(labelId)).length;
    if (count === 0) return 'none';
    return count === threads.length ? 'all' : 'some';
  };

  const submitNew = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const color: LabelColor = LABEL_COLORS[labels.length % LABEL_COLORS.length];
    const id = createLabel(trimmed, color);
    commands.applyLabel(ids, id, true);
    setName('');
    onDone();
  };

  return (
    <div>
      <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-ink-3">Label as</p>
      <div className="max-h-64 overflow-y-auto">
        {labels.map((label) => {
          const state = stateOf(label.id);
          return (
            <label
              key={label.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-hover"
            >
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={state === 'all'}
                onChange={() => commands.applyLabel(ids, label.id, state !== 'all')}
              />
              <span className={cn('size-2.5 rounded-full', LABEL_DOT[label.color])} />
              <span className="flex-1 truncate">{label.name}</span>
              {state === 'some' && <span className="text-xs text-ink-3">Some</span>}
            </label>
          );
        })}
        {labels.length === 0 && <p className="px-3 py-2 text-sm text-ink-3">No labels yet.</p>}
      </div>
      <form onSubmit={submitNew} className="mt-1 flex items-center gap-2 border-t border-line px-2 pb-1 pt-2">
        <Tag className="size-4 shrink-0 text-ink-3" />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Create new label"
          aria-label="Create new label"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-ink-3"
        />
        <Button type="submit" size="sm" variant="ghost" disabled={!name.trim()}>
          Create
        </Button>
      </form>
    </div>
  );
}

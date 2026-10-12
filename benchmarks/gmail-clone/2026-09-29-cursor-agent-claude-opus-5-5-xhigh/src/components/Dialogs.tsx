import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MdCheck, MdChevronLeft, MdChevronRight, MdClose, MdDownload, MdOutlineOpenInNew } from 'react-icons/md';
import type { LabelColor } from '../types';
import { actions } from '../lib/actions';
import { cn, formatSize } from '../lib/utils';
import { downloadAttachment, fileKind, LABEL_COLOR_KEYS, LABEL_COLORS, previewSrc } from '../lib/visuals';
import { navigate } from '../lib/router';
import { useMail } from '../store/mail';
import { useSettings, type Density, type ReadingPane, type Theme } from '../store/settings';
import { hideToast, showToast, ui, useUI } from '../store/ui';
import type { InboxType } from '../lib/mailbox';
import { Button, IconButton, Modal, Radio } from './ui';

export function ConfirmDialog() {
  const c = useUI((s) => s.confirm);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (c) setTimeout(() => okRef.current?.focus(), 30);
  }, [c]);
  const close = () => ui.set({ confirm: null });
  return (
    <Modal open={!!c} onClose={close} label={c?.title ?? 'Confirm'} className="max-w-md">
      {c && (
        <div className="p-6">
          {c.title && <h2 className="mb-3 text-xl text-fg">{c.title}</h2>}
          <p className="text-sm leading-relaxed text-fg2">{c.message}</p>
          <div className="mt-6 flex justify-end gap-2">
            {!c.alertOnly && (
              <Button variant="text" onClick={close}>
                {c.cancelLabel ?? 'Cancel'}
              </Button>
            )}
            <Button
              ref={okRef}
              variant={c.danger ? 'danger' : 'filled'}
              onClick={() => {
                close();
                c.onConfirm();
              }}
            >
              {c.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function LabelDialog() {
  const d = useUI((s) => s.labelDialog);
  const labels = useMail((s) => s.labels);
  const existing = d?.labelId ? labels.find((l) => l.id === d.labelId) : undefined;
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>('blue');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!d) return;
    setName(existing?.name ?? '');
    setColor(existing?.color ?? LABEL_COLOR_KEYS[labels.length % LABEL_COLOR_KEYS.length]);
    setTimeout(() => inputRef.current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);
  const close = () => ui.set({ labelDialog: null });
  const trimmed = name.trim();
  const duplicate = labels.some((l) => l.id !== existing?.id && l.name.toLowerCase() === trimmed.toLowerCase());
  const save = () => {
    if (!trimmed || duplicate) return;
    if (existing) {
      useMail.getState().updateLabel(existing.id, { name: trimmed, color });
      showToast(`Label "${trimmed}" updated.`);
    } else {
      const l = useMail.getState().createLabel(trimmed, color);
      if (d?.applyTo?.length) actions.applyLabels(d.applyTo, [l.id], []);
      else showToast(`Label "${trimmed}" created.`);
    }
    close();
  };
  return (
    <Modal open={!!d} onClose={close} label={existing ? 'Edit label' : 'New label'} className="max-w-md">
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h2 className="mb-5 text-xl text-fg">{existing ? 'Edit label' : 'New label'}</h2>
        <label className="block text-xs font-medium text-fg2" htmlFor="label-name">
          Please enter a new label name:
        </label>
        <input
          id="label-name"
          ref={inputRef}
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 h-11 w-full rounded-lg border border-line-strong bg-transparent px-3 text-sm text-fg outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          placeholder="e.g. Clients"
        />
        {duplicate && <p className="mt-1.5 text-xs text-danger">A label with that name already exists.</p>}
        <div className="mt-5 text-xs font-medium text-fg2">Color</div>
        <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Label color">
          {LABEL_COLOR_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={color === k}
              aria-label={k}
              onClick={() => setColor(k)}
              className={cn('flex size-8 items-center justify-center rounded-full ring-offset-2 ring-offset-raised transition-shadow', color === k && 'ring-2 ring-fg')}
              style={{ background: LABEL_COLORS[k].dot }}
            >
              {color === k && <MdCheck size={16} className="text-white" />}
            </button>
          ))}
        </div>
        {d?.applyTo?.length ? <p className="mt-4 text-xs text-fg3">The new label will be applied to {d.applyTo.length === 1 ? 'the selected conversation' : `${d.applyTo.length} selected conversations`}.</p> : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!trimmed || duplicate}>
            {existing ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const SHORTCUT_GROUPS: Array<[string, Array<[string, string]>]> = [
  [
    'Navigation',
    [
      ['j / k', 'Older / newer conversation'],
      ['o or Enter', 'Open conversation'],
      ['u', 'Back to list'],
      ['[ / ]', 'Archive, then go newer / older'],
      ['g then i', 'Go to Inbox'],
      ['g then s', 'Go to Starred'],
      ['g then t', 'Go to Sent'],
      ['g then d', 'Go to Drafts'],
      ['g then a', 'Go to All Mail'],
      ['g then b', 'Go to Snoozed'],
      ['/', 'Search mail'],
      ['?', 'Show keyboard shortcuts'],
    ],
  ],
  [
    'Actions',
    [
      ['c', 'Compose'],
      ['r', 'Reply'],
      ['a', 'Reply all'],
      ['f', 'Forward'],
      ['e', 'Archive'],
      ['#', 'Delete'],
      ['!', 'Report spam'],
      ['s', 'Star / unstar'],
      ['+ / -', 'Mark important / not important'],
      ['Shift + i', 'Mark as read'],
      ['Shift + u', 'Mark as unread'],
      ['b', 'Snooze'],
      ['l', 'Label as'],
      ['v', 'Move to'],
      ['m', 'Mute'],
      ['z', 'Undo last action'],
    ],
  ],
  [
    'Selection',
    [
      ['x', 'Select conversation'],
      ['* then a', 'Select all'],
      ['* then n', 'Deselect all'],
      ['* then r', 'Select read'],
      ['* then u', 'Select unread'],
      ['* then s', 'Select starred'],
    ],
  ],
  [
    'Compose',
    [
      ['⌘/Ctrl + Enter', 'Send'],
      ['⌘/Ctrl + B / I / U', 'Bold / italic / underline'],
      ['⌘/Ctrl + K', 'Insert link'],
      ['Esc', 'Close menus and dialogs'],
    ],
  ],
];

export function ShortcutsDialog() {
  const open = useUI((s) => s.shortcutsOpen);
  const enabled = useSettings((s) => s.shortcuts);
  const close = () => ui.set({ shortcutsOpen: false });
  return (
    <Modal open={open} onClose={close} label="Keyboard shortcuts" className="max-w-4xl">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <h2 className="flex-1 text-xl text-fg">Keyboard shortcuts</h2>
        {!enabled && (
          <Button variant="tonal" onClick={() => useSettings.getState().update({ shortcuts: true })}>
            Turn on shortcuts
          </Button>
        )}
        <IconButton icon={MdClose} label="Close" onClick={close} />
      </div>
      <div className="grid gap-x-10 gap-y-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUT_GROUPS.map(([title, rows]) => (
          <section key={title}>
            <h3 className="mb-2 text-sm font-medium text-fg">{title}</h3>
            <dl className="space-y-1.5">
              {rows.map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-3 text-sm">
                  <dt className="w-32 shrink-0">
                    {k.split(' ').map((part, i) =>
                      ['then', 'or', '/', '+'].includes(part) ? (
                        <span key={i} className="mx-1 text-xs text-fg3">
                          {part}
                        </span>
                      ) : (
                        <kbd key={i} className="inline-block min-w-6 rounded border border-line-strong bg-chip px-1.5 py-0.5 text-center font-mono text-xs text-fg">
                          {part}
                        </kbd>
                      ),
                    )}
                  </dt>
                  <dd className="text-fg2">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

export function Toasts() {
  const toast = useUI((s) => s.toast);
  const undoSeconds = useSettings((s) => s.undoSeconds);
  useEffect(() => {
    if (!toast) return;
    const ms = toast.duration ?? (toast.undo ? Math.max(6000, undoSeconds * 1000) : 5000);
    const id = setTimeout(() => {
      if (ui.get().toast?.id === toast.id) hideToast();
    }, ms);
    return () => clearTimeout(id);
  }, [toast, undoSeconds]);
  if (!toast) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center p-3 md:justify-start md:p-6" aria-live="polite">
      <div
        key={toast.id}
        role="status"
        data-testid="toast"
        className="pointer-events-auto flex min-h-12 w-full max-w-xl animate-slide-up items-center gap-2 rounded-lg bg-toast py-1.5 pr-1.5 pl-4 text-sm text-toast-fg shadow-e3 md:w-auto md:min-w-[344px]"
      >
        <span className="flex-1 py-2">{toast.message}</span>
        {toast.undo && (
          <button
            type="button"
            className="h-9 shrink-0 rounded px-3 font-medium text-toast-action hover:bg-white/10"
            onClick={() => {
              const u = toast.undo!;
              hideToast();
              u();
              showToast('Action undone.');
            }}
          >
            Undo
          </button>
        )}
        {toast.action && (
          <button
            type="button"
            className="h-9 shrink-0 rounded px-3 font-medium text-toast-action hover:bg-white/10"
            onClick={() => {
              hideToast();
              toast.action!.run();
            }}
          >
            {toast.action.label}
          </button>
        )}
        <button type="button" aria-label="Dismiss" className="flex size-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10" onClick={hideToast}>
          <MdClose size={18} />
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function AttachmentPreview() {
  const p = useUI((s) => s.preview);
  const close = () => ui.set({ preview: null });
  const go = (d: number) => {
    const cur = ui.get().preview;
    if (!cur) return;
    const n = cur.attachments.length;
    ui.set({ preview: { ...cur, index: (cur.index + d + n) % n } });
  };
  useEffect(() => {
    if (!p) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      } else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [p]);
  if (!p) return null;
  const att = p.attachments[p.index];
  const k = fileKind(att.name, att.type);
  const src = previewSrc(att);
  const many = p.attachments.length > 1;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Preview of ${att.name}`} className="fixed inset-0 z-[75] flex animate-fade flex-col bg-black/85 text-white" data-testid="attachment-preview">
      <div className="flex h-16 shrink-0 items-center gap-3 px-3 md:px-5">
        <button type="button" onClick={close} aria-label="Close preview" className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <MdClose size={22} />
        </button>
        <k.icon size={22} style={{ color: k.color }} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{att.name}</div>
          <div className="text-xs text-white/60">
            {k.label} · {formatSize(att.size)}
            {many && ` · ${p.index + 1} of ${p.attachments.length}`}
          </div>
        </div>
        {src && (
          <button type="button" aria-label="Open in new tab" data-tip="Open in new tab" onClick={() => window.open(src, '_blank')} className="hidden size-10 items-center justify-center rounded-full hover:bg-white/10 sm:flex">
            <MdOutlineOpenInNew size={20} />
          </button>
        )}
        <button type="button" aria-label="Download" data-tip="Download" onClick={() => downloadAttachment(att)} className="flex size-10 items-center justify-center rounded-full hover:bg-white/10">
          <MdDownload size={22} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6 md:px-20" onClick={(e) => e.target === e.currentTarget && close()}>
        {k.kind === 'image' && src ? (
          <img key={att.id} src={src} alt={att.name} className="max-h-full max-w-full animate-pop rounded object-contain shadow-2xl" />
        ) : (
          <DocPage key={att.id} name={att.name} color={k.color} label={k.label} />
        )}
        {many && (
          <>
            <button type="button" aria-label="Previous attachment" onClick={() => go(-1)} className="absolute top-1/2 left-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 md:left-5">
              <MdChevronLeft size={30} />
            </button>
            <button type="button" aria-label="Next attachment" onClick={() => go(1)} className="absolute top-1/2 right-2 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 md:right-5">
              <MdChevronRight size={30} />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function DocPage({ name, color, label }: { name: string; color: string; label: string }) {
  const title = name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const widths = Array.from({ length: 14 }, (_, i) => 55 + ((seed * (i + 3)) % 45));
  return (
    <div className="aspect-[8.5/11] max-h-full w-full max-w-[520px] animate-pop overflow-hidden rounded bg-white p-8 text-[#202124] shadow-2xl md:p-12">
      <div className="mb-1 text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color }}>
        {label}
      </div>
      <div className="text-xl font-semibold capitalize md:text-2xl">{title}</div>
      <div className="mt-1 mb-6 h-1 w-16 rounded" style={{ background: color }} />
      {label === 'Spreadsheet' ? (
        <div className="grid grid-cols-4 gap-px overflow-hidden rounded border border-gray-200 bg-gray-200 text-[10px]">
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} className={cn('bg-white px-1.5 py-1', i < 4 && 'bg-gray-50 font-semibold')}>
              {i < 4 ? ['Item', 'Q1', 'Q2', 'Q3'][i] : i % 4 === 0 ? `Row ${i / 4}` : `$${((seed * i) % 900) + 100}`}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {widths.map((w, i) => (
            <div key={i} className={cn('h-2 rounded bg-gray-200', i % 5 === 4 && 'mb-5')} style={{ width: `${w}%` }} />
          ))}
        </div>
      )}
      <p className="mt-8 text-xs text-gray-500">Preview rendered locally. Download to save a copy.</p>
    </div>
  );
}

function DensityThumb({ d }: { d: Density }) {
  const rows = d === 'compact' ? 5 : d === 'comfortable' ? 3 : 3;
  const gap = d === 'compact' ? 3 : 6;
  return (
    <svg viewBox="0 0 44 32" className="h-8 w-11 shrink-0 rounded border border-line bg-panel" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <g key={i} transform={`translate(4 ${4 + i * (d === 'compact' ? 5 : 9)})`}>
          {d === 'default' && <rect x="0" y="0" width="4" height="4" rx="1" fill="currentColor" opacity=".35" />}
          <rect x={d === 'default' ? 6 : 0} y="0.5" width={d === 'default' ? 30 : 36} height="3" rx="1.5" fill="currentColor" opacity=".55" />
          {d === 'default' && i === 0 && <rect x="6" y={gap} width="12" height="3" rx="1" fill="currentColor" opacity=".25" />}
        </g>
      ))}
    </svg>
  );
}

export function QuickSettings() {
  const open = useUI((s) => s.quickSettings);
  const s = useSettings();
  const close = () => ui.set({ quickSettings: false });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="border-b border-line px-5 py-4 last:border-0">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-fg uppercase">{title}</h3>
      {children}
    </section>
  );
  return (
    <>
      <div className="fixed inset-0 z-[55] bg-scrim md:hidden" onClick={close} />
      <aside
        className="fixed inset-y-0 right-0 z-[56] flex w-[320px] max-w-[88vw] animate-slide-left flex-col bg-panel shadow-e3 md:static md:z-auto md:mr-2 md:mb-2 md:w-[300px] md:animate-none md:rounded-2xl md:shadow-none"
        aria-label="Quick settings"
        data-testid="quick-settings"
      >
        <div className="flex h-14 shrink-0 items-center gap-2 pr-2 pl-5">
          <h2 className="flex-1 text-lg text-fg">Quick settings</h2>
          <IconButton icon={MdClose} label="Close" onClick={close} />
        </div>
        <div className="px-5 pb-3">
          <Button
            variant="outlined"
            className="w-full"
            onClick={() => {
              close();
              navigate({ view: 'settings', tab: 'general' });
            }}
          >
            See all settings
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title="Density">
            {(['default', 'comfortable', 'compact'] as Density[]).map((d) => (
              <div key={d} className="flex items-center gap-3">
                <Radio checked={s.density === d} onChange={() => s.update({ density: d })} label={d[0].toUpperCase() + d.slice(1)} />
                <span className="ml-auto text-fg3">
                  <DensityThumb d={d} />
                </span>
              </div>
            ))}
          </Section>
          <Section title="Theme">
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={s.theme === t}
                  onClick={() => s.update({ theme: t })}
                  className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs', s.theme === t ? 'border-accent bg-accent-soft text-fg' : 'border-line text-fg2 hover:bg-hover')}
                >
                  <span
                    className="h-9 w-full rounded-md border border-black/10"
                    style={{
                      background: t === 'light' ? 'linear-gradient(135deg,#f6f8fc 55%,#d3e3fd 55%)' : t === 'dark' ? 'linear-gradient(135deg,#1f1f1f 55%,#004a77 55%)' : 'linear-gradient(90deg,#f6f8fc 50%,#1f1f1f 50%)',
                    }}
                  />
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </Section>
          <Section title="Inbox type">
            {(
              [
                ['default', 'Default'],
                ['important', 'Important first'],
                ['unread', 'Unread first'],
                ['starred', 'Starred first'],
              ] as Array<[InboxType, string]>
            ).map(([k, l]) => (
              <Radio key={k} checked={s.inboxType === k} onChange={() => s.update({ inboxType: k })} label={l} />
            ))}
          </Section>
          <Section title="Reading pane">
            {(
              [
                ['none', 'No split'],
                ['right', 'Right of inbox'],
                ['below', 'Below inbox'],
              ] as Array<[ReadingPane, string]>
            ).map(([k, l]) => (
              <Radio key={k} checked={s.readingPane === k} onChange={() => s.update({ readingPane: k })} label={l} />
            ))}
          </Section>
          <Section title="Mailbox">
            <label className="flex items-center justify-between gap-3 py-1.5 text-sm text-fg">
              Simulate new mail
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.simulateActivity} onChange={(e) => s.update({ simulateActivity: e.target.checked })} />
            </label>
            <label className="flex items-center justify-between gap-3 py-1.5 text-sm text-fg">
              Keyboard shortcuts
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.shortcuts} onChange={(e) => s.update({ shortcuts: e.target.checked })} />
            </label>
          </Section>
        </div>
      </aside>
    </>
  );
}

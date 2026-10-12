import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon, IconButton } from './kit';
import { useMail } from '../lib/store';
import { clearSelection, closeDialog, dismissToast, pauseToast, resumeToast, toast, useUI, type Dialog } from '../lib/ui';
import { applyLabels, createLabel, snooze, updateLabel } from '../lib/actions';
import { formatWhen, fromInputs, toDateInputValue, toTimeInputValue } from '../lib/dates';
import { FILE_KIND_META, fileKind, formatSize } from '../lib/files';
import { downloadAttachment, placeholderImage } from '../lib/download';

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

export function Toasts() {
  const { toasts } = useUI();
  return (
    <div className="toasts" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.tone === 'error' ? ' error' : ''}`} role="status" onMouseEnter={() => pauseToast(t.id)} onMouseLeave={() => resumeToast(t.id)}>
          <span className="toast-msg">{t.message}</span>
          {t.actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="toast-action"
              onClick={() => {
                dismissToast(t.id);
                a.run();
              }}
            >
              {a.label}
            </button>
          ))}
          <IconButton small className="toast-close" icon="close" label="Dismiss" tip={false} onClick={() => dismissToast(t.id)} />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal frame                                                         */
/* ------------------------------------------------------------------ */

function Modal({ title, children, onClose, wide, labelledBy = 'dlg-title', className = '' }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean; labelledBy?: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('[data-autofocus], input, textarea, select') ?? ref.current?.querySelector<HTMLElement>('button.btn.primary, button.btn.danger, button');
    first?.focus();
    return () => prev?.focus?.();
  }, []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'Tab') {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea, select, a[href]') ?? []);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  return createPortal(
    <div className="dialog-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`dialog${wide ? ' wide' : ''} ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onKeyDown={onKeyDown}>
        <h2 id={labelledBy}>{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Shortcuts                                                           */
/* ------------------------------------------------------------------ */

export const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  {
    group: 'Jumping around',
    items: [
      ['g then i', 'Go to Inbox'],
      ['g then s', 'Go to Starred'],
      ['g then t', 'Go to Sent'],
      ['g then d', 'Go to Drafts'],
      ['g then a', 'Go to All Mail'],
      ['g then b', 'Go to Snoozed'],
      ['/', 'Search mail'],
      ['?', 'Show keyboard shortcuts'],
    ],
  },
  {
    group: 'Selection & navigation',
    items: [
      ['j / k', 'Older / newer conversation'],
      ['Enter or o', 'Open conversation'],
      ['u', 'Back to list'],
      ['x', 'Select conversation'],
      ['* then a / n', 'Select all / none'],
      ['Esc', 'Clear selection or close'],
    ],
  },
  {
    group: 'Actions',
    items: [
      ['c', 'Compose'],
      ['r', 'Reply'],
      ['a', 'Reply all'],
      ['f', 'Forward'],
      ['e', 'Archive'],
      ['#', 'Delete'],
      ['!', 'Report spam'],
      ['s', 'Star / unstar'],
      ['+', 'Mark as important'],
      ['b', 'Snooze'],
      ['l', 'Label as'],
      ['v', 'Move to'],
      ['Shift + i / Shift + u', 'Mark as read / unread'],
      ['z', 'Undo last action'],
    ],
  },
  {
    group: 'Composing',
    items: [
      ['Ctrl/⌘ + Enter', 'Send'],
      ['Ctrl/⌘ + K', 'Insert link'],
      ['Ctrl/⌘ + B / I / U', 'Bold / italic / underline'],
      ['Esc', 'Save draft and close'],
    ],
  },
];

function Kbd({ keys }: { keys: string }) {
  return (
    <span className="kbd-group">
      {keys.split(' ').map((k, i) =>
        k === 'then' || k === '/' || k === 'or' || k === '+' ? (
          <span key={i} className="kbd-sep">
            {k}
          </span>
        ) : (
          <kbd key={i}>{k}</kbd>
        ),
      )}
    </span>
  );
}

function ShortcutsDialog() {
  return (
    <Modal title="Keyboard shortcuts" onClose={closeDialog} wide>
      <div className="shortcut-grid">
        {SHORTCUTS.map((g) => (
          <section key={g.group}>
            <h3>{g.group}</h3>
            <dl>
              {g.items.map(([k, d]) => (
                <div key={k + d} className="shortcut-row">
                  <dt>
                    <Kbd keys={k} />
                  </dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <div className="dialog-actions">
        <button type="button" className="btn text" onClick={closeDialog}>
          Close
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Label editor                                                        */
/* ------------------------------------------------------------------ */

export const LABEL_COLORS = ['#1a73e8', '#188038', '#e8710a', '#a142f4', '#e52592', '#12a4af', '#d93025', '#f9ab00', '#5f6368', '#7b5e2e', '#0b57d0', '#137333'];

function LabelDialog({ labelId, applyToIds }: { labelId?: string; applyToIds?: string[] }) {
  const mail = useMail();
  const existing = labelId ? mail.labels.find((l) => l.id === labelId) : undefined;
  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? LABEL_COLORS[mail.labels.length % LABEL_COLORS.length]);
  const trimmed = name.trim();
  const dup = mail.labels.some((l) => l.id !== labelId && l.name.toLowerCase() === trimmed.toLowerCase());
  const error = !trimmed ? '' : dup ? 'That label name already exists.' : trimmed.length > 40 ? 'Label names can be up to 40 characters.' : '';
  const valid = !!trimmed && !error;

  const save = () => {
    if (!valid) return;
    if (existing) {
      updateLabel(existing.id, { name: trimmed, color });
      toast('Label updated.');
    } else {
      const id = createLabel(trimmed, color);
      if (applyToIds?.length) {
        applyLabels(applyToIds, [id], []);
        clearSelection();
      } else toast(`Label “${trimmed}” created.`);
    }
    closeDialog();
  };

  return (
    <Modal title={existing ? 'Edit label' : 'New label'} onClose={closeDialog}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <div className="field">
          <label htmlFor="label-name">Label name</label>
          <input id="label-name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} data-autofocus autoComplete="off" />
          {error && <span className="field-error">{error}</span>}
        </div>
        <div className="field">
          <label id="label-color-l">Color</label>
          <div className="swatches wrap" role="radiogroup" aria-labelledby="label-color-l">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Color ${c}`}
                className={`swatch${color === c ? ' on' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              >
                {color === c && <Icon name="check" size="sm" />}
              </button>
            ))}
          </div>
        </div>
        <div className="label-preview">
          Preview <span className="chip" style={{ ['--chip' as string]: color }}>{trimmed || 'Label'}</span>
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn text" onClick={closeDialog}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            {existing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Date & time picker (snooze / schedule)                              */
/* ------------------------------------------------------------------ */

function DateTimeDialog({ title, confirmLabel, defaultTs, onPick }: { title: string; confirmLabel: string; defaultTs: number; onPick: (ts: number) => void }) {
  const [date, setDate] = useState(toDateInputValue(defaultTs));
  const [time, setTime] = useState(toTimeInputValue(defaultTs));
  const ts = fromInputs(date, time);
  const valid = Number.isFinite(ts) && ts > Date.now() + 30_000;
  return (
    <Modal title={title} onClose={closeDialog}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          closeDialog();
          onPick(ts);
        }}
      >
        <div className="field">
          <label htmlFor="dt-date">Date</label>
          <input id="dt-date" className="input" type="date" value={date} min={toDateInputValue(Date.now())} onChange={(e) => setDate(e.target.value)} data-autofocus />
        </div>
        <div className="field">
          <label htmlFor="dt-time">Time</label>
          <input id="dt-time" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <p className="dt-note">{valid ? formatWhen(ts) : 'Pick a time in the future.'}</p>
        <div className="dialog-actions">
          <button type="button" className="btn text" onClick={closeDialog}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!valid}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SnoozeDialog({ ids }: { ids: string[] }) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return (
    <DateTimeDialog
      title="Pick date & time"
      confirmLabel="Save"
      defaultTs={d.getTime()}
      onPick={(ts) => {
        snooze(ids, ts);
        clearSelection();
      }}
    />
  );
}

function ScheduleDialog({ onPick }: { onPick: (ts: number) => void }) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return <DateTimeDialog title="Schedule send" confirmLabel="Schedule send" defaultTs={d.getTime()} onPick={onPick} />;
}

/* ------------------------------------------------------------------ */
/* Link                                                                */
/* ------------------------------------------------------------------ */

function normalizeUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return '';
  if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
  if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(u)) return `mailto:${u}`;
  return `https://${u}`;
}

function LinkDialog({ initialText, onInsert }: { initialText: string; onInsert: (text: string, url: string) => void }) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState('');
  const href = normalizeUrl(url);
  return (
    <Modal title="Edit link" onClose={closeDialog}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!href) return;
          closeDialog();
          setTimeout(() => onInsert(text.trim() || url.trim(), href), 0);
        }}
      >
        <div className="field">
          <label htmlFor="link-text">Text to display</label>
          <input id="link-text" className="input" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="link-url">Web address</label>
          <input id="link-url" className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste or type a link" data-autofocus autoComplete="off" />
        </div>
        <div className="dialog-actions">
          <button type="button" className="btn text" onClick={closeDialog}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={!href}>
            OK
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Attachment preview                                                  */
/* ------------------------------------------------------------------ */

function AttachmentDialog({ d }: { d: Extract<Dialog, { kind: 'attachment' }> }) {
  const mail = useMail();
  const msg = mail.threads[d.threadId]?.messages.find((m) => m.id === d.messageId);
  const list = msg?.attachments ?? [];
  const [idx, setIdx] = useState(Math.max(0, list.findIndex((a) => a.id === d.attachmentId)));
  const att = list[idx];
  const kind = att ? fileKind(att.mime, att.name) : 'file';
  const meta = FILE_KIND_META[kind];
  const src = useMemo(() => {
    if (!att) return '';
    if (att.dataUrl && kind === 'image') return att.dataUrl;
    if (kind === 'image') return placeholderImage(att.name);
    return '';
  }, [att, kind]);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    document.querySelector<HTMLElement>('.preview-bar button')?.focus();
    return () => prev?.focus?.();
  }, []);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(list.length - 1, i + 1));
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'Escape') closeDialog();
    };
    document.addEventListener('keydown', on);
    window.addEventListener('hashchange', closeDialog);
    return () => {
      document.removeEventListener('keydown', on);
      window.removeEventListener('hashchange', closeDialog);
    };
  }, [list.length]);

  if (!att) return null;
  return (
    <div
      className="preview-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${att.name}`}
      onMouseDown={(e) => e.target === e.currentTarget && closeDialog()}
      onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
    >
      <div className="preview-bar">
        <IconButton icon="close" label="Close preview" onClick={closeDialog} className="on-dark" />
        <span className="preview-title">
          <Icon name={meta.icon} fill style={{ color: meta.color }} />
          <span>{att.name}</span>
          <span className="preview-size">{formatSize(att.size)}</span>
        </span>
        <span className="tb-spacer" />
        {list.length > 1 && (
          <span className="preview-count">
            {idx + 1} / {list.length}
          </span>
        )}
        <IconButton
          icon="download"
          label="Download"
          className="on-dark"
          onClick={() => {
            const saved = downloadAttachment(att);
            toast(`Downloaded ${saved}`);
          }}
        />
      </div>
      <div className="preview-stage">
        {list.length > 1 && idx > 0 && <IconButton icon="chevron_left" label="Previous attachment" className="preview-nav left on-dark" onClick={() => setIdx(idx - 1)} />}
        {src ? (
          <img className="preview-img" src={src} alt={att.name} />
        ) : (
          <div className="preview-doc">
            <div className="doc-page">
              <div className="doc-kind" style={{ background: meta.color }}>
                <Icon name={meta.icon} fill />
              </div>
              <div className="doc-title">{att.name}</div>
              <div className="doc-lines" aria-hidden="true">
                {Array.from({ length: 11 }).map((_, i) => (
                  <span key={i} style={{ width: `${62 + ((i * 37) % 38)}%` }} />
                ))}
              </div>
              <div className="doc-note">
                {att.dataUrl ? 'This file was attached in this browser. Download it to open it.' : 'Demo attachment. The original file contents aren’t stored in this offline mailbox, but you can download a stand-in file.'}
              </div>
            </div>
          </div>
        )}
        {list.length > 1 && idx < list.length - 1 && <IconButton icon="chevron_right" label="Next attachment" className="preview-nav right on-dark" onClick={() => setIdx(idx + 1)} />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Host                                                                */
/* ------------------------------------------------------------------ */

export function DialogHost() {
  const { dialog: d } = useUI();
  if (!d) return null;
  switch (d.kind) {
    case 'confirm':
      return (
        <Modal title={d.title} onClose={closeDialog}>
          <p>{d.body}</p>
          <div className="dialog-actions">
            <button type="button" className="btn text" onClick={closeDialog}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn ${d.danger ? 'danger' : 'primary'}`}
              onClick={() => {
                closeDialog();
                d.onConfirm();
              }}
            >
              {d.confirmLabel}
            </button>
          </div>
        </Modal>
      );
    case 'alert':
      return (
        <Modal title={d.title} onClose={closeDialog}>
          <p>{d.body}</p>
          <div className="dialog-actions">
            <button type="button" className="btn primary" onClick={closeDialog}>
              OK
            </button>
          </div>
        </Modal>
      );
    case 'shortcuts':
      return <ShortcutsDialog />;
    case 'label':
      return <LabelDialog key={d.labelId ?? 'new'} labelId={d.labelId} applyToIds={d.applyToIds} />;
    case 'snooze':
      return <SnoozeDialog ids={d.ids} />;
    case 'schedule':
      return <ScheduleDialog onPick={d.onPick} />;
    case 'attachment':
      return <AttachmentDialog d={d} />;
    case 'link':
      return <LinkDialog initialText={d.initialText} onInsert={d.onInsert} />;
  }
}


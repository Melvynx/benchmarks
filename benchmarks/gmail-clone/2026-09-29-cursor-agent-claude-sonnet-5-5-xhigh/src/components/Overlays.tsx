import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useUI } from '../lib/ui';
import { useMail } from '../lib/store';
import { LABEL_COLORS, readableOn } from '../lib/text';
import { IconButton } from './primitives';

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="toasts" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <div key={t.id} className="toast" role="status" aria-live="polite">
          <span className="toast__text">{t.text}</span>
          {t.actions.map((a) => (
            <button
              key={a.label}
              type="button"
              className="toast__action"
              onClick={() => {
                a.run();
                useUI.getState().dismissToast(t.id);
              }}
            >
              {a.label}
            </button>
          ))}
          <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => useUI.getState().dismissToast(t.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ConfirmDialog() {
  const dlg = useUI((s) => s.confirm);
  const okRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!dlg) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        useUI.getState().set({ confirm: null });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dlg]);
  if (!dlg) return null;
  const close = () => useUI.getState().set({ confirm: null });
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body">
        <h2 id="confirm-title" className="modal__title">
          {dlg.title}
        </h2>
        <p id="confirm-body" className="modal__body">
          {dlg.body}
        </p>
        <div className="modal__actions">
          {dlg.cancelLabel !== '' ? (
            <button type="button" className="text-btn" onClick={close}>
              {dlg.cancelLabel ?? 'Cancel'}
            </button>
          ) : null}
          <button
            ref={okRef}
            type="button"
            className="btn btn--primary"
            onClick={() => {
              close();
              dlg.onConfirm();
            }}
          >
            {dlg.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function LabelDialog() {
  const dlg = useUI((s) => s.labelDialog);
  const labels = useMail((s) => s.labels);
  const existing = dlg?.id ? labels.find((l) => l.id === dlg.id) : undefined;
  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dlg) return;
    setName(existing?.name ?? '');
    setColor(existing?.color ?? LABEL_COLORS[Math.floor(Math.random() * LABEL_COLORS.length)]);
    setTimeout(() => inputRef.current?.focus(), 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dlg?.id, !!dlg]);

  useEffect(() => {
    if (!dlg) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        useUI.getState().set({ labelDialog: null });
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dlg]);

  if (!dlg) return null;
  const close = () => useUI.getState().set({ labelDialog: null });
  const trimmed = name.trim();
  const duplicate = labels.some((l) => l.name.toLowerCase() === trimmed.toLowerCase() && l.id !== dlg.id);
  const valid = trimmed.length > 0 && !duplicate;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const store = useMail.getState();
    if (dlg.id) {
      store.updateLabel(dlg.id, { name: trimmed, color });
      useUI.getState().toast(`Label “${trimmed}” updated.`);
    } else {
      const id = store.createLabel(trimmed, color);
      if (dlg.applyTo?.length) {
        const undo = store.applyLabel(dlg.applyTo, id, true);
        useUI.getState().toast(`Created label “${trimmed}” and applied it.`, [{ label: 'Undo', run: undo }]);
      } else useUI.getState().toast(`Label “${trimmed}” created.`);
    }
    close();
  };

  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="label-title" onSubmit={submit}>
        <h2 id="label-title" className="modal__title">
          {dlg.id ? 'Edit label' : 'New label'}
        </h2>
        <label className="field">
          <span>Label name</span>
          <input ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} aria-invalid={duplicate} />
          {duplicate ? <em className="field__error">A label with that name already exists.</em> : null}
        </label>
        <div className="field">
          <span>Color</span>
          <div className="swatches" role="radiogroup" aria-label="Label color">
            {LABEL_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} className={`swatch ${color === c ? 'is-on' : ''}`} style={{ background: c, color: readableOn(c) }} onClick={() => setColor(c)}>
                {color === c ? <Check size={14} strokeWidth={3} /> : null}
              </button>
            ))}
          </div>
        </div>
        <div className="modal__actions">
          <button type="button" className="text-btn" onClick={close}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={!valid}>
            {dlg.id ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

const SHORTCUTS: { group: string; rows: [string, string][] }[] = [
  {
    group: 'Compose & search',
    rows: [
      ['c', 'Compose'],
      ['/', 'Search mail'],
      ['Ctrl/⌘ + Enter', 'Send message'],
      ['Ctrl/⌘ + K', 'Insert link'],
      ['Esc', 'Save draft and close'],
    ],
  },
  {
    group: 'Navigation',
    rows: [
      ['g then i', 'Go to Inbox'],
      ['g then s', 'Go to Starred'],
      ['g then t', 'Go to Sent'],
      ['g then d', 'Go to Drafts'],
      ['g then a', 'Go to All Mail'],
      ['j / k', 'Next / previous conversation'],
      ['o or Enter', 'Open conversation'],
      ['u', 'Back to list'],
    ],
  },
  {
    group: 'Actions',
    rows: [
      ['x', 'Select conversation'],
      ['s', 'Star / unstar'],
      ['e', 'Archive'],
      ['#', 'Delete'],
      ['!', 'Report spam'],
      ['Shift + I', 'Mark as read'],
      ['Shift + U', 'Mark as unread'],
      ['l / v / b', 'Labels / Move to / Snooze'],
      ['z', 'Undo last action'],
    ],
  },
  {
    group: 'In a conversation',
    rows: [
      ['r', 'Reply'],
      ['a', 'Reply all'],
      ['f', 'Forward'],
      ['] or [', 'Archive and return'],
      ['?', 'Show this help'],
    ],
  },
];

export function ShortcutsHelp() {
  const open = useUI((s) => s.shortcutsHelp);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useUI.getState().set({ shortcutsHelp: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  const close = () => useUI.getState().set({ shortcutsHelp: false });
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="sc-title">
        <div className="modal__head">
          <h2 id="sc-title" className="modal__title">
            Keyboard shortcuts
          </h2>
          <IconButton label="Close" onClick={close}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="shortcuts">
          {SHORTCUTS.map((g) => (
            <section key={g.group}>
              <h3>{g.group}</h3>
              <dl>
                {g.rows.map(([k, d]) => (
                  <div key={k} className="shortcuts__row">
                    <dt>
                      {k.split(' ').map((part, i) =>
                        ['then', '/', 'or', '+'].includes(part) ? (
                          <span key={i} className="shortcuts__sep">
                            {part}
                          </span>
                        ) : (
                          <kbd key={i}>{part}</kbd>
                        ),
                      )}
                    </dt>
                    <dd>{d}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

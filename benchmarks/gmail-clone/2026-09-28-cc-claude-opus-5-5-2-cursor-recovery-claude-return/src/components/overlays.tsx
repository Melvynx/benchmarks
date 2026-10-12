import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { MdCheck, MdClose, MdOutlineMail } from 'react-icons/md';
import { LABEL_PALETTE, ME } from '../data/seed';
import { useIsMobile } from '../hooks';
import { moveTo, openThread, setLabel } from '../lib/actions';
import { navigate } from '../lib/router';
import { useMail, type Density, type ThemeMode, type ThemeTint } from '../store/mail';
import { useUI } from '../store/ui';
import { Logo } from './Header';
import { Avatar, Dialog, IconButton, Switch } from './primitives';

/* ---------------- Toast ---------------- */

export function ToastHost() {
  const toast = useUI((s) => s.toast);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!toast || paused) return;
    const id = window.setTimeout(() => useUI.getState().dismissToast(toast.id), toast.duration ?? 6000);
    return () => window.clearTimeout(id);
  }, [toast, paused]);
  useEffect(() => setPaused(false), [toast?.id]);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} key={toast.id}>
      <span className="toast-msg">{toast.message}</span>
      {toast.actions?.map((a) => (
        <button
          key={a.label}
          type="button"
          className="toast-action"
          onClick={() => {
            useUI.getState().dismissToast(toast.id);
            a.run();
          }}
        >
          {a.label}
        </button>
      ))}
      <IconButton icon={MdClose} label="Dismiss" size="sm" className="on-dark" onClick={() => useUI.getState().dismissToast(toast.id)} />
    </div>
  );
}

/* ---------------- Incoming mail notices ---------------- */

export function Notices() {
  const notices = useUI((s) => s.notices);
  return (
    <div className="notices" aria-live="polite">
      {notices.map((n) => (
        <NoticeCard key={n.id} id={n.id} />
      ))}
    </div>
  );
}

function NoticeCard({ id }: { id: string }) {
  const n = useUI((s) => s.notices.find((x) => x.id === id));
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (hover) return;
    const t = window.setTimeout(() => useUI.getState().dismissNotice(id), 7000);
    return () => window.clearTimeout(t);
  }, [id, hover]);
  if (!n) return null;
  return (
    <div
      className="notice"
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => {
        useUI.getState().dismissNotice(id);
        openThread(n.threadId, { view: 'folder', folder: 'inbox' });
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          useUI.getState().dismissNotice(id);
          openThread(n.threadId, { view: 'folder', folder: 'inbox' });
        }
      }}
    >
      <Avatar contact={n.from} size={40} />
      <div className="notice-text">
        <div className="notice-app"><MdOutlineMail aria-hidden /> New mail · now</div>
        <div className="notice-title">{n.title}</div>
        <div className="notice-body">{n.body}</div>
      </div>
      <IconButton
        icon={MdClose}
        size="sm"
        label="Dismiss notification"
        onClick={(e) => {
          e.stopPropagation();
          useUI.getState().dismissNotice(id);
        }}
      />
    </div>
  );
}

/* ---------------- Label dialog ---------------- */

export function LabelDialog() {
  const state = useUI((s) => s.labelDialog);
  const labels = useMail((s) => s.labels);
  const [name, setName] = useState('');
  const [color, setColor] = useState(0);
  const editing = state?.mode === 'edit' ? labels.find((l) => l.id === state.labelId) : undefined;
  useEffect(() => {
    if (!state) return;
    if (editing) {
      setName(editing.name);
      setColor(Math.max(0, LABEL_PALETTE.findIndex((p) => p.color === editing.color)));
    } else {
      setName(state.name ?? '');
      setColor(labels.length % LABEL_PALETTE.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const close = () => useUI.getState().set({ labelDialog: null });
  const clean = name.trim();
  const duplicate = labels.some((l) => l.name.toLowerCase() === clean.toLowerCase() && l.id !== editing?.id);
  const valid = clean.length > 0 && clean.length <= 40 && !duplicate;
  const save = () => {
    if (!valid || !state) return;
    const mail = useMail.getState();
    if (editing) {
      mail.updateLabel(editing.id, { name: clean, ...LABEL_PALETTE[color] });
      useUI.getState().showToast(`Label “${clean}” updated.`);
    } else {
      const label = mail.createLabel(clean, color);
      if (state.applyTo?.length) {
        if (state.move) moveTo(state.applyTo, { labelId: label.id });
        else setLabel(state.applyTo, label.id, true);
      } else useUI.getState().showToast(`Label “${label.name}” created.`, [{ label: 'View', run: () => navigate({ view: 'label', labelId: label.id }) }]);
    }
    close();
  };
  return (
    <Dialog
      open={!!state}
      onClose={close}
      title={editing ? 'Edit label' : 'New label'}
      actions={
        <>
          <button type="button" className="btn btn-text" onClick={close}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={save}>{editing ? 'Save' : 'Create'}</button>
        </>
      }
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <label className="field">
          <span>{editing ? 'Label name' : 'Please enter a new label name'}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        </label>
        {duplicate && <p className="field-error">A label with this name already exists.</p>}
        <div className="field">
          <span>Color</span>
          <div className="swatches swatches-lg">
            {LABEL_PALETTE.map((p, i) => (
              <button
                key={p.color}
                type="button"
                className={`swatch ${i === color ? 'is-on' : ''}`}
                style={{ background: p.color }}
                aria-label={`Color ${i + 1}`}
                aria-pressed={i === color}
                onClick={() => setColor(i)}
              >
                {i === color && <MdCheck aria-hidden />}
              </button>
            ))}
          </div>
        </div>
        {state?.applyTo?.length ? (
          <p className="dialog-note">
            {state.move ? 'Moves' : 'Applies to'} {state.applyTo.length === 1 ? 'the selected conversation' : `${state.applyTo.length} selected conversations`}.
          </p>
        ) : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

/* ---------------- Keyboard shortcuts ---------------- */

const SHORTCUTS: { title: string; items: [string, string][] }[] = [
  {
    title: 'Navigation',
    items: [
      ['g then i', 'Go to Inbox'], ['g then s', 'Go to Starred'], ['g then t', 'Go to Sent'], ['g then d', 'Go to Drafts'],
      ['g then a', 'Go to All Mail'], ['g then k', 'Open Tasks'], ['j / k', 'Older / newer conversation'], ['o or Enter', 'Open conversation'],
      ['u', 'Back to list'], ['/', 'Search mail'], ['?', 'Show shortcuts'],
    ],
  },
  {
    title: 'Actions',
    items: [
      ['c', 'Compose'], ['r', 'Reply'], ['a', 'Reply all'], ['f', 'Forward'], ['e', 'Archive'], ['#', 'Delete'], ['!', 'Report spam'],
      ['s', 'Star / unstar'], ['+ / -', 'Mark important / not important'], ['Shift + i', 'Mark as read'], ['Shift + u', 'Mark as unread'],
      ['m', 'Mute'], ['z', 'Undo last action'], ['⌘ + Enter', 'Send (in compose)'],
    ],
  },
  {
    title: 'Selection',
    items: [['x', 'Select conversation'], ['* then a', 'Select all'], ['* then n', 'Select none'], ['* then r / u', 'Select read / unread'], ['* then s', 'Select starred'], ['Shift + click', 'Select a range'], ['Esc', 'Clear selection']],
  },
];

export function ShortcutsHelp() {
  const open = useUI((s) => s.shortcutsHelp);
  const enabled = useMail((s) => s.settings.shortcuts);
  const close = () => useUI.getState().set({ shortcutsHelp: false });
  return (
    <Dialog
      open={open}
      onClose={close}
      wide
      title="Keyboard shortcuts"
      actions={
        <>
          <label className="inline-switch">
            <Switch checked={enabled} onChange={(v) => useMail.getState().updateSettings({ shortcuts: v })} label="Keyboard shortcuts" />
            <span>Shortcuts {enabled ? 'on' : 'off'}</span>
          </label>
          <span className="tb-spacer" />
          <button type="button" className="btn btn-primary" onClick={close}>Done</button>
        </>
      }
    >
      <div className="shortcuts">
        {SHORTCUTS.map((s) => (
          <section key={s.title}>
            <h3>{s.title}</h3>
            <dl>
              {s.items.map(([k, v]) => (
                <div key={k} className="shortcut">
                  <dt>{k.split(/( then | \/ | \+ | or )/).map((p, i) => (/^( then | \/ | \+ | or )$/.test(p) ? <span key={i} className="kbd-sep">{p.trim()}</span> : <kbd key={i}>{p}</kbd>))}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}

/* ---------------- Quick settings ---------------- */

export const TINTS: { id: ThemeTint; label: string; light: string; dark: string }[] = [
  { id: 'default', label: 'Default', light: '#f6f8fc', dark: '#1b1b1d' },
  { id: 'sky', label: 'Sky', light: '#e8f1fd', dark: '#16202e' },
  { id: 'sage', label: 'Sage', light: '#edf4ec', dark: '#18221b' },
  { id: 'rose', label: 'Rose', light: '#fbeef0', dark: '#281a1e' },
  { id: 'sand', label: 'Sand', light: '#f7f1e6', dark: '#241f17' },
  { id: 'slate', label: 'Slate', light: '#eceff3', dark: '#1a1d22' },
];

type InboxType = 'default' | 'plain' | 'unreadFirst' | 'starredFirst';

export function QuickSettings() {
  const open = useUI((s) => s.quickSettings);
  const settings = useMail((s) => s.settings);
  const update = useMail((s) => s.updateSettings);
  const mobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  const close = () => useUI.getState().set({ quickSettings: false });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest('[aria-label="Settings"]')) return;
      close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
    };
  }, [open]);
  if (!open) return null;
  const inboxType: InboxType = settings.categories ? 'default' : settings.inboxSort === 'default' ? 'plain' : settings.inboxSort;
  const radio = <T extends string>(name: string, value: T, current: T, label: string, onPick: (v: T) => void, preview?: string) => (
    <label className={`qs-option ${value === current ? 'is-on' : ''}`}>
      <input type="radio" name={name} checked={value === current} onChange={() => onPick(value)} />
      <span className="qs-radio" aria-hidden />
      <span className="qs-option-label">{label}</span>
      {preview && <span className={`qs-preview qs-preview-${preview}`} aria-hidden><i /><i /><i /></span>}
    </label>
  );
  return (
    <aside className={`quick-settings ${mobile ? 'is-mobile' : ''}`} ref={ref} aria-label="Quick settings">
      <div className="qs-head">
        <h2>Quick settings</h2>
        <IconButton icon={MdClose} label="Close" onClick={close} />
      </div>
      <div className="qs-scroll">
        <button type="button" className="btn btn-tonal qs-all" onClick={() => { close(); navigate({ view: 'settings', tab: 'general' }); }}>
          See all settings
        </button>
        <section className="qs-section">
          <h3>Theme</h3>
          <div className="qs-themes">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((t) => (
              <button key={t} type="button" className={`qs-theme qs-theme-${t} ${settings.theme === t ? 'is-on' : ''}`} onClick={() => update({ theme: t })} aria-pressed={settings.theme === t}>
                <span className="qs-theme-art" aria-hidden />
                <span>{t[0].toUpperCase() + t.slice(1)}</span>
              </button>
            ))}
          </div>
          <div className="qs-tints" role="radiogroup" aria-label="Background tint">
            {TINTS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={settings.tint === t.id}
                aria-label={t.label}
                data-tip={t.label}
                className={`qs-tint ${settings.tint === t.id ? 'is-on' : ''}`}
                style={{ '--tint-l': t.light, '--tint-d': t.dark } as CSSProperties}
                onClick={() => update({ tint: t.id })}
              >
                {settings.tint === t.id && <MdCheck aria-hidden />}
              </button>
            ))}
          </div>
        </section>
        <section className="qs-section">
          <h3>Density</h3>
          {radio<Density>('density', 'default', settings.density, 'Default', (v) => update({ density: v }), 'default')}
          {radio<Density>('density', 'comfortable', settings.density, 'Comfortable', (v) => update({ density: v }), 'comfortable')}
          {radio<Density>('density', 'compact', settings.density, 'Compact', (v) => update({ density: v }), 'compact')}
        </section>
        <section className="qs-section">
          <h3>Inbox type</h3>
          {radio<InboxType>('inboxType', 'default', inboxType, 'Default (with tabs)', () => update({ categories: true, inboxSort: 'default' }))}
          {radio<InboxType>('inboxType', 'plain', inboxType, 'Single inbox', () => update({ categories: false, inboxSort: 'default' }))}
          {radio<InboxType>('inboxType', 'unreadFirst', inboxType, 'Unread first', () => update({ categories: false, inboxSort: 'unreadFirst' }))}
          {radio<InboxType>('inboxType', 'starredFirst', inboxType, 'Starred first', () => update({ categories: false, inboxSort: 'starredFirst' }))}
        </section>
        {!mobile && (
          <section className="qs-section">
            <h3>Reading pane</h3>
            {radio('pane', 'none', settings.readingPane, 'No split', (v) => update({ readingPane: v }))}
            {radio('pane', 'right', settings.readingPane, 'Right of inbox', (v) => update({ readingPane: v }))}
          </section>
        )}
        <section className="qs-section">
          <h3>Behavior</h3>
          <label className="qs-switch"><span>Hover actions on rows</span><Switch checked={settings.hoverActions} onChange={(v) => update({ hoverActions: v })} label="Hover actions" /></label>
          <label className="qs-switch"><span>Smart reply suggestions</span><Switch checked={settings.smartReply} onChange={(v) => update({ smartReply: v })} label="Smart reply" /></label>
          <label className="qs-switch"><span>Keyboard shortcuts</span><Switch checked={settings.shortcuts} onChange={(v) => update({ shortcuts: v })} label="Keyboard shortcuts" /></label>
        </section>
      </div>
    </aside>
  );
}

/* ---------------- Signed out ---------------- */

export function SignedOut() {
  const displayName = useMail((s) => s.settings.displayName);
  const me = { ...ME, name: displayName || ME.name };
  return (
    <div className="signed-out">
      <div className="signed-out-card">
        <Logo size={48} />
        <h1 className="brand-name">Claude Opus 5.5</h1>
        <h2>Signed out</h2>
        <p>You signed out of this device. Your mailbox is still stored locally and will be here when you come back.</p>
        <button type="button" className="signed-out-account" onClick={() => useUI.getState().set({ signedOut: false })}>
          <Avatar contact={me} size={36} />
          <span>
            <b>{me.name}</b>
            <span>{me.email}</span>
          </span>
          <span className="signed-out-cta">Sign in</span>
        </button>
      </div>
    </div>
  );
}

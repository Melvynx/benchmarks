import { useState, type ReactNode } from 'react';
import { useMail } from '../store/mailStore';
import { useUi } from '../store/uiStore';
import { Icon } from './Icon';
import { cx } from '../lib/utils';
import { ME } from '../data/contacts';

function Dialog({ title, children, onClose, width }: { title: string; children: ReactNode; onClose: () => void; width?: number }) {
  return (
    <div
      className="dialog-backdrop"
      data-modal-open="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className="dialog" role="dialog" aria-label={title} style={width ? { width } : undefined} tabIndex={-1} ref={(el) => el?.focus()}>
        <div className="dialog-head">
          <h2>{title}</h2>
          <button className="icon-btn small" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
    </div>
  );
}

const SHORTCUT_GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Compose & chat',
    items: [
      ['c', 'Compose'],
      ['⌘/Ctrl + Enter', 'Send'],
      ['Esc', 'Close compose (saves draft)'],
    ],
  },
  {
    title: 'Navigate',
    items: [
      ['j / ↓', 'Next conversation'],
      ['k / ↑', 'Previous conversation'],
      ['Enter / o', 'Open conversation'],
      ['u / Esc', 'Back to list'],
      ['g then i', 'Go to Inbox'],
      ['g then s', 'Go to Starred'],
      ['g then t', 'Go to Sent'],
      ['g then d', 'Go to Drafts'],
      ['/', 'Focus search'],
    ],
  },
  {
    title: 'Act',
    items: [
      ['x', 'Select conversation'],
      ['s', 'Star / unstar'],
      ['e', 'Archive'],
      ['#', 'Move to Trash'],
      ['⇧I', 'Mark as read'],
      ['⇧U', 'Mark as unread'],
      ['r', 'Reply (in conversation)'],
      ['* then a', 'Select all'],
      ['* then n', 'Deselect all'],
      ['?', 'This list'],
    ],
  },
];

function ShortcutsDialog() {
  const close = useUi((s) => s.closeDialog);
  return (
    <Dialog title="Keyboard shortcuts" onClose={close} width={560}>
      <div className="shortcuts-grid">
        {SHORTCUT_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="shortcuts-group">{g.title}</h3>
            <table className="shortcuts-table">
              <tbody>
                {g.items.map(([key, desc]) => (
                  <tr key={key}>
                    <td><kbd>{key}</kbd></td>
                    <td>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

function SettingsDialog() {
  const close = useUi((s) => s.closeDialog);
  const settings = useMail((s) => s.settings);
  const updateSettings = useMail((s) => s.updateSettings);
  const resetAll = useMail((s) => s.resetAll);
  const [sig, setSig] = useState(settings.signature);

  return (
    <Dialog title="Settings" onClose={close} width={520}>
      <div className="settings-section">
        <div className="settings-label">Theme</div>
        <div className="segmented">
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              className={cx('segment', settings.theme === t && 'active')}
              onClick={() => updateSettings({ theme: t })}
            >
              <Icon name={t === 'light' ? 'sun' : 'moon'} size={16} />
              {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">Display density</div>
        <div className="segmented">
          {(['default', 'comfortable', 'compact'] as const).map((d) => (
            <button
              key={d}
              className={cx('segment', settings.density === d && 'active')}
              onClick={() => updateSettings({ density: d })}
            >
              {d[0].toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-label">Signature — appended to messages you send</div>
        <textarea
          className="sig-input"
          rows={3}
          value={sig}
          onChange={(e) => setSig(e.target.value)}
          onBlur={() => updateSettings({ signature: sig })}
          placeholder="Your name, title, etc."
        />
      </div>

      <div className="settings-section">
        <div className="settings-label">Account</div>
        <div className="settings-account">
          <strong>{ME.name}</strong> · {ME.email}
        </div>
      </div>

      <div className="settings-section settings-danger">
        <div>
          <div className="settings-label">Reset demo data</div>
          <div className="settings-hint">Restores the original seeded mailbox, undoing every change you made.</div>
        </div>
        <button className="btn danger-btn" onClick={() => { resetAll(); close(); }}>
          Reset
        </button>
      </div>
    </Dialog>
  );
}

const LABEL_COLORS = ['#0b57d0', '#0d652d', '#7a42d8', '#b06000', '#c2185b', '#00639b', '#5f6368', '#d93025'];

function LabelDialog() {
  const close = useUi((s) => s.closeDialog);
  const createLabel = useMail((s) => s.createLabel);
  const openLabel = useMail((s) => s.openLabel);
  const pushToast = useMail((s) => s.pushToast);
  const [name, setName] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0]);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = createLabel(trimmed, color);
    pushToast({ message: `Label "${trimmed}" created` });
    close();
    openLabel(id);
  };

  return (
    <Dialog title="Create label" onClose={close} width={380}>
      <div className="settings-section">
        <div className="settings-label">Label name</div>
        <input
          className="text-input"
          autoFocus
          value={name}
          placeholder="e.g. Receipts 2026"
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') create();
            e.stopPropagation();
          }}
        />
      </div>
      <div className="settings-section">
        <div className="settings-label">Color</div>
        <div className="color-row">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              className={cx('color-dot', color === c && 'active')}
              style={{ background: c }}
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
            >
              {color === c && <Icon name="check" size={14} style={{ color: '#fff' }} />}
            </button>
          ))}
        </div>
      </div>
      <div className="dialog-actions">
        <button className="btn" onClick={close}>Cancel</button>
        <button className="btn primary" onClick={create} disabled={!name.trim()}>Create</button>
      </div>
    </Dialog>
  );
}

export function Dialogs() {
  const dialog = useUi((s) => s.dialog);
  if (dialog === 'shortcuts') return <ShortcutsDialog />;
  if (dialog === 'settings') return <SettingsDialog />;
  if (dialog === 'label') return <LabelDialog />;
  return null;
}

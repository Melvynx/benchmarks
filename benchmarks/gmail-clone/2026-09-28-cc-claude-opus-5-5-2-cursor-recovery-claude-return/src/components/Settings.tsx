import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { MdArrowBack, MdCheck, MdOutlineFileDownload, MdOutlineRefresh } from 'react-icons/md';
import { LABEL_PALETTE } from '../data/seed';
import { useIsMobile } from '../hooks';
import { navigate } from '../lib/router';
import { useMail, type Settings as SettingsT } from '../store/mail';
import { useUI } from '../store/ui';
import { TINTS } from './overlays';
import { IconButton, Switch } from './primitives';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'labels', label: 'Labels' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'themes', label: 'Themes' },
  { id: 'data', label: 'Data & storage' },
];

export function Settings({ tab }: { tab: string }) {
  const mobile = useIsMobile();
  const current = TABS.some((t) => t.id === tab) ? tab : 'general';
  return (
    <section className="settings" aria-label="Settings">
      <div className="settings-head">
        {mobile && <IconButton icon={MdArrowBack} label="Back to Inbox" onClick={() => navigate({ view: 'folder', folder: 'inbox' })} />}
        <h2 className="settings-title">Settings</h2>
      </div>
      <div className="settings-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={current === t.id}
            className={`settings-tab ${current === t.id ? 'is-active' : ''}`}
            onClick={() => navigate({ view: 'settings', tab: t.id }, true)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="settings-scroll">
        {current === 'general' && <General />}
        {current === 'labels' && <Labels />}
        {current === 'inbox' && <Inbox />}
        {current === 'themes' && <Themes />}
        {current === 'data' && <Data />}
      </div>
    </section>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <div className="set-label">
        <div className="set-title">{title}</div>
        {hint && <div className="set-hint">{hint}</div>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function useSetting<K extends keyof SettingsT>(key: K): [SettingsT[K], (v: SettingsT[K]) => void] {
  const value = useMail((s) => s.settings[key]);
  const update = useMail((s) => s.updateSettings);
  return [value, (v) => update({ [key]: v } as Partial<SettingsT>)];
}

function Radios<T extends string | number>({ name, value, options, onChange }: { name: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="radios" role="radiogroup">
      {options.map((o) => (
        <label key={String(o.value)} className={`radio ${o.value === value ? 'is-on' : ''}`}>
          <input type="radio" name={name} checked={o.value === value} onChange={() => onChange(o.value)} />
          <span className="qs-radio" aria-hidden />
          {o.label}
        </label>
      ))}
    </div>
  );
}

function General() {
  const [displayName, setDisplayName] = useSetting('displayName');
  const [signature, setSignature] = useSetting('signature');
  const [undo, setUndo] = useSetting('undoSeconds');
  const [pageSize, setPageSize] = useSetting('pageSize');
  const [smartReply, setSmartReply] = useSetting('smartReply');
  const [shortcuts, setShortcuts] = useSetting('shortcuts');
  const [hover, setHover] = useSetting('hoverActions');
  const [advance, setAdvance] = useSetting('autoAdvance');
  const [importance, setImportance] = useSetting('importanceMarkers');
  const [density, setDensity] = useSetting('density');
  const [name, setName] = useState(displayName);
  const [sig, setSig] = useState(signature);
  useEffect(() => setName(displayName), [displayName]);
  useEffect(() => setSig(signature), [signature]);
  const dirty = name !== displayName || sig !== signature;
  return (
    <div className="set-group">
      <Row title="Your name" hint="Shown to people you email.">
        <input className="set-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </Row>
      <Row title="Signature" hint="Appended at the end of new messages and replies.">
        <textarea className="set-textarea" rows={4} value={sig} onChange={(e) => setSig(e.target.value)} />
      </Row>
      {dirty && (
        <div className="set-save">
          <button type="button" className="btn btn-text" onClick={() => { setName(displayName); setSig(signature); }}>Cancel</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDisplayName(name.trim() || displayName);
              setSignature(sig);
              useUI.getState().showToast('Your preferences have been saved.');
            }}
          >
            Save changes
          </button>
        </div>
      )}
      <Row title="Undo send" hint="Cancel a message for a few seconds after you press Send.">
        <select className="set-select" value={undo} onChange={(e) => setUndo(Number(e.target.value))}>
          {[0, 5, 10, 20, 30].map((s) => <option key={s} value={s}>{s === 0 ? 'Off' : `${s} seconds`}</option>)}
        </select>
      </Row>
      <Row title="Maximum page size" hint="Conversations shown per page.">
        <select className="set-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); useUI.getState().setPage(0); }}>
          {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </Row>
      <Row title="Density">
        <Radios name="density" value={density} onChange={setDensity} options={[{ value: 'default', label: 'Default' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
      </Row>
      <Row title="Auto-advance" hint="After archiving, deleting or muting a conversation, go to:">
        <Radios name="advance" value={advance} onChange={setAdvance} options={[{ value: 'list', label: 'Back to the list' }, { value: 'newer', label: 'Newer conversation' }, { value: 'older', label: 'Older conversation' }]} />
      </Row>
      <Row title="Smart reply" hint="Suggest short replies when available.">
        <Switch checked={smartReply} onChange={setSmartReply} label="Smart reply" />
      </Row>
      <Row title="Keyboard shortcuts" hint="Press ? anywhere to see the list.">
        <Switch checked={shortcuts} onChange={setShortcuts} label="Keyboard shortcuts" />
      </Row>
      <Row title="Hover actions" hint="Show archive, delete, read and snooze buttons when hovering a row.">
        <Switch checked={hover} onChange={setHover} label="Hover actions" />
      </Row>
      <Row title="Importance markers" hint="Show the importance arrow next to conversations.">
        <Switch checked={importance} onChange={setImportance} label="Importance markers" />
      </Row>
    </div>
  );
}

function Labels() {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const update = useMail((s) => s.updateLabel);
  const counts: Record<string, number> = {};
  for (const t of Object.values(threads)) if (!t.trashed) for (const l of t.labels) counts[l] = (counts[l] ?? 0) + 1;
  return (
    <div className="set-group">
      <div className="set-labels-head">
        <h2>Labels</h2>
        <button type="button" className="btn btn-tonal" onClick={() => useUI.getState().set({ labelDialog: { mode: 'create' } })}>Create new label</button>
      </div>
      <table className="label-table">
        <thead>
          <tr><th>Name</th><th>Conversations</th><th>Show in label list</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {labels.map((l) => (
            <tr key={l.id}>
              <td>
                <span className="label-swatch" style={{ background: l.color }} />
                <button type="button" className="link-btn" onClick={() => navigate({ view: 'label', labelId: l.id })}>{l.name}</button>
              </td>
              <td>{counts[l.id] ?? 0}</td>
              <td>
                <div className="seg">
                  <button type="button" className={!l.hidden ? 'is-on' : ''} onClick={() => update(l.id, { hidden: false })}>show</button>
                  <button type="button" className={l.hidden ? 'is-on' : ''} onClick={() => update(l.id, { hidden: true })}>hide</button>
                </div>
              </td>
              <td className="label-actions">
                <button type="button" className="link-btn" onClick={() => useUI.getState().set({ labelDialog: { mode: 'edit', labelId: l.id } })}>edit</button>
                <button
                  type="button"
                  className="link-btn is-danger"
                  onClick={() => {
                    if (window.confirm(`Remove the label “${l.name}”? Conversations won’t be deleted.`)) {
                      useMail.getState().deleteLabel(l.id);
                      useUI.getState().showToast(`Label “${l.name}” removed.`);
                    }
                  }}
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="set-note">Tip: drag conversations from the list onto a label in the sidebar to move them there.</p>
      <div className="set-palette" aria-hidden>
        {LABEL_PALETTE.map((p) => <span key={p.color} style={{ background: p.color }} />)}
      </div>
    </div>
  );
}

function Inbox() {
  const [categories, setCategories] = useSetting('categories');
  const [sort, setSort] = useSetting('inboxSort');
  const [pane, setPane] = useSetting('readingPane');
  return (
    <div className="set-group">
      <Row title="Inbox type" hint="Categories split your inbox into Primary, Promotions, Social and Updates tabs.">
        <div className="set-stack">
          <label className="qs-switch"><span>Use category tabs</span><Switch checked={categories} onChange={setCategories} label="Category tabs" /></label>
          <Radios
            name="sort"
            value={sort}
            onChange={setSort}
            options={[{ value: 'default', label: 'Newest first' }, { value: 'unreadFirst', label: 'Unread first' }, { value: 'starredFirst', label: 'Starred first' }]}
          />
        </div>
      </Row>
      <Row title="Reading pane" hint="Open conversations next to the list on wide screens.">
        <Radios name="pane" value={pane} onChange={setPane} options={[{ value: 'none', label: 'No split' }, { value: 'right', label: 'Right of inbox' }]} />
      </Row>
    </div>
  );
}

function Themes() {
  const [theme, setTheme] = useSetting('theme');
  const [tint, setTint] = useSetting('tint');
  return (
    <div className="set-group">
      <Row title="Appearance">
        <div className="qs-themes qs-themes-lg">
          {(['light', 'dark', 'system'] as const).map((t) => (
            <button key={t} type="button" className={`qs-theme qs-theme-${t} ${theme === t ? 'is-on' : ''}`} onClick={() => setTheme(t)} aria-pressed={theme === t}>
              <span className="qs-theme-art" aria-hidden />
              <span>{t === 'system' ? 'Device default' : t[0].toUpperCase() + t.slice(1)}</span>
            </button>
          ))}
        </div>
      </Row>
      <Row title="Background" hint="A subtle tint behind the mail list.">
        <div className="tint-cards">
          {TINTS.map((t) => (
            <button key={t.id} type="button" className={`tint-card ${tint === t.id ? 'is-on' : ''}`} onClick={() => setTint(t.id)} style={{ '--tint-l': t.light, '--tint-d': t.dark } as CSSProperties} aria-pressed={tint === t.id}>
              <span className="tint-card-art" aria-hidden>{tint === t.id && <MdCheck />}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}

function Data() {
  const threads = useMail((s) => s.threads);
  const drafts = useMail((s) => s.drafts);
  const reset = useMail((s) => s.resetMailbox);
  const count = Object.keys(threads).length;
  const messages = Object.values(threads).reduce((n, t) => n + t.messages.length, 0);
  let bytes = 0;
  try {
    bytes = (localStorage.getItem('opus-mail') ?? '').length * 2;
  } catch {
    bytes = 0;
  }
  const exportJson = () => {
    const s = useMail.getState();
    const blob = new Blob([JSON.stringify({ threads: s.threads, drafts: s.drafts, labels: s.labels, tasks: s.tasks, events: s.events }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mailbox-export.json';
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <div className="set-group">
      <Row title="Stored on this device" hint="Everything lives in your browser’s local storage. Nothing is sent to a server.">
        <div className="set-stats">
          <div><b>{count}</b><span>conversations</span></div>
          <div><b>{messages}</b><span>messages</span></div>
          <div><b>{Object.keys(drafts).length}</b><span>drafts</span></div>
          <div><b>{(bytes / 1024).toFixed(0)} KB</b><span>used</span></div>
        </div>
      </Row>
      <Row title="Export" hint="Download a JSON copy of your mailbox, labels, tasks and events.">
        <button type="button" className="btn btn-outline" onClick={exportJson}><MdOutlineFileDownload aria-hidden /> Export mailbox</button>
      </Row>
      <Row title="Reset demo mailbox" hint="Restores the original seeded conversations and discards your local changes.">
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm('Reset the mailbox to its original demo state? Your local changes will be lost.')) {
              reset();
              useUI.getState().clearSelection();
              useUI.getState().set({ composes: [] });
              navigate({ view: 'folder', folder: 'inbox' });
              useUI.getState().showToast('Mailbox reset to demo data.');
            }
          }}
        >
          <MdOutlineRefresh aria-hidden /> Reset mailbox
        </button>
      </Row>
    </div>
  );
}

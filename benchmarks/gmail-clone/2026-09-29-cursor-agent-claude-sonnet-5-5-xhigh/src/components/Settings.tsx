import { useEffect, useState } from 'react';
import { Check, Download, Monitor, Moon, Plus, RotateCcw, Sun, Trash2, X } from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import { navigate } from '../lib/router';
import type { Accent, Category, Density, Pane, Theme } from '../lib/types';
import { LABEL_COLORS, readableOn } from '../lib/text';
import { formatSize } from '../lib/date';
import { storageUsed } from '../lib/selectors';
import { IconButton, Switch } from './primitives';
import { signatureHtml } from '../lib/store';

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'blue', label: 'Blue', color: '#0b57d0' },
  { id: 'violet', label: 'Violet', color: '#6b46e5' },
  { id: 'teal', label: 'Teal', color: '#0a7c86' },
  { id: 'rose', label: 'Rose', color: '#c2185b' },
  { id: 'amber', label: 'Amber', color: '#b26a00' },
];

function Radio<T extends string>({ value, current, onChange, label, children }: { value: T; current: T; onChange: (v: T) => void; label: string; children?: React.ReactNode }) {
  const on = value === current;
  return (
    <button type="button" role="radio" aria-checked={on} className={`radio-card ${on ? 'is-on' : ''}`} onClick={() => onChange(value)}>
      <span className="radio-card__dot">{on ? <span /> : null}</span>
      <span className="radio-card__body">
        <span className="radio-card__label">{label}</span>
        {children}
      </span>
    </button>
  );
}

export function AppearanceControls() {
  const s = useMail((st) => st.settings);
  const set = useMail((st) => st.setSettings);
  return (
    <>
      <section className="qs-section">
        <h3>Theme</h3>
        <div className="theme-grid" role="radiogroup" aria-label="Theme">
          {(
            [
              ['light', 'Light', <Sun size={18} key="s" />],
              ['dark', 'Dark', <Moon size={18} key="m" />],
              ['system', 'System', <Monitor size={18} key="o" />],
            ] as [Theme, string, React.ReactNode][]
          ).map(([id, label, icon]) => (
            <button key={id} type="button" role="radio" aria-checked={s.theme === id} className={`theme-card theme-card--${id} ${s.theme === id ? 'is-on' : ''}`} onClick={() => set({ theme: id })}>
              <span className="theme-card__preview">
                <i />
                <i />
                <i />
              </span>
              <span className="theme-card__label">
                {icon}
                {label}
              </span>
            </button>
          ))}
        </div>
        <div className="accent-row" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={s.accent === a.id} aria-label={a.label} title={a.label} className={`accent-dot ${s.accent === a.id ? 'is-on' : ''}`} style={{ background: a.color }} onClick={() => set({ accent: a.id })}>
              {s.accent === a.id ? <Check size={14} strokeWidth={3} color="#fff" /> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="qs-section">
        <h3>Density</h3>
        <div className="radio-list" role="radiogroup" aria-label="Density">
          {(
            [
              ['default', 'Default'],
              ['comfortable', 'Comfortable'],
              ['compact', 'Compact'],
            ] as [Density, string][]
          ).map(([id, label]) => (
            <Radio key={id} value={id} current={s.density} onChange={(v) => set({ density: v })} label={label}>
              <span className={`density-preview density-preview--${id}`}>
                <i />
                <i />
                <i />
              </span>
            </Radio>
          ))}
        </div>
      </section>

      <section className="qs-section">
        <h3>Inbox type</h3>
        <div className="radio-list" role="radiogroup" aria-label="Inbox type">
          <Radio value="tabs" current={s.tabsEnabled ? 'tabs' : 'unified'} onChange={(v) => set({ tabsEnabled: v === 'tabs' })} label="Default with category tabs" />
          <Radio value="unified" current={s.tabsEnabled ? 'tabs' : 'unified'} onChange={(v) => set({ tabsEnabled: v === 'tabs' })} label="Everything in one list" />
        </div>
      </section>

      <section className="qs-section">
        <h3>Reading pane</h3>
        <div className="radio-list" role="radiogroup" aria-label="Reading pane">
          {(
            [
              ['off', 'No split'],
              ['right', 'Right of inbox'],
            ] as [Pane, string][]
          ).map(([id, label]) => (
            <Radio key={id} value={id} current={s.pane} onChange={(v) => set({ pane: v })} label={label}>
              {id === 'right' ? <span className="muted-note">Wide screens only</span> : null}
            </Radio>
          ))}
        </div>
      </section>
    </>
  );
}

export function QuickSettings() {
  const open = useUI((s) => s.quickSettings);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') useUI.getState().set({ quickSettings: false });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  if (!open) return null;
  const close = () => useUI.getState().set({ quickSettings: false });
  return (
    <>
      <div className="qs-scrim" onClick={close} />
      <aside className="qs" role="dialog" aria-label="Quick settings">
        <div className="qs__head">
          <h2>Quick settings</h2>
          <IconButton label="Close settings" onClick={close}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="qs__body">
          <button
            type="button"
            className="btn btn--outline btn--block"
            onClick={() => {
              close();
              navigate({ view: 'settings', param: 'general' });
            }}
          >
            See all settings
          </button>
          <AppearanceControls />
        </div>
      </aside>
    </>
  );
}

const TABS = [
  ['general', 'General'],
  ['labels', 'Labels'],
  ['inbox', 'Inbox'],
  ['signature', 'Signature'],
  ['appearance', 'Appearance'],
  ['data', 'Data'],
] as const;

function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="setting">
      <div className="setting__text">
        <div className="setting__title">{title}</div>
        {desc ? <div className="setting__desc">{desc}</div> : null}
      </div>
      <div className="setting__control">{children}</div>
    </div>
  );
}

function LabelsTab() {
  const labels = useMail((s) => s.labels);
  const update = useMail((s) => s.updateLabel);
  const [colorFor, setColorFor] = useState<string | null>(null);
  return (
    <div>
      <div className="settings__toolbar">
        <p>Labels help you organize conversations. Drag conversations onto a label in the sidebar to apply it.</p>
        <button type="button" className="btn btn--primary" onClick={() => useUI.getState().set({ labelDialog: {} })}>
          <Plus size={16} /> Create new label
        </button>
      </div>
      <table className="label-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>Show in label list</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {labels.map((l) => (
            <tr key={l.id}>
              <td>
                <div className="label-table__name">
                  <button type="button" className="label-dot" style={{ background: l.color }} aria-label={`Change color of ${l.name}`} onClick={() => setColorFor(colorFor === l.id ? null : l.id)} />
                  <input value={l.name} aria-label={`Rename ${l.name}`} onChange={(e) => update(l.id, { name: e.target.value })} onBlur={(e) => !e.target.value.trim() && update(l.id, { name: 'Untitled' })} />
                </div>
                {colorFor === l.id ? (
                  <div className="swatches swatches--inline">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={`swatch ${l.color === c ? 'is-on' : ''}`}
                        aria-label={c}
                        style={{ background: c, color: readableOn(c) }}
                        onClick={() => {
                          update(l.id, { color: c });
                          setColorFor(null);
                        }}
                      >
                        {l.color === c ? <Check size={14} strokeWidth={3} /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </td>
              <td>
                <Switch checked={!l.hidden} label={`Show ${l.name} in label list`} onChange={(v) => update(l.id, { hidden: !v })} />
              </td>
              <td>
                <button
                  type="button"
                  className="text-btn text-btn--danger"
                  onClick={() => {
                    const undo = useMail.getState().deleteLabel(l.id);
                    useUI.getState().toast(`Label “${l.name}” removed.`, [{ label: 'Undo', run: undo }]);
                  }}
                >
                  <Trash2 size={14} /> Remove
                </button>
              </td>
            </tr>
          ))}
          {!labels.length ? (
            <tr>
              <td colSpan={3} className="muted-note">
                No labels yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

export function SettingsPage({ tab }: { tab?: string }) {
  const s = useMail((st) => st.settings);
  const set = useMail((st) => st.setSettings);
  const used = useMail((st) => storageUsed(st));
  const current = TABS.some(([id]) => id === tab) ? (tab as (typeof TABS)[number][0]) : 'general';

  const exportData = () => {
    const st = useMail.getState();
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), threads: st.threads, messages: st.messages, drafts: st.drafts, labels: st.labels }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mailbox-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="settings">
      <div className="settings__head">
        <h2>Settings</h2>
        <IconButton label="Close settings" onClick={() => navigate({ view: 'inbox' })}>
          <X size={20} />
        </IconButton>
      </div>
      <div className="settings__tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={current === id} className={`settings__tab ${current === id ? 'is-active' : ''}`} onClick={() => navigate({ view: 'settings', param: id })}>
            {label}
          </button>
        ))}
      </div>
      <div className="settings__body" role="tabpanel">
        {current === 'general' ? (
          <div className="settings__list">
            <Row title="Undo send" desc="Keep the option to take back a message for a few seconds after you press Send.">
              <select value={s.undoSendSeconds} aria-label="Undo send cancellation period" onChange={(e) => set({ undoSendSeconds: +e.target.value })}>
                {[0, 5, 10, 20, 30].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? 'Off' : `${n} seconds`}
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Default reply behavior" desc="Used by the main Reply action at the bottom of a conversation.">
              <div className="seg" role="radiogroup" aria-label="Default reply behavior">
                <button type="button" role="radio" aria-checked={!s.defaultReplyAll} className={!s.defaultReplyAll ? 'is-on' : ''} onClick={() => set({ defaultReplyAll: false })}>
                  Reply
                </button>
                <button type="button" role="radio" aria-checked={s.defaultReplyAll} className={s.defaultReplyAll ? 'is-on' : ''} onClick={() => set({ defaultReplyAll: true })}>
                  Reply all
                </button>
              </div>
            </Row>
            <Row title="After archiving or deleting" desc="Where to go once a conversation is out of your way.">
              <select value={s.afterAction} aria-label="After archiving or deleting" onChange={(e) => set({ afterAction: e.target.value as typeof s.afterAction })}>
                <option value="list">Back to the list</option>
                <option value="newer">Show newer conversation</option>
                <option value="older">Show older conversation</option>
              </select>
            </Row>
            <Row title="Conversations per page">
              <select value={s.pageSize} aria-label="Conversations per page" onChange={(e) => set({ pageSize: +e.target.value })}>
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    Show {n} conversations per page
                  </option>
                ))}
              </select>
            </Row>
            <Row title="Keyboard shortcuts" desc="Press ? anywhere to see the full list.">
              <Switch checked={s.shortcuts} label="Keyboard shortcuts" onChange={(v) => set({ shortcuts: v })} />
            </Row>
            <Row title="Show snippets" desc="Show a preview of the message beside its subject.">
              <Switch checked={s.showSnippets} label="Show snippets" onChange={(v) => set({ showSnippets: v })} />
            </Row>
            <Row title="Importance markers" desc="Show the bookmark marker beside conversations.">
              <Switch checked={s.showImportant} label="Importance markers" onChange={(v) => set({ showImportant: v })} />
            </Row>
            <Row title="Simulated replies" desc="Colleagues and family in this demo reply a few seconds after you write to them.">
              <Switch checked={s.autoReplies} label="Simulated replies" onChange={(v) => set({ autoReplies: v })} />
            </Row>
          </div>
        ) : null}

        {current === 'labels' ? <LabelsTab /> : null}

        {current === 'inbox' ? (
          <div className="settings__list">
            <Row title="Category tabs" desc="Sort mail into Primary, Promotions, Social, and Updates.">
              <Switch checked={s.tabsEnabled} label="Category tabs" onChange={(v) => set({ tabsEnabled: v })} />
            </Row>
            {(['promotions', 'social', 'updates'] as Category[]).map((c) => (
              <Row key={c} title={c[0].toUpperCase() + c.slice(1)} desc={`Show a ${c} tab. When off, ${c} mail lands in Primary.`}>
                <Switch checked={s.categories[c]} label={`${c} tab`} onChange={(v) => set({ categories: { ...s.categories, [c]: v } })} />
              </Row>
            ))}
          </div>
        ) : null}

        {current === 'signature' ? (
          <div className="settings__list">
            <Row title="Signature" desc="Added to new messages and replies.">
              <Switch checked={s.signatureEnabled} label="Use signature" onChange={(v) => set({ signatureEnabled: v })} />
            </Row>
            <div className="signature-editor">
              <textarea value={s.signature} rows={4} aria-label="Signature text" disabled={!s.signatureEnabled} onChange={(e) => set({ signature: e.target.value })} />
              <div className="signature-preview" dangerouslySetInnerHTML={{ __html: signatureHtml(s.signature) }} />
            </div>
          </div>
        ) : null}

        {current === 'appearance' ? (
          <div className="settings__appearance">
            <AppearanceControls />
          </div>
        ) : null}

        {current === 'data' ? (
          <div className="settings__list">
            <Row title="Storage" desc="Everything lives in this browser, so it works offline and stays private.">
              <span className="muted-note">{formatSize(used)} of message data</span>
            </Row>
            <Row title="Recent searches" desc="Search suggestions you have used before.">
              <button type="button" className="btn btn--outline" onClick={() => useMail.setState({ recentSearches: [] })}>
                Clear
              </button>
            </Row>
            <Row title="Export mailbox" desc="Download all conversations, drafts, and labels as JSON.">
              <button type="button" className="btn btn--outline" onClick={exportData}>
                <Download size={16} /> Export
              </button>
            </Row>
            <Row title="Reset demo data" desc="Restore the original sample messages. Your changes will be lost.">
              <button
                type="button"
                className="btn btn--danger"
                onClick={() =>
                  useUI.getState().set({
                    confirm: {
                      title: 'Reset demo mailbox?',
                      body: 'This restores the original sample messages and removes your changes, drafts, and labels.',
                      confirmLabel: 'Reset mailbox',
                      cancelLabel: 'Cancel',
                      onConfirm: () => {
                        useMail.getState().resetData();
                        useUI.setState({ selected: [], compose: [] });
                        useUI.getState().toast('Mailbox reset to the original sample data.');
                      },
                    },
                  })
                }
              >
                <RotateCcw size={16} /> Reset
              </button>
            </Row>
          </div>
        ) : null}
      </div>
    </div>
  );
}

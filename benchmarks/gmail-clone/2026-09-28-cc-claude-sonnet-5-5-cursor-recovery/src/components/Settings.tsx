import { useMemo, type ReactNode } from 'react';
import { Icon, IconButton } from './kit';
import { useMail } from '../lib/store';
import { confirmDialog, openDialog, toast } from '../lib/ui';
import { confirmReset, deleteLabel, updateSettings } from '../lib/actions';
import { useViewModel } from '../lib/viewModel';
import { navigate } from '../lib/router';
import { formatSize } from '../lib/files';
import { getState } from '../lib/store';
import type { AccentId, CategoryId, Density, ReadingPane, Settings as S, ThemeMode } from '../lib/types';

const TABS: { id: string; label: string; icon: string }[] = [
  { id: 'general', label: 'General', icon: 'tune' },
  { id: 'inbox', label: 'Inbox', icon: 'inbox' },
  { id: 'labels', label: 'Labels', icon: 'label' },
  { id: 'appearance', label: 'Themes', icon: 'palette' },
  { id: 'signature', label: 'Signature', icon: 'draw' },
  { id: 'data', label: 'Data & storage', icon: 'database' },
];

function Row({ title, desc, children, htmlFor }: { title: string; desc?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="set-row">
      <div className="set-text">
        <label className="set-title" htmlFor={htmlFor}>
          {title}
        </label>
        {desc && <div className="set-desc">{desc}</div>}
      </div>
      <div className="set-control">{children}</div>
    </div>
  );
}

function Toggle({ id, checked, onChange, label, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}

function OptionCards<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; icon: string; sub?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="option-cards" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className={`option-card${value === o.value ? ' on' : ''}`} onClick={() => onChange(o.value)}>
          <Icon name={o.icon} />
          <span className="oc-title">{o.label}</span>
          {o.sub && <span className="oc-sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

const ACCENTS: { id: AccentId; color: string; label: string }[] = [
  { id: 'blue', color: '#0b57d0', label: 'Blue' },
  { id: 'coral', color: '#d9482b', label: 'Coral' },
  { id: 'green', color: '#188038', label: 'Green' },
  { id: 'violet', color: '#6750a4', label: 'Violet' },
];

function General({ s }: { s: S }) {
  return (
    <>
      <Row title="Undo send" desc="Time to cancel a message after you press Send." htmlFor="set-undo">
        <select id="set-undo" className="input select" value={s.undoSendSeconds} onChange={(e) => updateSettings({ undoSendSeconds: Number(e.target.value) as S['undoSendSeconds'] })}>
          {[5, 10, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n} seconds
            </option>
          ))}
        </select>
      </Row>
      <Row title="Keyboard shortcuts" desc="Single-key shortcuts such as c to compose or e to archive.">
        <div className="set-inline">
          <Toggle id="set-kb" checked={s.keyboardShortcuts} onChange={(v) => updateSettings({ keyboardShortcuts: v })} label="Keyboard shortcuts" />
          <button type="button" className="btn text" onClick={() => openDialog({ kind: 'shortcuts' })}>
            View shortcuts
          </button>
        </div>
      </Row>
      <Row title="Hover actions" desc="Show archive, delete, snooze and read/unread buttons when you hover over a conversation.">
        <Toggle id="set-hover" checked={s.hoverActions} onChange={(v) => updateSettings({ hoverActions: v })} label="Hover actions" />
      </Row>
      <Row title="Conversation snippets" desc="Show a preview of the message text next to the subject.">
        <Toggle id="set-snip" checked={s.previewSnippets} onChange={(v) => updateSettings({ previewSnippets: v })} label="Conversation snippets" />
      </Row>
      <Row title="Smart reply" desc="Suggest short replies at the bottom of a conversation.">
        <Toggle id="set-smart" checked={s.smartReplies} onChange={(v) => updateSettings({ smartReplies: v })} label="Smart reply" />
      </Row>
      <Row title="Auto-advance" desc="After you archive or delete a conversation, go to:" htmlFor="set-adv">
        <select id="set-adv" className="input select" value={s.autoAdvance} onChange={(e) => updateSettings({ autoAdvance: e.target.value as S['autoAdvance'] })}>
          <option value="list">The conversation list</option>
          <option value="newer">The next newer conversation</option>
          <option value="older">The next older conversation</option>
        </select>
      </Row>
      <Row title="Simulate incoming mail" desc="Every minute or so a new message from a contact arrives, so you can see notifications and unread counts change live. Contacts also reply to messages you send.">
        <Toggle id="set-sim" checked={s.simulateIncoming} onChange={(v) => updateSettings({ simulateIncoming: v })} label="Simulate incoming mail" />
      </Row>
    </>
  );
}

function InboxSettings({ s }: { s: S }) {
  const cats: { id: CategoryId; label: string; desc: string }[] = [
    { id: 'promotions', label: 'Promotions', desc: 'Deals, offers and other marketing emails' },
    { id: 'social', label: 'Social', desc: 'Messages from social networks and media-sharing sites' },
    { id: 'updates', label: 'Updates', desc: 'Receipts, bills, statements and confirmations' },
  ];
  return (
    <>
      <Row title="Reading pane" desc="Read conversations next to your list instead of on their own page (desktop only).">
        <OptionCards<ReadingPane>
          label="Reading pane"
          value={s.readingPane}
          onChange={(readingPane) => updateSettings({ readingPane })}
          options={[
            { value: 'off', label: 'No split', icon: 'view_agenda' },
            { value: 'right', label: 'Right of inbox', icon: 'vertical_split' },
          ]}
        />
      </Row>
      <div className="set-group-title">Inbox categories</div>
      <Row title="Primary" desc="Person-to-person conversations and anything that isn’t in another tab. Always on.">
        <Toggle id="cat-primary" checked disabled onChange={() => {}} label="Primary (always on)" />
      </Row>
      {cats.map((c) => (
        <Row key={c.id} title={c.label} desc={c.desc}>
          <Toggle id={`cat-${c.id}`} checked={s.categoriesEnabled[c.id]} onChange={(v) => updateSettings({ categoriesEnabled: { ...s.categoriesEnabled, [c.id]: v } })} label={c.label} />
        </Row>
      ))}
    </>
  );
}

function LabelsSettings() {
  const mail = useMail();
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of Object.values(mail.threads)) for (const l of t.labelIds) c[l] = (c[l] ?? 0) + 1;
    return c;
  }, [mail.threads]);
  return (
    <>
      <div className="set-head-row">
        <p className="set-lead">Labels keep conversations organized. Apply as many as you like to a conversation.</p>
        <button type="button" className="btn outline" onClick={() => openDialog({ kind: 'label' })}>
          <Icon name="add" size="sm" /> Create new label
        </button>
      </div>
      <div className="label-table">
        {mail.labels.map((l) => (
          <div key={l.id} className="label-row">
            <span className="label-dot big" style={{ background: l.color }} />
            <a className="label-name" href={`#/label/${encodeURIComponent(l.id)}`}>
              {l.name}
            </a>
            <span className="label-count">
              {counts[l.id] ?? 0} conversation{(counts[l.id] ?? 0) === 1 ? '' : 's'}
            </span>
            <span className="tb-spacer" />
            <IconButton small icon="edit" label={`Edit ${l.name}`} onClick={() => openDialog({ kind: 'label', labelId: l.id })} />
            <IconButton
              small
              icon="delete"
              label={`Remove ${l.name}`}
              onClick={() =>
                confirmDialog({ title: 'Remove label?', body: `Delete the label “${l.name}”? Conversations that use it are not deleted.`, confirmLabel: 'Remove', danger: true }, () => deleteLabel(l.id))
              }
            />
          </div>
        ))}
        {!mail.labels.length && <div className="picker-empty">You haven’t created any labels yet.</div>}
      </div>
    </>
  );
}

function Appearance({ s }: { s: S }) {
  return (
    <>
      <Row title="Theme" desc="Match your device, or pick light or dark.">
        <OptionCards<ThemeMode>
          label="Theme"
          value={s.theme}
          onChange={(theme) => updateSettings({ theme })}
          options={[
            { value: 'light', label: 'Light', icon: 'light_mode' },
            { value: 'dark', label: 'Dark', icon: 'dark_mode' },
            { value: 'system', label: 'System', icon: 'contrast' },
          ]}
        />
      </Row>
      <Row title="Accent color" desc="Used for selections, buttons and links.">
        <div className="swatches" role="radiogroup" aria-label="Accent color">
          {ACCENTS.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={s.accent === a.id} aria-label={a.label} data-tip={a.label} className={`swatch${s.accent === a.id ? ' on' : ''}`} style={{ background: a.color }} onClick={() => updateSettings({ accent: a.id })}>
              {s.accent === a.id && <Icon name="check" size="sm" />}
            </button>
          ))}
        </div>
      </Row>
      <Row title="Density" desc="How much room each conversation row takes.">
        <OptionCards<Density>
          label="Density"
          value={s.density}
          onChange={(density) => updateSettings({ density })}
          options={[
            { value: 'default', label: 'Default', icon: 'density_medium' },
            { value: 'comfortable', label: 'Comfortable', icon: 'density_large' },
            { value: 'compact', label: 'Compact', icon: 'density_small' },
          ]}
        />
      </Row>
    </>
  );
}

function Signature({ s }: { s: S }) {
  return (
    <>
      <Row title="Signature" desc="Added to the end of new messages and replies.">
        <Toggle id="set-sig" checked={s.signatureEnabled} onChange={(v) => updateSettings({ signatureEnabled: v })} label="Signature" />
      </Row>
      <div className="sig-editor">
        <label className="set-title" htmlFor="sig-text">
          Signature text
        </label>
        <textarea id="sig-text" className="input textarea" rows={5} value={s.signature} onChange={(e) => updateSettings({ signature: e.target.value })} disabled={!s.signatureEnabled} maxLength={600} />
        <div className="sig-preview" aria-label="Signature preview">
          <div className="sig-preview-title">Preview</div>
          <div className="sig-preview-body">
            <span>-- </span>
            {(s.signature || 'No signature').split('\n').map((l, i) => (
              <div key={i}>{l || '\u00a0'}</div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Data() {
  const mail = useMail();
  const stats = useMemo(() => {
    let messages = 0;
    let bytes = 0;
    for (const t of Object.values(mail.threads)) {
      for (const m of t.messages) {
        messages++;
        bytes += m.html.length + m.text.length;
        for (const a of m.attachments) if (a.dataUrl) bytes += a.dataUrl.length;
      }
    }
    return { threads: Object.keys(mail.threads).length, messages, bytes };
  }, [mail.threads]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mailbox-export.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast('Mailbox exported.');
  };

  return (
    <>
      <Row title="Local storage" desc="Everything in this mailbox is stored in this browser only. Nothing is sent anywhere.">
        <div className="stat-line">
          <strong>{stats.threads}</strong> conversations · <strong>{stats.messages}</strong> messages · about {formatSize(stats.bytes)}
        </div>
      </Row>
      <Row title="Export mailbox" desc="Download all conversations, labels and settings as JSON.">
        <button type="button" className="btn outline" onClick={exportJson}>
          <Icon name="download" size="sm" /> Export
        </button>
      </Row>
      <Row title="Reset mailbox" desc="Restore the original demo messages, labels and settings.">
        <button type="button" className="btn outline danger-text" onClick={confirmReset}>
          <Icon name="restart_alt" size="sm" /> Reset
        </button>
      </Row>
    </>
  );
}

export function SettingsPage() {
  const vm = useViewModel();
  const mail = useMail();
  const tab = vm.route.page === 'settings' ? vm.route.tab : 'general';
  const current = TABS.find((t) => t.id === tab) ?? TABS[0];
  const s = mail.settings;
  return (
    <section className="settings" aria-label="Settings">
      <div className="settings-head">
        <IconButton icon="arrow_back" label="Back to Inbox" onClick={() => navigate('#/inbox')} />
        <h2>Settings</h2>
      </div>
      <div className="settings-body">
        <nav className="settings-nav" aria-label="Settings sections">
          {TABS.map((t) => (
            <a key={t.id} href={`#/settings/${t.id}`} className={`settings-tab${t.id === current.id ? ' active' : ''}`} aria-current={t.id === current.id ? 'page' : undefined}>
              <Icon name={t.icon} fill={t.id === current.id} />
              <span>{t.label}</span>
            </a>
          ))}
        </nav>
        <div className="settings-content">
          <h3 className="settings-section-title">{current.label}</h3>
          {current.id === 'general' && <General s={s} />}
          {current.id === 'inbox' && <InboxSettings s={s} />}
          {current.id === 'labels' && <LabelsSettings />}
          {current.id === 'appearance' && <Appearance s={s} />}
          {current.id === 'signature' && <Signature s={s} />}
          {current.id === 'data' && <Data />}
        </div>
      </div>
    </section>
  );
}

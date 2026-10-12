import { useEffect, useRef, useState } from 'react';
import { MdAdd, MdArrowBack, MdDeleteOutline, MdEdit, MdFileDownload, MdRestartAlt } from 'react-icons/md';
import type { Category } from '../types';
import { useIsMobile } from '../hooks';
import { CATEGORY_NAMES, type InboxType } from '../lib/mailbox';
import { navigate, type SettingsTab } from '../lib/router';
import { cn, downloadBlob, formatSize, sanitizeHtml } from '../lib/utils';
import { LABEL_COLORS } from '../lib/visuals';
import { useMail } from '../store/mail';
import { useSettings, type SwipeAction } from '../store/settings';
import { confirmDialog, showToast, ui } from '../store/ui';
import { Button, IconButton, Radio, Toggle } from './ui';

const TABS: Array<[SettingsTab, string]> = [
  ['general', 'General'],
  ['labels', 'Labels'],
  ['inbox', 'Inbox'],
  ['advanced', 'Advanced'],
];

export function SettingsPage({ tab }: { tab: SettingsTab }) {
  const isMobile = useIsMobile();
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="settings">
      <div className="flex h-14 shrink-0 items-center gap-2 px-2 md:px-4">
        <IconButton icon={MdArrowBack} label="Back to Inbox" onClick={() => navigate({ view: 'folder', folder: 'inbox' })} />
        <h2 className="text-[22px] text-fg">Settings</h2>
      </div>
      <nav className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line px-2 md:px-6" role="tablist" aria-label="Settings sections">
        {TABS.map(([id, name]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => navigate({ view: 'settings', tab: id }, { replace: true })}
            className={cn(
              'relative h-11 shrink-0 px-4 text-sm font-medium',
              tab === id ? 'text-accent-text after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-t-full after:bg-accent' : 'text-fg2 hover:bg-hover',
            )}
          >
            {name}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className={cn('mx-auto max-w-4xl pb-24', isMobile ? 'px-4' : 'px-8')}>
          {tab === 'general' && <General />}
          {tab === 'labels' && <LabelsTab />}
          {tab === 'inbox' && <InboxTab />}
          {tab === 'advanced' && <Advanced />}
        </div>
      </div>
    </div>
  );
}

function Row({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3 border-b border-line py-5 md:grid-cols-[240px_1fr] md:gap-8">
      <div>
        <div className="text-sm font-medium text-fg">{title}</div>
        {hint && <div className="mt-0.5 text-xs text-fg3">{hint}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Select<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: Array<[T, string]>; label: string }) {
  return (
    <select
      aria-label={label}
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const match = options.find(([v]) => String(v) === raw);
        if (match) onChange(match[0]);
      }}
      className="h-9 rounded-lg border border-line-strong bg-panel px-2 text-sm text-fg outline-none focus:border-accent"
    >
      {options.map(([v, l]) => (
        <option key={String(v)} value={String(v)}>
          {l}
        </option>
      ))}
    </select>
  );
}

function ToggleRow({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div>
        <div className="text-sm text-fg">{label}</div>
        {hint && <div className="text-xs text-fg3">{hint}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

const SWIPE_OPTIONS: Array<[SwipeAction, string]> = [
  ['archive', 'Archive'],
  ['trash', 'Delete'],
  ['read', 'Mark as read/unread'],
  ['star', 'Star'],
  ['none', 'None'],
];

function General() {
  const s = useSettings();
  const [name, setName] = useState(s.displayName);
  const sigRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sigRef.current && sigRef.current.innerHTML !== s.signature) sigRef.current.innerHTML = s.signature;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div>
      <Row title="Name" hint="Shown on messages you send.">
        <div className="flex max-w-md gap-2">
          <input
            aria-label="Display name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && s.update({ displayName: name.trim() })}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            className="h-9 flex-1 rounded-lg border border-line-strong bg-transparent px-3 text-sm text-fg outline-none focus:border-accent"
          />
        </div>
      </Row>
      <Row title="Maximum page size" hint="Conversations shown per page.">
        <Select label="Page size" value={s.pageSize} onChange={(v) => s.update({ pageSize: v })} options={[10, 15, 20, 25, 50, 100].map((n) => [n, `${n} conversations`] as [number, string])} />
      </Row>
      <Row title="Undo send" hint="How long the Undo option stays available.">
        <Select label="Undo period" value={s.undoSeconds} onChange={(v) => s.update({ undoSeconds: v })} options={[5, 10, 20, 30].map((n) => [n, `${n} seconds`] as [number, string])} />
      </Row>
      <Row title="Default reply behavior">
        <Radio checked={s.defaultReply === 'reply'} onChange={() => s.update({ defaultReply: 'reply' })} label="Reply" />
        <Radio checked={s.defaultReply === 'replyAll'} onChange={() => s.update({ defaultReply: 'replyAll' })} label="Reply all" />
      </Row>
      <Row title="After archiving or deleting">
        <Radio checked={s.autoAdvance === 'list'} onChange={() => s.update({ autoAdvance: 'list' })} label="Go back to the list" />
        <Radio checked={s.autoAdvance === 'newer'} onChange={() => s.update({ autoAdvance: 'newer' })} label="Go to the next (newer) conversation" />
        <Radio checked={s.autoAdvance === 'older'} onChange={() => s.update({ autoAdvance: 'older' })} label="Go to the previous (older) conversation" />
      </Row>
      <Row title="Mail list">
        <ToggleRow checked={s.hoverActions} onChange={(v) => s.update({ hoverActions: v })} label="Hover actions" hint="Quick archive, delete, read and snooze on row hover." />
        <ToggleRow checked={s.snippets} onChange={(v) => s.update({ snippets: v })} label="Show snippets" hint="Preview a line of each message in the list." />
        <ToggleRow checked={s.importanceMarkers} onChange={(v) => s.update({ importanceMarkers: v })} label="Importance markers" />
      </Row>
      <Row title="Keyboard shortcuts" hint="Press ? anywhere to see them.">
        <ToggleRow checked={s.shortcuts} onChange={(v) => s.update({ shortcuts: v })} label="Keyboard shortcuts on" />
        <button type="button" className="mt-1 text-sm font-medium text-accent-text hover:underline" onClick={() => ui.set({ shortcutsOpen: true })}>
          View all shortcuts
        </button>
      </Row>
      <Row title="Swipe actions" hint="Used on touch devices.">
        <div className="flex flex-wrap gap-6">
          <label className="text-sm text-fg2">
            <span className="mb-1 block text-xs">Swipe right</span>
            <Select label="Swipe right" value={s.swipeRight} onChange={(v) => s.update({ swipeRight: v })} options={SWIPE_OPTIONS} />
          </label>
          <label className="text-sm text-fg2">
            <span className="mb-1 block text-xs">Swipe left</span>
            <Select label="Swipe left" value={s.swipeLeft} onChange={(v) => s.update({ swipeLeft: v })} options={SWIPE_OPTIONS} />
          </label>
        </div>
      </Row>
      <Row title="Signature" hint="Appended to new messages and replies.">
        <div
          ref={sigRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Signature"
          onBlur={(e) => s.update({ signature: sanitizeHtml(e.currentTarget.innerHTML).replace(/^(<br>)+|(<br>)+$/g, '') })}
          className="editor min-h-24 max-w-xl rounded-lg border border-line-strong p-3 text-sm text-fg focus:border-accent"
          data-placeholder="No signature"
        />
      </Row>
      <Row title="Demo activity" hint="Everything stays on this device.">
        <ToggleRow checked={s.simulateActivity} onChange={(v) => s.update({ simulateActivity: v })} label="Simulate incoming mail and replies" hint="New messages drip in every few minutes, and people you write to reply." />
      </Row>
    </div>
  );
}

function LabelsTab() {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const count = (id: string) => Object.values(threads).filter((t) => t.labelIds.includes(id) && !t.trashed && !t.spam).length;
  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-fg">Labels</h3>
        <Button variant="tonal" onClick={() => ui.set({ labelDialog: {} })}>
          <MdAdd size={18} /> Create new label
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-line bg-row-read px-4 py-2 text-xs font-medium text-fg3 md:grid-cols-[1fr_120px_140px_auto]">
          <span>Name</span>
          <span className="hidden md:block">Conversations</span>
          <span>Show in list</span>
          <span className="w-20 text-right">Actions</span>
        </div>
        {labels.map((l) => (
          <div key={l.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 md:grid-cols-[1fr_120px_140px_auto]">
            <button type="button" className="flex min-w-0 items-center gap-3 text-left text-sm text-fg hover:underline" onClick={() => navigate({ view: 'label', labelId: l.id })}>
              <span className="size-3 shrink-0 rounded-full" style={{ background: LABEL_COLORS[l.color]?.dot }} />
              <span className="truncate">{l.name}</span>
            </button>
            <span className="hidden text-sm text-fg3 md:block">{count(l.id)}</span>
            <div className="flex gap-1 text-xs">
              {(['show', 'hide'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={v === 'hide' ? !!l.hidden : !l.hidden}
                  onClick={() => useMail.getState().updateLabel(l.id, { hidden: v === 'hide' })}
                  className={cn('rounded px-2 py-1', (v === 'hide') === !!l.hidden ? 'bg-accent-soft font-medium text-fg' : 'text-accent-text hover:bg-hover')}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="flex w-20 justify-end">
              <IconButton icon={MdEdit} label={`Edit ${l.name}`} size="sm" onClick={() => ui.set({ labelDialog: { labelId: l.id } })} />
              <IconButton
                icon={MdDeleteOutline}
                label={`Remove ${l.name}`}
                size="sm"
                onClick={() =>
                  confirmDialog({
                    title: 'Remove label',
                    message: `Remove the label "${l.name}"? Conversations keep everything else; only the label goes away.`,
                    confirmLabel: 'Remove',
                    danger: true,
                    onConfirm: () => {
                      useMail.getState().deleteLabel(l.id);
                      showToast(`Label "${l.name}" removed.`);
                    },
                  })
                }
              />
            </div>
          </div>
        ))}
        {!labels.length && <div className="px-4 py-6 text-center text-sm text-fg3">No labels yet.</div>}
      </div>
    </div>
  );
}

function InboxTab() {
  const s = useSettings();
  const cats: Array<Exclude<Category, 'primary'>> = ['social', 'promotions', 'updates'];
  const toggleCat = (c: Exclude<Category, 'primary'>, on: boolean) => s.update({ categories: on ? cats.filter((x) => x === c || s.categories.includes(x)) : s.categories.filter((x) => x !== c) });
  return (
    <div>
      <Row title="Inbox type">
        {(
          [
            ['default', 'Default', 'Primary conversations, newest first. Categories get their own tabs.'],
            ['important', 'Important first', 'Messages marked important appear in their own section on top.'],
            ['unread', 'Unread first', 'Unread messages float to the top.'],
            ['starred', 'Starred first', 'Starred messages get a section on top.'],
          ] as Array<[InboxType, string, string]>
        ).map(([k, l, d]) => (
          <Radio key={k} checked={s.inboxType === k} onChange={() => s.update({ inboxType: k })} label={l} description={d} />
        ))}
      </Row>
      <Row title="Categories" hint="Only works with the Default inbox type. Unchecked categories stay in Primary.">
        <div className={cn('space-y-1', s.inboxType !== 'default' && 'pointer-events-none opacity-50')}>
          <label className="flex items-center gap-3 py-1 text-sm text-fg3">
            <input type="checkbox" checked disabled className="size-4" /> Primary
          </label>
          {cats.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-3 py-1 text-sm text-fg">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={s.categories.includes(c)} onChange={(e) => toggleCat(c, e.target.checked)} />
              {CATEGORY_NAMES[c]}
            </label>
          ))}
        </div>
      </Row>
      <Row title="Reading pane" hint="Open conversations beside or below the list.">
        <Radio checked={s.readingPane === 'none'} onChange={() => s.update({ readingPane: 'none' })} label="No split" />
        <Radio checked={s.readingPane === 'right'} onChange={() => s.update({ readingPane: 'right' })} label="Right of inbox" />
        <Radio checked={s.readingPane === 'below'} onChange={() => s.update({ readingPane: 'below' })} label="Below inbox" />
      </Row>
      <Row title="Density">
        <Radio checked={s.density === 'default'} onChange={() => s.update({ density: 'default' })} label="Default" description="Shows attachment chips in the list." />
        <Radio checked={s.density === 'comfortable'} onChange={() => s.update({ density: 'comfortable' })} label="Comfortable" />
        <Radio checked={s.density === 'compact'} onChange={() => s.update({ density: 'compact' })} label="Compact" />
      </Row>
    </div>
  );
}

function Advanced() {
  const s = useSettings();
  const threads = useMail((st) => st.threads);
  const bytes = new Blob([localStorage.getItem('opus-mail-data') ?? '']).size;
  const total = Object.keys(threads).length;
  const messages = Object.values(threads).reduce((n, t) => n + t.messages.length, 0);
  return (
    <div>
      <Row title="Offline storage" hint="Your mailbox lives in this browser's local storage and works without a network.">
        <div className="text-sm text-fg2">
          {total} conversations · {messages} messages · {formatSize(bytes)} used
        </div>
        <div className="mt-2 h-1.5 max-w-sm overflow-hidden rounded-full bg-chip">
          <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (bytes / (5 * 1024 * 1024)) * 100)}%` }} />
        </div>
      </Row>
      <Row title="Export" hint="Download everything as JSON.">
        <Button
          variant="outlined"
          onClick={() => {
            const st = useMail.getState();
            const data = { exportedAt: new Date().toISOString(), threads: Object.values(st.threads), labels: st.labels, contacts: st.contacts };
            downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'mailbox-export.json');
          }}
        >
          <MdFileDownload size={18} /> Export mailbox
        </Button>
      </Row>
      <Row title="Reset" hint="Start over with a fresh demo mailbox and default settings.">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outlined"
            onClick={() =>
              confirmDialog({
                title: 'Restore default settings?',
                message: 'Theme, density, signature and other preferences go back to their defaults. Your mail is untouched.',
                confirmLabel: 'Restore defaults',
                onConfirm: () => {
                  s.resetSettings();
                  showToast('Settings restored to defaults.');
                },
              })
            }
          >
            <MdRestartAlt size={18} /> Restore default settings
          </Button>
          <Button
            variant="danger"
            onClick={() =>
              confirmDialog({
                title: 'Reset demo mailbox?',
                message: 'All conversations, drafts, labels and contacts will be replaced with the original sample data.',
                confirmLabel: 'Reset mailbox',
                danger: true,
                onConfirm: () => {
                  useMail.getState().reset();
                  ui.set({ composes: [], inline: null, selected: [] });
                  navigate({ view: 'folder', folder: 'inbox' });
                  showToast('Mailbox reset.');
                },
              })
            }
          >
            Reset mailbox
          </Button>
        </div>
      </Row>
    </div>
  );
}

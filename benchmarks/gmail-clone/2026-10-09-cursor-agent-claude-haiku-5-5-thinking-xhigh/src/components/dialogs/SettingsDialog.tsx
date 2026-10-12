import { useState, type FormEvent, type ReactNode } from 'react';
import { LABEL_COLORS, type Settings } from '../../domain/types';
import { storageBytes } from '../../domain/selectors';
import { cn } from '../../lib/cn';
import { formatBytes } from '../../lib/format';
import * as actions from '../../store/actions';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { LABEL_DOT } from '../labelStyles';
import { Button } from '../ui/Button';
import { Modal, Switch } from '../ui/primitives';

const FIELD = 'rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-primary';

export function SettingsDialog() {
  const open = useUI((s) => s.settingsOpen);
  const setOpen = useUI((s) => s.setSettingsOpen);
  if (!open) return null;
  return <SettingsModal onClose={() => setOpen(false)} />;
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const settings = useMail((s) => s.data.settings);
  const account = useMail((s) => s.data.account);
  const labels = useMail((s) => s.data.labels);
  const used = useMail((s) => storageBytes(s.data));
  const [labelName, setLabelName] = useState('');

  const update = (patch: Partial<Settings>) => actions.updateSettings(patch);

  const addLabel = (e: FormEvent) => {
    e.preventDefault();
    const name = labelName.trim();
    if (!name) return;
    actions.createLabel(name, LABEL_COLORS[labels.length % LABEL_COLORS.length]);
    setLabelName('');
  };

  const confirmReset = () =>
    useUI.getState().ask({
      title: 'Reset mailbox?',
      body: 'Restores the demo mailbox and clears your drafts, labels, settings and scheduled sends.',
      confirmLabel: 'Reset mailbox',
      danger: true,
      onConfirm: () => {
        actions.resetData();
        useUI.setState({ composeIds: [], minimizedIds: [], maximizedId: null, selected: [] });
        onClose();
      },
    });

  return (
    <Modal title="Settings" onClose={onClose} width="sm:max-w-2xl" tall>
      <div className="flex flex-col divide-y divide-line">
        <Group title="General">
          <Row label="Theme">
            <Segmented
              label="Theme"
              value={settings.theme}
              options={[
                ['light', 'Light'],
                ['dark', 'Dark'],
                ['system', 'System'],
              ]}
              onChange={(theme) => update({ theme })}
            />
          </Row>
          <Row label="Density">
            <Segmented
              label="Density"
              value={settings.density}
              options={[
                ['comfortable', 'Comfortable'],
                ['cozy', 'Cozy'],
                ['compact', 'Compact'],
              ]}
              onChange={(density) => update({ density })}
            />
          </Row>
          <Row label="Reading pane on wide screens">
            <Switch label="Reading pane" checked={settings.readingPane} onChange={(readingPane) => update({ readingPane })} />
          </Row>
          <Row label="Inbox categories">
            <Switch label="Inbox categories" checked={settings.categories} onChange={(categories) => update({ categories })} />
          </Row>
          <Row label="Undo send">
            <select
              aria-label="Undo send window"
              value={settings.undoSendSeconds}
              onChange={(e) => update({ undoSendSeconds: Number(e.target.value) as Settings['undoSendSeconds'] })}
              className={FIELD}
            >
              <option value={5}>5 seconds</option>
              <option value={10}>10 seconds</option>
              <option value={30}>30 seconds</option>
            </select>
          </Row>
        </Group>

        <Group title="Account">
          <Row label="Display name">
            <input
              aria-label="Display name"
              value={account.name}
              onChange={(e) => actions.updateAccount({ name: e.target.value })}
              className={cn(FIELD, 'w-56')}
            />
          </Row>
          <Row label="Address">
            <span className="text-sm text-ink-2">{account.email}</span>
          </Row>
          <div className="flex flex-col gap-2">
            <label htmlFor="signature" className="text-sm text-ink-2">
              Signature
            </label>
            <textarea
              id="signature"
              rows={3}
              value={settings.signature}
              onChange={(e) => update({ signature: e.target.value })}
              className={cn(FIELD, 'resize-y')}
            />
          </div>
        </Group>

        <Group title="Labels">
          {labels.length === 0 && <p className="text-sm text-ink-3">No labels yet.</p>}
          {labels.map((label) => (
            <div key={label.id} className="flex items-center gap-3 py-1.5 text-sm">
              <span className={cn('size-2.5 rounded-full', LABEL_DOT[label.color])} />
              <span className="flex-1 truncate">{label.name}</span>
              <Button variant="ghost" size="sm" onClick={() => actions.deleteLabel(label.id)}>
                Delete
              </Button>
            </div>
          ))}
          <form onSubmit={addLabel} className="flex items-center gap-2 pt-2">
            <input
              aria-label="New label name"
              placeholder="New label"
              value={labelName}
              onChange={(e) => setLabelName(e.target.value)}
              className={cn(FIELD, 'min-w-0 flex-1')}
            />
            <Button size="sm" type="submit" disabled={!labelName.trim()}>
              Create
            </Button>
          </form>
        </Group>

        <Group title="Connection and simulation">
          <Row label="Work offline">
            <Switch label="Work offline" checked={settings.offline} onChange={(offline) => update({ offline })} />
          </Row>
          <Row label="Simulate incoming mail">
            <Switch
              label="Simulate incoming mail"
              checked={settings.incomingMail}
              onChange={(incomingMail) => update({ incomingMail })}
            />
          </Row>
        </Group>

        <Group title="Data">
          <Row label="Stored in this browser">
            <span className="text-sm text-ink-2">{formatBytes(used)} of message content</span>
          </Row>
          <div className="flex justify-end pt-2">
            <Button variant="danger" size="sm" onClick={confirmReset}>
              Reset mailbox
            </Button>
          </div>
        </Group>
      </div>
    </Modal>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 py-5 first:pt-4">
      <h3 className="text-sm font-medium text-primary">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-1">
      <span className="text-sm text-ink-2">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<[T, string]>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line p-0.5">
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'rounded-full px-3 py-1 text-sm transition-colors',
            value === id ? 'bg-primary-soft font-medium text-ink' : 'text-ink-2 hover:bg-hover',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

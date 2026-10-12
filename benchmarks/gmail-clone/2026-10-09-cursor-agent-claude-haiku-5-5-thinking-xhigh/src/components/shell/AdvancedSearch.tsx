import { useState, type FormEvent, type ReactNode } from 'react';
import { buildQuery, type AdvancedQuery } from '../../lib/search';
import { Button } from '../ui/Button';

const INPUT = 'h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary';

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={wide ? 'col-span-2 flex flex-col gap-1' : 'flex flex-col gap-1'}>
      <span className="text-xs font-medium text-ink-3">{label}</span>
      {children}
    </label>
  );
}

const EMPTY: AdvancedQuery = {
  from: '',
  to: '',
  subject: '',
  words: '',
  exclude: '',
  attachment: false,
  within: '',
  scope: 'all',
};

export function AdvancedSearch({ onSearch, onClose }: { onSearch: (q: string) => void; onClose: () => void }) {
  const [form, setForm] = useState<AdvancedQuery>(EMPTY);
  const set = (patch: Partial<AdvancedQuery>) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const query = buildQuery(form);
    if (query) onSearch(query);
    else onClose();
  };

  return (
    <form
      onSubmit={submit}
      className="absolute right-0 top-full z-50 mt-2 w-[min(560px,calc(100vw-1rem))] rounded-2xl border border-line bg-surface p-5 text-ink shadow-2xl"
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Field label="From">
          <input className={INPUT} value={form.from} onChange={(e) => set({ from: e.target.value })} autoFocus />
        </Field>
        <Field label="To">
          <input className={INPUT} value={form.to} onChange={(e) => set({ to: e.target.value })} />
        </Field>
        <Field label="Subject" wide>
          <input className={INPUT} value={form.subject} onChange={(e) => set({ subject: e.target.value })} />
        </Field>
        <Field label="Has the words" wide>
          <input className={INPUT} value={form.words} onChange={(e) => set({ words: e.target.value })} />
        </Field>
        <Field label="Doesn't have" wide>
          <input className={INPUT} value={form.exclude} onChange={(e) => set({ exclude: e.target.value })} />
        </Field>
        <Field label="Date within">
          <select className={INPUT} value={form.within} onChange={(e) => set({ within: e.target.value })}>
            <option value="">Any time</option>
            <option value="1d">1 day</option>
            <option value="3d">3 days</option>
            <option value="7d">1 week</option>
            <option value="1m">1 month</option>
            <option value="6m">6 months</option>
            <option value="1y">1 year</option>
          </select>
        </Field>
        <Field label="Search in">
          <select className={INPUT} value={form.scope} onChange={(e) => set({ scope: e.target.value })}>
            <option value="all">All Mail</option>
            <option value="inbox">Inbox</option>
            <option value="starred">Starred</option>
            <option value="sent">Sent</option>
            <option value="archive">Archived</option>
            <option value="spam">Spam</option>
            <option value="trash">Trash</option>
          </select>
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={form.attachment}
            onChange={(e) => set({ attachment: e.target.checked })}
          />
          Has attachment
        </label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setForm(EMPTY)}>
            Clear
          </Button>
          <Button type="submit" size="sm">
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}

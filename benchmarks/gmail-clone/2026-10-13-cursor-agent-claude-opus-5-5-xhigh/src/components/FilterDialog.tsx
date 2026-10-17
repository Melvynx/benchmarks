import { useMemo, useState } from "react";
import { useMail, getMail } from "../lib/store";
import { ui } from "../lib/ui";
import { viewThreads } from "../lib/selectors";
import type { Filter } from "../lib/types";
import { Button, Dialog } from "./ui";

export function FilterDialog({ open, onOpenChange, query }: { open: boolean; onOpenChange: (v: boolean) => void; query: string }) {
  const labels = useMail((s) => s.labels);
  const [a, setA] = useState<Filter["actions"]>({});
  const [label, setLabel] = useState("");
  const [applyExisting, setApplyExisting] = useState(true);
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const matches = useMemo(() => {
    if (!open || !query) return [];
    const s = getMail();
    return viewThreads({ ...s, threads, messages }, { kind: "search", query });
  }, [open, query, threads, messages]);

  const check = (key: keyof Filter["actions"], text: string) => (
    <label className="flex items-center gap-3 py-1.5 text-sm text-fg-2">
      <input type="checkbox" checked={!!a[key]} onChange={(e) => setA({ ...a, [key]: e.target.checked })} className="size-4 accent-[var(--primary)]" />
      {text}
    </label>
  );

  const create = () => {
    const actions = { ...a, label: label || undefined };
    getMail().addFilter({ query, actions });
    if (applyExisting && matches.length) {
      const ids = matches.map((t) => t.id);
      const m = getMail();
      if (actions.label) m.changeLabels(ids, [actions.label], []);
      if (actions.star) m.setStarred(ids, true);
      if (actions.important) m.setImportant(ids, true);
      if (actions.markRead) m.setUnread(ids, false);
      if (actions.skipInbox) m.archive(ids);
      if (actions.trash) m.trash(ids);
    }
    ui().showToast({ message: applyExisting && matches.length ? `Filter created and applied to ${matches.length} conversation${matches.length === 1 ? "" : "s"}.` : "Your filter was created." });
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create filter"
      className="w-[min(92vw,480px)]"
      footer={
        <>
          <Button variant="text" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={!Object.values(a).some(Boolean) && !label}>Create filter</Button>
        </>
      }
    >
      <p className="mb-3 rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-fg-2">{query}</p>
      <p className="mb-2 text-sm text-fg-2">When a message arrives that matches this search:</p>
      {check("skipInbox", "Skip the Inbox (Archive it)")}
      {check("markRead", "Mark as read")}
      {check("star", "Star it")}
      <label className="flex items-center gap-3 py-1.5 text-sm text-fg-2">
        <input type="checkbox" checked={!!label} onChange={(e) => setLabel(e.target.checked ? labels[0]?.id || "" : "")} className="size-4 accent-[var(--primary)]" />
        Apply the label:
        <select value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 rounded border border-outline-soft bg-surface px-2 text-sm">
          <option value="">Choose label…</option>
          {labels.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </label>
      {check("important", "Always mark it as important")}
      {check("trash", "Delete it")}
      <label className="mt-3 flex items-center gap-3 border-t border-line pt-3 text-sm text-fg-2">
        <input type="checkbox" checked={applyExisting} onChange={(e) => setApplyExisting(e.target.checked)} className="size-4 accent-[var(--primary)]" />
        Also apply filter to {matches.length} matching conversation{matches.length === 1 ? "" : "s"}.
      </label>
    </Dialog>
  );
}

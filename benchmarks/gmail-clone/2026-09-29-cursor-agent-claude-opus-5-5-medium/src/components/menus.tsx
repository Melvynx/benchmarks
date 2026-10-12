import { useMemo, useState } from "react";
import clsx from "clsx";
import { Check, Minus, Plus, Search, Inbox, AlertOctagon, Trash2, Tag, CalendarClock } from "lucide-react";
import { useMail } from "../lib/store";
import { MenuDivider, MenuHeading, MenuItem } from "./ui";

const at = (d: Date, h: number, m = 0) => {
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x.getTime();
};

function fmtOpt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function snoozePresets(now = Date.now()) {
  const d = new Date(now);
  const out: { label: string; at: number }[] = [];
  const laterToday = at(d, 18);
  if (laterToday - now > 60 * 60 * 1000) out.push({ label: "Later today", at: laterToday });
  const tomorrow = new Date(now + 86400000);
  out.push({ label: "Tomorrow", at: at(tomorrow, 8) });
  const day = d.getDay();
  if (day !== 6 && day !== 0 && day !== 5) {
    const sat = new Date(now + ((6 - day) * 86400000));
    out.push({ label: "This weekend", at: at(sat, 8) });
  }
  const mon = new Date(now + (((8 - day) % 7 || 7) * 86400000));
  out.push({ label: "Next week", at: at(mon, 8) });
  return out;
}

export function schedulePresets(now = Date.now()) {
  const tomorrow = new Date(now + 86400000);
  const day = new Date(now).getDay();
  const mon = new Date(now + (((8 - day) % 7 || 7) * 86400000));
  return [
    { label: "Tomorrow morning", at: at(tomorrow, 8) },
    { label: "Tomorrow afternoon", at: at(tomorrow, 13) },
    { label: "Monday morning", at: at(mon, 8) },
  ];
}

function toLocalInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DateTimePicker({ title, onPick, onCancel, cta }: { title: string; onPick: (ts: number) => void; onCancel: () => void; cta: string }) {
  const [v, setV] = useState(() => toLocalInput(Date.now() + 2 * 3600 * 1000));
  const ts = new Date(v).getTime();
  const valid = !Number.isNaN(ts) && ts > Date.now();
  return (
    <div className="w-72 px-4 py-2">
      <div className="mb-3 text-sm font-medium">{title}</div>
      <input
        type="datetime-local"
        value={v}
        min={toLocalInput(Date.now())}
        onChange={(e) => setV(e.target.value)}
        data-autofocus
        className="w-full rounded-md border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
      />
      {!valid && <div className="mt-2 text-xs text-danger">Pick a time in the future.</div>}
      <div className="mt-4 flex justify-end gap-2">
        <button className="rounded-full px-4 py-2 text-sm font-medium text-primary hover:bg-hover" onClick={onCancel}>
          Cancel
        </button>
        <button
          disabled={!valid}
          className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40"
          onClick={() => onPick(ts)}
        >
          {cta}
        </button>
      </div>
    </div>
  );
}

export function SnoozeMenu({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const snooze = useMail((s) => s.snooze);
  const [custom, setCustom] = useState(false);
  if (custom)
    return (
      <DateTimePicker
        title="Pick date & time"
        cta="Save"
        onCancel={() => setCustom(false)}
        onPick={(ts) => {
          snooze(ids, ts);
          onDone();
        }}
      />
    );
  return (
    <div className="w-72">
      <MenuHeading>Snooze until…</MenuHeading>
      {snoozePresets().map((p, i) => (
        <MenuItem
          key={p.label}
          autoFocus={i === 0}
          label={p.label}
          hint={fmtOpt(p.at)}
          onClick={() => {
            snooze(ids, p.at);
            onDone();
          }}
        />
      ))}
      <MenuDivider />
      <MenuItem icon={<CalendarClock size={18} />} label="Pick date & time" onClick={() => setCustom(true)} />
    </div>
  );
}

export function LabelMenu({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const applyLabels = useMail((s) => s.applyLabels);
  const createLabel = useMail((s) => s.createLabel);
  const [q, setQ] = useState("");

  const initial = useMemo(() => {
    const m: Record<string, "all" | "some" | "none"> = {};
    for (const l of labels) {
      const n = ids.filter((id) => threads[id]?.labelIds.includes(l.id)).length;
      m[l.id] = n === 0 ? "none" : n === ids.length ? "all" : "some";
    }
    return m;
  }, []);
  const [state, setState] = useState(initial);
  const changed = Object.keys(state).some((k) => state[k] !== initial[k]);
  const filtered = labels.filter((l) => l.name.toLowerCase().includes(q.trim().toLowerCase()));
  const exact = labels.some((l) => l.name.toLowerCase() === q.trim().toLowerCase());

  const apply = () => {
    const add = Object.keys(state).filter((k) => state[k] === "all" && initial[k] !== "all");
    const remove = Object.keys(state).filter((k) => state[k] === "none" && initial[k] !== "none");
    applyLabels(ids, add, remove);
    onDone();
  };

  return (
    <div className="w-64">
      <div className="px-4 pb-1 text-sm font-medium">Label as:</div>
      <div className="mx-3 mb-1 flex items-center gap-2 border-b border-line px-1 pb-1">
        <input
          data-autofocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (q.trim() && !exact) {
                const id = createLabel(q.trim());
                applyLabels(ids, [id], []);
                onDone();
              } else if (changed) apply();
            }
          }}
          placeholder="Search or create label"
          className="w-full bg-transparent py-1 text-sm outline-none"
        />
        <Search size={16} className="text-ink-3" />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map((l) => {
          const st = state[l.id] ?? "none";
          return (
            <button
              key={l.id}
              role="menuitemcheckbox"
              aria-checked={st === "all" ? true : st === "some" ? "mixed" : false}
              className="flex w-full items-center gap-3 px-4 py-[7px] text-left text-sm hover:bg-hover focus-visible:bg-hover outline-none"
              onClick={() => setState((s) => ({ ...s, [l.id]: st === "all" ? "none" : "all" }))}
            >
              <span
                className={clsx(
                  "flex h-4 w-4 items-center justify-center rounded-[2px] border-2",
                  st === "none" ? "border-ink-3" : "border-ink-2 bg-ink-2 text-surface",
                )}
              >
                {st === "all" && <Check size={12} strokeWidth={4} />}
                {st === "some" && <Minus size={12} strokeWidth={4} />}
              </span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} />
              <span className="truncate">{l.name}</span>
            </button>
          );
        })}
      </div>
      <MenuDivider />
      {q.trim() && !exact && (
        <MenuItem
          icon={<Plus size={18} />}
          label={`"${q.trim()}" (create new)`}
          onClick={() => {
            const id = createLabel(q.trim());
            applyLabels(ids, [id], []);
            onDone();
          }}
        />
      )}
      {changed ? (
        <MenuItem label={<span className="font-medium text-primary">Apply</span>} onClick={apply} />
      ) : (
        !q.trim() && (
          <MenuItem
            icon={<Plus size={18} />}
            label="Create new"
            onClick={() => {
              useMail.getState().set({ labelDialog: { applyTo: ids } });
              onDone();
            }}
          />
        )
      )}
    </div>
  );
}

export function MoveMenu({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const moveToInbox = useMail((s) => s.moveToInbox);
  const markSpam = useMail((s) => s.markSpam);
  const trash = useMail((s) => s.trash);
  const moveToLabel = useMail((s) => s.moveToLabel);
  const [q, setQ] = useState("");
  const allInInbox = ids.every((id) => threads[id]?.inInbox && !threads[id]?.trashed && !threads[id]?.spam);
  const match = (s: string) => s.toLowerCase().includes(q.trim().toLowerCase());
  const run = (fn: () => void) => {
    fn();
    onDone();
  };
  return (
    <div className="w-60">
      <div className="px-4 pb-1 text-sm font-medium">Move to:</div>
      <div className="mx-3 mb-1 flex items-center gap-2 border-b border-line px-1 pb-1">
        <input
          data-autofocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search labels"
          className="w-full bg-transparent py-1 text-sm outline-none"
        />
        <Search size={16} className="text-ink-3" />
      </div>
      {!allInInbox && match("inbox") && <MenuItem icon={<Inbox size={18} />} label="Inbox" onClick={() => run(() => moveToInbox(ids))} />}
      {labels.filter((l) => match(l.name)).map((l) => (
        <MenuItem
          key={l.id}
          icon={<Tag size={16} style={{ color: l.color }} />}
          label={l.name}
          onClick={() => run(() => moveToLabel(ids, l.id))}
        />
      ))}
      <MenuDivider />
      {match("spam") && <MenuItem icon={<AlertOctagon size={18} />} label="Spam" onClick={() => run(() => markSpam(ids))} />}
      {match("trash") && <MenuItem icon={<Trash2 size={18} />} label="Trash" onClick={() => run(() => trash(ids))} />}
    </div>
  );
}

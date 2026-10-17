import { useMemo, useState } from "react";
import { Popover, MenuItem, MenuDivider, type Anchor } from "../ui/Popover";
import { useMail } from "../store/mail";
import { useUI } from "./uiContext";
import { Icon } from "../ui/Icon";

function at(daysAhead: number, hour: number) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

export function timeOptions(kind: "snooze" | "schedule") {
  const now = new Date();
  const opts: { label: string; at: number }[] = [];
  const fmt = (ts: number, withDay: boolean) =>
    new Date(ts).toLocaleString(undefined, withDay ? { weekday: "short", hour: "numeric", minute: "2-digit" } : { hour: "numeric", minute: "2-digit" });
  if (kind === "snooze") {
    if (now.getHours() < 17) opts.push({ label: "Later today", at: at(0, 18) });
    opts.push({ label: "Tomorrow", at: at(1, 8) });
    const day = now.getDay();
    const toSat = (6 - day + 7) % 7 || 7;
    if (day !== 6 && day !== 0) opts.push({ label: "This weekend", at: at(toSat, 8) });
    const toMon = (1 - day + 7) % 7 || 7;
    opts.push({ label: "Next week", at: at(toMon, 8) });
  } else {
    opts.push({ label: "Tomorrow morning", at: at(1, 8) });
    opts.push({ label: "Tomorrow afternoon", at: at(1, 13) });
    const day = now.getDay();
    const toMon = (1 - day + 7) % 7 || 7;
    opts.push({ label: "Monday morning", at: at(toMon, 8) });
  }
  return opts.map((o) => ({ ...o, hint: fmt(o.at, o.label !== "Later today") }));
}

function toLocalInput(ts: number) {
  const d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export function TimePickerMenu({
  anchor,
  onClose,
  onPick,
  kind,
}: {
  anchor: Anchor | null;
  onClose: () => void;
  onPick: (ts: number) => void;
  kind: "snooze" | "schedule";
}) {
  const [custom, setCustom] = useState(false);
  const [value, setValue] = useState(() => toLocalInput(at(1, 9)));
  const opts = useMemo(() => timeOptions(kind), [kind, anchor]);
  const close = () => {
    setCustom(false);
    onClose();
  };
  return (
    <Popover anchor={anchor} onClose={close} width={custom ? 300 : 280}>
      <div className="menu-title">{kind === "snooze" ? "Snooze until…" : "Schedule send"}</div>
      {!custom ? (
        <>
          {opts.map((o) => (
            <MenuItem
              key={o.label}
              label={o.label}
              hint={o.hint}
              onClick={() => {
                onPick(o.at);
                close();
              }}
            />
          ))}
          <MenuDivider />
          <MenuItem icon="calendar" label="Pick date & time" onClick={() => setCustom(true)} />
        </>
      ) : (
        <div className="picker">
          <input type="datetime-local" value={value} min={toLocalInput(Date.now())} onChange={(e) => setValue(e.target.value)} autoFocus />
          <div className="picker-actions">
            <button className="btn text" onClick={() => setCustom(false)}>
              Back
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const ts = new Date(value).getTime();
                if (!Number.isFinite(ts) || ts <= Date.now()) return;
                onPick(ts);
                close();
              }}
            >
              {kind === "snooze" ? "Save" : "Schedule send"}
            </button>
          </div>
        </div>
      )}
    </Popover>
  );
}

export function LabelMenu({ anchor, onClose, threadIds }: { anchor: Anchor | null; onClose: () => void; threadIds: string[] }) {
  const { state, api } = useMail();
  const ui = useUI();
  const [q, setQ] = useState("");
  const [changes, setChanges] = useState<Record<string, boolean>>({});
  const threads = state.threads.filter((t) => threadIds.includes(t.id));
  const initial = (id: string): boolean | "mixed" => {
    const n = threads.filter((t) => t.labels.includes(id)).length;
    return n === 0 ? false : n === threads.length ? true : "mixed";
  };
  const list = state.labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
  const dirty = Object.keys(changes).length > 0;
  const close = () => {
    setQ("");
    setChanges({});
    onClose();
  };
  const apply = () => {
    const add = Object.entries(changes).filter(([, v]) => v).map(([k]) => k);
    const remove = Object.entries(changes).filter(([, v]) => !v).map(([k]) => k);
    if (add.length || remove.length) api.applyLabels(threadIds, add, remove);
    close();
  };
  return (
    <Popover anchor={anchor} onClose={close} width={260}>
      <div className="menu-title">Label as:</div>
      <div className="menu-search">
        <input
          autoFocus
          placeholder="Search labels"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (dirty) apply();
              else if (list[0]) {
                setChanges({ [list[0].id]: initial(list[0].id) !== true });
              }
            }
          }}
        />
        <Icon name="search" size={18} />
      </div>
      <div className="menu-scroll">
        {list.map((l) => {
          const cur = l.id in changes ? changes[l.id] : initial(l.id);
          return (
            <button
              key={l.id}
              className="menu-item"
              role="menuitemcheckbox"
              aria-checked={cur === "mixed" ? "mixed" : cur}
              onClick={() => setChanges((c) => ({ ...c, [l.id]: cur !== true }))}
            >
              <span className={"cb" + (cur === true ? " on" : cur === "mixed" ? " mixed" : "")} />
              <span className="label-dot" style={{ background: l.color }} />
              <span className="menu-label">{l.name}</span>
            </button>
          );
        })}
        {!list.length && <div className="menu-empty">No labels match “{q}”</div>}
      </div>
      <MenuDivider />
      {dirty ? (
        <MenuItem label={<b>Apply</b>} onClick={apply} />
      ) : (
        <MenuItem
          label={q ? `"${q}" (create new)` : "Create new"}
          icon="plus"
          onClick={() => {
            if (q.trim()) {
              const id = api.createLabel(q, "#5f6368");
              api.applyLabels(threadIds, [id], []);
              close();
            } else {
              close();
              ui.openCreateLabel(threadIds);
            }
          }}
        />
      )}
    </Popover>
  );
}

export function MoveMenu({ anchor, onClose, threadIds }: { anchor: Anchor | null; onClose: () => void; threadIds: string[] }) {
  const { state, api } = useMail();
  const [q, setQ] = useState("");
  const targets = [
    { id: "inbox", name: "Inbox", color: undefined as string | undefined, icon: "inbox" as const },
    ...state.labels.map((l) => ({ id: l.id, name: l.name, color: l.color, icon: "labelFilled" as const })),
    { id: "spam", name: "Spam", color: undefined, icon: "spam" as const },
    { id: "trash", name: "Trash", color: undefined, icon: "trash" as const },
  ].filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));
  const close = () => {
    setQ("");
    onClose();
  };
  return (
    <Popover anchor={anchor} onClose={close} width={240}>
      <div className="menu-title">Move to:</div>
      <div className="menu-search">
        <input
          autoFocus
          placeholder="Search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && targets[0]) {
              api.moveTo(threadIds, targets[0].id);
              close();
            }
          }}
        />
        <Icon name="search" size={18} />
      </div>
      <div className="menu-scroll">
        {targets.map((t) => (
          <MenuItem
            key={t.id}
            icon={t.icon}
            color={t.color}
            label={t.name}
            onClick={() => {
              api.moveTo(threadIds, t.id);
              close();
            }}
          />
        ))}
      </div>
    </Popover>
  );
}

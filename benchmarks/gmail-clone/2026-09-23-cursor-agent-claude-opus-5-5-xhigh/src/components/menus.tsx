import { useMemo, useState } from "react";
import { act } from "../lib/actions";
import { atHour, formatScheduleLabel, nextWeekday } from "../lib/format";
import { CATEGORY_META } from "../lib/selectors";
import { useMail } from "../lib/store";
import type { Category } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn, LABEL_COLORS } from "../lib/utils";
import { Icon, IconButton, MenuDivider, MenuHeader, MenuItem, Popover, useMenu } from "./ui";

type Size = "sm" | "md";

export function LabelMenuButton({ ids, size = "md", onDone }: { ids: string[]; size?: Size; onDone?: () => void }) {
  const menu = useMenu();
  return (
    <>
      <IconButton ref={menu.ref} icon="label" label="Labels" size={size} onClick={menu.toggle} active={menu.open} disabled={!ids.length} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} className="w-64">
        {menu.open && (
          <LabelPicker
            ids={ids}
            onDone={() => {
              menu.close();
              onDone?.();
            }}
          />
        )}
      </Popover>
    </>
  );
}

export function LabelPicker({ ids, onDone }: { ids: string[]; onDone: () => void }) {
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const setLabel = useMail((s) => s.setLabel);
  const openDialog = useUI((s) => s.openDialog);
  const showToast = useUI((s) => s.showToast);
  const [filter, setFilter] = useState("");
  const initial = useMemo(() => {
    const m: Record<string, "all" | "some" | "none"> = {};
    for (const l of labels) {
      const n = ids.filter((id) => threads[id]?.labels.includes(l.id)).length;
      m[l.id] = n === 0 ? "none" : n === ids.length ? "all" : "some";
    }
    return m;
  }, []);
  const [state, setState] = useState(initial);
  const changed = labels.some((l) => state[l.id] !== initial[l.id]);
  const shown = labels.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()));

  const apply = () => {
    const before = Object.fromEntries(ids.map((id) => [id, useMail.getState().threads[id] ?? null]));
    const added: string[] = [];
    const removed: string[] = [];
    for (const l of labels) {
      if (state[l.id] === initial[l.id]) continue;
      if (state[l.id] === "all") {
        setLabel(ids, l.id, true);
        added.push(l.name);
      } else if (state[l.id] === "none") {
        setLabel(ids, l.id, false);
        removed.push(l.name);
      }
    }
    const undo = () => useMail.getState().restore(before);
    const msg = added.length
      ? `${ids.length === 1 ? "Conversation" : `${ids.length} conversations`} added to ${added.map((n) => `"${n}"`).join(", ")}.`
      : `Labels ${removed.map((n) => `"${n}"`).join(", ")} removed.`;
    showToast({ message: msg, action: { label: "Undo", run: undo } }, undo);
    onDone();
  };

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "Enter" && changed) {
          e.preventDefault();
          apply();
        }
      }}
    >
      <div className="px-4 pb-1 pt-1 text-sm text-fg-2">Label as:</div>
      <div className="mx-3 mb-1 flex items-center gap-2 border-b border-line pb-1">
        <input
          autoFocus
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search labels"
          className="h-7 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
        />
        <Icon name="search" size={18} className="text-fg-3" />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {shown.map((l) => {
          const s = state[l.id];
          return (
            <button
              key={l.id}
              type="button"
              role="menuitemcheckbox"
              aria-checked={s === "all" ? true : s === "some" ? "mixed" : false}
              onClick={() => setState((x) => ({ ...x, [l.id]: s === "all" ? "none" : "all" }))}
              className="flex h-9 w-full items-center gap-3 px-4 text-left text-sm hover:bg-hover focus:bg-hover focus:outline-none"
            >
              <Icon
                name={s === "all" ? "check_box" : s === "some" ? "indeterminate_check_box" : "check_box_outline_blank"}
                fill={s !== "none"}
                className={s !== "none" ? "text-accent" : "text-fg-3"}
              />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: LABEL_COLORS[l.color].dot }} />
              <span className="truncate">{l.name}</span>
            </button>
          );
        })}
        {!shown.length && <div className="px-4 py-2 text-sm text-fg-3">No labels match "{filter}"</div>}
      </div>
      <MenuDivider />
      {changed ? (
        <MenuItem label={<span className="font-medium text-accent">Apply</span>} onClick={apply} />
      ) : (
        <MenuItem
          label={filter ? `"${filter}" (create new)` : "Create new"}
          icon="add"
          onClick={() => {
            onDone();
            openDialog({ type: "createLabel", applyTo: ids });
          }}
        />
      )}
    </div>
  );
}

export function MoveMenuButton({
  ids,
  size = "md",
  folder,
  currentLabel,
  onDone,
}: {
  ids: string[];
  size?: Size;
  folder?: string;
  currentLabel?: string;
  onDone?: () => void;
}) {
  const menu = useMenu();
  const labels = useMail((s) => s.labels);
  const [filter, setFilter] = useState("");
  const done = () => {
    menu.close();
    setFilter("");
    onDone?.();
  };
  const shown = labels.filter((l) => l.id !== currentLabel && l.name.toLowerCase().includes(filter.toLowerCase()));
  return (
    <>
      <IconButton ref={menu.ref} icon="drive_file_move" label="Move to" size={size} onClick={menu.toggle} active={menu.open} disabled={!ids.length} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} className="w-60">
        <div className="px-4 pb-1 pt-1 text-sm text-fg-2">Move to:</div>
        <div className="mx-3 mb-1 flex items-center gap-2 border-b border-line pb-1">
          <input
            autoFocus
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search"
            className="h-7 min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
          <Icon name="search" size={18} className="text-fg-3" />
        </div>
        {!filter && (
          <>
            {folder !== "inbox" && <MenuItem icon="inbox" label="Inbox" onClick={() => (act.moveToInbox(ids), done())} />}
            {(["primary", "promotions", "social", "updates"] as Category[]).map((c) => (
              <MenuItem key={c} icon={CATEGORY_META[c].icon} label={CATEGORY_META[c].name} hint="Tab" onClick={() => (act.setCategory(ids, c), done())} />
            ))}
            <MenuDivider />
          </>
        )}
        {shown.map((l) => (
          <MenuItem
            key={l.id}
            icon="label"
            iconFill
            iconColor={LABEL_COLORS[l.color].dot}
            label={l.name}
            onClick={() => (act.moveToLabel(ids, l.id, currentLabel), done())}
          />
        ))}
        {!filter && (
          <>
            <MenuDivider />
            {folder !== "spam" && <MenuItem icon="report" label="Spam" onClick={() => (act.spam(ids), done())} />}
            {folder !== "trash" && <MenuItem icon="delete" label="Trash" onClick={() => (act.trash(ids), done())} />}
          </>
        )}
      </Popover>
    </>
  );
}

export function snoozeOptions(now: number) {
  const d = new Date(now);
  const opts: { label: string; ts: number }[] = [];
  const laterToday = atHour(now, 0, d.getHours() + 3);
  if (d.getHours() < 18) opts.push({ label: "Later today", ts: laterToday });
  opts.push({ label: "Tomorrow", ts: atHour(now, 1, 8) });
  if (d.getDay() >= 1 && d.getDay() <= 4) opts.push({ label: "This weekend", ts: nextWeekday(now, 6, 8) });
  opts.push({ label: "Next week", ts: nextWeekday(now, 1, 8) });
  return opts;
}

export function SnoozeMenuButton({ ids, size = "md", onDone }: { ids: string[]; size?: Size; onDone?: () => void }) {
  const menu = useMenu();
  const openDialog = useUI((s) => s.openDialog);
  const now = Date.now();
  return (
    <>
      <IconButton ref={menu.ref} icon="schedule" label="Snooze" size={size} onClick={menu.toggle} active={menu.open} disabled={!ids.length} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} className="w-72">
        {menu.open && (
          <SnoozeList
            now={now}
            onPick={(ts) => {
              menu.close();
              act.snooze(ids, ts);
              onDone?.();
            }}
            onCustom={() => {
              menu.close();
              openDialog({
                type: "datetime",
                title: "Pick date & time",
                initial: atHour(now, 1, 8),
                onPick: (ts) => {
                  act.snooze(ids, ts);
                  onDone?.();
                },
              });
            }}
          />
        )}
      </Popover>
    </>
  );
}

export function SnoozeList({ now, onPick, onCustom }: { now: number; onPick: (ts: number) => void; onCustom: () => void }) {
  return (
    <>
      <MenuHeader>Snooze until…</MenuHeader>
      {snoozeOptions(now).map((o) => (
        <MenuItem
          key={o.label}
          label={o.label}
          trailing={<span className="text-xs text-fg-3">{formatScheduleLabel(o.ts, now).replace(/^(Today|Tomorrow), /, "")}</span>}
          onClick={() => onPick(o.ts)}
        />
      ))}
      <MenuDivider />
      <MenuItem icon="calendar_month" label="Pick date & time" onClick={onCustom} />
    </>
  );
}

export function StarButton({
  starred,
  onToggle,
  className,
  size = 20,
}: {
  starred: boolean;
  onToggle: () => void;
  className?: string;
  size?: number;
}) {
  return (
    <button
      type="button"
      aria-label={starred ? "Starred" : "Not starred"}
      aria-pressed={starred}
      data-tip={starred ? "Starred" : "Not starred"}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn("inline-flex h-10 w-8 shrink-0 items-center justify-center rounded-full", className)}
    >
      <Icon
        name="star"
        fill={starred}
        size={size}
        className={cn("transition-transform active:scale-125", starred ? "text-star" : "text-fg-3 hover:text-fg")}
      />
    </button>
  );
}

export function ImportantButton({ important, onToggle }: { important: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={important ? "Important" : "Not important"}
      aria-pressed={important}
      data-tip={important ? "Important because you marked it as important." : "Click to teach the inbox this conversation is important."}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="inline-flex h-10 w-7 shrink-0 items-center justify-center"
    >
      <Icon name="label_important" fill={important} size={20} className={important ? "text-star" : "text-fg-3 opacity-0 group-hover:opacity-100"} />
    </button>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Popover } from "radix-ui";
import { useMail, getMail } from "../lib/store";
import { useUI, ui, type MenuKey } from "../lib/ui";
import { actions } from "../lib/actions";
import { navigate, routeHash } from "../lib/router";
import { fromLocalInput, snoozeOptions, toLocalInput, DAY } from "../lib/date";
import { isDraftOnly } from "../lib/selectors";
import type { ViewRef } from "../lib/types";
import { cn } from "../lib/utils";
import { Button, Dialog, Icon, IconButton, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Tip, type IconKey } from "./ui";
import { FilterDialog } from "./FilterDialog";

function useMenuState(key: Exclude<MenuKey, null>, hotkeys: boolean) {
  const menu = useUI((s) => s.menu);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (hotkeys && menu === key) {
      setOpen(true);
      ui().set({ menu: null });
    }
  }, [menu, key, hotkeys]);
  return [open, setOpen] as const;
}

const triggerCls = "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-icon hover:bg-hover data-[state=open]:bg-hover-strong";

const hiddenAnchor = "pointer-events-none absolute right-3 top-9 size-0 opacity-0";

export function LabelPicker({ ids, hotkeys = false, hidden }: { ids: string[]; hotkeys?: boolean; hidden?: boolean }) {
  const [open, setOpen] = useMenuState("label", hotkeys);
  const labels = useMail((s) => s.labels);
  const threads = useMail((s) => s.threads);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const state = useMemo(() => {
    const out: Record<string, "all" | "some" | "none"> = {};
    for (const l of labels) {
      const n = ids.filter((id) => threads[id]?.labels.includes(l.id)).length;
      out[l.id] = n === 0 ? "none" : n === ids.length ? "all" : "some";
    }
    return out;
  }, [labels, threads, ids]);

  useEffect(() => {
    if (open) {
      setQ("");
      setPending({});
    }
  }, [open]);

  const filtered = labels.filter((l) => l.name.toLowerCase().includes(q.toLowerCase()));
  const changed = Object.keys(pending).length > 0;
  const apply = () => {
    const add = Object.entries(pending).filter(([, v]) => v).map(([k]) => k);
    const remove = Object.entries(pending).filter(([, v]) => !v).map(([k]) => k);
    actions.labels(ids, add, remove);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {hidden ? (
        <Popover.Anchor className={hiddenAnchor} />
      ) : (
        <Tip label="Labels" shortcut="l">
          <Popover.Trigger asChild>
            <button type="button" aria-label="Labels" className={triggerCls} disabled={!ids.length}>
              <Icon name="label" size={20} />
            </button>
          </Popover.Trigger>
        </Tip>
      )}
      <Popover.Portal>
        <Popover.Content align={hidden ? "end" : "start"} sideOffset={4} collisionPadding={8} className="no-print z-[80] w-64 rounded-lg bg-menu py-2 font-sans text-sm text-fg shadow-e2 outline-none animate-pop">
          <div className="px-4 pb-1 text-sm text-fg-2">Label as:</div>
          <div className="mx-4 mb-1 flex items-center border-b border-outline focus-within:border-primary">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (changed) apply();
                  else if (filtered[0]) setPending({ ...pending, [filtered[0].id]: state[filtered[0].id] !== "all" });
                }
              }}
              aria-label="Filter labels"
              className="h-8 flex-1 bg-transparent font-body text-sm outline-none"
            />
            <Icon name="search" size={18} className="text-fg-3" />
          </div>
          <div className="max-h-64 overflow-auto">
            {filtered.map((l) => {
              const cur = l.id in pending ? (pending[l.id] ? "all" : "none") : state[l.id];
              return (
                <button
                  key={l.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={cur === "all" ? true : cur === "some" ? "mixed" : false}
                  onClick={() => {
                    const next = cur !== "all";
                    const orig = state[l.id];
                    const np = { ...pending };
                    if ((next && orig === "all") || (!next && orig === "none")) delete np[l.id];
                    else np[l.id] = next;
                    setPending(np);
                  }}
                  className="flex h-8 w-full items-center gap-3 px-4 text-left hover:bg-hover"
                >
                  <Icon
                    name={cur === "all" ? "check_box" : cur === "some" ? "indeterminate_check_box" : "check_box_outline_blank"}
                    fill={cur !== "none"}
                    size={20}
                    className="text-icon"
                  />
                  <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                  <span className="flex-1 truncate">{l.name}</span>
                </button>
              );
            })}
            {!filtered.length && <div className="px-4 py-2 text-fg-3">No labels match “{q}”</div>}
          </div>
          <div className="my-1 h-px bg-line" />
          {changed ? (
            <button type="button" onClick={apply} className="flex h-8 w-full items-center px-4 text-left font-medium text-primary hover:bg-hover">
              Apply
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  ui().set({ labelDialog: { applyTo: ids, ...(q ? {} : {}) } });
                }}
                className="flex h-8 w-full items-center px-4 text-left hover:bg-hover"
              >
                {q ? `"${q}" (create new)` : "Create new"}
              </button>
              <button type="button" onClick={() => (setOpen(false), navigate("settings/labels"))} className="flex h-8 w-full items-center px-4 text-left hover:bg-hover">
                Manage labels
              </button>
            </>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function MovePicker({ ids, view, hotkeys = false, hidden }: { ids: string[]; view: ViewRef; hotkeys?: boolean; hidden?: boolean }) {
  const [open, setOpen] = useMenuState("move", hotkeys);
  const labels = useMail((s) => s.labels);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (open) setQ("");
  }, [open]);
  const inInbox = view.kind === "folder" && view.folder === "inbox";
  const targets: { id: string; name: string; icon: IconKey; color?: string }[] = [
    ...(!inInbox ? [{ id: "INBOX", name: "Inbox", icon: "inbox" as IconKey }] : []),
    { id: "SPAM", name: "Spam", icon: "report" as IconKey },
    { id: "TRASH", name: "Trash", icon: "delete" as IconKey },
    ...labels.filter((l) => !(view.kind === "label" && view.labelId === l.id)).map((l) => ({ id: l.id, name: l.name, icon: "label" as IconKey, color: l.color })),
  ].filter((t) => t.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      {hidden ? (
        <Popover.Anchor className={hiddenAnchor} />
      ) : (
        <Tip label="Move to" shortcut="v">
          <Popover.Trigger asChild>
            <button type="button" aria-label="Move to" className={triggerCls} disabled={!ids.length}>
              <Icon name="drive_file_move" size={20} />
            </button>
          </Popover.Trigger>
        </Tip>
      )}
      <Popover.Portal>
        <Popover.Content align={hidden ? "end" : "start"} sideOffset={4} collisionPadding={8} className="no-print z-[80] w-60 rounded-lg bg-menu py-2 font-sans text-sm text-fg shadow-e2 outline-none animate-pop">
          <div className="px-4 pb-1 text-sm text-fg-2">Move to:</div>
          <div className="mx-4 mb-1 flex items-center border-b border-outline focus-within:border-primary">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && targets[0]) {
                  e.preventDefault();
                  actions.moveTo(ids, targets[0].id);
                  setOpen(false);
                }
              }}
              aria-label="Filter folders"
              className="h-8 flex-1 bg-transparent font-body text-sm outline-none"
            />
            <Icon name="search" size={18} className="text-fg-3" />
          </div>
          <div className="max-h-64 overflow-auto">
            {targets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  actions.moveTo(ids, t.id);
                  setOpen(false);
                }}
                className="flex h-8 w-full items-center gap-3 px-4 text-left hover:bg-hover"
              >
                <Icon name={t.icon} size={18} fill={!!t.color} style={t.color ? { color: t.color } : undefined} className={t.color ? "" : "text-icon"} />
                <span className="truncate">{t.name}</span>
              </button>
            ))}
          </div>
          <div className="my-1 h-px bg-line" />
          <button type="button" onClick={() => (setOpen(false), ui().set({ labelDialog: {} }))} className="flex h-8 w-full items-center px-4 text-left hover:bg-hover">
            Create new
          </button>
          <button type="button" onClick={() => (setOpen(false), navigate("settings/labels"))} className="flex h-8 w-full items-center px-4 text-left hover:bg-hover">
            Manage labels
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function SnoozeCustomDialog({ open, onOpenChange, onPick, title = "Pick date & time", confirm = "Save" }: { open: boolean; onOpenChange: (v: boolean) => void; onPick: (t: number) => void; title?: string; confirm?: string }) {
  const init = toLocalInput(Date.now() + DAY);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState("08:00");
  useEffect(() => {
    if (open) {
      setDate(toLocalInput(Date.now() + DAY).date);
      setTime("08:00");
    }
  }, [open]);
  const t = date && time ? fromLocalInput(date, time) : 0;
  const past = t <= Date.now();
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      footer={
        <>
          <Button variant="text" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!t || past} onClick={() => (onPick(t), onOpenChange(false))}>{confirm}</Button>
        </>
      }
    >
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-xs text-fg-2">
          Date
          <input type="date" value={date} min={toLocalInput(Date.now()).date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-md border border-outline bg-transparent px-3 text-sm text-fg outline-none focus:border-2 focus:border-primary" />
        </label>
        <label className="flex w-36 flex-col gap-1 text-xs text-fg-2">
          Time
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-md border border-outline bg-transparent px-3 text-sm text-fg outline-none focus:border-2 focus:border-primary" />
        </label>
      </div>
      {past && t > 0 && <p className="mt-2 text-xs text-danger">Pick a time in the future.</p>}
    </Dialog>
  );
}

export function SnoozePicker({ ids, hotkeys = false, size = "md", hidden }: { ids: string[]; hotkeys?: boolean; size?: "md" | "sm"; hidden?: boolean }) {
  const [open, setOpen] = useMenuState("snooze", hotkeys);
  const [custom, setCustom] = useState(false);
  const opts = useMemo(() => (open ? snoozeOptions() : []), [open]);
  return (
    <>
      <Menu open={open} onOpenChange={setOpen}>
        {hidden ? (
          <MenuTrigger asChild>
            <span aria-hidden="true" className={hiddenAnchor} />
          </MenuTrigger>
        ) : (
          <Tip label="Snooze" shortcut="b">
            <MenuTrigger asChild>
              <button type="button" aria-label="Snooze" className={cn(triggerCls, size === "sm" && "size-8")} disabled={!ids.length} onClick={(e) => e.stopPropagation()}>
                <Icon name="schedule" size={20} />
              </button>
            </MenuTrigger>
          </Tip>
        )}
        <MenuContent align={hidden ? "end" : "start"} className="w-72" onClick={(e) => e.stopPropagation()}>
          <MenuLabel>Snooze until…</MenuLabel>
          {opts.map((o) => (
            <MenuItem key={o.id} onSelect={() => actions.snooze(ids, o.at)}>
              <span className="flex w-full justify-between gap-4">
                <span>{o.label}</span>
                <span className="text-fg-3">{o.detail}</span>
              </span>
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem icon="date_range" onSelect={() => setCustom(true)}>Pick date &amp; time</MenuItem>
        </MenuContent>
      </Menu>
      <SnoozeCustomDialog open={custom} onOpenChange={setCustom} onPick={(t) => actions.snooze(ids, t)} />
    </>
  );
}

/** Contextual toolbar for one or more conversations (list selection or open thread). */
export function ThreadActions({
  ids,
  view,
  hotkeys,
  onRemoved,
  inThread,
  compact,
}: {
  ids: string[];
  view: ViewRef;
  hotkeys?: boolean;
  onRemoved?: () => void;
  inThread?: boolean;
  compact?: boolean;
}) {
  const threads = useMail((s) => s.threads);
  const messages = useMail((s) => s.messages);
  const [filterOpen, setFilterOpen] = useState(false);
  const list = ids.map((id) => threads[id]).filter(Boolean);
  if (!list.length) return null;
  const folder = view.kind === "folder" ? view.folder : null;
  const allTrash = list.every((t) => t.labels.includes("TRASH"));
  const allSpam = list.every((t) => t.labels.includes("SPAM"));
  const anyInbox = list.some((t) => t.labels.includes("INBOX") && !t.labels.includes("TRASH") && !t.labels.includes("SPAM"));
  const anyUnread = list.some((t) => t.unread);
  const allStarred = list.every((t) => t.starred);
  const allImportant = list.every((t) => t.labels.includes("IMPORTANT"));
  const anyMuted = list.some((t) => t.muted);
  const snoozed = list.some((t) => t.snoozedUntil && t.snoozedUntil > Date.now());
  const drafts = folder === "drafts" && list.every((t) => isDraftOnly(t, messages));
  const done = (fn: () => void) => () => {
    fn();
    onRemoved?.();
  };
  const first = list[0];
  const firstMsg = messages[first.messageIds[0]];

  const sep = <span className="mx-1 h-5 w-px shrink-0 bg-line max-sm:hidden" />;
  return (
    <div className="flex min-w-0 items-center">
      {drafts ? (
        <Button variant="text" onClick={done(() => {
          const draftIds = list.flatMap((t) => t.messageIds.filter((m) => messages[m]?.status === "draft"));
          const snap = getMail().snapshot(ids);
          draftIds.forEach((d) => { ui().closeComposer(d); getMail().discardDraft(d); });
          const undo = () => getMail().restore(snap);
          ui().showToast({ message: draftIds.length === 1 ? "Draft discarded." : `${draftIds.length} drafts discarded.`, undo, actions: [{ label: "Undo", run: undo }] });
          ui().clearSelection();
        })}>
          Discard drafts
        </Button>
      ) : (
        <>
          {allTrash || allSpam ? (
            <>
              <Button variant="text" className="max-sm:px-2" onClick={done(() => actions.deleteForever(ids))}>
                Delete forever
              </Button>
              {allSpam ? (
                <Button variant="text" className="max-sm:px-2" onClick={done(() => actions.notSpam(ids))}>Not spam</Button>
              ) : (
                <IconButton icon="move_to_inbox" label="Move to Inbox" onClick={done(() => actions.moveToInbox(ids))} />
              )}
            </>
          ) : (
            <>
              {anyInbox || !inThread ? (
                <IconButton icon="archive" label="Archive" shortcut="e" disabled={!anyInbox && !snoozed} onClick={done(() => actions.archive(ids))} />
              ) : (
                <IconButton icon="move_to_inbox" label="Move to Inbox" onClick={() => actions.moveToInbox(ids)} />
              )}
              {!compact && <IconButton icon="report" label="Report spam" shortcut="!" onClick={done(() => actions.spam(ids))} />}
              <IconButton icon="delete" label="Delete" shortcut="#" onClick={done(() => actions.trash(ids))} />
            </>
          )}
          {sep}
          {anyUnread ? (
            <IconButton icon="mark_email_read" label="Mark as read" shortcut="⇧I" onClick={() => actions.markRead(ids, true)} />
          ) : (
            <IconButton icon="mark_email_unread" label="Mark as unread" shortcut="⇧U" onClick={done(() => actions.markRead(ids, false))} />
          )}
          {!allTrash && !allSpam && (snoozed && folder === "snoozed" ? (
            <IconButton icon="alarm_off" label="Unsnooze" onClick={done(() => actions.unsnooze(ids))} />
          ) : (
            <SnoozePicker ids={ids} hotkeys={hotkeys} hidden={compact} />
          ))}
          {!compact && ids.length === 1 && <IconButton icon="add_task" label="Add to Tasks" onClick={() => actions.addTask(ids[0])} />}
          {!compact && sep}
          <MovePicker ids={ids} view={view} hotkeys={hotkeys} hidden={compact} />
          <LabelPicker ids={ids} hotkeys={hotkeys} hidden={compact} />
        </>
      )}
      <Menu>
        <Tip label="More">
          <MenuTrigger asChild>
            <button type="button" aria-label="More" className={triggerCls}>
              <Icon name="more_vert" size={20} />
            </button>
          </MenuTrigger>
        </Tip>
        <MenuContent align="end" onCloseAutoFocus={(e) => compact && e.preventDefault()}>
          {compact && !drafts && (
            <>
              {!allTrash && !allSpam && <MenuItem icon="schedule" onSelect={() => setTimeout(() => ui().set({ menu: "snooze" }), 20)}>Snooze</MenuItem>}
              <MenuItem icon="drive_file_move" onSelect={() => setTimeout(() => ui().set({ menu: "move" }), 20)}>Move to</MenuItem>
              <MenuItem icon="label" onSelect={() => setTimeout(() => ui().set({ menu: "label" }), 20)}>Change labels</MenuItem>
              {!allTrash && !allSpam && <MenuItem icon="report" onSelect={done(() => actions.spam(ids))}>Report spam</MenuItem>}
              {ids.length === 1 && <MenuItem icon="add_task" onSelect={() => actions.addTask(ids[0])}>Add to Tasks</MenuItem>}
              <MenuSeparator />
            </>
          )}
          {anyUnread ? (
            <MenuItem icon="mark_email_unread" onSelect={done(() => actions.markRead(ids, false))}>Mark as unread</MenuItem>
          ) : (
            <MenuItem icon="mark_email_read" onSelect={() => actions.markRead(ids, true)}>Mark as read</MenuItem>
          )}
          <MenuItem icon="label_important" onSelect={() => actions.important(ids, !allImportant)}>
            {allImportant ? "Mark as not important" : "Mark as important"}
          </MenuItem>
          <MenuItem icon="star" onSelect={() => actions.star(ids, !allStarred)}>{allStarred ? "Remove star" : "Add star"}</MenuItem>
          {!drafts && (
            <MenuItem icon={anyMuted ? "notifications" : "notifications_off"} onSelect={done(() => actions.mute(ids, !anyMuted))}>
              {anyMuted ? "Unmute" : "Mute"}
            </MenuItem>
          )}
          <MenuSeparator />
          {firstMsg && (
            <MenuItem icon="filter_alt" onSelect={() => setFilterOpen(true)}>Filter messages like these</MenuItem>
          )}
          {firstMsg && (
            <MenuItem icon="person_search" onSelect={() => navigate(routeHash({ view: { kind: "search", query: `from:${firstMsg.from.email}` } }))}>
              Find emails from {firstMsg.from.name.split(" ")[0] || firstMsg.from.email}
            </MenuItem>
          )}
          {inThread && <MenuItem icon="print" onSelect={() => setTimeout(() => window.print(), 50)}>Print all</MenuItem>}
        </MenuContent>
      </Menu>
      {firstMsg && <FilterDialog open={filterOpen} onOpenChange={setFilterOpen} query={`from:${firstMsg.from.email}`} />}
    </div>
  );
}

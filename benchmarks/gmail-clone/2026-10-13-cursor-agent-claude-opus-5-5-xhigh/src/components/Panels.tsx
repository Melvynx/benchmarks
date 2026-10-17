import { useMemo, useState, type ReactNode } from "react";
import { useMail, getMail } from "../lib/store";
import { useUI, ui, type SidePanel as PanelKey } from "../lib/ui";
import { actions } from "../lib/actions";
import { navigate, routeHash } from "../lib/router";
import { DAY, formatTime, sameDay, startOfDay } from "../lib/date";
import type { Density, InboxType, ReadingPane, Theme } from "../lib/types";
import { cn } from "../lib/utils";
import { Avatar, Button, Icon, IconButton, Tip, type IconKey } from "./ui";

function Radio({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: () => void; children: ReactNode }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 font-body text-sm text-fg hover:bg-hover">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="size-4 shrink-0 accent-[var(--primary)]" />
      {children}
    </label>
  );
}

function DensityArt({ d }: { d: Density }) {
  const rows = d === "compact" ? 4 : 3;
  return (
    <span className="ml-auto flex h-8 w-14 flex-col justify-center gap-[3px] rounded border border-outline-soft bg-surface px-1.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="flex items-center gap-1">
          {d !== "compact" && <span className="size-1.5 rounded-full bg-fg-3" />}
          <span className="h-[3px] flex-1 rounded bg-fg-3/60" />
          {d === "default" && i === 0 && <span className="h-[5px] w-3 rounded-sm bg-primary/60" />}
        </span>
      ))}
    </span>
  );
}

export function QuickSettings() {
  const s = useMail((st) => st.settings);
  const set = (p: Partial<typeof s>) => getMail().updateSettings(p);
  const section = (title: string, children: ReactNode, extra?: ReactNode) => (
    <section className="border-b border-line px-4 py-4">
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="font-sans text-xs font-medium uppercase tracking-wider text-fg-2">{title}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
  return (
    <aside className="no-print flex h-full w-[340px] shrink-0 flex-col overflow-hidden rounded-2xl bg-surface max-md:w-full max-md:rounded-none animate-slide-right" aria-label="Quick settings">
      <div className="flex h-14 shrink-0 items-center justify-between pl-6 pr-2">
        <h2 className="font-sans text-base text-fg">Quick settings</h2>
        <IconButton icon="close" label="Close" onClick={() => ui().set({ quickSettings: false })} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="border-b border-line px-6 pb-4">
          <Button variant="outlined" className="w-full" onClick={() => (ui().set({ quickSettings: false }), navigate("settings/general"))}>
            See all settings
          </Button>
        </div>
        {section(
          "Density",
          (["default", "comfortable", "compact"] as Density[]).map((d) => (
            <Radio key={d} name="qs-density" checked={s.density === d} onChange={() => set({ density: d })}>
              <span className="capitalize">{d}</span>
              <DensityArt d={d} />
            </Radio>
          )),
        )}
        {section(
          "Theme",
          <div className="grid grid-cols-3 gap-2 px-1">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={s.theme === t}
                onClick={() => set({ theme: t })}
                className={cn("flex flex-col items-center gap-1.5 rounded-xl border p-2 font-body text-xs capitalize text-fg-2", s.theme === t ? "border-primary bg-primary-soft text-on-primary-soft" : "border-outline-soft hover:bg-hover")}
              >
                <span
                  className="h-10 w-full rounded-md border border-outline-soft"
                  style={{
                    background:
                      t === "light" ? "linear-gradient(#f6f8fc 0 30%, #fff 30%)" : t === "dark" ? "linear-gradient(#1b1b1b 0 30%, #282a2c 30%)" : "linear-gradient(90deg, #fff 50%, #282a2c 50%)",
                  }}
                />
                {t}
              </button>
            ))}
          </div>,
        )}
        {section(
          "Inbox type",
          ([
            ["default", "Default"],
            ["important", "Important first"],
            ["unread", "Unread first"],
            ["starred", "Starred first"],
          ] as [InboxType, string][]).map(([v, l]) => (
            <Radio key={v} name="qs-inbox" checked={s.inboxType === v} onChange={() => set({ inboxType: v })}>
              {l}
              {v === "default" && s.inboxType === "default" && (
                <button type="button" onClick={(e) => (e.preventDefault(), ui().set({ quickSettings: false }), navigate("settings/inbox"))} className="ml-auto rounded px-2 py-1 font-sans text-xs font-medium text-primary hover:bg-hover">
                  Customize
                </button>
              )}
            </Radio>
          )),
        )}
        {section(
          "Reading pane",
          ([
            ["none", "No split"],
            ["right", "Right of inbox"],
            ["below", "Below inbox"],
          ] as [ReadingPane, string][]).map(([v, l]) => (
            <Radio key={v} name="qs-pane" checked={s.readingPane === v} onChange={() => set({ readingPane: v })}>
              {l}
            </Radio>
          )),
        )}
        {section(
          "Demo activity",
          <label className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 font-body text-sm text-fg hover:bg-hover">
            <input type="checkbox" checked={s.simulateActivity} onChange={(e) => set({ simulateActivity: e.target.checked })} className="size-4 accent-[var(--primary)]" />
            Simulate incoming mail &amp; replies
          </label>,
        )}
      </div>
    </aside>
  );
}

const PANELS: { key: Exclude<PanelKey, null>; icon: IconKey; label: string; color: string }[] = [
  { key: "calendar", icon: "calendar_today", label: "Calendar", color: "#1a73e8" },
  { key: "tasks", icon: "task_alt", label: "Tasks", color: "#1e8e3e" },
  { key: "contacts", icon: "contacts", label: "Contacts", color: "#e37400" },
];

export function RightRail() {
  const panel = useUI((s) => s.sidePanel);
  return (
    <nav className="no-print flex w-14 shrink-0 flex-col items-center gap-2 pt-2" aria-label="Side panel">
      {PANELS.map((p) => (
        <Tip key={p.key} label={p.label} side="left">
          <button
            type="button"
            aria-label={p.label}
            aria-pressed={panel === p.key}
            onClick={() => ui().set({ sidePanel: panel === p.key ? null : p.key, quickSettings: false })}
            className={cn("relative inline-flex size-10 items-center justify-center rounded-full hover:bg-hover", panel === p.key && "bg-hover-strong")}
            style={{ color: p.color }}
          >
            <Icon name={p.icon} size={20} fill={panel === p.key} />
          </button>
        </Tip>
      ))}
      <div className="my-1 h-px w-5 bg-line" />
      <Tip label="Keyboard shortcuts" side="left">
        <button type="button" aria-label="Keyboard shortcuts" onClick={() => ui().set({ shortcutsOpen: true })} className="inline-flex size-10 items-center justify-center rounded-full text-icon hover:bg-hover">
          <Icon name="keyboard" size={20} />
        </button>
      </Tip>
    </nav>
  );
}

function CalendarPanel() {
  const messages = useMail((s) => s.messages);
  const threads = useMail((s) => s.threads);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  });
  const [day, setDay] = useState(() => startOfDay(Date.now()));

  const events = useMemo(
    () =>
      Object.values(messages)
        .filter((m) => m.invite && threads[m.threadId] && !threads[m.threadId].labels.includes("TRASH") && !threads[m.threadId].labels.includes("SPAM") && m.invite.response !== "no")
        .map((m) => ({ ...m.invite!, messageId: m.id, threadId: m.threadId }))
        .sort((a, b) => a.start - b.start),
    [messages, threads],
  );

  const d0 = new Date(month);
  const firstDow = d0.getDay();
  const daysInMonth = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(d0.getFullYear(), d0.getMonth(), i + 1).getTime())];
  const today = startOfDay(Date.now());
  const upcoming = events.filter((e) => e.end >= day).slice(0, 12);
  const groups = new Map<number, typeof upcoming>();
  for (const e of upcoming) {
    const k = startOfDay(e.start);
    groups.set(k, [...(groups.get(k) || []), e]);
  }

  return (
    <div className="flex flex-col">
      <div className="px-4 pb-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-sans text-sm font-medium text-fg">{d0.toLocaleString(undefined, { month: "long", year: "numeric" })}</span>
          <div className="flex">
            <IconButton icon="chevron_left" size="sm" label="Previous month" onClick={() => setMonth(new Date(d0.getFullYear(), d0.getMonth() - 1, 1).getTime())} />
            <IconButton icon="chevron_right" size="sm" label="Next month" onClick={() => setMonth(new Date(d0.getFullYear(), d0.getMonth() + 1, 1).getTime())} />
          </div>
        </div>
        <div className="grid grid-cols-7 text-center font-body text-[11px] text-fg-3">
          {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
            <span key={i} className="py-1">{w}</span>
          ))}
          {cells.map((c, i) =>
            c == null ? (
              <span key={i} />
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => setDay(c)}
                aria-label={new Date(c).toDateString()}
                className={cn(
                  "relative mx-auto my-0.5 inline-flex size-8 items-center justify-center rounded-full text-xs",
                  sameDay(c, today) ? "bg-primary text-on-primary" : sameDay(c, day) ? "bg-primary-soft text-on-primary-soft" : "text-fg hover:bg-hover",
                )}
              >
                {new Date(c).getDate()}
                {events.some((e) => sameDay(e.start, c)) && <span className={cn("absolute bottom-1 size-1 rounded-full", sameDay(c, today) ? "bg-on-primary" : "bg-primary")} />}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="border-t border-line px-4 py-3">
        {groups.size === 0 && <p className="py-6 text-center font-body text-sm text-fg-3">No upcoming events from your mail.</p>}
        {[...groups.entries()].map(([k, evs]) => (
          <div key={k} className="mb-3">
            <div className="mb-1 font-sans text-xs font-medium uppercase tracking-wide text-fg-2">
              {sameDay(k, today) ? "Today" : sameDay(k, today + DAY) ? "Tomorrow" : new Date(k).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </div>
            {evs.map((e) => (
              <button
                key={e.messageId}
                type="button"
                onClick={() => navigate(routeHash({ view: { kind: "folder", folder: "all" }, threadId: e.threadId }))}
                className="mb-1.5 flex w-full gap-3 rounded-lg border-l-4 bg-surface-2 py-2 pl-3 pr-2 text-left hover:bg-hover"
                style={{ borderColor: e.response === "yes" ? "var(--primary)" : "var(--outline)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-sans text-sm font-medium text-fg">{e.title}</div>
                  <div className="font-body text-xs text-fg-2">
                    {formatTime(e.start)} – {formatTime(e.end)}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                  <div className="font-body text-[11px] text-fg-3">{e.response === "yes" ? "Going" : e.response === "maybe" ? "Maybe" : "Awaiting your reply"}</div>
                </div>
                {e.videoLink && <Icon name="videocam" size={18} className="mt-0.5 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksPanel() {
  const tasks = useMail((s) => s.tasks);
  const threads = useMail((s) => s.threads);
  const [title, setTitle] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const open = tasks.filter((t) => !t.done).sort((a, b) => b.createdAt - a.createdAt);
  const done = tasks.filter((t) => t.done);

  const add = () => {
    const v = title.trim();
    if (!v) return;
    getMail().addTask(v);
    setTitle("");
  };

  return (
    <div className="flex flex-col px-2">
      <form onSubmit={(e) => (e.preventDefault(), add())} className="mx-2 mb-2 flex h-10 items-center gap-2 rounded-full px-2 text-primary hover:bg-hover focus-within:bg-hover">
        <Icon name="add_task" size={20} />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task" aria-label="Add a task" className="h-full min-w-0 flex-1 bg-transparent font-body text-sm text-fg outline-none placeholder:text-primary" />
      </form>
      {open.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-center font-body text-sm text-fg-3">
          <Icon name="task_alt" size={40} />
          All tasks complete
        </div>
      )}
      <ul>
        {open.map((t) => (
          <li key={t.id} className="group flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-hover">
            <button type="button" aria-label={`Mark “${t.title}” complete`} onClick={() => getMail().updateTask(t.id, { done: true })} className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-fg-2 hover:text-primary">
              <Icon name="radio_button_unchecked" size={20} className="group-hover:hidden" />
              <Icon name="check" size={20} className="hidden group-hover:block" />
            </button>
            <div className="min-w-0 flex-1">
              {editing === t.id ? (
                <input
                  autoFocus
                  defaultValue={t.title}
                  aria-label="Task title"
                  onBlur={(e) => (getMail().updateTask(t.id, { title: e.target.value.trim() || t.title }), setEditing(null))}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && (e.currentTarget as HTMLInputElement).blur()}
                  className="w-full rounded bg-transparent font-body text-sm text-fg outline-none ring-1 ring-primary"
                />
              ) : (
                <button type="button" onClick={() => setEditing(t.id)} className="w-full text-left font-body text-sm text-fg">
                  {t.title}
                </button>
              )}
              {t.threadId && threads[t.threadId] && (
                <button
                  type="button"
                  onClick={() => navigate(routeHash({ view: { kind: "folder", folder: "all" }, threadId: t.threadId }))}
                  className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full border border-outline-soft px-2 py-0.5 font-body text-xs text-fg-2 hover:bg-surface"
                >
                  <Icon name="mail" size={14} />
                  <span className="truncate">{threads[t.threadId].subject}</span>
                </button>
              )}
            </div>
            <IconButton icon="delete" size="xs" label="Delete task" className="opacity-0 group-hover:opacity-100 focus:opacity-100" onClick={() => getMail().deleteTask(t.id)} />
          </li>
        ))}
      </ul>
      {done.length > 0 && (
        <div className="mt-2 border-t border-line pt-2">
          <button type="button" onClick={() => setShowDone(!showDone)} className="flex h-9 w-full items-center gap-2 rounded-lg px-2 font-sans text-sm text-fg-2 hover:bg-hover">
            <Icon name={showDone ? "keyboard_arrow_down" : "chevron_right"} size={20} />
            Completed ({done.length})
          </button>
          {showDone &&
            done.map((t) => (
              <div key={t.id} className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-hover">
                <button type="button" aria-label={`Mark “${t.title}” incomplete`} onClick={() => getMail().updateTask(t.id, { done: false })} className="inline-flex size-6 items-center justify-center text-primary">
                  <Icon name="check" size={20} />
                </button>
                <span className="min-w-0 flex-1 truncate font-body text-sm text-fg-3 line-through">{t.title}</span>
                <IconButton icon="delete" size="xs" label="Delete task" className="opacity-0 group-hover:opacity-100" onClick={() => getMail().deleteTask(t.id)} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function ContactsPanel() {
  const contacts = useMail((s) => s.contacts);
  const messages = useMail((s) => s.messages);
  const [q, setQ] = useState("");
  const ranked = useMemo(() => {
    const freq = new Map<string, number>();
    for (const m of Object.values(messages)) for (const a of [m.from, ...m.to]) freq.set(a.email, (freq.get(a.email) || 0) + 1);
    return Object.values(contacts)
      .filter((c) => !/noreply|no-reply|notifications|news|hello@|deals|team@|digest/i.test(c.email))
      .sort((a, b) => (freq.get(b.email) || 0) - (freq.get(a.email) || 0));
  }, [contacts, messages]);
  const list = q.trim() ? ranked.filter((c) => `${c.name} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(q.toLowerCase())) : ranked;

  return (
    <div className="flex flex-col">
      <div className="mx-4 mb-2 flex h-10 items-center gap-2 rounded-full bg-search px-3">
        <Icon name="search" size={18} className="text-icon" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" className="h-full min-w-0 flex-1 bg-transparent font-body text-sm text-fg outline-none placeholder:text-fg-3" />
      </div>
      {!q && <div className="px-6 pb-1 pt-2 font-sans text-xs font-medium uppercase tracking-wide text-fg-3">Frequently contacted</div>}
      <ul>
        {list.slice(0, 40).map((c) => (
          <li key={c.email} className="group flex items-center gap-3 px-4 py-2 hover:bg-hover">
            <Avatar name={c.name} email={c.email} size={36} color={c.color} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-body text-sm text-fg">{c.name || c.email}</div>
              <div className="truncate font-body text-xs text-fg-3">{c.title && c.company ? `${c.title}, ${c.company}` : c.email}</div>
            </div>
            <div className="flex opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <IconButton icon="mail" size="xs" label={`Email ${c.name}`} onClick={() => actions.compose({ kind: "new", to: [{ name: c.name, email: c.email }] })} />
              <IconButton
                icon="search"
                size="xs"
                label="Search mail"
                onClick={() => navigate(routeHash({ view: { kind: "search", query: `from:${c.email} OR to:${c.email}` } }))}
              />
            </div>
          </li>
        ))}
        {!list.length && <li className="px-6 py-8 text-center font-body text-sm text-fg-3">No contacts match “{q}”</li>}
      </ul>
    </div>
  );
}

export function SidePanel() {
  const panel = useUI((s) => s.sidePanel);
  if (!panel) return null;
  const meta = PANELS.find((p) => p.key === panel)!;
  return (
    <aside className="no-print flex h-full w-[320px] shrink-0 flex-col overflow-hidden rounded-2xl bg-surface animate-slide-right" aria-label={meta.label}>
      <div className="flex h-14 shrink-0 items-center gap-2 pl-5 pr-2">
        <Icon name={meta.icon} size={20} style={{ color: meta.color }} />
        <h2 className="flex-1 font-sans text-base text-fg">{panel === "tasks" ? "My Tasks" : meta.label}</h2>
        <IconButton icon="close" label="Close" onClick={() => ui().set({ sidePanel: null })} />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {panel === "calendar" && <CalendarPanel />}
        {panel === "tasks" && <TasksPanel />}
        {panel === "contacts" && <ContactsPanel />}
      </div>
    </aside>
  );
}

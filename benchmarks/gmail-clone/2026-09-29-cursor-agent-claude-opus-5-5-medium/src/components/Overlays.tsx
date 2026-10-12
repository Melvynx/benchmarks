import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { X, Check } from "lucide-react";
import { useMail } from "../lib/store";
import type { Density, ReadingPane, Settings, Theme, Toast } from "../lib/types";
import { IconButton, Modal, useIsMobile } from "./ui";

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useMail((s) => s.dismissToast);
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (hover) return;
    const id = setTimeout(() => dismiss(t.id), t.duration ?? (t.action ? 7000 : 4500));
    return () => clearTimeout(id);
  }, [t, dismiss, hover]);
  return (
    <div
      role="status"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="anim-slide pointer-events-auto flex min-h-12 w-full items-center gap-2 rounded-md bg-[#303030] py-1.5 pl-4 pr-1.5 text-sm text-[#f2f2f2] shadow-float sm:w-auto sm:min-w-[344px] sm:max-w-[560px] dark:bg-[#e3e3e3] dark:text-[#1f1f1f]"
    >
      <span className="flex-1 py-1.5">{t.text}</span>
      {t.action && (
        <button
          className="rounded px-3 py-2 font-medium text-[#a8c7fa] hover:bg-white/10 dark:text-[#0b57d0] dark:hover:bg-black/5"
          onClick={() => {
            t.action!.run();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </button>
      )}
      {t.secondary && (
        <button
          className="rounded px-3 py-2 font-medium text-[#a8c7fa] hover:bg-white/10 dark:text-[#0b57d0] dark:hover:bg-black/5"
          onClick={() => {
            t.secondary!.run();
            dismiss(t.id);
          }}
        >
          {t.secondary.label}
        </button>
      )}
      <button aria-label="Dismiss" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10 dark:hover:bg-black/5" onClick={() => dismiss(t.id)}>
        <X size={18} />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useMail((s) => s.toasts);
  const isMobile = useIsMobile();
  return (
    <div
      aria-live="polite"
      className={clsx(
        "no-print pointer-events-none fixed z-[85] flex flex-col gap-2",
        isMobile ? "inset-x-3 bottom-20" : "bottom-6 left-6",
      )}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}

function Radio<T extends string>({ value, current, onChange, children, preview }: { value: T; current: T; onChange: (v: T) => void; children: ReactNode; preview?: ReactNode }) {
  const on = value === current;
  return (
    <button
      onClick={() => onChange(value)}
      role="radio"
      aria-checked={on}
      className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left text-sm hover:bg-hover"
    >
      <span className={clsx("ml-1 flex h-5 w-5 items-center justify-center rounded-full border-2", on ? "border-primary" : "border-ink-3")}>
        {on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </span>
      <span className="flex-1">{children}</span>
      {preview}
    </button>
  );
}

function DensityPreview({ rows, gap }: { rows: number; gap: number }) {
  return (
    <span className="flex w-12 flex-col rounded border border-line p-1" style={{ gap }}>
      {Array.from({ length: rows }).map((_, i) => (
        <span key={i} className="h-1 rounded-sm bg-ink-3/40" />
      ))}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-divider px-5 py-4">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-2">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex w-full items-center gap-3 py-1.5 text-left text-sm">
      <span className="flex-1">
        {label}
        {hint && <span className="block text-xs text-ink-3">{hint}</span>}
      </span>
      <span className={clsx("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-primary" : "bg-chip")}>
        <span className={clsx("absolute top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface transition-[left]", on ? "left-5" : "left-1")}>
          {on && <Check size={10} className="text-primary" strokeWidth={4} />}
        </span>
      </span>
    </button>
  );
}

export function SettingsPanel() {
  const open = useMail((s) => s.settingsOpen);
  const settings = useMail((s) => s.settings);
  const update = useMail((s) => s.updateSettings);
  const set = useMail((s) => s.set);
  const [sig, setSig] = useState(settings.signature);
  useEffect(() => setSig(settings.signature), [settings.signature, open]);
  useEffect(() => {
    if (!open) return;
    const on = (e: KeyboardEvent) => e.key === "Escape" && set({ settingsOpen: false });
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [open, set]);
  if (!open) return null;
  const u = <K extends keyof Settings>(k: K) => (v: Settings[K]) => update({ [k]: v } as Partial<Settings>);
  return (
    <div className="fixed inset-0 z-[75]" onClick={() => set({ settingsOpen: false })}>
      <aside
        aria-label="Quick settings"
        className="anim-slide scroll-thin absolute bottom-0 right-0 top-0 w-[360px] max-w-full overflow-y-auto border-l border-divider bg-surface shadow-float sm:bottom-2 sm:right-2 sm:top-16 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="font-display text-lg">Quick settings</h2>
          <IconButton tip="Close" onClick={() => set({ settingsOpen: false })}>
            <X size={20} />
          </IconButton>
        </div>
        <Section title="Theme">
          {(["light", "dark", "system"] as Theme[]).map((t) => (
            <Radio key={t} value={t} current={settings.theme} onChange={u("theme")}>
              {t === "system" ? "Device default" : t[0].toUpperCase() + t.slice(1)}
            </Radio>
          ))}
        </Section>
        <Section title="Density">
          {(["default", "comfortable", "compact"] as Density[]).map((d) => (
            <Radio key={d} value={d} current={settings.density} onChange={u("density")} preview={<DensityPreview rows={d === "compact" ? 4 : 3} gap={d === "compact" ? 2 : d === "comfortable" ? 4 : 3} />}>
              {d[0].toUpperCase() + d.slice(1)}
              {d === "default" && <span className="block text-xs text-ink-3">Shows attachment chips in the list</span>}
            </Radio>
          ))}
        </Section>
        <Section title="Inbox type">
          <Toggle on={settings.inboxTabs} onChange={u("inboxTabs")} label="Category tabs" hint="Primary, Promotions, Social, Updates" />
        </Section>
        <Section title="Reading pane">
          {(["none", "right"] as ReadingPane[]).map((p) => (
            <Radio key={p} value={p} current={settings.readingPane} onChange={u("readingPane")}>
              {p === "none" ? "No split" : "Right of inbox"}
              {p === "right" && <span className="block text-xs text-ink-3">Desktop only</span>}
            </Radio>
          ))}
        </Section>
        <Section title="Sending">
          <label className="flex items-center justify-between py-1.5 text-sm">
            Undo send period
            <select
              value={settings.undoSeconds}
              onChange={(e) => update({ undoSeconds: +e.target.value })}
              className="rounded border border-line bg-surface px-2 py-1 text-sm"
            >
              {[5, 10, 20, 30].map((s) => (
                <option key={s} value={s}>{s} seconds</option>
              ))}
            </select>
          </label>
          <label className="mt-2 block text-sm">
            Signature
            <textarea
              value={sig}
              onChange={(e) => setSig(e.target.value)}
              onBlur={() => update({ signature: sig })}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-line bg-transparent px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </Section>
        <Section title="General">
          <label className="flex items-center justify-between py-1.5 text-sm">
            Conversations per page
            <select value={settings.pageSize} onChange={(e) => update({ pageSize: +e.target.value })} className="rounded border border-line bg-surface px-2 py-1 text-sm">
              {[10, 15, 25, 50, 100].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <Toggle on={settings.shortcuts} onChange={u("shortcuts")} label="Keyboard shortcuts" hint="Press ? to see them all" />
          <Toggle on={settings.simulateIncoming} onChange={u("simulateIncoming")} label="Simulate incoming mail" hint="New messages arrive while the app is open" />
        </Section>
        <div className="px-5 py-4 text-xs text-ink-3">Settings and mail are saved locally in this browser.</div>
      </aside>
    </div>
  );
}

const SHORTCUTS: [string, [string, string][]][] = [
  ["Compose & chat", [["c", "Compose"], ["⌘ Enter", "Send (in compose)"], ["r", "Reply"], ["a", "Reply all"], ["f", "Forward"], ["Esc", "Close compose / menu"]]],
  ["Navigation", [["j / k", "Older / newer conversation"], ["o or Enter", "Open conversation"], ["u", "Back to list"], ["/", "Search mail"], ["g then i", "Go to Inbox"], ["g then s", "Go to Starred"], ["g then t", "Go to Sent"], ["g then d", "Go to Drafts"], ["g then a", "Go to All Mail"]]],
  ["Actions", [["x", "Select conversation"], ["s", "Star / unstar"], ["e", "Archive"], ["#", "Delete"], ["!", "Report spam"], ["Shift + i", "Mark as read"], ["Shift + u", "Mark as unread"], ["b", "Snooze"], ["l", "Label as"], ["v", "Move to"], ["m", "Mute"], ["z", "Undo last action"]]],
  ["Selection", [["* then a", "Select all"], ["* then n", "Deselect all"], ["* then u", "Select unread"], ["* then r", "Select read"]]],
];

export function ShortcutsDialog() {
  const open = useMail((s) => s.shortcutsOpen);
  const set = useMail((s) => s.set);
  const enabled = useMail((s) => s.settings.shortcuts);
  if (!open) return null;
  return (
    <Modal label="Keyboard shortcuts" onClose={() => set({ shortcutsOpen: false })} className="w-[min(880px,100%)]">
      <div className="flex items-center justify-between border-b border-divider px-6 py-4">
        <h2 className="font-display text-xl">Keyboard shortcuts</h2>
        <IconButton tip="Close" onClick={() => set({ shortcutsOpen: false })}>
          <X size={20} />
        </IconButton>
      </div>
      {!enabled && (
        <div className="bg-search px-6 py-2 text-sm text-ink-2">
          Keyboard shortcuts are off.{" "}
          <button className="font-medium text-primary" onClick={() => useMail.getState().updateSettings({ shortcuts: true })}>
            Turn them on
          </button>
        </div>
      )}
      <div className="grid gap-x-10 gap-y-6 px-6 py-5 md:grid-cols-2">
        {SHORTCUTS.map(([title, list]) => (
          <div key={title}>
            <h3 className="mb-2 text-sm font-medium text-primary">{title}</h3>
            <dl className="space-y-1.5">
              {list.map(([k, d]) => (
                <div key={k} className="flex items-center gap-4 text-sm">
                  <dt className="w-28 shrink-0">
                    {k.split(" ").map((part, i) =>
                      ["then", "or", "/", "+"].includes(part) ? (
                        <span key={i} className="mx-1 text-xs text-ink-3">{part}</span>
                      ) : (
                        <kbd key={i} className="inline-block min-w-6 rounded border border-line bg-search px-1.5 py-0.5 text-center font-mono text-xs">
                          {part}
                        </kbd>
                      ),
                    )}
                  </dt>
                  <dd className="text-ink-2">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Modal>
  );
}

const COLORS = ["#4285f4", "#e91e63", "#16a765", "#fb8c00", "#8e24aa", "#00acc1", "#f4511e", "#7cb342", "#5c6bc0", "#78909c", "#d50000", "#795548"];

export function LabelDialog() {
  const dlg = useMail((s) => s.labelDialog);
  const labels = useMail((s) => s.labels);
  const set = useMail((s) => s.set);
  const editing = dlg?.id ? labels.find((l) => l.id === dlg.id) : undefined;
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  useEffect(() => {
    if (!dlg) return;
    setName(editing?.name ?? "");
    setColor(editing?.color ?? COLORS[labels.length % COLORS.length]);
  }, [dlg]);
  if (!dlg) return null;
  const close = () => set({ labelDialog: null });
  const duplicate = labels.some((l) => l.name.toLowerCase() === name.trim().toLowerCase() && l.id !== editing?.id);
  const submit = () => {
    if (!name.trim() || duplicate) return;
    const s = useMail.getState();
    if (editing) {
      s.updateLabel(editing.id, { name: name.trim(), color });
      s.toast({ text: `Label "${name.trim()}" updated.` });
    } else {
      const id = s.createLabel(name.trim(), color);
      if (dlg.applyTo?.length) s.applyLabels(dlg.applyTo, [id], []);
      else s.toast({ text: `Label "${name.trim()}" created.` });
    }
    close();
  };
  return (
    <Modal label={editing ? "Edit label" : "New label"} onClose={close} className="w-[min(420px,100%)] p-6">
      <h2 className="font-display text-xl">{editing ? "Edit label" : "New label"}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="mt-5 block text-sm text-ink-2">
          {editing ? "Label name" : "Please enter a new label name:"}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-md border border-line bg-transparent px-3 py-2 text-base text-ink outline-none focus:border-primary"
          />
        </label>
        {duplicate && <div className="mt-2 text-xs text-danger">A label with this name already exists.</div>}
        <div className="mt-4 text-sm text-ink-2">Color</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              aria-label={`Color ${c}`}
              onClick={() => setColor(c)}
              className={clsx("flex h-7 w-7 items-center justify-center rounded-full", color === c && "ring-2 ring-offset-2 ring-offset-[var(--menu)]")}
              style={{ background: c, ["--tw-ring-color" as string]: c }}
            >
              {color === c && <Check size={14} className="text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={close} className="rounded-full px-5 py-2 text-sm font-medium text-primary hover:bg-hover">
            Cancel
          </button>
          <button type="submit" disabled={!name.trim() || duplicate} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:opacity-40">
            {editing ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

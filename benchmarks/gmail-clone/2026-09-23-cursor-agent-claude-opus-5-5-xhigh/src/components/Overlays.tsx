import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatLongDate, toLocalInputValue } from "../lib/format";
import { useIsMobile } from "../lib/hooks";
import { useMail } from "../lib/store";
import type { Density, InboxType, LabelColor, ReadingPane, Theme } from "../lib/types";
import { useUI } from "../lib/ui";
import { cn, LABEL_COLORS } from "../lib/utils";
import { AttachmentViewer } from "./Attachments";
import { Button, Icon, IconButton, Modal, Spinner } from "./ui";

export function Toaster() {
  const toast = useUI((s) => s.toast);
  const dismiss = useUI((s) => s.dismissToast);
  const isMobile = useIsMobile();
  const [hover, setHover] = useState(false);
  useEffect(() => {
    if (!toast || hover) return;
    const t = window.setTimeout(dismiss, toast.duration ?? 6000);
    return () => window.clearTimeout(t);
  }, [toast, hover, dismiss]);
  if (!toast) return null;
  return createPortal(
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        "animate-slide-up fixed z-[950] flex min-h-12 items-center gap-2 rounded bg-toast py-1.5 pl-6 pr-2 text-sm text-on-toast shadow-pop",
        isMobile ? "inset-x-3 bottom-24" : "bottom-6 left-6 max-w-[560px]",
      )}
    >
      {toast.busy && <Spinner size={16} className="mr-1" />}
      <span className="min-w-0 flex-1 py-1.5 pr-2">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            dismiss();
            toast.action!.run();
          }}
          className="h-9 shrink-0 rounded px-3 font-medium text-toast-action hover:bg-white/10 dark:hover:bg-black/5"
        >
          {toast.action.label}
        </button>
      )}
      {toast.secondary && (
        <button
          type="button"
          onClick={() => {
            dismiss();
            toast.secondary!.run();
          }}
          className="h-9 shrink-0 rounded px-3 font-medium text-toast-action hover:bg-white/10 dark:hover:bg-black/5"
        >
          {toast.secondary.label}
        </button>
      )}
      <button type="button" aria-label="Dismiss" onClick={dismiss} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full opacity-80 hover:bg-white/10 hover:opacity-100 dark:hover:bg-black/5">
        <Icon name="close" size={18} />
      </button>
    </div>,
    document.body,
  );
}

export function Dialogs() {
  const dialog = useUI((s) => s.dialog);
  const close = useUI((s) => s.closeDialog);
  if (!dialog) return null;
  switch (dialog.type) {
    case "confirm":
      return (
        <Modal onClose={close} className="w-[440px] max-w-[calc(100vw-32px)] p-6" labelledBy="confirm-title">
          <h2 id="confirm-title" className="font-display text-xl text-fg">
            {dialog.title}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-2">{dialog.body}</p>
          <div className="mt-6 flex justify-end gap-2">
            {dialog.title !== "Error" && <Button onClick={close}>Cancel</Button>}
            <Button
              autoFocus
              variant={dialog.danger ? "danger" : "filled"}
              onClick={() => {
                close();
                dialog.onConfirm();
              }}
            >
              {dialog.confirmLabel}
            </Button>
          </div>
        </Modal>
      );
    case "shortcuts":
      return <ShortcutsDialog />;
    case "createLabel":
    case "editLabel":
      return <LabelDialog />;
    case "attachment":
      return <AttachmentViewer attachments={dialog.attachments} index={dialog.index} sender={dialog.sender} />;
    case "original":
      return <OriginalDialog messageId={dialog.messageId} />;
    case "datetime":
      return <DateTimeDialog title={dialog.title} initial={dialog.initial} onPick={dialog.onPick} />;
  }
}

function DateTimeDialog({ title, initial, onPick }: { title: string; initial: number; onPick: (ts: number) => void }) {
  const close = useUI((s) => s.closeDialog);
  const [value, setValue] = useState(toLocalInputValue(initial));
  const ts = new Date(value).getTime();
  const valid = ts > Date.now();
  return (
    <Modal onClose={close} className="w-[360px] max-w-[calc(100vw-32px)] p-6" labelledBy="dt-title">
      <h2 id="dt-title" className="font-display text-xl">
        {title}
      </h2>
      <input
        type="datetime-local"
        autoFocus
        value={value}
        min={toLocalInputValue(Date.now())}
        onChange={(e) => setValue(e.target.value)}
        className="mt-5 block h-11 w-full rounded-md border border-line bg-transparent px-3 text-fg"
      />
      {valid && <div className="mt-2 text-xs text-fg-3">{formatLongDate(ts)}</div>}
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={close}>Cancel</Button>
        <Button
          variant="filled"
          disabled={!valid}
          onClick={() => {
            close();
            onPick(ts);
          }}
        >
          Save
        </Button>
      </div>
    </Modal>
  );
}

function LabelDialog() {
  const dialog = useUI((s) => s.dialog)!;
  const close = useUI((s) => s.closeDialog);
  const showToast = useUI((s) => s.showToast);
  const labels = useMail((s) => s.labels);
  const createLabel = useMail((s) => s.createLabel);
  const updateLabel = useMail((s) => s.updateLabel);
  const setLabel = useMail((s) => s.setLabel);
  const editing = dialog.type === "editLabel" ? labels.find((l) => l.id === dialog.id) : undefined;
  const [name, setName] = useState(editing?.name ?? "");
  const [color, setColor] = useState<LabelColor>(editing?.color ?? "blue");
  const dup = labels.some((l) => l.name.toLowerCase() === name.trim().toLowerCase() && l.id !== editing?.id);
  const submit = () => {
    if (!name.trim() || dup) return;
    if (editing) {
      updateLabel(editing.id, { name: name.trim(), color });
      showToast({ message: `Label "${name.trim()}" updated.` });
    } else {
      const id = createLabel(name, color);
      const applyTo = dialog.type === "createLabel" ? dialog.applyTo : undefined;
      if (applyTo?.length) setLabel(applyTo, id, true);
      showToast({ message: applyTo?.length ? `Label "${name.trim()}" created and applied.` : `Label "${name.trim()}" created.` });
    }
    close();
  };
  return (
    <Modal onClose={close} className="w-[420px] max-w-[calc(100vw-32px)] p-6" labelledBy="label-title">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 id="label-title" className="font-display text-xl">
          {editing ? "Edit label" : "New label"}
        </h2>
        <label className="mt-5 block text-sm text-fg-2">
          {editing ? "Label name" : "Please enter a new label name:"}
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            className="mt-2 block h-10 w-full rounded-md border border-line bg-transparent px-3 text-fg focus:border-accent focus:outline-none"
          />
        </label>
        {dup && <div className="mt-1 text-xs text-danger">A label with this name already exists.</div>}
        <div className="mt-5 text-sm text-fg-2">Color</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(LABEL_COLORS) as LabelColor[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={LABEL_COLORS[c].name}
              aria-pressed={color === c}
              data-tip={LABEL_COLORS[c].name}
              onClick={() => setColor(c)}
              className={cn("flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110", color === c && "ring-2 ring-accent ring-offset-2 ring-offset-raised")}
              style={{ background: LABEL_COLORS[c].dot }}
            >
              {color === c && <Icon name="check" size={18} className="text-white" />}
            </button>
          ))}
        </div>
        <div className="mt-7 flex justify-end gap-2">
          <Button onClick={close}>Cancel</Button>
          <Button variant="filled" type="submit" disabled={!name.trim() || dup}>
            {editing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function OriginalDialog({ messageId }: { messageId: string }) {
  const close = useUI((s) => s.closeDialog);
  const m = useMail((s) => s.messages[messageId]);
  const t = useMail((s) => (m ? s.threads[m.threadId] : undefined));
  const [copied, setCopied] = useState(false);
  if (!m || !t) return null;
  const raw = [
    `Delivered-To: avery@lumenlabs.io`,
    `Received: by 2002:a05:6a10:${m.id.slice(-4)} with SMTP id local;`,
    `        ${new Date(m.date).toUTCString()}`,
    `ARC-Authentication-Results: i=1; mx.lumenlabs.io; spf=pass smtp.mailfrom=${m.from.email.split("@")[1]}; dkim=pass`,
    `Return-Path: <${m.from.email}>`,
    `Message-ID: <${m.id}@${m.from.email.split("@")[1]}>`,
    `Date: ${new Date(m.date).toUTCString()}`,
    `From: ${m.from.name} <${m.from.email}>`,
    `To: ${m.to.map((c) => `${c.name} <${c.email}>`).join(", ")}`,
    m.cc.length ? `Cc: ${m.cc.map((c) => `${c.name} <${c.email}>`).join(", ")}` : "",
    `Subject: ${t.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    m.html,
  ]
    .filter((l, i) => l !== "" || i === 14)
    .join("\n");
  return (
    <Modal onClose={close} className="flex h-[80vh] w-[860px] max-w-[calc(100vw-32px)] flex-col" labelledBy="orig-title">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <h2 id="orig-title" className="flex-1 font-display text-xl">
          Original message
        </h2>
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard?.writeText(raw);
            setCopied(true);
          }}
        >
          <Icon name={copied ? "check" : "content_copy"} size={18} /> {copied ? "Copied" : "Copy to clipboard"}
        </Button>
        <IconButton icon="close" label="Close" onClick={close} />
      </div>
      <div className="grid grid-cols-[140px_1fr] gap-y-2 border-b border-line px-6 py-4 text-sm">
        <span className="text-fg-3">Message ID</span>
        <span className="font-mono text-xs">&lt;{m.id}@{m.from.email.split("@")[1]}&gt;</span>
        <span className="text-fg-3">Created at</span>
        <span>{formatLongDate(m.date)}</span>
        <span className="text-fg-3">SPF / DKIM</span>
        <span className="text-[#188038] dark:text-[#81c995]">PASS · PASS</span>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-all px-6 py-4 font-mono text-xs text-fg-2">{raw}</pre>
    </Modal>
  );
}

const SHORTCUTS: [string, [string, string][]][] = [
  [
    "Actions",
    [
      ["c", "Compose"],
      ["/", "Search mail"],
      ["r / a / f", "Reply / Reply all / Forward"],
      ["e", "Archive"],
      ["#", "Delete"],
      ["!", "Report spam"],
      ["s", "Star / unstar"],
      ["+ / −", "Mark important / not important"],
      ["Shift + i / u", "Mark as read / unread"],
      ["b", "Snooze…"],
      ["l", "Label as…"],
      ["v", "Move to…"],
      ["z", "Undo last action"],
      ["⌘/Ctrl + Enter", "Send message"],
    ],
  ],
  [
    "Navigation",
    [
      ["j / k", "Older / newer conversation"],
      ["o or Enter", "Open conversation"],
      ["u", "Back to list"],
      ["x", "Select conversation"],
      ["* a / * n", "Select all / none"],
      ["* u / * r", "Select unread / read"],
      ["* s / * t", "Select starred / unstarred"],
      ["g then i", "Go to Inbox"],
      ["g then s", "Go to Starred"],
      ["g then b", "Go to Snoozed"],
      ["g then t", "Go to Sent"],
      ["g then d", "Go to Drafts"],
      ["g then c", "Go to Scheduled"],
      ["g then p", "Go to Important"],
      ["g then a", "Go to All Mail"],
      ["?", "Show this help"],
      ["Esc", "Close dialog / compose"],
    ],
  ],
];

function ShortcutsDialog() {
  const close = useUI((s) => s.closeDialog);
  const enabled = useMail((s) => s.settings.shortcuts);
  const updateSettings = useMail((s) => s.updateSettings);
  return (
    <Modal onClose={close} className="w-[760px] max-w-[calc(100vw-32px)]" labelledBy="kbd-title">
      <div className="flex items-center gap-3 border-b border-line px-6 py-4">
        <h2 id="kbd-title" className="flex-1 font-display text-xl">
          Keyboard shortcuts
        </h2>
        <label className="flex items-center gap-2 text-sm text-fg-2">
          <input type="checkbox" checked={enabled} onChange={(e) => updateSettings({ shortcuts: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
          Enabled
        </label>
        <IconButton icon="close" label="Close" onClick={close} />
      </div>
      <div className="grid gap-x-10 gap-y-2 px-6 py-5 sm:grid-cols-2">
        {SHORTCUTS.map(([group, items]) => (
          <div key={group}>
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-accent">{group}</div>
            {items.map(([k, d]) => (
              <div key={k} className="flex items-center justify-between gap-4 border-b border-line-soft py-2 text-sm">
                <span className="text-fg-2">{d}</span>
                <span className="shrink-0 font-mono text-xs">
                  {k.split(" ").map((p, i) =>
                    ["then", "or", "/", "+"].includes(p) ? (
                      <span key={i} className="px-1 font-sans text-fg-3">
                        {p}
                      </span>
                    ) : (
                      <kbd key={i} className="rounded border border-line bg-surface-3 px-1.5 py-0.5">
                        {p}
                      </kbd>
                    ),
                  )}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function Radio<T extends string>({
  name,
  value,
  current,
  onChange,
  label,
  preview,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (v: T) => void;
  label: string;
  preview?: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg py-1.5 pr-2 hover:bg-hover">
      <input type="radio" name={name} checked={value === current} onChange={() => onChange(value)} className="ml-2 h-4 w-4 accent-[var(--accent)]" />
      <span className="flex-1 text-sm">{label}</span>
      {preview}
    </label>
  );
}

function DensityPreview({ rows, gap, chips }: { rows: number; gap: number; chips?: boolean }) {
  return (
    <span className="flex w-12 flex-col rounded border border-line bg-surface p-1" style={{ gap }}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="flex items-center gap-0.5">
          <span className="h-1 w-1 rounded-sm bg-fg-3" />
          <span className="h-1 flex-1 rounded-sm bg-line" />
          {chips && i === 0 && <span className="h-1 w-2 rounded-sm bg-accent" />}
        </span>
      ))}
    </span>
  );
}

export function SettingsPanel() {
  const open = useUI((s) => s.settingsOpen);
  const setOpen = useUI((s) => s.setSettingsOpen);
  const settings = useMail((s) => s.settings);
  const update = useMail((s) => s.updateSettings);
  const openDialog = useUI((s) => s.openDialog);
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, setOpen]);
  if (!open) return null;

  const section = (title: string, children: React.ReactNode) => (
    <section className="border-b border-line px-5 py-4">
      <h3 className="mb-2 text-sm font-medium text-fg">{title}</h3>
      {children}
    </section>
  );

  return createPortal(
    <>
      <aside
        ref={panelRef}
        className={cn(
          "animate-panel fixed bottom-0 right-0 z-[680] flex flex-col bg-raised shadow-pop",
          isMobile ? "top-0 w-full" : "top-16 w-[340px] rounded-tl-2xl",
        )}
        aria-label="Quick settings"
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-line pl-5 pr-2">
          <h2 className="font-display text-lg">Quick settings</h2>
          <IconButton icon="close" label="Close" onClick={() => setOpen(false)} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {section(
            "Theme",
            <div className="grid grid-cols-3 gap-2">
              {(["light", "dark", "system"] as Theme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ theme: t })}
                  aria-pressed={settings.theme === t}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs",
                    settings.theme === t ? "border-accent bg-accent-soft/50 font-medium" : "border-line hover:bg-hover",
                  )}
                >
                  <span
                    className="h-10 w-full overflow-hidden rounded-md border border-line"
                    style={{
                      background: t === "light" ? "#f6f8fc" : t === "dark" ? "#111214" : "linear-gradient(90deg,#f6f8fc 50%,#111214 50%)",
                    }}
                  >
                    <span className="m-1.5 block h-1.5 w-2/3 rounded-sm" style={{ background: t === "dark" ? "#3a3c3f" : "#c2e7ff" }} />
                  </span>
                  {t === "light" ? "Light" : t === "dark" ? "Dark" : "System"}
                </button>
              ))}
            </div>,
          )}
          {section(
            "Density",
            <>
              <Radio name="density" value={"default" as Density} current={settings.density} onChange={(v) => update({ density: v })} label="Default" preview={<DensityPreview rows={3} gap={3} chips />} />
              <Radio name="density" value={"comfortable" as Density} current={settings.density} onChange={(v) => update({ density: v })} label="Comfortable" preview={<DensityPreview rows={3} gap={3} />} />
              <Radio name="density" value={"compact" as Density} current={settings.density} onChange={(v) => update({ density: v })} label="Compact" preview={<DensityPreview rows={4} gap={1} />} />
            </>,
          )}
          {section(
            "Inbox type",
            <>
              {(
                [
                  ["default", "Default (category tabs)"],
                  ["important", "Important first"],
                  ["unread", "Unread first"],
                  ["starred", "Starred first"],
                ] as [InboxType, string][]
              ).map(([v, l]) => (
                <Radio key={v} name="inboxType" value={v} current={settings.inboxType} onChange={(x) => update({ inboxType: x })} label={l} />
              ))}
            </>,
          )}
          {!isMobile &&
            section(
              "Reading pane",
              <>
                {(
                  [
                    ["none", "No split", "view_agenda"],
                    ["right", "Right of inbox", "vertical_split"],
                    ["bottom", "Below inbox", "horizontal_split"],
                  ] as [ReadingPane, string, string][]
                ).map(([v, l, icon]) => (
                  <Radio key={v} name="pane" value={v} current={settings.readingPane} onChange={(x) => update({ readingPane: x })} label={l} preview={<Icon name={icon} className="text-fg-3" />} />
                ))}
              </>,
            )}
          {section(
            "Sending",
            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                Undo send period
                <select value={settings.undoSeconds} onChange={(e) => update({ undoSeconds: Number(e.target.value) })} className="h-8 rounded border border-line bg-transparent px-2">
                  {[5, 10, 20, 30].map((s) => (
                    <option key={s} value={s}>
                      {s} seconds
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center justify-between gap-3 text-sm">
                Conversations per page
                <select value={settings.pageSize} onChange={(e) => update({ pageSize: Number(e.target.value) })} className="h-8 rounded border border-line bg-transparent px-2">
                  {[25, 50, 100].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Signature
                <textarea
                  value={settings.signature}
                  onChange={(e) => update({ signature: e.target.value })}
                  rows={3}
                  placeholder="No signature"
                  className="mt-1.5 block w-full resize-y rounded-md border border-line bg-transparent px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </label>
            </div>,
          )}
          {section(
            "Keyboard shortcuts",
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={settings.shortcuts} onChange={(e) => update({ shortcuts: e.target.checked })} className="h-4 w-4 accent-[var(--accent)]" />
                Enable keyboard shortcuts
              </label>
              <Button variant="text" className="h-8 px-3" onClick={() => (setOpen(false), openDialog({ type: "shortcuts" }))}>
                View all
              </Button>
            </div>,
          )}
        </div>
      </aside>
    </>,
    document.body,
  );
}

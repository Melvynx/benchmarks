import { useEffect, useRef, useState } from "react";
import { useMail, getMail } from "../lib/store";
import { useUI, ui } from "../lib/ui";
import { actions } from "../lib/actions";
import { useIsMobile } from "../hooks/useMedia";
import { SHORTCUT_GROUPS } from "../hooks/useShortcuts";
import { cn } from "../lib/utils";
import { Button, Dialog, Icon, Kbd } from "./ui";
import { LABEL_COLORS } from "./Sidebar";

export function Toaster() {
  const toast = useUI((s) => s.toast);
  const composers = useUI((s) => s.composers);
  const isMobile = useIsMobile();
  const [hover, setHover] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (!toast || hover) return;
    timer.current = window.setTimeout(() => ui().dismissToast(), toast.duration ?? 8000);
    return () => clearTimeout(timer.current);
  }, [toast, hover]);

  if (!toast) return null;
  const mobileComposer = isMobile && composers.length > 0;
  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      key={toast.id}
      className={cn(
        "no-print fixed z-[95] flex min-h-12 items-center gap-2 rounded bg-snackbar py-1.5 pl-4 pr-1.5 font-body text-sm text-on-snackbar shadow-e3 animate-rise",
        isMobile ? "inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+12px)]" : "bottom-6 left-6 max-w-[560px] min-w-[340px]",
        mobileComposer && "bottom-20",
      )}
    >
      <span className="flex-1 py-1.5">{toast.message}</span>
      {toast.actions?.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => {
            a.run();
            ui().dismissToast();
          }}
          className="h-9 shrink-0 rounded px-3 font-sans text-sm font-medium text-snackbar-action hover:bg-white/10"
        >
          {a.label}
        </button>
      ))}
      <button type="button" aria-label="Dismiss" onClick={() => ui().dismissToast()} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-on-snackbar/80 hover:bg-white/10">
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

function ConfirmDialog() {
  const c = useUI((s) => s.confirm);
  const close = () => ui().set({ confirm: null });
  return (
    <Dialog
      open={!!c}
      onOpenChange={(v) => !v && close()}
      title={c?.title ?? ""}
      description={c?.body}
      footer={
        <>
          <Button variant="text" onClick={close}>Cancel</Button>
          <Button
            variant={c?.danger ? "danger" : "filled"}
            autoFocus
            onClick={() => {
              const fn = c?.onConfirm;
              close();
              fn?.();
            }}
          >
            {c?.confirmLabel ?? "OK"}
          </Button>
        </>
      }
    />
  );
}

function AlertDialog() {
  const a = useUI((s) => s.alert);
  const close = () => ui().set({ alert: null });
  return (
    <Dialog open={!!a} onOpenChange={(v) => !v && close()} title={a?.title ?? ""} description={a?.body} footer={<Button autoFocus onClick={close}>OK</Button>} />
  );
}

function LinkWarning() {
  const url = useUI((s) => s.linkWarning);
  const close = () => ui().set({ linkWarning: null });
  let host = "";
  try {
    host = url ? new URL(url).host : "";
  } catch {
    host = url ?? "";
  }
  return (
    <Dialog
      open={!!url}
      onOpenChange={(v) => !v && close()}
      title="You're leaving your mailbox"
      footer={
        <>
          <Button
            variant="text"
            icon="content_copy"
            onClick={() => {
              if (url) navigator.clipboard?.writeText(url);
              close();
              ui().showToast({ message: "Link copied to clipboard." });
            }}
          >
            Copy link
          </Button>
          <Button variant="text" onClick={close}>Cancel</Button>
          <Button
            autoFocus
            onClick={() => {
              if (url) window.open(url, "_blank", "noopener,noreferrer");
              close();
            }}
          >
            Open link
          </Button>
        </>
      }
    >
      <p className="font-body text-sm text-fg-2">
        This link opens <span className="font-medium text-fg">{host}</span> in a new tab. Sender-supplied links in this demo mailbox point at fictional sites.
      </p>
      <p className="mt-3 break-all rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs text-fg-2">{url}</p>
    </Dialog>
  );
}

function LabelDialog() {
  const d = useUI((s) => s.labelDialog);
  const labels = useMail((s) => s.labels);
  const editing = d?.labelId ? labels.find((l) => l.id === d.labelId) : undefined;
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[5]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!d) return;
    setName(editing?.name ?? "");
    setColor(editing?.color ?? LABEL_COLORS[(labels.length * 5) % LABEL_COLORS.length]);
    setErr("");
  }, [d]);

  const close = () => ui().set({ labelDialog: null });
  const save = () => {
    const n = name.trim().replace(/\s+/g, " ");
    if (!n) return setErr("Please enter a label name.");
    if (labels.some((l) => l.name.toLowerCase() === n.toLowerCase() && l.id !== editing?.id)) return setErr(`The label name “${n}” already exists.`);
    if (["inbox", "starred", "sent", "drafts", "spam", "trash", "important", "snoozed", "scheduled"].includes(n.toLowerCase())) return setErr("That name is reserved.");
    if (editing) {
      getMail().updateLabel(editing.id, { name: n, color });
      ui().showToast({ message: `Label “${n}” updated.` });
    } else {
      const id = getMail().createLabel(n, color);
      if (d?.applyTo?.length) actions.labels(d.applyTo, [id], []);
      else ui().showToast({ message: `Label “${n}” created.` });
    }
    close();
  };

  return (
    <Dialog
      open={!!d}
      onOpenChange={(v) => !v && close()}
      title={editing ? "Edit label" : "New label"}
      footer={
        <>
          <Button variant="text" onClick={close}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>{editing ? "Save" : "Create"}</Button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), save())} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 font-body text-sm text-fg-2">
          {editing ? "Label name" : "Please enter a new label name:"}
          <input
            autoFocus
            value={name}
            maxLength={40}
            onChange={(e) => (setName(e.target.value), setErr(""))}
            className={cn("h-11 rounded-md border bg-transparent px-3 text-base text-fg outline-none focus:border-2", err ? "border-danger" : "border-outline focus:border-primary")}
          />
          {err && <span className="text-xs text-danger">{err}</span>}
        </label>
        <div>
          <div className="mb-2 font-body text-sm text-fg-2">Label color</div>
          <div className="grid grid-cols-8 gap-2">
            {LABEL_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                aria-pressed={c === color}
                onClick={() => setColor(c)}
                className={cn("flex size-8 items-center justify-center rounded-full", c === color && "ring-2 ring-fg ring-offset-2 ring-offset-surface")}
                style={{ background: c }}
              >
                {c === color && <Icon name="check" size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </div>
        {d?.applyTo?.length ? <p className="font-body text-xs text-fg-3">The new label will be applied to {d.applyTo.length === 1 ? "the selected conversation" : `${d.applyTo.length} selected conversations`}.</p> : null}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

function ShortcutsDialog() {
  const open = useUI((s) => s.shortcutsOpen);
  const enabled = useMail((s) => s.settings.keyboardShortcuts);
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => ui().set({ shortcutsOpen: v })}
      title="Keyboard shortcuts"
      className="w-[min(96vw,920px)]"
      footer={
        <div className="flex w-full items-center justify-between">
          <label className="flex items-center gap-2 font-body text-sm text-fg-2">
            <input type="checkbox" checked={enabled} onChange={(e) => getMail().updateSettings({ keyboardShortcuts: e.target.checked })} className="size-4 accent-[var(--primary)]" />
            Keyboard shortcuts on
          </label>
          <Button onClick={() => ui().set({ shortcutsOpen: false })}>Done</Button>
        </div>
      }
    >
      <div className="grid max-h-[60vh] gap-x-10 gap-y-6 overflow-y-auto pr-1 sm:grid-cols-2">
        {SHORTCUT_GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 font-sans text-sm font-medium text-primary">{g.title}</h3>
            <dl className="flex flex-col">
              {g.items.map(([k, label]) => (
                <div key={k + label} className="flex items-center justify-between gap-4 border-b border-line py-1.5 font-body text-sm">
                  <dt className="text-fg-2">{label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {k.split(" ").map((part, i) => (part === "then" || part === "/" ? <span key={i} className="text-xs text-fg-3">{part}</span> : <Kbd key={i}>{part}</Kbd>))}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

export function Overlays() {
  return (
    <>
      <ConfirmDialog />
      <AlertDialog />
      <LinkWarning />
      <LabelDialog />
      <ShortcutsDialog />
    </>
  );
}

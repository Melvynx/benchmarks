import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { closeCompose, discardCompose, persistCompose, sendCompose, signatureHtml } from "../lib/actions";
import { ME } from "../lib/contacts";
import { atHour, formatScheduleLabel, formatSize, nextWeekday, toLocalInputValue } from "../lib/format";
import { useIsMobile } from "../lib/hooks";
import { mimeFor } from "../lib/seed";
import { useMail } from "../lib/store";
import type { Attachment } from "../lib/types";
import { useUI, type ComposeState } from "../lib/ui";
import { attachmentKind, cn, KIND_META, uid } from "../lib/utils";
import { RecipientField } from "./RecipientField";
import { Avatar, Button, Icon, IconButton, MenuDivider, MenuHeader, MenuItem, Modal, Popover, useMenu } from "./ui";

const MAX_TOTAL = 25 * 1024 * 1024;
const MAX_INLINE_DATA = 1.5 * 1024 * 1024;

export function ComposeDock() {
  const composes = useUI((s) => s.composes);
  const isMobile = useIsMobile();
  const floating = composes.filter((c) => !c.inline || isMobile);

  if (isMobile) {
    const top = [...floating].reverse().find((c) => !c.minimized);
    const minimized = floating.filter((c) => c.minimized || c !== top);
    return (
      <>
        {minimized.length > 0 && !top && (
          <div className="fixed bottom-24 left-3 z-[590] flex flex-col gap-2">
            {minimized.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => useUI.getState().updateCompose(c.key, { minimized: false })}
                className="flex h-10 max-w-[70vw] items-center gap-2 rounded-full bg-raised px-4 text-sm shadow-pop"
              >
                <Icon name="edit_note" size={20} />
                <span className="truncate">{c.subject || "New Message"}</span>
              </button>
            ))}
          </div>
        )}
        {top && <MobileCompose key={top.key} compose={top} />}
      </>
    );
  }

  return (
    <div className="pointer-events-none fixed bottom-0 right-4 z-[600] flex flex-row-reverse items-end gap-4">
      {floating.map((c) => (
        <ComposeWindow key={c.key} compose={c} />
      ))}
    </div>
  );
}

function titleOf(c: ComposeState) {
  return c.subject.trim() || (c.mode === "new" ? "New Message" : c.mode === "forward" ? "Forward" : "Reply");
}

function ComposeWindow({ compose }: { compose: ComposeState }) {
  const update = (patch: Partial<ComposeState>) => useUI.getState().updateCompose(compose.key, patch);
  const header = (
    <div
      className={cn(
        "flex h-10 shrink-0 cursor-pointer select-none items-center gap-1 pl-4 pr-2",
        compose.maximized ? "bg-surface-2" : "rounded-t-xl bg-surface-3",
      )}
      onClick={() => !compose.maximized && update({ minimized: !compose.minimized })}
    >
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{titleOf(compose)}</span>
      <IconButton
        icon={compose.minimized ? "open_in_full" : "minimize"}
        label={compose.minimized ? "Restore" : "Minimize"}
        size="sm"
        iconSize={16}
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation();
          update({ minimized: !compose.minimized, maximized: false });
        }}
      />
      <IconButton
        icon={compose.maximized ? "close_fullscreen" : "open_in_full"}
        label={compose.maximized ? "Exit full screen" : "Full screen"}
        size="sm"
        iconSize={16}
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation();
          update({ maximized: !compose.maximized, minimized: false });
        }}
      />
      <IconButton
        icon="close"
        label="Save & close"
        size="sm"
        iconSize={18}
        className="h-7 w-7"
        onClick={(e) => {
          e.stopPropagation();
          closeCompose(compose.key);
        }}
      />
    </div>
  );

  if (compose.maximized) {
    return createPortal(
      <div className="animate-fade fixed inset-0 z-[650] flex items-center justify-center bg-black/40 p-6" onPointerDown={(e) => e.target === e.currentTarget && useUI.getState().updateCompose(compose.key, { maximized: false })}>
        <div className="animate-pop flex h-[min(88vh,900px)] w-[min(1100px,92vw)] flex-col overflow-hidden rounded-xl bg-raised shadow-compose">
          {header}
          <ComposeForm compose={compose} variant="window" />
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden rounded-t-xl bg-raised shadow-compose transition-[height] duration-150",
        compose.minimized ? "h-10 w-[280px]" : "h-[min(580px,calc(100dvh-80px))] w-[540px] max-w-[calc(100vw-32px)]",
      )}
      role="dialog"
      aria-label={titleOf(compose)}
    >
      {header}
      {!compose.minimized && <ComposeForm compose={compose} variant="window" />}
    </div>
  );
}

function MobileCompose({ compose }: { compose: ComposeState }) {
  return createPortal(
    <div className="animate-slide-up fixed inset-0 z-[750] flex flex-col bg-surface pb-[env(safe-area-inset-bottom)]" role="dialog" aria-label={titleOf(compose)}>
      <ComposeForm compose={compose} variant="mobile" />
    </div>,
    document.body,
  );
}

export function ComposeForm({ compose, variant }: { compose: ComposeState; variant: "window" | "inline" | "mobile" }) {
  const key = compose.key;
  const update = useCallback((patch: Partial<ComposeState>) => useUI.getState().updateCompose(key, patch), [key]);
  const showToast = useUI((s) => s.showToast);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [formatBar, setFormatBar] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    update({ saving: true });
    const t = window.setTimeout(() => persistCompose(key), 1000);
    return () => window.clearTimeout(t);
  }, [compose.to, compose.cc, compose.bcc, compose.subject, compose.html, compose.attachments, key, update]);

  useEffect(() => {
    if (compose.mode !== "new" || compose.to.length) {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      const r = document.createRange();
      r.setStart(el.firstElementChild ?? el, 0);
      r.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  }, [key]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    const total = compose.attachments.reduce((s, a) => s + a.size, 0) + list.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL) {
      showToast({ message: "Attachments can't exceed 25 MB in total." });
      return;
    }
    const atts: Attachment[] = await Promise.all(
      list.map(
        (f) =>
          new Promise<Attachment>((resolve) => {
            const base: Attachment = { id: uid("att"), name: f.name, size: f.size, mime: f.type || mimeFor(f.name) };
            if (f.size > MAX_INLINE_DATA) return resolve(base);
            const reader = new FileReader();
            reader.onload = () => resolve({ ...base, dataUrl: String(reader.result) });
            reader.onerror = () => resolve(base);
            reader.readAsDataURL(f);
          }),
      ),
    );
    const cur = useUI.getState().composes.find((c) => c.key === key);
    update({ attachments: [...(cur?.attachments ?? []), ...atts] });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendCompose(key);
    } else if (e.key === "Escape" && variant !== "inline") {
      e.stopPropagation();
      closeCompose(key);
    }
  };

  const recipients = (
    <>
      <RecipientField
        label="To"
        inputId={`${key}-to`}
        value={compose.to}
        onChange={(to) => update({ to })}
        autoFocus={compose.mode === "new" && !compose.to.length}
        trailing={
          <div className="flex shrink-0 gap-1 text-sm text-fg-3">
            {!compose.showCc && (
              <button type="button" className="rounded px-1 hover:text-fg hover:underline" onClick={() => update({ showCc: true })}>
                Cc
              </button>
            )}
            {!compose.showBcc && (
              <button type="button" className="rounded px-1 hover:text-fg hover:underline" onClick={() => update({ showBcc: true })}>
                Bcc
              </button>
            )}
          </div>
        }
      />
      {compose.showCc && <RecipientField label="Cc" inputId={`${key}-cc`} value={compose.cc} onChange={(cc) => update({ cc })} autoFocus={!compose.cc.length} />}
      {compose.showBcc && <RecipientField label="Bcc" inputId={`${key}-bcc`} value={compose.bcc} onChange={(bcc) => update({ bcc })} autoFocus={!compose.bcc.length} />}
    </>
  );

  const subjectField = (
    <div className="flex h-10 items-center border-b border-line-soft px-4">
      <input
        value={compose.subject}
        onChange={(e) => update({ subject: e.target.value })}
        placeholder="Subject"
        aria-label="Subject"
        className="h-full min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-fg-3 focus:outline-none"
      />
    </div>
  );

  const body = (
    <div
      className={cn("relative min-h-0 flex-1 overflow-y-auto px-4 py-3", variant === "inline" && "min-h-[160px]")}
      onClick={(e) => {
        if (e.target === e.currentTarget) editorRef.current?.focus();
      }}
    >
      <RichEditor
        editorRef={editorRef}
        html={compose.html}
        rev={compose.rev}
        onChange={(html) => update({ html })}
        placeholder={variant === "mobile" ? "Compose email" : ""}
      />
      {compose.quote && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowQuote((s) => !s)}
            aria-label={showQuote ? "Hide quoted text" : "Show quoted text"}
            data-tip={showQuote ? "Hide trimmed content" : "Show trimmed content"}
            className="inline-flex h-3.5 items-center rounded-sm bg-surface-3 px-1.5 text-fg-3 hover:bg-hover-strong"
          >
            <Icon name="more_horiz" size={18} />
          </button>
          {showQuote && <div className="mail-body mt-2 opacity-80" dangerouslySetInnerHTML={{ __html: compose.quote }} />}
        </div>
      )}
      {compose.attachments.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {compose.attachments.map((a) => {
            const meta = KIND_META[attachmentKind(a.name, a.mime)];
            return (
              <div key={a.id} className="flex h-9 max-w-[420px] items-center gap-2 rounded bg-surface-3 px-3 text-sm">
                <Icon name={meta.icon} size={18} fill style={{ color: meta.color }} />
                <span className="min-w-0 flex-1 truncate font-medium text-accent">{a.name}</span>
                <span className="text-xs text-fg-3">({formatSize(a.size)})</span>
                <IconButton
                  icon="close"
                  label={`Remove ${a.name}`}
                  size="sm"
                  className="-mr-2 h-7 w-7"
                  iconSize={16}
                  onClick={() => update({ attachments: compose.attachments.filter((x) => x.id !== a.id) })}
                />
              </div>
            );
          })}
        </div>
      )}
      {dragOver && (
        <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-lg border-2 border-dashed border-accent bg-accent-soft/80 text-sm font-medium text-on-accent-soft">
          <Icon name="upload_file" className="mr-2" /> Drop files here
        </div>
      )}
    </div>
  );

  const status = compose.saving ? "Saving…" : compose.savedAt ? "Draft saved" : "";

  const bottomBar = (
    <div className="shrink-0">
      {formatBar && <FormatToolbar editorRef={editorRef} onChange={() => update({ html: editorRef.current?.innerHTML ?? "" })} />}
      <div className="flex items-center gap-0.5 px-3 pb-3 pt-2">
        <SendButton compose={compose} />
        <div className="ml-2 flex min-w-0 items-center gap-0.5 overflow-x-auto">
          <IconButton icon="text_format" label="Formatting options" onClick={() => setFormatBar((f) => !f)} active={formatBar} />
          <IconButton icon="attach_file" label="Attach files" onClick={() => fileRef.current?.click()} />
          <LinkButton editorRef={editorRef} onChange={() => update({ html: editorRef.current?.innerHTML ?? "" })} />
          <EmojiButton editorRef={editorRef} onChange={() => update({ html: editorRef.current?.innerHTML ?? "" })} />
          <IconButton
            icon="signature"
            label="Insert signature"
            onClick={() => {
              const el = editorRef.current;
              if (!el) return;
              if (el.querySelector(".gmail-signature")) {
                showToast({ message: "Signature is already in this message.", duration: 2500 });
                return;
              }
              const sig = signatureHtml();
              if (!sig) {
                showToast({ message: "Add a signature in Settings first.", action: { label: "Settings", run: () => useUI.getState().setSettingsOpen(true) } });
                return;
              }
              el.insertAdjacentHTML("beforeend", `<div><br></div>${sig}`);
              update({ html: el.innerHTML });
            }}
          />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
          {variant !== "mobile" && <span className="hidden whitespace-nowrap text-xs text-fg-3 sm:inline">{status}</span>}
          <IconButton icon="delete" label="Discard draft" onClick={() => discardCompose(key)} />
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );

  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      if (Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        setDragOver(true);
      }
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!e.dataTransfer.files.length) return;
      e.preventDefault();
      setDragOver(false);
      addFiles(e.dataTransfer.files);
    },
  };

  if (variant === "mobile") {
    return (
      <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown} {...dropHandlers}>
        <div className="flex h-14 shrink-0 items-center gap-1 px-1">
          <IconButton icon="arrow_back" label="Save & close" onClick={() => closeCompose(key)} />
          <span className="min-w-0 flex-1 truncate pl-1 text-lg">{compose.mode === "new" ? "Compose" : titleOf(compose)}</span>
          <IconButton icon="attach_file" label="Attach files" onClick={() => fileRef.current?.click()} />
          <IconButton icon="send" label="Send" onClick={() => sendCompose(key)} className="text-accent" />
          <MobileComposeMenu compose={compose} />
        </div>
        <div className="flex h-11 items-center border-b border-line-soft px-4 text-sm">
          <span className="w-10 text-fg-3">From</span>
          <span className="truncate">{ME.email}</span>
        </div>
        {recipients}
        {subjectField}
        {body}
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="flex gap-3" onKeyDown={onKeyDown}>
        <Avatar name={ME.name} email={ME.email} size={40} className="-ml-[52px] mt-1 hidden sm:flex" />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-raised shadow-[0_1px_3px_rgba(0,0,0,.12)]" {...dropHandlers}>
          <div className="flex items-center gap-1 pl-2 pr-1 pt-1">
            <InlineModeMenu compose={compose} />
            <div className="min-w-0 flex-1 [&>div]:border-b-0 [&>div]:px-1">{recipients}</div>
            <IconButton
              icon="open_in_new"
              label="Pop out reply"
              size="sm"
              onClick={() => update({ inline: false, minimized: false })}
            />
          </div>
          {body}
          {bottomBar}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown} {...dropHandlers}>
      {recipients}
      {subjectField}
      {body}
      {bottomBar}
    </div>
  );
}

function InlineModeMenu({ compose }: { compose: ComposeState }) {
  const menu = useMenu();
  const icon = compose.mode === "replyAll" ? "reply_all" : compose.mode === "forward" ? "forward" : "reply";
  const switchTo = (mode: "reply" | "replyAll") => {
    menu.close();
    const t = compose.threadId ? useMail.getState().threads[compose.threadId] : undefined;
    if (!t) return;
    const ms = t.messageIds.map((id) => useMail.getState().messages[id]).filter((m) => m && m.status !== "draft");
    const target = ms[ms.length - 1];
    if (!target) return;
    const mine = target.from.email === ME.email;
    const to = mode === "reply" ? (mine ? target.to : [target.from]) : mine ? target.to : [target.from, ...target.to.filter((c) => c.email !== ME.email)];
    const cc = mode === "replyAll" ? target.cc.filter((c) => c.email !== ME.email) : [];
    useUI.getState().updateCompose(compose.key, { mode, to, cc, showCc: cc.length > 0 });
  };
  return (
    <>
      <button ref={menu.ref} type="button" onClick={menu.toggle} aria-label="Type of response" className="flex h-8 items-center rounded px-1 text-fg-2 hover:bg-hover">
        <Icon name={icon} size={20} />
        <Icon name="arrow_drop_down" size={18} />
      </button>
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} className="w-52">
        <MenuItem icon="reply" label="Reply" onClick={() => switchTo("reply")} />
        <MenuItem icon="reply_all" label="Reply all" onClick={() => switchTo("replyAll")} />
        <MenuDivider />
        <MenuItem
          icon="open_in_new"
          label="Pop out reply"
          onClick={() => {
            menu.close();
            useUI.getState().updateCompose(compose.key, { inline: false });
          }}
        />
      </Popover>
    </>
  );
}

function MobileComposeMenu({ compose }: { compose: ComposeState }) {
  const menu = useMenu();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  return (
    <>
      <IconButton ref={menu.ref} icon="more_vert" label="More options" onClick={menu.toggle} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} align="end" className="w-56">
        <MenuItem icon="schedule_send" label="Schedule send" onClick={() => (menu.close(), setScheduleOpen(true))} />
        <MenuItem icon="group_add" label="Add Cc/Bcc" onClick={() => (menu.close(), useUI.getState().updateCompose(compose.key, { showCc: true, showBcc: true }))} />
        <MenuItem icon="delete" label="Discard" onClick={() => (menu.close(), discardCompose(compose.key))} />
      </Popover>
      {scheduleOpen && <ScheduleDialog composeKey={compose.key} onClose={() => setScheduleOpen(false)} />}
    </>
  );
}

function SendButton({ compose }: { compose: ComposeState }) {
  const menu = useMenu();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  return (
    <div className="flex h-9 shrink-0 overflow-hidden rounded-full bg-primary text-on-primary shadow-sm">
      <button type="button" onClick={() => sendCompose(compose.key)} className="pl-5 pr-4 text-sm font-medium hover:bg-black/10 dark:hover:bg-white/15" data-tip="Send (⌘/Ctrl + Enter)">
        Send
      </button>
      <span className="my-2 w-px bg-on-primary/30" />
      <button ref={menu.ref} type="button" aria-label="More send options" data-tip="More send options" onClick={menu.toggle} className="flex w-8 items-center justify-center hover:bg-black/10 dark:hover:bg-white/15">
        <Icon name="arrow_drop_down" size={20} />
      </button>
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} placement="top" className="w-56">
        <MenuItem icon="schedule_send" label="Schedule send" onClick={() => (menu.close(), setScheduleOpen(true))} />
      </Popover>
      {scheduleOpen && <ScheduleDialog composeKey={compose.key} onClose={() => setScheduleOpen(false)} />}
    </div>
  );
}

function ScheduleDialog({ composeKey, onClose }: { composeKey: string; onClose: () => void }) {
  const now = Date.now();
  const [custom, setCustom] = useState(false);
  const [date, setDate] = useState(() => toLocalInputValue(atHour(now, 1, 8)).slice(0, 10));
  const [time, setTime] = useState("08:00");
  const opts = [
    { label: "Tomorrow morning", ts: atHour(now, 1, 8) },
    { label: "Tomorrow afternoon", ts: atHour(now, 1, 13) },
    { label: "Monday morning", ts: nextWeekday(now, 1, 8) },
  ];
  const pick = (ts: number) => {
    onClose();
    sendCompose(composeKey, ts);
  };
  const customTs = new Date(`${date}T${time}`).getTime();
  return (
    <Modal onClose={onClose} className="w-[380px] max-w-[calc(100vw-32px)] p-2" labelledBy="schedule-title">
      <div id="schedule-title" className="px-4 pb-2 pt-4 font-display text-xl">
        Schedule send
      </div>
      {!custom ? (
        <>
          {opts.map((o) => (
            <button key={o.label} type="button" onClick={() => pick(o.ts)} className="flex h-11 w-full items-center justify-between gap-4 rounded-lg px-4 text-left text-sm hover:bg-hover">
              <span>{o.label}</span>
              <span className="text-fg-3">{formatScheduleLabel(o.ts, now).replace(/^(Tomorrow), /, "")}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-line" />
          <button type="button" onClick={() => setCustom(true)} className="flex h-11 w-full items-center gap-3 rounded-lg px-4 text-left text-sm hover:bg-hover">
            <Icon name="calendar_month" className="text-fg-2" /> Pick date & time
          </button>
        </>
      ) : (
        <div className="space-y-4 px-4 pb-2 pt-2">
          <label className="block text-sm text-fg-2">
            Date
            <input type="date" value={date} min={toLocalInputValue(now).slice(0, 10)} onChange={(e) => setDate(e.target.value)} className="mt-1 block h-10 w-full rounded-md border border-line bg-transparent px-3 text-fg" />
          </label>
          <label className="block text-sm text-fg-2">
            Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 block h-10 w-full rounded-md border border-line bg-transparent px-3 text-fg" />
          </label>
          {customTs <= now && <div className="text-xs text-danger">Pick a time in the future.</div>}
          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setCustom(false)}>Back</Button>
            <Button variant="filled" disabled={!(customTs > now)} onClick={() => pick(customTs)}>
              Schedule send
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function RichEditor({
  editorRef,
  html,
  rev,
  onChange,
  placeholder,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  html: string;
  rev: number;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const htmlRef = useRef(html);
  htmlRef.current = html;
  useLayoutEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = htmlRef.current;
  }, [rev, editorRef]);
  return (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-multiline
      aria-label="Message Body"
      data-placeholder={placeholder}
      spellCheck
      className="editor text-fg"
      onMouseDown={(e) => {
        const el = e.currentTarget;
        if (e.target !== el) return;
        const sig = el.querySelector(".gmail-signature");
        const first = el.firstElementChild;
        if (!sig || !first || first === sig) return;
        let text = "";
        for (let n = el.firstChild; n && n !== sig; n = n.nextSibling) text += n.textContent ?? "";
        if (text.trim()) return;
        e.preventDefault();
        el.focus();
        const r = document.createRange();
        r.setStart(first, 0);
        r.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }}
      onInput={(e) => onChange((e.currentTarget as HTMLDivElement).innerHTML)}
      onPaste={(e) => {
        const text = e.clipboardData.getData("text/plain");
        const htmlData = e.clipboardData.getData("text/html");
        if (htmlData) {
          e.preventDefault();
          const clean = htmlData
            .replace(/<(script|style|meta|link)[\s\S]*?(<\/\1>|>)/gi, "")
            .replace(/\son\w+="[^"]*"/gi, "")
            .replace(/\sstyle="[^"]*"/gi, "")
            .replace(/\sclass="[^"]*"/gi, "");
          document.execCommand("insertHTML", false, clean);
        } else if (text) {
          e.preventDefault();
          document.execCommand("insertText", false, text);
        }
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
          e.preventDefault();
          window.dispatchEvent(new Event("compose-link"));
        }
      }}
    />
  );
}

function useSavedSelection(editorRef: React.RefObject<HTMLDivElement | null>) {
  const range = useRef<Range | null>(null);
  const save = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) range.current = sel.getRangeAt(0).cloneRange();
    else range.current = null;
  };
  const restore = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    if (range.current) sel?.addRange(range.current);
    else {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel?.addRange(r);
    }
  };
  return { range, save, restore };
}

function FormatToolbar({ editorRef, onChange }: { editorRef: React.RefObject<HTMLDivElement | null>; onChange: () => void }) {
  const [state, setState] = useState<Record<string, boolean>>({});
  const colorMenu = useMenu();
  const sizeMenu = useMenu();
  const fontMenu = useMenu();
  const alignMenu = useMenu();
  const moreMenu = useMenu();
  const sel = useSavedSelection(editorRef);

  useEffect(() => {
    const update = () => {
      if (!editorRef.current?.contains(document.getSelection()?.anchorNode ?? null)) return;
      const s: Record<string, boolean> = {};
      for (const c of ["bold", "italic", "underline", "strikeThrough", "insertOrderedList", "insertUnorderedList"]) {
        try {
          s[c] = document.queryCommandState(c);
        } catch {
          s[c] = false;
        }
      }
      setState(s);
    };
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, [editorRef]);

  const exec = (cmd: string, value?: string) => {
    sel.restore();
    document.execCommand(cmd, false, value);
    onChange();
    sel.save();
  };
  const keep = { onMouseDown: (e: React.MouseEvent) => (e.preventDefault(), sel.save()) };
  const b = (icon: string, label: string, cmd: string, value?: string) => (
    <IconButton key={cmd + (value ?? "")} icon={icon} label={label} size="sm" active={state[cmd]} onClick={() => exec(cmd, value)} {...keep} />
  );
  const COLORS = ["#202124", "#5f6368", "#d93025", "#e37400", "#f9ab00", "#188038", "#1a73e8", "#9334e6", "#e52592", "#ffffff"];

  return (
    <div className="mx-3 mb-1 flex flex-wrap items-center rounded-lg px-1 py-0.5 shadow-[0_1px_3px_rgba(0,0,0,.2)] [&>button]:h-7 [&>button]:min-w-7 [&>button:not([data-tip=Font])]:w-7">
      {b("undo", "Undo", "undo")}
      {b("redo", "Redo", "redo")}
      <span className="mx-1 h-5 w-px bg-line" />
      <button ref={fontMenu.ref} type="button" {...keep} onClick={fontMenu.toggle} className="flex h-8 items-center gap-0.5 rounded pl-2 pr-0.5 text-sm text-fg-2 hover:bg-hover" data-tip="Font">
        Sans Serif <Icon name="arrow_drop_down" size={18} />
      </button>
      <Popover anchor={fontMenu.ref.current} open={fontMenu.open} onClose={fontMenu.close} placement="top" className="w-44">
        {[
          ["Sans Serif", "Roboto, Arial, sans-serif"],
          ["Serif", "Georgia, 'Times New Roman', serif"],
          ["Fixed width", "ui-monospace, Menlo, monospace"],
          ["Wide", "'Arial Black', sans-serif"],
          ["Narrow", "'Arial Narrow', sans-serif"],
        ].map(([label, font]) => (
          <MenuItem key={label} label={<span style={{ fontFamily: font }}>{label}</span>} onClick={() => (fontMenu.close(), exec("fontName", font))} />
        ))}
      </Popover>
      <IconButton ref={sizeMenu.ref} icon="format_size" label="Size" size="sm" {...keep} onClick={sizeMenu.toggle} />
      <Popover anchor={sizeMenu.ref.current} open={sizeMenu.open} onClose={sizeMenu.close} placement="top" className="w-36">
        {[
          ["Small", "2", 12],
          ["Normal", "3", 14],
          ["Large", "5", 18],
          ["Huge", "6", 24],
        ].map(([label, v, px]) => (
          <MenuItem key={label} label={<span style={{ fontSize: px as number }}>{label}</span>} onClick={() => (sizeMenu.close(), exec("fontSize", v as string))} />
        ))}
      </Popover>
      <span className="mx-1 h-5 w-px bg-line" />
      {b("format_bold", "Bold (⌘B)", "bold")}
      {b("format_italic", "Italic (⌘I)", "italic")}
      {b("format_underlined", "Underline (⌘U)", "underline")}
      <IconButton ref={colorMenu.ref} icon="format_color_text" label="Text color" size="sm" {...keep} onClick={colorMenu.toggle} />
      <Popover anchor={colorMenu.ref.current} open={colorMenu.open} onClose={colorMenu.close} placement="top" className="w-60 p-3">
        <MenuHeader>Text color</MenuHeader>
        <div className="grid grid-cols-5 gap-2 px-4 pb-2">
          {COLORS.map((c) => (
            <button key={c} type="button" aria-label={`Text color ${c}`} onClick={() => (colorMenu.close(), exec("foreColor", c))} className="h-7 w-7 rounded-full border border-line hover:scale-110" style={{ background: c }} />
          ))}
        </div>
        <MenuHeader>Highlight</MenuHeader>
        <div className="grid grid-cols-5 gap-2 px-4">
          {["#fef7e0", "#fde293", "#ceead6", "#d2e3fc", "#fad2cf"].map((c) => (
            <button key={c} type="button" aria-label={`Highlight ${c}`} onClick={() => (colorMenu.close(), exec("hiliteColor", c))} className="h-7 w-7 rounded-full border border-line hover:scale-110" style={{ background: c }} />
          ))}
        </div>
      </Popover>
      <span className="mx-1 h-5 w-px bg-line" />
      <IconButton ref={alignMenu.ref} icon="format_align_left" label="Align" size="sm" {...keep} onClick={alignMenu.toggle} />
      <Popover anchor={alignMenu.ref.current} open={alignMenu.open} onClose={alignMenu.close} placement="top" className="w-auto">
        <div className="flex px-2">
          {[
            ["format_align_left", "Left", "justifyLeft"],
            ["format_align_center", "Center", "justifyCenter"],
            ["format_align_right", "Right", "justifyRight"],
          ].map(([icon, label, cmd]) => (
            <IconButton key={cmd} icon={icon} label={label} size="sm" {...keep} onClick={() => (alignMenu.close(), exec(cmd))} />
          ))}
        </div>
      </Popover>
      {b("format_list_numbered", "Numbered list", "insertOrderedList")}
      {b("format_list_bulleted", "Bulleted list", "insertUnorderedList")}
      <span className="mx-1 h-5 w-px bg-line" />
      <IconButton ref={moreMenu.ref} icon="arrow_drop_down" label="More formatting options" size="sm" {...keep} onClick={moreMenu.toggle} active={moreMenu.open} />
      <Popover anchor={moreMenu.ref.current} open={moreMenu.open} onClose={moreMenu.close} placement="top" align="end" className="w-auto">
        <div className="flex px-2 [&_button]:h-7 [&_button]:w-7">
          {b("format_indent_decrease", "Indent less", "outdent")}
          {b("format_indent_increase", "Indent more", "indent")}
          {b("format_quote", "Quote", "formatBlock", "blockquote")}
          {b("strikethrough_s", "Strikethrough", "strikeThrough")}
          {b("format_clear", "Remove formatting", "removeFormat")}
        </div>
      </Popover>
    </div>
  );
}

function LinkButton({ editorRef, onChange }: { editorRef: React.RefObject<HTMLDivElement | null>; onChange: () => void }) {
  const menu = useMenu();
  const sel = useSavedSelection(editorRef);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const openMenu = useCallback(() => {
    sel.save();
    setText(sel.range.current?.toString() ?? "");
    setUrl("");
    menu.setOpen(true);
  }, [menu, sel]);
  useEffect(() => {
    const h = () => {
      if (editorRef.current?.contains(document.activeElement)) openMenu();
    };
    window.addEventListener("compose-link", h);
    return () => window.removeEventListener("compose-link", h);
  }, [openMenu, editorRef]);
  const apply = () => {
    if (!url.trim()) return;
    const href = /^(https?:|mailto:)/i.test(url) ? url.trim() : `https://${url.trim()}`;
    menu.close();
    sel.restore();
    const label = text.trim() || href;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
    document.execCommand("insertHTML", false, `<a href="${esc(href)}">${esc(label)}</a>&nbsp;`);
    onChange();
  };
  return (
    <>
      <IconButton ref={menu.ref} icon="link" label="Insert link (⌘K)" onMouseDown={(e) => e.preventDefault()} onClick={() => (menu.open ? menu.close() : openMenu())} active={menu.open} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} placement="top" className="w-80 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
          className="space-y-3"
        >
          <label className="block text-xs text-fg-3">
            Text to display
            <input value={text} onChange={(e) => setText(e.target.value)} className="mt-1 block h-9 w-full rounded border border-line bg-transparent px-2 text-sm text-fg focus:border-accent focus:outline-none" />
          </label>
          <label className="block text-xs text-fg-3">
            Web address or email
            <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" className="mt-1 block h-9 w-full rounded border border-line bg-transparent px-2 text-sm text-fg focus:border-accent focus:outline-none" />
          </label>
          <div className="flex justify-end gap-2">
            <Button onClick={menu.close}>Cancel</Button>
            <Button variant="filled" type="submit" disabled={!url.trim()}>
              OK
            </Button>
          </div>
        </form>
      </Popover>
    </>
  );
}

const EMOJI = "😀 😂 🥲 😊 😍 🤔 😎 🙃 😅 😴 🥳 🤯 👍 👎 👏 🙌 🙏 💪 👋 🤝 ❤️ 💜 🔥 ✨ 🎉 🎂 ☕ 🍕 🥟 🌮 🚀 ✅ ❌ ⚠️ 📎 📅 📌 💡 📈 🧗 🐕 🌊 ✈️ 🏖️ 🎧 📚".split(" ");

function EmojiButton({ editorRef, onChange }: { editorRef: React.RefObject<HTMLDivElement | null>; onChange: () => void }) {
  const menu = useMenu();
  const sel = useSavedSelection(editorRef);
  return (
    <>
      <IconButton ref={menu.ref} icon="mood" label="Insert emoji" onMouseDown={(e) => (e.preventDefault(), sel.save())} onClick={menu.toggle} active={menu.open} />
      <Popover anchor={menu.ref.current} open={menu.open} onClose={menu.close} placement="top" className="w-[296px] p-2">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onMouseDown={(ev) => ev.preventDefault()}
              onClick={() => {
                sel.restore();
                document.execCommand("insertText", false, e);
                sel.save();
                onChange();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-hover"
            >
              {e}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

export function ComposeFab({ extended }: { extended: boolean }) {
  const composes = useUI((s) => s.composes);
  if (composes.some((c) => !c.minimized)) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-compose"))}
      aria-label="Compose"
      className={cn(
        "fixed bottom-5 right-4 z-[500] flex h-14 items-center gap-3 rounded-2xl bg-compose pl-4 text-on-compose shadow-[0_1px_3px_rgba(0,0,0,.3),0_4px_8px_3px_rgba(0,0,0,.15)] transition-[width,padding] duration-200",
        extended ? "pr-5" : "w-14 pr-4",
      )}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <Icon name="edit" size={24} />
      {extended && <span className="text-sm font-medium">Compose</span>}
    </button>
  );
}

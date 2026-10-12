import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  X, Minus, Maximize2, Minimize2, Trash2, Paperclip, ChevronDown, Bold, Italic, Underline, List, ListOrdered, Quote,
  Link2, RemoveFormatting, Type, Smile, MoreHorizontal, Send, ArrowLeft, Reply, ReplyAll, Forward, ExternalLink,
  Strikethrough, CalendarClock, MoreVertical, PenLine,
} from "lucide-react";
import { useMail, newAttachment } from "../lib/store";
import type { Contact, Draft } from "../lib/types";
import { EMAIL_RE, displayName, escapeHtml, fileSize, parseAddress } from "../lib/format";
import { Avatar, IconButton, MenuDivider, MenuItem, Popover, useAnchor, useIsMobile } from "./ui";
import { useContacts } from "./TopBar";
import { AttachmentIcon } from "./MailList";
import { DateTimePicker, schedulePresets } from "./menus";

/* ---------------- Recipient input ---------------- */

function RecipientInput({
  label, value, onChange, autoFocus, trailing, compact,
}: {
  label: string;
  value: Contact[];
  onChange: (v: Contact[]) => void;
  autoFocus?: boolean;
  trailing?: React.ReactNode;
  compact?: boolean;
}) {
  const contacts = useContacts();
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const sugg = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return contacts
      .filter((c) => !value.some((v) => v.email === c.email))
      .filter((c) => c.name.toLowerCase().split(/\s+/).some((p) => p.startsWith(q)) || c.name.toLowerCase().startsWith(q) || c.email.startsWith(q) || (q.length > 2 && c.email.includes(q)))
      .slice(0, 6);
  }, [text, contacts, value]);

  const commit = (raw: string) => {
    const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    const add: Contact[] = [];
    for (const p of parts) {
      const c = parseAddress(p);
      if (!c) continue;
      const known = contacts.find((k) => k.email === c.email);
      if (!value.some((v) => v.email === c.email) && !add.some((v) => v.email === c.email)) add.push(known ? { name: known.name, email: known.email } : c);
    }
    if (add.length) onChange([...value, ...add]);
    setText("");
    setActive(0);
  };

  const pick = (c: Contact) => {
    onChange([...value, { name: c.name, email: c.email }]);
    setText("");
    setActive(0);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={wrapRef}
      className={clsx("relative flex min-h-10 items-start border-b border-divider", compact ? "px-0" : "px-3")}
      onClick={() => inputRef.current?.focus()}
    >
      <span className="w-9 shrink-0 pt-2.5 text-sm text-ink-3">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 py-1.5">
        {value.map((c, i) => {
          const valid = EMAIL_RE.test(c.email);
          return (
            <span
              key={c.email + i}
              data-tip={c.name ? c.email : undefined}
              onDoubleClick={() => {
                onChange(value.filter((_, j) => j !== i));
                setText(c.name ? `${c.name} <${c.email}>` : c.email);
                inputRef.current?.focus();
              }}
              className={clsx(
                "flex h-7 max-w-full items-center gap-1.5 rounded-full border pl-0.5 pr-1 text-sm",
                valid ? "border-line bg-surface" : "border-danger bg-danger/10 text-danger",
              )}
            >
              <Avatar contact={c} size={22} />
              <span className="truncate">{displayName(c)}</span>
              <button
                aria-label={`Remove ${displayName(c)}`}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-hover"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((_, j) => j !== i));
                }}
              >
                <X size={13} />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          autoFocus={autoFocus}
          value={text}
          aria-label={label === "To" ? "To recipients" : `${label} recipients`}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]$/.test(v)) commit(v);
            else {
              setText(v);
              setActive(0);
            }
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text");
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              commit(text + t);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setTimeout(() => setFocused(false), 150);
            if (text.trim()) commit(text);
          }}
          onKeyDown={(e) => {
            if (sugg.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setActive((a) => (e.key === "ArrowDown" ? (a + 1) % sugg.length : (a - 1 + sugg.length) % sugg.length));
            } else if ((e.key === "Enter" || e.key === "Tab") && text.trim()) {
              if (sugg[active]) {
                e.preventDefault();
                pick(sugg[active]);
              } else if (e.key === "Enter") {
                e.preventDefault();
                commit(text);
              }
            } else if (e.key === "Backspace" && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
          className="h-7 min-w-[80px] flex-1 bg-transparent text-sm text-ink outline-none"
        />
      </div>
      {trailing}
      {focused && sugg.length > 0 && (
        <div
          className="anim-pop absolute left-8 top-full z-30 w-[min(360px,90%)] rounded-lg bg-menu py-2 shadow-float"
          onMouseDown={(e) => e.preventDefault()}
        >
          {sugg.map((c, i) => (
            <button
              key={c.email}
              className={clsx("flex w-full items-center gap-3 px-3 py-1.5 text-left", i === active && "bg-hover")}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => {
                e.stopPropagation();
                pick(c);
              }}
            >
              <Avatar contact={c} size={32} />
              <span className="min-w-0">
                <span className="block truncate text-sm">{c.name || c.email}</span>
                <span className="block truncate text-xs text-ink-3">{c.email}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Rich text editor ---------------- */

const EMOJIS = ["😀", "😂", "🥲", "😊", "😍", "🤔", "😅", "😎", "🙌", "👏", "👍", "👎", "🙏", "💪", "🎉", "🔥", "✨", "❤️", "💯", "✅", "❌", "⚡", "📌", "📎", "📅", "☕", "🍕", "🚀", "🌟", "👀", "💡", "🤝"];

function saveSelection(root: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const r = sel.getRangeAt(0);
  return root.contains(r.commonAncestorContainer) ? r.cloneRange() : null;
}
function restoreSelection(root: HTMLElement, r: Range | null) {
  root.focus();
  if (!r) return;
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

function FormatBar({ editor, onChange }: { editor: React.RefObject<HTMLDivElement | null>; onChange: () => void }) {
  const [state, setState] = useState<Record<string, boolean>>({});
  const link = useAnchor();
  const [range, setRange] = useState<Range | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    const upd = () => {
      if (!editor.current || !editor.current.contains(document.getSelection()?.anchorNode ?? null)) return;
      setState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    };
    document.addEventListener("selectionchange", upd);
    return () => document.removeEventListener("selectionchange", upd);
  }, [editor]);
  const exec = (cmd: string, val?: string) => {
    editor.current?.focus();
    document.execCommand(cmd, false, val);
    onChange();
  };
  const B = ({ cmd, tip, icon, val }: { cmd: string; tip: string; icon: React.ReactNode; val?: string }) => (
    <IconButton size="sm" tip={tip} active={state[cmd]} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(cmd, val)}>
      {icon}
    </IconButton>
  );
  return (
    <div className="no-scrollbar mx-2 mb-1 flex items-center gap-0.5 overflow-x-auto rounded-lg bg-compose-head px-1 py-0.5">
      <B cmd="bold" tip="Bold (⌘B)" icon={<Bold size={16} />} />
      <B cmd="italic" tip="Italic (⌘I)" icon={<Italic size={16} />} />
      <B cmd="underline" tip="Underline (⌘U)" icon={<Underline size={16} />} />
      <B cmd="strikeThrough" tip="Strikethrough" icon={<Strikethrough size={16} />} />
      <div className="mx-1 h-5 w-px bg-divider" />
      <B cmd="insertUnorderedList" tip="Bulleted list" icon={<List size={16} />} />
      <B cmd="insertOrderedList" tip="Numbered list" icon={<ListOrdered size={16} />} />
      <B cmd="formatBlock" val="blockquote" tip="Quote" icon={<Quote size={16} />} />
      <IconButton
        size="sm"
        tip="Insert link (⌘K)"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          if (editor.current) setRange(saveSelection(editor.current));
          setUrl("https://");
          link.open(e);
        }}
      >
        <Link2 size={16} />
      </IconButton>
      <div className="mx-1 h-5 w-px bg-divider" />
      <B cmd="removeFormat" tip="Remove formatting" icon={<RemoveFormatting size={16} />} />
      <Popover anchor={link.anchor} onClose={link.close}>
        <form
          className="flex w-72 flex-col gap-3 px-4 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            link.close();
            if (!editor.current || !url.trim()) return;
            restoreSelection(editor.current, range);
            const href = /^https?:\/\//.test(url) ? url : `https://${url}`;
            if (range && !range.collapsed) document.execCommand("createLink", false, href);
            else document.execCommand("insertHTML", false, `<a href="${escapeHtml(href)}">${escapeHtml(href)}</a>&nbsp;`);
            onChange();
          }}
        >
          <label className="text-xs text-ink-3">Link to web address</label>
          <input data-autofocus value={url} onChange={(e) => setUrl(e.target.value)} className="rounded border border-line bg-transparent px-2 py-1.5 text-sm outline-none focus:border-primary" />
          <div className="flex justify-end">
            <button className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-on-primary">Insert</button>
          </div>
        </form>
      </Popover>
    </div>
  );
}

/* ---------------- Composer body ---------------- */

type Variant = "window" | "inline" | "mobile";

export function Composer({
  draftId, variant, onClose, autoFocusBody,
}: { draftId: string; variant: Variant; onClose: () => void; autoFocusBody?: boolean }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const a = useMail.getState;
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const [showCc, setShowCc] = useState(() => (draft?.cc.length ?? 0) > 0);
  const [showBcc, setShowBcc] = useState(() => (draft?.bcc.length ?? 0) > 0);
  const [showFormat, setShowFormat] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const schedule = useAnchor();
  const [customSchedule, setCustomSchedule] = useState(false);
  const emoji = useAnchor();
  const more = useAnchor();

  useEffect(() => {
    if (editorRef.current && draft) editorRef.current.innerHTML = draft.html;
    if (autoFocusBody && editorRef.current) {
      editorRef.current.focus();
      const r = document.createRange();
      r.setStart(editorRef.current, 0);
      r.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    // Only on mount — the editor is uncontrolled after that
  }, []);

  const flush = useCallback(() => {
    clearTimeout(saveTimer.current);
    if (editorRef.current && a().drafts[draftId]) a().updateDraft(draftId, { html: editorRef.current.innerHTML });
  }, [draftId, a]);

  useEffect(() => {
    window.addEventListener("mail:flush-drafts", flush);
    return () => {
      window.removeEventListener("mail:flush-drafts", flush);
      flush();
    };
  }, [flush]);

  const onBodyChange = () => {
    setSaved("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      flush();
      setSaved("saved");
    }, 500);
  };

  const patch = (p: Partial<Draft>) => {
    a().updateDraft(draftId, p);
    setSaved("saved");
  };

  if (!draft) return null;

  const validate = () => {
    const all = [...draft.to, ...draft.cc, ...draft.bcc];
    if (!all.length) {
      setError("Please specify at least one recipient.");
      return false;
    }
    const bad = all.find((c) => !EMAIL_RE.test(c.email));
    if (bad) {
      setError(`The address "${bad.email}" was not recognized. Please make sure that all addresses are properly formed.`);
      return false;
    }
    const text = (editorRef.current?.innerText ?? "").replace(/--\s[\s\S]*$/, "").trim();
    if (!draft.subject.trim() && !text && !draft.attachments.length && draft.mode === "new")
      if (!confirm("Send this message without a subject or text in the body?")) return false;
    setError(null);
    return true;
  };

  const send = () => {
    flush();
    if (!validate()) return;
    a().sendDraft(draftId);
    onClose();
  };

  const doSchedule = (ts: number) => {
    flush();
    schedule.close();
    setCustomSchedule(false);
    if (!validate()) return;
    a().scheduleDraft(draftId, ts);
    onClose();
  };

  const discard = () => {
    const snapshot = a().drafts[draftId];
    clearTimeout(saveTimer.current);
    a().discardDraft(draftId);
    onClose();
    a().toast({
      text: "Draft discarded.",
      action: {
        label: "Undo",
        run: () => {
          useMail.setState((s) => ({ drafts: { ...s.drafts, [draftId]: snapshot } }));
          if (!snapshot.threadId) a().openCompose(draftId);
        },
      },
    });
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const f of list) {
      if (f.size > 25 * 1024 * 1024) {
        a().toast({ text: `"${f.name}" is larger than 25 MB.` });
        continue;
      }
      const push = (dataUrl?: string) => {
        const cur = a().drafts[draftId];
        if (cur) a().updateDraft(draftId, { attachments: [...cur.attachments, newAttachment(f, dataUrl)] });
      };
      if (f.size < 400 * 1024) {
        const r = new FileReader();
        r.onload = () => push(r.result as string);
        r.onerror = () => push();
        r.readAsDataURL(f);
      } else push();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      send();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && document.activeElement === editorRef.current) {
      e.preventDefault();
      setShowFormat(true);
    } else if (e.key === "Escape" && variant !== "inline") {
      e.stopPropagation();
      flush();
      onClose();
    }
  };

  const isInline = variant === "inline";
  const isMobile = variant === "mobile";
  const ccToggles = (
    <div className="flex shrink-0 items-center gap-2 pt-2.5 text-sm text-ink-2">
      {!showCc && (
        <button className="hover:underline" onClick={(e) => { e.stopPropagation(); setShowCc(true); }}>Cc</button>
      )}
      {!showBcc && (
        <button className="hover:underline" onClick={(e) => { e.stopPropagation(); setShowBcc(true); }}>Bcc</button>
      )}
    </div>
  );

  const sendButton = (
    <div className="flex shrink-0 overflow-hidden rounded-full bg-primary text-on-primary">
      <button onClick={send} className="h-9 pl-6 pr-4 text-sm font-medium hover:bg-primary-hover" data-tip="Send (⌘Enter)">
        Send
      </button>
      <button
        onClick={(e) => { setCustomSchedule(false); schedule.open(e); }}
        aria-label="More send options"
        data-tip="More send options"
        className="flex h-9 w-8 items-center justify-center border-l border-white/30 hover:bg-primary-hover"
      >
        <ChevronDown size={16} />
      </button>
    </div>
  );

  return (
    <div
      className={clsx("relative flex min-h-0 flex-1 flex-col", dragOver && "ring-2 ring-inset ring-primary")}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDragOver(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <div className={clsx(isInline && "px-1")}>
        <RecipientInput
          label="To"
          value={draft.to}
          onChange={(to) => { patch({ to }); setError(null); }}
          autoFocus={!autoFocusBody && variant !== "inline" && draft.to.length === 0}
          trailing={ccToggles}
          compact={isInline}
        />
        {showCc && <RecipientInput label="Cc" value={draft.cc} onChange={(cc) => patch({ cc })} autoFocus={draft.cc.length === 0} compact={isInline} />}
        {showBcc && <RecipientInput label="Bcc" value={draft.bcc} onChange={(bcc) => patch({ bcc })} autoFocus={draft.bcc.length === 0} compact={isInline} />}
        {(!isInline || draft.mode === "forward") && (
          <input
            value={draft.subject}
            onChange={(e) => patch({ subject: e.target.value })}
            placeholder="Subject"
            aria-label="Subject"
            className={clsx("h-10 w-full border-b border-divider bg-transparent text-sm text-ink outline-none placeholder:text-ink-3", isInline ? "" : "px-3")}
          />
        )}
      </div>

      {error && (
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      <div className={clsx("scroll-thin min-h-0 flex-1 overflow-y-auto", isInline ? "px-1 pt-3" : "px-3 pt-3")}>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline
          aria-label="Message Body"
          data-placeholder=""
          onInput={onBodyChange}
          onFocus={() =>
            requestAnimationFrame(() => {
              // Keep the caret out of the signature block while the body is still empty
              const sel = window.getSelection();
              const node = sel?.anchorNode;
              const el = node instanceof Element ? node : node?.parentElement;
              const body = editorRef.current;
              if (!body || !sel || !el?.closest("[data-signature]")) return;
              if ((body.innerText.split(/\n?--\s?\n/)[0] ?? "").trim()) return;
              const r = document.createRange();
              r.setStart(body.firstChild ?? body, 0);
              r.collapse(true);
              sel.removeAllRanges();
              sel.addRange(r);
            })
          }
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              addFiles(files);
            }
          }}
          className={clsx("mail-body min-h-[120px] pb-3 outline-none", isMobile && "min-h-[40vh]")}
        />
        {draft.quoteHtml && (
          <>
            <button
              data-tip={showQuote ? "Hide trimmed content" : "Show trimmed content"}
              onClick={() => setShowQuote(!showQuote)}
              className="mb-2 flex h-4 items-center rounded bg-chip px-1.5 text-ink-2 hover:bg-hover-strong"
            >
              <MoreHorizontal size={16} />
            </button>
            {showQuote && <div className="mail-body pb-3" dangerouslySetInnerHTML={{ __html: draft.quoteHtml }} />}
          </>
        )}
        {draft.attachments.length > 0 && (
          <div className="flex flex-col gap-1.5 pb-3">
            {draft.attachments.map((att) => (
              <div key={att.id} className="flex max-w-md items-center gap-2 rounded-md bg-compose-head px-3 py-1.5 text-sm">
                <AttachmentIcon a={att} />
                <span className="truncate font-medium text-primary">{att.name}</span>
                <span className="shrink-0 text-ink-3">({fileSize(att.size)})</span>
                <button
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-full hover:bg-hover"
                  aria-label={`Remove ${att.name}`}
                  onClick={() => patch({ attachments: draft.attachments.filter((x) => x.id !== att.id) })}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showFormat && <FormatBar editor={editorRef} onChange={onBodyChange} />}

      <div className={clsx("flex shrink-0 items-center gap-1 pb-3 pt-1", isInline ? "px-1" : "px-3", isMobile && "hidden")}>
        {sendButton}
        <IconButton size="sm" tip="Formatting options" active={showFormat} className="ml-2" onClick={() => setShowFormat(!showFormat)}>
          <Type size={18} />
        </IconButton>
        <IconButton size="sm" tip="Attach files" onClick={() => fileRef.current?.click()}>
          <Paperclip size={18} />
        </IconButton>
        <IconButton size="sm" tip="Insert emoji" onClick={emoji.open} onMouseDown={(e) => e.preventDefault()}>
          <Smile size={18} />
        </IconButton>
        <IconButton
          size="sm"
          tip="Insert signature"
          onClick={() => {
            const sig = a().settings.signature;
            if (!sig.trim() || !editorRef.current) return;
            editorRef.current.focus();
            document.execCommand("insertHTML", false, `<br>-- <br>${escapeHtml(sig).replace(/\n/g, "<br>")}`);
            onBodyChange();
          }}
        >
          <PenLine size={18} />
        </IconButton>
        <span className="ml-2 hidden truncate text-xs text-ink-3 sm:inline">
          {saved === "saving" ? "Saving…" : saved === "saved" ? "Draft saved" : ""}
        </span>
        <IconButton size="sm" tip="Discard draft" className="ml-auto" onClick={discard}>
          <Trash2 size={18} />
        </IconButton>
      </div>

      {isMobile && (
        <MobileComposeActions
          onAttach={() => fileRef.current?.click()}
          onSend={send}
          onSchedule={(el) => { setCustomSchedule(false); schedule.setAnchor(el); }}
          onDiscard={discard}
          onFormat={() => setShowFormat(!showFormat)}
          more={more}
        />
      )}

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

      <Popover anchor={schedule.anchor} onClose={schedule.close} align="start">
        {customSchedule ? (
          <DateTimePicker title="Pick date & time" cta="Schedule send" onCancel={() => setCustomSchedule(false)} onPick={doSchedule} />
        ) : (
          <div className="w-72">
            <div className="px-4 pb-1 text-sm font-medium">Schedule send</div>
            {schedulePresets().map((p, i) => (
              <MenuItem
                key={p.label}
                autoFocus={i === 0}
                label={p.label}
                hint={new Date(p.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                onClick={() => doSchedule(p.at)}
              />
            ))}
            <MenuDivider />
            <MenuItem icon={<CalendarClock size={18} />} label="Pick date & time" onClick={() => setCustomSchedule(true)} />
          </div>
        )}
      </Popover>
      <Popover anchor={emoji.anchor} onClose={emoji.close}>
        <div className="grid w-64 grid-cols-8 gap-0.5 px-2">
          {EMOJIS.map((em) => (
            <button
              key={em}
              className="flex h-8 w-7 items-center justify-center rounded text-lg hover:bg-hover"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                editorRef.current?.focus();
                document.execCommand("insertText", false, em);
                onBodyChange();
              }}
            >
              {em}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function MobileComposeActions({
  onAttach, onSend, onSchedule, onDiscard, onFormat, more,
}: {
  onAttach: () => void;
  onSend: () => void;
  onSchedule: (el: HTMLElement) => void;
  onDiscard: () => void;
  onFormat: () => void;
  more: ReturnType<typeof useAnchor>;
}) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById("mobile-compose-actions")), []);
  if (!el) return null;
  return createPortal(
    <>
      <IconButton tip="Attach file" onClick={onAttach}><Paperclip size={22} /></IconButton>
      <IconButton tip="Send" onClick={onSend}><Send size={22} className="text-primary" /></IconButton>
      <IconButton tip="More" onClick={more.open}><MoreVertical size={22} /></IconButton>
      <Popover anchor={more.anchor} onClose={more.close} align="end" className="w-56">
        <MenuItem icon={<CalendarClock size={18} />} label="Schedule send" onClick={() => { const anchor = more.anchor as HTMLElement; more.close(); onSchedule(anchor); }} />
        <MenuItem icon={<Type size={18} />} label="Formatting" onClick={() => { more.close(); onFormat(); }} />
        <MenuItem icon={<Trash2 size={18} />} label="Discard" onClick={() => { more.close(); onDiscard(); }} />
      </Popover>
    </>,
    el,
  );
}

/* ---------------- Floating windows ---------------- */

function ComposeWindowView({ draftId, minimized, maximized, index }: { draftId: string; minimized: boolean; maximized: boolean; index: number }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const a = useMail.getState;
  const close = () => a().closeCompose(draftId);
  if (!draft) return null;
  const title = draft.subject.trim() || (draft.mode === "reply" || draft.mode === "replyAll" ? "Reply" : "New Message");

  const header = (
    <div
      className={clsx(
        "flex h-10 shrink-0 cursor-pointer items-center rounded-t-lg pl-4 pr-2",
        minimized ? "bg-compose-head hover:bg-hover-strong" : "bg-compose-head",
      )}
      onClick={() => a().patchCompose(draftId, { minimized: !minimized, maximized: false })}
    >
      <span className="flex-1 truncate text-sm font-medium">{title}</span>
      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
        <IconButton size="sm" tip={minimized ? "Restore" : "Minimize"} className="h-7 w-7" onClick={() => a().patchCompose(draftId, { minimized: !minimized, maximized: false })}>
          <Minus size={16} />
        </IconButton>
        <IconButton size="sm" tip={maximized ? "Exit full screen" : "Full screen"} className="h-7 w-7" onClick={() => a().patchCompose(draftId, { maximized: !maximized, minimized: false })}>
          {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </IconButton>
        <IconButton size="sm" tip="Save & close" className="h-7 w-7" onClick={close}>
          <X size={16} />
        </IconButton>
      </div>
    </div>
  );

  if (maximized)
    return (
      <div className="anim-fade fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6" onClick={() => a().patchCompose(draftId, { maximized: false })}>
        <div className="anim-pop flex h-full max-h-[860px] w-full max-w-[1100px] flex-col overflow-hidden rounded-lg bg-surface shadow-float" onClick={(e) => e.stopPropagation()}>
          {header}
          <Composer key={draftId} draftId={draftId} variant="window" onClose={close} />
        </div>
      </div>
    );

  return (
    <div
      role="dialog"
      aria-label={title}
      className={clsx(
        "anim-slide pointer-events-auto flex flex-col overflow-hidden rounded-t-lg bg-surface shadow-float",
        minimized ? "h-10 w-[260px]" : "h-[min(560px,calc(100vh-80px))] w-[520px]",
      )}
      style={{ zIndex: 50 + index }}
    >
      {header}
      {!minimized && <Composer key={draftId} draftId={draftId} variant="window" onClose={close} />}
    </div>
  );
}

export function ComposeDock() {
  const composes = useMail((s) => s.composes);
  const isMobile = useIsMobile();
  const a = useMail.getState;

  if (isMobile) {
    const c = [...composes].reverse().find((x) => !x.minimized) ?? composes[composes.length - 1];
    if (!c) return null;
    return <MobileCompose draftId={c.draftId} onClose={() => a().closeCompose(c.draftId)} />;
  }
  if (!composes.length) return null;
  return (
    <div className="no-print pointer-events-none fixed bottom-0 right-4 z-50 flex items-end gap-4">
      {composes.map((c, i) => (
        <ComposeWindowView key={c.draftId} {...c} index={i} />
      ))}
    </div>
  );
}

function MobileCompose({ draftId, onClose }: { draftId: string; onClose: () => void }) {
  const draft = useMail((s) => s.drafts[draftId]);
  if (!draft) return null;
  return (
    <div className="anim-slide fixed inset-0 z-[65] flex flex-col bg-surface">
      <div className="flex h-14 shrink-0 items-center gap-1 px-1">
        <IconButton tip="Save & close" onClick={onClose}>
          <ArrowLeft size={22} />
        </IconButton>
        <span className="flex-1 truncate text-lg">{draft.mode === "new" ? "Compose" : draft.mode === "forward" ? "Forward" : "Reply"}</span>
        <div id="mobile-compose-actions" className="flex items-center" />
      </div>
      <Composer key={draftId} draftId={draftId} variant="mobile" onClose={onClose} />
    </div>
  );
}

/* ---------------- Inline reply (inside thread) ---------------- */

export function InlineReply({ draftId, onClosed }: { draftId: string; onClosed: () => void }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const a = useMail.getState;
  const menu = useAnchor();
  const isMobile = useIsMobile();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [draftId]);
  if (!draft) return null;
  const threadId = draft.threadId;
  const switchMode = (mode: "reply" | "replyAll" | "forward") => {
    menu.close();
    if (!threadId) return;
    const id = a().replyDraft(threadId, mode);
    if (mode === "forward") {
      onClosed();
      a().openCompose(id);
    }
  };
  if (isMobile) {
    return null;
  }
  return (
    <div ref={ref} className="anim-pop flex gap-3 pb-6 pt-2">
      <Avatar contact={{ name: "Sam Carter", email: "sam.carter@fieldnote.io" }} size={40} />
      <div className="flex min-h-[260px] min-w-0 flex-1 flex-col rounded-2xl bg-surface px-3 pt-1 shadow-float">
        <div className="flex items-center gap-1">
          <button onClick={menu.open} className="flex h-8 items-center gap-1 rounded px-1 text-ink-2 hover:bg-hover" aria-label="Type of response">
            {draft.mode === "replyAll" ? <ReplyAll size={18} /> : <Reply size={18} />}
            <ChevronDown size={14} />
          </button>
          <div className="flex-1" />
          <IconButton
            size="sm"
            tip="Pop out reply"
            onClick={() => {
              onClosed();
              a().openCompose(draftId);
            }}
          >
            <ExternalLink size={16} />
          </IconButton>
        </div>
        <Composer key={draftId + draft.mode} draftId={draftId} variant="inline" onClose={onClosed} autoFocusBody />
        <Popover anchor={menu.anchor} onClose={menu.close}>
          <MenuItem icon={<Reply size={18} />} label="Reply" onClick={() => switchMode("reply")} />
          <MenuItem icon={<ReplyAll size={18} />} label="Reply all" onClick={() => switchMode("replyAll")} />
          <MenuItem icon={<Forward size={18} />} label="Forward" onClick={() => switchMode("forward")} />
          <MenuDivider />
          <MenuItem icon={<ExternalLink size={18} />} label="Pop out reply" onClick={() => { menu.close(); onClosed(); a().openCompose(draftId); }} />
        </Popover>
      </div>
    </div>
  );
}

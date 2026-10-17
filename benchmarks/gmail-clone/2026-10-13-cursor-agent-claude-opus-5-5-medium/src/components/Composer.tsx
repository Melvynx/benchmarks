import { useCallback, useEffect, useRef, useState } from "react";
import type { Attachment, Draft } from "../types";
import { uid, useMail } from "../store/mail";
import { contactFor } from "../data/contacts";
import { fileSize, shortDateTime } from "../lib/format";
import { sanitize, htmlToText } from "../lib/html";
import { Icon, IconButton } from "../ui/Icon";
import { Popover, usePopover, MenuItem, MenuDivider } from "../ui/Popover";
import { RecipientInput } from "./RecipientInput";
import { TimePickerMenu } from "./menus";
import { attIcon } from "./common";
import { useUI } from "./uiContext";

type Variant = "window" | "inline";

function typeFor(name: string): Attachment["type"] {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "heic", "svg"].includes(ext)) return "image";
  if (["doc", "docx", "txt", "md", "rtf", "pages"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv", "numbers"].includes(ext)) return "sheet";
  if (["ppt", "pptx", "key"].includes(ext)) return "slides";
  if (["zip", "gz", "tar", "rar"].includes(ext)) return "zip";
  return "other";
}

export function ComposerWindows() {
  const { composers, state } = useMail();
  const live = composers.filter((c) => state.drafts.some((d) => d.id === c.id));
  if (!live.length) return null;
  return (
    <div className="composer-dock">
      {live.map((c) => (
        <Composer key={c.id} draftId={c.id} variant="window" minimized={c.minimized} maximized={c.maximized} />
      ))}
    </div>
  );
}

export function Composer({ draftId, variant, minimized, maximized }: { draftId: string; variant: Variant; minimized?: boolean; maximized?: boolean }) {
  const { state, api, setComposers, confirm, openWindow } = useMail();
  const ui = useUI();
  const initial = state.drafts.find((d) => d.id === draftId);
  const [to, setTo] = useState<string[]>(initial?.to ?? []);
  const [cc, setCc] = useState<string[]>(initial?.cc ?? []);
  const [bcc, setBcc] = useState<string[]>(initial?.bcc ?? []);
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(initial?.attachments ?? []);
  const [showCc, setShowCc] = useState((initial?.cc.length ?? 0) > 0);
  const [showBcc, setShowBcc] = useState((initial?.bcc.length ?? 0) > 0);
  const [showFormat, setShowFormat] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [status, setStatus] = useState<"" | "saving" | "saved">("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(variant === "window" || !(initial?.to.length));
  const [fmtState, setFmtState] = useState<Record<string, boolean>>({});
  const body = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const saveTimer = useRef(0);
  const savedRange = useRef<Range | null>(null);
  const scheduleMenu = usePopover();
  const moreMenu = usePopover();
  const linkPop = usePopover();
  const modeMenu = usePopover();
  const [link, setLink] = useState({ text: "", url: "" });

  const current = useCallback((): Draft => {
    const base = state.drafts.find((d) => d.id === draftId) ?? initial!;
    return {
      ...base,
      to,
      cc,
      bcc,
      subject,
      attachments,
      html: sanitize(body.current?.innerHTML ?? base.html),
    };
  }, [to, cc, bcc, subject, attachments, state.drafts, draftId]);

  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    if (body.current && initial) body.current.innerHTML = initial.html;
    if (variant === "inline" || (initial && initial.to.length)) {
      const el = body.current;
      if (el) {
        el.focus({ preventScroll: variant === "inline" });
        const r = document.createRange();
        const firstP = el.firstElementChild;
        r.setStart(firstP && firstP.tagName === "P" ? firstP : el, firstP?.textContent ? firstP.childNodes.length : 0);
        r.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(() => {
    if (!dirty.current) return;
    dirty.current = false;
    if (!state.drafts.some((d) => d.id === draftId) && !initial) return;
    api.saveDraft(currentRef.current());
    setStatus("saved");
  }, [api, draftId]);

  const touch = () => {
    dirty.current = true;
    setStatus("saving");
    setError(null);
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(save, 800);
  };

  // Save on unmount (closing, navigating away).
  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      if (dirty.current) {
        dirty.current = false;
        api.saveDraft(currentRef.current());
      }
    },
    [],
  );

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    touch();
  }, [to, cc, bcc, subject, attachments]);

  if (!initial) return null;
  const draft = initial;

  const setWin = (patch: { minimized?: boolean; maximized?: boolean }) =>
    setComposers((cs) => cs.map((c) => (c.id === draftId ? { ...c, ...patch } : c)));

  const close = () => {
    clearTimeout(saveTimer.current);
    const d = currentRef.current();
    const empty = !d.to.length && !d.cc.length && !d.bcc.length && !d.subject.trim() && !htmlToText(d.html.replace(/<div class="sig">[\s\S]*?<\/div>/, "")).trim() && !d.attachments.length;
    if (empty && draft.mode === "new") {
      dirty.current = false;
      api.discardDraft(draftId, true);
      return;
    }
    if (dirty.current) {
      dirty.current = false;
      api.saveDraft(d);
    }
    if (variant === "window") setComposers((cs) => cs.filter((c) => c.id !== draftId));
    else api.update((s) => ({ ...s, drafts: s.drafts.map((x) => (x.id === draftId ? { ...d, inline: false, updatedAt: Date.now() } : x)) }));
  };

  const discard = () => {
    clearTimeout(saveTimer.current);
    dirty.current = false;
    api.discardDraft(draftId);
  };

  const send = async () => {
    clearTimeout(saveTimer.current);
    // Let pending recipient text commit via blur.
    (document.activeElement as HTMLElement | null)?.blur?.();
    await new Promise((r) => setTimeout(r, 0));
    const d = currentRef.current();
    const issue = api.hasEmailIssue(d);
    if (issue) {
      setError(issue);
      setRecipientsOpen(true);
      return;
    }
    const text = htmlToText(d.html.replace(/<div class="sig">[\s\S]*?<\/div>/, "")).trim();
    if (!d.subject.trim() && !text && draft.mode === "new") {
      if (!(await confirm({ title: "Send without subject?", body: "Send this message without a subject or text in the body?", confirmLabel: "Send" }))) return;
    }
    dirty.current = false;
    api.sendNow({ ...d, scheduledAt: undefined });
  };

  const schedule = (ts: number) => {
    const d = currentRef.current();
    const issue = api.hasEmailIssue(d);
    if (issue) {
      setError(issue);
      return;
    }
    dirty.current = false;
    clearTimeout(saveTimer.current);
    api.schedule(d, ts);
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    const big = list.find((f) => f.size > 25 * 1024 * 1024);
    if (big) setError(`"${big.name}" is larger than 25 MB.`);
    setAttachments((a) => [
      ...a,
      ...list.filter((f) => f.size <= 25 * 1024 * 1024).map((f) => ({ id: uid("a"), name: f.name, size: f.size || 1, type: typeFor(f.name) })),
    ]);
  };

  const exec = (cmd: string, value?: string) => {
    body.current?.focus();
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    document.execCommand(cmd, false, value);
    touch();
    updateFmt();
  };

  const updateFmt = () => {
    try {
      setFmtState({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      /* not supported */
    }
  };

  const rememberSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && body.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  /** In an untouched body, keep the caret above the signature wherever the user clicks. */
  const caretToStartIfEmpty = () => {
    const el = body.current;
    if (!el) return;
    const firstP = el.firstElementChild;
    const empty = !htmlToText(el.innerHTML.replace(/<div class="sig">[\s\S]*?<\/div>/, "")).trim();
    if (empty && firstP && !firstP.classList.contains("sig")) {
      const r = document.createRange();
      r.setStart(firstP, 0);
      r.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
    rememberSelection();
    updateFmt();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key === "Enter") {
      e.preventDefault();
      send();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (mod && e.shiftKey && e.key.toLowerCase() === "c") {
      e.preventDefault();
      setShowCc(true);
    } else if (mod && e.shiftKey && e.key.toLowerCase() === "b") {
      e.preventDefault();
      setShowBcc(true);
    } else if (mod && e.key.toLowerCase() === "k") {
      e.preventDefault();
      rememberSelection();
      setLink({ text: window.getSelection()?.toString() ?? "", url: "" });
      linkPop.open(e.currentTarget.querySelector<HTMLElement>(".fmt-link") ?? (e.currentTarget as HTMLElement));
    }
    e.stopPropagation();
  };

  const title =
    variant === "inline"
      ? draft.mode === "forward"
        ? "Forward"
        : draft.mode === "replyAll"
          ? "Reply all"
          : "Reply"
      : subject.trim() || (draft.mode === "forward" ? "Forward" : draft.mode === "new" ? "New Message" : "Reply");

  const fmtBtn = (cmd: string, icon: Parameters<typeof IconButton>[0]["icon"], label: string, key?: string) => (
    <IconButton icon={icon} label={label} shortcut={key} size={18} active={!!fmtState[cmd]} onClick={() => exec(cmd)} />
  );

  const recipientsSummary = [...to, ...cc].map((e) => contactFor(e, state.contacts).name).join(", ");
  const isMobileFull = ui.isMobile;

  const cls =
    "composer " +
    variant +
    (minimized ? " minimized" : "") +
    (maximized ? " maximized" : "") +
    (dragging ? " dragging" : "") +
    (isMobileFull ? " mobile" : "");

  const sendGroup = (
    <div className="send-group">
      <button className="send-btn" onClick={send} data-tip="Send (⌘Enter)">
        Send
      </button>
      <button className="send-more" aria-label="More send options" data-tip="More send options" onClick={scheduleMenu.toggle}>
        <Icon name="dropDown" size={20} />
      </button>
    </div>
  );

  const composerBody = (
    <>
      {draft.scheduledAt && (
        <div className="composer-banner">
          <Icon name="scheduleSend" size={18} />
          <span className="grow">Scheduled for {shortDateTime(draft.scheduledAt)}</span>
          <button className="link-btn" onClick={() => api.cancelSchedule(draftId)}>
            Cancel send
          </button>
        </div>
      )}
      {variant === "inline" && !recipientsOpen ? (
        <div className="field-row summary" onClick={() => setRecipientsOpen(true)}>
          <button className="mode-btn" onClick={(e) => (e.stopPropagation(), modeMenu.toggle(e))} aria-label="Type of response">
            <Icon name={draft.mode === "forward" ? "forward" : draft.mode === "replyAll" ? "replyAll" : "reply"} size={18} />
            <Icon name="dropDown" size={16} />
          </button>
          <span className="ellipsis">{recipientsSummary || <span className="muted">Recipients</span>}</span>
        </div>
      ) : (
        <>
          <RecipientInput
            label="To"
            value={to}
            onChange={setTo}
            autoFocus={variant === "window" && !to.length}
            right={
              <span className="cc-toggles">
                {variant === "inline" && (
                  <button className="mode-btn" onClick={(e) => (e.stopPropagation(), modeMenu.toggle(e))} aria-label="Type of response">
                    <Icon name={draft.mode === "forward" ? "forward" : draft.mode === "replyAll" ? "replyAll" : "reply"} size={18} />
                    <Icon name="dropDown" size={16} />
                  </button>
                )}
                {!showCc && (
                  <button type="button" onClick={(e) => (e.stopPropagation(), setShowCc(true))}>
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button type="button" onClick={(e) => (e.stopPropagation(), setShowBcc(true))}>
                    Bcc
                  </button>
                )}
              </span>
            }
          />
          {showCc && <RecipientInput label="Cc" value={cc} onChange={setCc} />}
          {showBcc && <RecipientInput label="Bcc" value={bcc} onChange={setBcc} />}
        </>
      )}
      {variant === "window" && (
        <div className="field-row">
          <input className="subject-input" placeholder="Subject" aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
      )}
      {error && (
        <div className="composer-error" role="alert">
          <Icon name="info" size={18} />
          <span>{error}</span>
        </div>
      )}
      <div className="composer-scroll">
        <div
          ref={body}
          className="composer-body"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Message Body"
          data-placeholder={variant === "inline" ? "" : "Compose email"}
          onInput={touch}
          onFocus={caretToStartIfEmpty}
          onMouseUp={caretToStartIfEmpty}
          onKeyUp={() => (rememberSelection(), updateFmt())}
          onBlur={rememberSelection}
          onPaste={(e) => {
            const html = e.clipboardData.getData("text/html");
            if (html) {
              e.preventDefault();
              document.execCommand("insertHTML", false, sanitize(html));
            }
          }}
        />
        {draft.quote && (
          <>
            <button className="quote-toggle" onClick={() => setShowQuote(!showQuote)} aria-label="Show trimmed content" data-tip="Show trimmed content">
              <Icon name="moreHoriz" size={18} />
            </button>
            {showQuote && <div className="msg-body quoted" dangerouslySetInnerHTML={{ __html: draft.quote }} />}
          </>
        )}
        {attachments.length > 0 && (
          <div className="compose-atts">
            {attachments.map((a) => {
              const t = attIcon(a);
              return (
                <div key={a.id} className="compose-att">
                  <Icon name={t.icon} size={16} style={{ color: t.color }} />
                  <span className="ellipsis strong">{a.name}</span>
                  <span className="muted">({fileSize(a.size)})</span>
                  <IconButton icon="close" label="Remove attachment" size={16} onClick={() => setAttachments((x) => x.filter((y) => y.id !== a.id))} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showFormat && (
        <div className="format-bar" onMouseDown={(e) => e.preventDefault()}>
          {fmtBtn("bold", "bold", "Bold", "⌘B")}
          {fmtBtn("italic", "italic", "Italic", "⌘I")}
          {fmtBtn("underline", "underline", "Underline", "⌘U")}
          {fmtBtn("strikeThrough", "strike", "Strikethrough")}
          <span className="tb-divider" />
          <select
            aria-label="Text color"
            className="color-select"
            onChange={(e) => {
              if (e.target.value) exec("foreColor", e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
          >
            <option value="" disabled>
              Color
            </option>
            <option value="#202124">Default</option>
            <option value="#d93025">Red</option>
            <option value="#1a73e8">Blue</option>
            <option value="#188038">Green</option>
            <option value="#e37400">Orange</option>
            <option value="#9334e6">Purple</option>
          </select>
          <span className="tb-divider" />
          {fmtBtn("insertOrderedList", "numbers", "Numbered list", "⌘⇧7")}
          {fmtBtn("insertUnorderedList", "bullets", "Bulleted list", "⌘⇧8")}
          <IconButton icon="quote" label="Quote" size={18} onClick={() => exec("formatBlock", "blockquote")} />
          <IconButton icon="clearFormat" label="Remove formatting" size={18} onClick={() => (exec("removeFormat"), exec("formatBlock", "p"))} />
        </div>
      )}
      <div className="composer-foot">
        {!isMobileFull && sendGroup}
        <IconButton icon="format" label="Formatting options" active={showFormat} onClick={() => setShowFormat(!showFormat)} />
        <IconButton icon="attach" label="Attach files" onClick={() => file.current?.click()} />
        <IconButton
          icon="link"
          label="Insert link"
          shortcut="⌘K"
          className="fmt-link"
          onClick={(e) => {
            rememberSelection();
            setLink({ text: window.getSelection()?.toString() ?? "", url: "" });
            linkPop.open(e);
          }}
        />
        <IconButton icon="scheduleSend" label="Schedule send" onClick={scheduleMenu.toggle} className="hide-mobile" />
        <span className="grow" />
        {status && !isMobileFull && <span className="draft-status muted small">{status === "saving" ? "Saving…" : "Draft saved"}</span>}
        <IconButton icon="moreVert" label="More options" onClick={moreMenu.toggle} />
        <IconButton icon="trash" label="Discard draft" shortcut="⌘⇧D" onClick={discard} />
        <input
          ref={file}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </>
  );

  return (
    <div
      className={cls}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-label={title}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
      }}
    >
      {isMobileFull ? (
        <div className="composer-mhead">
          <IconButton icon="back" label="Save & close" onClick={close} />
          <span className="grow strong">{title}</span>
          <IconButton icon="attach" label="Attach files" onClick={() => file.current?.click()} />
          <IconButton icon="send" label="Send" onClick={send} className="primary-icon" />
          <IconButton icon="moreVert" label="More" onClick={scheduleMenu.toggle} />
        </div>
      ) : variant === "window" ? (
        <div className="composer-head" onClick={() => minimized && setWin({ minimized: false })}>
          <span className="composer-title ellipsis">{title}</span>
          <IconButton
            icon="minimize"
            label={minimized ? "Expand" : "Minimize"}
            size={18}
            onClick={(e) => {
              e.stopPropagation();
              setWin({ minimized: !minimized, maximized: false });
            }}
          />
          <IconButton
            icon={maximized ? "closeFull" : "openFull"}
            label={maximized ? "Exit full screen" : "Full screen"}
            size={16}
            onClick={(e) => {
              e.stopPropagation();
              setWin({ maximized: !maximized, minimized: false });
            }}
          />
          <IconButton
            icon="close"
            label="Save & close"
            size={18}
            onClick={(e) => {
              e.stopPropagation();
              close();
            }}
          />
        </div>
      ) : null}
      {!minimized && composerBody}
      {dragging && <div className="drop-zone">Drop files here</div>}

      <TimePickerMenu kind="schedule" anchor={scheduleMenu.anchor} onClose={scheduleMenu.close} onPick={schedule} />
      <Popover anchor={moreMenu.anchor} onClose={moreMenu.close} width={240}>
        <MenuItem label="Show Cc & Bcc" icon="people" onClick={() => (setShowCc(true), setShowBcc(true), setRecipientsOpen(true), moreMenu.close())} />
        <MenuItem
          label="Insert signature"
          icon="edit"
          disabled={!state.settings.signature.trim()}
          onClick={() => {
            moreMenu.close();
            body.current?.focus();
            const sel = window.getSelection();
            if (body.current && sel) {
              const r = document.createRange();
              r.selectNodeContents(body.current);
              r.collapse(false);
              sel.removeAllRanges();
              sel.addRange(r);
            }
            document.execCommand("insertHTML", false, `<div class="sig">-- <br>${state.settings.signature.replace(/\n/g, "<br>")}</div>`);
            touch();
          }}
        />
        {variant === "inline" && (
          <MenuItem
            label="Pop out reply"
            icon="openNew"
            onClick={() => {
              moreMenu.close();
              const d = currentRef.current();
              dirty.current = false;
              api.update((s) => ({ ...s, drafts: s.drafts.map((x) => (x.id === draftId ? { ...d, inline: false } : x)) }));
              openWindow(draftId);
            }}
          />
        )}
        <MenuDivider />
        <MenuItem label="Discard draft" icon="trash" danger onClick={() => (moreMenu.close(), discard())} />
      </Popover>
      <Popover anchor={modeMenu.anchor} onClose={modeMenu.close} width={200}>
        {(["reply", "replyAll", "forward"] as const).map((m) => (
          <MenuItem
            key={m}
            icon={m === "forward" ? "forward" : m === "replyAll" ? "replyAll" : "reply"}
            label={m === "forward" ? "Forward" : m === "replyAll" ? "Reply all" : "Reply"}
            checked={draft.mode === m}
            onClick={() => {
              modeMenu.close();
              if (draft.mode === m || !draft.threadId) return;
              const tid = draft.threadId;
              dirty.current = false;
              api.discardDraft(draftId, true);
              setTimeout(() => api.reply(tid, m, undefined, true), 0);
            }}
          />
        ))}
      </Popover>
      <Popover anchor={linkPop.anchor} onClose={linkPop.close} width={320}>
        <form
          className="link-form"
          onSubmit={(e) => {
            e.preventDefault();
            const url = /^(https?:|mailto:)/i.test(link.url) ? link.url : `https://${link.url}`;
            linkPop.close();
            if (!link.url.trim()) return;
            const text = link.text.trim() || link.url;
            const sel = savedRange.current;
            if (sel && !sel.collapsed && sel.toString() === link.text) exec("createLink", url);
            else exec("insertHTML", `<a href="${url.replace(/"/g, "&quot;")}">${text.replace(/</g, "&lt;")}</a>&nbsp;`);
          }}
        >
          <label className="field">
            <span>Text to display</span>
            <input value={link.text} onChange={(e) => setLink({ ...link, text: e.target.value })} />
          </label>
          <label className="field">
            <span>Web address or email</span>
            <input autoFocus value={link.url} placeholder="https://" onChange={(e) => setLink({ ...link, url: e.target.value })} />
          </label>
          <div className="picker-actions">
            <button type="button" className="btn text" onClick={linkPop.close}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={!link.url.trim()}>
              OK
            </button>
          </div>
        </form>
      </Popover>
    </div>
  );
}

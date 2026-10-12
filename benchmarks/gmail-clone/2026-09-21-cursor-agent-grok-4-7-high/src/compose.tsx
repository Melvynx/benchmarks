import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Draft, Thread } from "./types";
import { formatFull, isEmail, presetMoments, resolveContact, unique } from "./format";
import { Icon } from "./icons";
import { useMail, useNarrow } from "./store";
import { Avatar } from "./shell";

export function ComposeDock() {
  const mail = useMail();
  const draft = mail.drafts.find((item) => item.id === mail.dockDraftId);
  if (!draft) return null;
  return (
    <Composer
      draft={draft}
      variant="dock"
      minimized={mail.dockMinimized}
      expanded={mail.dockExpanded}
    />
  );
}

export function InlineComposer({ thread }: { thread: Thread }) {
  const mail = useMail();
  const draft = mail.drafts.find((item) => item.threadId === thread.id && item.id !== mail.dockDraftId && !item.scheduledFor);
  if (!draft) {
    return (
      <div className="composer" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Avatar name={mail.me.name} email={mail.me.email} size={32} />
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "compose", mode: "reply", threadId: thread.id })}>Reply</button>
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "compose", mode: "replyAll", threadId: thread.id })}>Reply all</button>
        <button className="btn ghost" onClick={() => mail.dispatch({ type: "compose", mode: "forward", threadId: thread.id, popout: true })}>Forward</button>
      </div>
    );
  }
  return <Composer draft={draft} variant="inline" />;
}

function Composer({
  draft,
  variant,
  minimized = false,
  expanded = false,
}: {
  draft: Draft;
  variant: "dock" | "inline";
  minimized?: boolean;
  expanded?: boolean;
}) {
  const mail = useMail();
  const narrow = useNarrow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const title = draft.subject.trim() || (draft.mode === "new" ? "New message" : draft.mode === "forward" ? "Forward" : "Reply");

  const patch = (next: Partial<Draft>) => mail.dispatch({ type: "update-draft", id: draft.id, patch: next });
  const send = (archive = false) => {
    if (!draft.subject.trim()) {
      mail.dispatch({
        type: "dialog",
        dialog: {
          type: "confirm",
          title: "Send without a subject?",
          body: "This message has no subject line.",
          confirm: archive ? "Send and archive" : "Send",
          intent: { type: "send-no-subject", draftId: draft.id, archive },
        },
      });
      return;
    }
    mail.dispatch({ type: "send", id: draft.id, archive });
  };

  if (variant === "dock" && minimized) {
    return (
      <div className="composer dock min" onClick={() => mail.dispatch({ type: "minimize" })}>
        <div className="dock-bar">
          <span>{title}</span>
          <button className="ib sm" aria-label="Expand" onClick={(event) => { event.stopPropagation(); mail.dispatch({ type: "expand", value: true }); }}><Icon name="expand" size={16} /></button>
          <button className="ib sm" aria-label="Close" onClick={(event) => { event.stopPropagation(); mail.dispatch({ type: "close-dock" }); }}><Icon name="close" size={16} /></button>
        </div>
      </div>
    );
  }

  return (
    <section
      className={variant === "dock" ? `composer dock${expanded || narrow ? " expanded" : ""}` : "composer"}
      data-testid="compose"
      aria-label={title}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
          event.preventDefault();
          send(false);
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        if (event.dataTransfer.files.length) void addFiles(event.dataTransfer.files, draft, patch);
      }}
    >
      {variant === "dock" && (
        <div className="dock-bar">
          <span>{title}</span>
          <button className="ib sm" aria-label="Minimize" onClick={() => mail.dispatch({ type: "minimize" })}><Icon name="minus" size={16} /></button>
          <button className="ib sm" aria-label={expanded ? "Exit full screen" : "Full screen"} onClick={() => mail.dispatch({ type: "expand", value: !expanded })}><Icon name="expand" size={16} /></button>
          <button className="ib sm" aria-label="Save and close" onClick={() => mail.dispatch({ type: "close-dock" })}><Icon name="close" size={16} /></button>
        </div>
      )}
      <div className="composer-fields">
        {draft.scheduledFor && (
          <div className="schedule-note">
            <span>Scheduled for {formatFull(draft.scheduledFor)}</span>
            <button className="linkish" onClick={() => patch({ scheduledFor: null })}>Cancel send</button>
          </div>
        )}
        <Recipients
          label="To"
          values={draft.to}
          contacts={mail.contacts}
          onChange={(to) => patch({ to })}
          trailing={
            <>
              {!draft.showCc && <button className="linkish" onClick={() => patch({ showCc: true })}>Cc</button>}
              {!draft.showBcc && <button className="linkish" onClick={() => patch({ showBcc: true })}>Bcc</button>}
            </>
          }
        />
        {draft.showCc && <Recipients label="Cc" values={draft.cc} contacts={mail.contacts} onChange={(cc) => patch({ cc })} />}
        {draft.showBcc && <Recipients label="Bcc" values={draft.bcc} contacts={mail.contacts} onChange={(bcc) => patch({ bcc })} />}
        <div className="field">
          <input aria-label="Subject" placeholder="Subject" type="text" value={draft.subject} onChange={(event) => patch({ subject: event.target.value })} />
        </div>
        <RichText html={draft.bodyHtml} draftId={draft.id} focusNonce={mail.focusNonce} onChange={(bodyHtml) => patch({ bodyHtml })} />
        {mail.settings.signatureOn && <div className="sig">{mail.settings.signature}</div>}
        {draft.quote && <QuoteBlock quote={draft.quote} />}
        {draft.attachments.length > 0 && (
          <div className="files" style={{ paddingLeft: 12 }}>
            {draft.attachments.map((file) => (
              <span key={file.id} className="file-chip">
                <Icon name="file" size={16} />
                <span>{file.name}</span>
                <button aria-label={`Remove ${file.name}`} onClick={() => patch({ attachments: draft.attachments.filter((item) => item.id !== file.id) })}><Icon name="close" size={14} /></button>
              </span>
            ))}
          </div>
        )}
        {draft.confidential && <div className="banner" style={{ marginLeft: 12 }}>Confidential. Recipients in this mailbox see an expiry banner for 7 days.</div>}
        {mail.formError && <div className="form-error">{mail.formError}</div>}
      </div>
      <div className="composer-bar">
        <div className="send-split pop-anchor" data-menu-root>
          <button className="send" onClick={() => send(false)}>{draft.scheduledFor ? "Send now" : "Send"}</button>
          <button className="caret" aria-label="More send options" onClick={() => mail.dispatch({ type: "menu", menu: mail.menu?.type === "schedule" ? null : { type: "schedule" } })}>
            <Icon name="chevron-down" size={16} />
          </button>
          {mail.menu?.type === "schedule" && (
            <ScheduleMenu draftId={draft.id} onPick={(when) => mail.dispatch({ type: "send", id: draft.id, when })} />
          )}
        </div>
        {draft.threadId && (
          <button className="btn ghost" onClick={() => send(true)}>Send and archive</button>
        )}
        <span className="grow" />
        <FormatBar linkOpen={linkOpen} linkUrl={linkUrl} setLinkOpen={setLinkOpen} setLinkUrl={setLinkUrl} confidential={draft.confidential} onConfidential={() => patch({ confidential: !draft.confidential })} onAttach={() => fileRef.current?.click()} />
        <button className="ib sm" aria-label="Discard draft" onClick={() => mail.dispatch({ type: "discard", id: draft.id })}><Icon name="trash" size={18} /></button>
        <input ref={fileRef} type="file" multiple hidden onChange={(event) => { if (event.target.files) void addFiles(event.target.files, draft, patch); event.target.value = ""; }} />
      </div>
    </section>
  );
}

function ScheduleMenu({ draftId, onPick }: { draftId: string; onPick: (when: string) => void }) {
  const mail = useMail();
  const presets = presetMoments(new Date(mail.now));
  return (
    <div className="menu" data-menu style={{ bottom: "110%", top: "auto" }}>
      {presets.map((preset) => (
        <button key={preset.id} onClick={() => onPick(preset.date.toISOString())}>
          {preset.label}
          <span className="hint">{preset.hint}</span>
        </button>
      ))}
      <button onClick={() => mail.dispatch({ type: "dialog", dialog: { type: "datetime", purpose: "schedule", draftId } })}>Pick date and time</button>
    </div>
  );
}

function FormatBar({
  linkOpen,
  linkUrl,
  setLinkOpen,
  setLinkUrl,
  confidential,
  onConfidential,
  onAttach,
}: {
  linkOpen: boolean;
  linkUrl: string;
  setLinkOpen: (value: boolean) => void;
  setLinkUrl: (value: string) => void;
  confidential: boolean;
  onConfidential: () => void;
  onAttach: () => void;
}) {
  const run = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };
  return (
    <>
      <button className="format-btn text" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => run("bold")}>B</button>
      <button className="format-btn text" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => run("italic")}><i>I</i></button>
      <button className="format-btn text" aria-label="Underline" onMouseDown={(event) => event.preventDefault()} onClick={() => run("underline")}><u>U</u></button>
      <button className="format-btn" aria-label="Bulleted list" onMouseDown={(event) => event.preventDefault()} onClick={() => run("insertUnorderedList")}><Icon name="list" size={16} /></button>
      <span className="pop-anchor">
        <button className="format-btn" aria-label="Insert link" onMouseDown={(event) => event.preventDefault()} onClick={() => setLinkOpen(!linkOpen)}><Icon name="link" size={16} /></button>
        {linkOpen && (
          <form
            className="menu"
            data-menu
            style={{ bottom: "120%", top: "auto", padding: 8 }}
            onSubmit={(event) => {
              event.preventDefault();
              if (!linkUrl.trim()) return;
              const href = /^https?:|^mailto:/i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
              run("createLink", href);
              setLinkOpen(false);
              setLinkUrl("");
            }}
          >
            <input aria-label="Link URL" placeholder="https://" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} style={{ width: 200, border: 0, outline: "none" }} />
          </form>
        )}
      </span>
      <button className={confidential ? "format-btn on" : "format-btn"} aria-label="Confidential mode" aria-pressed={confidential} onClick={onConfidential}><Icon name="lock" size={16} /></button>
      <button className="format-btn" aria-label="Attach files" onClick={onAttach}><Icon name="paperclip" size={16} /></button>
    </>
  );
}

function RichText({ html, draftId, onChange, focusNonce }: { html: string; draftId: string; onChange: (html: string) => void; focusNonce: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef("");
  useEffect(() => {
    const node = ref.current;
    if (!node || seen.current === draftId) return;
    node.innerHTML = html;
    seen.current = draftId;
  }, [draftId, html]);
  useEffect(() => {
    if (focusNonce && seen.current === draftId) ref.current?.focus();
  }, [focusNonce, draftId]);
  return (
    <div className="editor-wrap">
      <div
        ref={ref}
        className="editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        data-placeholder="Write your message"
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
      />
    </div>
  );
}

function QuoteBlock({ quote }: { quote: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="quote-toggle" onClick={() => setOpen(true)} aria-label="Show quoted text">…</button>;
  return <div className="quote">{quote}</div>;
}

function Recipients({ label, values, contacts, onChange, trailing }: { label: string; values: string[]; contacts: { name: string; email: string }[]; onChange: (values: string[]) => void; trailing?: ReactNode }) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const mail = useMail();
  const suggestions = text.trim()
    ? contacts.filter((contact) => !values.some((value) => value.toLowerCase() === contact.email.toLowerCase()) && `${contact.name} ${contact.email}`.toLowerCase().includes(text.trim().toLowerCase())).slice(0, 6)
    : [];
  const add = (email: string) => {
    const clean = email.trim().replace(/,$/, "");
    if (!isEmail(clean)) {
      mail.dispatch({ type: "toast", text: "That doesn't look like an email address." });
      return;
    }
    onChange(unique([...values, clean]));
    setText("");
    setActive(0);
  };
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips-inline">
        {values.map((email) => {
          const contact = resolveContact(email, contacts);
          return (
            <span className="person-chip" key={email}>
              <Avatar name={contact.name} email={contact.email} size={20} />
              <b>{contact.name}</b>
              <button aria-label={`Remove ${contact.name}`} onClick={() => onChange(values.filter((value) => value !== email))}><Icon name="close" size={12} /></button>
            </span>
          );
        })}
        <input
          aria-label={label}
          value={text}
          placeholder={values.length ? "" : label === "To" ? "Recipients" : ""}
          onChange={(event) => { setText(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(suggestions.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(0, index - 1));
            } else if (event.key === "Enter" || event.key === "," || (event.key === "Tab" && text.trim())) {
              event.preventDefault();
              if (suggestions[active]) add(suggestions[active].email);
              else if (text.trim()) add(text);
            } else if (event.key === "Backspace" && !text && values.length) onChange(values.slice(0, -1));
          }}
          onBlur={() => { if (text.trim() && isEmail(text.trim())) add(text); }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text");
            if (/[,;\n]/.test(pasted)) {
              event.preventDefault();
              const bits = pasted.split(/[,;\s]+/).filter(isEmail);
              if (bits.length) onChange(unique([...values, ...bits]));
              setText("");
            }
          }}
        />
      </div>
      {trailing}
      {suggestions.length > 0 && (
        <div className="suggest" role="listbox">
          {suggestions.map((contact, index) => (
            <button key={contact.email} className={index === active ? "active" : ""} type="button" onMouseDown={(event) => { event.preventDefault(); add(contact.email); }}>
              <Avatar name={contact.name} email={contact.email} size={28} />
              <span>{contact.name}<small>{contact.email}</small></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

async function addFiles(files: FileList, draft: Draft, patch: (next: Partial<Draft>) => void) {
  const attachments = [...draft.attachments];
  for (const file of files) {
    let dataUrl: string | undefined;
    if (file.type.startsWith("image/") && file.size < 280_000) dataUrl = await readFile(file);
    attachments.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, name: file.name, size: file.size, mime: file.type || "application/octet-stream", dataUrl });
  }
  patch({ attachments });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

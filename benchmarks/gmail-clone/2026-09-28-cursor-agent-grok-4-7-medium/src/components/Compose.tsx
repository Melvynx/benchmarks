import { Bold, ChevronDown, Italic, Link2, List, Minus, Paperclip, Square, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HOUR, isEmail, snoozePresets } from "../lib/format";
import { useMail } from "../state/mail-context";
import type { Attachment, Message, Person } from "../types";

export function ComposeDock() {
  const { data, ui, mobile, dismissCompose, patchUi } = useMail();
  const draft = data.messages.find((message) => message.id === ui.composeId);
  if (!draft) return null;
  const full = mobile || ui.composeFull;
  return (
    <section className={`compose ${ui.composeMin && !full ? "min" : ""} ${full ? "full" : ""}`} aria-label="Compose">
      <header className="compose-head">
        <button type="button" className="compose-title" onClick={() => patchUi({ composeMin: !ui.composeMin })}>
          {draft.subject.trim() || "New Message"}
        </button>
        <div className="compose-window-actions">
          <button type="button" aria-label="Minimize" onClick={() => patchUi({ composeMin: true, composeFull: false })}>
            <Minus size={16} />
          </button>
          <button type="button" aria-label={full ? "Exit full screen" : "Full screen"} onClick={() => patchUi({ composeFull: !ui.composeFull, composeMin: false })}>
            <Square size={14} />
          </button>
          <button type="button" aria-label="Save and close" onClick={dismissCompose}>
            <X size={16} />
          </button>
        </div>
      </header>
      {!ui.composeMin || full ? <DraftEditor draft={draft} variant="dock" /> : null}
    </section>
  );
}

export function DraftEditor({ draft, variant }: { draft: Message; variant: "dock" | "inline" }) {
  const { dispatch, contacts, dismissCompose, data } = useMail();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showCc, setShowCc] = useState(draft.cc.length > 0);
  const [showBcc, setShowBcc] = useState(draft.bcc.length > 0);
  const [warnSubject, setWarnSubject] = useState(false);
  const [error, setError] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const saved = useMemo(() => draft.body.trim().length > 0 || draft.subject.trim().length > 0 || draft.to.length > 0, [draft]);

  useEffect(() => {
    if (variant === "inline") bodyRef.current?.focus();
  }, [variant, draft.id]);

  function patch(partial: Partial<Message>, touch = true) {
    dispatch({ type: "patch", id: draft.id, patch: partial, touch });
  }

  function wrap(before: string, after = before) {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = `${draft.body.slice(0, start)}${before}${draft.body.slice(start, end)}${after}${draft.body.slice(end)}`;
    patch({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + before.length;
      el.selectionEnd = end + before.length;
    });
  }

  function trySend(sendAt?: number | null, force = false) {
    if (draft.to.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    if (!force && !draft.subject.trim()) {
      setWarnSubject(true);
      return;
    }
    setError("");
    setWarnSubject(false);
    dispatch({ type: "send", id: draft.id, sendAt: sendAt ?? null });
    if (variant === "dock") dismissCompose();
  }

  function discard() {
    const empty = !draft.subject && !draft.body.trim() && draft.to.length === 0 && draft.attachments.length === 0;
    dispatch({ type: "discard", id: draft.id }, { silent: empty });
    if (variant === "dock") dismissCompose();
  }

  async function onFiles(list: FileList | null) {
    if (!list?.length) return;
    const attachments: Attachment[] = [];
    for (const file of [...list]) {
      let preview = `${file.name}\n${file.type || "file"} · ${file.size} bytes`;
      if (file.type.startsWith("text") || /\.(txt|md|csv|json)$/i.test(file.name)) {
        preview = (await file.text()).slice(0, 5000);
      }
      attachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
        preview,
      });
    }
    patch({ attachments: [...draft.attachments, ...attachments] });
  }

  return (
    <div className={`editor-wrap ${variant}`} id={variant === "inline" ? "inline-reply" : undefined}>
      {warnSubject && (
        <div className="warn">
          <span>Send this message without a subject?</span>
          <button type="button" onClick={() => trySend(null, true)}>Send</button>
          <button type="button" onClick={() => setWarnSubject(false)}>Add subject</button>
        </div>
      )}
      <RecipientRow label="To" people={draft.to} contacts={contacts} onChange={(to) => patch({ to })} extra={
        <span className="cc-toggles">
          {!showCc && <button type="button" onClick={() => setShowCc(true)}>Cc</button>}
          {!showBcc && <button type="button" onClick={() => setShowBcc(true)}>Bcc</button>}
        </span>
      } />
      {showCc && <RecipientRow label="Cc" people={draft.cc} contacts={contacts} onChange={(cc) => patch({ cc })} />}
      {showBcc && <RecipientRow label="Bcc" people={draft.bcc} contacts={contacts} onChange={(bcc) => patch({ bcc })} />}
      <input
        className="subject-input"
        value={draft.subject}
        placeholder="Subject"
        aria-label="Subject"
        onChange={(event) => patch({ subject: event.target.value })}
      />
      <textarea
        ref={bodyRef}
        className="body-input"
        value={draft.body}
        aria-label="Message body"
        placeholder="Write your message"
        onChange={(event) => patch({ body: event.target.value })}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            trySend();
          }
        }}
      />
      {draft.attachments.length > 0 && (
        <div className="compose-atts">
          {draft.attachments.map((attachment) => (
            <span key={attachment.id} className="att">
              {attachment.name}
              <button type="button" aria-label={`Remove ${attachment.name}`} onClick={() => patch({ attachments: draft.attachments.filter((item) => item.id !== attachment.id) })}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <footer className="compose-foot">
        <div className="send-split">
          <button type="button" className="send-btn" onClick={() => trySend()}>
            Send
          </button>
          <button type="button" className="send-more" aria-label="Schedule send" onClick={() => setScheduleOpen((value) => !value)}>
            <ChevronDown size={16} />
          </button>
          {scheduleOpen && (
            <div className="schedule-pop menu">
              <p className="menu-label">Schedule send</p>
              {snoozePresets().slice(0, 2).map((preset) => (
                <button key={preset.id} type="button" className="menu-item" onClick={() => trySend(preset.until)}>
                  <span>{preset.label}</span>
                  <em>{preset.hint}</em>
                </button>
              ))}
              <button
                type="button"
                className="menu-item"
                onClick={() => {
                  const when = new Date(Date.now() + 20 * HOUR);
                  when.setMinutes(0, 0, 0);
                  trySend(when.getTime());
                }}
              >
                <span>Tomorrow morning</span>
                <em>If later today has passed</em>
              </button>
              <label className="menu-item picker">
                <span>Pick date & time</span>
                <input
                  type="datetime-local"
                  onChange={(event) => {
                    const until = new Date(event.target.value).getTime();
                    if (!Number.isNaN(until) && until > Date.now()) trySend(until);
                  }}
                />
              </label>
            </div>
          )}
        </div>
        <div className="format-bar">
          <button type="button" aria-label="Bold" onClick={() => wrap("**")}><Bold size={16} /></button>
          <button type="button" aria-label="Italic" onClick={() => wrap("*")}><Italic size={16} /></button>
          <button type="button" aria-label="Bulleted list" onClick={() => wrap("\n- ", "")}><List size={16} /></button>
          <button
            type="button"
            aria-label="Insert link"
            onClick={() => {
              const el = bodyRef.current;
              const selected = el ? draft.body.slice(el.selectionStart, el.selectionEnd) : "";
              wrap(`[${selected || "link"}](`, ")");
            }}
          >
            <Link2 size={16} />
          </button>
          <button type="button" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
            <Paperclip size={16} />
          </button>
          <input ref={fileRef} type="file" multiple hidden onChange={(event) => void onFiles(event.target.files)} />
        </div>
        <span className="draft-state">{saved ? "Draft saved" : ""}</span>
        {data.settings.signatureOn && <span className="sig-note">Signature on</span>}
        <button type="button" className="icon-btn" aria-label="Discard draft" onClick={discard}>
          <Trash2 size={18} />
        </button>
      </footer>
    </div>
  );
}

function RecipientRow({
  label,
  people,
  contacts,
  onChange,
  extra,
}: {
  label: string;
  people: Person[];
  contacts: Person[];
  onChange: (people: Person[]) => void;
  extra?: ReactNode;
}) {
  const [text, setText] = useState("");
  const [hi, setHi] = useState(0);
  const suggestions = text.trim()
    ? contacts
        .filter((contact) => {
          const hay = `${contact.name} ${contact.email}`.toLowerCase();
          return hay.includes(text.trim().toLowerCase()) && !people.some((person) => person.email.toLowerCase() === contact.email.toLowerCase());
        })
        .slice(0, 6)
    : [];

  function add(person: Person) {
    if (people.some((item) => item.email.toLowerCase() === person.email.toLowerCase())) return;
    onChange([...people, person]);
    setText("");
    setHi(0);
  }

  function commit(raw: string): boolean {
    const parts = raw.split(/[,;\n]+/).map((part) => part.trim()).filter(Boolean);
    if (!parts.length) return true;
    const next = [...people];
    for (const part of parts) {
      const known = contacts.find((contact) => contact.name.toLowerCase() === part.toLowerCase() || contact.email.toLowerCase() === part.toLowerCase());
      const email = known?.email ?? part;
      if (!isEmail(email)) return false;
      if (!next.some((person) => person.email.toLowerCase() === email.toLowerCase())) next.push(known ?? { name: email, email });
    }
    onChange(next);
    setText("");
    return true;
  }

  return (
    <div className="recipient">
      <span>{label}</span>
      <div className="recipient-main">
        {people.map((person) => (
          <span key={person.email} className="chip" title={person.email}>
            {person.name === person.email ? person.email : person.name}
            <button type="button" aria-label={`Remove ${person.email}`} onClick={() => onChange(people.filter((item) => item.email !== person.email))}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          aria-label={label}
          value={text}
          placeholder={people.length ? "" : "Recipients"}
          onChange={(event) => {
            setText(event.target.value);
            setHi(0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !text && people.length) {
              onChange(people.slice(0, -1));
            }
            if (event.key === "ArrowDown" && suggestions.length) {
              event.preventDefault();
              setHi((value) => Math.min(suggestions.length - 1, value + 1));
            }
            if (event.key === "ArrowUp" && suggestions.length) {
              event.preventDefault();
              setHi((value) => Math.max(0, value - 1));
            }
            if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
              if (suggestions[hi] && text.trim() && !isEmail(text.trim())) {
                event.preventDefault();
                add(suggestions[hi]);
                return;
              }
              if (event.key !== "Tab" || text.trim()) {
                const ok = commit(text);
                if (!ok) return;
                if (event.key !== "Tab") event.preventDefault();
              }
            }
          }}
          onBlur={() => {
            if (text.trim()) commit(text);
          }}
        />
        {suggestions.length > 0 && (
          <div className="suggest" role="listbox">
            {suggestions.map((contact, index) => (
              <button key={contact.email} type="button" className={index === hi ? "on" : ""} onMouseDown={(event) => { event.preventDefault(); add(contact); }}>
                <strong>{contact.name}</strong>
                <em>{contact.email}</em>
              </button>
            ))}
          </div>
        )}
      </div>
      {extra}
    </div>
  );
}

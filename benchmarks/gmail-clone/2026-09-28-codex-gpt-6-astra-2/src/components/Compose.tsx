import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bold,
  Check,
  ChevronDown,
  Italic,
  List,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Send,
  Trash2,
  Underline,
  X,
} from "lucide-react";
import { ACCOUNT, type Attachment, type Draft } from "../types";
import { contacts } from "../data";
import { isEmail, STORAGE_KEY } from "../mail";
import { Avatar, IconButton } from "./ui";

interface Props {
  draft: Draft;
  signature: boolean;
  saveError: boolean;
  onChange: (draft: Draft) => void;
  onClose: () => void;
  onDiscard: () => void;
  onSend: (draft: Draft) => void;
}

export default function Compose({
  draft,
  signature,
  saveError,
  onChange,
  onClose,
  onDiscard,
  onSend,
}: Props) {
  const [recipient, setRecipient] = useState("");
  const [showCc, setShowCc] = useState(!!draft.cc);
  const [showBcc, setShowBcc] = useState(!!draft.bcc);
  const [minimized, setMinimized] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const editor = useRef<HTMLDivElement>(null);
  const recipientInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const currentDraft = useRef(draft);
  currentDraft.current = draft;

  useEffect(() => {
    if (editor.current) {
      if (draft.html) editor.current.innerHTML = draft.html;
      else editor.current.innerText = draft.body;
    }
    if (!draft.to.length) recipientInput.current?.focus();
    else editor.current?.focus();
    // A different draft starts a new editor session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.id]);

  function update(change: Partial<Draft>) {
    onChange({
      ...currentDraft.current,
      ...change,
      updatedAt: new Date().toISOString(),
    });
    setSaving(true);
    setError("");
  }
  useEffect(() => {
    if (!saving) return;
    const timer = setTimeout(() => setSaving(false), 650);
    return () => clearTimeout(timer);
  }, [saving, draft]);

  function addRecipient(value = recipient) {
    const emails = value.split(/[,;\s]+/).filter(Boolean);
    if (!emails.length) return true;
    if (emails.some((email) => !isEmail(email))) {
      setError("Enter a complete email address, like sophie@studio.design.");
      return false;
    }
    update({ to: [...new Set([...draft.to, ...emails])] });
    setRecipient("");
    setSuggestions(false);
    return true;
  }

  function send() {
    const extra = recipient.split(/[,;\s]+/).filter(Boolean);
    const to = [...new Set([...draft.to, ...extra])];
    if (!to.length || to.some((email) => !isEmail(email))) {
      setError("Add a valid recipient before sending.");
      recipientInput.current?.focus();
      return;
    }
    if (
      [draft.cc, draft.bcc].some(
        (value) =>
          value &&
          value
            .split(/[,;\s]+/)
            .filter(Boolean)
            .some((email) => !isEmail(email)),
      )
    ) {
      setError("Check the email addresses in Cc and Bcc.");
      return;
    }
    if (!draft.subject.trim()) {
      setError("Give your message a subject before sending.");
      return;
    }
    if (!draft.body.trim() && !draft.attachments.length) {
      setError("Your message is a little empty. Add a note or an attachment.");
      editor.current?.focus();
      return;
    }
    onSend({ ...draft, to });
  }

  async function attach(files: FileList | null) {
    if (!files) return;
    const added: Attachment[] = [];
    let attachmentError = "";
    let storedLength = 0;
    try {
      storedLength = localStorage.getItem(STORAGE_KEY)?.length || 0;
    } catch {
      /* Storage status is shown in the composer. */
    }
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024) {
        attachmentError =
          "Choose files smaller than 1 MB for this local mailbox.";
        continue;
      }
      if (
        storedLength +
          added.reduce((sum, item) => sum + (item.data?.length || 0), 0) +
          file.size * 1.4 >
        2_000_000
      ) {
        attachmentError =
          "Your local mailbox is nearly full. Remove an attachment or empty Trash to make room.";
        continue;
      }
      let data: string;
      try {
        data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        attachmentError = `Couldn't read ${file.name}. Try choosing it again.`;
        continue;
      }
      added.push({
        id: crypto.randomUUID(),
        name: file.name,
        size:
          file.size > 1024 * 1024
            ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
            : `${Math.max(1, Math.round(file.size / 1024))} KB`,
        type: file.name.split(".").pop() || "file",
        data,
      });
    }
    if (added.length)
      update({ attachments: [...currentDraft.current.attachments, ...added] });
    if (attachmentError) setError(attachmentError);
    if (fileInput.current) fileInput.current.value = "";
  }

  function format(command: string) {
    editor.current?.focus();
    document.execCommand(command);
    if (editor.current)
      update({
        body: editor.current.innerText,
        html: editor.current.innerHTML,
      });
  }

  const suggested = contacts.filter(
    (c) =>
      (c.name + c.email).toLowerCase().includes(recipient.toLowerCase()) &&
      !draft.to.includes(c.email),
  );
  return (
    <section
      className={`compose ${expanded ? "expanded" : ""} ${minimized ? "minimized" : ""}`}
      aria-label="Compose message"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          send();
        }
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <header
        className="compose-heading"
        onDoubleClick={() => {
          setExpanded(!expanded);
          setMinimized(false);
        }}
      >
        <span>{draft.replyTo ? "Reply" : "New message"}</span>
        <div>
          <IconButton
            icon={minimized ? ChevronDown : Minus}
            label={minimized ? "Expand message" : "Minimize message"}
            onClick={() => {
              setMinimized(!minimized);
              if (!minimized) setExpanded(false);
            }}
          />
          <IconButton
            icon={expanded ? Minimize2 : Maximize2}
            label={expanded ? "Exit full screen" : "Full screen"}
            onClick={() => {
              setExpanded(!expanded);
              setMinimized(false);
            }}
          />
          <IconButton icon={X} label="Save and close draft" onClick={onClose} />
        </div>
      </header>
      <div className="compose-content" hidden={minimized}>
        <div className="recipient-line">
          <span className="field-caption">To</span>
          <div className="recipient-chips">
            {draft.to.map((email) => (
              <span className="recipient-chip" key={email}>
                {contacts.find((c) => c.email === email)?.name || email}
                <button
                  aria-label={`Remove ${email}`}
                  onClick={() =>
                    update({ to: draft.to.filter((t) => t !== email) })
                  }
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <input
              ref={recipientInput}
              aria-label="Recipients"
              value={recipient}
              placeholder={draft.to.length ? "" : "Name or email address"}
              onFocus={() => setSuggestions(true)}
              onChange={(e) => {
                setRecipient(e.target.value);
                setSuggestions(true);
                setError("");
              }}
              onKeyDown={(e) => {
                if (["Enter", ",", ";", "Tab"].includes(e.key) && recipient) {
                  e.preventDefault();
                  addRecipient();
                }
                if (e.key === "Backspace" && !recipient)
                  update({ to: draft.to.slice(0, -1) });
              }}
              onBlur={() => {
                setTimeout(() => setSuggestions(false), 150);
                if (recipient && isEmail(recipient)) addRecipient();
              }}
            />
          </div>
          <button className="text-button" onClick={() => setShowCc(!showCc)}>
            Cc
          </button>
          <button className="text-button" onClick={() => setShowBcc(!showBcc)}>
            Bcc
          </button>
          {suggestions && recipient && suggested.length > 0 && (
            <div className="contact-suggestions">
              {suggested.slice(0, 4).map((c) => (
                <button
                  key={c.email}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    addRecipient(c.email);
                    recipientInput.current?.focus();
                  }}
                >
                  <Avatar {...c} />
                  <span>
                    <b>{c.name}</b>
                    <small>{c.email}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {showCc && (
          <label className="compose-field">
            <span>Cc</span>
            <input
              aria-label="Cc recipients"
              value={draft.cc}
              onChange={(e) => update({ cc: e.target.value })}
              placeholder="Separate addresses with commas"
            />
          </label>
        )}
        {showBcc && (
          <label className="compose-field">
            <span>Bcc</span>
            <input
              aria-label="Bcc recipients"
              value={draft.bcc}
              onChange={(e) => update({ bcc: e.target.value })}
              placeholder="Separate addresses with commas"
            />
          </label>
        )}
        <label className="compose-field subject-field">
          <input
            aria-label="Subject"
            placeholder="Subject"
            value={draft.subject}
            onChange={(e) => update({ subject: e.target.value })}
          />
        </label>
        <div className="compose-editor-wrap">
          <div
            ref={editor}
            className="compose-editor"
            role="textbox"
            aria-label="Message body"
            aria-multiline="true"
            contentEditable
            suppressContentEditableWarning
            data-placeholder="Write something thoughtful…"
            onInput={() => {
              if (editor.current)
                update({
                  body: editor.current.innerText,
                  html: editor.current.innerHTML,
                });
            }}
            onPaste={(e) => {
              e.preventDefault();
              document.execCommand(
                "insertText",
                false,
                e.clipboardData.getData("text/plain"),
              );
            }}
            onDrop={(e) => e.preventDefault()}
          />
          {signature && (
            <div className="compose-signature">
              —<br />
              Alex Morgan<span>Designer, Studio</span>
            </div>
          )}
        </div>
        {draft.attachments.length > 0 && (
          <div className="compose-attachments">
            {draft.attachments.map((file) => (
              <div key={file.id}>
                <Paperclip size={14} />
                <span>{file.name}</span>
                <small>{file.size}</small>
                <IconButton
                  icon={X}
                  label={`Remove ${file.name}`}
                  onClick={() =>
                    update({
                      attachments: draft.attachments.filter(
                        (a) => a.id !== file.id,
                      ),
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="compose-error" role="alert">
            {error}
          </div>
        )}
        {formatting && (
          <div className="format-toolbar">
            <IconButton
              icon={Bold}
              label="Bold"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format("bold")}
            />
            <IconButton
              icon={Italic}
              label="Italic"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format("italic")}
            />
            <IconButton
              icon={Underline}
              label="Underline"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format("underline")}
            />
            <span className="toolbar-divider" />
            <IconButton
              icon={List}
              label="Bulleted list"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format("insertUnorderedList")}
            />
          </div>
        )}
        <footer className="compose-footer">
          <button className="primary-button send-button" onClick={send}>
            Send <ArrowUpRight size={17} />
          </button>
          <button
            className={`icon-button format-toggle ${formatting ? "active" : ""}`}
            aria-label="Formatting options"
            title="Formatting options"
            onClick={() => setFormatting(!formatting)}
          >
            A
          </button>
          <IconButton
            icon={Paperclip}
            label="Attach files"
            onClick={() => fileInput.current?.click()}
          />
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => void attach(e.target.files)}
          />
          <span className="draft-status" aria-live="polite">
            {saveError ? <X size={13} /> : <Check size={13} />}
            {saveError
              ? "Not saved — storage full"
              : saving
                ? "Saving…"
                : "Draft saved"}
          </span>
          <IconButton
            className="discard-button"
            icon={Trash2}
            label="Discard draft"
            onClick={onDiscard}
          />
        </footer>
        <div className="compose-local">
          <Send size={11} /> Sending locally as {ACCOUNT.email}
          <span>⌘ Enter</span>
        </div>
      </div>
    </section>
  );
}

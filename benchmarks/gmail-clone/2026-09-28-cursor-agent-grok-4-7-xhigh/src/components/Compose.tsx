import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { readLocalFiles } from "../files";
import {
  cx,
  formatBytes,
  formatFuture,
  isBlankHtml,
  isEmail,
  parseRecipientToken,
  schedulePresets,
  suggestPeople,
} from "../logic";
import { ME } from "../people";
import { sanitizeHtml } from "../sanitize";
import { useMail } from "../store";
import type { ComposeModel, Person } from "../types";
import { Icon } from "../icons";
import { Avatar } from "./bits";

function keepCaretAboveSignature(event: MouseEvent<HTMLDivElement>) {
  const editor = event.currentTarget;
  const slot = editor.querySelector<HTMLElement>("[data-slot]");
  if (!slot || slot.textContent?.replace(/\u00a0/g, " ").trim()) return;
  const selection = window.getSelection();
  const anchor = selection?.anchorNode;
  if (anchor && slot.contains(anchor)) return;
  const range = document.createRange();
  range.selectNodeContents(slot);
  range.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export function Compose({ compose }: { compose: ComposeModel }) {
  const { state, dispatch, people } = useMail();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const live = useRef(compose);
  const skipSave = useRef(false);
  const initialSig = useRef("");
  live.current = compose;
  if (!initialSig.current) initialSig.current = snapshot(compose);
  const [toText, setToText] = useState("");
  const [ccText, setCcText] = useState("");
  const [bccText, setBccText] = useState("");
  const [error, setError] = useState("");
  const [askSubject, setAskSubject] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("https://");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const thread = state.threads.find((item) => item.id === compose.threadId);
  const signature = state.settings.signature;

  function patch(partial: Partial<ComposeModel>) {
    dispatch({ type: "composePatch", id: compose.id, patch: partial });
  }

  function persist(current: ComposeModel) {
    if (skipSave.current) return;
    const withBody = { ...current, body: editorRef.current?.innerHTML || current.body };
    const blank =
      isBlankHtml(withBody.body, signature) &&
      !withBody.subject.trim() &&
      withBody.to.length === 0 &&
      withBody.cc.length === 0 &&
      withBody.bcc.length === 0 &&
      withBody.attachments.length === 0;
    if (blank && !withBody.threadId) return;
    if (snapshot(withBody) === initialSig.current) return;
    dispatch({ type: "draftSync", compose: withBody, now: Date.now() });
  }

  useEffect(() => {
    const id = window.setTimeout(() => persist(live.current), 500);
    return () => window.clearTimeout(id);
    // persist identity is stable enough for this draft timer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compose.to, compose.cc, compose.bcc, compose.subject, compose.body, compose.attachments, compose.threadId]);

  useEffect(() => {
    return () => persist(live.current);
    // save the latest draft when the window closes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (compose.placement !== "inline") return;
    const node = editorRef.current;
    if (!node) return;
    node.focus();
    const range = document.createRange();
    range.setStart(node, 0);
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [compose.placement, compose.id]);

  function syncBody() {
    if (editorRef.current) patch({ body: editorRef.current.innerHTML });
  }

  function command(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncBody();
  }

  async function addFiles(files: File[]) {
    const { ok, skipped } = await readLocalFiles(files);
    if (skipped.length) setError(`${skipped.join(", ")} is over 400 KB for this local mailbox.`);
    if (ok.length) patch({ attachments: [...compose.attachments, ...ok] });
  }

  function commitToken(field: "to" | "cc" | "bcc", raw: string) {
    const token = raw.trim();
    if (!token) return true;
    const person = parseRecipientToken(token, people);
    if (!person) {
      setError(`"${token}" is not a recipient.`);
      return false;
    }
    const current = compose[field];
    if (!current.some((item) => item.email.toLowerCase() === person.email.toLowerCase())) patch({ [field]: [...current, person] });
    if (field === "to") setToText("");
    if (field === "cc") setCcText("");
    if (field === "bcc") setBccText("");
    setError("");
    return true;
  }

  function gathered(): { to: Person[]; cc: Person[]; bcc: Person[] } | null {
    const to = mergePeople(compose.to, toText, people);
    const cc = mergePeople(compose.cc, ccText, people);
    const bcc = mergePeople(compose.bcc, bccText, people);
    if (!to || !cc || !bcc) {
      setError("One of the recipients could not be read. Use a name or an email address.");
      return null;
    }
    return { to, cc, bcc };
  }

  function send(when: number | null) {
    setError("");
    const peopleFields = gathered();
    if (!peopleFields || peopleFields.to.length === 0) {
      setError("Add at least one recipient.");
      return;
    }
    const body = sanitizeHtml(editorRef.current?.innerHTML || compose.body);
    const subject = compose.subject.trim();
    if (!subject && !askSubject) {
      setAskSubject(true);
      return;
    }
    skipSave.current = true;
    dispatch({
      type: "send",
      composeId: compose.id,
      input: {
        threadId: compose.threadId,
        to: peopleFields.to,
        cc: peopleFields.cc,
        bcc: peopleFields.bcc,
        subject,
        body,
        attachments: compose.attachments,
        when,
        now: Date.now(),
        me: ME,
      },
    });
  }

  const floats = state.composes.filter((item) => item.placement === "float");
  let right = 16;
  if (compose.placement === "float" && !compose.maximized) {
    for (let i = floats.length - 1; i >= 0; i -= 1) {
      const item = floats[i];
      if (item.id === compose.id) break;
      if (!item.maximized) right += (item.minimized ? 276 : 572);
    }
  }

  const title =
    compose.mode === "forward" ? compose.subject || "Forward" : compose.subject.trim() || (compose.mode === "new" ? "New message" : "Reply");

  return (
    <section
      className={cx(
        "compose",
        compose.placement,
        compose.minimized && "min",
        compose.maximized && "max",
        dragging && "drag",
      )}
      style={compose.placement === "float" && !compose.maximized ? { right } : undefined}
      data-testid={compose.placement === "float" ? "compose-window" : "compose-inline"}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void addFiles([...event.dataTransfer.files]);
      }}
    >
      <header className="compose-head">
        <button type="button" className="head-title" onClick={() => compose.minimized && patch({ minimized: false })}>
          {title}
        </button>
        <button className="icon-btn tiny" type="button" aria-label="Minimize" onClick={() => patch({ minimized: !compose.minimized, maximized: false })}>
          <Icon name="minimize" size={18} />
        </button>
        <button
          className="icon-btn tiny"
          type="button"
          aria-label={compose.maximized ? "Exit full screen" : "Full screen"}
          onClick={() => patch({ maximized: !compose.maximized, minimized: false })}
        >
          <Icon name={compose.maximized ? "compress" : "maximize"} size={18} />
        </button>
        <button
          className="icon-btn tiny"
          type="button"
          aria-label="Save and close"
          onClick={() => {
            persist(live.current);
            skipSave.current = true;
            dispatch({ type: "composeClose", id: compose.id });
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      {compose.minimized ? null : (
        <>
          {thread?.scheduledFor ? (
            <div className="sched-banner in-compose">
              <span>Scheduled for {formatFuture(thread.scheduledFor)}</span>
              <button type="button" onClick={() => thread && dispatch({ type: "cancelSchedule", id: thread.id })}>
                Cancel
              </button>
            </div>
          ) : null}
          <div className="compose-fields">
            <RecipientRow
              label="To"
              people={compose.to}
              text={toText}
              setText={setToText}
              suggestions={suggestPeople(toText, people, [...compose.to, ...compose.cc, ...compose.bcc])}
              onRemove={(email) => patch({ to: compose.to.filter((person) => person.email !== email) })}
              onPick={(person) => {
                patch({ to: [...compose.to, person] });
                setToText("");
              }}
              onCommit={() => commitToken("to", toText)}
              trailing={
                <span className="cc-links">
                  {!compose.showCc ? (
                    <button type="button" onClick={() => patch({ showCc: true })}>
                      Cc
                    </button>
                  ) : null}
                  {!compose.showBcc ? (
                    <button type="button" onClick={() => patch({ showBcc: true })}>
                      Bcc
                    </button>
                  ) : null}
                </span>
              }
              testid="to-input"
              autoFocus={compose.mode === "new" || compose.mode === "forward"}
            />
            {compose.showCc ? (
              <RecipientRow
                label="Cc"
                people={compose.cc}
                text={ccText}
                setText={setCcText}
                suggestions={suggestPeople(ccText, people, [...compose.to, ...compose.cc, ...compose.bcc])}
                onRemove={(email) => patch({ cc: compose.cc.filter((person) => person.email !== email) })}
                onPick={(person) => {
                  patch({ cc: [...compose.cc, person] });
                  setCcText("");
                }}
                onCommit={() => commitToken("cc", ccText)}
              />
            ) : null}
            {compose.showBcc ? (
              <RecipientRow
                label="Bcc"
                people={compose.bcc}
                text={bccText}
                setText={setBccText}
                suggestions={suggestPeople(bccText, people, [...compose.to, ...compose.cc, ...compose.bcc])}
                onRemove={(email) => patch({ bcc: compose.bcc.filter((person) => person.email !== email) })}
                onPick={(person) => {
                  patch({ bcc: [...compose.bcc, person] });
                  setBccText("");
                }}
                onCommit={() => commitToken("bcc", bccText)}
              />
            ) : null}
            <label className="subject-row">
              <input
                data-testid="subject-input"
                placeholder="Subject"
                value={compose.subject}
                onChange={(event) => patch({ subject: event.target.value })}
              />
            </label>
          </div>
          <div
            className="editor"
            data-testid="editor"
            ref={(node) => {
              if (node && node.dataset.ready !== "1") {
                node.innerHTML = compose.body || "";
                node.dataset.ready = "1";
              }
              editorRef.current = node;
            }}
            contentEditable
            role="textbox"
            aria-label="Message body"
            onInput={syncBody}
            onClick={keepCaretAboveSignature}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                event.preventDefault();
                send(null);
              }
            }}
          />
          {compose.attachments.length ? (
            <div className="attach-row compose-files">
              {compose.attachments.map((file) => (
                <span key={file.id} className="attach">
                  <Icon name="file" size={18} />
                  <span>
                    <strong>{file.filename}</strong>
                    <small>{formatBytes(file.size)}</small>
                  </span>
                  <button type="button" aria-label="Remove attachment" onClick={() => patch({ attachments: compose.attachments.filter((item) => item.id !== file.id) })}>
                    <Icon name="close" size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {error ? <p className="compose-error">{error}</p> : null}
          {askSubject ? (
            <div className="compose-confirm">
              <span>Send this without a subject?</span>
              <button type="button" onClick={() => send(null)}>
                Send
              </button>
              <button type="button" onClick={() => setAskSubject(false)}>
                Cancel
              </button>
            </div>
          ) : null}
          <footer className="compose-bar">
            <div className="send-split">
              <button className="send-btn" type="button" data-testid="send-button" onClick={() => send(null)}>
                Send
              </button>
              <button className="send-caret" type="button" aria-label="Schedule send" onClick={() => setScheduleOpen((v) => !v)}>
                <Icon name="chevronDown" size={18} />
              </button>
              {scheduleOpen ? (
                <div className="menu schedule-menu">
                  {schedulePresets().map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="menu-item stack"
                      onClick={() => {
                        setScheduleOpen(false);
                        send(preset.until);
                      }}
                    >
                      <span>{preset.label}</span>
                      <small>{preset.hint}</small>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="format-bar">
              <button type="button" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => command("bold")}>
                <Icon name="bold" size={18} />
              </button>
              <button type="button" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => command("italic")}>
                <Icon name="italic" size={18} />
              </button>
              <button type="button" aria-label="List" onMouseDown={(event) => event.preventDefault()} onClick={() => command("insertUnorderedList")}>
                <Icon name="list" size={18} />
              </button>
              <button type="button" aria-label="Link" onMouseDown={(event) => event.preventDefault()} onClick={() => setLinkOpen((v) => !v)}>
                <Icon name="link" size={18} />
              </button>
              {linkOpen ? (
                <form
                  className="link-pop"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (isEmail(linkUrl) || /^https?:\/\//i.test(linkUrl) || linkUrl.startsWith("mailto:")) command("createLink", linkUrl);
                    setLinkOpen(false);
                  }}
                >
                  <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} aria-label="Link URL" />
                  <button type="submit">Add</button>
                </form>
              ) : null}
            </div>
            <button className="icon-btn" type="button" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
              <Icon name="attach" />
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              hidden
              onChange={(event) => {
                void addFiles([...(event.target.files ?? [])]);
                event.target.value = "";
              }}
            />
            {compose.placement === "inline" ? (
              <button
                className="icon-btn"
                type="button"
                aria-label="Pop out"
                onClick={() => patch({ placement: "float", minimized: false })}
              >
                <Icon name="maximize" />
              </button>
            ) : null}
            <span className="spacer" />
            <button
              className="icon-btn"
              type="button"
              aria-label="Discard draft"
              onClick={() => {
                skipSave.current = true;
                if (compose.threadId) dispatch({ type: "discardDraft", threadId: compose.threadId });
                else dispatch({ type: "composeClose", id: compose.id });
              }}
            >
              <Icon name="trash" />
            </button>
          </footer>
        </>
      )}
    </section>
  );
}

function snapshot(compose: ComposeModel): string {
  return JSON.stringify({
    to: compose.to.map((person) => person.email),
    cc: compose.cc.map((person) => person.email),
    bcc: compose.bcc.map((person) => person.email),
    subject: compose.subject,
    body: compose.body,
    files: compose.attachments.map((file) => file.id),
  });
}

function mergePeople(current: Person[], text: string, directory: Person[]): Person[] | null {
  const token = text.trim();
  if (!token) return current;
  const person = parseRecipientToken(token, directory);
  if (!person) return null;
  if (current.some((item) => item.email.toLowerCase() === person.email.toLowerCase())) return current;
  return [...current, person];
}

function RecipientRow({
  label,
  people,
  text,
  setText,
  suggestions,
  onRemove,
  onPick,
  onCommit,
  trailing,
  testid,
  autoFocus,
}: {
  label: string;
  people: Person[];
  text: string;
  setText: (value: string) => void;
  suggestions: Person[];
  onRemove: (email: string) => void;
  onPick: (person: Person) => void;
  onCommit: () => void;
  trailing?: ReactNode;
  testid?: string;
  autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="recipient-row">
      <span>{label}</span>
      <div className="recipient-box">
        {people.map((person) => (
          <span key={person.email} className="person-chip">
            <Avatar person={person} size={20} />
            {person.name}
            <button type="button" aria-label={`Remove ${person.name}`} onClick={() => onRemove(person.email)}>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          data-testid={testid}
          value={text}
          autoFocus={autoFocus}
          placeholder={people.length ? "" : "Recipients"}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            onCommit();
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === "," || event.key === "Tab") {
              if (text.trim()) {
                event.preventDefault();
                onCommit();
              }
            } else if (event.key === "Backspace" && !text && people.length) {
              onRemove(people[people.length - 1].email);
            }
          }}
        />
        {open && text.trim() && suggestions.length ? (
          <div className="suggest recipient-suggest">
            {suggestions.map((person) => (
              <button
                key={person.email}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onPick(person)}
              >
                <Avatar person={person} size={28} />
                <span>
                  <strong>{person.name}</strong>
                  <small>{person.email}</small>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {trailing}
    </div>
  );
}

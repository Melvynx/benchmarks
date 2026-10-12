import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Icon, IconButton } from './kit';
import { MenuItem, MenuSeparator, MenuTitle, Popover, useAnchor } from './Popover';
import { useMail } from '../lib/store';
import { flushPersist, getState } from '../lib/store';
import { closeCompose, confirmDialog, openDialog, toast, updateCompose, useUI, type ComposeWin } from '../lib/ui';
import { useViewModel } from '../lib/viewModel';
import { discardDraft, getContactSuggestions, saveDraft, sendDraft, type DraftInput } from '../lib/actions';
import { formatAddress, isValidEmail, parseAddress, uid } from '../lib/mail';
import { escapeHtml } from '../lib/md';
import { isEmptyHtml } from '../lib/sanitize';
import { formatSize, mimeFromName, fileKind, FILE_KIND_META } from '../lib/files';
import { formatWhen, scheduleSendPresets } from '../lib/dates';
import { useViewport } from '../lib/hooks';
import type { Address, Attachment } from '../lib/types';

/* ------------------------------------------------------------------ */
/* Recipient field                                                     */
/* ------------------------------------------------------------------ */

interface RecipientHandle {
  /** Turns any half-typed text into a chip and returns the final list. */
  commit: () => Address[];
  focus: () => void;
}

const RecipientField = forwardRef<
  RecipientHandle,
  { label: string; value: Address[]; onChange: (v: Address[]) => void; autoFocus?: boolean; compact?: boolean; extra?: React.ReactNode }
>(function RecipientField({ label, value, onChange, autoFocus, extra }, ref) {
  const mail = useMail();
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const textRef = useRef(text);
  textRef.current = text;

  const suggestions = useMemo(() => (focused && text.trim() ? getContactSuggestions(mail, text, value, 6) : []), [focused, text, mail, value]);
  useEffect(() => setActive(0), [text]);

  const addRaw = useCallback(
    (raw: string): Address[] => {
      const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
      let list = valueRef.current;
      for (const p of parts) {
        const parsed = parseAddress(p) ?? { name: '', email: p };
        if (!list.some((a) => a.email.toLowerCase() === parsed.email.toLowerCase())) {
          const known = getState().contacts.find((c) => c.email.toLowerCase() === parsed.email.toLowerCase());
          list = [...list, known && !parsed.name ? { name: known.name, email: known.email } : parsed];
        }
      }
      valueRef.current = list;
      onChange(list);
      return list;
    },
    [onChange],
  );

  const commit = useCallback((): Address[] => {
    const t = textRef.current.trim();
    if (!t) return valueRef.current;
    setText('');
    textRef.current = '';
    return addRaw(t);
  }, [addRaw]);

  useImperativeHandle(ref, () => ({ commit, focus: () => input.current?.focus() }), [commit]);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  const choose = (a: Address) => {
    setText('');
    textRef.current = '';
    valueRef.current = [...valueRef.current, a];
    onChange(valueRef.current);
    input.current?.focus();
  };

  return (
    <div className="rcpt-row">
      <label className="rcpt-label" htmlFor={`rcpt-${label}`} onClick={() => input.current?.focus()}>
        {label}
      </label>
      <div ref={box} className={`rcpt-box${focused ? ' focused' : ''}`} onClick={() => input.current?.focus()}>
        {value.map((a, i) => {
          const valid = isValidEmail(a.email);
          return (
            <span
              key={a.email + i}
              className={`rcpt-chip${valid ? '' : ' invalid'}`}
              title={valid ? a.email : `“${a.email}” is not a valid email address`}
              onDoubleClick={() => {
                onChange(value.filter((_, j) => j !== i));
                setText(a.name ? formatAddress(a) : a.email);
                input.current?.focus();
              }}
            >
              {valid ? <Avatar name={a.name || a.email} email={a.email} size={20} /> : <Icon name="error" size="sm" />}
              <span className="rcpt-name">{a.name || a.email}</span>
              <button
                type="button"
                aria-label={`Remove ${a.name || a.email}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((_, j) => j !== i));
                }}
              >
                <Icon name="close" size="xs" />
              </button>
            </span>
          );
        })}
        <input
          ref={input}
          id={`rcpt-${label}`}
          className="rcpt-input"
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={suggestions.length > 0}
          autoComplete="off"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            const v = e.target.value;
            if (/[,;]$/.test(v)) {
              addRaw(v);
              setText('');
            } else setText(v);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (textRef.current.trim()) commit();
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              addRaw(t);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && suggestions.length) {
              e.preventDefault();
              setActive((i) => (i + 1) % suggestions.length);
            } else if (e.key === 'ArrowUp' && suggestions.length) {
              e.preventDefault();
              setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
              if (suggestions.length && text.trim()) {
                e.preventDefault();
                choose(suggestions[Math.min(active, suggestions.length - 1)]);
              } else if (text.trim()) {
                e.preventDefault();
                commit();
              }
            } else if (e.key === ' ' && isValidEmail(text.trim())) {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
      </div>
      {extra}
      {suggestions.length > 0 && (
        <Popover anchor={box.current} onClose={() => setFocused(false)} role="listbox" className="rcpt-suggest" autoFocus={false} keepOpenOn=".rcpt-box" style={{ minWidth: Math.min(360, box.current?.offsetWidth ?? 320) }}>
          {suggestions.map((s, i) => (
            <div
              key={s.email}
              role="option"
              aria-selected={i === active}
              className={`suggest-row${i === active ? ' active' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(s)}
            >
              <Avatar name={s.name} email={s.email} size={28} />
              <span className="suggest-primary">{s.name}</span>
              <span className="suggest-secondary">{s.email}</span>
            </div>
          ))}
        </Popover>
      )}
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

const EMOJI = ['😀', '😂', '🙂', '😉', '😍', '🥳', '😎', '🤔', '😅', '🙏', '👍', '👏', '🙌', '🎉', '🔥', '✨', '💡', '✅', '❤️', '💪', '👋', '🚀', '☕', '🍕', '📎', '📅', '⭐', '😴', '😬', '🤝', '💯', '🌟'];

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

interface EditorApi {
  focusStart: () => void;
  html: () => string;
  isEmpty: () => boolean;
  insertText: (t: string) => void;
  insertLink: (text: string, url: string) => void;
  saveSelection: () => void;
  restore: () => void;
  selectedText: () => string;
}

const Editor = forwardRef<
  EditorApi,
  { initialHtml: string; onInput: () => void; spellcheck: boolean; onSend: () => void; onLink: () => void; onFiles: (f: FileList | File[]) => void }
>(function Editor({ initialHtml, onInput, spellcheck, onSend, onLink, onFiles }, ref) {
  const el = useRef<HTMLDivElement>(null);
  const saved = useRef<Range | null>(null);

  useLayoutEffect(() => {
    if (el.current) el.current.innerHTML = initialHtml;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const on = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || !el.current?.contains(sel.anchorNode)) return;
      saved.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener('selectionchange', on);
    return () => document.removeEventListener('selectionchange', on);
  }, []);

  const restore = () => {
    el.current?.focus();
    const sel = window.getSelection();
    if (saved.current && sel) {
      sel.removeAllRanges();
      sel.addRange(saved.current);
    }
  };

  useImperativeHandle(
    ref,
    () => ({
      focusStart: () => {
        const e = el.current;
        if (!e) return;
        e.focus();
        const r = document.createRange();
        r.setStart(e, 0);
        r.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      },
      html: () => el.current?.innerHTML ?? '',
      isEmpty: () => {
        const clone = el.current?.cloneNode(true) as HTMLElement | undefined;
        if (!clone) return true;
        clone.querySelectorAll('.sig').forEach((n) => n.remove());
        return isEmptyHtml(clone.innerHTML);
      },
      insertText: (t: string) => {
        restore();
        exec('insertText', t);
        onInput();
      },
      insertLink: (text: string, url: string) => {
        restore();
        exec('insertHTML', `<a href="${escapeHtml(url)}">${escapeHtml(text || url)}</a>&nbsp;`);
        onInput();
      },
      saveSelection: () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount && el.current?.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange();
      },
      restore,
      selectedText: () => (saved.current ? saved.current.toString() : ''),
    }),
    [onInput], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
      <div
        ref={el}
        className="editor"
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        spellCheck={spellcheck}
        suppressContentEditableWarning
        onInput={onInput}
        onMouseDown={(e) => {
          // Clicking the blank area below the content should type above the signature, not inside it.
          const root = el.current;
          const sig = root?.querySelector('.sig');
          if (!root || !sig || e.target !== root) return;
          let prev = sig.previousElementSibling;
          if (prev && !prev.textContent && prev.previousElementSibling) prev = prev.previousElementSibling;
          if (!prev) return;
          e.preventDefault();
          root.focus();
          const range = document.createRange();
          range.selectNodeContents(prev);
          range.collapse(!prev.textContent);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onSend();
          } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            onLink();
          }
        }}
        onPaste={(e) => {
          const files = e.clipboardData.files;
          if (files && files.length) {
            e.preventDefault();
            onFiles(files);
            return;
          }
          const text = e.clipboardData.getData('text/plain');
          if (text) {
            e.preventDefault();
            exec('insertText', text);
          }
        }}
      />
  );
});

/* ------------------------------------------------------------------ */
/* Composer                                                            */
/* ------------------------------------------------------------------ */

const flushers = new Map<string, () => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    flushers.forEach((f) => f());
    flushPersist();
  });
}

function signatureHtml(): string {
  const s = getState().settings;
  if (!s.signatureEnabled || !s.signature.trim()) return '';
  return `<div><br></div><div class="sig">-- <br>${s.signature
    .split('\n')
    .map((l) => escapeHtml(l))
    .join('<br>')}</div>`;
}

function initialFor(win: ComposeWin) {
  const st = getState();
  const thread = st.threads[win.threadId];
  const draft = thread?.messages.find((m) => m.id === win.draftId && m.draft);
  const hasOthers = !!thread && thread.messages.some((m) => !m.draft);
  const baseSubject = thread?.subject ?? win.seed?.subject ?? '';
  const subject = draft
    ? hasOthers && !/^re:/i.test(baseSubject) ? `Re: ${baseSubject}` : baseSubject
    : win.seed?.subject ?? '';
  if (draft) {
    return { to: draft.to, cc: draft.cc, bcc: draft.bcc, subject, html: draft.html, quote: draft.quoteHtml, attachments: draft.attachments, existing: true };
  }
  const seed = win.seed ?? {};
  const body = (seed.html ?? '<div><br></div>') + signatureHtml();
  return { to: seed.to ?? [], cc: seed.cc ?? [], bcc: seed.bcc ?? [], subject, html: body, quote: seed.quoteHtml, attachments: seed.attachments ?? [], existing: false };
}

const MAX_FILE = 2 * 1024 * 1024;

export function Composer({ win, variant }: { win: ComposeWin; variant: 'window' | 'inline' }) {
  const vp = useViewport();
  const init = useMemo(() => initialFor(win), [win.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [to, setTo] = useState<Address[]>(init.to);
  const [cc, setCc] = useState<Address[]>(init.cc);
  const [bcc, setBcc] = useState<Address[]>(init.bcc);
  const [subject, setSubject] = useState(init.subject);
  const [attachments, setAttachments] = useState<Attachment[]>(init.attachments);
  const [showCc, setShowCc] = useState(init.cc.length > 0);
  const [showBcc, setShowBcc] = useState(init.bcc.length > 0);
  const [showFmt, setShowFmt] = useState(variant === 'window' && vp !== 'mobile');
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [editRcpt, setEditRcpt] = useState(variant === 'window' || init.to.length === 0);
  const [spell, setSpell] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(init.existing ? Date.now() : null);
  const [dragOver, setDragOver] = useState(false);
  const [dirtyTick, setDirtyTick] = useState(0);
  const dirty = useRef(false);
  const closed = useRef(false);
  const editor = useRef<EditorApi>(null);
  const toRef = useRef<RecipientHandle>(null);
  const ccRef = useRef<RecipientHandle>(null);
  const bccRef = useRef<RecipientHandle>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const sendMenu = useAnchor();
  const moreMenu = useAnchor();

  const live = useRef({ to, cc, bcc, subject, attachments });
  live.current = { to, cc, bcc, subject, attachments };

  const markDirty = useCallback(() => {
    dirty.current = true;
    setDirtyTick((n) => n + 1);
  }, []);

  const hasContent = () => {
    const l = live.current;
    if (l.attachments.length > 0 || !(editor.current?.isEmpty() ?? true)) return true;
    return win.mode === 'new' && (l.to.length > 0 || l.cc.length > 0 || l.bcc.length > 0 || l.subject.trim() !== '');
  };

  const buildInput = (recipients?: { to: Address[]; cc: Address[]; bcc: Address[] }): DraftInput => ({
    id: win.draftId,
    threadId: win.threadId,
    subject: live.current.subject,
    to: recipients?.to ?? live.current.to,
    cc: recipients?.cc ?? live.current.cc,
    bcc: recipients?.bcc ?? live.current.bcc,
    html: editor.current?.html() ?? '',
    quoteHtml: init.quote,
    attachments: live.current.attachments,
  });

  const saveNow = useCallback(() => {
    if (closed.current) return;
    if (!hasContent()) {
      if (getState().threads[win.threadId]?.messages.some((m) => m.id === win.draftId)) discardDraft(win.draftId, win.threadId, { silent: true });
      return;
    }
    saveDraft(buildInput());
    setSavedAt(Date.now());
  }, [win.draftId, win.threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave shortly after the last edit.
  useEffect(() => {
    if (!dirty.current) return;
    const id = setTimeout(saveNow, 1200);
    return () => clearTimeout(id);
  }, [dirtyTick, saveNow]);

  useEffect(() => {
    const f = () => {
      if (dirty.current) saveNow();
    };
    flushers.set(win.id, f);
    return () => {
      flushers.delete(win.id);
      // Moving between inline and floating layouts remounts the composer: keep the text.
      if (!closed.current && dirty.current) saveNow();
    };
  }, [win.id, saveNow]);

  // Focus: recipients for a blank message, otherwise the body.
  useEffect(() => {
    const t = setTimeout(() => {
      if (init.existing || init.to.length) editor.current?.focusStart();
      else toRef.current?.focus();
      if (variant === 'inline') root.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 30);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const attach = (files: FileList | File[]) => {
    const list = Array.from(files);
    for (const f of list) {
      if (f.size > MAX_FILE) {
        toast(`“${f.name}” is larger than 2 MB, the limit for this offline mailbox.`, { tone: 'error' });
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const att: Attachment = { id: uid('a'), name: f.name, size: f.size, mime: f.type || mimeFromName(f.name), dataUrl: String(reader.result) };
        setAttachments((cur) => [...cur, att]);
        markDirty();
      };
      reader.readAsDataURL(f);
    }
  };

  const close = () => {
    if (closed.current) return;
    if (dirty.current || !init.existing) {
      if (hasContent()) {
        saveNow();
        if (dirty.current) toast('Draft saved.', { duration: 2500 });
      } else saveNow();
    }
    closed.current = true;
    closeCompose(win.id);
  };

  const discard = () => {
    closed.current = true;
    const exists = getState().threads[win.threadId]?.messages.some((m) => m.id === win.draftId);
    if (exists) discardDraft(win.draftId, win.threadId);
    closeCompose(win.id);
  };

  const doSend = (scheduledAt?: number, skipChecks = false) => {
    const rec = {
      to: toRef.current?.commit() ?? live.current.to,
      cc: ccRef.current?.commit() ?? live.current.cc,
      bcc: bccRef.current?.commit() ?? live.current.bcc,
    };
    const all = [...rec.to, ...rec.cc, ...rec.bcc];
    if (!all.length) {
      setEditRcpt(true);
      openDialog({ kind: 'alert', title: 'Error', body: 'Please specify at least one recipient.' });
      return;
    }
    const bad = all.find((a) => !isValidEmail(a.email));
    if (bad) {
      setEditRcpt(true);
      openDialog({ kind: 'alert', title: 'Error', body: `The address “${bad.email}” in the recipients field is not recognized. Please make sure that all addresses are properly formed.` });
      return;
    }
    if (!skipChecks) {
      const bodyEmpty = editor.current?.isEmpty() ?? true;
      const text = (editor.current?.html() ?? '').replace(/<[^>]+>/g, ' ').toLowerCase();
      if (!live.current.subject.trim() && bodyEmpty) {
        confirmDialog({ title: 'Send this message without a subject or text in the body?', body: 'Sending an empty message is usually a mistake.', confirmLabel: 'Send anyway' }, () => doSend(scheduledAt, true));
        return;
      }
      if (/\battach(ed|ment|ments|ing)\b/.test(text) && live.current.attachments.length === 0) {
        confirmDialog({ title: 'Did you forget to attach a file?', body: 'You wrote “attached” in your message, but there are no attachments.', confirmLabel: 'Send anyway' }, () => doSend(scheduledAt, true));
        return;
      }
    }
    closed.current = true;
    sendDraft(buildInput(rec), { scheduledAt });
    closeCompose(win.id);
  };

  const onLink = () => {
    editor.current?.saveSelection();
    openDialog({
      kind: 'link',
      initialText: editor.current?.selectedText() ?? '',
      onInsert: (text, url) => editor.current?.insertLink(text, url),
    });
  };

  const title = subject.trim() || (win.mode === 'new' ? 'New Message' : win.mode === 'forward' ? 'Forward' : 'Reply');
  const presets = scheduleSendPresets(Date.now());
  const rootKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && variant === 'window' && !e.defaultPrevented) {
      e.stopPropagation();
      close();
    }
  };

  const recipientSummary = to.length ? to.map((a) => a.name || a.email).join(', ') : 'Recipients';
  const ccBccLinks = (
    <span className="rcpt-toggles">
      {!showCc && (
        <button type="button" className="link-btn" onClick={() => setShowCc(true)}>
          Cc
        </button>
      )}
      {!showBcc && (
        <button type="button" className="link-btn" onClick={() => setShowBcc(true)}>
          Bcc
        </button>
      )}
    </span>
  );

  const fields = (
    <div className="compose-fields">
      <RecipientField ref={toRef} label="To" value={to} onChange={(v) => { setTo(v); markDirty(); }} autoFocus={false} extra={ccBccLinks} />
      {showCc && <RecipientField ref={ccRef} label="Cc" value={cc} onChange={(v) => { setCc(v); markDirty(); }} />}
      {showBcc && <RecipientField ref={bccRef} label="Bcc" value={bcc} onChange={(v) => { setBcc(v); markDirty(); }} />}
      {variant === 'window' && (
        <div className="subject-row">
          <input
            className="subject-input"
            placeholder="Subject"
            aria-label="Subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              markDirty();
            }}
          />
        </div>
      )}
    </div>
  );

  const footer = (
    <div className="compose-foot">
      <div className="send-split">
        <button type="button" className="send-btn" onClick={() => doSend()} data-tip="Send (Ctrl+Enter)">
          Send
        </button>
        <button type="button" className="send-caret" aria-label="More send options" aria-expanded={sendMenu.open} onClick={sendMenu.toggle}>
          <Icon name="arrow_drop_down" />
        </button>
      </div>
      <div className="foot-tools">
        <IconButton small icon="text_format" label="Formatting options" active={showFmt} onClick={() => setShowFmt((v) => !v)} />
        <IconButton small icon="attach_file" label="Attach files" onClick={() => fileInput.current?.click()} />
        <IconButton small icon="link" label="Insert link (Ctrl+K)" onClick={onLink} />
        <IconButton small icon="more_vert" label="More options" onClick={moreMenu.toggle} active={moreMenu.open} />
      </div>
      <span className="tb-spacer" />
      {savedAt && <span className="saved-note">Saved</span>}
      <IconButton small icon="delete" label="Discard draft" onClick={discard} />
    </div>
  );

  const sendMenus = (
    <>
      {sendMenu.open && (
        <Popover anchor={sendMenu.el} onClose={sendMenu.close} side="top">
          <MenuTitle>Schedule send</MenuTitle>
          {presets.map((p) => (
            <MenuItem key={p.id} label={p.label} hint={formatWhen(p.ts).replace(/^Tomorrow, /, '')} onClick={() => doSend(p.ts)} />
          ))}
          <MenuSeparator />
          <MenuItem icon="calendar_month" label="Pick date & time" onClick={() => openDialog({ kind: 'schedule', onPick: (ts) => doSend(ts) })} />
        </Popover>
      )}
      {moreMenu.open && (
        <Popover anchor={moreMenu.el} onClose={moreMenu.close} side="top">
          <MenuItem icon="spellcheck" label="Check spelling" checked={spell} onClick={() => setSpell((v) => !v)} />
          {init.quote && <MenuItem icon="more_horiz" label={quoteOpen ? 'Hide quoted text' : 'Show quoted text'} onClick={() => setQuoteOpen((v) => !v)} />}
          {variant === 'inline' && <MenuItem icon="open_in_new" label="Pop out reply" onClick={() => updateCompose(win.id, { popped: true })} />}
          <MenuItem icon="delete" label="Discard draft" onClick={discard} />
        </Popover>
      )}
    </>
  );

  const body = (
    <>
      <div className="compose-body">
        <Editor
          ref={editor}
          initialHtml={init.html}
          onInput={markDirty}
          spellcheck={spell}
          onSend={() => doSend()}
          onLink={onLink}
          onFiles={attach}
        />
        {init.quote && (
          <div className="compose-quote">
            <button type="button" className="quote-toggle" aria-expanded={quoteOpen} aria-label="Show trimmed content" data-tip="Show trimmed content" onClick={() => setQuoteOpen((v) => !v)}>
              <Icon name="more_horiz" size="sm" />
            </button>
            {quoteOpen && <div className="quote-html" dangerouslySetInnerHTML={{ __html: init.quote }} />}
          </div>
        )}
        {attachments.length > 0 && (
          <div className="compose-atts">
            {attachments.map((a) => {
              const meta = FILE_KIND_META[fileKind(a.mime, a.name)];
              return (
                <span key={a.id} className="att-pill">
                  <Icon name={meta.icon} size="sm" className="att-pill-icon" style={{ color: meta.color }} />
                  <span className="att-pill-name">{a.name}</span>
                  <span className="att-pill-size">({formatSize(a.size)})</span>
                  <button
                    type="button"
                    aria-label={`Remove attachment ${a.name}`}
                    onClick={() => {
                      setAttachments((cur) => cur.filter((x) => x.id !== a.id));
                      markDirty();
                    }}
                  >
                    <Icon name="close" size="xs" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
      {showFmt && <FormatToolbar editor={editor} onInput={markDirty} onLink={onLink} />}
    </>
  );

  if (variant === 'inline') {
    return (
      <div
        ref={root}
        className={`inline-composer${dragOver ? ' drag' : ''}`}
        onKeyDown={rootKey}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('Files')) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) attach(e.dataTransfer.files);
        }}
      >
        <div className="ic-head">
          <Icon name={win.mode === 'forward' ? 'forward' : win.mode === 'replyAll' ? 'reply_all' : 'reply'} />
          {editRcpt ? (
            <div className="ic-fields">{fields}</div>
          ) : (
            <button type="button" className="ic-to" onClick={() => setEditRcpt(true)} aria-label="Edit recipients">
              <span className="ic-to-name">{recipientSummary}</span>
              <Icon name="arrow_drop_down" size="sm" />
            </button>
          )}
          <span className="tb-spacer" />
          <IconButton small icon="open_in_new" label="Pop out reply" onClick={() => updateCompose(win.id, { popped: true })} />
        </div>
        {body}
        {footer}
        {sendMenus}
        <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && attach(e.target.files)} />
      </div>
    );
  }

  const mobile = vp === 'mobile';
  return (
    <div
      ref={root}
      className={`compose-win${win.minimized ? ' minimized' : ''}${win.maximized ? ' maximized' : ''}${dragOver ? ' drag' : ''}`}
      role="dialog"
      aria-label={title}
      onKeyDown={rootKey}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) attach(e.dataTransfer.files);
      }}
    >
      {mobile ? (
        <div className="compose-head mobile">
          <IconButton icon="arrow_back" label="Save draft and close" onClick={close} />
          <span className="compose-title">{title}</span>
          <IconButton icon="attach_file" label="Attach files" onClick={() => fileInput.current?.click()} />
          <IconButton icon="send" label="Send" onClick={() => doSend()} className="send-icon" />
          <IconButton icon="more_vert" label="More options" onClick={sendMenu.toggle} active={sendMenu.open} />
        </div>
      ) : (
        <div className="compose-head" onClick={() => win.minimized && updateCompose(win.id, { minimized: false })}>
          <button type="button" className="compose-title" onClick={() => !win.minimized && updateCompose(win.id, { minimized: true })} aria-label={win.minimized ? 'Restore' : 'Minimize'}>
            {title}
          </button>
          <span className="compose-ctrl">
            <IconButton small icon={win.minimized ? 'open_in_full' : 'minimize'} label={win.minimized ? 'Restore' : 'Minimize'} onClick={(e) => { e.stopPropagation(); updateCompose(win.id, { minimized: !win.minimized }); }} />
            {!win.minimized && <IconButton small icon={win.maximized ? 'close_fullscreen' : 'open_in_full'} label={win.maximized ? 'Exit full screen' : 'Full screen'} onClick={(e) => { e.stopPropagation(); updateCompose(win.id, { maximized: !win.maximized }); }} />}
            <IconButton small icon="close" label="Save & close" onClick={(e) => { e.stopPropagation(); close(); }} />
          </span>
        </div>
      )}
      {!win.minimized && (
        <>
          {fields}
          {body}
          {mobile ? null : footer}
          {mobile && sendMenu.open && (
            <Popover anchor={sendMenu.el} onClose={sendMenu.close} align="end">
              <MenuTitle>Schedule send</MenuTitle>
              {presets.map((p) => (
                <MenuItem key={p.id} label={p.label} onClick={() => doSend(p.ts)} />
              ))}
              <MenuItem icon="calendar_month" label="Pick date & time" onClick={() => openDialog({ kind: 'schedule', onPick: (ts) => doSend(ts) })} />
              <MenuSeparator />
              <MenuItem icon="text_format" label="Formatting options" checked={showFmt} onClick={() => setShowFmt((v) => !v)} />
              <MenuItem icon="delete" label="Discard draft" onClick={discard} />
            </Popover>
          )}
          {!mobile && sendMenus}
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => e.target.files && attach(e.target.files)} />
        </>
      )}
    </div>
  );
}

function B({ icon, label, on, act }: { icon: string; label: string; on?: boolean; act: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button type="button" className={`fmt-btn${on ? ' on' : ''}`} aria-label={label} aria-pressed={on} data-tip={label} onMouseDown={(e) => e.preventDefault()} onClick={act}>
      <Icon name={icon} size="sm" />
    </button>
  );
}

function FormatToolbar({ editor, onInput, onLink }: { editor: React.RefObject<EditorApi | null>; onInput: () => void; onLink: () => void }) {
  const size = useAnchor();
  const color = useAnchor();
  const emoji = useAnchor();
  const [state, setState] = useState({ b: false, i: false, u: false });
  useEffect(() => {
    const on = () => setState({ b: document.queryCommandState('bold'), i: document.queryCommandState('italic'), u: document.queryCommandState('underline') });
    document.addEventListener('selectionchange', on);
    return () => document.removeEventListener('selectionchange', on);
  }, []);
  const run = (c: string, v?: string) => () => {
    editor.current?.restore();
    exec(c, v);
    onInput();
  };
  return (
    <div className="fmt-bar" role="toolbar" aria-label="Formatting options">
      <B icon="undo" label="Undo" act={run('undo')} />
      <B icon="redo" label="Redo" act={run('redo')} />
      <span className="fmt-sep" />
      <button type="button" className="fmt-btn wide" aria-label="Font size" data-tip="Font size" onMouseDown={(e) => e.preventDefault()} onClick={size.toggle}>
        <Icon name="format_size" size="sm" />
        <Icon name="arrow_drop_down" size="sm" />
      </button>
      <B icon="format_bold" label="Bold (Ctrl+B)" on={state.b} act={run('bold')} />
      <B icon="format_italic" label="Italic (Ctrl+I)" on={state.i} act={run('italic')} />
      <B icon="format_underlined" label="Underline (Ctrl+U)" on={state.u} act={run('underline')} />
      <button type="button" className="fmt-btn wide" aria-label="Text color" data-tip="Text color" onMouseDown={(e) => e.preventDefault()} onClick={color.toggle}>
        <Icon name="format_color_text" size="sm" />
        <Icon name="arrow_drop_down" size="sm" />
      </button>
      <span className="fmt-sep" />
      <B icon="format_list_numbered" label="Numbered list" act={run('insertOrderedList')} />
      <B icon="format_list_bulleted" label="Bulleted list" act={run('insertUnorderedList')} />
      <B icon="format_indent_decrease" label="Decrease indent" act={run('outdent')} />
      <B icon="format_indent_increase" label="Increase indent" act={run('indent')} />
      <B icon="format_quote" label="Quote" act={run('formatBlock', 'blockquote')} />
      <span className="fmt-sep" />
      <B icon="link" label="Insert link (Ctrl+K)" act={onLink} />
      <B icon="mood" label="Insert emoji" act={emoji.toggle} />
      <B icon="format_clear" label="Remove formatting" act={run('removeFormat')} />
      {size.open && (
        <Popover anchor={size.el} onClose={size.close} side="top">
          {[
            ['Small', '2'],
            ['Normal', '3'],
            ['Large', '5'],
            ['Huge', '6'],
          ].map(([l, v]) => (
            <MenuItem key={v} label={l} onClick={run('fontSize', v)} />
          ))}
        </Popover>
      )}
      {color.open && (
        <Popover anchor={color.el} onClose={color.close} role="dialog" side="top" className="color-pop">
          <div className="color-grid">
            {['#000000', '#5f6368', '#d93025', '#e8710a', '#f9ab00', '#188038', '#1a73e8', '#a142f4', '#e52592', '#12a4af'].map((c) => (
              <button key={c} type="button" className="color-swatch" style={{ background: c }} aria-label={`Text color ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { run('foreColor', c)(); color.close(); }} />
            ))}
          </div>
        </Popover>
      )}
      {emoji.open && (
        <Popover anchor={emoji.el} onClose={emoji.close} role="dialog" className="emoji-pop" side="top">
          <div className="emoji-grid">
            {EMOJI.map((e) => (
              <button key={e} type="button" className="emoji-btn" aria-label={`Insert ${e}`} onMouseDown={(ev) => ev.preventDefault()} onClick={() => { editor.current?.insertText(e); emoji.close(); }}>
                {e}
              </button>
            ))}
          </div>
        </Popover>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Floating windows                                                    */
/* ------------------------------------------------------------------ */

export function ComposeHost() {
  const ui = useUI();
  const vm = useViewModel();
  const vp = useViewport();
  const inlineThread = vm.page === 'mail' ? vm.threadId : undefined;
  let wins = ui.composes.filter((w) => !((w.mode === 'reply' || w.mode === 'replyAll') && !w.popped && w.threadId === inlineThread));
  if (vp === 'mobile' && wins.length) wins = [wins[wins.length - 1]];
  const maximized = wins.some((w) => w.maximized && !w.minimized);
  if (!wins.length) return null;
  return (
    <>
      {maximized && <div className="compose-scrim" aria-hidden="true" />}
      <div className={`compose-dock${vp === 'mobile' ? ' mobile' : ''}`}>
        {[...wins].reverse().map((w) => (
          <Composer key={w.id} win={w} variant="window" />
        ))}
      </div>
    </>
  );
}


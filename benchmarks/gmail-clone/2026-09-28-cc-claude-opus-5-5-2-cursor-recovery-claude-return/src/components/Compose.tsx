import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import {
  MdArrowBack, MdArrowDropDown, MdAttachFile, MdClose, MdCloseFullscreen, MdFormatAlignCenter, MdFormatAlignLeft,
  MdFormatAlignRight, MdFormatBold, MdFormatClear, MdFormatColorText, MdFormatIndentDecrease, MdFormatIndentIncrease,
  MdFormatItalic, MdFormatListBulleted, MdFormatListNumbered, MdFormatQuote, MdFormatSize, MdFormatStrikethrough,
  MdFormatUnderlined, MdInsertLink, MdMinimize, MdMoreVert, MdOpenInFull, MdOutlineDelete, MdOutlineEmojiEmotions,
  MdOutlineScheduleSend, MdRedo, MdReply, MdReplyAll, MdForward, MdSend, MdTextFormat, MdUndo, MdOpenInNew,
  MdOutlineCalendarToday,
} from 'react-icons/md';
import { ME } from '../data/seed';
import type { Attachment, Contact } from '../data/types';
import { useIsMobile } from '../hooks';
import { discardDraft, schedulePresets, scheduleSend, sendWithUndo, startReply } from '../lib/actions';
import { displayName, escapeHtml, fileSize, htmlToText, isValidEmail, kindFromName, parseAddress, scheduleLabel, uid } from '../lib/format';
import { sanitizeHtml } from '../lib/sanitize';
import { useMail } from '../store/mail';
import { isDraftEmpty, knownContacts, stripSignature } from '../store/selectors';
import { useUI, type ComposeWin } from '../store/ui';
import { AttachmentIcon } from './attachments';
import { DateTimeDialog } from './menus';
import { Avatar, Dialog, IconButton, Menu, MenuDivider, MenuItem, Popover, useAnchor } from './primitives';

const MAX_INLINE_BYTES = 1.5 * 1024 * 1024;

/* ---------------- Dock ---------------- */

export function ComposeDock() {
  const composes = useUI((s) => s.composes);
  const drafts = useMail((s) => s.drafts);
  const mobile = useIsMobile();
  const live = composes.filter((c) => drafts[c.draftId] && !drafts[c.draftId].outgoing && !drafts[c.draftId].scheduledAt);

  useEffect(() => {
    const stale = composes.filter((c) => !live.includes(c));
    if (stale.length) useUI.getState().set({ composes: live });
  }, [composes, live]);

  if (!live.length) return null;
  if (mobile) {
    const top = [...live].reverse().find((c) => !c.minimized) ?? live[live.length - 1];
    return <ComposeWindow key={top.id} win={top} mobile />;
  }
  const maximized = live.find((c) => c.maximized && !c.minimized);
  return (
    <>
      {maximized && <div className="compose-scrim" onClick={() => useUI.getState().patchCompose(maximized.id, { maximized: false })} />}
      <div className="compose-dock" aria-label="Compose windows">
        {[...live].reverse().map((c) => (
          <ComposeWindow key={c.id} win={c} />
        ))}
      </div>
    </>
  );
}

function ComposeWindow({ win, mobile }: { win: ComposeWin; mobile?: boolean }) {
  const draft = useMail((s) => s.drafts[win.draftId]);
  const signature = useMail((s) => s.settings.signature);
  if (!draft) return null;
  const title = draft.subject.trim() || (draft.mode === 'forward' ? 'Forward' : draft.mode === 'new' ? 'New Message' : 'Reply');
  const ui = useUI.getState;
  const close = () => {
    const d = useMail.getState().drafts[win.draftId];
    ui().closeCompose(win.id);
    if (d && isDraftEmpty(d, signature)) useMail.getState().deleteDraft(d.id);
    else if (d) ui().showToast('Draft saved.', [{ label: 'Open', run: () => useUI.getState().openCompose(d.id) }], 4000);
  };

  if (mobile) {
    return (
      <div className="compose compose-mobile" role="dialog" aria-label={title}>
        <ComposeEditor draftId={draft.id} variant="mobile" onClose={close} autoFocus />
      </div>
    );
  }

  return (
    <div
      className={`compose ${win.minimized ? 'is-min' : ''} ${win.maximized && !win.minimized ? 'is-max' : ''}`}
      role="dialog"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !e.defaultPrevented) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div className="compose-bar" onClick={() => ui().patchCompose(win.id, { minimized: !win.minimized })}>
        <span className="compose-title">{title}</span>
        <div className="compose-bar-actions" onClick={(e) => e.stopPropagation()}>
          <IconButton icon={MdMinimize} size="sm" label={win.minimized ? 'Restore' : 'Minimize'} onClick={() => ui().patchCompose(win.id, { minimized: !win.minimized })} />
          <IconButton
            icon={win.maximized && !win.minimized ? MdCloseFullscreen : MdOpenInFull}
            size="sm"
            label={win.maximized ? 'Exit full screen' : 'Full screen'}
            onClick={() => ui().patchCompose(win.id, { maximized: !win.maximized, minimized: false })}
          />
          <IconButton icon={MdClose} size="sm" label="Save & close" onClick={close} />
        </div>
      </div>
      {!win.minimized && <ComposeEditor draftId={draft.id} variant="window" onClose={close} autoFocus />}
    </div>
  );
}

/* ---------------- Inline reply ---------------- */

export function InlineComposer({ draftId, autoFocus }: { draftId: string; autoFocus?: boolean }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const me = useMail((s) => s.settings.displayName);
  if (!draft) return null;
  return (
    <div className="inline-compose">
      <Avatar contact={{ ...ME, name: me || ME.name }} size={40} className="inline-avatar" />
      <div className="inline-card">
        <ComposeEditor draftId={draftId} variant="inline" autoFocus={autoFocus} />
      </div>
    </div>
  );
}

/* ---------------- Editor ---------------- */

interface ModalState {
  title: string;
  body: string;
  confirm?: { label: string; run: () => void };
}

type Variant = 'window' | 'inline' | 'mobile';

function ComposeEditor({ draftId, variant, onClose, autoFocus }: { draftId: string; variant: Variant; onClose?: () => void; autoFocus?: boolean }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const threads = useMail((s) => s.threads);
  const update = useMail((s) => s.updateDraft);
  const signature = useMail((s) => s.settings.signature);
  const mobile = variant === 'mobile';
  const editorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const savedRange = useRef<Range | null>(null);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showCc, setShowCc] = useState(() => !!(draft?.cc.length || draft?.bcc.length));
  const [showBcc, setShowBcc] = useState(() => !!draft?.bcc.length);
  const [formatting, setFormatting] = useState(variant === 'window');
  const [plain, setPlain] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [pickTime, setPickTime] = useState(false);
  const [showQuoted, setShowQuoted] = useState(false);
  const [recipientsOpen, setRecipientsOpen] = useState(variant !== 'inline' || !draft?.to.length);
  const contacts = useMemo(() => knownContacts(threads), [threads]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || !draft) return;
    el.innerHTML = draft.html;
    if (autoFocus) {
      const target = variant === 'window' && !draft.to.length ? el.closest('.compose-editor')?.querySelector<HTMLInputElement>('.rcpt-input') : el;
      window.setTimeout(() => {
        if (target === el) placeCaretAtStart(el);
        else target?.focus();
      }, 30);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const flush = useCallback(() => {
    window.clearTimeout(saveTimer.current);
    const el = editorRef.current;
    if (el && useMail.getState().drafts[draftId]) update(draftId, { html: el.innerHTML });
  }, [draftId, update]);

  useEffect(() => {
    const onHide = () => flush();
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      flush();
    };
  }, [flush]);

  if (!draft) return null;

  const onInput = () => {
    setStatus('saving');
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      flush();
      setStatus('saved');
    }, 600);
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(cmd, false, value);
    onInput();
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
  };
  const restoreSelection = () => {
    const r = savedRange.current;
    const sel = window.getSelection();
    if (r && sel && editorRef.current?.contains(r.startContainer)) {
      sel.removeAllRanges();
      sel.addRange(r);
    }
  };

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length) return;
    let pending = list.length;
    const out: Attachment[] = [];
    const done = () => {
      pending -= 1;
      if (pending > 0) return;
      const d = useMail.getState().drafts[draftId];
      if (d) update(draftId, { attachments: [...d.attachments, ...out] });
      setStatus('saved');
    };
    for (const f of list) {
      const base: Attachment = { id: uid('att'), name: f.name, size: f.size, kind: kindFromName(f.name, f.type), mime: f.type };
      if (f.size <= MAX_INLINE_BYTES) {
        const reader = new FileReader();
        reader.onload = () => {
          out.push({ ...base, dataUrl: String(reader.result) });
          done();
        };
        reader.onerror = () => {
          out.push(base);
          done();
        };
        reader.readAsDataURL(f);
      } else {
        out.push(base);
        done();
      }
    }
  };

  const removeAttachment = (id: string) => update(draftId, { attachments: draft.attachments.filter((a) => a.id !== id) });

  const validate = (): boolean => {
    flush();
    const d = useMail.getState().drafts[draftId];
    if (!d) return false;
    const all = [...d.to, ...d.cc, ...d.bcc];
    if (!all.length) {
      setModal({ title: 'Error', body: 'Please specify at least one recipient.' });
      return false;
    }
    const bad = all.find((c) => !isValidEmail(c.email));
    if (bad) {
      const field = d.to.includes(bad) ? 'To' : d.cc.includes(bad) ? 'Cc' : 'Bcc';
      setModal({ title: 'Error', body: `The address “${bad.email}” in the “${field}” field was not recognized. Please make sure that all addresses are properly formed.` });
      return false;
    }
    return true;
  };

  const needsConfirm = () => {
    const d = useMail.getState().drafts[draftId]!;
    return !d.subject.trim() && isDraftEmpty({ ...d, to: [], cc: [], bcc: [], attachments: [] }, signature);
  };

  const send = () => {
    if (!validate()) return;
    if (needsConfirm()) {
      setModal({ title: 'Send without subject and text?', body: 'Send this message without a subject or text in the body?', confirm: { label: 'Send', run: () => sendWithUndo(draftId) } });
      return;
    }
    sendWithUndo(draftId);
  };

  const schedule = (at: number) => {
    if (!validate()) return;
    scheduleSend(draftId, at);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (e.clipboardData.files.length) {
      e.preventDefault();
      addFiles(e.clipboardData.files);
      return;
    }
    e.preventDefault();
    if (html && !plain) document.execCommand('insertHTML', false, sanitizeHtml(html));
    else document.execCommand('insertText', false, text);
    onInput();
  };

  const onDrop = (e: DragEvent) => {
    if (!e.dataTransfer.files.length) return;
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const togglePlain = () => {
    const el = editorRef.current;
    if (!el) return;
    if (!plain) {
      const text = htmlToText(el.innerHTML);
      el.innerHTML = text.split('\n').map((l) => `<div>${escapeHtml(l) || '<br>'}</div>`).join('');
      setFormatting(false);
      onInput();
    }
    setPlain(!plain);
  };

  const setMode = (mode: 'reply' | 'replyAll' | 'forward') => {
    if (!draft.threadId) return;
    flush();
    if (mode === 'forward') {
      const body = editorRef.current ? htmlToText(editorRef.current.innerHTML) : '';
      const d = useMail.getState().drafts[draftId];
      if (d && isDraftEmpty({ ...d, to: [], cc: [], subject: '' }, signature)) useMail.getState().deleteDraft(draftId);
      startReply(draft.threadId, 'forward', undefined, body.split('\n--')[0].trim() || undefined);
      return;
    }
    const t = useMail.getState().threads[draft.threadId];
    const src = t && [...t.messages].reverse().find((m) => m.from.email !== ME.email);
    if (!src) return;
    const to = mode === 'reply' ? [src.from] : dedupeContacts([src.from, ...src.to]);
    const cc = mode === 'replyAll' ? dedupeContacts(src.cc).filter((c) => !to.some((x) => x.email === c.email)) : [];
    update(draftId, { mode, to, cc });
    if (cc.length) setShowCc(true);
  };

  const popOut = () => {
    flush();
    useUI.getState().openCompose(draftId);
  };

  const recipients = (
    <div className="rcpt-block">
      <RecipientField
        label="To"
        value={draft.to}
        contacts={contacts}
        onChange={(to) => update(draftId, { to })}
        trailing={
          !showCc || !showBcc ? (
            <span className="rcpt-toggles">
              {!showCc && <button type="button" className="link-btn" onClick={() => setShowCc(true)}>Cc</button>}
              {!showBcc && <button type="button" className="link-btn" onClick={() => setShowBcc(true)}>Bcc</button>}
            </span>
          ) : null
        }
      />
      {showCc && <RecipientField label="Cc" value={draft.cc} contacts={contacts} onChange={(cc) => update(draftId, { cc })} />}
      {showBcc && <RecipientField label="Bcc" value={draft.bcc} contacts={contacts} onChange={(bcc) => update(draftId, { bcc })} />}
    </div>
  );

  const modeIcon: IconType = draft.mode === 'replyAll' ? MdReplyAll : draft.mode === 'forward' ? MdForward : MdReply;

  return (
    <div
      className={`compose-editor compose-editor-${variant} ${dragOver ? 'is-drag' : ''}`}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes('Files')) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={onDrop}
    >
      {mobile && (
        <div className="compose-mobile-bar">
          <IconButton icon={MdArrowBack} label="Save & close" onClick={onClose} />
          <span className="compose-mobile-title">{draft.mode === 'new' ? 'Compose' : draft.mode === 'forward' ? 'Forward' : 'Reply'}</span>
          <IconButton icon={MdAttachFile} label="Attach files" onClick={() => fileRef.current?.click()} />
          <IconButton icon={MdSend} label="Send" onClick={send} className="compose-mobile-send" />
          <MobileComposeMore onSchedule={schedule} onPick={() => setPickTime(true)} onDiscard={() => discardDraft(draftId)} />
        </div>
      )}

      {variant === 'inline' ? (
        <div className="inline-head">
          <ReplyModeMenu icon={modeIcon} onMode={setMode} onPopOut={popOut} />
          {recipientsOpen ? (
            <div className="inline-rcpts">{recipients}</div>
          ) : (
            <button type="button" className="inline-summary" onClick={() => setRecipientsOpen(true)}>
              {[...draft.to, ...draft.cc].map((c) => displayName(c)).join(', ') || 'Recipients'}
            </button>
          )}
          <IconButton icon={MdOpenInNew} size="sm" label="Pop out reply" onClick={popOut} />
        </div>
      ) : (
        <>
          {mobile && <div className="compose-from"><span className="rcpt-label">From</span><span>{ME.email}</span></div>}
          {recipients}
          <div className="subject-row">
            <input
              className="subject-input"
              placeholder="Subject"
              aria-label="Subject"
              value={draft.subject}
              onChange={(e) => update(draftId, { subject: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="editor-wrap">
        <div
          ref={editorRef}
          className={`editor ${plain ? 'is-plain' : ''}`}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Message body"
          spellCheck
          onInput={onInput}
          onPaste={onPaste}
          onMouseDown={(e) => {
            const el = editorRef.current;
            if (!el || e.target !== el) return;
            const typed = stripSignature(htmlToText(el.innerHTML), signature).replace(/^\s*--\s*$/gm, '').trim();
            if (typed) return;
            e.preventDefault();
            placeCaretAtStart(el);
          }}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onBlur={() => {
            saveSelection();
            flush();
          }}
        />
        {draft.quoted && (
          <>
            <button type="button" className="quote-toggle" aria-label={showQuoted ? 'Hide trimmed content' : 'Show trimmed content'} data-tip="Show trimmed content" onClick={() => setShowQuoted(!showQuoted)}>•••</button>
            {showQuoted && <div className="msg-body msg-quoted compose-quoted" dangerouslySetInnerHTML={{ __html: draft.quoted }} />}
          </>
        )}
        {draft.attachments.length > 0 && (
          <div className="compose-atts">
            {draft.attachments.map((a) => (
              <div key={a.id} className="compose-att">
                <AttachmentIcon kind={a.kind} />
                <button type="button" className="compose-att-name" onClick={() => useUI.getState().set({ viewer: { attachments: draft.attachments, index: draft.attachments.indexOf(a) } })}>
                  {a.name}
                </button>
                <span className="compose-att-size">({fileSize(a.size)})</span>
                <IconButton icon={MdClose} size="sm" label={`Remove ${a.name}`} onClick={() => removeAttachment(a.id)} />
              </div>
            ))}
          </div>
        )}
        {dragOver && <div className="drop-overlay">Drop files here</div>}
      </div>

      {formatting && !mobile && <FormatBar exec={exec} onMouseDown={saveSelection} />}

      {!mobile && (
        <div className="compose-foot">
          <SendButton onSend={send} onSchedule={schedule} onPick={() => setPickTime(true)} />
          <IconButton icon={MdTextFormat} label="Formatting options" active={formatting} onClick={() => setFormatting(!formatting)} disabled={plain} />
          <IconButton icon={MdAttachFile} label="Attach files" onClick={() => fileRef.current?.click()} />
          <IconButton
            icon={MdInsertLink}
            label="Insert link"
            onClick={() => {
              saveSelection();
              setLinkOpen(true);
            }}
          />
          <EmojiButton
            onPick={(emoji) => {
              editorRef.current?.focus();
              restoreSelection();
              document.execCommand('insertText', false, emoji);
              onInput();
            }}
            onOpen={saveSelection}
          />
          <ComposeMore plain={plain} onPlain={togglePlain} onClear={() => exec('removeFormat')} />
          <span className="compose-status" aria-live="polite">{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Draft saved' : ''}</span>
          <IconButton icon={MdOutlineDelete} label="Discard draft" onClick={() => discardDraft(draftId)} className="compose-discard" />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <LinkDialog
        open={linkOpen}
        initialText={savedRange.current?.toString() ?? ''}
        onClose={() => setLinkOpen(false)}
        onInsert={(text, url) => {
          setLinkOpen(false);
          editorRef.current?.focus();
          restoreSelection();
          const href = /^(https?:|mailto:)/i.test(url) ? url : isValidEmail(url) ? `mailto:${url}` : `https://${url}`;
          const sel = window.getSelection();
          if (sel && sel.toString()) document.execCommand('createLink', false, href);
          else document.execCommand('insertHTML', false, `<a href="${escapeHtml(href)}">${escapeHtml(text || url)}</a>&nbsp;`);
          onInput();
        }}
      />

      <DateTimeDialog
        open={pickTime}
        title="Pick date & time"
        confirmLabel="Schedule send"
        onClose={() => setPickTime(false)}
        onConfirm={(at) => {
          setPickTime(false);
          schedule(at);
        }}
      />

      <Dialog
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal?.title}
        actions={
          modal?.confirm ? (
            <>
              <button type="button" className="btn btn-text" onClick={() => setModal(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => { const c = modal.confirm!; setModal(null); c.run(); }}>{modal.confirm.label}</button>
            </>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>OK</button>
          )
        }
      >
        <p>{modal?.body}</p>
      </Dialog>
    </div>
  );
}

function placeCaretAtStart(el: HTMLElement) {
  el.focus();
  const range = document.createRange();
  const first = el.firstChild;
  if (first) {
    range.setStart(first, 0);
    range.collapse(true);
  } else {
    range.selectNodeContents(el);
    range.collapse(true);
  }
  const text = el.textContent ?? '';
  if (text && !text.startsWith('--') && first && first.textContent && first.textContent.trim()) {
    range.selectNodeContents(first);
    range.collapse(false);
  }
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function dedupeContacts(list: Contact[]) {
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = c.email.toLowerCase();
    if (seen.has(k) || k === ME.email) return false;
    seen.add(k);
    return true;
  });
}

/* ---------------- Recipient field ---------------- */

function RecipientField({
  label, value, onChange, contacts, trailing,
}: {
  label: string;
  value: Contact[];
  onChange: (v: Contact[]) => void;
  contacts: Contact[];
  trailing?: ReactNode;
}) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = text.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!q) return [];
    const chosen = new Set(value.map((c) => c.email.toLowerCase()));
    const starts = (s: string) => s.toLowerCase().split(/[\s.@_-]+/).some((w) => w.startsWith(q)) || s.toLowerCase().startsWith(q);
    return contacts.filter((c) => !chosen.has(c.email.toLowerCase()) && (starts(c.name) || starts(c.email))).slice(0, 6);
  }, [q, contacts, value]);

  useEffect(() => setActive(0), [q]);

  const commit = (raw: string) => {
    const parts = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) {
      const parsed = parseAddress(p);
      const known = parsed && contacts.find((c) => c.email.toLowerCase() === parsed.email.toLowerCase());
      const c = known ?? (parsed ? { ...parsed, name: parsed.name } : { name: '', email: p });
      if (!next.some((x) => x.email.toLowerCase() === c.email.toLowerCase())) next.push(c);
    }
    onChange(next);
    setText('');
  };

  const choose = (c: Contact) => {
    onChange([...value, c]);
    setText('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if ((e.key === 'Enter' || e.key === 'Tab') && text.trim()) {
      if (suggestions[active]) {
        e.preventDefault();
        choose(suggestions[active]);
      } else {
        if (e.key === 'Enter') e.preventDefault();
        commit(text);
      }
    } else if (e.key === ',' || e.key === ';') {
      e.preventDefault();
      commit(text);
    } else if (e.key === 'Backspace' && !text && value.length) {
      e.preventDefault();
      const last = value[value.length - 1];
      onChange(value.slice(0, -1));
      setText(last.email);
    } else if (e.key === 'Escape' && suggestions.length) {
      e.preventDefault();
      e.stopPropagation();
      setText((t) => t + ' ');
    }
  };

  return (
    <div className={`rcpt ${focused ? 'is-focused' : ''}`} ref={wrapRef} onClick={() => inputRef.current?.focus()}>
      <span className="rcpt-label">{label}</span>
      <div className="rcpt-chips">
        {value.map((c) => {
          const bad = !isValidEmail(c.email);
          return (
            <span key={c.email} className={`rcpt-chip ${bad ? 'is-invalid' : ''}`} title={bad ? `“${c.email}” isn’t a valid address` : c.email}>
              {!bad && <Avatar contact={c} size={20} />}
              <span className="rcpt-chip-text">{c.name || c.email}</span>
              <button
                type="button"
                className="rcpt-chip-x"
                aria-label={`Remove ${c.name || c.email}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(value.filter((x) => x !== c));
                }}
              >
                <MdClose aria-hidden />
              </button>
            </span>
          );
        })}
        <input
          ref={inputRef}
          className="rcpt-input"
          value={text}
          aria-label={`${label} recipients`}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            if (text.trim()) commit(text);
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text/plain');
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              commit(text + t);
            }
          }}
        />
      </div>
      {trailing}
      <Popover anchor={wrapRef.current} open={focused && suggestions.length > 0} onClose={() => setText((t) => t)} className="rcpt-pop" role="listbox" label="Contact suggestions">
        {suggestions.map((c, i) => (
          <button
            key={c.email}
            type="button"
            role="option"
            aria-selected={i === active}
            className={`rcpt-sugg ${i === active ? 'is-active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(c);
            }}
            onMouseEnter={() => setActive(i)}
          >
            <Avatar contact={c} size={32} />
            <span className="rcpt-sugg-text">
              <span className="rcpt-sugg-name">{highlightPrefix(c.name || c.email, q)}</span>
              <span className="rcpt-sugg-email">{highlightPrefix(c.email, q)}</span>
            </span>
          </button>
        ))}
      </Popover>
    </div>
  );
}

function highlightPrefix(s: string, q: string): ReactNode {
  if (!q) return s;
  const i = s.toLowerCase().indexOf(q);
  if (i < 0) return s;
  return (
    <>
      {s.slice(0, i)}
      <b>{s.slice(i, i + q.length)}</b>
      {s.slice(i + q.length)}
    </>
  );
}

/* ---------------- Formatting ---------------- */

const FONTS = [
  { label: 'Sans Serif', value: 'Google Sans Flex Variable, Roboto, Arial, sans-serif' },
  { label: 'Serif', value: 'Georgia, Times New Roman, serif' },
  { label: 'Fixed width', value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
];
const SIZES = [
  { label: 'Small', value: '2' },
  { label: 'Normal', value: '3' },
  { label: 'Large', value: '5' },
  { label: 'Huge', value: '6' },
];
const COLORS = ['#202124', '#5f6368', '#d93025', '#e37400', '#f9ab00', '#188038', '#1a73e8', '#9334e6', '#d01884', '#ffffff'];

function FmtButton({ icon: Icon, label, active, onClick }: { icon: IconType; label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`fmt-btn ${active ? 'is-active' : ''}`}
      aria-label={label}
      aria-pressed={active ?? undefined}
      data-tip={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <Icon aria-hidden />
    </button>
  );
}

function FormatBar({ exec, onMouseDown }: { exec: (cmd: string, v?: string) => void; onMouseDown: () => void }) {
  const font = useAnchor<HTMLButtonElement>();
  const size = useAnchor<HTMLButtonElement>();
  const color = useAnchor<HTMLButtonElement>();
  const align = useAnchor<HTMLButtonElement>();
  const [state, setState] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const onSel = () => {
      const q = (c: string) => {
        try {
          return document.queryCommandState(c);
        } catch {
          return false;
        }
      };
      setState({ bold: q('bold'), italic: q('italic'), underline: q('underline'), strikeThrough: q('strikeThrough'), insertOrderedList: q('insertOrderedList'), insertUnorderedList: q('insertUnorderedList') });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);
  const B = ({ icon, label, cmd, value }: { icon: IconType; label: string; cmd: string; value?: string }) => (
    <FmtButton key={label} icon={icon} label={label} active={state[cmd]} onClick={() => exec(cmd, value)} />
  );
  const menuBtn = (a: ReturnType<typeof useAnchor<HTMLButtonElement>>, label: string, content: ReactNode) => (
    <button
      type="button"
      className={`fmt-btn fmt-menu ${a.open ? 'is-active' : ''}`}
      aria-label={label}
      data-tip={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      onClick={a.toggle}
    >
      {content}
      <MdArrowDropDown aria-hidden className="fmt-caret" />
    </button>
  );
  return (
    <div className="fmt-bar" role="toolbar" aria-label="Formatting">
      {B({ icon: MdUndo, label: 'Undo', cmd: 'undo' })}
      {B({ icon: MdRedo, label: 'Redo', cmd: 'redo' })}
      <span className="fmt-sep" />
      {menuBtn(font, 'Font', <span className="fmt-font">Sans Serif</span>)}
      <Menu anchor={font.anchor} open={font.open} onClose={font.close} placement="top-start">
        {FONTS.map((f) => (
          <MenuItem key={f.label} onSelect={() => { font.close(); exec('fontName', f.value); }}>
            <span style={{ fontFamily: f.value }}>{f.label}</span>
          </MenuItem>
        ))}
      </Menu>
      <span className="fmt-sep" />
      {menuBtn(size, 'Size', <MdFormatSize aria-hidden />)}
      <Menu anchor={size.anchor} open={size.open} onClose={size.close} placement="top-start">
        {SIZES.map((s) => (
          <MenuItem key={s.value} onSelect={() => { size.close(); exec('fontSize', s.value); }}>
            <span style={{ fontSize: { '2': 12, '3': 14, '5': 18, '6': 24 }[s.value] }}>{s.label}</span>
          </MenuItem>
        ))}
      </Menu>
      <span className="fmt-sep" />
      {B({ icon: MdFormatBold, label: 'Bold (⌘B)', cmd: 'bold' })}
      {B({ icon: MdFormatItalic, label: 'Italic (⌘I)', cmd: 'italic' })}
      {B({ icon: MdFormatUnderlined, label: 'Underline (⌘U)', cmd: 'underline' })}
      {menuBtn(color, 'Text color', <MdFormatColorText aria-hidden />)}
      <Popover anchor={color.anchor} open={color.open} onClose={color.close} placement="top-start" className="color-pop" label="Text color">
        <div className="swatches">
          {COLORS.map((c) => (
            <button key={c} type="button" className="swatch" style={{ background: c }} aria-label={`Color ${c}`} onMouseDown={(e) => e.preventDefault()} onClick={() => { color.close(); exec('foreColor', c); }} />
          ))}
        </div>
      </Popover>
      <span className="fmt-sep" />
      {menuBtn(align, 'Align', <MdFormatAlignLeft aria-hidden />)}
      <Menu anchor={align.anchor} open={align.open} onClose={align.close} placement="top-start">
        <MenuItem icon={MdFormatAlignLeft} onSelect={() => { align.close(); exec('justifyLeft'); }}>Left</MenuItem>
        <MenuItem icon={MdFormatAlignCenter} onSelect={() => { align.close(); exec('justifyCenter'); }}>Center</MenuItem>
        <MenuItem icon={MdFormatAlignRight} onSelect={() => { align.close(); exec('justifyRight'); }}>Right</MenuItem>
      </Menu>
      {B({ icon: MdFormatListNumbered, label: 'Numbered list', cmd: 'insertOrderedList' })}
      {B({ icon: MdFormatListBulleted, label: 'Bulleted list', cmd: 'insertUnorderedList' })}
      {B({ icon: MdFormatIndentDecrease, label: 'Indent less', cmd: 'outdent' })}
      {B({ icon: MdFormatIndentIncrease, label: 'Indent more', cmd: 'indent' })}
      {B({ icon: MdFormatQuote, label: 'Quote', cmd: 'formatBlock', value: 'blockquote' })}
      {B({ icon: MdFormatStrikethrough, label: 'Strikethrough', cmd: 'strikeThrough' })}
      {B({ icon: MdFormatClear, label: 'Remove formatting', cmd: 'removeFormat' })}
    </div>
  );
}

/* ---------------- Send button ---------------- */

function SendButton({ onSend, onSchedule, onPick }: { onSend: () => void; onSchedule: (at: number) => void; onPick: () => void }) {
  const m = useAnchor<HTMLButtonElement>();
  const presets = useMemo(() => schedulePresets(), [m.open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="send-split">
      <button type="button" className="send-main" onClick={onSend} data-tip="Send (⌘Enter)">Send</button>
      <button type="button" className={`send-more ${m.open ? 'is-active' : ''}`} aria-label="More send options" data-tip="More send options" onClick={m.toggle}>
        <MdArrowDropDown aria-hidden />
      </button>
      <Menu anchor={m.anchor} open={m.open} onClose={m.close} placement="top-start" className="menu-schedule">
        <div className="menu-header">Schedule send</div>
        {presets.map((p) => (
          <MenuItem key={p.id} icon={MdOutlineScheduleSend} hint={scheduleLabel(p.at).replace(/^(Today|Tomorrow), /, '')} onSelect={() => { m.close(); onSchedule(p.at); }}>
            {p.label}
          </MenuItem>
        ))}
        <MenuDivider />
        <MenuItem icon={MdOutlineCalendarToday} onSelect={() => { m.close(); onPick(); }}>Pick date & time</MenuItem>
      </Menu>
    </div>
  );
}

function MobileComposeMore({ onSchedule, onPick, onDiscard }: { onSchedule: (at: number) => void; onPick: () => void; onDiscard: () => void }) {
  const m = useAnchor<HTMLButtonElement>();
  const presets = useMemo(() => schedulePresets(), [m.open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <IconButton icon={MdMoreVert} label="More options" onClick={m.toggle} active={m.open} />
      <Menu anchor={m.anchor} open={m.open} onClose={m.close} placement="bottom-end">
        <div className="menu-header">Schedule send</div>
        {presets.map((p) => (
          <MenuItem key={p.id} icon={MdOutlineScheduleSend} onSelect={() => { m.close(); onSchedule(p.at); }}>{p.label}</MenuItem>
        ))}
        <MenuItem icon={MdOutlineCalendarToday} onSelect={() => { m.close(); onPick(); }}>Pick date & time</MenuItem>
        <MenuDivider />
        <MenuItem icon={MdOutlineDelete} danger onSelect={() => { m.close(); onDiscard(); }}>Discard</MenuItem>
      </Menu>
    </>
  );
}

function ComposeMore({ plain, onPlain, onClear }: { plain: boolean; onPlain: () => void; onClear: () => void }) {
  const m = useAnchor<HTMLButtonElement>();
  return (
    <>
      <IconButton icon={MdMoreVert} label="More options" onClick={m.toggle} active={m.open} />
      <Menu anchor={m.anchor} open={m.open} onClose={m.close} placement="top-start">
        <MenuItem checked={plain} onSelect={() => { m.close(); onPlain(); }}>Plain text mode</MenuItem>
        <MenuItem onSelect={() => { m.close(); onClear(); }}>Remove formatting</MenuItem>
      </Menu>
    </>
  );
}

function ReplyModeMenu({ icon: Icon, onMode, onPopOut }: { icon: IconType; onMode: (m: 'reply' | 'replyAll' | 'forward') => void; onPopOut: () => void }) {
  const m = useAnchor<HTMLButtonElement>();
  return (
    <>
      <button type="button" className={`reply-mode ${m.open ? 'is-active' : ''}`} aria-label="Type of response" data-tip="Type of response" onClick={m.toggle}>
        <Icon aria-hidden />
        <MdArrowDropDown aria-hidden />
      </button>
      <Menu anchor={m.anchor} open={m.open} onClose={m.close}>
        <MenuItem icon={MdReply} onSelect={() => { m.close(); onMode('reply'); }}>Reply</MenuItem>
        <MenuItem icon={MdReplyAll} onSelect={() => { m.close(); onMode('replyAll'); }}>Reply all</MenuItem>
        <MenuItem icon={MdForward} onSelect={() => { m.close(); onMode('forward'); }}>Forward</MenuItem>
        <MenuDivider />
        <MenuItem icon={MdOpenInNew} onSelect={() => { m.close(); onPopOut(); }}>Pop out reply</MenuItem>
      </Menu>
    </>
  );
}

/* ---------------- Emoji + link ---------------- */

const EMOJI = ['😀', '😄', '😊', '😉', '😍', '🤩', '🙂', '🤔', '😅', '😂', '🙌', '👏', '👍', '👎', '🙏', '💪', '👀', '🎉', '🔥', '✨', '❤️', '💙', '💚', '☕', '🍂', '🌧️', '☀️', '🏃', '✈️', '🏔️', '📎', '📅', '✅', '❌', '⚠️', '💡', '📌', '🚀', '🦃', '🥧'];

function EmojiButton({ onPick, onOpen }: { onPick: (e: string) => void; onOpen: () => void }) {
  const m = useAnchor<HTMLButtonElement>();
  return (
    <>
      <button
        type="button"
        className={`icon-btn icon-btn-md ${m.open ? 'is-active' : ''}`}
        aria-label="Insert emoji"
        data-tip="Insert emoji"
        onMouseDown={(e) => {
          e.preventDefault();
          onOpen();
        }}
        onClick={m.toggle}
      >
        <MdOutlineEmojiEmotions aria-hidden />
      </button>
      <Popover anchor={m.anchor} open={m.open} onClose={m.close} placement="top-start" className="emoji-pop" label="Emoji">
        <div className="emoji-grid">
          {EMOJI.map((e) => (
            <button key={e} type="button" className="emoji" onMouseDown={(ev) => ev.preventDefault()} onClick={() => { m.close(); onPick(e); }} aria-label={`Insert ${e}`}>
              {e}
            </button>
          ))}
        </div>
      </Popover>
    </>
  );
}

function LinkDialog({ open, initialText, onClose, onInsert }: { open: boolean; initialText: string; onClose: () => void; onInsert: (text: string, url: string) => void }) {
  const [text, setText] = useState('');
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (open) {
      setText(initialText);
      setUrl('');
    }
  }, [open, initialText]);
  const valid = url.trim().length > 2;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit link"
      actions={
        <>
          <button type="button" className="btn btn-text" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={!valid} onClick={() => onInsert(text.trim(), url.trim())}>OK</button>
        </>
      }
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onInsert(text.trim(), url.trim());
        }}
      >
        <label className="field">
          <span>Text to display</span>
          <input value={text} onChange={(e) => setText(e.target.value)} />
        </label>
        <label className="field">
          <span>Web address or email</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" autoFocus />
        </label>
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}

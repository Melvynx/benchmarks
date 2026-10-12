import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  CalendarClock,
  ChevronDown,
  ExternalLink,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Minus,
  Paperclip,
  Quote,
  RemoveFormatting,
  Reply,
  ReplyAll,
  Forward,
  Smile,
  Strikethrough,
  Trash2,
  Type,
  Underline,
  X,
  Indent,
  Outdent,
} from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import type { Attachment, Contact, Draft, Person } from '../lib/types';
import { ME } from '../lib/people';
import { avatarColor, escapeHtml, isValidEmail, parseAddressList, uid } from '../lib/text';
import { sanitizeHtml } from '../lib/sanitize';
import { closeCompose, discardCompose, popOutDraft, requestSend } from '../lib/actions';
import { formatSize, formatTime, scheduleSendPresets, toLocalInputValue, HOUR } from '../lib/date';
import { useIsMobile } from '../lib/hooks';
import { AttachmentIcon } from './AttachmentIcon';
import { Avatar, IconButton, MenuList, Popover } from './primitives';

const EMOJIS = ['😀', '😄', '😊', '🙂', '😉', '😍', '🥳', '😎', '🤔', '😅', '😂', '🙏', '👍', '👏', '🙌', '🔥', '✨', '🎉', '💡', '✅', '❌', '⚡', '❤️', '💙', '📎', '📅', '⏰', '☕', '🚀', '🎯', '👀', '🤝'];

function kindOf(name: string): Attachment['kind'] {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (['doc', 'docx', 'txt', 'rtf', 'pages'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx', 'key'].includes(ext)) return 'slides';
  if (['zip', 'rar', 'gz', 'tar'].includes(ext)) return 'zip';
  if (ext === 'ics') return 'calendar';
  if (['js', 'ts', 'json', 'py', 'html', 'css'].includes(ext)) return 'code';
  if (['mp3', 'wav', 'm4a'].includes(ext)) return 'audio';
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'video';
  return 'other';
}

async function thumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return undefined;
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('bad image'));
      img.src = url;
    });
    const max = 640;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.72);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ------------------------------------------------------------ recipients */

function RecipientField({
  label,
  people,
  onChange,
  contacts,
  autoFocus,
  inputId,
  onEnterEmpty,
}: {
  label: string;
  people: Person[];
  onChange: (p: Person[]) => void;
  contacts: Contact[];
  autoFocus?: boolean;
  inputId?: string;
  onEnterEmpty?: () => void;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const have = new Set(people.map((p) => p.email.toLowerCase()));
    return contacts
      .filter((c) => !have.has(c.email.toLowerCase()) && c.email !== ME.email && (c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)))
      .sort((a, b) => {
        const as = a.name.toLowerCase().startsWith(q) || a.email.startsWith(q) ? 1 : 0;
        const bs = b.name.toLowerCase().startsWith(q) || b.email.startsWith(q) ? 1 : 0;
        return bs - as || b.freq - a.freq;
      })
      .slice(0, 6);
  }, [text, people, contacts]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const commitPeople = (raw: string) => {
    const parsed = parseAddressList(raw);
    if (!parsed.length) return false;
    const next = [...people];
    for (const p of parsed) {
      if (next.some((x) => x.email.toLowerCase() === p.email.toLowerCase())) continue;
      const c = contacts.find((x) => x.email.toLowerCase() === p.email.toLowerCase());
      next.push({ name: p.name || c?.name || '', email: c?.email ?? p.email });
    }
    onChange(next);
    setText('');
    setActive(0);
    return true;
  };

  const pick = (c: Contact) => {
    onChange([...people, { name: c.name, email: c.email }]);
    setText('');
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && suggestions.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && suggestions.length) {
      e.preventDefault();
      setActive((a) => (a - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab' || e.key === ',' || e.key === ';') {
      if (text.trim()) {
        e.preventDefault();
        if (suggestions[active] && (e.key === 'Enter' || e.key === 'Tab')) pick(suggestions[active]);
        else commitPeople(text);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onEnterEmpty?.();
      }
    } else if (e.key === ' ' && isValidEmail(text)) {
      e.preventDefault();
      commitPeople(text);
    } else if (e.key === 'Backspace' && !text && people.length) {
      onChange(people.slice(0, -1));
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  return (
    <div className="rcpt" ref={wrapRef} onClick={() => inputRef.current?.focus()}>
      <label className="rcpt__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="rcpt__chips">
        {people.map((p) => {
          const valid = isValidEmail(p.email);
          return (
            <span key={p.email} className={`rcpt-chip ${valid ? '' : 'is-invalid'}`} title={valid ? p.email : `${p.email} is not a valid address`}>
              <span className="rcpt-chip__avatar" style={{ background: avatarColor(p.email) }}>
                {(p.name || p.email)[0]?.toUpperCase()}
              </span>
              <span className="rcpt-chip__name">{p.name || p.email}</span>
              <button
                type="button"
                aria-label={`Remove ${p.name || p.email}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(people.filter((x) => x.email !== p.email));
                }}
              >
                <X size={14} />
              </button>
            </span>
          );
        })}
        <input
          id={inputId}
          ref={inputRef}
          className="rcpt__input"
          value={text}
          aria-label={label}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            setTimeout(() => {
              if (text.trim()) commitPeople(text);
              setOpen(false);
            }, 120);
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData('text');
            if (/[,;\n]/.test(t)) {
              e.preventDefault();
              commitPeople(t);
            }
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {open && suggestions.length > 0 ? (
        <div className="rcpt__suggest" role="listbox">
          {suggestions.map((c, i) => (
            <div key={c.email} role="option" aria-selected={i === active} className={`rcpt__opt ${i === active ? 'is-active' : ''}`} onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setActive(i)} onClick={() => pick(c)}>
              <Avatar person={c} size={28} />
              <span className="rcpt__opt-name">{c.name}</span>
              <span className="rcpt__opt-email">{c.email}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ formatting */

type FormatState = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; ul: boolean; ol: boolean };

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function FormatBar({ editorRef, onLink, state }: { editorRef: React.RefObject<HTMLDivElement | null>; onLink: (anchor: HTMLElement) => void; state: FormatState }) {
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const run = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    exec(cmd, value);
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const btn = (label: string, icon: React.ReactNode, cmd: string, on = false, value?: string) => (
    <IconButton label={label} size="sm" active={on} onMouseDown={keep} onClick={() => run(cmd, value)}>
      {icon}
    </IconButton>
  );
  return (
    <div className="fmtbar" role="toolbar" aria-label="Formatting options">
      <select
        className="fmtbar__select"
        aria-label="Font size"
        defaultValue="3"
        onChange={(e) => {
          run('fontSize', e.target.value);
          e.target.value = '3';
        }}
      >
        <option value="1">Small</option>
        <option value="3">Normal</option>
        <option value="5">Large</option>
        <option value="7">Huge</option>
      </select>
      <span className="toolbar__sep" />
      {btn('Bold (Ctrl+B)', <Bold size={17} />, 'bold', state.bold)}
      {btn('Italic (Ctrl+I)', <Italic size={17} />, 'italic', state.italic)}
      {btn('Underline (Ctrl+U)', <Underline size={17} />, 'underline', state.underline)}
      {btn('Strikethrough', <Strikethrough size={17} />, 'strikeThrough', state.strike)}
      <span className="toolbar__sep" />
      {btn('Bulleted list', <List size={17} />, 'insertUnorderedList', state.ul)}
      {btn('Numbered list', <ListOrdered size={17} />, 'insertOrderedList', state.ol)}
      {btn('Increase indent', <Indent size={17} />, 'indent')}
      {btn('Decrease indent', <Outdent size={17} />, 'outdent')}
      {btn('Quote', <Quote size={17} />, 'formatBlock', false, 'blockquote')}
      <span className="toolbar__sep" />
      {btn('Align left', <AlignLeft size={17} />, 'justifyLeft')}
      {btn('Align center', <AlignCenter size={17} />, 'justifyCenter')}
      {btn('Align right', <AlignRight size={17} />, 'justifyRight')}
      <span className="toolbar__sep" />
      <IconButton label="Insert link (Ctrl+K)" size="sm" onMouseDown={keep} onClick={(e) => onLink(e.currentTarget)}>
        <Link2 size={17} />
      </IconButton>
      {btn('Remove formatting', <RemoveFormatting size={17} />, 'removeFormat')}
    </div>
  );
}

/* ------------------------------------------------------------ form */

export function ComposeForm({ draftId, variant }: { draftId: string; variant: 'window' | 'full' | 'inline' }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const contacts = useMail((s) => s.contacts);
  const updateDraft = useMail((s) => s.updateDraft);
  const editorRef = useRef<HTMLDivElement>(null);
  const emitted = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);
  const linkAnchor = useRef<HTMLElement | null>(null);
  const savedRange = useRef<Range | null>(null);
  const emojiRef = useRef<HTMLButtonElement>(null);
  const schedRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [fmt, setFmt] = useState(false);
  const [showQuote, setShowQuote] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [sched, setSched] = useState(false);
  const [schedCustom, setSchedCustom] = useState(false);
  const [schedValue, setSchedValue] = useState(() => toLocalInputValue(Date.now() + 24 * HOUR));
  const [more, setMore] = useState(false);
  const [link, setLink] = useState<{ url: string; text: string } | null>(null);
  const [editRecipients, setEditRecipients] = useState(false);
  const [fmtState, setFmtState] = useState<FormatState>({ bold: false, italic: false, underline: false, strike: false, ul: false, ol: false });
  const [dragging, setDragging] = useState(false);
  const mobile = useIsMobile();

  const inline = variant === 'inline';

  useLayoutEffect(() => {
    if (!editorRef.current || !draft) return;
    if (emitted.current === draft.html) return;
    editorRef.current.innerHTML = sanitizeHtml(draft.html);
    emitted.current = draft.html;
  }, [draft?.html, draft]);

  const flush = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = sanitizeHtml(el.innerHTML);
    if (html === emitted.current) return;
    emitted.current = html;
    updateDraft(draftId, { html });
  }, [draftId, updateDraft]);

  const scheduleFlush = useCallback(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 350);
  }, [flush]);

  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    flush();
  }, [flush]);

  useEffect(() => {
    if (!draft) return;
    if (draft.cc.length) setShowCc(true);
    if (draft.bcc.length) setShowBcc(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    const onFocus = (e: Event) => {
      if ((e as CustomEvent).detail === draftId) {
        requestAnimationFrame(() => focusEditor(true));
      }
    };
    window.addEventListener('inline-reply-focus', onFocus);
    return () => window.removeEventListener('inline-reply-focus', onFocus);
  });

  useEffect(() => {
    const onSel = () => {
      const el = editorRef.current;
      const sel = document.getSelection();
      if (!el || !sel || !sel.anchorNode || !el.contains(sel.anchorNode)) return;
      setFmtState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
      });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  function focusEditor(end = false) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    if (end) {
      range.selectNodeContents(el);
      range.collapse(false);
    } else {
      const first = el.firstElementChild ?? el;
      range.setStart(first, 0);
      range.collapse(true);
    }
    sel?.removeAllRanges();
    sel?.addRange(range);
  }

  const setPatch = (patch: Partial<Draft>) => updateDraft(draftId, patch);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (!list.length || !draft) return;
    const total = draft.attachments.reduce((n, a) => n + a.size, 0) + list.reduce((n, f) => n + f.size, 0);
    if (total > 25 * 1024 * 1024) {
      useUI.getState().toast('Attachments can’t exceed 25 MB in total.');
      return;
    }
    const next: Attachment[] = [];
    for (const f of list) {
      next.push({ id: uid('a'), name: f.name, size: f.size, kind: kindOf(f.name), art: Math.floor(Math.random() * 90), dataUrl: await thumbnail(f) });
    }
    updateDraft(draftId, { attachments: [...(useMail.getState().drafts[draftId]?.attachments ?? []), ...next] });
  };

  const openLink = (anchor: HTMLElement) => {
    const sel = document.getSelection();
    if (sel && sel.rangeCount && editorRef.current?.contains(sel.anchorNode)) savedRange.current = sel.getRangeAt(0).cloneRange();
    linkAnchor.current = anchor;
    setLink({ url: 'https://', text: sel?.toString() ?? '' });
  };

  const applyLink = () => {
    if (!link) return;
    const url = link.url.trim();
    if (!/^(https?:|mailto:)/i.test(url)) {
      useUI.getState().toast('Enter a valid web address starting with http:// or https://', [], 3000);
      return;
    }
    const el = editorRef.current;
    el?.focus();
    const sel = window.getSelection();
    if (savedRange.current) {
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    if (sel && sel.toString()) exec('createLink', url);
    else exec('insertHTML', `<a href="${escapeHtml(url)}">${escapeHtml(link.text || url)}</a>&nbsp;`);
    setLink(null);
    el?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const insertEmoji = (e: string) => {
    editorRef.current?.focus();
    exec('insertText', e);
    setEmoji(false);
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const send = (sendAt?: number) => {
    flush();
    requestSend(draftId, { sendAt });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      send();
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const anchor = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.compose__editor') ?? (e.currentTarget as HTMLElement);
      openLink(anchor);
    } else if (e.key === 'Escape' && !inline && variant !== 'full') {
      e.stopPropagation();
      flush();
      closeCompose(draftId);
    } else if (e.key === 'Escape' && variant === 'full') {
      e.stopPropagation();
      useUI.getState().updateWin(draftId, { maximized: false });
    }
  };

  if (!draft) return null;
  const savedLabel = `Saved ${formatTime(draft.updatedAt)}`;
  const kindIcon = draft.kind === 'forward' ? <Forward size={18} /> : draft.kind === 'replyAll' ? <ReplyAll size={18} /> : <Reply size={18} />;
  const showFields = !inline || editRecipients || draft.to.length === 0 || draft.kind === 'forward';

  return (
    <div
      className={`compose__form compose__form--${variant} ${dragging ? 'is-dragging' : ''}`}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        if (e.dataTransfer.files.length) {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }
      }}
    >
      {inline && !showFields ? (
        <div className="reply-to-line">
          <button type="button" className="reply-to-line__btn" onClick={() => setEditRecipients(true)} aria-label="Edit recipients">
            {kindIcon}
            <span>{draft.to.map((p) => p.name || p.email).join(', ')}</span>
            <ChevronDown size={14} />
          </button>
          {draft.cc.length ? <span className="reply-to-line__cc">Cc: {draft.cc.map((p) => p.name || p.email).join(', ')}</span> : null}
          <IconButton label="Pop out reply" size="sm" className="reply-to-line__pop" onClick={() => popOutDraft(draftId)}>
            <ExternalLink size={16} />
          </IconButton>
        </div>
      ) : (
        <div className="compose__fields">
          <div className="compose__row compose__row--to">
            <RecipientField
              label="To"
              inputId={`to-${draftId}`}
              people={draft.to}
              contacts={contacts}
              autoFocus={!inline && draft.to.length === 0 && !draft.subject}
              onChange={(to) => setPatch({ to })}
            />
            <div className="compose__ccbcc">
              {!showCc ? (
                <button type="button" onClick={() => setShowCc(true)}>
                  Cc
                </button>
              ) : null}
              {!showBcc ? (
                <button type="button" onClick={() => setShowBcc(true)}>
                  Bcc
                </button>
              ) : null}
              {inline ? (
                <IconButton label="Pop out reply" size="sm" onClick={() => popOutDraft(draftId)}>
                  <ExternalLink size={16} />
                </IconButton>
              ) : null}
            </div>
          </div>
          {showCc ? <RecipientField label="Cc" inputId={`cc-${draftId}`} people={draft.cc} contacts={contacts} onChange={(cc) => setPatch({ cc })} /> : null}
          {showBcc ? <RecipientField label="Bcc" inputId={`bcc-${draftId}`} people={draft.bcc} contacts={contacts} onChange={(bcc) => setPatch({ bcc })} /> : null}
          {!inline || draft.kind === 'forward' ? (
            <div className="compose__row">
              <input className="compose__subject" placeholder="Subject" aria-label="Subject" value={draft.subject} onChange={(e) => setPatch({ subject: e.target.value })} />
            </div>
          ) : null}
        </div>
      )}

      <div className="compose__body">
        <div
          ref={editorRef}
          className="compose__editor"
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label="Message body"
          suppressContentEditableWarning
          spellCheck
          autoFocus={inline}
          onMouseDown={(e) => {
            const el = editorRef.current;
            const first = el?.firstElementChild;
            if (el && e.target === el && first && !first.classList.contains('sig') && !first.textContent?.trim()) {
              e.preventDefault();
              focusEditor(false);
            }
          }}
          onInput={scheduleFlush}
          onBlur={flush}
          onPaste={(e) => {
            const html = e.clipboardData.getData('text/html');
            const text = e.clipboardData.getData('text/plain');
            e.preventDefault();
            if (html) exec('insertHTML', sanitizeHtml(html));
            else exec('insertText', text);
          }}
        />
        {draft.quoteHtml ? (
          <div className="compose__quote">
            <button type="button" className="quote-toggle" aria-expanded={showQuote} aria-label={showQuote ? 'Hide quoted text' : 'Show quoted text'} onClick={() => setShowQuote(!showQuote)}>
              <span>•••</span>
            </button>
            {showQuote ? <div className="msg-body msg-quote" dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.quoteHtml) }} /> : null}
          </div>
        ) : null}
        {draft.attachments.length ? (
          <div className="compose__attachments">
            {draft.attachments.map((a) => (
              <span key={a.id} className="att-chip att-chip--compose" title={`${a.name} (${formatSize(a.size)})`}>
                <AttachmentIcon kind={a.kind} size={16} />
                <span className="att-chip__name">{a.name}</span>
                <span className="att-chip__size">{formatSize(a.size)}</span>
                <button type="button" aria-label={`Remove ${a.name}`} onClick={() => setPatch({ attachments: draft.attachments.filter((x) => x.id !== a.id) })}>
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {fmt ? <FormatBar editorRef={editorRef} onLink={openLink} state={fmtState} /> : null}

      <div className="compose__footer">
        <div className="send-split">
          <button type="button" className="send-split__main" onClick={() => send()} title={`Send (${navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter)`}>
            Send
          </button>
          <button ref={schedRef} type="button" className="send-split__caret" aria-label="More send options" aria-haspopup="menu" onClick={() => setSched(!sched)}>
            <ChevronDown size={18} />
          </button>
        </div>
        <Popover
          open={sched}
          anchorRef={schedRef}
          onClose={() => {
            setSched(false);
            setSchedCustom(false);
          }}
          placement="top-start"
          className="popover--snooze"
        >
          {!schedCustom ? (
            <div className="menu">
              <div className="menu__header">Schedule send</div>
              {scheduleSendPresets().map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="menu__item"
                  onClick={() => {
                    setSched(false);
                    send(p.at);
                  }}
                >
                  <span className="menu__label">{p.label}</span>
                  <span className="menu__hint">{p.detail}</span>
                </button>
              ))}
              <div className="menu__divider" />
              <button
                type="button"
                className="menu__item"
                onClick={() => {
                  setSchedValue(toLocalInputValue(Date.now() + 24 * HOUR));
                  setSchedCustom(true);
                }}
              >
                <span className="menu__check">
                  <CalendarClock size={16} />
                </span>
                <span className="menu__label">Pick date &amp; time</span>
              </button>
            </div>
          ) : (
            <form
              className="snooze-custom"
              onSubmit={(e) => {
                e.preventDefault();
                const at = new Date(schedValue).getTime();
                if (!Number.isFinite(at) || at <= Date.now()) {
                  useUI.getState().toast('Pick a time in the future.');
                  return;
                }
                setSched(false);
                setSchedCustom(false);
                send(at);
              }}
            >
              <div className="menu__header">Pick date &amp; time</div>
              <input type="datetime-local" value={schedValue} min={toLocalInputValue(Date.now())} onChange={(e) => setSchedValue(e.target.value)} aria-label="Send at" />
              <div className="snooze-custom__actions">
                <button type="button" className="text-btn" onClick={() => setSchedCustom(false)}>
                  Back
                </button>
                <button type="submit" className="btn btn--primary">
                  Schedule send
                </button>
              </div>
            </form>
          )}
        </Popover>

        <div className="compose__tools">
          <IconButton label="Formatting options" size="sm" active={fmt} onClick={() => setFmt(!fmt)}>
            <Type size={18} />
          </IconButton>
          <IconButton label="Attach files" size="sm" onClick={() => fileRef.current?.click()}>
            <Paperclip size={18} />
          </IconButton>
          <input
            ref={fileRef}
            type="file"
            multiple
            hidden
            aria-label="Attach files"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <IconButton label="Insert link (Ctrl+K)" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={(e) => openLink(e.currentTarget)}>
            <Link2 size={18} />
          </IconButton>
          <IconButton ref={emojiRef} label="Insert emoji" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => setEmoji(!emoji)}>
            <Smile size={18} />
          </IconButton>
          <Popover open={emoji} anchorRef={emojiRef} onClose={() => setEmoji(false)} placement="top-start" className="popover--emoji">
            <div className="emoji-grid" role="group" aria-label="Emoji">
              {EMOJIS.map((e) => (
                <button key={e} type="button" onMouseDown={(ev) => ev.preventDefault()} onClick={() => insertEmoji(e)} aria-label={`Insert ${e}`}>
                  {e}
                </button>
              ))}
            </div>
          </Popover>
        </div>

        <div className="compose__spacer" />
        <span className="compose__saved" aria-live="polite">
          {savedLabel}
        </span>
        {!inline && !mobile ? (
          <>
            <IconButton ref={moreRef} label="More options" size="sm" onClick={() => setMore(!more)}>
              <ChevronDown size={18} />
            </IconButton>
            <Popover open={more} anchorRef={moreRef} onClose={() => setMore(false)} placement="top-end">
              <MenuList
                onClose={() => setMore(false)}
                items={[
                  { label: variant === 'full' ? 'Exit full screen' : 'Full screen', onClick: () => useUI.getState().updateWin(draftId, { maximized: variant !== 'full' }) },
                  { label: 'Add Cc', onClick: () => setShowCc(true), disabled: showCc },
                  { label: 'Add Bcc', onClick: () => setShowBcc(true), disabled: showBcc },
                  {
                    label: 'Schedule send…',
                    onClick: () => {
                      setSchedCustom(false);
                      setSched(true);
                    },
                  },
                ]}
              />
            </Popover>
          </>
        ) : null}
        <IconButton label="Discard draft" size="sm" onClick={() => discardCompose(draftId)}>
          <Trash2 size={18} />
        </IconButton>
      </div>

      <Popover open={!!link} anchorRef={linkAnchor} onClose={() => setLink(null)} placement="top-start" className="popover--link">
        {link ? (
          <form
            className="link-form"
            onSubmit={(e) => {
              e.preventDefault();
              applyLink();
            }}
          >
            <label>
              <span>Text to display</span>
              <input value={link.text} onChange={(e) => setLink({ ...link, text: e.target.value })} />
            </label>
            <label>
              <span>Web address</span>
              <input value={link.url} onChange={(e) => setLink({ ...link, url: e.target.value })} autoFocus />
            </label>
            <div className="snooze-custom__actions">
              <button type="button" className="text-btn" onClick={() => setLink(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary">
                Apply
              </button>
            </div>
          </form>
        ) : null}
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------ dock */

function ComposeWindow({ draftId, minimized, maximized }: { draftId: string; minimized: boolean; maximized: boolean }) {
  const subject = useMail((s) => s.drafts[draftId]?.subject);
  const exists = useMail((s) => !!s.drafts[draftId]);
  const mobile = useIsMobile();
  const variant = maximized && !mobile ? 'full' : 'window';
  const title = subject?.trim() || 'New Message';

  useEffect(() => {
    if (!exists) useUI.getState().closeComposeWindow(draftId);
  }, [exists, draftId]);

  if (!exists) return null;
  const setWin = (patch: { minimized?: boolean; maximized?: boolean }) => useUI.getState().updateWin(draftId, patch);

  const win = (
    <section className={`compose compose--${variant} ${minimized ? 'is-min' : ''}`} role="dialog" aria-label={title}>
      <header className="compose__header" onClick={() => (mobile ? undefined : setWin({ minimized: !minimized }))}>
        <span className="compose__title">{title}</span>
        {!mobile ? (
          <IconButton
            label={minimized ? 'Restore' : 'Minimize'}
            size="sm"
            className="compose__hbtn"
            onClick={(e) => {
              e.stopPropagation();
              setWin({ minimized: !minimized });
            }}
          >
            <Minus size={16} />
          </IconButton>
        ) : null}
        {!mobile ? (
          <IconButton
            label={maximized ? 'Exit full screen' : 'Full screen'}
            size="sm"
            className="compose__hbtn"
            onClick={(e) => {
              e.stopPropagation();
              setWin({ maximized: !maximized, minimized: false });
            }}
          >
            {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </IconButton>
        ) : null}
        <IconButton
          label="Save & close"
          size="sm"
          className="compose__hbtn"
          onClick={(e) => {
            e.stopPropagation();
            closeCompose(draftId);
          }}
        >
          <X size={17} />
        </IconButton>
      </header>
      {!minimized ? <ComposeForm draftId={draftId} variant={variant} /> : null}
    </section>
  );

  if (variant === 'full') {
    return (
      <div className="compose-overlay" onMouseDown={(e) => e.target === e.currentTarget && setWin({ maximized: false })}>
        {win}
      </div>
    );
  }
  return win;
}

export function ComposeDock() {
  const wins = useUI((s) => s.compose);
  const mobile = useIsMobile();
  const shown = mobile ? wins.slice(-1) : wins;
  const overlays = shown.filter((w) => w.maximized && !mobile);
  const docked = shown.filter((w) => !(w.maximized && !mobile));
  return (
    <>
      {overlays.map((w) => (
        <ComposeWindow key={w.draftId} {...w} />
      ))}
      <div className="compose-dock" aria-live="polite">
        {docked.map((w) => (
          <ComposeWindow key={w.draftId} {...w} />
        ))}
      </div>
    </>
  );
}

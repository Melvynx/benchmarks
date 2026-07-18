import { useEffect, useMemo, useRef, useState } from 'react';
import { useMail } from '../store/mailStore';
import { CONTACTS, ME } from '../data/contacts';
import type { Attachment } from '../types';
import { Icon } from './Icon';
import { Popover } from './Popover';
import { cx, formatSize, isValidEmail, uid } from '../lib/utils';
import { displayName } from '../data/seed';

const EMOJIS = ['😀', '😄', '😂', '🙂', '😉', '😍', '🤔', '👏', '👍', '🙏', '🎉', '🔥', '✨', '💡', '✅', '❤️'];

// ---------------------------------------------------------------------------

function RecipientInput({
  label, value, onChange, autoFocus,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  autoFocus?: boolean;
}) {
  const pushToast = useMail((s) => s.pushToast);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    const needle = text.trim().toLowerCase();
    if (!needle) return [];
    return CONTACTS.filter(
      (c) =>
        !value.includes(c.email) &&
        (c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle)),
    ).slice(0, 5);
  }, [text, value]);

  useEffect(() => setActive(0), [suggestions.length]);

  const add = (raw: string) => {
    const email = raw.trim().replace(/,$/, '');
    if (!email) return;
    const match = CONTACTS.find((c) => c.email === email || c.name.toLowerCase() === email.toLowerCase());
    const finalEmail = match?.email ?? email;
    if (!isValidEmail(finalEmail)) {
      pushToast({ message: `"${email}" is not a valid email address` });
      return;
    }
    if (!value.includes(finalEmail)) onChange([...value, finalEmail]);
    setText('');
    setOpen(false);
  };

  return (
    <div className="rcp-row">
      <span className="rcp-label">{label}</span>
      <div className="rcp-field" onClick={() => inputRef.current?.focus()}>
        {value.map((email) => (
          <span key={email} className="chip">
            <span className="chip-name">{displayName(email)}</span>
            <button
              className="chip-x"
              aria-label={`Remove ${displayName(email)}`}
              onClick={(e) => { e.stopPropagation(); onChange(value.filter((v) => v !== email)); }}
            >
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="rcp-input"
          value={text}
          autoFocus={autoFocus}
          aria-label={label}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',' || (e.key === 'Tab' && text.trim())) {
              e.preventDefault();
              if (open && suggestions.length && text.trim() && e.key === 'Enter') add(suggestions[active]?.email ?? text);
              else add(text);
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1));
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if (e.key !== 'Escape') e.stopPropagation();
          }}
          onPaste={(e) => {
            const data = e.clipboardData.getData('text');
            if (/[,;\s]/.test(data.trim()) && data.includes('@')) {
              e.preventDefault();
              data.split(/[,;\s]+/).filter(Boolean).forEach(add);
            }
          }}
        />
      </div>
      <Popover open={open && suggestions.length > 0} onClose={() => setOpen(false)} className="rcp-pop" width={320}>
        {suggestions.map((c, i) => (
          <button
            key={c.email}
            className={cx('search-item', i === active && 'active')}
            onMouseDown={(e) => { e.preventDefault(); add(c.email); }}
            onMouseEnter={() => setActive(i)}
          >
            <span className="rcp-pop-name">{c.name}</span>
            <span className="rcp-pop-email">{c.email}</span>
          </button>
        ))}
      </Popover>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Compose() {
  const compose = useMail((s) => s.compose);
  const setCompose = useMail((s) => s.setCompose);
  const closeCompose = useMail((s) => s.closeCompose);
  const saveDraft = useMail((s) => s.saveDraft);
  const discardDraft = useMail((s) => s.discardDraft);
  const sendMessage = useMail((s) => s.sendMessage);
  const pushToast = useMail((s) => s.pushToast);

  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // restore body HTML when the window (re)mounts or a different draft loads
  useEffect(() => {
    if (compose && !compose.minimized && bodyRef.current) {
      bodyRef.current.innerHTML = compose.body;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compose?.draftId, compose?.minimized, compose?.threadId, compose == null]);

  if (!compose) return null;

  const syncBody = () => setCompose({ body: bodyRef.current?.innerHTML ?? compose.body });

  if (compose.minimized) {
    return (
      <button className="compose-min" onClick={() => { syncBody(); setCompose({ minimized: false }); }}>
        <Icon name="pen" size={18} />
        <span className="compose-min-title">{compose.subject || 'New Message'}</span>
        <Icon name="expand" size={16} />
      </button>
    );
  }

  const exec = (cmd: string, value?: string) => {
    bodyRef.current?.focus();
    document.execCommand(cmd, false, value);
    syncBody();
  };

  const applyLink = () => {
    if (linkUrl === null) return;
    const url = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
    if (savedRange.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
    exec('createLink', url);
    setLinkUrl(null);
  };

  const send = () => {
    syncBody();
    const body = bodyRef.current?.innerHTML ?? compose.body;
    if (!compose.to.length) {
      pushToast({ message: 'Add at least one recipient before sending' });
      return;
    }
    sendMessage({
      threadId: compose.threadId,
      draftId: compose.draftId,
      mode: compose.mode,
      to: compose.to,
      cc: compose.cc,
      bcc: compose.bcc,
      subject: compose.subject,
      body,
      attachments: compose.attachments,
    });
  };

  const discard = () => {
    const draftId = compose.draftId;
    closeCompose(false);
    if (draftId) discardDraft(draftId);
    else pushToast({ message: 'Draft discarded' });
  };

  const title =
    compose.mode === 'forward' ? 'Forward'
    : compose.mode === 'reply' || compose.mode === 'replyAll' ? 'Reply'
    : compose.subject || 'New Message';

  return (
    <div
      className="compose"
      role="dialog"
      aria-label="Compose message"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          syncBody();
          window.setTimeout(() => useMail.getState().closeCompose(true), 0);
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          send();
        }
      }}
    >
      <div className="compose-head">
        <span className="compose-title">{title}</span>
        <div className="compose-head-actions">
          <button className="icon-btn small" aria-label="Minimize" title="Minimize" onClick={() => { syncBody(); setCompose({ minimized: true }); }}>
            <Icon name="minimize" size={16} />
          </button>
          <button className="icon-btn small" aria-label="Save & close" title="Save & close" onClick={() => { syncBody(); window.setTimeout(() => useMail.getState().closeCompose(true), 0); }}>
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      <div className="compose-fields">
        <div className="compose-from">
          <span className="rcp-label">From</span>
          <span className="compose-from-email">{ME.name} &lt;{ME.email}&gt;</span>
          {!compose.showCcBcc && (
            <button className="link-btn" onClick={() => setCompose({ showCcBcc: true })}>Cc/Bcc</button>
          )}
        </div>
        <RecipientInput label="To" value={compose.to} onChange={(v) => setCompose({ to: v })} autoFocus={compose.mode === 'new'} />
        {compose.showCcBcc && (
          <>
            <RecipientInput label="Cc" value={compose.cc} onChange={(v) => setCompose({ cc: v })} />
            <RecipientInput label="Bcc" value={compose.bcc} onChange={(v) => setCompose({ bcc: v })} />
          </>
        )}
        <div className="rcp-row">
          <span className="rcp-label">Subject</span>
          <input
            className="subject-input"
            value={compose.subject}
            placeholder="Subject"
            aria-label="Subject"
            onChange={(e) => setCompose({ subject: e.target.value })}
            onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}
          />
        </div>
      </div>

      <div
        ref={bodyRef}
        className="compose-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Message body"
        onInput={syncBody}
        onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}
        onBlur={syncBody}
      />

      {compose.showFormatting && (
        <div className="format-bar">
          <button className="icon-btn small" title="Bold (⌘B)" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}><Icon name="bold" size={16} /></button>
          <button className="icon-btn small" title="Italic (⌘I)" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}><Icon name="italic" size={16} /></button>
          <button className="icon-btn small" title="Underline (⌘U)" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}><Icon name="underline" size={16} /></button>
          <span className="format-sep" />
          <button className="icon-btn small" title="Bulleted list" onMouseDown={(e) => { e.preventDefault(); exec('insertUnorderedList'); }}><Icon name="list" size={16} /></button>
          <button
            className="icon-btn small"
            title="Insert link"
            onMouseDown={(e) => {
              e.preventDefault();
              const sel = window.getSelection();
              if (sel && sel.rangeCount) savedRange.current = sel.getRangeAt(0).cloneRange();
              setLinkUrl('');
            }}
          >
            <Icon name="link" size={16} />
          </button>
          <button className="icon-btn small" title="Remove formatting" onMouseDown={(e) => { e.preventDefault(); exec('removeFormat'); }}>
            <span className="tx-btn">T<span className="tx-sub">×</span></span>
          </button>
        </div>
      )}
      {linkUrl !== null && (
        <div className="link-bar">
          <Icon name="link" size={16} />
          <input
            autoFocus
            placeholder="Paste or type a link, then press Enter"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') applyLink();
              if (e.key === 'Escape') setLinkUrl(null);
            }}
          />
          <button className="btn small" onClick={applyLink}>Apply</button>
        </div>
      )}

      {compose.attachments.length > 0 && (
        <div className="compose-attach">
          {compose.attachments.map((a: Attachment) => (
            <span key={a.id} className="attach-chip small">
              <Icon name="attach" size={14} />
              <span className="attach-name">{a.name}</span>
              <span className="attach-size">{formatSize(a.size)}</span>
              <button
                aria-label={`Remove ${a.name}`}
                onClick={() => setCompose({ attachments: compose.attachments.filter((x) => x.id !== a.id) })}
              >
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="compose-foot">
        <button className="send-btn" onClick={send} title="Send (⌘+Enter)">
          Send
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])].map((f) => ({
              id: uid('att'), name: f.name, size: f.size, mime: f.type || 'application/octet-stream',
            }));
            setCompose({ attachments: [...compose.attachments, ...files] });
            e.target.value = '';
          }}
        />
        <button className="icon-btn" title="Attach files" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
          <Icon name="attach" />
        </button>
        <div className="menu-anchor">
          <button className="icon-btn" title="Insert emoji" aria-label="Insert emoji" onClick={() => setEmojiOpen((o) => !o)}>
            <Icon name="emoji" />
          </button>
          <Popover open={emojiOpen} onClose={() => setEmojiOpen(false)} className="emoji-pop" width={220}>
            <div className="emoji-grid">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  className="emoji-btn"
                  onMouseDown={(ev) => {
                    ev.preventDefault();
                    bodyRef.current?.focus();
                    document.execCommand('insertText', false, e);
                    syncBody();
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </Popover>
        </div>
        <button
          className={cx('icon-btn', compose.showFormatting && 'active-toggle')}
          title="Formatting options"
          aria-label="Formatting options"
          onClick={() => setCompose({ showFormatting: !compose.showFormatting })}
        >
          <Icon name="format" />
        </button>
        <span className="compose-foot-spacer" />
        <button className="icon-btn" title="Discard draft" aria-label="Discard draft" onClick={discard}>
          <Icon name="trash" />
        </button>
      </div>
    </div>
  );
}

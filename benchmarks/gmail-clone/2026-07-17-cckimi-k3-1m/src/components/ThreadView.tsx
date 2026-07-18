import { useEffect, useMemo, useRef, useState } from 'react';
import { useMail } from '../store/mailStore';
import type { Attachment, Message, Thread } from '../types';
import { Icon } from './Icon';
import { Avatar } from './Avatar';
import { Popover } from './Popover';
import { SnoozeMenu, LabelsMenu } from './Toolbar';
import { cx, formatFullDate, formatSize, snippetOf, uid } from '../lib/utils';
import { displayName } from '../data/seed';
import { ME } from '../data/contacts';
import { downloadAttachment } from '../lib/hooks';

// ---------------------------------------------------------------------------

function AttachmentChip({ a }: { a: Attachment }) {
  const isImage = a.mime.startsWith('image/');
  return (
    <button className="attach-chip" onClick={() => downloadAttachment(a.name, a.mime)} title={`Download ${a.name}`}>
      <span className={cx('attach-icon', isImage && 'attach-icon-img')}>
        <Icon name={isImage ? 'image' : a.mime.includes('pdf') ? 'mailRead' : a.mime.includes('sheet') || a.name.endsWith('xlsx') ? 'list' : 'attach'} size={18} />
      </span>
      <span className="attach-info">
        <span className="attach-name">{a.name}</span>
        <span className="attach-size">{formatSize(a.size)}</span>
      </span>
      <Icon name="download" size={16} className="attach-dl" />
    </button>
  );
}

export { AttachmentChip };

// ---------------------------------------------------------------------------

function MessageDetails({ m, subject }: { m: Message; subject: string }) {
  return (
    <div className="msg-details">
      <table>
        <tbody>
          <tr><td>from:</td><td>{displayName(m.from)} &lt;{m.from}&gt;</td></tr>
          <tr><td>to:</td><td>{m.to.map((r) => `${displayName(r)} <${r}>`).join(', ')}</td></tr>
          {m.cc && m.cc.length > 0 && (
            <tr><td>cc:</td><td>{m.cc.map((r) => `${displayName(r)} <${r}>`).join(', ')}</td></tr>
          )}
          <tr><td>date:</td><td>{formatFullDate(m.date)}</td></tr>
          <tr><td>subject:</td><td>{subject}</td></tr>
          <tr><td>security:</td><td>Standard encryption (TLS) <a href="#" onClick={(e) => e.preventDefault()}>Learn more</a></td></tr>
        </tbody>
      </table>
    </div>
  );
}

function MessageCard({
  m, thread, expanded, onToggle,
}: {
  m: Message;
  thread: Thread;
  expanded: boolean;
  onToggle: () => void;
}) {
  const star = useMail((s) => s.star);
  const markRead = useMail((s) => s.markRead);
  const openForward = useMail((s) => s.openForward);
  const pushToast = useMail((s) => s.pushToast);
  const [details, setDetails] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fromMe = m.from === ME.email;

  const downloadMessage = () => {
    const eml = [
      `From: ${m.from}`, `To: ${m.to.join(', ')}`,
      ...(m.cc?.length ? [`Cc: ${m.cc.join(', ')}`] : []),
      `Date: ${new Date(m.date).toUTCString()}`,
      `Subject: ${thread.subject}`,
      '', snippetOf(m.body, 100000),
    ].join('\r\n');
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${thread.subject.replace(/[^\w\d]+/g, '-').slice(0, 40) || 'message'}.eml`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ message: 'Message downloaded' });
  };

  if (!expanded) {
    return (
      <button className="msg-card collapsed" onClick={onToggle}>
        <Avatar email={m.from} size={28} />
        <span className={cx('msg-collapsed-sender', !thread.read && 'unread')}>{displayName(m.from)}</span>
        <span className="msg-collapsed-snippet">{snippetOf(m.body, 90)}</span>
        <span className="msg-collapsed-date">{formatFullDate(m.date)}</span>
      </button>
    );
  }

  return (
    <div className="msg-card">
      <div className="msg-head" onClick={onToggle} role="button" aria-label="Collapse message">
        <Avatar email={m.from} size={36} />
        <div className="msg-head-main">
          <div className="msg-sender-line">
            <span className="msg-sender">{displayName(m.from)}</span>
            {fromMe && <span className="msg-you-badge">you</span>}
            <span className="msg-email">&lt;{m.from}&gt;</span>
          </div>
          <button
            className="msg-to"
            onClick={(e) => { e.stopPropagation(); setDetails((d) => !d); }}
            aria-expanded={details}
          >
            to {m.to.map((r) => (r === ME.email ? 'me' : displayName(r))).join(', ')}
            {m.cc && m.cc.length > 0 ? `, cc: ${m.cc.map((r) => displayName(r)).join(', ')}` : ''}
            <Icon name="chevronDown" size={14} className={cx('msg-to-caret', details && 'flip')} />
          </button>
          {details && (
            <div onClick={(e) => e.stopPropagation()}>
              <MessageDetails m={m} subject={thread.subject} />
            </div>
          )}
        </div>
        <div className="msg-head-side" onClick={(e) => e.stopPropagation()}>
          <span className="msg-date">{formatFullDate(m.date)}</span>
          <button
            className={cx('star-btn', thread.starred && 'starred')}
            aria-label="Star conversation"
            onClick={() => star([thread.id])}
          >
            <Icon name={thread.starred ? 'starFilled' : 'star'} size={18} />
          </button>
          <button
            className="icon-btn small"
            aria-label="Reply"
            title="Reply"
            onClick={() => document.getElementById(`reply-box-${thread.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'end' })}
          >
            <Icon name="reply" size={18} />
          </button>
          <div className="menu-anchor">
            <button className="icon-btn small" aria-label="More actions" onClick={() => setMenuOpen((o) => !o)}>
              <Icon name="more" size={18} />
            </button>
            <Popover open={menuOpen} onClose={() => setMenuOpen(false)} align="right" className="menu-pop">
              <button className="menu-item" onClick={() => { setMenuOpen(false); openForward(thread); }}>
                <Icon name="forward" size={16} /> Forward
              </button>
              <button className="menu-item" onClick={() => { markRead([thread.id], false); setMenuOpen(false); }}>
                <Icon name="mailUnread" size={16} /> Mark as unread
              </button>
              <button className="menu-item" onClick={() => { downloadMessage(); setMenuOpen(false); }}>
                <Icon name="download" size={16} /> Download message
              </button>
              <button className="menu-item" onClick={() => { window.print(); setMenuOpen(false); }}>
                <Icon name="print" size={16} /> Print
              </button>
            </Popover>
          </div>
        </div>
      </div>
      <div className="msg-body" dangerouslySetInnerHTML={{ __html: m.body }} />
      {(m.attachments ?? []).length > 0 && (
        <div className="msg-attach">
          {(m.attachments ?? []).map((a) => <AttachmentChip key={a.id} a={a} />)}
        </div>
      )}
      <div className="msg-actions">
        <ReplyButtons thread={thread} message={m} compact />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

interface ReplyTarget {
  mode: 'reply' | 'replyAll';
  to: string[];
  cc: string[];
}

function ReplyButtons({ thread, message, compact }: { thread: Thread; message: Message; compact?: boolean }) {
  const startReply = useStartReply();
  const replyTargetFor = (mode: 'reply' | 'replyAll'): ReplyTarget => {
    const others = new Set<string>();
    if (message.from !== ME.email) others.add(message.from);
    if (mode === 'replyAll') {
      for (const r of [...message.to, ...(message.cc ?? [])]) {
        if (r !== ME.email) others.add(r);
      }
    }
    const all = [...others];
    return { mode, to: all.length ? [all[0]] : [message.from], cc: all.slice(1) };
  };
  return (
    <div className={cx('reply-btns', compact && 'compact')}>
      <button className="reply-btn" onClick={() => startReply(replyTargetFor('reply'))}>
        <Icon name="reply" size={18} /> Reply
      </button>
      <button className="reply-btn" onClick={() => startReply(replyTargetFor('replyAll'))}>
        <Icon name="replyAll" size={18} /> Reply all
      </button>
      <ForwardButton thread={thread} />
    </div>
  );
}

function ForwardButton({ thread }: { thread: Thread }) {
  const openForward = useMail((s) => s.openForward);
  return (
    <button className="reply-btn" onClick={() => openForward(thread)}>
      <Icon name="forward" size={18} /> Forward
    </button>
  );
}

// reply draft state lives at the ThreadView level; small pub/sub via custom event
type ReplyStarter = (t: ReplyTarget) => void;
const replyListeners = new Set<ReplyStarter>();
function useStartReply(): ReplyStarter {
  return (t) => replyListeners.forEach((fn) => fn(t));
}

function InlineReply({ thread, lastMessage }: { thread: Thread; lastMessage: Message }) {
  const sendMessage = useMail((s) => s.sendMessage);
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const [body, setBody] = useState('<p><br></p>');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showFormat, setShowFormat] = useState(false);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    const fn: ReplyStarter = (t) => {
      setTarget(t);
      setBody('<p><br></p>');
      setAttachments([]);
      window.setTimeout(() => bodyRef.current?.focus(), 30);
    };
    replyListeners.add(fn);
    return () => {
      replyListeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (target && bodyRef.current) bodyRef.current.innerHTML = body;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (!target) return <ReplyButtons thread={thread} message={lastMessage} />;

  const exec = (cmd: string, value?: string) => {
    bodyRef.current?.focus();
    document.execCommand(cmd, false, value);
    setBody(bodyRef.current?.innerHTML ?? body);
  };

  const applyLink = () => {
    if (!linkUrl) return;
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
    const html = bodyRef.current?.innerHTML ?? '';
    if (!html.replace(/<[^>]*>/g, '').trim() && !attachments.length) return;
    sendMessage({
      threadId: thread.id,
      mode: target.mode,
      to: target.to,
      cc: target.cc,
      bcc: [],
      subject: thread.subject.startsWith('Re:') ? thread.subject : `Re: ${thread.subject}`,
      body: html,
      attachments,
    });
    setTarget(null);
  };

  return (
    <div className="inline-reply" id={`reply-box-${thread.id}`}>
      <div className="inline-reply-head">
        <Avatar email={ME.email} size={28} />
        <span className="inline-reply-mode">{target.mode === 'replyAll' ? 'Reply all' : 'Reply'}</span>
        <span className="inline-reply-to">
          To: {target.to.map((r) => displayName(r)).join(', ')}
          {target.cc.length > 0 && ` · Cc: ${target.cc.map((r) => displayName(r)).join(', ')}`}
        </span>
        <button className="icon-btn small" aria-label="Discard reply" onClick={() => setTarget(null)}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <div
        ref={bodyRef}
        className="compose-body inline-body"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Reply body"
        onInput={() => setBody(bodyRef.current?.innerHTML ?? '')}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); send(); }
          e.stopPropagation();
        }}
        onBlur={() => setBody(bodyRef.current?.innerHTML ?? '')}
      />
      {showFormat && (
        <div className="format-bar">
          <button className="icon-btn small" title="Bold" onMouseDown={(e) => { e.preventDefault(); exec('bold'); }}><Icon name="bold" size={16} /></button>
          <button className="icon-btn small" title="Italic" onMouseDown={(e) => { e.preventDefault(); exec('italic'); }}><Icon name="italic" size={16} /></button>
          <button className="icon-btn small" title="Underline" onMouseDown={(e) => { e.preventDefault(); exec('underline'); }}><Icon name="underline" size={16} /></button>
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
            onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setLinkUrl(null); }}
          />
          <button className="btn small" onClick={applyLink}>Apply</button>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="compose-attach">
          {attachments.map((a) => (
            <span key={a.id} className="attach-chip small">
              <Icon name="attach" size={14} />
              <span className="attach-name">{a.name}</span>
              <span className="attach-size">{formatSize(a.size)}</span>
              <button aria-label={`Remove ${a.name}`} onClick={() => setAttachments((as) => as.filter((x) => x.id !== a.id))}>
                <Icon name="close" size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="inline-reply-foot">
        <button className="send-btn" onClick={send}>Send</button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const files = [...(e.target.files ?? [])].map((f) => ({ id: uid('att'), name: f.name, size: f.size, mime: f.type || 'application/octet-stream' }));
            setAttachments((as) => [...as, ...files]);
            e.target.value = '';
          }}
        />
        <button className="icon-btn" title="Attach files" aria-label="Attach files" onClick={() => fileRef.current?.click()}>
          <Icon name="attach" />
        </button>
        <button className="icon-btn" title="Formatting options" aria-label="Formatting options" onClick={() => setShowFormat((f) => !f)}>
          <Icon name="format" />
        </button>
        <button className="icon-btn inline-discard" title="Discard draft" aria-label="Discard reply" onClick={() => setTarget(null)}>
          <Icon name="trash" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ThreadToolbar({ thread }: { thread: Thread }) {
  const closeThread = useMail((s) => s.closeThread);
  const archive = useMail((s) => s.archive);
  const moveToTrash = useMail((s) => s.moveToTrash);
  const markRead = useMail((s) => s.markRead);
  const reportSpam = useMail((s) => s.reportSpam);
  const moveToInbox = useMail((s) => s.moveToInbox);
  const deleteForever = useMail((s) => s.deleteForever);
  const [menu, setMenu] = useState<null | 'snooze' | 'labels' | 'more'>(null);
  const id = [thread.id];
  const inTrash = thread.labels.includes('TRASH');
  const inSpam = thread.labels.includes('SPAM');

  return (
    <div className="toolbar thread-toolbar" role="toolbar" aria-label="Conversation actions">
      <button className="icon-btn" aria-label="Back to list" title="Back (u)" onClick={closeThread}>
        <Icon name="back" />
      </button>
      {!inTrash && (
        <button className="icon-btn" aria-label="Archive" title="Archive (e)" onClick={() => archive(id)}>
          <Icon name="archive" />
        </button>
      )}
      {!inTrash && !inSpam && (
        <button className="icon-btn" aria-label="Report spam" title="Report spam" onClick={() => reportSpam(id, true)}>
          <Icon name="spam" />
        </button>
      )}
      <button
        className="icon-btn"
        aria-label={inTrash ? 'Delete forever' : 'Delete'}
        title={inTrash ? 'Delete forever' : 'Delete (#)'}
        onClick={() => (inTrash ? deleteForever(id) : moveToTrash(id))}
      >
        <Icon name="trash" />
      </button>
      <span className="toolbar-sep" />
      <button className="icon-btn" aria-label="Mark as unread" title="Mark as unread (⇧U)" onClick={() => { markRead(id, false); closeThread(); }}>
        <Icon name="mailUnread" />
      </button>
      {!inTrash && (
        <div className="menu-anchor">
          <button className="icon-btn" aria-label="Snooze" title="Snooze (b)" onClick={() => setMenu(menu === 'snooze' ? null : 'snooze')}>
            <Icon name="snooze" />
          </button>
          <Popover open={menu === 'snooze'} onClose={() => setMenu(null)} className="menu-pop" width={240}>
            <SnoozeMenu ids={id} onDone={() => setMenu(null)} />
          </Popover>
        </div>
      )}
      <div className="menu-anchor">
        <button className="icon-btn" aria-label="Labels" title="Labels (l)" onClick={() => setMenu(menu === 'labels' ? null : 'labels')}>
          <Icon name="label" />
        </button>
        <Popover open={menu === 'labels'} onClose={() => setMenu(null)} className="menu-pop" width={220}>
          <LabelsMenu ids={id} onDone={() => setMenu(null)} />
        </Popover>
      </div>
      <div className="menu-anchor">
        <button className="icon-btn" aria-label="More" title="More" onClick={() => setMenu(menu === 'more' ? null : 'more')}>
          <Icon name="more" />
        </button>
        <Popover open={menu === 'more'} onClose={() => setMenu(null)} className="menu-pop">
          {(inTrash || inSpam) && (
            <button className="menu-item" onClick={() => { moveToInbox(id); setMenu(null); }}>
              <Icon name="inbox" size={16} /> Move to Inbox
            </button>
          )}
          {inSpam && (
            <button className="menu-item" onClick={() => { reportSpam(id, false); setMenu(null); }}>
              <Icon name="spam" size={16} /> Not spam
            </button>
          )}
          {inTrash && (
            <button className="menu-item danger" onClick={() => { deleteForever(id); setMenu(null); }}>
              <Icon name="trash" size={16} /> Delete forever
            </button>
          )}
          <button className="menu-item" onClick={() => { setMenu(null); useMail.getState().openForward(thread); }}>
            <Icon name="forward" size={16} /> Forward
          </button>
        </Popover>
      </div>
    </div>
  );
}

export function ThreadView({ thread }: { thread: Thread }) {
  const labels = useMail((s) => s.labels);
  const applyLabel = useMail((s) => s.applyLabel);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const customLabels = labels.filter((l) => thread.labels.includes(l.id));

  const msgs = thread.messages;
  const defaultExpanded = useMemo(() => new Set(msgs.slice(-1).map((m) => m.id)), [msgs]);
  const toggle = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const wasDefault = defaultExpanded.has(id);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // allow collapsing the default-expanded message by tracking explicit collapse
      if (wasDefault && !next.has(id)) next.add(`!${id}`);
      return next;
    });

  const isCollapsedExplicit = (m: Message) => expandedIds.has(`!${m.id}`);
  const expanded = (m: Message) => (defaultExpanded.has(m.id) ? !isCollapsedExplicit(m) : expandedIds.has(m.id));

  const collapsedCount = msgs.filter((m) => !expanded(m)).length;

  return (
    <div className="thread-view">
      <ThreadToolbar thread={thread} />
      <div className="thread-scroll">
        <div className="thread-subject-row">
          <h1 className="thread-subject">{thread.subject || '(no subject)'}</h1>
          {customLabels.map((l) => (
            <span key={l.id} className="label-chip removable" style={{ borderColor: l.color, color: l.color }}>
              {l.name}
              <button aria-label={`Remove label ${l.name}`} onClick={() => applyLabel([thread.id], l.id, false)}>
                <Icon name="close" size={11} />
              </button>
            </span>
          ))}
          <span className="thread-count">{msgs.length} message{msgs.length === 1 ? '' : 's'}</span>
        </div>

        {msgs.map((m) => (
          <MessageCard
            key={m.id}
            m={m}
            thread={thread}
            expanded={expanded(m)}
            onToggle={() => toggle(m.id)}
          />
        ))}

        {collapsedCount > 1 && (
          <button
            className="expand-all"
            onClick={() => setExpandedIds(new Set(msgs.map((m) => m.id)))}
          >
            <Icon name="more" size={16} /> Show {collapsedCount} earlier messages
          </button>
        )}

        <div className="thread-reply-area">
          <InlineReply thread={thread} lastMessage={msgs[msgs.length - 1]} />
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  MdAddTask, MdArrowBack, MdAttachFile, MdChevronLeft, MdChevronRight, MdContentCopy, MdForward, MdLabelImportant,
  MdLabelImportantOutline, MdLockOutline, MdMoreVert, MdNotificationsOff, MdOutlineArchive, MdOutlineDelete,
  MdOutlineDeleteForever, MdOutlineDriveFileMove, MdOutlineLabel, MdOutlineMarkEmailUnread, MdOutlineMoveToInbox,
  MdOutlinePrint, MdOutlineReport, MdOutlineSchedule, MdOutlineStarBorder, MdReply, MdReplyAll, MdSearch, MdStar,
  MdUnfoldLess, MdUnfoldMore, MdArrowDropDown, MdOutlineMail, MdOutlineReportGmailerrorred, MdFilterList,
} from 'react-icons/md';
import { ME } from '../data/seed';
import type { Contact, Label, Message, Thread } from '../data/types';
import { useIsMobile, useNow } from '../hooks';
import { composeTo, openThread, runAction, startReply, toggleStar, type BulkAction } from '../lib/actions';
import { displayName, fileSize, firstName, messageDate, listDate, scheduleLabel, snippetOf } from '../lib/format';
import { listRoute, navigate, withThread, type Route } from '../lib/router';
import { sanitizeHtml } from '../lib/sanitize';
import { useMail } from '../store/mail';
import { folderTitle, isSnoozed, labelMap } from '../store/selectors';
import { useUI } from '../store/ui';
import { AttachmentCard, downloadAttachment } from './attachments';
import { InlineComposer } from './Compose';
import { useListRows } from './MailList';
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus';
import { Avatar, IconButton, LabelChip, Menu, MenuDivider, MenuItem, Popover, SystemChip, useAnchor } from './primitives';

type ListRoute = Exclude<Route, { view: 'settings' }>;

const isMe = (c: Contact) => c.email.toLowerCase() === ME.email;

function smartReplies(m: Message): string[] {
  const t = m.text.toLowerCase();
  const asks = t.includes('?');
  if (asks && /(thursday|friday|monday|tuesday|wednesday|tomorrow|next week|a time|available|free|move to|could we)/.test(t)) {
    return ['That works for me!', 'Let me check my calendar and get back to you.', 'Could we find another time?'];
  }
  if (/(attached|attachment|deck|draft|v2|v3|review|feedback|take a look)/.test(t)) return ['Thanks, I’ll take a look today.', 'This looks great!', 'Got it — thanks for sending.'];
  if (/(thank you|thanks so much|appreciate)/.test(t)) return ['You’re welcome!', 'Happy to help!', 'Anytime!'];
  if (asks) return ['Yes, sounds good.', 'Let me think about it and follow up.', 'Not this time, sorry.'];
  return ['Sounds good!', 'Thanks for the update!', 'Got it, thank you.'];
}

export function ThreadView({ route, threadId, split }: { route: ListRoute; threadId: string; split?: boolean }) {
  const mobile = useIsMobile();
  const thread = useMail((s) => s.threads[threadId]) as Thread | undefined;
  const labels = useMail((s) => s.labels);
  const drafts = useMail((s) => s.drafts);
  const composes = useUI((s) => s.composes);
  const settings = useMail((s) => s.settings);
  const now = useNow(30_000);
  const { rows } = useListRows(route);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lmap = useMemo(() => labelMap(labels), [labels]);
  const base = listRoute(route) as ListRoute;

  useEffect(() => {
    const t = useMail.getState().threads[threadId];
    if (!t) return;
    if (t.unread) useMail.getState().setUnread([threadId], false);
    useUI.getState().setCursor(threadId);
    const last = t.messages[t.messages.length - 1];
    setExpanded(last ? { [last.id]: true } : {});
    setRevealed(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [threadId]);

  const lastId = thread?.messages[thread.messages.length - 1]?.id;
  const prevLast = useRef(lastId);
  useEffect(() => {
    if (lastId && prevLast.current && lastId !== prevLast.current) {
      setExpanded((e) => ({ ...e, [lastId]: true }));
      window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
    prevLast.current = lastId;
  }, [lastId]);

  if (!thread) {
    return (
      <section className="thread thread-missing">
        <div className="empty">
          <div className="empty-art" aria-hidden><MdOutlineMail /></div>
          <h2>This conversation isn’t available</h2>
          <p>It may have been deleted forever, or the link is out of date.</p>
          <button type="button" className="btn btn-outline" onClick={() => navigate(base)}>Back to {folderTitle(base, labels)}</button>
        </div>
      </section>
    );
  }

  const ids = [thread.id];
  const threadRows = rows.filter((r) => r.kind === 'thread');
  const index = threadRows.findIndex((r) => r.id === thread.id);
  const go = (d: number) => {
    const r = threadRows[index + d];
    if (r) openThread(r.id, base);
  };
  const back = () => navigate(base);
  const inlineDrafts = Object.values(drafts)
    .filter((d) => d.threadId === thread.id && !d.scheduledAt && !d.outgoing && !composes.some((c) => c.draftId === d.id))
    .sort((a, b) => a.updatedAt - b.updatedAt);
  const lastMsg = thread.messages[thread.messages.length - 1];
  const lastOther = [...thread.messages].reverse().find((m) => !isMe(m.from));
  const canSmart = settings.smartReply && lastOther && lastOther === lastMsg && lastOther.from.kind !== 'brand' && !thread.spam && !thread.trashed && inlineDrafts.length === 0;
  const snoozed = isSnoozed(thread, now);
  const inboxChip = thread.inInbox && !thread.trashed && !thread.spam && !snoozed;
  const msgs = thread.messages;
  const collapseMiddle = msgs.length >= 5 && !revealed;
  const allExpanded = msgs.every((m) => expanded[m.id]);

  const toggleAll = () => {
    if (allExpanded) setExpanded({ [msgs[msgs.length - 1].id]: true });
    else {
      setRevealed(true);
      setExpanded(Object.fromEntries(msgs.map((m) => [m.id, true])));
    }
  };

  const reply = (mode: 'reply' | 'replyAll' | 'forward', messageId?: string, text?: string) => {
    startReply(thread.id, mode, messageId, text);
    window.setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 60);
  };

  return (
    <section className={`thread ${split ? 'is-split' : ''}`} aria-label={thread.subject}>
      <ThreadToolbar
        thread={thread}
        onBack={back}
        backLabel={`Back to ${folderTitle(base, labels)}`}
        index={index}
        total={threadRows.length}
        onPrev={() => go(-1)}
        onNext={() => go(1)}
        split={split}
      />
      <div className="thread-scroll" ref={scrollRef}>
        <div className="thread-head">
          <h2 className="thread-subject">
            {settings.importanceMarkers && (
              <button
                type="button"
                className={`row-imp ${thread.important ? 'is-on' : ''}`}
                aria-label={thread.important ? 'Important' : 'Not important'}
                data-tip={thread.important ? 'Mark as not important' : 'Mark as important'}
                onClick={() => runAction(ids, thread.important ? 'notImportant' : 'important')}
              >
                {thread.important ? <MdLabelImportant /> : <MdLabelImportantOutline />}
              </button>
            )}
            <span>{thread.subject}</span>
          </h2>
          <div className="thread-chips">
            {inboxChip && <SystemChip onRemove={() => runAction(ids, 'archive')}>Inbox</SystemChip>}
            {thread.spam && <SystemChip>Spam</SystemChip>}
            {thread.trashed && <SystemChip>Trash</SystemChip>}
            {thread.labels.map((id) => lmap[id]).filter((l): l is Label => !!l).map((l) => (
              <LabelChip key={l.id} label={l} onClick={() => navigate({ view: 'label', labelId: l.id })} onRemove={() => useMail.getState().setLabel(ids, l.id, false)} />
            ))}
          </div>
          <div className="thread-head-actions">
            {mobile && (
              <button type="button" className={`row-star ${thread.starred ? 'is-on' : ''}`} aria-label={thread.starred ? 'Starred' : 'Not starred'} onClick={() => toggleStar(thread)}>
                {thread.starred ? <MdStar /> : <MdOutlineStarBorder />}
              </button>
            )}
            {!mobile && msgs.length > 1 && <IconButton icon={allExpanded ? MdUnfoldLess : MdUnfoldMore} label={allExpanded ? 'Collapse all' : 'Expand all'} onClick={toggleAll} />}
            {!mobile && <IconButton icon={MdOutlinePrint} label="Print all" onClick={() => window.print()} />}
          </div>
        </div>

        <ThreadBanners thread={thread} now={now} />

        <div className="messages">
          {msgs.map((m, i) => {
            if (collapseMiddle && i > 0 && i < msgs.length - 2) {
              if (i !== 1) return null;
              return (
                <button key="more" type="button" className="msg-more" onClick={() => setRevealed(true)} aria-label={`Show ${msgs.length - 3} older messages`}>
                  <span className="msg-more-line" />
                  <span className="msg-more-count">{msgs.length - 3}</span>
                  <span className="msg-more-line" />
                </button>
              );
            }
            return (
              <MessageCard
                key={m.id}
                m={m}
                thread={thread}
                expanded={!!expanded[m.id]}
                onToggle={() => setExpanded((e) => ({ ...e, [m.id]: !e[m.id] }))}
                onReply={(mode) => reply(mode, m.id)}
                isLast={i === msgs.length - 1}
                now={now}
              />
            );
          })}
        </div>

        {inlineDrafts.map((d, i) => (
          <InlineComposer key={d.id} draftId={d.id} autoFocus={i === inlineDrafts.length - 1} />
        ))}

        {inlineDrafts.length === 0 && !thread.spam && (
          <div className="reply-zone">
            {canSmart && (
              <div className="smart-replies" aria-label="Suggested replies">
                {smartReplies(lastOther!).map((s) => (
                  <button key={s} type="button" className="smart-chip" onClick={() => reply('reply', lastOther!.id, s)}>{s}</button>
                ))}
              </div>
            )}
            <div className="reply-actions">
              <button type="button" className="btn btn-pill" onClick={() => reply('reply')}><MdReply aria-hidden /> Reply</button>
              {hasMultipleRecipients(lastMsg) && <button type="button" className="btn btn-pill" onClick={() => reply('replyAll')}><MdReplyAll aria-hidden /> Reply all</button>}
              <button type="button" className="btn btn-pill" onClick={() => reply('forward')}><MdForward aria-hidden /> Forward</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function hasMultipleRecipients(m: Message) {
  const others = new Set([m.from, ...m.to, ...m.cc].filter((c) => !isMe(c)).map((c) => c.email));
  return others.size > 1;
}

/* ---------------- Toolbar ---------------- */

function ThreadToolbar({
  thread, onBack, backLabel, index, total, onPrev, onNext, split,
}: {
  thread: Thread;
  onBack: () => void;
  backLabel: string;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  split?: boolean;
}) {
  const mobile = useIsMobile();
  const labelMenu = useAnchor<HTMLButtonElement>();
  const moveMenu = useAnchor<HTMLButtonElement>();
  const snoozeMenu = useAnchor<HTMLButtonElement>();
  const more = useAnchor<HTMLButtonElement>();
  const ids = [thread.id];
  const act = (a: BulkAction) => runAction(ids, a);
  const addTask = () => {
    useMail.getState().addTask(thread.subject, thread.id);
    useUI.getState().showToast('Added to Tasks.', [{ label: 'View', run: () => useMail.getState().updateSettings({ sidePanel: 'tasks' }) }]);
  };
  const sender = thread.messages.find((m) => !isMe(m.from))?.from;

  const moreItems = (
    <>
      {mobile && (
        <>
          <MenuItem icon={MdOutlineDriveFileMove} onSelect={() => { more.close(); moveMenu.setAnchor(more.anchor); }}>Move to</MenuItem>
          <MenuItem icon={MdOutlineLabel} onSelect={() => { more.close(); labelMenu.setAnchor(more.anchor); }}>Label</MenuItem>
          {!thread.trashed && !thread.spam && <MenuItem icon={MdOutlineSchedule} onSelect={() => { more.close(); snoozeMenu.setAnchor(more.anchor); }}>Snooze</MenuItem>}
          <MenuItem icon={thread.starred ? MdOutlineStarBorder : MdStar} onSelect={() => { more.close(); toggleStar(thread); }}>{thread.starred ? 'Remove star' : 'Add star'}</MenuItem>
          <MenuItem icon={MdAddTask} onSelect={() => { more.close(); addTask(); }}>Add to Tasks</MenuItem>
          {!thread.spam && <MenuItem icon={MdOutlineReport} onSelect={() => { more.close(); act('spam'); }}>Report spam</MenuItem>}
          <MenuDivider />
        </>
      )}
      <MenuItem icon={thread.important ? MdLabelImportantOutline : MdLabelImportant} onSelect={() => { more.close(); act(thread.important ? 'notImportant' : 'important'); }}>
        {thread.important ? 'Mark as not important' : 'Mark as important'}
      </MenuItem>
      <MenuItem icon={MdNotificationsOff} onSelect={() => { more.close(); act(thread.muted ? 'unmute' : 'mute'); }}>{thread.muted ? 'Unmute' : 'Mute'}</MenuItem>
      {sender && (
        <MenuItem icon={MdFilterList} onSelect={() => { more.close(); navigate({ view: 'search', query: `from:${sender.email}` }); }}>
          Filter messages like this
        </MenuItem>
      )}
      <MenuItem icon={MdOutlinePrint} onSelect={() => { more.close(); window.setTimeout(() => window.print(), 50); }}>Print all</MenuItem>
    </>
  );

  return (
    <div className={`toolbar thread-toolbar ${mobile ? 'toolbar-mobile' : ''}`} role="toolbar" aria-label="Conversation actions">
      {!split && <IconButton icon={MdArrowBack} label={backLabel} onClick={onBack} />}
      {mobile && <div className="tb-spacer" />}
      {thread.trashed ? (
        <>
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => act('inbox')} />
          <IconButton icon={MdOutlineDeleteForever} label="Delete forever" onClick={() => act('deleteForever')} />
        </>
      ) : thread.spam ? (
        <>
          <button type="button" className="btn btn-text btn-sm" onClick={() => act('notSpam')}>Not spam</button>
          <IconButton icon={MdOutlineDeleteForever} label="Delete forever" onClick={() => act('deleteForever')} />
        </>
      ) : (
        <>
          {thread.inInbox ? (
            <IconButton icon={MdOutlineArchive} label="Archive" onClick={() => act('archive')} />
          ) : (
            <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => act('inbox')} />
          )}
          {!mobile && <IconButton icon={MdOutlineReport} label="Report spam" onClick={() => act('spam')} />}
          <IconButton icon={MdOutlineDelete} label="Delete" onClick={() => act('trash')} />
        </>
      )}
      {!mobile && <span className="tb-sep" />}
      <IconButton icon={MdOutlineMarkEmailUnread} label="Mark as unread" onClick={() => act('unread')} />
      {!mobile && !thread.trashed && !thread.spam && <IconButton icon={MdOutlineSchedule} label="Snooze" onClick={snoozeMenu.toggle} active={snoozeMenu.open} />}
      {!mobile && <IconButton icon={MdAddTask} label="Add to Tasks" onClick={addTask} />}
      {!mobile && <span className="tb-sep" />}
      {!mobile && <IconButton icon={MdOutlineDriveFileMove} label="Move to" onClick={moveMenu.toggle} active={moveMenu.open} />}
      {!mobile && <IconButton icon={MdOutlineLabel} label="Labels" onClick={labelMenu.toggle} active={labelMenu.open} />}
      <IconButton icon={MdMoreVert} label="More" onClick={more.toggle} active={more.open} />
      <Menu anchor={more.anchor} open={more.open} onClose={more.close} placement="bottom-end">{moreItems}</Menu>
      <LabelMenu anchor={labelMenu.anchor} open={labelMenu.open} onClose={labelMenu.close} ids={ids} />
      <MoveMenu anchor={moveMenu.anchor} open={moveMenu.open} onClose={moveMenu.close} ids={ids} exclude={thread.inInbox ? 'inbox' : undefined} />
      <SnoozeMenu anchor={snoozeMenu.anchor} open={snoozeMenu.open} onClose={snoozeMenu.close} ids={ids} />
      {!mobile && (
        <>
          <div className="tb-spacer" />
          {index >= 0 && (
            <div className="tb-pager">
              <span className="tb-range">{(index + 1).toLocaleString()} of {total.toLocaleString()}</span>
              <IconButton icon={MdChevronLeft} label="Newer" disabled={index <= 0} onClick={onPrev} />
              <IconButton icon={MdChevronRight} label="Older" disabled={index >= total - 1} onClick={onNext} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------- Banners ---------------- */

function ThreadBanners({ thread, now }: { thread: Thread; now: number }) {
  const ids = [thread.id];
  const out: ReactNode[] = [];
  if (thread.spam) {
    out.push(
      <div key="spam" className="banner banner-danger">
        <MdOutlineReportGmailerrorred aria-hidden />
        <div>
          <b>Why is this message in spam?</b> It’s similar to messages that were identified as spam in the past. Be careful with links and attachments.
        </div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => runAction(ids, 'notSpam')}>Report not spam</button>
      </div>,
    );
  }
  if (thread.trashed) {
    out.push(
      <div key="trash" className="banner">
        <MdOutlineDelete aria-hidden />
        <div>This conversation is in Trash and will be deleted forever after 30 days.</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => runAction(ids, 'inbox')}>Move to Inbox</button>
      </div>,
    );
  }
  if (isSnoozed(thread, now)) {
    out.push(
      <div key="snooze" className="banner banner-info">
        <MdOutlineSchedule aria-hidden />
        <div>Snoozed until <b>{scheduleLabel(thread.snoozedUntil!, now)}</b></div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => runAction(ids, 'unsnooze')}>Unsnooze</button>
      </div>,
    );
  }
  if (thread.muted) {
    out.push(
      <div key="mute" className="banner">
        <MdNotificationsOff aria-hidden />
        <div>This conversation is muted. New messages will skip your inbox.</div>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => runAction(ids, 'unmute')}>Unmute</button>
      </div>,
    );
  }
  return out.length ? <div className="banners">{out}</div> : null;
}

/* ---------------- Message ---------------- */

function MessageCard({
  m, thread, expanded, onToggle, onReply, isLast, now,
}: {
  m: Message;
  thread: Thread;
  expanded: boolean;
  onToggle: () => void;
  onReply: (mode: 'reply' | 'replyAll' | 'forward') => void;
  isLast: boolean;
  now: number;
}) {
  const mobile = useIsMobile();
  const [showQuoted, setShowQuoted] = useState(false);
  const details = useAnchor<HTMLButtonElement>();
  const more = useAnchor<HTMLButtonElement>();
  const card = useAnchor<HTMLElement>();
  const rich = /<table|max-width\s*:\s*6\d\dpx/i.test(m.html);
  const toLine = recipientsLine(m);
  const brand = m.from.kind === 'brand';
  const unsubscribable = brand && (thread.category === 'promotions' || thread.category === 'social' || /unsubscribe/i.test(m.text));

  if (!expanded) {
    return (
      <div className="msg is-collapsed" role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === 'Enter' && onToggle()}>
        <Avatar contact={m.from} size={40} />
        <div className="msg-collapsed-main">
          <div className="msg-collapsed-top">
            <span className="msg-from-name">{isMe(m.from) ? 'me' : displayName(m.from)}</span>
            {m.attachments.length > 0 && <MdAttachFile className="msg-clip" aria-label="Has attachment" />}
            <span className="msg-date">{listDate(m.date, now)}</span>
          </div>
          <div className="msg-snippet">{snippetOf(m.text, 160)}</div>
        </div>
      </div>
    );
  }

  return (
    <article className="msg is-expanded">
      <button type="button" className="msg-avatar" onClick={card.toggle} aria-label={`Contact card for ${displayName(m.from)}`}>
        <Avatar contact={m.from} size={40} />
      </button>
      <div className="msg-main">
        <header className="msg-head" onClick={(e) => { if (e.target === e.currentTarget) onToggle(); }}>
          <div className="msg-who" onClick={(e) => { if (e.target === e.currentTarget) onToggle(); }}>
            <button type="button" className="msg-from-name" onClick={card.toggle}>{displayName(m.from)}</button>
            {!mobile && <span className="msg-from-email">&lt;{m.from.email}&gt;</span>}
            {unsubscribable && (
              <button
                type="button"
                className="link-btn msg-unsub"
                onClick={() => {
                  if (window.confirm(`Unsubscribe from ${m.from.name}? You’ll stop getting these emails, and this conversation will be archived.`)) {
                    runAction([thread.id], 'archive');
                    useUI.getState().showToast(`Unsubscribed from ${m.from.name}.`);
                  }
                }}
              >
                Unsubscribe
              </button>
            )}
            <div className="msg-to">
              <span onClick={onToggle}>{toLine}</span>
              <button type="button" className="msg-details-btn" aria-label="Show details" onClick={details.toggle}><MdArrowDropDown aria-hidden /></button>
            </div>
          </div>
          <div className="msg-meta">
            {m.attachments.length > 0 && <MdAttachFile className="msg-clip" aria-label="Has attachment" />}
            <span className="msg-date" title={messageDate(m.date, now)} onClick={onToggle}>{mobile ? listDate(m.date, now) : messageDate(m.date, now)}</span>
            {isLast && !mobile && (
              <button type="button" className={`row-star ${thread.starred ? 'is-on' : ''}`} aria-label={thread.starred ? 'Starred' : 'Not starred'} data-tip={thread.starred ? 'Starred' : 'Not starred'} onClick={() => toggleStar(thread)}>
                {thread.starred ? <MdStar /> : <MdOutlineStarBorder />}
              </button>
            )}
            <IconButton icon={MdReply} label="Reply" onClick={() => onReply('reply')} />
            <IconButton icon={MdMoreVert} label="More" onClick={more.toggle} active={more.open} />
          </div>
        </header>

        <Popover anchor={details.anchor} open={details.open} onClose={details.close} className="msg-details" label="Message details">
          <dl>
            <dt>from:</dt><dd><b>{displayName(m.from)}</b> &lt;{m.from.email}&gt;</dd>
            <dt>to:</dt><dd>{m.to.map(fmtContact).join(', ') || '(no recipients)'}</dd>
            {m.cc.length > 0 && (<><dt>cc:</dt><dd>{m.cc.map(fmtContact).join(', ')}</dd></>)}
            {m.bcc.length > 0 && (<><dt>bcc:</dt><dd>{m.bcc.map(fmtContact).join(', ')}</dd></>)}
            <dt>date:</dt><dd>{messageDate(m.date, now).replace(/ \(.*\)$/, '')}</dd>
            <dt>subject:</dt><dd>{thread.subject}</dd>
            <dt>mailed-by:</dt><dd>{m.from.email.split('@')[1]}</dd>
            <dt>security:</dt><dd><MdLockOutline className="inline-icon" aria-hidden /> Standard encryption (TLS)</dd>
          </dl>
        </Popover>

        <Menu anchor={more.anchor} open={more.open} onClose={more.close} placement="bottom-end">
          <MenuItem icon={MdReply} onSelect={() => { more.close(); onReply('reply'); }}>Reply</MenuItem>
          {hasMultipleRecipients(m) && <MenuItem icon={MdReplyAll} onSelect={() => { more.close(); onReply('replyAll'); }}>Reply all</MenuItem>}
          <MenuItem icon={MdForward} onSelect={() => { more.close(); onReply('forward'); }}>Forward</MenuItem>
          <MenuDivider />
          <MenuItem
            icon={MdContentCopy}
            onSelect={() => {
              more.close();
              void navigator.clipboard?.writeText(m.text).then(() => useUI.getState().showToast('Message text copied.'));
            }}
          >
            Copy text
          </MenuItem>
          <MenuItem icon={MdOutlineMarkEmailUnread} onSelect={() => { more.close(); runAction([thread.id], 'unread'); }}>Mark unread from here</MenuItem>
          <MenuItem icon={MdSearch} onSelect={() => { more.close(); navigate({ view: 'search', query: `from:${m.from.email}` }); }}>
            Find emails from {firstName(m.from)}
          </MenuItem>
          <MenuItem icon={MdOutlinePrint} onSelect={() => { more.close(); window.setTimeout(() => window.print(), 50); }}>Print</MenuItem>
        </Menu>

        <ContactCard anchor={card.anchor} open={card.open} onClose={card.close} contact={m.from} />

        <div className={`msg-body ${rich ? 'is-rich' : ''}`} dangerouslySetInnerHTML={{ __html: m.html }} />

        {m.quoted && (
          <>
            <button type="button" className="quote-toggle" aria-label={showQuoted ? 'Hide trimmed content' : 'Show trimmed content'} data-tip={showQuoted ? 'Hide expanded content' : 'Show trimmed content'} onClick={() => setShowQuoted(!showQuoted)}>
              •••
            </button>
            {showQuoted && <div className="msg-body msg-quoted" dangerouslySetInnerHTML={{ __html: m.quoted }} />}
          </>
        )}

        {m.attachments.length > 0 && (
          <div className="msg-atts">
            <div className="msg-atts-head">
              <span>{m.attachments.length === 1 ? 'One attachment' : `${m.attachments.length} attachments`}</span>
              <span className="msg-atts-sep">•</span>
              <span className="msg-atts-note">{fileSize(m.attachments.reduce((s, a) => s + a.size, 0))} · Scanned locally</span>
              {m.attachments.length > 1 && (
                <button type="button" className="link-btn" onClick={() => m.attachments.forEach((a, i) => window.setTimeout(() => downloadAttachment(a), i * 250))}>
                  Download all
                </button>
              )}
            </div>
            <div className="att-grid">
              {m.attachments.map((a, i) => (
                <AttachmentCard key={a.id} a={a} onOpen={() => useUI.getState().set({ viewer: { attachments: m.attachments, index: i } })} />
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

function fmtContact(c: Contact) {
  return c.name ? `${c.name} <${c.email}>` : c.email;
}

function recipientsLine(m: Message): string {
  const names = [...m.to, ...m.cc].map((c) => (isMe(c) ? 'me' : firstName(c)));
  if (!names.length) return 'to (no recipients)';
  const shown = names.slice(0, 3).join(', ');
  return `to ${shown}${names.length > 3 ? ` +${names.length - 3}` : ''}`;
}

function ContactCard({ anchor, open, onClose, contact }: { anchor: HTMLElement | null; open: boolean; onClose: () => void; contact: Contact }) {
  const me = isMe(contact);
  return (
    <Popover anchor={anchor} open={open} onClose={onClose} className="contact-card" label={`Contact card for ${displayName(contact)}`}>
      <div className="contact-card-top">
        <Avatar contact={contact} size={56} />
        <div>
          <div className="contact-card-name">{me ? `${displayName(contact)} (you)` : displayName(contact)}</div>
          <div className="contact-card-email">{contact.email}</div>
          {contact.org && <div className="contact-card-org">{contact.org}</div>}
        </div>
      </div>
      <div className="contact-card-actions">
        {!me && (
          <button type="button" className="btn btn-tonal btn-sm" onClick={() => { onClose(); composeTo(contact); }}>
            <MdOutlineMail aria-hidden /> Send email
          </button>
        )}
        <button type="button" className="btn btn-text btn-sm" onClick={() => { onClose(); navigate({ view: 'search', query: `from:${contact.email}` }); }}>
          <MdSearch aria-hidden /> Emails
        </button>
        <button
          type="button"
          className="btn btn-text btn-sm"
          onClick={() => {
            onClose();
            void navigator.clipboard?.writeText(contact.email).then(() => useUI.getState().showToast('Email address copied.'));
          }}
        >
          <MdContentCopy aria-hidden /> Copy
        </button>
      </div>
    </Popover>
  );
}

/* ---------------- Scheduled preview ---------------- */

export function ScheduledPreview({ draftId }: { draftId: string }) {
  const draft = useMail((s) => s.drafts[draftId]);
  const me = useMail((s) => s.me)();
  const now = useNow(30_000);
  const back = () => navigate({ view: 'folder', folder: 'scheduled' });
  if (!draft || !draft.scheduledAt) {
    return (
      <section className="thread thread-missing">
        <div className="empty">
          <div className="empty-art" aria-hidden><MdOutlineSchedule /></div>
          <h2>This message is no longer scheduled</h2>
          <p>It was sent or moved back to Drafts.</p>
          <button type="button" className="btn btn-outline" onClick={back}>Back to Scheduled</button>
        </div>
      </section>
    );
  }
  return (
    <section className="thread" aria-label={draft.subject}>
      <div className="toolbar thread-toolbar">
        <IconButton icon={MdArrowBack} label="Back to Scheduled" onClick={back} />
      </div>
      <div className="thread-scroll">
        <div className="thread-head">
          <h2 className="thread-subject"><span>{draft.subject || '(no subject)'}</span></h2>
          <div className="thread-chips"><SystemChip>Scheduled</SystemChip></div>
        </div>
        <div className="banners">
          <div className="banner banner-info">
            <MdOutlineSchedule aria-hidden />
            <div>Send scheduled for <b>{scheduleLabel(draft.scheduledAt, now)}</b></div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => {
                useMail.getState().unscheduleDraft(draftId);
                useUI.getState().showToast('Send cancelled. Message saved to Drafts.');
                if (draft.threadId && useMail.getState().threads[draft.threadId]) navigate(withThread({ view: 'folder', folder: 'drafts' }, draft.threadId));
                else {
                  navigate({ view: 'folder', folder: 'drafts' });
                  useUI.getState().openCompose(draftId);
                }
              }}
            >
              Cancel send
            </button>
          </div>
        </div>
        <div className="messages">
          <article className="msg is-expanded">
            <span className="msg-avatar"><Avatar contact={me} size={40} /></span>
            <div className="msg-main">
              <header className="msg-head">
                <div className="msg-who">
                  <span className="msg-from-name">{me.name}</span>
                  <div className="msg-to">to {draft.to.map((c) => firstName(c)).join(', ') || '(no recipients)'}</div>
                </div>
                <div className="msg-meta"><span className="msg-date">{scheduleLabel(draft.scheduledAt, now)}</span></div>
              </header>
              <div className="msg-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.html) }} />
              {draft.attachments.length > 0 && (
                <div className="att-grid">
                  {draft.attachments.map((a, i) => (
                    <AttachmentCard key={a.id} a={a} onOpen={() => useUI.getState().set({ viewer: { attachments: draft.attachments, index: i } })} />
                  ))}
                </div>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

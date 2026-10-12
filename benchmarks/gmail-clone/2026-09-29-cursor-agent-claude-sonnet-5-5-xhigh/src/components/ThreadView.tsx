import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  Bookmark,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  EllipsisVertical,
  Forward,
  Mail,
  MapPin,
  OctagonAlert,
  Printer,
  Reply,
  ReplyAll,
  Star,
  Trash2,
  Undo2,
  Users,
  ArrowLeft,
} from 'lucide-react';
import { useMail } from '../lib/store';
import { useUI } from '../lib/ui';
import type { Message, Person, Route } from '../lib/types';
import { formatEventRange, formatFull, formatListDate, formatShortDateTime, relativeAgo } from '../lib/date';
import { prepareBody } from '../lib/sanitize';
import { isMe } from '../lib/people';
import { firstName } from '../lib/text';
import { smartReplies } from '../lib/smart';
import { navigate } from '../lib/router';
import {
  archiveThreads,
  composeNew,
  deleteForever,
  deleteMessage,
  goToList,
  markRead,
  moveToInbox,
  notSpamThreads,
  replyTo,
  setImportant,
  spamThreads,
  trashThreads,
  unsnoozeThreads,
} from '../lib/actions';
import type { ListModel } from '../lib/listModel';
import { Avatar, IconButton, LabelChip, MenuList, Popover } from './primitives';
import { AttachmentGrid } from './Attachments';
import { LabelButton, MoveButton, SnoozeButton } from './ToolbarActions';
import { ComposeForm } from './Compose';

function recipientsSummary(m: Message): string {
  const all = [...m.to, ...m.cc];
  if (!all.length) return 'to (undisclosed recipients)';
  const names = all.map((p) => (isMe(p) ? 'me' : firstName(p.name || p.email)));
  const uniq = [...new Set(names)];
  const shown = uniq.slice(0, 3).join(', ');
  return `to ${shown}${uniq.length > 3 ? ` +${uniq.length - 3}` : ''}`;
}

function personLine(p: Person): string {
  return p.name ? `${p.name} <${p.email}>` : p.email;
}

function MessageBody({ html, threadId }: { html: string; threadId: string }) {
  const [showQuote, setShowQuote] = useState(false);
  const { main, quote } = useMemo(() => prepareBody(html), [html]);
  const onClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a) return;
    const href = a.getAttribute('href') ?? '';
    if (href.startsWith('mailto:')) {
      e.preventDefault();
      const email = href.slice(7).split('?')[0];
      composeNew({ to: [{ name: '', email }] });
    }
    void threadId;
  };
  return (
    <div className="msg-body-wrap" onClick={onClick}>
      <div className="msg-body" dangerouslySetInnerHTML={{ __html: main }} />
      {quote ? (
        <>
          <button type="button" className="quote-toggle" aria-expanded={showQuote} aria-label={showQuote ? 'Hide trimmed content' : 'Show trimmed content'} onClick={() => setShowQuote(!showQuote)}>
            <span>•••</span>
          </button>
          {showQuote ? <div className="msg-quote msg-body" dangerouslySetInnerHTML={{ __html: quote }} /> : null}
        </>
      ) : null}
    </div>
  );
}

function InviteCard({ msg }: { msg: Message }) {
  const inv = msg.invite;
  if (!inv) return null;
  const set = (rsvp: 'yes' | 'maybe' | 'no') => {
    useMail.getState().setRsvp(msg.id, rsvp);
    useUI.getState().toast(`Your response was sent to ${inv.organizer.name}.`);
  };
  return (
    <div className="invite">
      <div className="invite__icon">
        <CalendarDays size={22} />
      </div>
      <div className="invite__main">
        <div className="invite__title">{inv.title}</div>
        <div className="invite__when">{formatEventRange(inv.start, inv.end)}</div>
        <div className="invite__where">
          <MapPin size={14} /> {inv.where}
        </div>
        <div className="invite__people">
          <Users size={14} />
          <span>{inv.attendees.map((a) => (isMe(a) ? 'You' : a.name)).join(', ')}</span>
        </div>
        <div className="invite__rsvp" role="group" aria-label="Respond to invitation">
          <span className="invite__q">Going?</span>
          {(
            [
              ['yes', 'Yes'],
              ['maybe', 'Maybe'],
              ['no', 'No'],
            ] as const
          ).map(([k, l]) => (
            <button key={k} type="button" className={`pill-btn ${inv.rsvp === k ? 'is-on' : ''}`} aria-pressed={inv.rsvp === k} onClick={() => set(k)}>
              {inv.rsvp === k ? <Check size={14} /> : null}
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageCard({
  msg,
  expanded,
  onToggle,
  isLast,
  threadId,
  inlineOpen,
  spam,
}: {
  msg: Message;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
  threadId: string;
  inlineOpen: boolean;
  spam: boolean;
}) {
  const detailsRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [details, setDetails] = useState(false);
  const [more, setMore] = useState(false);
  const fromMe = isMe(msg.from);
  const replyAll = new Set([msg.from, ...msg.to, ...msg.cc].map((p) => p.email.toLowerCase()).filter((e) => !isMe({ name: '', email: e }))).size > 1;
  const smart = useMemo(() => (isLast && !fromMe ? smartReplies(msg) : []), [isLast, fromMe, msg]);

  if (!expanded) {
    return (
      <div className={`msg msg--collapsed ${msg.unread ? 'is-unread' : ''}`} role="button" tabIndex={0} aria-expanded="false" onClick={onToggle} onKeyDown={(e) => (e.key === 'Enter' ? onToggle() : undefined)}>
        <Avatar person={msg.from} size={32} />
        <span className="msg__from">{fromMe ? 'me' : msg.from.name || msg.from.email}</span>
        <span className="msg__snippet">{msg.snippet}</span>
        {msg.attachments.length ? <span className="msg__att">{msg.attachments.length}</span> : null}
        <span className="msg__date">{formatListDate(msg.date)}</span>
      </div>
    );
  }

  const unsubscribe = () => {
    useUI.getState().set({
      confirm: {
        title: `Unsubscribe from ${msg.from.name}?`,
        body: `You'll stop receiving emails from ${msg.from.email}. This conversation will be moved to Trash.`,
        confirmLabel: 'Unsubscribe',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          trashThreads([threadId]);
          useUI.getState().toast(`Unsubscribed from ${msg.from.name}.`);
        },
      },
    });
  };

  return (
    <article className={`msg ${msg.unread ? 'is-unread' : ''}`} aria-label={`Message from ${msg.from.name}`}>
      <header className="msg__head">
        <button type="button" className="msg__avatar" onClick={onToggle} aria-label="Collapse message">
          <Avatar person={msg.from} size={40} />
        </button>
        <div className="msg__who" onClick={onToggle}>
          <div className="msg__name-line">
            <span className="msg__name">{msg.from.name || msg.from.email}</span>
            <span className="msg__email">&lt;{msg.from.email}&gt;</span>
            {msg.unsubscribe ? (
              <button
                type="button"
                className="link-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  unsubscribe();
                }}
              >
                Unsubscribe
              </button>
            ) : null}
          </div>
          <div className="msg__to-line">
            <button
              ref={detailsRef}
              type="button"
              className="msg__to"
              aria-expanded={details}
              onClick={(e) => {
                e.stopPropagation();
                setDetails(!details);
              }}
            >
              {recipientsSummary(msg)} <ChevronDown size={14} />
            </button>
          </div>
        </div>
        <div className="msg__tools">
          <span className="msg__when" title={formatFull(msg.date)}>
            {formatFull(msg.date)} <span className="msg__ago">({relativeAgo(msg.date)})</span>
          </span>
          <IconButton label={msg.starred ? 'Starred' : 'Not starred'} size="sm" className={`star-btn ${msg.starred ? 'is-on' : ''}`} aria-pressed={msg.starred} onClick={() => useMail.getState().toggleMessageStar(msg.id)}>
            <Star size={18} fill={msg.starred ? 'currentColor' : 'none'} />
          </IconButton>
          <IconButton label="Reply" size="sm" onClick={() => replyTo('reply', threadId, msg.id)}>
            <Reply size={18} />
          </IconButton>
          <IconButton ref={moreRef} label="More" size="sm" onClick={() => setMore(!more)}>
            <EllipsisVertical size={18} />
          </IconButton>
        </div>
        <Popover open={details} anchorRef={detailsRef} onClose={() => setDetails(false)} className="popover--details">
          <table className="details">
            <tbody>
              <tr>
                <th>from:</th>
                <td>
                  <b>{msg.from.name}</b> &lt;{msg.from.email}&gt;
                </td>
              </tr>
              <tr>
                <th>to:</th>
                <td>{msg.to.map(personLine).join(', ') || '—'}</td>
              </tr>
              {msg.cc.length ? (
                <tr>
                  <th>cc:</th>
                  <td>{msg.cc.map(personLine).join(', ')}</td>
                </tr>
              ) : null}
              {fromMe && msg.bcc.length ? (
                <tr>
                  <th>bcc:</th>
                  <td>{msg.bcc.map(personLine).join(', ')}</td>
                </tr>
              ) : null}
              <tr>
                <th>date:</th>
                <td>{formatFull(msg.date)}</td>
              </tr>
              <tr>
                <th>subject:</th>
                <td>{useMail.getState().threads[threadId]?.subject}</td>
              </tr>
              <tr>
                <th>mailed-by:</th>
                <td>{msg.mailedBy ?? msg.from.email.split('@')[1]}</td>
              </tr>
              <tr>
                <th>security:</th>
                <td>Standard encryption (TLS)</td>
              </tr>
            </tbody>
          </table>
        </Popover>
        <Popover open={more} anchorRef={moreRef} onClose={() => setMore(false)} placement="bottom-end">
          <MenuList
            onClose={() => setMore(false)}
            items={[
              { label: 'Reply', icon: <Reply size={16} />, onClick: () => replyTo('reply', threadId, msg.id) },
              { label: 'Reply to all', icon: <ReplyAll size={16} />, disabled: !replyAll, onClick: () => replyTo('replyAll', threadId, msg.id) },
              { label: 'Forward', icon: <Forward size={16} />, onClick: () => replyTo('forward', threadId, msg.id) },
              { divider: true, label: '' },
              {
                label: 'Mark as unread',
                icon: <Mail size={16} />,
                onClick: () => {
                  useMail.getState().markMessageUnread(msg.id);
                  goToList();
                },
              },
              { label: 'Delete this message', icon: <Trash2 size={16} />, danger: true, onClick: () => deleteMessage(msg.id) },
              { label: 'Print', icon: <Printer size={16} />, onClick: () => window.print() },
              { label: spam ? 'Report not spam' : 'Report spam', icon: <OctagonAlert size={16} />, onClick: () => (spam ? notSpamThreads([threadId]) : spamThreads([threadId])) },
            ]}
          />
        </Popover>
      </header>

      <div className="msg__content">
        <InviteCard msg={msg} />
        <MessageBody html={msg.html} threadId={threadId} />
        <AttachmentGrid attachments={msg.attachments} />
        {isLast && !inlineOpen ? (
          <div className="msg__footer">
            {smart.length ? (
              <div className="smart" aria-label="Suggested replies">
                {smart.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="smart__chip"
                    onClick={() => {
                      replyTo('reply', threadId, msg.id);
                      const id = Object.values(useMail.getState().drafts).find((d) => d.threadId === threadId && d.mode === 'inline')?.id;
                      if (id) useMail.getState().updateDraft(id, { html: `<p>${s}</p>${useMail.getState().drafts[id].html}` });
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="msg__buttons">
              <button type="button" className="btn btn--outline" onClick={() => replyTo(useMail.getState().settings.defaultReplyAll && replyAll ? 'replyAll' : 'reply', threadId, msg.id)}>
                <Reply size={18} /> Reply
              </button>
              {replyAll ? (
                <button type="button" className="btn btn--outline" onClick={() => replyTo('replyAll', threadId, msg.id)}>
                  <ReplyAll size={18} /> Reply all
                </button>
              ) : null}
              <button type="button" className="btn btn--outline" onClick={() => replyTo('forward', threadId, msg.id)}>
                <Forward size={18} /> Forward
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function ThreadToolbar({ route, model, threadId }: { route: Route; model: ListModel; threadId: string }) {
  const thread = useMail((s) => s.threads[threadId]);
  const messages = useMail((s) => s.messages);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  if (!thread) return null;
  const msgs = thread.messageIds.map((id) => messages[id]).filter(Boolean);
  const starred = msgs.some((m) => m.starred);
  const threadItems = model.items.filter((i) => i.kind === 'thread');
  const idx = threadItems.findIndex((i) => i.id === threadId);
  const newer = idx > 0 ? threadItems[idx - 1].id : null;
  const older = idx >= 0 && idx < threadItems.length - 1 ? threadItems[idx + 1].id : null;
  const ids = [threadId];
  const inTrash = thread.trashed;

  return (
    <div className="toolbar toolbar--thread" role="toolbar" aria-label="Conversation actions">
      <div className="toolbar__group">
        <IconButton label="Back to list" onClick={goToList} className="toolbar__back">
          <ArrowLeft size={20} />
        </IconButton>
        {inTrash ? (
          <>
            <IconButton label="Move to Inbox" onClick={() => moveToInbox(ids)}>
              <Undo2 size={20} />
            </IconButton>
            <IconButton label="Delete forever" onClick={() => deleteForever(ids)}>
              <Trash2 size={20} />
            </IconButton>
          </>
        ) : thread.spam ? (
          <>
            <IconButton label="Not spam" onClick={() => notSpamThreads(ids)}>
              <Undo2 size={20} />
            </IconButton>
            <IconButton label="Delete forever" onClick={() => deleteForever(ids)}>
              <Trash2 size={20} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton label="Archive" onClick={() => archiveThreads(ids)}>
              <Archive size={20} />
            </IconButton>
            <IconButton label="Report spam" onClick={() => spamThreads(ids)}>
              <OctagonAlert size={20} />
            </IconButton>
            <IconButton label="Delete" onClick={() => trashThreads(ids)}>
              <Trash2 size={20} />
            </IconButton>
          </>
        )}
        <span className="toolbar__sep" />
        <IconButton label="Mark as unread" onClick={() => markRead(false, ids, { leave: true })}>
          <Mail size={20} />
        </IconButton>
        <SnoozeButton ids={ids} />
        <MoveButton ids={ids} />
        <LabelButton ids={ids} />
        <IconButton ref={moreRef} label="More" onClick={() => setMoreOpen(!moreOpen)}>
          <EllipsisVertical size={20} />
        </IconButton>
        <Popover open={moreOpen} anchorRef={moreRef} onClose={() => setMoreOpen(false)}>
          <MenuList
            onClose={() => setMoreOpen(false)}
            items={[
              { label: thread.important ? 'Mark as not important' : 'Mark as important', icon: <Bookmark size={16} />, onClick: () => setImportant(!thread.important, ids) },
              { label: starred ? 'Remove star' : 'Add star', icon: <Star size={16} />, onClick: () => useMail.getState().setStarThreads(ids, !starred) },
              { label: 'Move to Inbox', icon: <Undo2 size={16} />, disabled: thread.inbox && !thread.trashed, onClick: () => moveToInbox(ids) },
              { label: 'Print all', icon: <Printer size={16} />, onClick: () => window.print() },
            ]}
          />
        </Popover>
      </div>
      <div className="toolbar__spacer" />
      <div className="toolbar__group toolbar__pager">
        {idx >= 0 ? (
          <span className="toolbar__range">
            {idx + 1} of {threadItems.length}
          </span>
        ) : null}
        <IconButton label="Newer" disabled={!newer} onClick={() => newer && navigate({ ...route, threadId: newer })}>
          <ChevronLeft size={20} />
        </IconButton>
        <IconButton label="Older" disabled={!older} onClick={() => older && navigate({ ...route, threadId: older })}>
          <ChevronRight size={20} />
        </IconButton>
      </div>
    </div>
  );
}

export function ThreadView({ route, model }: { route: Route; model: ListModel; embedded?: boolean }) {
  const threadId = route.threadId!;
  const thread = useMail((s) => s.threads[threadId]);
  const allMessages = useMail((s) => s.messages);
  const drafts = useMail((s) => s.drafts);
  const labels = useMail((s) => s.labels);
  const scrollRef = useRef<HTMLDivElement>(null);

  const msgs = useMemo(() => {
    if (!thread) return [];
    return thread.messageIds
      .map((id) => allMessages[id])
      .filter((m): m is Message => !!m && (!m.trashed || thread.trashed))
      .sort((a, b) => a.date - b.date);
  }, [thread, allMessages]);

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    msgs.filter((m) => m.unread).forEach((m) => s.add(m.id));
    if (msgs.length) s.add(msgs[msgs.length - 1].id);
    return s;
  });
  const [showAll, setShowAll] = useState(false);
  const seen = useRef(new Set(msgs.map((m) => m.id)));

  useEffect(() => {
    const fresh = msgs.filter((m) => !seen.current.has(m.id));
    if (fresh.length) {
      fresh.forEach((m) => seen.current.add(m.id));
      setExpanded((prev) => {
        const next = new Set(prev);
        fresh.forEach((m) => next.add(m.id));
        return next;
      });
    }
  }, [msgs]);

  const hasUnread = msgs.some((m) => m.unread);
  useEffect(() => {
    if (hasUnread) useMail.getState().markRead([threadId], true);
  }, [hasUnread, threadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [threadId]);

  const inlineDraft = Object.values(drafts).find((d) => d.threadId === threadId && d.mode === 'inline' && !d.sendAt);

  useEffect(() => {
    const onFocus = () => {
      requestAnimationFrame(() => {
        const el = scrollRef.current;
        el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    };
    window.addEventListener('inline-reply-focus', onFocus);
    return () => window.removeEventListener('inline-reply-focus', onFocus);
  }, []);

  if (!thread) {
    return (
      <div className="thread thread--missing">
        <ThreadToolbar route={route} model={model} threadId={threadId} />
        <div className="empty">
          <h2>Conversation not found</h2>
          <p>It may have been deleted permanently.</p>
          <button type="button" className="btn btn--outline" onClick={goToList}>
            Back to list
          </button>
        </div>
      </div>
    );
  }

  const chips = thread.labelIds.map((id) => labels.find((l) => l.id === id)).filter(Boolean);
  const hidden: string[] = [];
  if (!showAll && msgs.length > 4) {
    msgs.forEach((m, i) => {
      if (i > 0 && i < msgs.length - 1 && !expanded.has(m.id) && !m.unread) hidden.push(m.id);
    });
  }
  const hiddenSet = new Set(hidden);
  const snoozed = thread.snoozeUntil && thread.snoozeUntil > Date.now();
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  let pillShown = false;
  return (
    <section className="thread" aria-label={`Conversation: ${thread.subject}`}>
      <ThreadToolbar route={route} model={model} threadId={threadId} />
      <div className="thread__scroll" ref={scrollRef}>
        <div className="thread__inner">
          {thread.spam ? (
            <div className="banner banner--warn">
              <span>Why is this message in Spam? It’s similar to messages that were identified as spam in the past.</span>
              <button type="button" className="text-btn" onClick={() => notSpamThreads([threadId])}>
                Report not spam
              </button>
            </div>
          ) : null}
          {snoozed ? (
            <div className="banner">
              <Clock size={16} />
              <span>Snoozed until {formatShortDateTime(thread.snoozeUntil!)}</span>
              <button type="button" className="text-btn" onClick={() => unsnoozeThreads([threadId])}>
                Unsnooze
              </button>
            </div>
          ) : null}
          <div className="thread__head">
            <h2 className="thread__subject">{thread.subject}</h2>
            <div className="thread__chips">
              {thread.inbox && !thread.trashed && !snoozed ? (
                <span className="tag-chip">
                  Inbox
                  <button type="button" aria-label="Remove from Inbox" onClick={() => archiveThreads([threadId])}>
                    ×
                  </button>
                </span>
              ) : null}
              {thread.important ? (
                <span className="tag-chip tag-chip--imp">
                  <Bookmark size={12} fill="currentColor" /> Important
                </span>
              ) : null}
              {chips.map((l) =>
                l ? <LabelChip key={l.id} name={l.name} color={l.color} onRemove={() => useMail.getState().applyLabel([threadId], l.id, false)} onClick={() => navigate({ view: 'label', param: l.id })} /> : null,
              )}
            </div>
            <div className="thread__head-actions">
              <IconButton label="Print all" onClick={() => window.print()}>
                <Printer size={20} />
              </IconButton>
            </div>
          </div>

          <div className="thread__messages">
            {msgs.map((m, i) => {
              if (hiddenSet.has(m.id)) {
                if (pillShown) return null;
                pillShown = true;
                return (
                  <button key="pill" type="button" className="thread__pill" onClick={() => setShowAll(true)}>
                    <span className="thread__pill-count">{hidden.length}</span>
                    <span>{hidden.length === 1 ? 'older message' : 'older messages'}</span>
                    <ChevronDown size={16} />
                  </button>
                );
              }
              return (
                <MessageCard
                  key={m.id}
                  msg={m}
                  expanded={expanded.has(m.id)}
                  onToggle={() => toggle(m.id)}
                  isLast={i === msgs.length - 1}
                  threadId={threadId}
                  inlineOpen={!!inlineDraft}
                  spam={thread.spam}
                />
              );
            })}
          </div>

          {inlineDraft ? (
            <div className="thread__reply" id="inline-reply">
              <ComposeForm draftId={inlineDraft.id} variant="inline" />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

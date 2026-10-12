import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar, Icon, IconButton, LabelChip } from './kit';
import { MenuItem, MenuSeparator, Popover, useAnchor } from './Popover';
import { TriageButtons } from './Triage';
import { Composer } from './Compose';
import { useMail } from '../lib/store';
import { openCompose, openDialog, toast, useUI, confirmDialog } from '../lib/ui';
import { useViewModel } from '../lib/viewModel';
import {
  attachmentsOf,
  contactFor,
  deliveredMessages,
  isMeAddr,
  isPendingSend,
  isUnread,
  messageSnippet,
  subjectOf,
  firstName,
} from '../lib/mail';
import { formatFullDate, formatListDate, formatWhen } from '../lib/dates';
import { FILE_KIND_META, fileKind, formatSize } from '../lib/files';
import { navigate, searchHref } from '../lib/router';
import {
  applyLabels,
  cancelScheduled,
  composeReplyTo,
  deleteMessage,
  markMessageUnread,
  markRead,
  moveToInbox,
  notSpam,
  setImportant,
  toggleStar,
  unsnooze,
  unsubscribeMessage,
} from '../lib/actions';
import { smartReplies } from '../lib/autoreply';
import { downloadAttachment } from '../lib/download';
import { useViewport } from '../lib/hooks';
import type { Address, Attachment, Message, Thread } from '../lib/types';

/* ------------------------------------------------------------------ */
/* Body                                                                */
/* ------------------------------------------------------------------ */

function guardLinks(e: React.MouseEvent) {
  const a = (e.target as HTMLElement).closest?.('a');
  if (!a) return;
  let host = '';
  try {
    host = new URL(a.href).hostname;
  } catch {
    return;
  }
  if (a.getAttribute('href')?.startsWith('#')) return;
  if (host.endsWith('.example') || host === '') {
    e.preventDefault();
    toast(`Demo link to ${host || 'a local page'}. External navigation is disabled for fictional domains.`);
  }
}

function MessageBody({ message }: { message: Message }) {
  const [showQuote, setShowQuote] = useState(false);
  const rich = /^\s*<div style="background:/i.test(message.html) || /<table\b/i.test(message.html);
  return (
    <div className={`msg-body${rich ? ' rich' : ''}`} onClick={guardLinks}>
      <div className="msg-html" dangerouslySetInnerHTML={{ __html: message.html }} />
      {message.quoteHtml && (
        <>
          <button
            type="button"
            className="quote-toggle"
            aria-expanded={showQuote}
            aria-label={showQuote ? 'Hide trimmed content' : 'Show trimmed content'}
            data-tip={showQuote ? 'Hide trimmed content' : 'Show trimmed content'}
            onClick={() => setShowQuote((v) => !v)}
          >
            <Icon name="more_horiz" size="sm" />
          </button>
          {showQuote && <div className="quote-html" dangerouslySetInnerHTML={{ __html: message.quoteHtml }} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Attachments                                                         */
/* ------------------------------------------------------------------ */

function AttachmentCards({ message }: { message: Message }) {
  if (!message.attachments.length) return null;
  const open = (a: Attachment) => openDialog({ kind: 'attachment', threadId: message.threadId, messageId: message.id, attachmentId: a.id });
  return (
    <div className="att-section">
      <div className="att-title">
        {message.attachments.length} attachment{message.attachments.length === 1 ? '' : 's'}
      </div>
      <div className="att-grid">
        {message.attachments.map((a) => {
          const k = fileKind(a.mime, a.name);
          const meta = FILE_KIND_META[k];
          return (
            <div key={a.id} className="att-card">
              <button type="button" className="att-open" onClick={() => open(a)} aria-label={`Preview ${a.name}`}>
                <span className="att-thumb" style={{ ['--kind' as string]: meta.color }}>
                  {a.dataUrl && k === 'image' ? <img src={a.dataUrl} alt="" /> : <Icon name={meta.icon} fill />}
                </span>
                <span className="att-info">
                  <span className="att-name">{a.name}</span>
                  <span className="att-size">
                    {meta.label} · {formatSize(a.size)}
                  </span>
                </span>
              </button>
              <IconButton
                small
                icon="download"
                label="Download"
                onClick={() => {
                  const saved = downloadAttachment(a);
                  toast(`Downloaded ${saved}`);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Message card                                                        */
/* ------------------------------------------------------------------ */

function recipientSummary(m: Message): string {
  const all = [...m.to, ...m.cc];
  if (!all.length) return 'undisclosed recipients';
  const names = all.map((a) => (isMeAddr(a) ? 'me' : firstName(a)));
  const shown = names.slice(0, 3).join(', ');
  return names.length > 3 ? `${shown} +${names.length - 3}` : shown;
}

function AddressLine({ label, list }: { label: string; list: Address[] }) {
  if (!list.length) return null;
  return (
    <>
      <span className="det-k">{label}:</span>
      <span className="det-v">
        {list.map((a, i) => (
          <span key={a.email + i} className="det-addr">
            {a.name ? <strong>{a.name}</strong> : null} <span className="det-mail">&lt;{a.email}&gt;</span>
          </span>
        ))}
      </span>
    </>
  );
}

function MessageCard({
  thread,
  message,
  expanded,
  onToggle,
  now,
  onPrint,
}: {
  thread: Thread;
  message: Message;
  expanded: boolean;
  onToggle: () => void;
  now: number;
  onPrint: () => void;
}) {
  const details = useAnchor();
  const more = useAnchor();
  const fromMe = isMeAddr(message.from);
  const isDraft = message.draft;
  const scheduled = isPendingSend(message);
  const mail = useMail();
  const contact = contactFor(mail, message.from.email);
  const hasOthers = message.to.length + message.cc.length > 1;

  if (isDraft) {
    return (
      <div
        className="msg collapsed draft"
        role="button"
        tabIndex={0}
        onClick={() => openCompose({ draftId: message.id, threadId: thread.id, mode: 'reply' })}
        onKeyDown={(e) => e.key === 'Enter' && openCompose({ draftId: message.id, threadId: thread.id, mode: 'reply' })}
      >
        <Avatar name="Jordan Hayes" email={message.from.email} color="#b5401a" size={32} />
        <span className="msg-c-name">
          <span className="draft-tag">Draft</span>
        </span>
        <span className="msg-c-snippet">{messageSnippet(message, 120) || '(empty draft)'}</span>
        <span className="msg-c-date">{formatListDate(message.date, now)}</span>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div
        className={`msg collapsed${message.unread ? ' unread' : ''}`}
        role="button"
        tabIndex={0}
        aria-expanded={false}
        onClick={onToggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle())}
      >
        <Avatar name={message.from.name || message.from.email} email={message.from.email} color={contact?.color} size={32} />
        <span className="msg-c-name">{fromMe ? 'me' : message.from.name || message.from.email}</span>
        <span className="msg-c-snippet">{messageSnippet(message, 140)}</span>
        {message.attachments.length > 0 && <Icon name="attach_file" size="sm" className="row-att" />}
        <span className="msg-c-date">{scheduled ? `Scheduled ${formatListDate(message.scheduledAt!, now)}` : formatListDate(message.date, now)}</span>
      </div>
    );
  }

  return (
    <article className={`msg expanded${scheduled ? ' scheduled' : ''}`} aria-label={`Message from ${message.from.name || message.from.email}`}>
      <header className="msg-head">
        <button type="button" className="msg-head-main" onClick={onToggle} aria-expanded="true" aria-label="Collapse message">
          <Avatar name={message.from.name || message.from.email} email={message.from.email} color={contact?.color} size={40} />
          <span className="msg-who">
            <span className="msg-from">
              <strong>{message.from.name || message.from.email}</strong>
              {message.from.name && <span className="msg-addr">&lt;{message.from.email}&gt;</span>}
            </span>
          </span>
        </button>
        {message.unsubscribe && !fromMe && (
          <button
            type="button"
            className="unsub"
            onClick={() =>
              confirmDialog(
                { title: `Unsubscribe from ${message.from.name || message.from.email}?`, body: `You’ll stop receiving mailing-list messages from ${message.from.email}. It may take a few days to take effect.`, confirmLabel: 'Unsubscribe' },
                () => {
                  unsubscribeMessage(thread.id, message.id);
                  toast(`Unsubscribed from ${message.from.name || message.from.email}.`);
                },
              )
            }
          >
            Unsubscribe
          </button>
        )}
        <span className="msg-meta">
          <span className="msg-date" title={formatFullDate(message.date, now, false)}>
            {scheduled ? `Scheduled ${formatWhen(message.scheduledAt!, now)}` : formatFullDate(message.date, now)}
          </span>
          {!scheduled && (
            <IconButton small icon="reply" label="Reply" onClick={() => composeReplyTo(thread.id, message.id, 'reply')} />
          )}
          <IconButton small icon="more_vert" label="More" onClick={more.toggle} active={more.open} />
        </span>
        <span className="msg-to-row">
          <button type="button" className="msg-to" onClick={details.toggle} aria-expanded={details.open}>
            to {recipientSummary(message)}
            <Icon name="arrow_drop_down" size="sm" />
          </button>
        </span>
      </header>

      {scheduled && (
        <div className="banner sched-banner">
          <Icon name="schedule_send" size="sm" />
          <span>This message is scheduled to send {formatWhen(message.scheduledAt!, now)}.</span>
          <button type="button" className="link-btn" onClick={() => cancelScheduled(message.id, thread.id)}>
            Cancel send
          </button>
        </div>
      )}

      <MessageBody message={message} />
      <AttachmentCards message={message} />

      {details.open && (
        <Popover anchor={details.el} onClose={details.close} role="dialog" className="msg-details">
          <div className="det-grid">
            <span className="det-k">from:</span>
            <span className="det-v">
              <strong>{message.from.name}</strong> <span className="det-mail">&lt;{message.from.email}&gt;</span>
            </span>
            <AddressLine label="to" list={message.to} />
            <AddressLine label="cc" list={message.cc} />
            <AddressLine label="bcc" list={message.bcc} />
            <span className="det-k">date:</span>
            <span className="det-v">{formatFullDate(message.date, now, false)}</span>
            <span className="det-k">subject:</span>
            <span className="det-v">{subjectOf(thread)}</span>
          </div>
        </Popover>
      )}
      {more.open && (
        <Popover anchor={more.el} onClose={more.close} align="end">
          {!scheduled && (
            <>
              <MenuItem icon="reply" label="Reply" onClick={() => composeReplyTo(thread.id, message.id, 'reply')} />
              {hasOthers && <MenuItem icon="reply_all" label="Reply to all" onClick={() => composeReplyTo(thread.id, message.id, 'replyAll')} />}
              <MenuItem icon="forward" label="Forward" onClick={() => composeReplyTo(thread.id, message.id, 'forward')} />
              <MenuSeparator />
            </>
          )}
          <MenuItem icon="filter_alt" label={`Find emails from ${message.from.name ? message.from.name.split(' ')[0] : message.from.email}`} onClick={() => navigate(searchHref(`from:${message.from.email}`))} />
          <MenuItem icon="mark_email_unread" label="Mark as unread" onClick={() => { markMessageUnread(thread.id, message.id); }} />
          <MenuItem icon="print" label="Print" onClick={onPrint} />
          <MenuSeparator />
          <MenuItem icon="delete" label="Delete this message" danger onClick={() => deleteMessage(thread.id, message.id)} />
        </Popover>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Thread                                                              */
/* ------------------------------------------------------------------ */

export function ThreadView({ threadId, embedded }: { threadId: string; embedded?: boolean }) {
  const mail = useMail();
  const ui = useUI();
  const vm = useViewModel();
  const vp = useViewport();
  const thread = mail.threads[threadId];
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showAllOlder, setShowAllOlder] = useState(false);

  const initial = useMemo(() => {
    const set = new Set<string>();
    if (!thread) return set;
    const delivered = deliveredMessages(thread);
    const last = delivered[delivered.length - 1];
    if (last) set.add(last.id);
    for (const m of delivered) if (m.unread) set.add(m.id);
    for (const m of thread.messages) if (isPendingSend(m)) set.add(m.id);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);
  const [expanded, setExpanded] = useState<Set<string>>(initial);

  // Reset when switching conversations (reading pane keeps the component mounted).
  useEffect(() => {
    setExpanded(initial);
    setShowAllOlder(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [threadId]); // eslint-disable-line react-hooks/exhaustive-deps

  const lastDeliveredId = thread ? deliveredMessages(thread).at(-1)?.id : undefined;
  const prevLast = useRef(lastDeliveredId);
  useEffect(() => {
    if (lastDeliveredId && prevLast.current !== lastDeliveredId) {
      setExpanded((s) => new Set(s).add(lastDeliveredId));
    }
    prevLast.current = lastDeliveredId;
  }, [lastDeliveredId]);

  // Opening a conversation reads it.
  useEffect(() => {
    if (thread && isUnread(thread)) {
      const id = setTimeout(() => markRead([threadId], true), embedded ? 500 : 120);
      return () => clearTimeout(id);
    }
  }, [threadId, thread && isUnread(thread)]); // eslint-disable-line react-hooks/exhaustive-deps

  const rowIndex = vm.rows.findIndex((r) => r.thread.id === threadId);
  const listHref = vm.hrefFor(undefined);
  const backToList = () => navigate(listHref);

  const advance = () => {
    const rows = vm.rows;
    const idx = rowIndex;
    const mode = mail.settings.autoAdvance;
    if (!embedded && mode === 'newer' && idx > 0) return navigate(vm.hrefFor(rows[idx - 1].thread.id));
    if (!embedded && mode === 'older' && idx >= 0 && idx < rows.length - 1) return navigate(vm.hrefFor(rows[idx + 1].thread.id));
    backToList();
  };

  const composes = ui.composes.filter((c) => c.threadId === threadId && (c.mode === 'reply' || c.mode === 'replyAll') && !c.popped);
  const activeDraftIds = new Set(composes.map((c) => c.draftId));

  if (!thread) {
    return (
      <section className="thread-pane">
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="mail_off" />
          </div>
          <h2>This conversation is no longer available</h2>
          <p>It may have been deleted permanently.</p>
          <button type="button" className="btn outline" onClick={backToList}>
            Back to {vm.title}
          </button>
        </div>
      </section>
    );
  }

  const msgs = thread.messages.filter((m) => !activeDraftIds.has(m.id));
  const delivered = deliveredMessages(thread);
  const last = delivered[delivered.length - 1];
  const replyTarget = last ?? undefined;
  const canReply = !!replyTarget && !thread.spam;
  const multi = !!replyTarget && replyTarget.to.length + replyTarget.cc.length + 1 > 2;
  const suggestions = mail.settings.smartReplies && replyTarget && !isMeAddr(replyTarget.from) && composes.length === 0 ? smartReplies(replyTarget) : [];
  const total = vm.rows.length;
  const newer = rowIndex > 0 ? vm.rows[rowIndex - 1] : undefined;
  const older = rowIndex >= 0 && rowIndex < total - 1 ? vm.rows[rowIndex + 1] : undefined;

  // Collapse long conversations: first message, "N older messages", then the last two.
  const hiddenIds = new Set<string>();
  if (!showAllOlder && msgs.length > 4) {
    msgs.slice(1, msgs.length - 2).forEach((m) => {
      if (!expanded.has(m.id) && !m.draft && !m.unread) hiddenIds.add(m.id);
    });
  }
  const firstHiddenIdx = msgs.findIndex((m) => hiddenIds.has(m.id));
  const attachmentsTotal = attachmentsOf(thread).length;

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const print = () => {
    setExpanded(new Set(msgs.map((m) => m.id)));
    setShowAllOlder(true);
    setTimeout(() => window.print(), 80);
  };

  const allExpanded = msgs.filter((m) => !m.draft).every((m) => expanded.has(m.id));

  return (
    <section className={`thread-pane${embedded ? ' embedded' : ''}`} aria-label={`Conversation: ${subjectOf(thread)}`}>
      <div className="toolbar thread-toolbar" role="toolbar" aria-label="Conversation actions">
        {!embedded && <IconButton icon="arrow_back" label={`Back to ${vm.title}`} onClick={backToList} />}
        {embedded && <IconButton icon="close" label="Close conversation" onClick={backToList} />}
        <TriageButtons ids={[thread.id]} view={vm.page === 'mail' ? vm.view : null} onRemoved={advance} compact={vp === 'mobile'} />
        <span className="tb-spacer" />
        {rowIndex >= 0 && vp !== 'mobile' && (
          <div className="pager">
            <span className="pager-text">
              {rowIndex + 1} of {total}
            </span>
            <IconButton small icon="chevron_left" label="Newer" disabled={!newer} onClick={() => newer && navigate(vm.hrefFor(newer.thread.id))} />
            <IconButton small icon="chevron_right" label="Older" disabled={!older} onClick={() => older && navigate(vm.hrefFor(older.thread.id))} />
          </div>
        )}
        {rowIndex >= 0 && vp === 'mobile' && (
          <>
            <IconButton small icon="expand_less" label="Newer" disabled={!newer} onClick={() => newer && navigate(vm.hrefFor(newer.thread.id))} />
            <IconButton small icon="expand_more" label="Older" disabled={!older} onClick={() => older && navigate(vm.hrefFor(older.thread.id))} />
          </>
        )}
      </div>

      <div className="thread-scroll" ref={scrollRef}>
        <div className="thread-inner">
          <div className="thread-head">
            <h2 className="thread-subject">{subjectOf(thread)}</h2>
            <span className="thread-chips">
              {thread.category !== 'primary' && thread.inbox && <span className="chip sys">{thread.category[0].toUpperCase() + thread.category.slice(1)}</span>}
              {thread.labelIds.map((id) => {
                const l = mail.labels.find((x) => x.id === id);
                return l ? <LabelChip key={id} label={l} onRemove={() => applyLabels([thread.id], [], [id])} /> : null;
              })}
            </span>
            <span className="thread-head-actions">
              <IconButton
                small
                icon="label_important"
                fill={thread.important}
                label={thread.important ? 'Mark as not important' : 'Mark as important'}
                className={thread.important ? 'imp-on' : ''}
                onClick={() => setImportant([thread.id], !thread.important)}
              />
              <IconButton small icon="star" fill={thread.starred} label={thread.starred ? 'Remove star' : 'Add star'} className={thread.starred ? 'star-on' : ''} onClick={() => toggleStar([thread.id])} />
              <IconButton
                small
                icon={allExpanded ? 'unfold_less' : 'unfold_more'}
                label={allExpanded ? 'Collapse all' : 'Expand all'}
                onClick={() => setExpanded(allExpanded ? new Set(lastDeliveredId ? [lastDeliveredId] : []) : new Set(msgs.map((m) => m.id)))}
              />
              <IconButton small icon="print" label="Print all" onClick={print} />
            </span>
          </div>

          {thread.trashed && (
            <div className="banner state-banner">
              <Icon name="delete" size="sm" />
              <span>This conversation is in Trash.</span>
              <button type="button" className="link-btn" onClick={() => moveToInbox([thread.id])}>
                Move to Inbox
              </button>
            </div>
          )}
          {thread.spam && !thread.trashed && (
            <div className="banner state-banner warn">
              <Icon name="report" size="sm" />
              <span>This message was reported as spam. Links and attachments may be unsafe.</span>
              <button type="button" className="link-btn" onClick={() => notSpam([thread.id])}>
                Not spam
              </button>
            </div>
          )}
          {thread.snoozedUntil && thread.snoozedUntil > ui.now && (
            <div className="banner state-banner">
              <Icon name="schedule" size="sm" />
              <span>Snoozed until {formatWhen(thread.snoozedUntil, ui.now)}.</span>
              <button type="button" className="link-btn" onClick={() => unsnooze([thread.id])}>
                Unsnooze
              </button>
            </div>
          )}

          <div className="msg-list">
            {msgs.map((m, i) => {
              if (hiddenIds.has(m.id)) {
                if (i !== firstHiddenIdx) return null;
                return (
                  <button key="older" type="button" className="older-bar" onClick={() => setShowAllOlder(true)}>
                    <span className="older-count">{hiddenIds.size}</span>
                    <span>older message{hiddenIds.size === 1 ? '' : 's'}</span>
                    <Icon name="unfold_more" size="sm" />
                  </button>
                );
              }
              return (
                <MessageCard
                  key={m.id}
                  thread={thread}
                  message={m}
                  expanded={expanded.has(m.id) || m.draft || isPendingSend(m)}
                  onToggle={() => toggle(m.id)}
                  now={ui.now}
                  onPrint={print}
                />
              );
            })}
          </div>

          {composes.map((w) => (
            <Composer key={w.id} win={w} variant="inline" />
          ))}

          {composes.length === 0 && canReply && (
            <div className="reply-area">
              {suggestions.length > 0 && (
                <div className="smart-replies" role="group" aria-label="Suggested replies">
                  {suggestions.map((s) => (
                    <button key={s} type="button" className="smart-chip" onClick={() => replyTarget && composeReplyTo(thread.id, replyTarget.id, 'reply', s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div className="reply-bar">
                <button type="button" className="btn outline pill" onClick={() => replyTarget && composeReplyTo(thread.id, replyTarget.id, 'reply')}>
                  <Icon name="reply" size="sm" /> Reply
                </button>
                {multi && (
                  <button type="button" className="btn outline pill" onClick={() => replyTarget && composeReplyTo(thread.id, replyTarget.id, 'replyAll')}>
                    <Icon name="reply_all" size="sm" /> Reply all
                  </button>
                )}
                <button type="button" className="btn outline pill" onClick={() => replyTarget && composeReplyTo(thread.id, replyTarget.id, 'forward')}>
                  <Icon name="forward" size="sm" /> Forward
                </button>
              </div>
            </div>
          )}

          {attachmentsTotal > 3 && <div className="thread-foot">{attachmentsTotal} attachments in this conversation</div>}
        </div>
      </div>
    </section>
  );
}

export function ThreadPlaceholder() {
  return (
    <section className="thread-pane placeholder">
      <div className="empty-state">
        <div className="empty-icon">
          <Icon name="chrome_reader_mode" />
        </div>
        <h2>No conversation selected</h2>
        <p>Select a conversation to read it here.</p>
      </div>
    </section>
  );
}

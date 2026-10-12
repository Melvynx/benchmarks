import { useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  MdArrowBack,
  MdArrowDropDown,
  MdChevronLeft,
  MdChevronRight,
  MdContentCopy,
  MdDeleteForever,
  MdDownload,
  MdForward,
  MdLabelImportant,
  MdLabelImportantOutline,
  MdLabelOutline,
  MdMoreHoriz,
  MdMoreVert,
  MdOutlineArchive,
  MdOutlineDelete,
  MdOutlineDriveFileMove,
  MdOutlineLock,
  MdOutlineMarkEmailUnread,
  MdOutlineMoveToInbox,
  MdOutlineReport,
  MdOutlineWatchLater,
  MdPersonSearch,
  MdPrint,
  MdReply,
  MdReplyAll,
  MdSchedule,
  MdSearch,
  MdSend,
  MdStar,
  MdStarBorder,
  MdUnfoldLess,
  MdUnfoldMore,
  MdVolumeOff,
  MdWarningAmber,
  MdZoomIn,
} from 'react-icons/md';
import type { Attachment, Message, Thread } from '../types';
import { useIsMobile, useNow, useThreadList } from '../hooks';
import { actions } from '../lib/actions';
import { openCompose, openReply, reopenWindow } from '../lib/composeActions';
import { fieldsFromDraft } from '../lib/compose';
import { formatFullDate, formatFuture, formatListDate, formatLongDate, relativeAgo } from '../lib/date';
import { realMessages } from '../lib/mailbox';
import { listOf, navigate, withThread, type Route } from '../lib/router';
import { highlightTerms, parseQuery } from '../lib/search';
import { cn, firstName, formatSize, htmlToText, sameEmail, stripQuote } from '../lib/utils';
import { downloadAttachment, fileKind, previewSrc } from '../lib/visuals';
import { MY_EMAIL, useMail } from '../store/mail';
import { useSettings } from '../store/settings';
import { confirmDialog, showToast, ui, useUI } from '../store/ui';
import { InlineComposer } from './compose/Composer';
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus';
import { Avatar, Button, IconButton, LabelChip, MenuDivider, MenuItem, Popover, SystemChip } from './ui';

type ThreadRoute = Exclude<Route, { view: 'settings' }> & { threadId: string };

export function ThreadView({ route, embedded }: { route: ThreadRoute; embedded?: boolean }) {
  const thread = useMail((s) => s.threads[route.threadId]);
  const isMobile = useIsMobile();

  useEffect(() => {
    const id = route.threadId;
    const current = ui.get().inline;
    if (current && current.threadId !== id) ui.set({ inline: null });
    ui.set({ cursor: id });
    const t = useMail.getState().threads[id];
    if (t && !isMobile) {
      const draft = t.messages.find((m) => m.status === 'draft');
      if (draft && t.messages.some((m) => m.status !== 'draft') && ui.get().inline?.threadId !== id) openReply(id, draft.replyMode ?? 'reply', undefined, { passive: true });
    }
    return () => {
      if (ui.get().inline?.threadId === id) ui.set({ inline: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.threadId]);

  const msgCount = thread?.messages.length ?? 0;
  useEffect(() => {
    if (thread?.unread) useMail.getState().patch([thread.id], (t) => ({ ...t, unread: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.threadId, msgCount]);

  if (!thread) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 items-center px-2">
          {!embedded && <IconButton icon={MdArrowBack} label="Back" onClick={() => navigate(listOf(route))} />}
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-fg3">
          <MdSearch size={48} className="text-line-strong" />
          <p className="mt-3 text-base text-fg">This conversation could not be found.</p>
          <p className="mt-1 text-sm">It may have been deleted forever.</p>
        </div>
      </div>
    );
  }
  return <ThreadContent key={thread.id} thread={thread} route={route} embedded={embedded} />;
}

function ThreadContent({ thread, route, embedded }: { thread: Thread; route: ThreadRoute; embedded?: boolean }) {
  const labels = useMail((s) => s.labels);
  const isMobile = useIsMobile();
  const inline = useUI((s) => s.inline);
  const now = useNow(30_000);
  const msgs = thread.messages.filter((m) => m.status !== 'draft');
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    const last = msgs[msgs.length - 1];
    if (last) s.add(last.id);
    msgs.forEach((m) => m.status === 'scheduled' && s.add(m.id));
    return s;
  });
  const [showAll, setShowAll] = useState(msgs.length <= 4);
  const prevCount = useRef(msgs.length);
  useEffect(() => {
    if (msgs.length > prevCount.current) {
      const newest = msgs[msgs.length - 1];
      setExpanded((s) => new Set([...s, newest.id]));
    }
    prevCount.current = msgs.length;
  }, [msgs]);

  const highlight = route.view === 'search' ? highlightTerms(parseQuery(route.query)) : [];
  const threadLabels = thread.labelIds.map((id) => labels.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l);
  const inlineActive = inline?.threadId === thread.id;
  const participants = new Set(msgs.flatMap((m) => [m.from.email, ...m.to.map((x) => x.email), ...m.cc.map((x) => x.email)]).filter((e) => !sameEmail(e, MY_EMAIL)));
  const allExpanded = msgs.every((m) => expanded.has(m.id));

  const toggle = (id: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const visible: Array<Message | 'gap'> = showAll || msgs.length <= 4 ? msgs : [msgs[0], 'gap', ...msgs.slice(-2)];
  const hiddenCount = msgs.length - 3;
  const onlyScheduled = msgs.length > 0 && msgs.every((m) => m.status === 'scheduled');

  return (
    <div className="print-only-thread flex h-full min-h-0 flex-col" data-testid="thread-view">
      <ThreadToolbar thread={thread} route={route} embedded={embedded} allExpanded={allExpanded} onToggleAll={() => {
        if (allExpanded) setExpanded(new Set([msgs[msgs.length - 1]?.id].filter(Boolean) as string[]));
        else {
          setShowAll(true);
          setExpanded(new Set(msgs.map((m) => m.id)));
        }
      }} />
      <div className="min-h-0 flex-1 overflow-y-auto" id="thread-scroll">
        <div className={cn('mx-auto pb-24 md:pb-10', embedded ? 'px-4' : 'px-4 md:pr-6 md:pl-[72px]')}>
          <div className="flex items-start gap-3 pt-4 pb-3 md:pt-5 md:pl-[52px]">
            <h2 className="min-w-0 flex-1 text-xl leading-7 text-fg md:text-[22px]" data-testid="thread-subject">
              <span className="mr-2">{thread.subject || '(no subject)'}</span>
              {thread.important && <MdLabelImportant size={20} className="mr-2 inline align-[-3px] text-star" aria-label="Important" />}
              <span className="inline-flex flex-wrap items-center gap-1.5 align-[3px]">
                {thread.inInbox && !thread.trashed && !thread.spam && <SystemChip text="Inbox" onRemove={() => actions.archive([thread.id])} />}
                {thread.trashed && <SystemChip text="Trash" onRemove={() => actions.moveToInbox([thread.id])} />}
                {thread.spam && <SystemChip text="Spam" onRemove={() => actions.notSpam([thread.id])} />}
                {threadLabels.map((l) => (
                  <LabelChip key={l.id} label={l} size="md" onRemove={() => actions.applyLabels([thread.id], [], [l.id])} onClick={() => navigate({ view: 'label', labelId: l.id })} />
                ))}
              </span>
            </h2>
            {!isMobile && <IconButton icon={MdPrint} label="Print all" onClick={() => window.print()} />}
          </div>

          {thread.spam && (
            <Banner tone="danger" icon={MdWarningAmber} title="Why is this message in spam?" action={<Button variant="outlined" onClick={() => actions.notSpam([thread.id])}>Report not spam</Button>}>
              It is similar to messages that were identified as spam in the past. Be careful with links and never share your password.
            </Banner>
          )}
          {thread.muted && (
            <Banner tone="info" icon={MdVolumeOff} title="This conversation is muted." action={<Button variant="text" onClick={() => actions.unmute([thread.id])}>Unmute</Button>}>
              New messages in this conversation will skip your inbox.
            </Banner>
          )}

          {visible.map((m, i) =>
            m === 'gap' ? (
              <button
                key="gap"
                type="button"
                onClick={() => setShowAll(true)}
                className="group relative my-1 flex h-6 w-full items-center md:pl-0"
                aria-label={`Show ${hiddenCount} older messages`}
              >
                <span className="absolute inset-x-0 top-1/2 border-t border-line" />
                <span className="absolute inset-x-0 top-[calc(50%+4px)] border-t border-line" />
                <span className="relative z-[1] ml-0 flex size-10 items-center justify-center rounded-full border border-line bg-panel text-sm font-medium text-fg2 group-hover:bg-hover">{hiddenCount}</span>
              </button>
            ) : (
              <MessageItem
                key={m.id}
                m={m}
                thread={thread}
                expanded={expanded.has(m.id)}
                onToggle={() => toggle(m.id)}
                canCollapse={msgs.length > 1}
                first={i === 0}
                highlight={highlight}
                now={now}
                participantsCount={participants.size}
              />
            ),
          )}

          <InlineComposer threadId={thread.id} />

          {!inlineActive && !onlyScheduled && msgs.length > 0 && (
            <div className="print-hide flex flex-wrap gap-2 pt-4 pb-6 md:gap-3 md:pl-[52px]">
              <ReplyButton icon={MdReply} label="Reply" onClick={() => openReply(thread.id, 'reply')} />
              {participants.size > 1 && <ReplyButton icon={MdReplyAll} label="Reply all" onClick={() => openReply(thread.id, 'replyAll')} />}
              <ReplyButton icon={MdForward} label="Forward" onClick={() => openReply(thread.id, 'forward')} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReplyButton({ icon: Icon, label, onClick }: { icon: IconType; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-10 items-center gap-2 rounded-full border border-line-strong pr-5 pl-4 text-sm font-medium text-fg2 hover:bg-hover">
      <Icon size={18} /> {label}
    </button>
  );
}

function Banner({ tone, icon: Icon, title, children, action }: { tone: 'danger' | 'info'; icon: IconType; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-start gap-3 rounded-xl p-4 md:ml-[52px]', tone === 'danger' ? 'bg-[#fce8e6] text-[#5f2120] dark:bg-[#4a1f1c] dark:text-[#f6d3cf]' : 'bg-chip text-fg2')}>
      <Icon size={22} className="shrink-0" />
      <div className="min-w-[200px] flex-1 text-sm">
        <div className="font-medium">{title}</div>
        <div className="mt-0.5 opacity-90">{children}</div>
      </div>
      {action}
    </div>
  );
}

function ToolbarMenu({ icon, label, kind, render, disabled }: { icon: IconType; label: string; kind?: 'labels' | 'move' | 'snooze'; render: (close: () => void) => React.ReactNode; disabled?: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const req = useUI((s) => s.menuRequest);
  useEffect(() => {
    if (req && kind && req.kind === kind && req.target === 'thread') {
      setOpen(true);
      ui.set({ menuRequest: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);
  return (
    <>
      <IconButton ref={ref} icon={icon} label={label} onClick={() => setOpen((o) => !o)} active={open} disabled={disabled} />
      <Popover open={open} anchor={ref.current} onClose={() => setOpen(false)}>
        {render(() => setOpen(false))}
      </Popover>
    </>
  );
}

function ThreadToolbar({ thread, route, embedded, allExpanded, onToggleAll }: { thread: Thread; route: ThreadRoute; embedded?: boolean; allExpanded: boolean; onToggleAll: () => void }) {
  const list = useThreadList(listOf(route));
  const isMobile = useIsMobile();
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [mobileMode, setMobileMode] = useState<'main' | 'move' | 'labels' | 'snooze'>('main');
  const idx = list.findIndex((t) => t.id === thread.id);
  const newer = idx > 0 ? list[idx - 1] : null;
  const older = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  const ids = [thread.id];
  const back = () => navigate(listOf(route));
  const lastSender = realMessages(thread).at(-1)?.from;

  const moreItems = (close: () => void) => (
    <div className="w-64">
      {isMobile && mobileMode === 'main' && (
        <>
          <MenuItem icon={MdOutlineDriveFileMove} label="Move to" onClick={() => setMobileMode('move')} />
          <MenuItem icon={MdLabelOutline} label="Change labels" onClick={() => setMobileMode('labels')} />
          <MenuItem icon={MdOutlineWatchLater} label="Snooze" onClick={() => setMobileMode('snooze')} />
          <MenuItem icon={thread.starred ? MdStarBorder : MdStar} label={thread.starred ? 'Remove star' : 'Add star'} onClick={() => { close(); actions.star(ids, !thread.starred); }} />
          <MenuItem icon={MdOutlineReport} label="Report spam" onClick={() => { close(); actions.spam(ids); }} />
          <MenuDivider />
        </>
      )}
      {(!isMobile || mobileMode === 'main') && (
        <>
          <MenuItem icon={thread.important ? MdLabelImportantOutline : MdLabelImportant} label={thread.important ? 'Mark as not important' : 'Mark as important'} onClick={() => { close(); actions.important(ids, !thread.important); }} />
          <MenuItem icon={MdVolumeOff} label={thread.muted ? 'Unmute' : 'Mute'} onClick={() => { close(); (thread.muted ? actions.unmute : actions.mute)(ids); }} />
          <MenuItem icon={allExpanded ? MdUnfoldLess : MdUnfoldMore} label={allExpanded ? 'Collapse all' : 'Expand all'} onClick={() => { close(); onToggleAll(); }} />
          <MenuItem icon={MdPrint} label="Print all" onClick={() => { close(); setTimeout(() => window.print(), 50); }} />
          {lastSender && (
            <MenuItem icon={MdPersonSearch} label="Filter messages like these" onClick={() => { close(); navigate({ view: 'search', query: `from:${lastSender.email}` }); }} />
          )}
        </>
      )}
      {isMobile && mobileMode === 'move' && <MoveMenu ids={ids} onClose={close} />}
      {isMobile && mobileMode === 'labels' && <LabelMenu ids={ids} onClose={close} />}
      {isMobile && mobileMode === 'snooze' && <SnoozeMenu ids={ids} onClose={close} />}
    </div>
  );

  const closeMore = () => {
    setMore(null);
    setMobileMode('main');
  };

  if (isMobile) {
    return (
      <div className="print-hide flex h-14 shrink-0 items-center gap-0.5 px-1" role="toolbar" aria-label="Conversation actions">
        <IconButton icon={MdArrowBack} label="Back" onClick={back} />
        <div className="flex-1" />
        {thread.trashed ? (
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(ids)} />
        ) : thread.inInbox ? (
          <IconButton icon={MdOutlineArchive} label="Archive" onClick={() => actions.archive(ids)} />
        ) : (
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(ids)} />
        )}
        <IconButton icon={thread.trashed ? MdDeleteForever : MdOutlineDelete} label="Delete" onClick={() => (thread.trashed ? actions.deleteForever(ids) : actions.trash(ids))} />
        <IconButton icon={MdOutlineMarkEmailUnread} label="Mark as unread" onClick={() => actions.markRead(ids, false, { leave: true })} />
        <IconButton icon={MdMoreVert} label="More" onClick={(e) => setMore(e.currentTarget)} />
        <Popover open={!!more} anchor={more} onClose={closeMore} placement="bottom-end">
          {moreItems(closeMore)}
        </Popover>
      </div>
    );
  }

  return (
    <div className="print-hide flex h-12 shrink-0 items-center gap-0.5 px-2 md:pl-3" role="toolbar" aria-label="Conversation actions">
      {!embedded && <IconButton icon={MdArrowBack} label={`Back to ${route.view === 'search' ? 'Search results' : 'list'}`} onClick={back} />}
      {thread.trashed ? (
        <>
          <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(ids)} />
          <IconButton icon={MdDeleteForever} label="Delete forever" onClick={() => actions.deleteForever(ids)} />
        </>
      ) : thread.spam ? (
        <>
          <button type="button" onClick={() => actions.notSpam(ids)} className="h-8 rounded px-3 text-sm font-medium text-fg2 hover:bg-hover">
            Not spam
          </button>
          <IconButton icon={MdDeleteForever} label="Delete forever" onClick={() => actions.deleteForever(ids)} />
        </>
      ) : (
        <>
          {thread.inInbox ? (
            <IconButton icon={MdOutlineArchive} label="Archive" onClick={() => actions.archive(ids)} />
          ) : (
            <IconButton icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => actions.moveToInbox(ids)} />
          )}
          <IconButton icon={MdOutlineReport} label="Report spam" onClick={() => actions.spam(ids)} />
          <IconButton icon={MdOutlineDelete} label="Delete" onClick={() => actions.trash(ids)} />
        </>
      )}
      <span className="mx-1.5 h-5 w-px bg-line" />
      <IconButton icon={MdOutlineMarkEmailUnread} label="Mark as unread" onClick={() => actions.markRead(ids, false, { leave: true })} />
      {thread.snoozedUntil ? (
        <IconButton icon={MdOutlineWatchLater} label="Unsnooze" onClick={() => actions.unsnooze(ids)} />
      ) : (
        <ToolbarMenu icon={MdOutlineWatchLater} label="Snooze" kind="snooze" render={(close) => <SnoozeMenu ids={ids} onClose={close} />} disabled={thread.trashed || thread.spam} />
      )}
      <span className="mx-1.5 h-5 w-px bg-line" />
      <ToolbarMenu icon={MdOutlineDriveFileMove} label="Move to" kind="move" render={(close) => <MoveMenu ids={ids} onClose={close} />} />
      <ToolbarMenu icon={MdLabelOutline} label="Labels" kind="labels" render={(close) => <LabelMenu ids={ids} onClose={close} />} />
      <IconButton icon={MdMoreVert} label="More" onClick={(e) => setMore(e.currentTarget)} />
      <Popover open={!!more} anchor={more} onClose={closeMore}>
        {moreItems(closeMore)}
      </Popover>
      <div className="ml-auto flex items-center gap-1 text-xs text-fg2">
        {idx >= 0 && (
          <span className="px-2 whitespace-nowrap">
            {idx + 1} of {list.length}
          </span>
        )}
        <IconButton icon={MdChevronLeft} label="Newer" size="sm" disabled={!newer} onClick={() => newer && navigate(withThread(listOf(route), newer.id))} />
        <IconButton icon={MdChevronRight} label="Older" size="sm" disabled={!older} onClick={() => older && navigate(withThread(listOf(route), older.id))} />
      </div>
    </div>
  );
}

function highlightHtml(html: string, terms: string[]): string {
  if (!terms.length) return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const re = new RegExp(`(${terms.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const text = node.nodeValue ?? '';
    if (!re.test(text)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    text.split(re).forEach((part, i) => {
      if (i % 2 === 1) {
        const mark = document.createElement('mark');
        mark.textContent = part;
        frag.appendChild(mark);
      } else if (part) frag.appendChild(document.createTextNode(part));
    });
    node.replaceWith(frag);
  }
  return tpl.innerHTML;
}

function recipientSummary(m: Message): string {
  const all = [...m.to, ...m.cc];
  if (!all.length) return 'undisclosed recipients';
  return all.map((p) => (sameEmail(p, MY_EMAIL) ? 'me' : firstName(p.name || p.email))).slice(0, 4).join(', ') + (all.length > 4 ? ` +${all.length - 4}` : '');
}

function MessageItem({
  m,
  thread,
  expanded,
  onToggle,
  canCollapse,
  first,
  highlight,
  now,
  participantsCount,
}: {
  m: Message;
  thread: Thread;
  expanded: boolean;
  onToggle: () => void;
  canCollapse: boolean;
  first: boolean;
  highlight: string[];
  now: number;
  participantsCount: number;
}) {
  const [showQuote, setShowQuote] = useState(false);
  const [details, setDetails] = useState<HTMLElement | null>(null);
  const [more, setMore] = useState<HTMLElement | null>(null);
  const [card, setCard] = useState<HTMLElement | null>(null);
  const displayName = useSettings((s) => s.displayName);
  const contacts = useMail((s) => s.contacts);
  const unsubscribed = useMail((s) => s.unsubscribed);
  const fromMe = sameEmail(m.from, MY_EMAIL);
  const name = fromMe ? displayName || m.from.name : m.from.name || m.from.email;
  const contact = contacts.find((c) => sameEmail(c, m.from));
  const isOrg = contact?.kind === 'org' || /no-?reply|notifications|deals|hello@|store@|weekly@|brief@|team@|trips@|issue@/i.test(m.from.email);
  const body = useMemo(() => highlightHtml(stripQuote(m.body), highlight), [m.body, highlight]);
  const scheduled = m.status === 'scheduled';

  const onBodyClick = (e: React.MouseEvent) => {
    const a = (e.target as HTMLElement).closest('a');
    if (!a) return;
    e.preventDefault();
    const href = a.getAttribute('href') ?? '';
    if (!href || href.startsWith('#')) {
      showToast('Links in sample emails don’t go anywhere in this offline demo.');
      return;
    }
    if (href.startsWith('mailto:')) {
      openCompose({ to: [{ name: '', email: href.slice(7).split('?')[0] }] });
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  if (!expanded) {
    return (
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === 'Enter' && onToggle()} className={cn('flex cursor-pointer items-center gap-3 py-3', !first && 'border-t border-line')} data-testid="message-collapsed">
        <Avatar person={m.from} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-sm font-bold text-fg">{name}</span>
            {scheduled && <span className="text-xs font-medium text-danger">Scheduled</span>}
          </div>
          <div className="truncate text-sm text-fg3">{htmlToText(stripQuote(m.body)).slice(0, 200)}</div>
        </div>
        <span className="shrink-0 text-xs text-fg3">
          {formatListDate(m.date, now)}
          <span className="hidden sm:inline"> ({relativeAgo(m.date, now)})</span>
        </span>
      </div>
    );
  }

  const openDetails = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setDetails(e.currentTarget);
  };

  return (
    <article className={cn('py-4', !first && 'border-t border-line')} data-testid="message-expanded">
      <div className="flex gap-3">
        <button type="button" onClick={(e) => setCard(e.currentTarget)} aria-label={`About ${name}`} className="shrink-0 self-start rounded-full">
          <Avatar person={m.from} size={40} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className={cn('min-w-0 flex-1', canCollapse && 'cursor-pointer')} onClick={() => canCollapse && onToggle()}>
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <button type="button" onClick={(e) => { e.stopPropagation(); setCard(e.currentTarget); }} className="text-sm font-bold text-fg hover:underline">
                  {name}
                </button>
                <span className="truncate text-xs text-fg3">&lt;{m.from.email}&gt;</span>
                {isOrg && !fromMe && (
                  unsubscribed.includes(m.from.email.toLowerCase()) ? (
                    <span className="text-xs text-fg3">· Unsubscribed</span>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-fg2 underline hover:text-fg"
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDialog({
                          title: `Unsubscribe from ${m.from.name}?`,
                          message: `Future messages from ${m.from.email} will stop arriving in this demo mailbox.`,
                          confirmLabel: 'Unsubscribe',
                          onConfirm: () => {
                            useMail.getState().unsubscribe(m.from.email);
                            showToast(`Unsubscribed from ${m.from.name}.`);
                          },
                        });
                      }}
                    >
                      Unsubscribe
                    </button>
                  )
                )}
              </div>
              <button type="button" onClick={openDetails} className="mt-0.5 flex max-w-full items-center rounded text-xs text-fg3 hover:text-fg2" aria-label="Show details">
                <span className="truncate">to {recipientSummary(m)}</span>
                <MdArrowDropDown size={18} className="shrink-0" />
              </button>
            </div>
            <div className="flex shrink-0 items-center text-xs text-fg3">
              <span className="mr-1 hidden whitespace-nowrap sm:inline" data-tip={formatLongDate(m.date)}>
                {formatFullDate(m.date)} ({relativeAgo(m.date, now)})
              </span>
              <span className="mr-1 whitespace-nowrap sm:hidden">{formatListDate(m.date, now)}</span>
              <IconButton
                icon={thread.starred ? MdStar : MdStarBorder}
                label={thread.starred ? 'Starred' : 'Not starred'}
                size="sm"
                className={thread.starred ? 'text-star' : ''}
                onClick={() => actions.star([thread.id], !thread.starred)}
              />
              {!scheduled && <IconButton icon={MdReply} label="Reply" size="sm" onClick={() => openReply(thread.id, 'reply', m.id)} className="print-hide" />}
              <IconButton icon={MdMoreVert} label="More" size="sm" onClick={(e) => setMore(e.currentTarget)} className="print-hide" />
            </div>
          </div>
        </div>
      </div>

      {scheduled && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-accent-soft px-4 py-3 text-sm text-fg md:ml-[52px]">
          <MdSchedule size={20} />
          <span className="flex-1">Send scheduled for {formatFuture(m.scheduledAt ?? m.date, now)}</span>
          <Button
            variant="outlined"
            onClick={() => {
              useMail.getState().unschedule(thread.id, m.id);
              const t = useMail.getState().threads[thread.id];
              const draft = t?.messages.find((x) => x.id === m.id);
              if (t && draft) {
                const isNewThread = t.messages.every((x) => x.status === 'draft');
                const mode = isNewThread ? 'new' : (draft.replyMode ?? 'reply');
                const subject = isNewThread ? t.subject : `${mode === 'forward' ? 'Fwd' : 'Re'}: ${t.subject}`;
                reopenWindow({ threadId: thread.id, draftId: m.id, mode, isNewThread, minimized: false, maximized: false, initial: fieldsFromDraft(draft, subject), focus: 'body' });
              }
              showToast('Send canceled. Your message is back in Drafts.');
            }}
          >
            Cancel send
          </Button>
          <Button
            variant="text"
            onClick={() => {
              useMail.getState().send(thread.id, m.id, { simulate: useSettings.getState().simulateActivity });
              showToast('Message sent.');
            }}
          >
            <MdSend size={16} /> Send now
          </Button>
        </div>
      )}

      <div className="mt-3 md:pl-[52px]" data-testid="message-body">
        <div className="mail-body" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: body }} />
        {m.quote && (
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setShowQuote((s) => !s)}
              aria-label={showQuote ? 'Hide trimmed content' : 'Show trimmed content'}
              data-tip={showQuote ? 'Hide trimmed content' : 'Show trimmed content'}
              className="print-hide flex h-4 items-center rounded-sm bg-chip px-1 text-fg2 hover:bg-hover"
            >
              <MdMoreHoriz size={18} />
            </button>
            {showQuote && <div className="mail-body mt-2" onClick={onBodyClick} dangerouslySetInnerHTML={{ __html: m.quote }} />}
          </div>
        )}
      </div>

      {m.attachments.length > 0 && <AttachmentGrid atts={m.attachments} />}

      <Popover open={!!details} anchor={details} onClose={() => setDetails(null)} role="dialog" className="max-w-[min(92vw,520px)] px-5 py-4">
        <table className="text-xs">
          <tbody className="[&_td]:py-1 [&_td]:align-top">
            <DetailRow k="from:" v={<><b className="text-fg">{name}</b> &lt;{m.from.email}&gt;</>} />
            {m.to.length > 0 && <DetailRow k="to:" v={m.to.map((p) => `${p.name ? `${p.name} ` : ''}<${p.email}>`).join(', ')} />}
            {m.cc.length > 0 && <DetailRow k="cc:" v={m.cc.map((p) => `${p.name ? `${p.name} ` : ''}<${p.email}>`).join(', ')} />}
            {m.bcc.length > 0 && <DetailRow k="bcc:" v={m.bcc.map((p) => p.email).join(', ')} />}
            <DetailRow k="date:" v={formatLongDate(m.date)} />
            <DetailRow k="subject:" v={thread.subject} />
            <DetailRow k="mailed-by:" v={m.from.email.split('@')[1]} />
            <DetailRow
              k="security:"
              v={
                <span className="inline-flex items-center gap-1">
                  <MdOutlineLock size={14} /> Standard encryption (TLS)
                </span>
              }
            />
          </tbody>
        </table>
      </Popover>

      <Popover open={!!more} anchor={more} onClose={() => setMore(null)} placement="bottom-end">
        <div className="w-60">
          {!scheduled && (
            <>
              <MenuItem icon={MdReply} label="Reply" onClick={() => { setMore(null); openReply(thread.id, 'reply', m.id); }} />
              {participantsCount > 1 && <MenuItem icon={MdReplyAll} label="Reply all" onClick={() => { setMore(null); openReply(thread.id, 'replyAll', m.id); }} />}
              <MenuItem icon={MdForward} label="Forward" onClick={() => { setMore(null); openReply(thread.id, 'forward', m.id); }} />
              <MenuDivider />
            </>
          )}
          <MenuItem icon={MdPrint} label="Print" onClick={() => { setMore(null); setTimeout(() => window.print(), 50); }} />
          <MenuItem
            icon={MdOutlineDelete}
            label="Delete this message"
            onClick={() => {
              setMore(null);
              if (thread.messages.filter((x) => x.status !== 'draft').length <= 1) {
                actions.trash([thread.id]);
                return;
              }
              const snap = useMail.getState().snapshot([thread.id]);
              useMail.getState().deleteMessage(thread.id, m.id);
              showToast('Message deleted.', { undo: () => useMail.getState().restore(snap) });
            }}
          />
          <MenuItem icon={MdOutlineMarkEmailUnread} label="Mark unread from here" onClick={() => { setMore(null); actions.markRead([thread.id], false, { leave: true }); }} />
          {!fromMe && (
            <MenuItem icon={MdOutlineReport} label={`Report spam`} onClick={() => { setMore(null); actions.spam([thread.id]); }} />
          )}
          <MenuDivider />
          <MenuItem icon={MdPersonSearch} label={`Find emails from ${firstName(name)}`} onClick={() => { setMore(null); navigate({ view: 'search', query: `from:${m.from.email}` }); }} />
        </div>
      </Popover>

      <Popover open={!!card} anchor={card} onClose={() => setCard(null)} role="dialog" className="w-80 p-0">
        <div className="flex items-center gap-4 p-5">
          <Avatar person={m.from} size={64} />
          <div className="min-w-0">
            <div className="truncate text-lg text-fg">{name}</div>
            <div className="truncate text-sm text-fg3">{m.from.email}</div>
            {(contact?.title || contact?.org) && <div className="truncate text-xs text-fg3">{[contact?.title, contact?.org].filter(Boolean).join(' · ')}</div>}
          </div>
        </div>
        <div className="flex gap-2 border-t border-line px-4 py-3">
          {!fromMe && (
            <Button variant="tonal" className="h-8 px-4" onClick={() => { setCard(null); openCompose({ to: [m.from] }); }}>
              Send email
            </Button>
          )}
          <Button variant="text" className="h-8" onClick={() => { setCard(null); navigate({ view: 'search', query: `from:${m.from.email}` }); }}>
            View emails
          </Button>
          <IconButton
            icon={MdContentCopy}
            label="Copy email address"
            size="sm"
            className="ml-auto"
            onClick={() => {
              navigator.clipboard?.writeText(m.from.email).catch(() => {});
              setCard(null);
              showToast('Email address copied.');
            }}
          />
        </div>
      </Popover>
    </article>
  );
}

function DetailRow({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <tr>
      <td className="pr-3 text-right whitespace-nowrap text-fg3">{k}</td>
      <td className="break-words text-fg2">{v}</td>
    </tr>
  );
}

function AttachmentGrid({ atts }: { atts: Attachment[] }) {
  return (
    <div className="mt-4 border-t border-line pt-3 md:ml-[52px]" data-testid="attachments">
      <div className="mb-3 flex items-center gap-2 text-sm text-fg2">
        <span className="font-medium">{atts.length === 1 ? 'One attachment' : `${atts.length} attachments`}</span>
        <span className="text-fg3">· Scanned for viruses</span>
        {atts.length > 1 && (
          <button
            type="button"
            className="ml-auto flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-accent-text hover:bg-hover"
            onClick={() => atts.forEach((a, i) => setTimeout(() => downloadAttachment(a), i * 300))}
          >
            <MdDownload size={16} /> Download all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {atts.map((a, i) => (
          <AttachmentCard key={a.id} att={a} onOpen={() => ui.set({ preview: { attachments: atts, index: i } })} />
        ))}
      </div>
    </div>
  );
}

function AttachmentCard({ att, onOpen }: { att: Attachment; onOpen: () => void }) {
  const k = fileKind(att.name, att.type);
  const src = previewSrc(att);
  return (
    <div className="group relative h-[120px] w-[170px] overflow-hidden rounded-lg border border-line bg-chip sm:w-[180px]">
      <button type="button" onClick={onOpen} className="block h-full w-full text-left" aria-label={`Preview ${att.name}`}>
        {src && k.kind === 'image' ? (
          <img src={src} alt="" className="h-[84px] w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-[84px] items-center justify-center" style={{ background: `${k.color}14` }}>
            <DocThumb color={k.color} icon={k.icon} />
          </div>
        )}
        <div className="flex h-9 items-center gap-2 border-t border-line bg-panel px-2.5">
          <k.icon size={16} style={{ color: k.color }} className="shrink-0" />
          <span className="truncate text-xs font-medium text-fg">{att.name}</span>
        </div>
      </button>
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/60 p-2.5 text-white opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <div>
          <div className="line-clamp-2 text-xs font-medium">{att.name}</div>
          <div className="text-[11px] opacity-80">{formatSize(att.size)}</div>
        </div>
        <div className="pointer-events-auto flex justify-end gap-1">
          <button type="button" aria-label={`Preview ${att.name}`} data-tip="Preview" onClick={onOpen} className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/30">
            <MdZoomIn size={18} />
          </button>
          <button
            type="button"
            aria-label={`Download ${att.name}`}
            data-tip="Download"
            onClick={() => downloadAttachment(att)}
            className="flex size-8 items-center justify-center rounded-full bg-white/15 hover:bg-white/30"
          >
            <MdDownload size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function DocThumb({ color, icon: Icon }: { color: string; icon: IconType }) {
  return (
    <div className="relative h-[64px] w-[52px] rounded-sm bg-white shadow-sm ring-1 ring-black/5">
      <div className="absolute top-2 left-2 h-1 w-7 rounded" style={{ background: color, opacity: 0.8 }} />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="absolute left-2 h-[3px] rounded bg-gray-200" style={{ top: 18 + i * 8, width: i === 3 ? 20 : 34 }} />
      ))}
      <Icon size={16} className="absolute right-1 bottom-1" style={{ color }} />
    </div>
  );
}

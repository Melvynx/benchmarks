import { memo, useRef, useState } from 'react';
import {
  MdArchive,
  MdCheck,
  MdDelete,
  MdDeleteForever,
  MdDragIndicator,
  MdForward,
  MdLabelImportant,
  MdLabelImportantOutline,
  MdLabelOutline,
  MdMarkEmailRead,
  MdMarkEmailUnread,
  MdOutlineArchive,
  MdOutlineDelete,
  MdOutlineDriveFileMove,
  MdOutlineMarkEmailRead,
  MdOutlineMarkEmailUnread,
  MdOutlineMoveToInbox,
  MdOutlineWatchLater,
  MdPersonSearch,
  MdReply,
  MdReplyAll,
  MdSchedule,
  MdStar,
  MdStarBorder,
  MdVolumeOff,
} from 'react-icons/md';
import type { Thread } from '../types';
import { actions } from '../lib/actions';
import { openDraft, openReply } from '../lib/composeActions';
import { formatListDate, formatFuture } from '../lib/date';
import { displayDate, participants, realMessages, snippet, threadAttachments } from '../lib/mailbox';
import { navigate, withThread, type Route } from '../lib/router';
import { cn } from '../lib/utils';
import { fileKind } from '../lib/visuals';
import { MY_EMAIL, useMail } from '../store/mail';
import type { Density, SwipeAction } from '../store/settings';
import { ui } from '../store/ui';
import { LabelMenu, MoveMenu, SnoozeMenu } from './menus';
import { DRAG_MIME } from './Sidebar';
import { Avatar, Checkbox, IconButton, LabelChip, MenuDivider, MenuItem, Popover } from './ui';

export interface RowProps {
  thread: Thread;
  route: Route;
  ids: string[];
  selected: boolean;
  cursor: boolean;
  stacked: boolean;
  density: Density;
  hoverActions: boolean;
  importance: boolean;
  snippets: boolean;
  swipeLeft: SwipeAction;
  swipeRight: SwipeAction;
  touch: boolean;
  highlight: string[];
  now: number;
}

function toggleSelect(id: string, ids: string[], shift: boolean) {
  const { selected, anchor } = ui.get();
  if (shift && anchor && anchor !== id) {
    const a = ids.indexOf(anchor);
    const b = ids.indexOf(id);
    if (a >= 0 && b >= 0) {
      const range = ids.slice(Math.min(a, b), Math.max(a, b) + 1);
      const adding = !selected.includes(id);
      const next = adding ? [...new Set([...selected, ...range])] : selected.filter((x) => !range.includes(x));
      ui.set({ selected: next, anchor: id });
      return;
    }
  }
  ui.set({ selected: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id], anchor: id });
}

function targetIds(id: string): string[] {
  const sel = ui.get().selected;
  return sel.includes(id) ? sel : [id];
}

function Hl({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`(${terms.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="mail-hl">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const SWIPE_META: Record<Exclude<SwipeAction, 'none'>, { color: string; icon: typeof MdArchive; label: string }> = {
  archive: { color: '#188038', icon: MdArchive, label: 'Archive' },
  trash: { color: '#d93025', icon: MdDelete, label: 'Delete' },
  read: { color: '#1a73e8', icon: MdMarkEmailRead, label: 'Read/unread' },
  star: { color: '#f4b400', icon: MdStar, label: 'Star' },
};

function runSwipe(action: SwipeAction, t: Thread) {
  if (action === 'archive') actions.archive([t.id]);
  else if (action === 'trash') actions.trash([t.id]);
  else if (action === 'read') actions.markRead([t.id], t.unread);
  else if (action === 'star') actions.star([t.id], !t.starred);
}

export const MailRow = memo(function MailRow(p: RowProps) {
  const { thread: t, route, stacked, selected, cursor, density } = p;
  const [menu, setMenu] = useState<{ x: number; y: number; mode: 'main' | 'snooze' | 'move' | 'labels' } | null>(null);
  const [snoozeAnchor, setSnoozeAnchor] = useState<HTMLElement | null>(null);
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; swiping: boolean; timer?: ReturnType<typeof setTimeout>; longPressed?: boolean } | null>(null);
  const suppressClick = useRef(false);
  const labels = useMail((s) => s.labels);

  const draftOnly = !realMessages(t).length;
  const folder = route.view === 'folder' ? route.folder : null;
  const { parts, count } = participants(t, route, MY_EMAIL);
  const date = displayDate(t, route);
  const atts = threadAttachments(t);
  const rowLabels = t.labelIds.map((id) => labels.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => !!l && !(route.view === 'label' && route.labelId === l.id));
  const snip = snippet(t);
  const arrived = t.arrivedAt && p.now - t.arrivedAt < 6000;
  const lastSender = realMessages(t).at(-1)?.from ?? t.messages[0]?.from ?? { name: '?', email: '?' };

  const open = () => {
    if (suppressClick.current) return;
    ui.set({ cursor: t.id });
    if (draftOnly && folder !== 'scheduled') {
      openDraft(t);
      return;
    }
    navigate(withThread(route, t.id));
  };

  const bg = selected ? 'bg-row-selected' : t.unread ? 'bg-row-unread' : 'bg-row-read';

  const hoverButtons = () => {
    const ids = [t.id];
    if (folder === 'trash')
      return (
        <>
          <IconButton size="sm" icon={MdDeleteForever} label="Delete forever" onClick={(e) => { e.stopPropagation(); actions.deleteForever(ids); }} />
          <IconButton size="sm" icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={(e) => { e.stopPropagation(); actions.moveToInbox(ids); }} />
        </>
      );
    if (folder === 'drafts' || (draftOnly && folder !== 'scheduled'))
      return <IconButton size="sm" icon={MdOutlineDelete} label="Discard draft" onClick={(e) => { e.stopPropagation(); actions.discardDrafts(ids); }} />;
    if (folder === 'scheduled')
      return <IconButton size="sm" icon={MdSchedule} label="Cancel send" onClick={(e) => { e.stopPropagation(); actions.cancelScheduled(ids); }} />;
    return (
      <>
        {t.inInbox && !t.spam ? (
          <IconButton size="sm" icon={MdOutlineArchive} label="Archive" onClick={(e) => { e.stopPropagation(); actions.archive(ids); }} />
        ) : (
          <IconButton size="sm" icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={(e) => { e.stopPropagation(); actions.moveToInbox(ids); }} />
        )}
        <IconButton size="sm" icon={MdOutlineDelete} label="Delete" onClick={(e) => { e.stopPropagation(); actions.trash(ids); }} />
        <IconButton
          size="sm"
          icon={t.unread ? MdOutlineMarkEmailRead : MdOutlineMarkEmailUnread}
          label={t.unread ? 'Mark as read' : 'Mark as unread'}
          onClick={(e) => { e.stopPropagation(); actions.markRead(ids, t.unread); }}
        />
        <IconButton size="sm" icon={MdOutlineWatchLater} label="Snooze" onClick={(e) => { e.stopPropagation(); setSnoozeAnchor(e.currentTarget); }} />
      </>
    );
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    const g = { x: e.clientX, y: e.clientY, swiping: false } as NonNullable<typeof gesture.current>;
    g.timer = setTimeout(() => {
      g.longPressed = true;
      suppressClick.current = true;
      navigator.vibrate?.(15);
      toggleSelect(t.id, p.ids, false);
    }, 480);
    gesture.current = g;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const mx = e.clientX - g.x;
    const my = e.clientY - g.y;
    if (!g.swiping) {
      if (Math.abs(mx) > 8 || Math.abs(my) > 8) clearTimeout(g.timer);
      if (p.touch && Math.abs(mx) > 14 && Math.abs(mx) > Math.abs(my) * 1.4 && !g.longPressed) {
        g.swiping = true;
        setDragging(true);
        rowRef.current?.setPointerCapture(e.pointerId);
      } else if (Math.abs(my) > 10) {
        gesture.current = null;
        return;
      }
    }
    if (g.swiping) {
      const action = mx > 0 ? p.swipeRight : p.swipeLeft;
      setDx(action === 'none' ? mx * 0.15 : mx);
    }
  };
  const endGesture = () => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    clearTimeout(g.timer);
    if (g.longPressed) {
      setTimeout(() => (suppressClick.current = false), 50);
      return;
    }
    if (!g.swiping) return;
    setDragging(false);
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 80);
    const width = rowRef.current?.offsetWidth ?? 360;
    const action = dx > 0 ? p.swipeRight : p.swipeLeft;
    if (Math.abs(dx) > width * 0.33 && action !== 'none') {
      const removes = action === 'archive' || action === 'trash';
      setDx(removes ? Math.sign(dx) * width : 0);
      setTimeout(() => {
        runSwipe(action, t);
        if (!removes) setDx(0);
      }, removes ? 180 : 0);
    } else {
      setDx(0);
    }
  };

  const swipeAction = dx > 0 ? p.swipeRight : p.swipeLeft;
  const swipeMeta = swipeAction !== 'none' ? SWIPE_META[swipeAction] : null;

  const nameEl = (
    <span className="truncate">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className={t.unread ? 'font-bold' : ''}>{part.text === '..' || parts[i - 1]?.text === '..' ? ' ' : ', '}</span>}
          <span className={cn(part.draft && 'text-danger', part.bold && 'font-bold text-fg')}>{part.text}</span>
        </span>
      ))}
      {count > 0 && <span className={cn('ml-1 text-xs', t.unread ? 'font-bold' : 'text-fg3')}>{count}</span>}
    </span>
  );

  const dateText = folder === 'snoozed' || folder === 'scheduled' ? formatListDate(date, p.now) : formatListDate(date, p.now);
  const dateTip = folder === 'snoozed' ? `Snoozed until ${formatFuture(date)}` : folder === 'scheduled' ? `Scheduled for ${formatFuture(date)}` : new Date(date).toLocaleString();

  const attachmentChips = (max: number) =>
    atts.length > 0 && (
      <div className="flex min-w-0 flex-wrap gap-2 overflow-hidden" style={{ maxHeight: 30 }}>
        {atts.slice(0, max).map((a) => {
          const k = fileKind(a.name, a.type);
          return (
            <button
              type="button"
              key={a.id}
              onClick={(e) => {
                e.stopPropagation();
                ui.set({ preview: { attachments: atts, index: atts.indexOf(a) } });
              }}
              className="inline-flex h-7 max-w-[190px] items-center gap-1.5 rounded-full border border-line-strong bg-panel/40 px-2.5 text-xs font-medium text-fg2 hover:bg-hover"
            >
              <k.icon size={16} style={{ color: k.color }} className="shrink-0" />
              <span className="truncate">{a.name}</span>
            </button>
          );
        })}
        {atts.length > max && <span className="inline-flex h-7 items-center rounded-full border border-line-strong px-2.5 text-xs font-medium text-fg2">+{atts.length - max}</span>}
      </div>
    );

  const common = {
    ref: rowRef,
    role: 'listitem' as const,
    'aria-selected': selected,
    'aria-current': cursor || undefined,
    'data-thread-id': t.id,
    tabIndex: -1,
    onClick: open,
    onContextMenu: (e: React.MouseEvent) => {
      if (p.touch) return;
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, mode: 'main' });
    },
    draggable: !p.touch,
    onDragStart: (e: React.DragEvent) => {
      const ids = targetIds(t.id);
      e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
      e.dataTransfer.effectAllowed = 'move';
      const ghost = document.createElement('div');
      ghost.textContent = ids.length === 1 ? 'Move 1 conversation' : `Move ${ids.length} conversations`;
      ghost.style.cssText = 'position:fixed;top:-100px;left:0;padding:8px 14px;border-radius:8px;background:#0b57d0;color:#fff;font:500 13px Roboto,sans-serif;box-shadow:0 2px 6px rgba(0,0,0,.3)';
      document.body.appendChild(ghost);
      e.dataTransfer.setDragImage(ghost, 12, 12);
      setTimeout(() => ghost.remove(), 0);
    },
    onPointerDown,
    onPointerMove,
    onPointerUp: endGesture,
    onPointerCancel: endGesture,
  };

  const menuIds = () => targetIds(t.id);
  const closeMenu = () => setMenu(null);

  const contextMenu = (
    <Popover open={!!menu} anchor={menu ? { x: menu.x, y: menu.y } : null} onClose={closeMenu} offset={0}>
      {menu?.mode === 'main' && (
        <div className="w-64">
          {!draftOnly && (
            <>
              <MenuItem icon={MdReply} label="Reply" onClick={() => { closeMenu(); navigate(withThread(route, t.id)); setTimeout(() => openReply(t.id, 'reply'), 0); }} />
              <MenuItem icon={MdReplyAll} label="Reply all" onClick={() => { closeMenu(); navigate(withThread(route, t.id)); setTimeout(() => openReply(t.id, 'replyAll'), 0); }} />
              <MenuItem icon={MdForward} label="Forward" onClick={() => { closeMenu(); navigate(withThread(route, t.id)); setTimeout(() => openReply(t.id, 'forward'), 0); }} />
              <MenuDivider />
            </>
          )}
          {t.inInbox ? (
            <MenuItem icon={MdOutlineArchive} label="Archive" onClick={() => { closeMenu(); actions.archive(menuIds()); }} />
          ) : (
            <MenuItem icon={MdOutlineMoveToInbox} label="Move to Inbox" onClick={() => { closeMenu(); actions.moveToInbox(menuIds()); }} />
          )}
          {folder === 'trash' ? (
            <MenuItem icon={MdDeleteForever} label="Delete forever" onClick={() => { closeMenu(); actions.deleteForever(menuIds()); }} />
          ) : (
            <MenuItem icon={MdOutlineDelete} label="Delete" onClick={() => { closeMenu(); actions.trash(menuIds()); }} />
          )}
          <MenuItem
            icon={t.unread ? MdOutlineMarkEmailRead : MdMarkEmailUnread}
            label={t.unread ? 'Mark as read' : 'Mark as unread'}
            onClick={() => { closeMenu(); actions.markRead(menuIds(), t.unread); }}
          />
          <MenuItem icon={MdOutlineWatchLater} label="Snooze" hint="›" onClick={() => setMenu((m) => m && { ...m, mode: 'snooze' })} />
          <MenuDivider />
          <MenuItem icon={MdOutlineDriveFileMove} label="Move to" hint="›" onClick={() => setMenu((m) => m && { ...m, mode: 'move' })} />
          <MenuItem icon={MdLabelOutline} label="Label as" hint="›" onClick={() => setMenu((m) => m && { ...m, mode: 'labels' })} />
          <MenuItem icon={t.starred ? MdStar : MdStarBorder} label={t.starred ? 'Remove star' : 'Add star'} onClick={() => { closeMenu(); actions.star(menuIds(), !t.starred); }} />
          <MenuItem icon={MdVolumeOff} label={t.muted ? 'Unmute' : 'Mute'} onClick={() => { closeMenu(); (t.muted ? actions.unmute : actions.mute)(menuIds()); }} />
          <MenuDivider />
          <MenuItem
            icon={MdPersonSearch}
            label={`Find emails from ${lastSender.name.split(' ')[0] || lastSender.email}`}
            onClick={() => { closeMenu(); navigate({ view: 'search', query: `from:${lastSender.email}` }); }}
          />
        </div>
      )}
      {menu?.mode === 'snooze' && <SnoozeMenu ids={menuIds()} onClose={closeMenu} />}
      {menu?.mode === 'move' && <MoveMenu ids={menuIds()} onClose={closeMenu} />}
      {menu?.mode === 'labels' && <LabelMenu ids={menuIds()} onClose={closeMenu} />}
    </Popover>
  );

  const snoozePopover = (
    <Popover open={!!snoozeAnchor} anchor={snoozeAnchor} onClose={() => setSnoozeAnchor(null)} placement="bottom-end">
      <SnoozeMenu ids={[t.id]} onClose={() => setSnoozeAnchor(null)} />
    </Popover>
  );

  const swipeBg = swipeMeta && dx !== 0 && (
    <div className="absolute inset-0 flex items-center px-6 text-white" style={{ background: swipeMeta.color, justifyContent: dx > 0 ? 'flex-start' : 'flex-end' }}>
      <swipeMeta.icon size={24} />
    </div>
  );

  if (stacked) {
    return (
      <div className="relative overflow-hidden">
        {swipeBg}
        <div
          {...common}
          className={cn(
            'group relative flex cursor-pointer gap-3 px-3 py-2.5 select-none',
            bg,
            cursor && 'shadow-[inset_3px_0_0_var(--accent)]',
            arrived && 'row-arrive',
          )}
          style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : 'transform 180ms ease-out', touchAction: 'pan-y' }}
        >
          <button
            type="button"
            aria-label={selected ? 'Deselect conversation' : 'Select conversation'}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(t.id, p.ids, e.shiftKey);
            }}
            className="relative mt-0.5 shrink-0 rounded-full"
          >
            {selected ? (
              <span className="flex size-10 items-center justify-center rounded-full bg-accent text-accent-fg">
                <MdCheck size={22} />
              </span>
            ) : (
              <Avatar person={draftOnly ? (t.messages[0]?.to[0] ?? lastSender) : lastSender} size={40} />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <div className={cn('min-w-0 flex-1 truncate text-[15px]', t.unread ? 'font-bold text-fg' : 'text-fg2')}>{nameEl}</div>
              <span className={cn('shrink-0 text-xs', t.unread ? 'font-bold text-fg' : 'text-fg3')} data-tip={dateTip}>
                {dateText}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {t.important && p.importance && <MdLabelImportant size={14} className="shrink-0 text-star" />}
              <span className={cn('min-w-0 flex-1 truncate text-sm', t.unread ? 'font-bold text-fg' : 'text-fg')}>
                <Hl text={t.subject || '(no subject)'} terms={p.highlight} />
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="line-clamp-2 min-w-0 flex-1 text-sm text-fg3">
                <Hl text={snip || '(no content)'} terms={p.highlight} />
              </span>
              <button
                type="button"
                aria-label={t.starred ? 'Starred' : 'Not starred'}
                onClick={(e) => {
                  e.stopPropagation();
                  actions.star([t.id], !t.starred);
                }}
                className={cn('-mt-1 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-hover', t.starred ? 'text-star' : 'text-fg3')}
              >
                {t.starred ? <MdStar size={20} /> : <MdStarBorder size={20} />}
              </button>
            </div>
            {(rowLabels.length > 0 || t.muted) && (
              <div className="mt-1 flex flex-wrap gap-1">
                {t.muted && <MdVolumeOff size={14} className="text-fg3" />}
                {rowLabels.map((l) => (
                  <LabelChip key={l.id} label={l} />
                ))}
              </div>
            )}
            {density !== 'compact' && atts.length > 0 && <div className="mt-1.5">{attachmentChips(2)}</div>}
          </div>
        </div>
        {contextMenu}
        {snoozePopover}
      </div>
    );
  }

  const lineH = density === 'compact' ? 'h-8' : 'h-10';
  return (
    <div
      {...common}
      className={cn(
        'group relative flex cursor-pointer items-start border-b border-line/70 text-sm hover:z-[1] hover:shadow-row',
        bg,
        cursor && 'shadow-[inset_3px_0_0_var(--accent)]',
        arrived && 'row-arrive',
      )}
    >
      <div className={cn('flex shrink-0 items-center pl-1', lineH)}>
        <MdDragIndicator size={16} className="w-3 text-fg3 opacity-0 group-hover:opacity-70" aria-hidden />
        <Checkbox checked={selected} onChange={(e) => toggleSelect(t.id, p.ids, e.shiftKey)} label="Select conversation" />
        <button
          type="button"
          aria-label={t.starred ? 'Starred' : 'Not starred'}
          data-tip={t.starred ? 'Starred' : 'Not starred'}
          onClick={(e) => {
            e.stopPropagation();
            actions.star([t.id], !t.starred);
          }}
          className={cn('flex size-8 items-center justify-center rounded-full hover:bg-hover', t.starred ? 'text-star' : 'text-fg3')}
        >
          {t.starred ? <MdStar size={20} /> : <MdStarBorder size={20} />}
        </button>
        {p.importance && (
          <button
            type="button"
            aria-label={t.important ? 'Important' : 'Not important'}
            data-tip={t.important ? 'Click to teach the inbox this conversation is not important.' : 'Click to teach the inbox this conversation is important.'}
            onClick={(e) => {
              e.stopPropagation();
              actions.important([t.id], !t.important);
            }}
            className={cn('flex size-7 items-center justify-center rounded-full hover:bg-hover', t.important ? 'text-star' : 'text-fg3/60')}
          >
            {t.important ? <MdLabelImportant size={18} /> : <MdLabelImportantOutline size={18} />}
          </button>
        )}
      </div>
      <div className={cn('flex w-[168px] shrink-0 items-center pr-4 pl-2 xl:w-[200px]', lineH, t.unread ? 'text-fg' : 'text-fg2')}>{nameEl}</div>
      <div className="min-w-0 flex-1">
        <div className={cn('flex min-w-0 items-center gap-1.5 pr-3', lineH)}>
          {t.muted && <MdVolumeOff size={16} className="shrink-0 text-fg3" aria-label="Muted" />}
          {rowLabels.slice(0, 3).map((l) => (
            <LabelChip key={l.id} label={l} onClick={() => navigate({ view: 'label', labelId: l.id })} />
          ))}
          <span className="min-w-0 truncate">
            <span className={t.unread ? 'font-bold text-fg' : 'text-fg'}>
              <Hl text={t.subject || '(no subject)'} terms={p.highlight} />
            </span>
            {p.snippets && snip && (
              <span className="text-fg3">
                {' '}
                - <Hl text={snip} terms={p.highlight} />
              </span>
            )}
          </span>
        </div>
        {density === 'default' && atts.length > 0 && <div className="-mt-0.5 pr-3 pb-2">{attachmentChips(3)}</div>}
      </div>
      <div className={cn('flex w-[92px] shrink-0 items-center justify-end pr-4 text-xs', lineH, t.unread ? 'font-bold text-fg' : 'text-fg2', p.hoverActions && 'group-hover:invisible')}>
        <span data-tip={dateTip} className="whitespace-nowrap">
          {folder === 'snoozed' && <MdOutlineWatchLater size={12} className="mr-1 inline align-[-1px]" />}
          {dateText}
        </span>
      </div>
      {p.hoverActions && <div className={cn('absolute top-0 right-2 hidden items-center gap-0.5 pl-2 group-hover:flex', lineH, bg)}>{hoverButtons()}</div>}
      {contextMenu}
      {snoozePopover}
    </div>
  );
});

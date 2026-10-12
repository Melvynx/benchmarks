import { memo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
  MdAttachFile, MdCheck, MdDragIndicator, MdLabelImportant, MdLabelImportantOutline, MdOutlineArchive, MdOutlineDelete,
  MdOutlineDeleteForever, MdOutlineDrafts, MdOutlineMarkEmailUnread, MdOutlineMoveToInbox, MdOutlineSchedule,
  MdOutlineStarBorder, MdStar, MdOutlineCancelScheduleSend,
} from 'react-icons/md';
import { ME } from '../data/seed';
import type { Attachment, Label, Thread } from '../data/types';
import { cancelScheduled, discardDrafts, runAction, toggleStar } from '../lib/actions';
import { htmlToText, listDate, displayName, scheduleLabel, snippetOf } from '../lib/format';
import type { SystemFolder } from '../lib/router';
import { isSnoozed, participants, type Row } from '../store/selectors';
import { useUI } from '../store/ui';
import { AttachmentIcon } from './attachments';
import { SnoozeTrigger } from './menus';
import { Avatar, Checkbox, LabelChip, SystemChip } from './primitives';
import { DRAG_TYPE } from './Sidebar';

export function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length || !text) return text;
  const escaped = terms.filter((t) => t.length > 1).map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return text;
  const re = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : p));
}

export interface RowProps {
  row: Row;
  selected: boolean;
  cursor: boolean;
  layout: 'wide' | 'stacked';
  density: 'default' | 'comfortable' | 'compact';
  labels: Record<string, Label>;
  folder: SystemFolder | 'label' | 'search';
  currentLabel?: string;
  terms: string[];
  hasDraft: boolean;
  importance: boolean;
  hoverActions: boolean;
  now: number;
  onSelect: (id: string, e: ReactMouseEvent) => void;
  onOpen: (row: Row) => void;
  onOpenAttachment: (list: Attachment[], index: number) => void;
}

function Sender({ t, folder, hasDraft, terms }: { t: Thread; folder: RowProps['folder']; hasDraft: boolean; terms: string[] }) {
  const allMine = t.messages.every((m) => m.from.email === ME.email);
  if (folder === 'sent' && allMine) {
    const to = t.messages[t.messages.length - 1].to;
    return (
      <>
        <span className="sender-name">To: {highlight(to.map((c) => displayName(c).split(' ')[0]).join(', ') || '(no recipients)', terms)}</span>
        {t.messages.length > 1 && <span className="sender-count">{t.messages.length}</span>}
      </>
    );
  }
  const p = participants(t);
  return (
    <>
      <span className="sender-name">
        {p.names.map((n, i) => (
          <span key={i} className={n.unread ? 'is-unread' : undefined}>
            {i > 0 && n.label !== '…' && p.names[i - 1].label !== '…' ? ', ' : i > 0 ? ' ' : ''}
            {highlight(n.label, terms)}
          </span>
        ))}
      </span>
      {p.count > 1 && <span className="sender-count">{p.count}</span>}
      {hasDraft && <span className="sender-draft">Draft</span>}
    </>
  );
}

export const MailRow = memo(function MailRow(props: RowProps) {
  const { row, selected, cursor, layout, density, labels, folder, currentLabel, terms, hasDraft, importance, hoverActions, now, onSelect, onOpen, onOpenAttachment } = props;
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  if (row.kind === 'draft') {
    const d = row.draft;
    const scheduled = !!d.scheduledAt;
    const text = snippetOf(htmlToText(d.html), 160);
    const recipients = d.to.map((c) => displayName(c)).join(', ');
    return (
      <div
        ref={ref}
        role="row"
        tabIndex={-1}
        className={`row is-read ${selected ? 'is-selected' : ''} ${cursor ? 'is-cursor' : ''} row-${layout} density-${density}`}
        onClick={() => onOpen(row)}
      >
        {layout === 'wide' ? (
          <>
            <div className="row-lead">
              <Checkbox checked={selected} onChange={(e) => onSelect(d.id, e)} label="Select" />
            </div>
            <div className="row-sender">
              <span className="sender-draft">{scheduled ? '' : 'Draft'}</span>
              <span className="sender-name">{scheduled ? `To: ${recipients || '(no recipients)'}` : recipients ? ` ${recipients}` : ''}</span>
            </div>
            <div className="row-main">
              <div className="row-line">
                <span className="row-subject">{d.subject || '(no subject)'}</span>
                <span className="row-snippet"> - {text}</span>
              </div>
            </div>
            <div className="row-date">{scheduled ? scheduleLabel(d.scheduledAt!, now) : listDate(d.updatedAt, now)}</div>
            <div className="row-actions" onClick={(e) => e.stopPropagation()}>
              {scheduled ? (
                <button type="button" className="icon-btn icon-btn-md" aria-label="Cancel send" data-tip="Cancel send" onClick={() => cancelScheduled(d.id)}><MdOutlineCancelScheduleSend /></button>
              ) : (
                <button type="button" className="icon-btn icon-btn-md" aria-label="Discard draft" data-tip="Discard draft" onClick={() => discardDrafts([d.id])}><MdOutlineDelete /></button>
              )}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="row-avatar" aria-label="Select" onClick={(e) => { e.stopPropagation(); onSelect(d.id, e); }}>
              {selected ? <span className="avatar avatar-check"><MdCheck /></span> : <span className="avatar avatar-draft"><MdOutlineDrafts /></span>}
            </button>
            <div className="row-stack">
              <div className="stack-top">
                <span className="row-sender"><span className="sender-draft">{scheduled ? 'Scheduled' : 'Draft'}</span> <span className="sender-name">{recipients}</span></span>
                <span className="row-date">{scheduled ? scheduleLabel(d.scheduledAt!, now) : listDate(d.updatedAt, now)}</span>
              </div>
              <div className="row-subject">{d.subject || '(no subject)'}</div>
              <div className="row-snippet">{text}</div>
            </div>
          </>
        )}
      </div>
    );
  }

  const t = row.thread;
  const last = t.messages[t.messages.length - 1];
  const snippet = snippetOf(last?.text ?? '', 200);
  const attachments = t.messages.flatMap((m) => m.attachments);
  const rowLabels = t.labels.map((id) => labels[id]).filter((l): l is Label => !!l && l.id !== currentLabel);
  const showInboxChip = (folder === 'search' || folder === 'all' || folder === 'label' || folder === 'starred' || folder === 'important') && t.inInbox && !t.trashed && !t.spam && !isSnoozed(t, now);
  const snoozedView = folder === 'snoozed' && t.snoozedUntil;
  const dateText = snoozedView ? scheduleLabel(t.snoozedUntil!, now) : listDate(last?.date ?? 0, now);
  const showChips = density === 'default' && attachments.length > 0 && !t.spam;
  const fullDate = new Date(last?.date ?? 0).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const onDragStart = (e: DragEvent) => {
    const sel = Object.keys(useUI.getState().selected);
    const ids = sel.includes(t.id) ? sel : [t.id];
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(ids));
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = ids.length === 1 ? 'Move 1 conversation' : `Move ${ids.length} conversations`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 12, 16);
    window.setTimeout(() => ghost.remove(), 0);
    useUI.getState().set({ dragIds: ids });
    setDragging(true);
  };
  const onDragEnd = () => {
    useUI.getState().set({ dragIds: null });
    setDragging(false);
  };

  const actions = hoverActions && (
    <div className="row-actions" onClick={(e) => e.stopPropagation()}>
      {t.trashed ? (
        <>
          <button type="button" className="icon-btn icon-btn-md" aria-label="Move to Inbox" data-tip="Move to Inbox" onClick={() => runAction([t.id], 'inbox')}><MdOutlineMoveToInbox /></button>
          <button type="button" className="icon-btn icon-btn-md" aria-label="Delete forever" data-tip="Delete forever" onClick={() => runAction([t.id], 'deleteForever')}><MdOutlineDeleteForever /></button>
        </>
      ) : (
        <>
          {t.inInbox && !t.spam ? (
            <button type="button" className="icon-btn icon-btn-md" aria-label="Archive" data-tip="Archive" onClick={() => runAction([t.id], 'archive')}><MdOutlineArchive /></button>
          ) : (
            <button type="button" className="icon-btn icon-btn-md" aria-label="Move to Inbox" data-tip="Move to Inbox" onClick={() => runAction([t.id], t.spam ? 'notSpam' : 'inbox')}><MdOutlineMoveToInbox /></button>
          )}
          <button type="button" className="icon-btn icon-btn-md" aria-label="Delete" data-tip="Delete" onClick={() => runAction([t.id], 'trash')}><MdOutlineDelete /></button>
        </>
      )}
      <button
        type="button"
        className="icon-btn icon-btn-md"
        aria-label={t.unread ? 'Mark as read' : 'Mark as unread'}
        data-tip={t.unread ? 'Mark as read' : 'Mark as unread'}
        onClick={() => runAction([t.id], t.unread ? 'read' : 'unread')}
      >
        {t.unread ? <MdOutlineDrafts /> : <MdOutlineMarkEmailUnread />}
      </button>
      {!t.trashed && !t.spam && <SnoozeTrigger ids={[t.id]} icon={MdOutlineSchedule} />}
    </div>
  );

  const cls = `row ${t.unread ? 'is-unread' : 'is-read'} ${selected ? 'is-selected' : ''} ${cursor ? 'is-cursor' : ''} ${dragging ? 'is-dragging' : ''} row-${layout} density-${density} ${showChips ? 'has-chips' : ''}`;

  if (layout === 'stacked') {
    return (
      <div ref={ref} role="row" tabIndex={-1} className={cls} onClick={() => onOpen(row)} draggable onDragStart={onDragStart} onDragEnd={onDragEnd} data-thread={t.id}>
        <button type="button" className="row-avatar" aria-label={selected ? 'Deselect' : 'Select'} onClick={(e) => { e.stopPropagation(); onSelect(t.id, e); }}>
          {selected ? <span className="avatar avatar-check" style={{ width: 40, height: 40 }}><MdCheck /></span> : <Avatar contact={last.from.email === ME.email && t.messages.length > 1 ? t.messages.find((m) => m.from.email !== last.from.email)?.from ?? last.from : last.from} size={40} />}
        </button>
        <div className="row-stack">
          <div className="stack-top">
            <span className="row-sender"><Sender t={t} folder={folder} hasDraft={hasDraft} terms={terms} /></span>
            <span className="row-date" title={fullDate}>{dateText}</span>
          </div>
          <div className="stack-mid">
            <span className="row-subject">
              {importance && t.important && <MdLabelImportant className="imp-inline" aria-label="Important" />}
              {highlight(t.subject, terms)}
            </span>
          </div>
          <div className="stack-bottom">
            <span className="row-snippet">{highlight(snippet, terms)}</span>
            <button
              type="button"
              className={`row-star ${t.starred ? 'is-on' : ''}`}
              aria-label={t.starred ? 'Starred' : 'Not starred'}
              aria-pressed={t.starred}
              onClick={(e) => { e.stopPropagation(); toggleStar(t); }}
            >
              {t.starred ? <MdStar /> : <MdOutlineStarBorder />}
            </button>
          </div>
          {(rowLabels.length > 0 || attachments.length > 0) && (
            <div className="stack-chips">
              {rowLabels.map((l) => <LabelChip key={l.id} label={l} />)}
              {attachments.slice(0, 2).map((a, i) => (
                <button key={a.id} type="button" className="att-chip" onClick={(e) => { e.stopPropagation(); onOpenAttachment(attachments, i); }}>
                  <AttachmentIcon kind={a.kind} /> <span>{a.name}</span>
                </button>
              ))}
              {attachments.length > 2 && <span className="att-more">+{attachments.length - 2}</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="row"
      tabIndex={-1}
      aria-selected={selected}
      className={cls}
      onClick={() => onOpen(row)}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      data-thread={t.id}
    >
      <div className="row-lead">
        <span className="row-drag" aria-hidden><MdDragIndicator /></span>
        <Checkbox checked={selected} onChange={(e) => onSelect(t.id, e)} label={selected ? 'Deselect conversation' : 'Select conversation'} />
        <button
          type="button"
          className={`row-star ${t.starred ? 'is-on' : ''}`}
          aria-label={t.starred ? 'Starred' : 'Not starred'}
          aria-pressed={t.starred}
          data-tip={t.starred ? 'Starred' : 'Not starred'}
          onClick={(e) => { e.stopPropagation(); toggleStar(t); }}
        >
          {t.starred ? <MdStar /> : <MdOutlineStarBorder />}
        </button>
        {importance && (
          <button
            type="button"
            className={`row-imp ${t.important ? 'is-on' : ''}`}
            aria-label={t.important ? 'Important' : 'Not important'}
            aria-pressed={t.important}
            data-tip={t.important ? 'Important because you marked it as important. Click to teach Opus Mail this conversation is not important.' : 'Click to teach Opus Mail this conversation is important.'}
            onClick={(e) => { e.stopPropagation(); runAction([t.id], t.important ? 'notImportant' : 'important'); }}
          >
            {t.important ? <MdLabelImportant /> : <MdLabelImportantOutline />}
          </button>
        )}
      </div>
      <div className="row-sender">
        <Sender t={t} folder={folder} hasDraft={hasDraft} terms={terms} />
      </div>
      <div className="row-main">
        <div className="row-line">
          {t.unsnoozedAt && t.inInbox && folder === 'inbox' && <span className="snoozed-flag">Snoozed</span>}
          {showInboxChip && <SystemChip>Inbox</SystemChip>}
          {rowLabels.map((l) => <LabelChip key={l.id} label={l} />)}
          {t.muted && <SystemChip>Muted</SystemChip>}
          <span className="row-subject">{highlight(t.subject, terms)}</span>
          <span className="row-snippet"> - {highlight(snippet, terms)}</span>
        </div>
        {showChips && (
          <div className="row-chips">
            {attachments.slice(0, 3).map((a, i) => (
              <button key={a.id} type="button" className="att-chip" onClick={(e) => { e.stopPropagation(); onOpenAttachment(attachments, i); }} title={a.name}>
                <AttachmentIcon kind={a.kind} /> <span>{a.name}</span>
              </button>
            ))}
            {attachments.length > 3 && <span className="att-more">+{attachments.length - 3}</span>}
          </div>
        )}
      </div>
      {!showChips && attachments.length > 0 && <MdAttachFile className="row-clip" aria-label="Has attachment" />}
      <div className={`row-date ${snoozedView ? 'is-snoozed' : ''}`} title={fullDate}>{dateText}</div>
      {actions}
    </div>
  );
});

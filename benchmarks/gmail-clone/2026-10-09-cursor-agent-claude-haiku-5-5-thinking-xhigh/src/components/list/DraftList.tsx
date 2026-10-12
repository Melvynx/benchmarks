import { useMemo, type MouseEvent } from 'react';
import { CalendarClock, Clock, FileText, Send, Trash, X } from 'lucide-react';
import { scheduledItems, visibleDrafts } from '../../domain/selectors';
import { displayName } from '../../domain/threads';
import type { Address, Draft, Outgoing } from '../../domain/types';
import { cn } from '../../lib/cn';
import { htmlToText, snippetOf } from '../../lib/text';
import { formatListDate, formatSendAt } from '../../lib/time';
import { cancelOutgoing, removeDraft, sendOutgoingNow } from '../../store/actions';
import { reopenDraft } from '../../store/commands';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { EmptyState, IconButton } from '../ui/primitives';

const ROW =
  'group relative flex cursor-pointer items-center gap-4 border-b border-line/70 bg-surface px-4 py-2.5 text-sm hover:shadow-[0_1px_2px_rgba(60,64,67,.25)]';
const HOVER_TOOLS =
  'absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded-full bg-surface px-1 shadow-md group-hover:flex';

/** Drafts and Scheduled render as two-column rows; clicking one reopens it in compose. */
export function DraftList({ folder }: { folder: 'drafts' | 'scheduled' }) {
  const data = useMail((s) => s.data);
  const now = Date.now();
  const drafts = useMemo(() => visibleDrafts(data), [data]);
  const scheduled = useMemo(() => scheduledItems(data), [data]);
  const count = folder === 'drafts' ? drafts.length : scheduled.length;

  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={folder === 'drafts' ? 'Drafts' : 'Scheduled'}>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-line px-4">
        <h2 className="font-medium">{folder === 'drafts' ? 'Drafts' : 'Scheduled'}</h2>
        <span className="text-sm text-ink-3">{count}</span>
        <p className="ml-auto hidden text-xs text-ink-3 md:block">
          {folder === 'drafts'
            ? 'Drafts save as you type.'
            : 'Scheduled and offline messages wait here until they send.'}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {count === 0 && folder === 'drafts' && (
          <EmptyState icon={<FileText />} title="No drafts" body="Messages you start but don't send will wait here." />
        )}
        {count === 0 && folder === 'scheduled' && (
          <EmptyState
            icon={<CalendarClock />}
            title="Nothing scheduled"
            body="Use the arrow next to Send to schedule a message."
          />
        )}
        {folder === 'drafts' &&
          drafts.map((draft) => <DraftItem key={draft.id} draft={draft} now={now} />)}
        {folder === 'scheduled' &&
          scheduled.map((out) => <ScheduledItem key={out.id} out={out} now={now} />)}
      </div>
    </section>
  );
}

function recipientsOf(list: Address[]): string {
  return list.length === 0 ? '(no recipient)' : list.map(displayName).join(', ');
}

function DraftItem({ draft, now }: { draft: Draft; now: number }) {
  const preview = snippetOf(htmlToText(draft.html), 120);
  return (
    <div role="row" onClick={() => reopenDraft(draft.id)} className={ROW}>
      <span className="w-[200px] shrink-0 truncate text-ink-2 max-md:w-[120px]">
        <span className="font-medium text-danger">Draft</span>
        <span className="ml-2">{recipientsOf(draft.to)}</span>
      </span>
      <span className="flex min-w-0 flex-1 gap-2 truncate">
        <span className="shrink-0 font-medium text-ink">{draft.subject || '(no subject)'}</span>
        {preview && <span className="truncate text-ink-3">{`– ${preview}`}</span>}
      </span>
      <span className="w-[72px] shrink-0 text-right text-xs text-ink-3">{formatListDate(draft.updatedAt, now)}</span>
      <div className={HOVER_TOOLS}>
        <IconButton
          label="Discard draft"
          className="size-8"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            removeDraft(draft.id);
          }}
        >
          <Trash className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

function ScheduledItem({ out, now }: { out: Outgoing; now: number }) {
  const offline = out.kind === 'queued';
  const when = offline ? 'Waiting to send' : formatSendAt(out.sendAt, now);

  /** Pulls the message back out of the queue and reopens it in compose. */
  const edit = () => {
    const draft = cancelOutgoing(out.id);
    if (!draft) return;
    useUI.getState().openCompose(draft.id);
    useUI.getState().toast({ message: 'Send cancelled. The message is back in Drafts.' });
  };

  return (
    <div role="row" onClick={edit} className={ROW}>
      <span className="w-[200px] shrink-0 truncate text-ink-2 max-md:w-[120px]">{recipientsOf(out.draft.to)}</span>
      <span className="flex min-w-0 flex-1 gap-2 truncate">
        <span className="shrink-0 font-medium text-ink">{out.draft.subject || '(no subject)'}</span>
        <span className="truncate text-ink-3">{`– ${snippetOf(htmlToText(out.draft.html), 120)}`}</span>
      </span>
      <span
        className={cn(
          'flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          offline ? 'bg-warn-soft text-warn' : 'bg-primary-soft text-ink',
        )}
      >
        {offline ? <Clock className="size-3.5" /> : <CalendarClock className="size-3.5" />}
        {when}
      </span>
      <div className={HOVER_TOOLS}>
        <IconButton
          label="Send now"
          className="size-8"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            sendOutgoingNow(out.id);
          }}
        >
          <Send className="size-4" />
        </IconButton>
        <IconButton
          label="Cancel send"
          className="size-8"
          onClick={(e: MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            cancelOutgoing(out.id);
            useUI.getState().toast({ message: 'Send cancelled. The message is back in Drafts.' });
          }}
        >
          <X className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}

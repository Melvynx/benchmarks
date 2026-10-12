import { useEffect, useState, type MouseEvent } from 'react';
import { Archive, ArrowLeft, Clock, CornerUpLeft, Forward, Mail, Reply, ReplyAll, Star, Tag, Trash } from 'lucide-react';
import { isUnread, lastMessage } from '../../domain/threads';
import type { Thread } from '../../domain/types';
import { cn } from '../../lib/cn';
import { go, type Route } from '../../lib/route';
import * as actions from '../../store/actions';
import * as commands from '../../store/commands';
import { useMail } from '../../store/mailStore';
import { useUI } from '../../store/uiStore';
import { LABEL_CHIP } from '../labelStyles';
import { Button } from '../ui/Button';
import { EmptyState, IconButton } from '../ui/primitives';
import { MessageCard } from './MessageCard';

interface ThreadViewProps {
  route: Route;
}

/** Reading pane for the open conversation. Remounts per thread so expansion state resets naturally. */
export function ThreadView({ route }: ThreadViewProps) {
  const threadId = route.threadId;
  const thread = useMail((s) => (threadId ? (s.data.threads.find((t) => t.id === threadId) ?? null) : null));
  if (!threadId) return null;
  return <ThreadBody key={threadId} thread={thread} route={route} />;
}

function ThreadBody({ thread, route }: { thread: Thread | null; route: Route }) {
  const account = useMail((s) => s.data.account);
  const labels = useMail((s) => s.data.labels);
  const now = Date.now();
  const [unreadAtOpen] = useState(() => new Set(thread?.messages.filter((m) => m.unread).map((m) => m.id) ?? []));
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const threadId = thread?.id;

  // Opening a conversation reads it, like Gmail. Unread messages were expanded at open time.
  useEffect(() => {
    if (!threadId) return;
    const current = useMail.getState().data.threads.find((t) => t.id === threadId);
    if (current && isUnread(current)) actions.setRead([threadId], true);
  }, [threadId]);

  const back = () => go({ ...route, threadId: null });

  if (!thread) {
    return (
      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        <EmptyState
          icon={<Mail />}
          title="This conversation isn’t here anymore"
          body="It may have been deleted or moved."
        />
        <div className="flex justify-center pb-10">
          <Button variant="secondary" size="sm" onClick={back}>
            Back to list
          </Button>
        </div>
      </section>
    );
  }

  const last = lastMessage(thread);
  const lastIndex = thread.messages.length - 1;
  const isExpanded = (index: number, id: string) => toggled[id] ?? (index === lastIndex || unreadAtOpen.has(id));
  const toggle = (index: number, id: string) => setToggled((t) => ({ ...t, [id]: !isExpanded(index, id) }));
  const expandAll = () => setToggled(Object.fromEntries(thread.messages.map((m) => [m.id, true])));

  const inTrash = thread.location === 'trash';
  const inSpam = thread.location === 'spam';

  const archive = () => {
    commands.archiveThreads([thread.id]);
    back();
  };
  const remove = () => {
    if (inTrash) commands.deleteForever([thread.id]);
    else commands.trashThreads([thread.id]);
    back();
  };
  const markUnread = () => {
    actions.setMessageUnread(thread.id, last.id, true);
    back();
  };
  const reply = (mode: 'reply' | 'replyAll' | 'forward') => {
    if (mode === 'forward') {
      commands.startForwardCompose(thread);
      return;
    }
    useUI.getState().openCompose(commands.startReplyCompose(thread, mode));
  };
  const openMenuFrom = (kind: 'snooze' | 'labels') => (e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    commands.openMenu({ kind, ids: [thread.id], x: rect.left, y: rect.bottom });
  };

  const location =
    inTrash ? 'Trash' : inSpam ? 'Spam' : thread.location === 'archive' ? 'All Mail' : null;
  const threadLabels = labels.filter((l) => thread.labelIds.includes(l.id));

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface" aria-label="Conversation">
      <div className="flex h-12 shrink-0 items-center gap-0.5 border-b border-line px-2 md:px-3">
        <IconButton label="Back to list" onClick={back} className="size-9">
          <ArrowLeft className="size-[18px]" />
        </IconButton>
        <div className="mx-1 h-5 w-px bg-line" />
        <IconButton label="Archive" onClick={archive} disabled={thread.location === 'archive'} className="size-9">
          <Archive className="size-[18px]" />
        </IconButton>
        <IconButton label={inTrash ? 'Delete forever' : 'Delete'} onClick={remove} className="size-9">
          <Trash className="size-[18px]" />
        </IconButton>
        {(inTrash || inSpam) && (
          <IconButton label="Move to Inbox" onClick={() => { commands.moveToInbox([thread.id]); back(); }} className="size-9">
            <CornerUpLeft className="size-[18px]" />
          </IconButton>
        )}
        <IconButton label="Mark as unread" onClick={markUnread} className="size-9 hidden sm:inline-flex">
          <Mail className="size-[18px]" />
        </IconButton>
        <IconButton label="Snooze" onClick={openMenuFrom('snooze')} className="size-9">
          <Clock className="size-[18px]" />
        </IconButton>
        <IconButton label="Labels" onClick={openMenuFrom('labels')} className="size-9">
          <Tag className="size-[18px]" />
        </IconButton>
        <div className="ml-auto flex items-center gap-0.5">
          <IconButton
            label={thread.starred ? 'Unstar conversation' : 'Star conversation'}
            onClick={() => commands.toggleStar([thread.id])}
            className="size-9"
          >
            <Star className={cn('size-[18px]', thread.starred && 'fill-[#f4b400] text-[#f4b400]')} />
          </IconButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <header className="mx-auto flex max-w-[1040px] flex-wrap items-center gap-x-3 gap-y-2 px-4 pb-3 pt-5 md:px-6">
          <h1 className="min-w-0 break-words text-[20px] font-normal leading-7 text-ink md:text-[22px]">{thread.subject}</h1>
          {location && (
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{location}</span>
          )}
          {threadLabels.map((label) => (
            <span key={label.id} className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', LABEL_CHIP[label.color])}>
              {label.name}
            </span>
          ))}
          {thread.messages.length > 1 && (
            <button type="button" onClick={expandAll} className="ml-auto text-xs font-medium text-primary hover:underline">
              Expand all ({thread.messages.length})
            </button>
          )}
        </header>

        <div className="mx-auto max-w-[1040px] border-t border-line">
          {thread.messages.map((message, index) => (
            <MessageCard
              key={message.id}
              message={message}
              me={account}
              now={now}
              expanded={isExpanded(index, message.id)}
              onToggle={() => toggle(index, message.id)}
            />
          ))}
        </div>

        <div className="mx-auto flex max-w-[1040px] flex-wrap gap-2 px-4 py-6 md:px-6">
          <Button variant="secondary" size="sm" onClick={() => reply('reply')}>
            <Reply className="size-4" />
            Reply
          </Button>
          <Button variant="secondary" size="sm" onClick={() => reply('replyAll')}>
            <ReplyAll className="size-4" />
            Reply all
          </Button>
          <Button variant="secondary" size="sm" onClick={() => reply('forward')}>
            <Forward className="size-4" />
            Forward
          </Button>
        </div>
      </div>
    </section>
  );
}

import { displayName, lastMessage } from '../domain/threads';
import { go, goFolder } from '../lib/route';
import { tick } from './actions';
import { useMail } from './mailStore';
import { useUI } from './uiStore';

/** Runs time-based transitions (undo-send window, scheduled sends, snoozes, new mail). */
export function runScheduler(): void {
  const now = Date.now();
  const online = navigator.onLine && !useMail.getState().data.settings.offline;
  const events = tick(now, online);
  const ui = useUI.getState();

  for (const out of events.delivered) {
    if (out.kind === 'scheduled') ui.toast({ message: 'Scheduled message sent', duration: 5000 });
    if (out.kind === 'queued') ui.toast({ message: 'Your offline message was sent', duration: 5000 });
  }

  if (events.woke.length > 0) {
    const message =
      events.woke.length === 1
        ? `“${events.woke[0].subject}” is back in your inbox`
        : `${events.woke.length} snoozed conversations are back in your inbox`;
    ui.toast({ message, actionLabel: 'View', onAction: () => goFolder('inbox'), duration: 6000 });
  }

  for (const thread of events.incoming) {
    ui.toast({
      message: `New message from ${displayName(lastMessage(thread).from)}`,
      actionLabel: 'Open',
      onAction: () => go({ section: { kind: 'folder', folder: 'inbox' }, threadId: thread.id }),
      duration: 6000,
    });
  }
}

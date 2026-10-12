import { WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/useApp';
import * as actions from '../../store/actions';
import { useMail } from '../../store/mailStore';

/** Shown when the browser is offline or the user has switched on "Work offline". */
export function OfflineBanner() {
  const manual = useMail((s) => s.data.settings.offline);
  const online = useOnline();
  if (online && !manual) return null;

  const message = online
    ? 'Working offline. Messages you send wait in Scheduled until you reconnect.'
    : 'You’re offline. Messages you send wait in Scheduled and go out when you reconnect.';

  return (
    <div role="status" className="flex items-center gap-3 bg-warn-soft px-4 py-2 text-sm text-warn">
      <WifiOff className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      {manual && (
        <button
          type="button"
          onClick={() => actions.updateSettings({ offline: false })}
          className="shrink-0 rounded-full px-3 py-1 font-medium hover:bg-black/5 dark:hover:bg-white/10"
        >
          Go online
        </button>
      )}
    </div>
  );
}

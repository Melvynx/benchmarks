import { useMail } from '../store/mailStore';

export function Toasts() {
  const toasts = useMail((s) => s.toasts);
  const undo = useMail((s) => s.undo);
  const dismiss = useMail((s) => s.dismissToast);

  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          <span className="toast-msg">{t.message}</span>
          {t.actionLabel && (
            <button className="toast-action" onClick={() => undo(t.id)}>
              {t.actionLabel}
            </button>
          )}
          <button className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

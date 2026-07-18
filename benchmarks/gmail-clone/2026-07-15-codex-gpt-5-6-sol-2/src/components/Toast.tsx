import { X } from 'lucide-react';

import type { ToastState } from '../domain/mail';

interface ToastProps {
  toast: ToastState | null;
  onAction: () => void;
  onClose: () => void;
}

export function Toast({ toast, onAction, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{toast.message}</span>
      {toast.actionLabel ? (
        <button type="button" onClick={onAction}>
          {toast.actionLabel}
        </button>
      ) : null}
      <button type="button" className="toast__close" aria-label="Dismiss" onClick={onClose}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

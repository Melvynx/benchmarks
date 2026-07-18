import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react';

import { cx } from './internal';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastAction {
  label: string;
  onAction: () => void;
}

export interface ToastData {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: ToastAction;
  duration?: number;
}

export interface ToastItemProps extends ToastData {
  onDismiss?: (id: string) => void;
  className?: string;
}

const TONE_ICONS: Readonly<Record<ToastTone, LucideIcon>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
};

export function ToastItem({
  id,
  title,
  description,
  tone = 'info',
  action,
  duration = 5000,
  onDismiss,
  className,
}: ToastItemProps) {
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const remainingRef = useRef(duration);
  const ToneIcon = TONE_ICONS[tone];

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!onDismiss || duration <= 0) return;
    startedAtRef.current = performance.now();
    timerRef.current = window.setTimeout(() => onDismiss(id), remainingRef.current);
  }, [clearTimer, duration, id, onDismiss]);

  useEffect(() => {
    remainingRef.current = duration;
    startTimer();
    return clearTimer;
  }, [clearTimer, duration, startTimer]);

  const pauseTimer = () => {
    if (timerRef.current === null) return;
    remainingRef.current = Math.max(
      0,
      remainingRef.current - (performance.now() - startedAtRef.current),
    );
    clearTimer();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !onDismiss) return;
    event.preventDefault();
    onDismiss(id);
  };

  return (
    <div
      className={cx('ui-toast', className)}
      data-tone={tone}
      role={tone === 'danger' ? 'alert' : 'status'}
      tabIndex={0}
      onPointerEnter={pauseTimer}
      onPointerLeave={startTimer}
      onFocus={pauseTimer}
      onBlur={startTimer}
      onKeyDown={handleKeyDown}
    >
      <ToneIcon className="ui-toast__icon" size={17} aria-hidden="true" />
      <div className="ui-toast__copy">
        <div className="ui-toast__title">{title}</div>
        {description ? <div className="ui-toast__description">{description}</div> : null}
      </div>
      {action ? (
        <button
          type="button"
          className="ui-toast__action"
          onClick={() => {
            action.onAction();
            onDismiss?.(id);
          }}
        >
          {action.label}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          type="button"
          className="ui-toast__dismiss"
          aria-label="Dismiss notification"
          onClick={() => onDismiss(id)}
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

export interface ToastViewportProps {
  toasts: readonly ToastData[];
  onDismiss: (id: string) => void;
  className?: string;
  label?: string;
}

export function ToastViewport({
  toasts,
  onDismiss,
  className,
  label = 'Notifications',
}: ToastViewportProps) {
  return (
    <section
      className={cx('ui-toast-viewport', className)}
      aria-label={label}
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onDismiss={onDismiss} />
      ))}
    </section>
  );
}

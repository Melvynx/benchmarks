import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useToastStore } from '../../store/toast-store';

const TOAST_DURATION_MS = 5000;

export function Toaster() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(dismiss, TOAST_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast, dismiss]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            role="status"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 480, damping: 34 }}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink py-1.5 pr-1.5 pl-4 text-sm text-canvas shadow-[var(--shadow-pop)]"
          >
            <span className="font-medium">{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                onClick={() => {
                  toast.action?.run();
                  dismiss();
                }}
                className="rounded-full bg-canvas/15 px-3 py-1 text-[0.8125rem] font-semibold transition-colors hover:bg-canvas/25"
              >
                {toast.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={dismiss}
              className="grid size-7 place-items-center rounded-full text-canvas/60 transition-colors hover:bg-canvas/15 hover:text-canvas"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

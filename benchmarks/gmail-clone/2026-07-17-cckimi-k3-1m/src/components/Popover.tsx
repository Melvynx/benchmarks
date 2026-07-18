import { useEffect, useRef, type ReactNode } from 'react';
import { cx } from '../lib/utils';

/** Absolutely-positioned dropdown panel; parent must be position:relative. */
export function Popover({
  open, onClose, children, className, align = 'left', width,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      ref={ref}
      data-modal-open="true"
      className={cx('popover', align === 'right' && 'popover-right', className)}
      style={width ? { width } : undefined}
      role="menu"
    >
      {children}
    </div>
  );
}

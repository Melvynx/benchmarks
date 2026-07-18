import {
  useEffect,
  useId,
  useRef,
  type AriaRole,
  type KeyboardEventHandler,
  type ReactNode,
} from 'react';

import { cx, FOCUSABLE_SELECTOR, useControllableState } from './internal';

export type PopoverPlacement =
  | 'top-start'
  | 'top-end'
  | 'right-start'
  | 'right-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end';

export interface PopoverRenderContext {
  close: () => void;
}

export interface PopoverProps {
  trigger: ReactNode;
  triggerLabel: string;
  children: ReactNode | ((context: PopoverRenderContext) => ReactNode);
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: PopoverPlacement;
  disabled?: boolean;
  contentRole?: AriaRole;
  contentLabel?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  onContentKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  autoFocus?: boolean;
}

export function Popover({
  trigger,
  triggerLabel,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-start',
  disabled = false,
  contentRole = 'dialog',
  contentLabel,
  className,
  triggerClassName,
  contentClassName,
  onContentKeyDown,
  autoFocus = true,
}: PopoverProps) {
  const contentId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !rootRef.current?.contains(target)) setIsOpen(false);
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, setIsOpen]);

  useEffect(() => {
    if (!isOpen || !autoFocus) return;
    const animationFrame = requestAnimationFrame(() => {
      const focusTarget = contentRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      focusTarget?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [autoFocus, isOpen]);

  const close = () => setIsOpen(false);
  const renderedContent = typeof children === 'function' ? children({ close }) : children;

  return (
    <div ref={rootRef} className={cx('ui-popover', className)} data-open={isOpen ? '' : undefined}>
      <button
        ref={triggerRef}
        type="button"
        className={cx('ui-popover__trigger', triggerClassName)}
        aria-label={triggerLabel}
        aria-haspopup={contentRole === 'menu' ? 'menu' : 'dialog'}
        aria-expanded={isOpen}
        aria-controls={isOpen ? contentId : undefined}
        disabled={disabled}
        onClick={() => setIsOpen((previousOpen) => !previousOpen)}
      >
        {trigger}
      </button>
      {isOpen ? (
        <div
          ref={contentRef}
          id={contentId}
          role={contentRole}
          aria-label={contentLabel ?? triggerLabel}
          className={cx('ui-popover__content', contentClassName)}
          data-placement={placement}
          onKeyDown={onContentKeyDown}
        >
          {renderedContent}
        </div>
      ) : null}
    </div>
  );
}

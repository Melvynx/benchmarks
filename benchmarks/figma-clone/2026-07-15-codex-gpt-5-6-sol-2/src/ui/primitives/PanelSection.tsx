import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';

import { cx, useControllableState } from './internal';

export interface PanelSectionProps {
  title: string;
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
  unmountWhenClosed?: boolean;
}

export function PanelSection({
  title,
  children,
  open,
  defaultOpen = true,
  onOpenChange,
  actions,
  className,
  contentClassName,
  unmountWhenClosed = false,
}: PanelSectionProps) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  return (
    <section className={cx('ui-panel-section', className)} data-open={isOpen ? '' : undefined}>
      <div className="ui-panel-section__header">
        <button
          type="button"
          className="ui-panel-section__disclosure"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((previousOpen) => !previousOpen)}
        >
          <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />
          <span>{title}</span>
        </button>
        {actions ? <div className="ui-panel-section__actions">{actions}</div> : null}
      </div>
      {unmountWhenClosed && !isOpen ? null : (
        <div
          id={contentId}
          className={cx('ui-panel-section__content', contentClassName)}
          hidden={!isOpen}
        >
          {children}
        </div>
      )}
    </section>
  );
}

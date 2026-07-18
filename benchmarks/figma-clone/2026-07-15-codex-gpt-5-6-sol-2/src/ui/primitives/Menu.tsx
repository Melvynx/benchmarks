import { Check, Circle, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

import { cx, useControllableState } from './internal';
import { Popover, type PopoverPlacement } from './Popover';

export interface MenuActionEntry {
  type: 'item';
  id: string;
  label: string;
  icon?: LucideIcon;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  checked?: boolean;
  radio?: boolean;
}

export interface MenuSeparatorEntry {
  type: 'separator';
  id: string;
}

export interface MenuLabelEntry {
  type: 'label';
  id: string;
  label: string;
}

export type MenuEntry = MenuActionEntry | MenuSeparatorEntry | MenuLabelEntry;

export interface MenuProps {
  trigger: ReactNode;
  triggerLabel: string;
  entries: readonly MenuEntry[];
  onAction: (id: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placement?: PopoverPlacement;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  closeOnAction?: boolean;
}

export function Menu({
  trigger,
  triggerLabel,
  entries,
  onAction,
  open,
  defaultOpen = false,
  onOpenChange,
  placement = 'bottom-start',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  closeOnAction = true,
}: MenuProps) {
  const [isOpen, setIsOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const typeaheadRef = useRef('');
  const typeaheadTimerRef = useRef<number | null>(null);
  const enabledIndices = useMemo(
    () =>
      entries.flatMap((entry, index) => (entry.type === 'item' && !entry.disabled ? [index] : [])),
    [entries],
  );
  const [activeIndex, setActiveIndex] = useState(enabledIndices[0] ?? -1);

  useEffect(() => {
    if (isOpen) setActiveIndex(enabledIndices[0] ?? -1);
  }, [enabledIndices, isOpen]);

  useEffect(
    () => () => {
      if (typeaheadTimerRef.current !== null) window.clearTimeout(typeaheadTimerRef.current);
    },
    [],
  );

  const focusIndex = (index: number) => {
    setActiveIndex(index);
    itemRefs.current[index]?.focus({ preventScroll: true });
  };

  const moveFocus = (direction: 1 | -1) => {
    if (enabledIndices.length === 0) return;
    const position = enabledIndices.indexOf(activeIndex);
    const safePosition = position < 0 ? 0 : position;
    const nextPosition = (safePosition + direction + enabledIndices.length) % enabledIndices.length;
    const nextIndex = enabledIndices[nextPosition];
    if (nextIndex !== undefined) focusIndex(nextIndex);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveFocus(1);
        return;
      case 'ArrowUp':
        event.preventDefault();
        moveFocus(-1);
        return;
      case 'Home': {
        event.preventDefault();
        const firstIndex = enabledIndices[0];
        if (firstIndex !== undefined) focusIndex(firstIndex);
        return;
      }
      case 'End': {
        event.preventDefault();
        const lastIndex = enabledIndices.at(-1);
        if (lastIndex !== undefined) focusIndex(lastIndex);
        return;
      }
      case 'Tab':
        setIsOpen(false);
        return;
      default:
        break;
    }

    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) return;
    typeaheadRef.current += event.key.toLocaleLowerCase();
    if (typeaheadTimerRef.current !== null) window.clearTimeout(typeaheadTimerRef.current);
    typeaheadTimerRef.current = window.setTimeout(() => {
      typeaheadRef.current = '';
    }, 500);
    const matchingIndex = entries.findIndex(
      (entry) =>
        entry.type === 'item' &&
        !entry.disabled &&
        entry.label.toLocaleLowerCase().startsWith(typeaheadRef.current),
    );
    if (matchingIndex >= 0) focusIndex(matchingIndex);
  };

  return (
    <Popover
      trigger={trigger}
      triggerLabel={triggerLabel}
      open={isOpen}
      onOpenChange={setIsOpen}
      placement={placement}
      disabled={disabled}
      contentRole="menu"
      className={className ?? ''}
      triggerClassName={triggerClassName ?? ''}
      contentClassName={cx('ui-menu', contentClassName)}
      onContentKeyDown={handleKeyDown}
    >
      {({ close }) =>
        entries.map((entry, index) => {
          if (entry.type === 'separator') {
            return <div key={entry.id} className="ui-menu__separator" role="separator" />;
          }
          if (entry.type === 'label') {
            return (
              <div key={entry.id} className="ui-menu__label" role="presentation">
                {entry.label}
              </div>
            );
          }

          const EntryIcon = entry.icon;
          const itemRole = entry.checked === undefined ? 'menuitem' : 'menuitemcheckbox';
          return (
            <button
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              key={entry.id}
              type="button"
              role={itemRole}
              aria-checked={entry.checked}
              className={cx('ui-menu__item', entry.danger && 'ui-menu__item--danger')}
              disabled={entry.disabled}
              tabIndex={activeIndex === index ? 0 : -1}
              onPointerMove={() => {
                if (!entry.disabled) focusIndex(index);
              }}
              onClick={() => {
                onAction(entry.id);
                if (closeOnAction) close();
              }}
            >
              <span className="ui-menu__item-icon" aria-hidden="true">
                {entry.checked !== undefined ? (
                  entry.checked ? (
                    entry.radio ? (
                      <Circle size={8} fill="currentColor" />
                    ) : (
                      <Check size={14} />
                    )
                  ) : null
                ) : EntryIcon ? (
                  <EntryIcon size={15} />
                ) : null}
              </span>
              <span className="ui-menu__item-label">{entry.label}</span>
              {entry.shortcut ? <kbd className="ui-menu__shortcut">{entry.shortcut}</kbd> : null}
            </button>
          );
        })
      }
    </Popover>
  );
}

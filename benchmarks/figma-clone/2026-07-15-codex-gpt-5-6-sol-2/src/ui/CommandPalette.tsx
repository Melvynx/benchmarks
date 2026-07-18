import { Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useFocusTrap } from '@/ui/useFocusManagement';

import type { LucideIcon } from 'lucide-react';

export type CommandGroup = 'Recent' | 'Tools' | 'Selection' | 'Arrange' | 'View' | 'File';

export interface CommandAction {
  readonly id: string;
  readonly label: string;
  readonly group: CommandGroup;
  readonly shortcut?: string;
  readonly icon: LucideIcon;
  readonly keywords?: readonly string[];
  readonly disabledReason?: string;
  readonly run: () => void;
}

export interface CommandPaletteProps {
  readonly open: boolean;
  readonly actions: readonly CommandAction[];
  readonly onOpenChange: (open: boolean) => void;
}

function scoreMatch(action: CommandAction, query: string) {
  if (!query) return 1;
  const normalized = query.toLocaleLowerCase();
  const label = action.label.toLocaleLowerCase();
  if (label.startsWith(normalized)) return 100 - label.length;
  if (label.includes(normalized)) return 70 - label.indexOf(normalized);
  if (action.keywords?.some((keyword) => keyword.toLocaleLowerCase().includes(normalized)))
    return 40;

  let cursor = 0;
  for (const character of label) {
    if (character === normalized[cursor]) cursor += 1;
    if (cursor === normalized.length) return 20;
  }
  return 0;
}

export function CommandPalette({ open, actions, onOpenChange }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = actions
    .map((action) => ({ action, score: scoreMatch(action, query.trim()) }))
    .filter(({ score }) => score > 0)
    .toSorted(
      (first, second) =>
        second.score - first.score || first.action.label.localeCompare(second.action.label),
    )
    .map(({ action }) => action);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
  }, [open]);

  useFocusTrap({ enabled: open, containerRef: dialogRef, initialFocusRef: inputRef });

  if (!open) return null;

  const runAction = (action: CommandAction) => {
    if (action.disabledReason) return;
    action.run();
    onOpenChange(false);
  };

  return (
    <div
      className="command-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
    >
      <section
        ref={dialogRef}
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onOpenChange(false);
            return;
          }
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
            return;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex((index) => Math.max(0, index - 1));
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            const action = filtered[activeIndex];
            if (action) runAction(action);
          }
        }}
      >
        <div className="command-search">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            aria-label="Search commands"
            placeholder="Search tools and commands"
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setActiveIndex(0);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results" role="listbox" aria-label="Available commands">
          {filtered.length === 0 ? (
            <div className="command-empty">
              <Search size={20} aria-hidden="true" />
              <span>No command matches “{query}”</span>
            </div>
          ) : (
            filtered.map((action, index) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  aria-disabled={action.disabledReason ? true : undefined}
                  className="command-result"
                  data-active={activeIndex === index ? 'true' : undefined}
                  disabled={Boolean(action.disabledReason)}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => runAction(action)}
                >
                  <span className="command-result__icon">
                    <ActionIcon size={15} aria-hidden="true" />
                  </span>
                  <span className="command-result__copy">
                    <strong>{action.label}</strong>
                    <small>{action.disabledReason ?? action.group}</small>
                  </span>
                  {action.shortcut ? <kbd>{action.shortcut}</kbd> : null}
                </button>
              );
            })
          )}
        </div>
        <footer className="command-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Run</span>
          <span>Esc Close</span>
        </footer>
      </section>
    </div>
  );
}

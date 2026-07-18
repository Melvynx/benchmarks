import {
  BringToFront,
  Copy,
  CopyPlus,
  Download,
  Eye,
  Group,
  Lock,
  Scissors,
  SendToBack,
  Trash2,
  Ungroup,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { LucideIcon } from 'lucide-react';
import { moveMenuFocus } from '@/ui/useFocusManagement';

export type ContextActionId =
  | 'cut'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'group'
  | 'ungroup'
  | 'front'
  | 'back'
  | 'toggle-visibility'
  | 'toggle-lock'
  | 'export-svg'
  | 'delete';

interface ContextEntry {
  readonly id: ContextActionId;
  readonly label: string;
  readonly shortcut?: string;
  readonly icon: LucideIcon;
  readonly separated?: boolean;
  readonly danger?: boolean;
}

const ENTRIES: readonly ContextEntry[] = [
  { id: 'cut', label: 'Cut', shortcut: '⌘X', icon: Scissors },
  { id: 'copy', label: 'Copy', shortcut: '⌘C', icon: Copy },
  { id: 'paste', label: 'Paste', shortcut: '⌘V', icon: CopyPlus },
  { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', icon: CopyPlus, separated: true },
  { id: 'group', label: 'Group selection', shortcut: '⌘G', icon: Group, separated: true },
  { id: 'ungroup', label: 'Ungroup', shortcut: '⇧⌘G', icon: Ungroup },
  { id: 'front', label: 'Bring to front', shortcut: '⇧⌘]', icon: BringToFront, separated: true },
  { id: 'back', label: 'Send to back', shortcut: '⇧⌘[', icon: SendToBack },
  { id: 'toggle-visibility', label: 'Show or hide', icon: Eye, separated: true },
  { id: 'toggle-lock', label: 'Lock or unlock', icon: Lock },
  { id: 'export-svg', label: 'Export selection as SVG', icon: Download, separated: true },
  { id: 'delete', label: 'Delete', shortcut: '⌫', icon: Trash2, danger: true, separated: true },
];

export interface ContextMenuProps {
  readonly x: number;
  readonly y: number;
  readonly hasSelection: boolean;
  readonly canUngroup: boolean;
  readonly onAction: (id: ContextActionId) => void;
  readonly onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  hasSelection,
  canUngroup,
  onAction,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="context-menu"
      role="menu"
      aria-label="Canvas actions"
      onKeyDown={(event) => {
        if (moveMenuFocus(event.currentTarget, event.key)) event.preventDefault();
      }}
      style={{
        left: Math.min(x, window.innerWidth - 252),
        top: Math.min(y, window.innerHeight - 414),
      }}
    >
      {ENTRIES.map((entry) => {
        const EntryIcon = entry.icon;
        const requiresSelection = !['paste'].includes(entry.id);
        const isDisabled =
          (requiresSelection && !hasSelection) || (entry.id === 'ungroup' && !canUngroup);
        return (
          <div key={entry.id} className={entry.separated ? 'context-menu__separated' : undefined}>
            <button
              type="button"
              role="menuitem"
              className="context-menu__item"
              data-danger={entry.danger ? 'true' : undefined}
              disabled={isDisabled}
              onClick={() => {
                onAction(entry.id);
                onClose();
              }}
            >
              <EntryIcon size={15} aria-hidden="true" />
              <span>{entry.label}</span>
              {entry.shortcut ? <kbd>{entry.shortcut}</kbd> : null}
            </button>
          </div>
        );
      })}
    </div>
  );
}

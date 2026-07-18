import {
  Check,
  ChevronRight,
  FileDown,
  FilePlus2,
  FileUp,
  Grid3X3,
  History,
  Magnet,
  PanelLeftClose,
  PanelRightClose,
  Ruler,
  Search,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { DocumentManifestEntry } from '@/editor/persistence';
import { moveMenuFocus } from '@/ui/useFocusManagement';

export type MainMenuAction =
  | 'new-document'
  | 'import-json'
  | 'export'
  | 'command-palette'
  | 'toggle-grid'
  | 'toggle-rulers'
  | 'toggle-snapping'
  | 'toggle-left-panel'
  | 'toggle-right-panel';

export interface MainMenuProps {
  readonly documents: readonly DocumentManifestEntry[];
  readonly activeDocumentId: string;
  readonly gridVisible: boolean;
  readonly rulersVisible: boolean;
  readonly snappingEnabled: boolean;
  readonly leftPanelOpen: boolean;
  readonly rightPanelOpen: boolean;
  readonly onAction: (action: MainMenuAction) => void;
  readonly onOpenDocument: (documentId: string) => void;
  readonly onClose: () => void;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function Checkmark({ checked }: { readonly checked: boolean }) {
  return <span className="main-menu__check">{checked ? <Check size={13} /> : null}</span>;
}

export function MainMenu({
  documents,
  activeDocumentId,
  gridVisible,
  rulersVisible,
  snappingEnabled,
  leftPanelOpen,
  rightPanelOpen,
  onAction,
  onOpenDocument,
  onClose,
}: MainMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeForPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) onClose();
    };
    const closeForKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', closeForPointer);
    window.addEventListener('keydown', closeForKey);
    window.requestAnimationFrame(() =>
      menuRef.current?.querySelector<HTMLButtonElement>('button')?.focus(),
    );
    return () => {
      window.removeEventListener('pointerdown', closeForPointer);
      window.removeEventListener('keydown', closeForKey);
    };
  }, [onClose]);

  const run = (action: MainMenuAction) => {
    onAction(action);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="main-menu"
      role="menu"
      aria-label="Main menu"
      onKeyDown={(event) => {
        if (moveMenuFocus(event.currentTarget, event.key)) event.preventDefault();
      }}
    >
      <div className="main-menu__section">
        <button type="button" role="menuitem" onClick={() => run('new-document')}>
          <FilePlus2 size={15} />
          <span>New document</span>
          <kbd>⌘N</kbd>
        </button>
        <button type="button" role="menuitem" onClick={() => run('import-json')}>
          <FileUp size={15} />
          <span>Import JSON…</span>
          <kbd>⇧⌘O</kbd>
        </button>
        <button type="button" role="menuitem" onClick={() => run('export')}>
          <FileDown size={15} />
          <span>Export…</span>
          <kbd>⇧⌘E</kbd>
        </button>
      </div>

      <div className="main-menu__section">
        <div className="main-menu__label">
          <History size={12} />
          Recent documents
        </div>
        {documents.length === 0 ? (
          <div className="main-menu__empty">No locally saved documents</div>
        ) : (
          documents.slice(0, 5).map((document) => (
            <button
              key={document.id}
              type="button"
              role="menuitem"
              className="main-menu__document"
              onClick={() => {
                onOpenDocument(document.id);
                onClose();
              }}
            >
              <Checkmark checked={document.id === activeDocumentId} />
              <span>
                <strong>{document.name}</strong>
                <small>{formatUpdatedAt(document.updatedAt)}</small>
              </span>
              <ChevronRight size={13} />
            </button>
          ))
        )}
      </div>

      <div className="main-menu__section">
        <button type="button" role="menuitem" onClick={() => run('command-palette')}>
          <Search size={15} />
          <span>Quick actions</span>
          <kbd>⌘/</kbd>
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={gridVisible}
          onClick={() => run('toggle-grid')}
        >
          <Grid3X3 size={15} />
          <span>Pixel grid</span>
          <Checkmark checked={gridVisible} />
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={rulersVisible}
          onClick={() => run('toggle-rulers')}
        >
          <Ruler size={15} />
          <span>Rulers</span>
          <Checkmark checked={rulersVisible} />
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={snappingEnabled}
          onClick={() => run('toggle-snapping')}
        >
          <Magnet size={15} />
          <span>Smart snapping</span>
          <Checkmark checked={snappingEnabled} />
        </button>
      </div>

      <div className="main-menu__section">
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={leftPanelOpen}
          onClick={() => run('toggle-left-panel')}
        >
          <PanelLeftClose size={15} />
          <span>Layers panel</span>
          <Checkmark checked={leftPanelOpen} />
        </button>
        <button
          type="button"
          role="menuitemcheckbox"
          aria-checked={rightPanelOpen}
          onClick={() => run('toggle-right-panel')}
        >
          <PanelRightClose size={15} />
          <span>Properties panel</span>
          <Checkmark checked={rightPanelOpen} />
        </button>
      </div>
    </div>
  );
}

import { useEffect, useRef, type JSX } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  // Clamp to viewport.
  const width = 224;
  const left = Math.min(x, window.innerWidth - width - 8);
  const estimatedHeight = items.length * 26 + 12;
  const top = Math.min(y, window.innerHeight - estimatedHeight - 8);

  return createPortal(
    <div ref={ref} className="menu context-menu" style={{ left, top, width }}>
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="menu-sep" />
        ) : (
          <button
            key={i}
            className={`menu-item${item.danger ? ' is-danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              item.onSelect?.();
              onClose();
            }}
          >
            {item.label}
            {item.shortcut && <kbd>{item.shortcut}</kbd>}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

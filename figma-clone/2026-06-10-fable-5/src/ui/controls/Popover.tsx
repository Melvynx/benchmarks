import { useLayoutEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PopoverProps {
  anchor: DOMRect;
  onClose: () => void;
  children: ReactNode;
  /** Preferred side relative to the anchor. */
  side?: 'left' | 'bottom';
  width?: number;
}

/**
 * Minimal portal popover: positions next to an anchor rect, clamps to the
 * viewport, closes on outside pointerdown or Escape.
 */
export function Popover({ anchor, onClose, children, side = 'left', width = 240 }: PopoverProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => initialPosition(anchor, side, width));

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let { x, y } = initialPosition(anchor, side, width);
    x = Math.min(Math.max(8, x), window.innerWidth - rect.width - 8);
    y = Math.min(Math.max(8, y), window.innerHeight - rect.height - 8);
    setPosition({ x, y });
  }, [anchor, side, width]);

  useLayoutEffect(() => {
    const onPointerDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    // Defer so the opening click doesn't immediately close it.
    const timer = setTimeout(() => {
      window.addEventListener('pointerdown', onPointerDown, true);
      window.addEventListener('keydown', onKey, true);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [onClose]);

  return createPortal(
    <div ref={ref} className="popover" style={{ left: position.x, top: position.y, width }}>
      {children}
    </div>,
    document.body,
  );
}

function initialPosition(anchor: DOMRect, side: 'left' | 'bottom', width: number): { x: number; y: number } {
  if (side === 'left') return { x: anchor.left - width - 12, y: anchor.top - 8 };
  return { x: anchor.left, y: anchor.bottom + 6 };
}

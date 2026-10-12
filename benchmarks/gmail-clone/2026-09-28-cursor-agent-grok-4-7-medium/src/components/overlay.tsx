import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function PopMenu({
  anchor,
  onClose,
  children,
  wide,
}: {
  anchor: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const node = event.target as Node;
      if (ref.current?.contains(node) || anchor?.contains(node)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchor, onClose]);

  const rect = anchor?.getBoundingClientRect();
  const width = wide ? 280 : 240;
  let left = rect ? rect.left : 16;
  let top = rect ? rect.bottom + 6 : 64;
  if (left + width > window.innerWidth - 12) left = Math.max(8, window.innerWidth - width - 12);
  if (top + 320 > window.innerHeight) top = Math.max(8, (rect?.top ?? 80) - 8 - 280);

  return createPortal(
    <div ref={ref} className="menu" role="menu" style={{ top, left, width }}>
      {children}
    </div>,
    document.body,
  );
}

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="modal-back" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export const LABEL_COLORS = ["#d93025", "#e37400", "#f9ab00", "#188038", "#007b83", "#1a73e8", "#9334e6", "#795548"];

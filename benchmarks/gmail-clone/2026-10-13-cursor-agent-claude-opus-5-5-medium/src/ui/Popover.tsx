import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";

export type Anchor = HTMLElement | { x: number; y: number };

export function Popover({
  anchor,
  onClose,
  children,
  align = "start",
  className,
  width,
}: {
  anchor: Anchor | null;
  onClose: () => void;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return;
    const el = ref.current;
    const r =
      anchor instanceof HTMLElement
        ? anchor.getBoundingClientRect()
        : ({ left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0, height: 0 } as DOMRect);
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === "end" ? r.right - w : r.left;
    let top = r.bottom + 4;
    if (top + h > vh - 8) top = Math.max(8, r.top - h - 4);
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    left = Math.min(Math.max(8, left), vw - w - 8);
    setPos({ top, left });
  }, [anchor, align]);

  useEffect(() => {
    if (!anchor) return;
    const down = (e: MouseEvent) => {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchor instanceof HTMLElement && anchor.contains(target)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", down), 0);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", onClose);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", down);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("resize", onClose);
    };
  }, [anchor, onClose]);

  if (!anchor) return null;
  return createPortal(
    <div
      ref={ref}
      className={"popover " + (className ?? "")}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width, visibility: pos ? "visible" : "hidden" }}
      role="menu"
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  icon,
  label,
  hint,
  onClick,
  checked,
  danger,
  disabled,
  color,
}: {
  icon?: IconName;
  label: ReactNode;
  hint?: string;
  onClick?: () => void;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button type="button" role="menuitem" className={"menu-item" + (danger ? " danger" : "")} onClick={onClick} disabled={disabled}>
      {checked !== undefined && <span className={"menu-check" + (checked ? " on" : "")}>{checked && <Icon name="check" size={16} />}</span>}
      {icon && <Icon name={icon} size={18} style={color ? { color } : undefined} />}
      <span className="menu-label">{label}</span>
      {hint && <span className="menu-hint">{hint}</span>}
    </button>
  );
}

export const MenuDivider = () => <div className="menu-divider" />;

export function usePopover() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  return {
    anchor,
    open: (e: React.MouseEvent<HTMLElement> | HTMLElement) => setAnchor(e instanceof HTMLElement ? e : e.currentTarget),
    openAt: (x: number, y: number) => setAnchor({ x, y }),
    toggle: (e: React.MouseEvent<HTMLElement>) => {
      const t = e.currentTarget;
      setAnchor((a) => (a ? null : t));
    },
    close: () => setAnchor(null),
  };
}

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './kit';

const CloseCtx = createContext<() => void>(() => {});

interface PopoverProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  align?: 'start' | 'end';
  /** Preferred side; flips when there is no room. */
  side?: 'bottom' | 'top';
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  role?: string;
  /** Skip the outside-click dismissal for elements matching this selector. */
  keepOpenOn?: string;
  autoFocus?: boolean;
}

export function Popover({ anchor, onClose, align = 'start', side = 'bottom', className = '', style, children, role = 'menu', keepOpenOn, autoFocus = true }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const place = () => {
      const a = anchor.getBoundingClientRect();
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const pad = 8;
      let left = align === 'end' ? a.right - w : a.left;
      left = Math.max(pad, Math.min(left, vw - w - pad));
      const below = vh - a.bottom - pad;
      const above = a.top - pad;
      let top: number;
      let maxH = vh - pad * 2;
      if (side === 'bottom' ? below >= h || below >= above : above < h && below > above) {
        top = a.bottom + 2;
        maxH = Math.max(160, below - 2);
      } else {
        top = Math.max(pad, a.top - Math.min(h, above) - 2);
        maxH = Math.max(160, above - 2);
      }
      setPos({ left, top, maxH });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [anchor, align, side]);

  useEffect(() => {
    const el = ref.current;
    if (autoFocus && el && !el.contains(document.activeElement)) el.focus({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDown = (e: Event) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      if (keepOpenOn && (t as HTMLElement).closest?.(keepOpenOn)) return;
      onCloseRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        anchor?.focus?.({ preventScroll: true });
      }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [anchor, keepOpenOn]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (role !== 'menu') return;
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement as HTMLElement);
    let n = i;
    if (e.key === 'ArrowDown') n = i < 0 ? 0 : (i + 1) % items.length;
    else if (e.key === 'ArrowUp') n = i <= 0 ? items.length - 1 : i - 1;
    else if (e.key === 'Home') n = 0;
    else n = items.length - 1;
    items[n].focus();
  };

  return createPortal(
    <CloseCtx.Provider value={onClose}>
      <div
        ref={ref}
        role={role}
        tabIndex={-1}
        className={`popover ${className}`}
        onKeyDown={onKeyDown}
        style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, maxHeight: pos?.maxH, visibility: pos ? 'visible' : 'hidden', outline: 'none', ...style }}
      >
        {children}
      </div>
    </CloseCtx.Provider>,
    document.body,
  );
}

export function usePopoverClose() {
  return useContext(CloseCtx);
}

export function MenuItem({
  icon,
  label,
  hint,
  checked,
  onClick,
  disabled,
  keepOpen,
  danger,
  children,
}: {
  icon?: string;
  label?: ReactNode;
  hint?: string;
  checked?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  keepOpen?: boolean;
  danger?: boolean;
  children?: ReactNode;
}) {
  const close = useContext(CloseCtx);
  return (
    <button
      type="button"
      role="menuitem"
      className="menu-item"
      disabled={disabled}
      style={danger ? { color: 'var(--danger)' } : undefined}
      onClick={() => {
        if (!keepOpen) close();
        onClick?.();
      }}
    >
      {icon && <Icon name={icon} />}
      <span>{label ?? children}</span>
      {hint && <span className="menu-hint">{hint}</span>}
      {checked && <Icon name="check" className="menu-check" />}
    </button>
  );
}

export const MenuSeparator = () => <div className="menu-sep" role="separator" />;
export const MenuTitle = ({ children }: { children: ReactNode }) => <div className="menu-title">{children}</div>;

/** Small hook for the anchor-element + open-state pattern. */
export function useAnchor() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  return {
    el,
    open: !!el,
    toggle: (e: { currentTarget: HTMLElement }) => setEl((cur) => (cur ? null : e.currentTarget)),
    openAt: (e: HTMLElement) => setEl(e),
    close: () => setEl(null),
  };
}

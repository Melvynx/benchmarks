import {
  useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { IconType } from 'react-icons';
import { MdCheckBox, MdCheckBoxOutlineBlank, MdClose, MdIndeterminateCheckBox } from 'react-icons/md';
import type { Contact, Label } from '../data/types';
import { avatarColor, initials } from '../lib/format';

/* ---------------- Icon button ---------------- */

interface IconButtonProps {
  icon: IconType;
  label: string;
  onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  tip?: string | false;
  style?: CSSProperties;
  pressed?: boolean;
  id?: string;
}

export function IconButton({ icon: Icon, label, onClick, active, disabled, size = 'md', className = '', tip, style, pressed, id }: IconButtonProps) {
  return (
    <button
      id={id}
      type="button"
      className={`icon-btn icon-btn-${size} ${active ? 'is-active' : ''} ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      data-tip={tip === false ? undefined : tip ?? label}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      <Icon aria-hidden />
    </button>
  );
}

/* ---------------- Checkbox ---------------- */

export function Checkbox({
  checked, indeterminate, onChange, label, className = '',
}: { checked: boolean; indeterminate?: boolean; onChange: (e: ReactMouseEvent) => void; label: string; className?: string }) {
  const Icon = indeterminate ? MdIndeterminateCheckBox : checked ? MdCheckBox : MdCheckBoxOutlineBlank;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      className={`checkbox ${checked || indeterminate ? 'is-checked' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange(e);
      }}
    >
      <Icon aria-hidden />
    </button>
  );
}

/* ---------------- Avatar ---------------- */

export function Avatar({ contact, size = 40, className = '' }: { contact: Contact; size?: number; className?: string }) {
  const brand = contact.kind === 'brand';
  return (
    <span
      className={`avatar ${brand ? 'avatar-brand' : ''} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45, background: avatarColor(contact) }}
      aria-hidden
    >
      {initials(contact)}
    </span>
  );
}

/* ---------------- Label chip ---------------- */

export function LabelChip({ label, onRemove, onClick }: { label: Label; onRemove?: () => void; onClick?: () => void }) {
  return (
    <span
      className={`label-chip ${onClick ? 'is-clickable' : ''}`}
      style={{ '--chip': label.color, '--chip-text': label.textColor } as CSSProperties}
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
    >
      <span className="label-chip-text">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          className="label-chip-x"
          aria-label={`Remove label ${label.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <MdClose aria-hidden />
        </button>
      )}
    </span>
  );
}

export function SystemChip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="label-chip label-chip-system">
      <span className="label-chip-text">{children}</span>
      {onRemove && (
        <button type="button" className="label-chip-x" aria-label="Remove" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <MdClose aria-hidden />
        </button>
      )}
    </span>
  );
}

/* ---------------- Popover ---------------- */

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start';

interface PopoverProps {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  placement?: Placement;
  children: ReactNode;
  className?: string;
  offset?: number;
  matchWidth?: boolean;
  role?: string;
  label?: string;
}

export function Popover({ anchor, open, onClose, placement = 'bottom-start', children, className = '', offset = 4, matchWidth, role = 'dialog', label }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);

  const place = useCallback(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top: number;
    let left: number;
    if (placement === 'right-start') {
      left = a.right + offset;
      top = a.top;
      if (left + w > vw - 8) left = a.left - w - offset;
    } else {
      const wantTop = placement.startsWith('top');
      const below = a.bottom + offset;
      const above = a.top - offset - h;
      top = wantTop ? (above >= 8 ? above : below) : below + h <= vh - 8 || above < 8 ? below : above;
      left = placement.endsWith('end') ? a.right - w : a.left;
    }
    left = Math.max(8, Math.min(left, vw - w - 8));
    const maxHeight = Math.max(160, vh - Math.max(8, top) - 8);
    top = Math.max(8, Math.min(top, vh - Math.min(h, maxHeight) - 8));
    setPos({ top, left, maxHeight });
  }, [anchor, placement, offset]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchor?.focus();
      }
    };
    const onResize = () => place();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose, anchor, place]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const obs = new ResizeObserver(() => place());
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [open, place]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      role={role}
      aria-label={label}
      className={`popover ${className}`}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        maxHeight: pos?.maxHeight,
        minWidth: matchWidth && anchor ? anchor.offsetWidth : undefined,
        visibility: pos ? 'visible' : 'hidden',
      }}
      onKeyDown={(e) => {
        if (role !== 'menu') return;
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? []);
        const i = items.indexOf(document.activeElement as HTMLElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(i + 1) % items.length]?.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(i - 1 + items.length) % items.length]?.focus();
        }
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function useAnchor<T extends HTMLElement = HTMLElement>() {
  const [anchor, setAnchor] = useState<T | null>(null);
  const toggle = useCallback((e: { currentTarget: EventTarget }) => {
    const el = e.currentTarget as T;
    setAnchor((cur) => (cur === el ? null : el));
  }, []);
  const close = useCallback(() => setAnchor(null), []);
  return { anchor, open: !!anchor, toggle, close, setAnchor };
}

/* ---------------- Menu ---------------- */

export function Menu(props: Omit<PopoverProps, 'role'>) {
  return <Popover {...props} role="menu" className={`menu ${props.className ?? ''}`} />;
}

interface MenuItemProps {
  icon?: IconType;
  children: ReactNode;
  onSelect: () => void;
  hint?: string;
  disabled?: boolean;
  checked?: boolean;
  danger?: boolean;
  trailing?: ReactNode;
  autoFocus?: boolean;
}

export function MenuItem({ icon: Icon, children, onSelect, hint, disabled, checked, danger, trailing, autoFocus }: MenuItemProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked}
      className={`menu-item ${danger ? 'is-danger' : ''}`}
      disabled={disabled}
      autoFocus={autoFocus}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {checked !== undefined && (
        <span className={`menu-check ${checked ? 'is-on' : ''}`}>{checked ? <MdCheckBox aria-hidden /> : <MdCheckBoxOutlineBlank aria-hidden />}</span>
      )}
      {Icon && <Icon className="menu-icon" aria-hidden />}
      <span className="menu-text">{children}</span>
      {hint && <span className="menu-hint">{hint}</span>}
      {trailing}
    </button>
  );
}

export function MenuDivider() {
  return <div className="menu-divider" role="separator" />;
}

export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="menu-header">{children}</div>;
}

/* ---------------- Dialog ---------------- */

export function Dialog({
  open, onClose, title, children, actions, className = '', wide,
}: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => {
      const el = ref.current?.querySelector<HTMLElement>('[autofocus], input, textarea, select, button.btn-primary');
      el?.focus();
    });
    return () => {
      document.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined} className={`dialog ${wide ? 'dialog-wide' : ''} ${className}`}>
        {title && <h2 className="dialog-title">{title}</h2>}
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Tooltip layer ---------------- */

/** One delegated tooltip for every element with data-tip, rendered above everything so it never clips. */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const hide = () => {
      window.clearTimeout(timer.current);
      current.current = null;
      setTip(null);
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const el = (e.target as HTMLElement).closest?.('[data-tip]') as HTMLElement | null;
      if (el === current.current) return;
      hide();
      if (!el) return;
      current.current = el;
      timer.current = window.setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        const below = r.bottom + 36 < window.innerHeight;
        setTip({ text: el.dataset.tip ?? '', x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below });
      }, 450);
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    window.addEventListener('scroll', hide, true);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      window.removeEventListener('scroll', hide, true);
    };
  }, []);
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    if (r.right > window.innerWidth - 6) setShift(window.innerWidth - 6 - r.right);
    else if (r.left < 6) setShift(6 - r.left);
    else setShift(0);
  }, [tip]);
  if (!tip || !tip.text) return null;
  return createPortal(
    <div
      ref={ref}
      className="tooltip"
      role="tooltip"
      style={{
        left: tip.x + shift,
        top: tip.y,
        transform: `translate(-50%, ${tip.below ? '0' : '-100%'})`,
      }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}

/* ---------------- Switch ---------------- */

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="switch-thumb" />
    </button>
  );
}

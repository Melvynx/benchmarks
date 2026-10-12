import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronRight } from 'lucide-react';
import type { Person } from '../lib/types';
import { avatarColor, initials, readableOn } from '../lib/text';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  badge?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = 'md', active, className = '', badge, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      title={label}
      aria-label={label}
      className={`icon-btn icon-btn--${size} ${active ? 'is-active' : ''} ${className}`}
      {...rest}
    >
      {children}
      {badge ? <span className="icon-btn__badge">{badge > 99 ? '99+' : badge}</span> : null}
    </button>
  );
});

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  className = '',
  onClick,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean, e: React.MouseEvent) => void;
  label: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      title={label}
      className={`checkbox ${checked || indeterminate ? 'is-on' : ''} ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
        onChange?.(!checked, e);
      }}
    >
      <span className="checkbox__box">
        {indeterminate ? (
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
            <path d="M5 12h14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        ) : checked ? (
          <Check size={14} strokeWidth={3.2} aria-hidden="true" />
        ) : null}
      </span>
    </button>
  );
}

export function Avatar({ person, size = 36, className = '' }: { person: Person; size?: number; className?: string }) {
  const bg = avatarColor(person.email || person.name);
  const style: CSSProperties = { width: size, height: size, background: bg, color: readableOn(bg), fontSize: Math.round(size * 0.42) };
  return (
    <span className={`avatar ${className}`} style={style} aria-hidden="true">
      {initials(person.name || person.email)}
    </span>
  );
}

export function LabelChip({
  name,
  color,
  onRemove,
  onClick,
  small,
}: {
  name: string;
  color: string;
  onRemove?: () => void;
  onClick?: () => void;
  small?: boolean;
}) {
  return (
    <span
      className={`label-chip ${small ? 'label-chip--sm' : ''} ${onClick ? 'is-link' : ''}`}
      style={{ '--chip': color, '--chip-fg': readableOn(color) } as CSSProperties}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      <span className="label-chip__name">{name}</span>
      {onRemove ? (
        <button
          type="button"
          className="label-chip__x"
          aria-label={`Remove label ${name}`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}>
      <span className="switch__thumb" />
    </button>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />;
}

type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export function Popover({
  open,
  anchorRef,
  onClose,
  placement = 'bottom-start',
  children,
  className = '',
  matchWidth,
  offset = 4,
  role = 'menu',
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: Placement;
  children: ReactNode;
  className?: string;
  matchWidth?: boolean;
  offset?: number;
  role?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; minWidth?: number } | null>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const el = ref.current;
    if (!anchor || !el) return;
    const a = anchor.getBoundingClientRect();
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = placement.endsWith('end') ? a.right - w : a.left;
    let top = placement.startsWith('top') ? a.top - h - offset : a.bottom + offset;
    if (top + h > vh - 8 && a.top - h - offset > 8) top = a.top - h - offset;
    if (left + w > vw - 8) left = vw - w - 8;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    if (top + h > vh - 8) top = Math.max(8, vh - h - 8);
    setPos({ top, left, minWidth: matchWidth ? a.width : undefined });
  }, [anchorRef, placement, matchWidth, offset]);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    reposition();
  }, [open, reposition, children]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus?.();
      }
    };
    const onResize = () => reposition();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, onClose, anchorRef, reposition]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      role={role}
      className={`popover ${className}`}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, minWidth: pos?.minWidth, visibility: pos ? 'visible' : 'hidden' }}
    >
      {children}
    </div>,
    document.body,
  );
}

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  hint?: string;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  header?: boolean;
  submenu?: boolean;
  onClick?: () => void;
  keepOpen?: boolean;
}

export function MenuList({ items, onClose, autoFocus = true }: { items: MenuItem[]; onClose: () => void; autoFocus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!autoFocus) return;
    const first = ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    first?.focus({ preventScroll: true });
  }, [autoFocus]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const btns = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    const idx = btns.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      btns[(idx + 1) % btns.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      btns[(idx - 1 + btns.length) % btns.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      btns[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      btns[btns.length - 1]?.focus();
    }
  };

  return (
    <div ref={ref} className="menu" onKeyDown={onKeyDown}>
      {items.map((it, i) =>
        it.divider ? (
          <div key={i} className="menu__divider" role="separator" />
        ) : it.header ? (
          <div key={i} className="menu__header">
            {it.label}
          </div>
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            className={`menu__item ${it.danger ? 'is-danger' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              it.onClick?.();
              if (!it.keepOpen) onClose();
            }}
          >
            <span className="menu__check">{it.checked ? <Check size={16} /> : it.icon}</span>
            <span className="menu__label">{it.label}</span>
            {it.hint ? <span className="menu__hint">{it.hint}</span> : null}
            {it.submenu ? <ChevronRight size={16} className="menu__chev" /> : null}
          </button>
        ),
      )}
    </div>
  );
}

export function MenuButton({
  button,
  items,
  placement = 'bottom-start',
  className,
}: {
  button: (props: { ref: RefObject<HTMLButtonElement | null>; onClick: () => void; open: boolean }) => ReactNode;
  items: MenuItem[] | (() => MenuItem[]);
  placement?: Placement;
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const list = open ? (typeof items === 'function' ? items() : items) : [];
  return (
    <>
      {button({ ref, onClick: () => setOpen((o) => !o), open })}
      <Popover open={open} anchorRef={ref} onClose={close} placement={placement} className={className}>
        <MenuList items={list} onClose={close} />
      </Popover>
    </>
  );
}

export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

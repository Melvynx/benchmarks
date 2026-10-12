import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { IconType } from 'react-icons';
import { MdCheck, MdCheckBox, MdCheckBoxOutlineBlank, MdClose, MdIndeterminateCheckBox } from 'react-icons/md';
import type { Label, Person } from '../types';
import { useResolvedDark } from '../hooks';
import { LABEL_COLORS } from '../lib/visuals';
import { avatarColor, cn, initials, sameEmail } from '../lib/utils';
import { MY_EMAIL } from '../store/mail';
import { useSettings } from '../store/settings';

type IconButtonProps = {
  icon: IconType;
  label: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  disabled?: boolean;
  className?: string;
  iconClassName?: string;
  tip?: string | false;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'>;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon: Icon, label, onClick, size = 'md', active, disabled, className, iconClassName, tip, ...rest },
  ref,
) {
  const dims = size === 'sm' ? 'size-8' : size === 'lg' ? 'size-12' : 'size-10';
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 24 : 20;
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-tip={tip === false ? undefined : (tip ?? label)}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full text-fg2 transition-colors',
        'hover:bg-hover active:bg-press disabled:opacity-40 disabled:hover:bg-transparent',
        active && 'bg-hover text-fg',
        dims,
        className,
      )}
      {...rest}
    >
      <Icon size={iconSize} className={iconClassName} />
    </button>
  );
});

export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let current: HTMLElement | null = null;
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const el = (e.target as HTMLElement | null)?.closest?.('[data-tip]') as HTMLElement | null;
      if (el === current) return;
      current = el;
      clearTimeout(timer);
      setTip(null);
      if (!el) return;
      timer = setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        const below = r.bottom + 44 < window.innerHeight;
        const x = Math.min(Math.max(r.left + r.width / 2, 70), window.innerWidth - 70);
        setTip({ text: el.dataset.tip!, x, y: below ? r.bottom + 6 : r.top - 6, below });
      }, 500);
    };
    const hide = () => {
      clearTimeout(timer);
      current = null;
      setTip(null);
    };
    document.addEventListener('pointerover', over);
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('keydown', hide, true);
    document.addEventListener('scroll', hide, true);
    window.addEventListener('blur', hide);
    return () => {
      document.removeEventListener('pointerover', over);
      document.removeEventListener('pointerdown', hide, true);
      document.removeEventListener('keydown', hide, true);
      document.removeEventListener('scroll', hide, true);
      window.removeEventListener('blur', hide);
    };
  }, []);
  if (!tip) return null;
  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[100] max-w-[240px] animate-fade whitespace-pre-line rounded bg-[#3c4043] px-2 py-1 text-xs font-medium text-white shadow dark:bg-[#e3e3e3] dark:text-[#1f1f1f]"
      style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? '0' : '-100%'})` }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}

type Anchor = HTMLElement | { x: number; y: number } | null;

export function Popover({
  open,
  anchor,
  onClose,
  children,
  placement = 'bottom-start',
  offset = 4,
  className,
  role = 'menu',
}: {
  open: boolean;
  anchor: Anchor;
  onClose: () => void;
  children: ReactNode;
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' | 'right-start';
  offset?: number;
  className?: string;
  role?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    const place = () => {
      const el = ref.current;
      if (!el || !anchor) return;
      const r = anchor instanceof HTMLElement ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = placement.endsWith('end') ? r.right - w : placement === 'right-start' ? r.right + offset : r.left;
      let top = placement.startsWith('top') ? r.top - h - offset : placement === 'right-start' ? r.top : r.bottom + offset;
      if (top + h > vh - 8 && r.top - h - offset > 8 && !placement.startsWith('top')) top = r.top - h - offset;
      if (top < 8) top = 8;
      if (top + h > vh - 8) top = Math.max(8, vh - 8 - h);
      left = Math.min(Math.max(8, left), vw - w - 8);
      setPos({ top, left });
    };
    place();
    const ro = new ResizeObserver(place);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('resize', place);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [open, anchor, placement, offset]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchor instanceof HTMLElement && anchor.contains(t)) return;
      closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        closeRef.current();
      }
    };
    const onScroll = (e: Event) => {
      if (ref.current?.contains(e.target as Node)) return;
      closeRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [open, anchor]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      role={role}
      data-popover=""
      className={cn('fixed z-[60] animate-pop rounded-lg bg-raised py-2 text-sm text-fg shadow-e2 ring-1 ring-black/5 dark:ring-white/5', className)}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, visibility: pos ? 'visible' : 'hidden' }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  hint,
  checked,
  danger,
  disabled,
  trailing,
}: {
  icon?: IconType;
  label: ReactNode;
  onClick?: () => void;
  hint?: string;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-1.5 text-left text-sm hover:bg-hover focus-visible:bg-hover disabled:opacity-40',
        danger ? 'text-danger' : 'text-fg',
      )}
    >
      {checked !== undefined ? (
        <span className="flex size-5 items-center justify-center">{checked && <MdCheck size={18} />}</span>
      ) : Icon ? (
        <Icon size={20} className={danger ? 'text-danger' : 'text-fg2'} />
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="text-xs text-fg3">{hint}</span>}
      {trailing}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-line" />;
}

export function MenuHeading({ children }: { children: ReactNode }) {
  return <div className="px-4 pt-1 pb-2 text-xs font-medium tracking-wide text-fg3">{children}</div>;
}

export function Modal({
  open,
  onClose,
  children,
  className,
  label,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-scrim p-4 animate-fade"
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div role="dialog" aria-modal="true" aria-label={label} className={cn('max-h-full w-full animate-pop overflow-auto rounded-2xl bg-raised text-fg shadow-e2', className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function Checkbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (e: React.MouseEvent) => void;
  label: string;
  className?: string;
}) {
  const Icon = indeterminate ? MdIndeterminateCheckBox : checked ? MdCheckBox : MdCheckBoxOutlineBlank;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(e);
      }}
      className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full hover:bg-hover', checked || indeterminate ? 'text-fg' : 'text-fg3', className)}
    >
      <Icon size={20} />
    </button>
  );
}

export function Avatar({ person, size = 40, className }: { person: Person; size?: number; className?: string }) {
  const myColor = useSettings((s) => s.avatarColor);
  const myName = useSettings((s) => s.displayName);
  const isMe = sameEmail(person, MY_EMAIL);
  const name = isMe ? myName || person.name : person.name || person.email;
  const bg = isMe ? myColor : avatarColor(person.email);
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white', className)}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.45 }}
    >
      {initials(name)}
    </span>
  );
}

export function useLabelStyle(label: Label): React.CSSProperties {
  const dark = useResolvedDark();
  const c = LABEL_COLORS[label.color] ?? LABEL_COLORS.gray;
  const [bg, fg] = dark ? c.dark : c.light;
  return { background: bg, color: fg };
}

export function LabelChip({ label, onRemove, size = 'sm', onClick }: { label: Label; onRemove?: () => void; size?: 'sm' | 'md'; onClick?: () => void }) {
  const style = useLabelStyle(label);
  return (
    <span
      className={cn(
        'group/chip inline-flex max-w-[160px] shrink-0 items-center rounded font-medium leading-none',
        size === 'sm' ? 'h-[18px] px-1.5 text-[11px]' : 'h-6 px-2 text-xs',
        onClick && 'cursor-pointer',
      )}
      style={style}
      onClick={
        onClick &&
        ((e) => {
          e.stopPropagation();
          onClick();
        })
      }
    >
      <span className="truncate">{label.name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove label ${label.name}`}
          data-tip={`Remove label "${label.name}"`}
          className="-mr-1 ml-1 inline-flex size-4 items-center justify-center rounded-sm opacity-60 hover:bg-black/10 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <MdClose size={12} />
        </button>
      )}
    </span>
  );
}

export function SystemChip({ text, onRemove }: { text: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded bg-chip px-2 text-xs font-medium text-fg2">
      {text}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${text}`}
          data-tip={`Remove label "${text}"`}
          className="-mr-1 ml-1 inline-flex size-4 items-center justify-center rounded-sm opacity-60 hover:bg-hover hover:opacity-100"
          onClick={onRemove}
        >
          <MdClose size={12} />
        </button>
      )}
    </span>
  );
}

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-block rounded-full border-2 border-accent border-t-transparent', className)}
      style={{ width: size, height: size, animation: 'spin 0.8s linear infinite' }}
    />
  );
}

export function Radio({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: ReactNode; description?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg py-1.5">
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2', checked ? 'border-accent' : 'border-fg3')}>
        {checked && <span className="size-2.5 rounded-full bg-accent" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-fg">{label}</span>
        {description && <span className="block text-xs text-fg3">{description}</span>}
      </span>
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border-2 transition-colors', checked ? 'border-accent bg-accent' : 'border-fg3 bg-transparent')}
    >
      <span className={cn('absolute rounded-full transition-all', checked ? 'left-[18px] size-4 bg-accent-fg' : 'left-1 size-3 bg-fg3')} />
    </button>
  );
}

export function Button({
  children,
  variant = 'filled',
  className,
  ...rest
}: { variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'danger' } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[background,box-shadow] disabled:opacity-40',
        variant === 'filled' && 'bg-accent text-accent-fg hover:shadow-e1',
        variant === 'danger' && 'bg-danger text-white hover:shadow-e1 dark:text-[#1f1f1f]',
        variant === 'tonal' && 'bg-accent-soft text-fg hover:shadow-e1',
        variant === 'outlined' && 'border border-line-strong text-accent-text hover:bg-hover',
        variant === 'text' && 'px-3 text-accent-text hover:bg-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

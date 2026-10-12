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
} from "react";
import { createPortal } from "react-dom";
import { initials } from "../lib/format";
import { ICON_PATHS } from "../lib/icon-paths";
import { avatarColor, cn, LABEL_COLORS } from "../lib/utils";
import type { LabelColor } from "../lib/types";
import { useIsDark } from "../lib/hooks";

export function Icon({
  name,
  fill,
  size = 20,
  className,
  style,
}: {
  name: string;
  fill?: boolean;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const paths = ICON_PATHS[name];
  if (!paths && import.meta.env.DEV) console.warn(`Missing icon "${name}". Run: pnpm icons`);
  const d = (fill && paths?.[1]) || paths?.[0] || "";
  return (
    <svg
      aria-hidden
      viewBox="0 -960 960 960"
      width={size}
      height={size}
      fill="currentColor"
      className={cn("icon inline-block shrink-0", className)}
      style={style}
    >
      {d.split("|").map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: string;
  label: string;
  size?: "sm" | "md" | "lg";
  fill?: boolean;
  iconSize?: number;
  active?: boolean;
  iconClassName?: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, size = "md", fill, iconSize, active, className, iconClassName, ...rest },
  ref,
) {
  const dim = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-tip={label}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full text-fg-2 transition-colors hover:bg-hover active:bg-hover-strong disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-hover",
        dim,
        className,
      )}
      {...rest}
    >
      <Icon name={icon} fill={fill} size={iconSize ?? (size === "sm" ? 18 : 20)} className={iconClassName} />
    </button>
  );
});

/** Global tooltip that reads data-tip from hovered elements (Gmail-style dark pill). */
export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; above: boolean } | null>(null);
  const timer = useRef<number>(0);
  useEffect(() => {
    let current: Element | null = null;
    const show = (el: Element) => {
      const text = el.getAttribute("data-tip");
      if (!text) return;
      const r = el.getBoundingClientRect();
      const above = r.bottom + 40 > window.innerHeight;
      setTip({ text, x: r.left + r.width / 2, y: above ? r.top - 6 : r.bottom + 6, above });
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as Element).closest?.("[data-tip]");
      if (el === current) return;
      current = el;
      window.clearTimeout(timer.current);
      setTip(null);
      if (el) timer.current = window.setTimeout(() => show(el), 550);
    };
    const hide = () => {
      window.clearTimeout(timer.current);
      current = null;
      setTip(null);
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("scroll", hide, true);
    window.addEventListener("blur", hide);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("scroll", hide, true);
      window.removeEventListener("blur", hide);
    };
  }, []);
  if (!tip) return null;
  return createPortal(
    <TooltipBubble tip={tip} />,
    document.body,
  );
}

function TooltipBubble({ tip }: { tip: { text: string; x: number; y: number; above: boolean } }) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(tip.x);
  useLayoutEffect(() => {
    const w = ref.current?.offsetWidth ?? 0;
    setLeft(Math.min(Math.max(tip.x - w / 2, 6), window.innerWidth - w - 6));
  }, [tip]);
  return (
    <div
      ref={ref}
      role="tooltip"
      className="animate-fade pointer-events-none fixed z-[1000] whitespace-pre text-center rounded bg-[#3c4043] px-2 py-1 text-xs font-medium text-white shadow dark:bg-[#e8eaed] dark:text-[#202124]"
      style={{ left, top: tip.y, transform: tip.above ? "translateY(-100%)" : undefined }}
    >
      {tip.text}
    </div>
  );
}

// ───────────────────────── Popover / Menu ─────────────────────────

export function Popover({
  anchor,
  open,
  onClose,
  align = "start",
  children,
  className,
  offset = 4,
  placement = "bottom",
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  align?: "start" | "end" | "center";
  children: ReactNode;
  className?: string;
  offset?: number;
  placement?: "bottom" | "top" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchor) return;
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const el = ref.current;
      const w = el?.offsetWidth ?? 200;
      const h = el?.scrollHeight ?? 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left: number;
      let top: number;
      let maxH: number;
      if (placement === "right") {
        left = r.right + offset;
        if (left + w > vw - 8) left = r.left - w - offset;
        top = Math.min(r.top, vh - Math.min(h, vh - 16) - 8);
        maxH = vh - 16;
      } else {
        left = align === "end" ? r.right - w : align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
        const spaceBelow = vh - r.bottom - 8;
        const spaceAbove = r.top - 8;
        const up = placement === "top" ? spaceAbove > 120 || spaceAbove > spaceBelow : h > spaceBelow && spaceAbove > spaceBelow;
        if (up) {
          maxH = spaceAbove - offset;
          top = r.top - offset - Math.min(h, maxH);
        } else {
          maxH = spaceBelow - offset;
          top = r.bottom + offset;
        }
      }
      left = Math.min(Math.max(8, left), vw - w - 8);
      setPos({ left, top: Math.max(8, top), maxH: Math.max(160, maxH) });
    };
    place();
    const ro = new ResizeObserver(place);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, align, offset, placement]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
    };
  }, [open, anchor, onClose]);

  if (!open) return null;
  return createPortal(
    <div
      ref={ref}
      className={cn(
        "animate-pop fixed z-[900] overflow-y-auto rounded-lg bg-raised py-1.5 text-fg shadow-pop outline-none",
        className,
      )}
      style={{ left: pos?.left ?? -9999, top: pos?.top ?? -9999, maxHeight: pos?.maxH }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([disabled]),[role=menuitemcheckbox]") ?? []);
        if (!items.length) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const n = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[n].focus();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

export function useMenu<T extends HTMLElement = HTMLButtonElement>() {
  const ref = useRef<T>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  return { ref, open, setOpen, close, toggle };
}

export function MenuItem({
  icon,
  label,
  hint,
  onClick,
  checked,
  disabled,
  danger,
  trailing,
  iconFill,
  iconColor,
}: {
  icon?: string;
  label: ReactNode;
  hint?: string;
  onClick?: () => void;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  trailing?: ReactNode;
  iconFill?: boolean;
  iconColor?: string;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={checked}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-3 whitespace-nowrap px-4 text-left text-sm hover:bg-hover focus:bg-hover focus:outline-none disabled:opacity-40",
        danger && "text-danger",
      )}
    >
      {checked !== undefined && (
        <Icon name={checked ? "check_box" : "check_box_outline_blank"} fill={checked} size={20} className={checked ? "text-accent" : "text-fg-3"} />
      )}
      {icon && <Icon name={icon} size={20} fill={iconFill} className="text-fg-2" style={iconColor ? { color: iconColor } : undefined} />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="text-xs text-fg-3">{hint}</span>}
      {trailing}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1.5 h-px bg-line" />;
}

export function MenuHeader({ children }: { children: ReactNode }) {
  return <div className="px-4 pb-1 pt-2 text-xs font-medium text-fg-3">{children}</div>;
}

// ───────────────────────── Misc ─────────────────────────

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
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      data-tip={label === "Select" ? undefined : label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(e);
      }}
      className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-hover", className)}
    >
      <Icon
        name={indeterminate ? "indeterminate_check_box" : checked ? "check_box" : "check_box_outline_blank"}
        fill={checked || indeterminate}
        size={20}
        className={checked || indeterminate ? "text-fg" : "text-fg-3"}
      />
    </button>
  );
}

export function Avatar({ name, email, size = 40, className }: { name: string; email: string; size?: number; className?: string }) {
  const isMe = email === "avery@lumenlabs.io";
  return (
    <div
      aria-hidden
      className={cn("flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: isMe ? "linear-gradient(135deg,#7c4dff,#1a73e8)" : avatarColor(email || name),
      }}
    >
      {initials(name || email)}
    </div>
  );
}

export function LabelChip({
  name,
  color,
  onRemove,
  small,
  onClick,
}: {
  name: string;
  color: LabelColor;
  onRemove?: () => void;
  small?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const dark = useIsDark();
  const c = LABEL_COLORS[color];
  return (
    <span
      onClick={onClick}
      className={cn(
        "group/chip inline-flex max-w-[140px] shrink-0 items-center gap-0.5 rounded font-medium leading-none",
        small ? "h-[18px] px-1.5 text-[11.5px]" : "h-6 px-2 text-xs",
        onClick && "cursor-pointer hover:brightness-95",
      )}
      style={{ background: dark ? c.bgDark : c.bg, color: dark ? c.fgDark : c.fg }}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove label ${name}`}
          data-tip={`Remove label "${name}"`}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-1 ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm opacity-70 hover:bg-black/10 hover:opacity-100"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </span>
  );
}

export function Modal({
  children,
  onClose,
  className,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  className?: string;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Captured during render: autoFocus inside the dialog runs before effects.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", key, true);
    return () => document.removeEventListener("keydown", key, true);
  }, [onClose]);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.contains(document.activeElement)) (focusables(el)[0] ?? el).focus();
    return () => {
      if (opener?.isConnected && opener !== document.body) opener.focus({ preventScroll: true });
    };
  }, [opener]);
  return createPortal(
    <div className="animate-fade fixed inset-0 z-[800] flex items-center justify-center bg-black/40 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal
        aria-labelledby={labelledBy}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key !== "Tab" || !ref.current) return;
          const items = focusables(ref.current);
          if (!items.length) return;
          const first = items[0];
          const last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
        className={cn("animate-pop max-h-full overflow-auto rounded-2xl bg-raised text-fg shadow-compose outline-none", className)}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

function focusables(root: HTMLElement) {
  return Array.from(
    root.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

export function Button({
  children,
  variant = "text",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "text" | "filled" | "tonal" | "outline" | "danger" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[background,box-shadow] disabled:opacity-40",
        variant === "text" && "text-accent hover:bg-accent/10",
        variant === "filled" && "bg-primary text-on-primary hover:shadow-md hover:brightness-110",
        variant === "tonal" && "bg-accent-soft text-on-accent-soft hover:shadow",
        variant === "outline" && "border border-line text-fg-2 hover:bg-hover",
        variant === "danger" && "bg-danger text-white hover:brightness-110 dark:text-[#1f1f1f]",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("animate-spin-slow inline-block rounded-full border-2 border-current border-t-transparent", className)}
      style={{ width: size, height: size }}
    />
  );
}

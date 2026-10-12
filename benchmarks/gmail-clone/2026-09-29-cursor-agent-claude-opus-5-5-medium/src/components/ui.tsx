import {
  forwardRef, useCallback, useEffect, useLayoutEffect, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Check, Minus } from "lucide-react";
import type { Contact } from "../lib/types";
import { colorFor, initials } from "../lib/format";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tip?: string;
  size?: "sm" | "md" | "lg";
  active?: boolean;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { tip, size = "md", active, className, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      data-tip={tip}
      aria-label={rest["aria-label"] ?? tip}
      className={clsx(
        "relative inline-flex shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors",
        "hover:bg-hover active:bg-hover-strong disabled:opacity-40 disabled:hover:bg-transparent",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12",
        active && "bg-hover-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export function Avatar({ contact, size = 32, className }: { contact: Contact; size?: number; className?: string }) {
  return (
    <div
      className={clsx("flex shrink-0 select-none items-center justify-center rounded-full font-medium text-white", className)}
      style={{ width: size, height: size, background: colorFor(contact.email), fontSize: size * 0.42 }}
      aria-hidden
    >
      {initials(contact)}
    </div>
  );
}

export function Checkbox({
  checked, indeterminate, onChange, label, className,
}: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean, e: React.MouseEvent) => void; label: string; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked, e);
      }}
      className={clsx("group/cb inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-hover", className)}
    >
      <span
        className={clsx(
          "flex h-[18px] w-[18px] items-center justify-center rounded-[2px] border-2 transition-colors",
          checked || indeterminate ? "border-ink-2 bg-ink-2 text-surface" : "border-ink-3 group-hover/cb:border-ink",
        )}
      >
        {indeterminate ? <Minus size={14} strokeWidth={3.5} /> : checked ? <Check size={14} strokeWidth={3.5} /> : null}
      </span>
    </button>
  );
}

/* ---------------- Popover ---------------- */

export type Anchor = HTMLElement | { x: number; y: number } | null;

export function Popover({
  anchor, onClose, children, align = "start", className, matchWidth, offset = 4,
}: {
  anchor: Anchor;
  onClose: () => void;
  children: ReactNode;
  align?: "start" | "end" | "center";
  className?: string;
  matchWidth?: boolean;
  offset?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width?: number; maxHeight: number } | null>(null);

  const place = useCallback(() => {
    if (!anchor || !ref.current) return;
    const r =
      anchor instanceof HTMLElement
        ? anchor.getBoundingClientRect()
        : ({ left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y, width: 0, height: 0 } as DOMRect);
    const el = ref.current;
    const w = matchWidth ? r.width : el.offsetWidth;
    const h = el.scrollHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = align === "end" ? r.right - w : align === "center" ? r.left + r.width / 2 - w / 2 : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));
    const below = vh - r.bottom - offset - 8;
    const above = r.top - offset - 8;
    let top: number;
    let maxHeight: number;
    if (h <= below || below >= above) {
      top = r.bottom + offset;
      maxHeight = below;
    } else {
      maxHeight = above;
      top = Math.max(8, r.top - offset - Math.min(h, above));
    }
    const next = { top, left, width: matchWidth ? r.width : undefined, maxHeight };
    setPos((p) =>
      p && p.top === next.top && p.left === next.left && p.width === next.width && p.maxHeight === next.maxHeight ? p : next,
    );
  }, [anchor, align, matchWidth, offset]);

  useLayoutEffect(() => {
    place();
  }, [place, children]);

  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t)) return;
      if (anchor instanceof HTMLElement && anchor.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        if (anchor instanceof HTMLElement) anchor.focus();
      }
    };
    const onResize = () => onClose();
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("resize", onResize);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    if (!anchor) return;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("[data-autofocus]");
    if (first) first.focus();
    else el?.focus();
  }, [anchor]);

  if (!anchor) return null;
  return createPortal(
    <div
      ref={ref}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"],[role="menuitemcheckbox"]') ?? []);
        if (!items.length) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next].focus();
      }}
      className={clsx(
        "anim-pop fixed z-[80] overflow-y-auto rounded-lg bg-menu py-2 text-ink shadow-float outline-none scroll-thin",
        className,
      )}
      style={{
        top: pos?.top ?? -9999,
        left: pos?.left ?? -9999,
        width: pos?.width,
        maxHeight: pos?.maxHeight,
        visibility: pos ? "visible" : "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}

export function useAnchor() {
  const [anchor, setAnchor] = useState<Anchor>(null);
  const open = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    const el = e.currentTarget;
    setAnchor((a) => (a === el ? null : el));
  };
  const close = useCallback(() => setAnchor(null), []);
  return { anchor, open, close, setAnchor };
}

export function MenuItem({
  icon, label, hint, onClick, checked, danger, disabled, autoFocus,
}: {
  icon?: ReactNode;
  label: ReactNode;
  hint?: string;
  onClick: () => void;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={checked}
      disabled={disabled}
      data-autofocus={autoFocus || undefined}
      onClick={onClick}
      className={clsx(
        "flex w-full items-center gap-3 px-4 py-[7px] text-left text-sm outline-none hover:bg-hover focus-visible:bg-hover disabled:opacity-40",
        danger && "text-danger",
      )}
    >
      {checked !== undefined && (
        <span className="flex w-4 justify-center">{checked && <Check size={16} />}</span>
      )}
      {icon && <span className="flex w-5 justify-center text-ink-2">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="pl-4 text-xs text-ink-3">{hint}</span>}
    </button>
  );
}

export const MenuDivider = () => <div className="my-2 h-px bg-divider" />;
export const MenuHeading = ({ children }: { children: ReactNode }) => (
  <div className="px-4 pb-1 pt-1 text-xs font-medium text-ink-3">{children}</div>
);

/* ---------------- Global tooltip ---------------- */

export function TooltipLayer() {
  const [tip, setTip] = useState<{ text: string; x: number; y: number; below: boolean } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      current.current = null;
      setTip(null);
    };
    const over = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-tip]");
      if (el === current.current) return;
      hide();
      if (!el || !el.dataset.tip) return;
      current.current = el;
      timer.current = window.setTimeout(() => {
        if (!el.isConnected) return;
        const r = el.getBoundingClientRect();
        const below = r.bottom + 40 < window.innerHeight;
        setTip({ text: el.dataset.tip!, x: r.left + r.width / 2, y: below ? r.bottom + 6 : r.top - 6, below });
      }, 450);
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("keydown", hide, true);
    window.addEventListener("scroll", hide, true);
    return () => {
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("keydown", hide, true);
      window.removeEventListener("scroll", hide, true);
    };
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState(0);
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const w = ref.current.offsetWidth;
    setLeft(Math.max(6, Math.min(tip.x - w / 2, window.innerWidth - w - 6)));
  }, [tip]);

  if (!tip) return null;
  return createPortal(
    <div
      ref={ref}
      role="tooltip"
      className="anim-fade pointer-events-none fixed z-[100] whitespace-pre rounded bg-[var(--tooltip)] px-2 py-1 text-xs font-medium text-surface"
      style={{ left, top: tip.below ? tip.y : undefined, bottom: tip.below ? undefined : window.innerHeight - tip.y }}
    >
      {tip.text}
    </div>,
    document.body,
  );
}

/* ---------------- Modal ---------------- */

export function Modal({
  onClose, children, className, label,
}: { onClose: () => void; children: ReactNode; className?: string; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);
  return createPortal(
    <div className="anim-fade fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onPointerDown={onClose}>
      <div
        role="dialog"
        aria-modal
        aria-label={label}
        className={clsx("anim-pop max-h-full overflow-auto rounded-2xl bg-menu text-ink shadow-float", className)}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function useMediaQuery(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export const useIsMobile = () => useMediaQuery("(max-width: 767px)");

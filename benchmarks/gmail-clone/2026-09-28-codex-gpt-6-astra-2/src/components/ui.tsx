import {
  type ButtonHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
} from "react";
import { Check, X, type LucideIcon } from "lucide-react";

export function IconButton({
  icon: Icon,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon size={18} strokeWidth={1.7} />
    </button>
  );
}

export function Avatar({
  name,
  initials,
  color = "blue",
  brand,
  large = false,
}: {
  name: string;
  initials: string;
  color?: string;
  brand?: string;
  large?: boolean;
}) {
  return (
    <span
      aria-label={name}
      className={`avatar ${color} ${brand ? `brand-avatar ${brand}` : ""} ${large ? "large" : ""}`}
    >
      {brand === "linear" ? (
        <span className="linear-mark" />
      ) : brand === "figma" ? (
        <span className="figma-mark">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : brand === "notion" ? (
        <span className="notion-mark">N</span>
      ) : brand === "read" ? (
        <span className="read-mark">↗</span>
      ) : brand === "stripe" ? (
        <b className="stripe-mark">s</b>
      ) : (
        initials
      )}
    </span>
  );
}

export function Checkbox({
  checked,
  partial,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  partial?: boolean;
  label: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      disabled={disabled}
      aria-checked={partial ? "mixed" : checked}
      aria-label={label}
      className={`checkbox ${checked || partial ? "checked" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
    >
      {partial ? (
        <span>−</span>
      ) : (
        checked && <Check size={12} strokeWidth={2.7} />
      )}
    </button>
  );
}

export function Modal({
  title,
  children,
  onClose,
  className = "",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    function handle(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const elements = ref.current?.querySelectorAll<HTMLElement>(
          'button, input, textarea, select, [tabindex="0"]',
        );
        if (!elements?.length) return;
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${className}`}
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <IconButton icon={X} label="Close dialog" onClick={onClose} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <Icon size={30} strokeWidth={1.35} />
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

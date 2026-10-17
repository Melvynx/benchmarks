import { type ComponentProps, type CSSProperties, type ReactNode, type Ref, useSyncExternalStore } from "react";
import { DropdownMenu, Tooltip as RTooltip, Dialog as RDialog } from "radix-ui";
import { ICONS, type IconName } from "./icons-data";
import { cn, colorFor, initials } from "../lib/utils";

export type IconKey = Exclude<IconName, `${string}_fill`>;

export function Icon({ name, size = 20, fill, className, style }: { name: IconKey; size?: number; fill?: boolean; className?: string; style?: CSSProperties }) {
  const filled = `${name}_fill` as IconName;
  const d = fill && filled in ICONS ? ICONS[filled] : ICONS[name];
  return (
    <svg viewBox="0 -960 960 960" width={size} height={size} fill="currentColor" aria-hidden="true" className={cn("shrink-0", className)} style={style}>
      <path d={d} />
    </svg>
  );
}

const hoverQuery = typeof window !== "undefined" ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
const subscribeHover = (cb: () => void) => {
  hoverQuery?.addEventListener("change", cb);
  return () => hoverQuery?.removeEventListener("change", cb);
};
export const useCanHover = () => useSyncExternalStore(subscribeHover, () => hoverQuery?.matches ?? true, () => true);

export function Tip({ label, children, side = "bottom", shortcut }: { label?: ReactNode; children: ReactNode; side?: "top" | "bottom" | "left" | "right"; shortcut?: string }) {
  const canHover = useCanHover();
  if (!label || !canHover) return <>{children}</>;
  return (
    <RTooltip.Root>
      <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
      <RTooltip.Portal>
        <RTooltip.Content
          side={side}
          sideOffset={4}
          className="no-print z-[100] select-none rounded bg-[#3c4043] px-2 py-1 font-sans text-xs text-white shadow-sm animate-fade dark:bg-[#e3e3e3] dark:text-[#1f1f1f]"
        >
          {label}
          {shortcut && <span className="ml-1.5 opacity-70">{shortcut}</span>}
        </RTooltip.Content>
      </RTooltip.Portal>
    </RTooltip.Root>
  );
}

type IconButtonProps = Omit<ComponentProps<"button">, "children"> & {
  icon: IconKey;
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  fill?: boolean;
  active?: boolean;
  iconClassName?: string;
  tip?: boolean;
  shortcut?: string;
  ref?: Ref<HTMLButtonElement>;
};

const SIZES = { xs: [28, 18], sm: [32, 18], md: [40, 20], lg: [48, 24] } as const;

export function IconButton({ icon, label, size = "md", fill, active, className, iconClassName, tip = true, shortcut, ref, ...rest }: IconButtonProps) {
  const [box, ic] = SIZES[size];
  const btn = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      {...rest}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full text-icon transition-colors",
        "hover:bg-hover active:bg-hover-strong disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-hover-strong",
        className,
      )}
      style={{ width: box, height: box, ...rest.style }}
    >
      <Icon name={icon} size={ic} fill={fill} className={iconClassName} />
    </button>
  );
  return tip ? <Tip label={label} shortcut={shortcut}>{btn}</Tip> : btn;
}

export function Button({
  variant = "filled",
  icon,
  className,
  children,
  ref,
  ...rest
}: ComponentProps<"button"> & { variant?: "filled" | "tonal" | "text" | "outlined" | "danger"; icon?: IconKey }) {
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-5 font-sans text-sm font-medium transition-[background,box-shadow] disabled:opacity-50",
        variant === "filled" && "bg-primary text-on-primary hover:shadow-e1 hover:brightness-110",
        variant === "danger" && "bg-danger text-white hover:shadow-e1 dark:text-[#1f1f1f]",
        variant === "tonal" && "bg-primary-soft text-on-primary-soft hover:shadow-e1",
        variant === "text" && "px-3 text-primary hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]",
        variant === "outlined" && "border border-outline text-fg-2 hover:bg-hover",
        icon && variant !== "text" && "pl-4",
        className,
      )}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

export function Avatar({ name, email, size = 40, color, className }: { name: string; email: string; size?: number; color?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-sans font-medium text-white", className)}
      style={{ width: size, height: size, background: color || colorFor(email || name), fontSize: Math.round(size * 0.45) }}
    >
      {initials(name, email)}
    </span>
  );
}

export function Checkbox({ checked, indeterminate, onChange, label, className, size = "md" }: { checked: boolean; indeterminate?: boolean; onChange: (v: boolean, e: React.MouseEvent) => void; label: string; className?: string; size?: "sm" | "md" }) {
  const box = size === "sm" ? 32 : 40;
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
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full hover:bg-hover", checked || indeterminate ? "text-fg" : "text-fg-3", className)}
      style={{ width: box, height: box }}
    >
      <Icon name={indeterminate ? "indeterminate_check_box" : checked ? "check_box" : "check_box_outline_blank"} fill={checked || indeterminate} size={20} />
    </button>
  );
}

/* ---------- Menus ---------- */

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;
export const MenuSub = DropdownMenu.Sub;

export function MenuContent({ children, className, align = "start", side = "bottom", sideOffset = 4, ...rest }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        side={side}
        sideOffset={sideOffset}
        collisionPadding={8}
        {...rest}
        className={cn(
          "no-print z-[80] min-w-[200px] max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-auto rounded-lg bg-menu py-2 font-sans text-sm text-fg shadow-e2 animate-pop outline-none",
          className,
        )}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

const itemCls = "relative flex h-9 cursor-pointer select-none items-center gap-3 px-4 outline-none data-[highlighted]:bg-hover data-[disabled]:opacity-40 data-[disabled]:cursor-default";

export function MenuItem({ icon, children, shortcut, className, danger, ...rest }: ComponentProps<typeof DropdownMenu.Item> & { icon?: IconKey; shortcut?: string; danger?: boolean }) {
  return (
    <DropdownMenu.Item {...rest} className={cn(itemCls, danger && "text-danger", className)}>
      {icon && <Icon name={icon} size={20} className="text-icon" />}
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-xs text-fg-3">{shortcut}</span>}
    </DropdownMenu.Item>
  );
}

export function MenuCheckbox({ children, checked, onCheckedChange, ...rest }: ComponentProps<typeof DropdownMenu.CheckboxItem>) {
  return (
    <DropdownMenu.CheckboxItem checked={checked} onCheckedChange={onCheckedChange} {...rest} className={itemCls}>
      <Icon name={checked === "indeterminate" ? "indeterminate_check_box" : checked ? "check_box" : "check_box_outline_blank"} fill={!!checked} size={20} className="text-icon" />
      <span className="flex-1 truncate">{children}</span>
    </DropdownMenu.CheckboxItem>
  );
}

export function MenuRadio({ value, children }: { value: string; children: ReactNode }) {
  return (
    <DropdownMenu.RadioItem value={value} className={cn(itemCls, "pl-11")}>
      <DropdownMenu.ItemIndicator className="absolute left-4">
        <Icon name="check" size={20} />
      </DropdownMenu.ItemIndicator>
      {children}
    </DropdownMenu.RadioItem>
  );
}
export const MenuRadioGroup = DropdownMenu.RadioGroup;

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-2 h-px bg-line" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <DropdownMenu.Label className="px-4 pb-1 pt-2 text-xs font-medium text-fg-3">{children}</DropdownMenu.Label>;
}

export function MenuSubTrigger({ icon, children }: { icon?: IconKey; children: ReactNode }) {
  return (
    <DropdownMenu.SubTrigger className={cn(itemCls, "data-[state=open]:bg-hover")}>
      {icon && <Icon name={icon} size={20} className="text-icon" />}
      <span className="flex-1">{children}</span>
      <Icon name="arrow_drop_down" size={20} className="-rotate-90 text-icon" />
    </DropdownMenu.SubTrigger>
  );
}

export function MenuSubContent({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent sideOffset={2} collisionPadding={8} className={cn("no-print z-[81] min-w-[200px] max-h-[70vh] overflow-auto rounded-lg bg-menu py-2 font-sans text-sm text-fg shadow-e2 animate-pop", className)}>
        {children}
      </DropdownMenu.SubContent>
    </DropdownMenu.Portal>
  );
}

/* ---------- Dialog ---------- */

export function Dialog({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  description?: string;
}) {
  return (
    <RDialog.Root open={open} onOpenChange={onOpenChange}>
      <RDialog.Portal>
        <RDialog.Overlay className="no-print fixed inset-0 z-[90] bg-[var(--scrim)] animate-fade" />
        <RDialog.Content
          aria-describedby={undefined}
          className={cn(
            "no-print fixed left-1/2 top-1/2 z-[91] max-h-[90dvh] w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-2xl bg-menu p-6 font-sans text-fg shadow-e3 outline-none animate-fade",
            className,
          )}
        >
          {title && <RDialog.Title className="mb-4 text-[22px] leading-7 text-fg">{title}</RDialog.Title>}
          {description && <RDialog.Description className="mb-4 text-sm text-fg-2">{description}</RDialog.Description>}
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-outline-soft bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-fg-2">{children}</kbd>;
}

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={cn("animate-spin-slow text-primary", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="42 100" strokeLinecap="round" />
    </svg>
  );
}

export function LabelChip({ name, color, onRemove, small }: { name: string; color: string; onRemove?: () => void; small?: boolean }) {
  return (
    <span
      className={cn("label-chip inline-flex max-w-[140px] shrink-0 items-center gap-0.5 rounded font-body font-medium", small ? "h-[18px] px-1 text-[11px]" : "h-5 px-1.5 text-xs")}
      style={{ "--chip": color } as CSSProperties}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button type="button" aria-label={`Remove label ${name}`} onClick={onRemove} className="-mr-0.5 ml-0.5 inline-flex rounded-sm opacity-70 hover:opacity-100">
          <Icon name="close" size={14} />
        </button>
      )}
    </span>
  );
}

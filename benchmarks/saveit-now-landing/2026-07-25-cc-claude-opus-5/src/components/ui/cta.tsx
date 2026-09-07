import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";
type Size = "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-glow text-ink shadow-[0_10px_40px_-12px_rgba(255,106,61,0.75)] hover:bg-white hover:shadow-[0_14px_50px_-10px_rgba(255,106,61,0.95)]",
  ghost:
    "border border-lilac/25 bg-white/[0.04] text-cream backdrop-blur-sm hover:border-lilac/45 hover:bg-white/[0.09]",
  quiet: "text-muted hover:text-glow",
};

const SIZES: Record<Size, string> = {
  md: "h-10 px-5 text-[13px]",
  lg: "h-12 px-7 text-sm",
};

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  external?: boolean;
};

/** The single link style used for every call to action on the page. */
export function Cta({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  external = false,
}: Props) {
  const isExternal = external || /^https?:/.test(href);

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      className={`group inline-flex select-none items-center justify-center gap-2 rounded-full font-medium transition-all duration-300 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </a>
  );
}

/** Small arrow that nudges forward on hover, shared by the primary CTAs. */
export function CtaArrow() {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

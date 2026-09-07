import type { ReactNode } from "react";

import { cx } from "../lib/cx";

/* -------------------------------------------------------------------------
   Buttons
------------------------------------------------------------------------- */

type CTAProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost" | "quiet";
  size?: "md" | "lg";
  className?: string;
  external?: boolean;
};

const SIZES = {
  md: "h-10 px-5 text-[0.8125rem]",
  lg: "h-12 px-7 text-[0.9375rem]",
} as const;

/**
 * Primary carries the ember gradient and a light sweep on hover, echoing the
 * glow in the campaign frames. Ghost and quiet stay out of its way.
 */
export function CTA({
  href,
  children,
  variant = "primary",
  size = "md",
  className,
  external = true,
}: CTAProps) {
  const base =
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-medium transition-all duration-300 ease-out";

  const variants = {
    primary:
      "bg-cream text-ink shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_10px_30px_-10px_rgba(255,107,53,0.65)] hover:shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_16px_44px_-12px_rgba(255,107,53,0.9)] hover:-translate-y-0.5",
    ghost:
      "border border-cream/20 bg-cream/[0.04] text-cream backdrop-blur-md hover:border-cream/40 hover:bg-cream/[0.09]",
    quiet: "text-mist hover:text-cream",
  } as const;

  const isAnchor = href.startsWith("#");

  return (
    <a
      href={href}
      className={cx(base, SIZES[size], variants[variant], className)}
      {...(external && !isAnchor
        ? { target: "_blank", rel: "noreferrer noopener" }
        : {})}
    >
      {variant === "primary" && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-ember-400/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-hover:motion-safe:animate-sweep"
        />
      )}
      <span className="relative flex items-center gap-2">{children}</span>
    </a>
  );
}

/* -------------------------------------------------------------------------
   Section furniture
------------------------------------------------------------------------- */

/**
 * Small uppercase label with a glowing dot. Repeats at the top of every
 * section to give the page a consistent editorial rhythm.
 */
export function Eyebrow({
  children,
  className,
  tone = "ember",
}: {
  children: ReactNode;
  className?: string;
  tone?: "ember" | "dusk";
}) {
  return (
    <span
      className={cx(
        "eyebrow inline-flex items-center gap-2.5",
        tone === "ember" ? "text-ember-300" : "text-dusk-300",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          "h-1 w-1 rounded-full motion-safe:animate-breathe",
          tone === "ember"
            ? "bg-ember-400 shadow-[0_0_10px_2px_rgba(255,154,92,0.8)]"
            : "bg-dusk-400 shadow-[0_0_10px_2px_rgba(183,155,214,0.8)]",
        )}
      />
      {children}
    </span>
  );
}

/** Standard page gutter and max width. */
export function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("mx-auto w-full max-w-6xl px-5 sm:px-8", className)}>
      {children}
    </div>
  );
}

/**
 * Hairline rule with a light travelling along it. Used as a section divider,
 * and as the visual signature of the "glowing light" motif.
 */
export function GlowRule({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "relative h-px w-full overflow-hidden bg-gradient-to-r from-transparent via-line-2 to-transparent",
        className,
      )}
    >
      <span className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-transparent via-ember-400 to-transparent opacity-70 motion-safe:animate-sweep" />
    </div>
  );
}

/** Reveal wrapper. `delay` staggers siblings without per-element CSS. */
export function Reveal({
  children,
  delay = 0,
  variant,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  variant?: "fade" | "scale";
  className?: string;
  as?: "div" | "li" | "section" | "header" | "figure" | "p";
}) {
  return (
    <Tag
      data-reveal={variant ?? true}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}

import type { ElementType, ReactNode } from "react";

import { useInView } from "../../lib/use-in-view";

type RevealProps = {
  children: ReactNode;
  /** Stagger in milliseconds, applied as a CSS transition delay. */
  delay?: number;
  /** `blur` adds a defocus to the entrance, used for large artwork. */
  variant?: "rise" | "blur";
  as?: ElementType;
  className?: string;
};

/**
 * Entrance animation on scroll. The transition lives in CSS, which means the
 * reduced-motion media query neutralises it without any JS branching here.
 */
export function Reveal({
  children,
  delay = 0,
  variant = "rise",
  as: Tag = "div",
  className = "",
}: RevealProps) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <Tag
      ref={ref}
      data-revealed={inView ? "true" : "false"}
      style={delay ? { ["--reveal-delay" as string]: `${delay}ms` } : undefined}
      className={`${variant === "blur" ? "reveal-blur" : "reveal"} ${className}`}
    >
      {children}
    </Tag>
  );
}

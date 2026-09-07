import { useEffect, useRef, useState, type ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  as?: "div" | "section" | "article" | "li";
};

export function Reveal({
  children,
  className = "",
  delayMs = 0,
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  // Visible by default so content never ships blank if observers stall.
  const [visible, setVisible] = useState(true);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const rect = node.getBoundingClientRect();
    const alreadyInView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (alreadyInView) return;

    setVisible(false);
    setArmed(true);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          window.setTimeout(() => setVisible(true), delayMs);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${armed && !visible ? "is-pending" : ""} ${visible ? "is-visible" : ""} ${className}`}
    >
      {children}
    </Tag>
  );
}

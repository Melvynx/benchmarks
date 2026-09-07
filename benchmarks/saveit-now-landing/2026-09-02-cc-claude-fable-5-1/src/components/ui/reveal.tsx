import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

type RevealProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** Direction or style of the entrance. */
  variant?: "up" | "left" | "scale";
  /** Stagger delay in milliseconds. */
  delay?: number;
  id?: string;
  style?: CSSProperties;
};

/**
 * Reveals its children once they scroll into view.
 * Relies on the [data-reveal] styles in styles.css, which are disabled
 * automatically under prefers-reduced-motion.
 */
export function Reveal({
  as = "div",
  children,
  className,
  variant = "up",
  delay = 0,
  id,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add("is-visible");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      id,
      className,
      "data-reveal": variant,
      style: { ...style, "--reveal-delay": `${delay}ms` } as CSSProperties,
    },
    children,
  );
}

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Fraction of the element that must be visible before it counts. */
  threshold?: number;
  /** Margin around the viewport, matching IntersectionObserver semantics. */
  rootMargin?: string;
  /** Keep reporting true once seen. Defaults to true for entrance reveals. */
  once?: boolean;
};

/**
 * Reports whether an element has entered the viewport.
 *
 * Falls back to `true` when IntersectionObserver is unavailable, so content is
 * never left invisible on an unsupported browser.
 */
export function useInView<T extends HTMLElement>({
  threshold = 0.18,
  rootMargin = "0px 0px -8% 0px",
  once = true,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, inView };
}

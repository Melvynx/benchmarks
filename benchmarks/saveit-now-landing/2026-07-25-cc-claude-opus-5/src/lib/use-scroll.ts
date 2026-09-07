import { useEffect, useState } from "react";

/**
 * Vertical scroll offset, sampled once per animation frame.
 *
 * Pass `enabled: false` to unsubscribe entirely, which is what the hero does
 * under reduced motion so no parallax work happens at all.
 */
export function useScrollY(enabled = true): number {
  const [y, setY] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setY(0);
      return;
    }

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setY(window.scrollY);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return y;
}

/**
 * Id of the section currently occupying the upper band of the viewport, used
 * to light up the matching header link.
 */
export function useActiveSection(ids: readonly string[]): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) visible.set(id, entry.intersectionRatio);
          else visible.delete(id);
        }

        // Prefer the section in document order among those currently visible,
        // which keeps the indicator from flickering between neighbours.
        const current = ids.find((id) => visible.has(id)) ?? null;
        setActive(current);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.6] },
    );

    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => Boolean(n));

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

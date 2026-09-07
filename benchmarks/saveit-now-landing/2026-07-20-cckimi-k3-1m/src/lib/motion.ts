import { useEffect, useRef, useState } from "react";

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Parallax translate for a full-bleed background inside a section.
 * Returns a ref for the section and one for the layer to move.
 * Movement is disabled entirely when the user prefers reduced motion.
 */
export function useParallax<T extends HTMLElement>(strength = 0.12) {
  const sectionRef = useRef<T | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let frame = 0;

    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const layer = layerRef.current;
      if (!section || !layer) return;
      const rect = section.getBoundingClientRect();
      const viewport = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewport) return;
      const progress =
        (rect.top + rect.height / 2 - viewport / 2) / (viewport / 2);
      layer.style.transform = `translate3d(0, ${(-progress * strength * 100).toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced, strength]);

  return { sectionRef, layerRef };
}

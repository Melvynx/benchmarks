import { useEffect, useRef, useState } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Tracks the reduced motion preference, including changes made while open. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mq.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * Adds `.is-in` to every `[data-reveal]` element once it scrolls into view.
 *
 * One observer for the whole page rather than one per component, and elements
 * are unobserved after firing so reveals never replay on scroll back up. The
 * CSS carries the transition, so nothing runs per frame.
 */
export function useRevealObserver(): void {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-reveal]");

    // Without IntersectionObserver, show everything immediately.
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/**
 * Translates an element against the scroll position while it is on screen.
 *
 * `strength` is the fraction of the travelled distance to offset by. Work is
 * batched into a rAF and skipped entirely when the element is off screen or
 * the user prefers reduced motion.
 */
export function useParallax<T extends HTMLElement>(strength = 0.18) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    let frame = 0;
    let visible = true;

    const apply = () => {
      frame = 0;
      if (!visible) return;
      const rect = el.getBoundingClientRect();
      // 0 when the element top hits the viewport top, growing as it leaves.
      const travelled = window.innerHeight - rect.top;
      el.style.transform = `translate3d(0, ${(travelled * strength).toFixed(2)}px, 0)`;
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) onScroll();
      },
      { rootMargin: "120px" },
    );
    io.observe(el);

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      el.style.transform = "";
    };
  }, [strength, reduced]);

  return ref;
}

/** True once the element has been on screen, for one-shot entrance effects. */
export function useInView<T extends HTMLElement>(threshold = 0.35) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setInView(true);
        io.disconnect();
      },
      { threshold },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/** Counts up to `target` once `active` flips true. Jumps straight to the */
/** final value under reduced motion, so the number is never withheld. */
export function useCountUp(target: number, active: boolean, duration = 1600) {
  const [value, setValue] = useState(0);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!active) return;

    if (reduced) {
      setValue(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo, so it lands rather than crawls.
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, duration, reduced]);

  return value;
}

/** Tracks whether the window has scrolled past `offset`. */
export function useScrolled(offset = 12): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setScrolled(window.scrollY > offset);
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [offset]);

  return scrolled;
}

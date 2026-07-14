import { useEffect, type RefObject } from "react";

export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  active: boolean = true,
): void {
  useEffect(() => {
    if (!active) return;
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (el.contains(event.target as Node)) return;
      handler();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") handler();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, handler, active]);
}

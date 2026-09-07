import { env, lerp, onFrame, pointer } from "./env";

const HOVERABLE = "a, button, input, [data-cursor], .meridian";

/** A two-ink cursor: bone ring, coral dot, always a beat behind. */
export function initCursor(node: HTMLElement): void {
  if (!env.finePointer || env.reduced) return;

  const ring = node.querySelector<HTMLElement>(".cursor__ring");
  const dot = node.querySelector<HTMLElement>(".cursor__dot");
  const label = node.querySelector<HTMLElement>(".cursor__label");
  if (!ring || !dot || !label) return;

  const root = document.documentElement;
  let rx = window.innerWidth / 2;
  let ry = window.innerHeight / 2;
  let dx = rx;
  let dy = ry;

  window.addEventListener(
    "pointermove",
    () => root.classList.add("has-cursor"),
    { once: true, passive: true },
  );

  document.addEventListener("pointerover", (e) => {
    const target = (e.target as Element | null)?.closest(HOVERABLE);
    if (!target) {
      root.classList.remove("cursor-active");
      return;
    }
    root.classList.add("cursor-active");
    const named = target.closest<HTMLElement>("[data-cursor]");
    label.textContent = named?.dataset.cursor ?? "open";
  });

  document.addEventListener("pointerleave", () => root.classList.remove("has-cursor"));

  onFrame(() => {
    rx = lerp(rx, pointer.x, 0.22);
    ry = lerp(ry, pointer.y, 0.22);
    dx = lerp(dx, pointer.x, 0.42);
    dy = lerp(dy, pointer.y, 0.42);
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    label.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
    dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
  });
}

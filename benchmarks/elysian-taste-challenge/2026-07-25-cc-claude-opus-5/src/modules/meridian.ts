import { clamp, easeInOut, env } from "./env";

const HOURS: Array<{ upTo: number; name: string }> = [
  { upTo: 14, name: "The small hours" },
  { upTo: 30, name: "First light" },
  { upTo: 48, name: "Mid-morning" },
  { upTo: 68, name: "Late afternoon" },
  { upTo: 86, name: "Dusk, and holding" },
  { upTo: 101, name: "Night, with stars" },
];

const hourFor = (v: number): string =>
  (HOURS.find((h) => v < h.upTo) ?? HOURS[HOURS.length - 1]).name;

/**
 * Movement III is a slider disguised as a horizon: drag the meridian and
 * the vale changes hour under your hand.
 */
export function initMeridian(node: HTMLElement): void {
  const hour = node.querySelector<HTMLElement>("#meridianHour");
  let value = 52;
  let dragging = false;
  let touched = false;

  const paint = (): void => {
    node.style.setProperty("--m", `${value}%`);
    node.setAttribute("aria-valuenow", String(Math.round(value)));
    const name = hourFor(value);
    node.setAttribute("aria-valuetext", name);
    if (hour) hour.textContent = name;
  };

  const setFromX = (clientX: number): void => {
    const rect = node.getBoundingClientRect();
    value = clamp(((clientX - rect.left) / rect.width) * 100, 2, 98);
    paint();
  };

  node.addEventListener("pointerdown", (e) => {
    dragging = true;
    touched = true;
    node.classList.add("is-dragging");
    node.setPointerCapture(e.pointerId);
    setFromX(e.clientX);
    e.preventDefault();
  });

  node.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    setFromX(e.clientX);
  });

  const release = (e: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    node.classList.remove("is-dragging");
    if (node.hasPointerCapture(e.pointerId)) node.releasePointerCapture(e.pointerId);
  };
  node.addEventListener("pointerup", release);
  node.addEventListener("pointercancel", release);

  node.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 10 : 3;
    if (e.key === "ArrowLeft") value = clamp(value - step, 2, 98);
    else if (e.key === "ArrowRight") value = clamp(value + step, 2, 98);
    else if (e.key === "Home") value = 2;
    else if (e.key === "End") value = 98;
    else return;
    touched = true;
    e.preventDefault();
    paint();
  });

  paint();

  /* An unprompted sweep the first time it enters view — the page showing
     its hand so nobody has to guess. */
  if (env.reduced) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || touched) continue;
        observer.disconnect();
        const from = value;
        const start = performance.now();
        const run = (now: number): void => {
          if (touched) return;
          const t = clamp((now - start) / 2200, 0, 1);
          const wave = Math.sin(easeInOut(t) * Math.PI * 2) * 26;
          value = clamp(from + wave, 2, 98);
          paint();
          if (t < 1) requestAnimationFrame(run);
        };
        requestAnimationFrame(run);
      }
    },
    { threshold: 0.55 },
  );
  observer.observe(node);
}

import { clamp, easeOutExpo, env, lerp, onFrame, pointer } from "./env";

type Slat = { el: HTMLElement; index: number; centre: number; dir: number };

const GAP = 3;
const STAGGER = 52;
const DURATION = 1150;

function slatCount(width: number): number {
  if (width < 620) return 7;
  if (width < 1080) return 11;
  if (width < 1600) return 15;
  return 19;
}

/**
 * The overture image is sliced into vertical louvres. They fall into
 * register on entry, then keep breathing under the pointer — a printed
 * plate that never quite settles.
 */
export function initSlats(host: HTMLElement, hero: HTMLElement, startAt: number): void {
  let slats: Slat[] = [];
  let width = 0;
  let pointerLead = 0.5;

  const build = (): void => {
    width = hero.clientWidth;
    const n = slatCount(width);
    const step = width / n;
    host.replaceChildren();
    slats = [];

    for (let i = 0; i < n; i += 1) {
      const el = document.createElement("div");
      el.className = "slat";
      el.style.left = `${i * step}px`;
      el.style.width = `${Math.ceil(step - GAP)}px`;

      const plate = document.createElement("i");
      plate.style.width = `${width}px`;
      plate.style.left = `${-i * step}px`;
      el.append(plate);
      host.append(el);

      slats.push({
        el,
        index: i,
        centre: (i + 0.5) * step,
        dir: i % 2 === 0 ? -1 : 1,
      });
    }
  };

  build();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(build, 180);
  });

  if (env.reduced) {
    host.style.opacity = "1";
    for (const s of slats) s.el.style.opacity = "1";
    return;
  }

  onFrame((_dt, now) => {
    const heroHeight = hero.clientHeight || window.innerHeight;
    const progress = clamp(window.scrollY / heroHeight, 0, 1);
    host.style.opacity = `${1 - progress * 0.55}`;

    const targetLead = pointer.active ? pointer.x / Math.max(1, width) : 0.5;
    pointerLead = lerp(pointerLead, targetLead, 0.08);
    const cursorX = pointerLead * width;
    const reach = width * 0.42;

    for (const s of slats) {
      const t = clamp((now - startAt - s.index * STAGGER) / DURATION, 0, 1);
      const e = easeOutExpo(t);

      const entry = (1 - e) * s.dir * heroHeight * 1.15;
      const drift = Math.sin(now / 2600 + s.index * 0.62) * 5;

      const proximity = Math.max(0, 1 - Math.abs(cursorX - s.centre) / reach);
      const swell = proximity * proximity * 30 * s.dir * (pointer.active ? 1 : 0);

      const depart = progress * progress * s.dir * heroHeight * 0.42;

      s.el.style.transform = `translate3d(0, ${entry + drift + swell + depart}px, 0)`;
      s.el.style.opacity = `${e}`;
    }
  });
}

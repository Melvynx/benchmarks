import { clamp, env, lerp, onFrame, pointer } from "./env";

/**
 * One rAF loop drives the whole descent: aperture parallax, the movement
 * rail, the ticker's velocity skew, the temple's roving lamplight and the
 * flip from ink to paper.
 */
export function initStage(): void {
  const apertures = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
  const railLinks = [...document.querySelectorAll<HTMLAnchorElement>("[data-rail]")];
  const railProgress = document.getElementById("railProgress");
  const topbarFill = document.getElementById("topbarFill");
  const rail = document.querySelector<HTMLElement>(".rail");
  const ticker = document.querySelector<HTMLElement>(".ticker__track");
  const glow = document.getElementById("templeGlow");
  const templeSection = document.getElementById("m-iv");
  const threshold = document.getElementById("m-v");

  const sections = railLinks
    .map((link) => document.getElementById(link.dataset.rail ?? ""))
    .filter((el): el is HTMLElement => el !== null);

  let tickerOffset = 0;
  let tickerWidth = 0;
  let skew = 0;
  let lastScroll = window.scrollY;
  let velocity = 0;
  let glowX = 50;
  let glowY = 50;
  let current = -1;

  const measureTicker = (): void => {
    tickerWidth = ticker ? ticker.scrollWidth / 2 : 0;
  };
  measureTicker();
  window.addEventListener("resize", measureTicker);

  if (threshold) {
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          document.body.dataset.scene = entry.isIntersecting ? "paper" : "ink";
        }
      },
      /* Watch a thin band at the top of the viewport: the masthead should
         change ink at the exact moment the paper slides under it. */
      { rootMargin: "-12% 0px -84% 0px", threshold: 0 },
    ).observe(threshold);
  }

  if (rail) {
    /* The rail belongs to the descent only: it lifts once the overture has
       gone and retires again when the colophon arrives. */
    const bookends: [HTMLElement | null, number][] = [
      [document.getElementById("hero"), 0.45],
      [document.querySelector<HTMLElement>(".colophon"), 0.12],
    ];
    const showing = new Set<Element>();
    for (const [el, ratio] of bookends) {
      if (!el) continue;
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) showing.add(entry.target);
            else showing.delete(entry.target);
          }
          rail.classList.toggle("is-on", showing.size === 0);
        },
        { threshold: ratio },
      ).observe(el);
    }
  }

  onFrame((dt) => {
    const vh = window.innerHeight;
    const scrollY = window.scrollY;

    velocity = lerp(velocity, (scrollY - lastScroll) / Math.max(1, dt / 16), 0.18);
    lastScroll = scrollY;

    /* — parallax inside each aperture — */
    if (!env.reduced) {
      for (const node of apertures) {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        const depth = Number(node.dataset.depth ?? 0.14);
        const rel = (rect.top + rect.height / 2 - vh / 2) / vh;
        const limit = rect.height * 0.075;
        node.style.setProperty(
          "--py",
          `${clamp(-rel * depth * rect.height, -limit, limit).toFixed(2)}px`,
        );
      }
    }

    /* — descent progress — */
    const doc = document.documentElement;
    const total = Math.max(1, doc.scrollHeight - vh);
    const progress = clamp(scrollY / total, 0, 1);
    if (railProgress) railProgress.style.height = `${progress * 100}%`;
    if (topbarFill) topbarFill.style.width = `${progress * 100}%`;

    /* — which movement holds the room — */
    let active = -1;
    for (let i = 0; i < sections.length; i += 1) {
      if (sections[i].getBoundingClientRect().top <= vh * 0.55) active = i;
    }
    if (active !== current) {
      current = active;
      railLinks.forEach((link, i) => link.classList.toggle("is-current", i === active));
    }

    /* — ticker: constant drift, skewed by scroll velocity — */
    if (ticker && tickerWidth > 0) {
      tickerOffset += (dt / 16) * 0.6 + velocity * 0.55;
      tickerOffset = ((tickerOffset % tickerWidth) + tickerWidth) % tickerWidth;
      skew = lerp(skew, env.reduced ? 0 : clamp(velocity * 0.16, -7, 7), 0.12);
      ticker.style.setProperty("--tx", `${-tickerOffset}px`);
      ticker.style.setProperty("--skew", `${skew.toFixed(2)}deg`);
    }

    /* — lamplight in the temple — */
    if (glow && templeSection && !env.reduced) {
      const rect = templeSection.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < vh) {
        const tx = pointer.active ? ((pointer.x - rect.left) / rect.width) * 100 : 50;
        const ty = pointer.active ? ((pointer.y - rect.top) / rect.height) * 100 : 45;
        glowX = lerp(glowX, clamp(tx, -10, 110), 0.05);
        glowY = lerp(glowY, clamp(ty, -10, 110), 0.05);
        glow.style.setProperty("--gx", `${glowX.toFixed(2)}%`);
        glow.style.setProperty("--gy", `${glowY.toFixed(2)}%`);
      }
    }

    /* — the title's misregistration follows the hand — */
    if (!env.reduced && scrollY < vh * 1.2) {
      const mx = (pointer.nx - 0.5) * 5;
      const my = (pointer.ny - 0.5) * 4;
      doc.style.setProperty("--misreg-x", `${mx.toFixed(2)}px`);
      doc.style.setProperty("--misreg-y", `${my.toFixed(2)}px`);
    }
  });
}

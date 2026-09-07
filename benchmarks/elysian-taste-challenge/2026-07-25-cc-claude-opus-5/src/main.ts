import "@fontsource-variable/bodoni-moda/wght.css";
import "@fontsource-variable/bodoni-moda/wght-italic.css";
import "@fontsource-variable/archivo/wdth.css";

import "./styles/base.css";
import "./styles/chrome.css";
import "./styles/hero.css";
import "./styles/movements.css";

import { env } from "./modules/env";
import { initCursor } from "./modules/cursor";
import { initInkSwitch, initMisregistration } from "./modules/ink";
import { initMeridian } from "./modules/meridian";
import { initReveal } from "./modules/reveal";
import { initStage } from "./modules/scrollstage";
import { initSlats } from "./modules/slats";
import { initThreshold } from "./modules/threshold";

const root = document.documentElement;
root.classList.add("has-js");

/* The overture image is the one thing worth waiting for. */
function plateReady(): Promise<void> {
  const img = new Image();
  img.src = "/media/still-life.webp";
  return new Promise((resolve) => {
    if (img.complete) return resolve();
    img.addEventListener("load", () => resolve(), { once: true });
    img.addEventListener("error", () => resolve(), { once: true });
    window.setTimeout(resolve, 2600);
  });
}

async function boot(): Promise<void> {
  const hero = document.getElementById("hero");
  const slatHost = document.getElementById("slats");

  await Promise.race([
    Promise.all([plateReady(), document.fonts?.ready ?? Promise.resolve()]),
    new Promise((r) => window.setTimeout(r, 3200)),
  ]);

  const startAt = performance.now() + (env.reduced ? 0 : 420);
  if (hero && slatHost) initSlats(slatHost, hero, startAt);

  root.classList.add("lifted");

  initReveal();
  initStage();

  const cursor = document.getElementById("cursor");
  if (cursor) initCursor(cursor);

  const meridian = document.getElementById("meridian");
  if (meridian) initMeridian(meridian);

  const keyForm = document.getElementById("keyForm");
  if (keyForm instanceof HTMLFormElement) initThreshold(keyForm);

  const inkswitch = document.getElementById("inkswitch");
  if (inkswitch instanceof HTMLButtonElement) initInkSwitch(inkswitch);

  const mark = document.querySelector<HTMLElement>("[data-glitch]");
  if (mark) initMisregistration(mark);

  const toTop = document.getElementById("toTop");
  toTop?.addEventListener("click", () =>
    window.scrollTo({ top: 0, behavior: env.reduced ? "auto" : "smooth" }),
  );

  /* Anchor jumps that respect the reduced-motion contract. */
  const anchors = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="#"]:not([data-glitch])',
  );
  for (const link of anchors) {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({
        behavior: env.reduced ? "auto" : "smooth",
        block: "start",
      });
    });
  }
}

void boot();

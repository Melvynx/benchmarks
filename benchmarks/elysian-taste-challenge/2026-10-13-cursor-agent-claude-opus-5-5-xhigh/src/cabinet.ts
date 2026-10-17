import { clamp, damp, finePointer, inView, lerp, onTick, trackBox } from "./utils";

type Item = { num: string; name: string; meta: string; desc: string; price: string };

const ITEMS: Item[] = [
  {
    num: "I",
    name: "The Gilded Window",
    meta: "Gilt, oil, one unclimbed mountain",
    desc: "Hangs on any wall and shows the summit you always meant to attempt. Weather included; vertigo optional.",
    price: "Price on request",
  },
  {
    num: "II",
    name: "The Pocket Acropolis",
    meta: "Pentelic marble, pink cumulus",
    desc: "Small enough for a mantelpiece, large enough to get lost in on a Sunday afternoon.",
    price: "Held in trust",
  },
  {
    num: "III",
    name: "The Column That Blushed",
    meta: "Rose marble, a single compliment",
    desc: "Pink ever since someone first praised it. Load-bearing, emotionally.",
    price: "Not for sale, only for keeping",
  },
  {
    num: "IV",
    name: "The Listener",
    meta: "Carrara, discretion",
    desc: "Has heard every confession in the house and repeated none. Prefers to be addressed after dusk.",
    price: "Exchanged for one true story",
  },
  {
    num: "V",
    name: "The Head That Remembers Everything",
    meta: "Fallen marble, total recall",
    desc: "Your first address, your grandmother's recipe, the name of every dog you ever loved. Ask gently.",
    price: "Reserved in your name",
  },
  {
    num: "VI",
    name: "The Amphora of Small Hours",
    meta: "Glazed clay, exactly one night",
    desc: "Holds the hours between the last guest leaving and the first bird. Pours very slowly.",
    price: "Lent, never sold",
  },
  {
    num: "VII",
    name: "The Book That Finishes Itself",
    meta: "Vellum, unfinished ink",
    desc: "The final chapter writes itself after you close it. Never the same twice; always correct.",
    price: "Priceless, literally",
  },
];

export function initCabinet(section: HTMLElement) {
  const vitrine = section.querySelector<HTMLElement>(".vitrine")!;
  const scroller = section.querySelector<HTMLElement>(".vitrine__scroller")!;
  const plate = section.querySelector<HTMLElement>(".vitrine__plate")!;
  const spots = [...section.querySelectorAll<HTMLButtonElement>(".spot")];
  const tag = section.querySelector<HTMLElement>(".tag")!;
  const loupe = section.querySelector<HTMLElement>(".loupe")!;
  const ledger = section.querySelector<HTMLOListElement>(".ledger")!;
  const desktop = window.matchMedia("(min-width: 761px)");

  ledger.innerHTML = ITEMS.map(
    (it, i) => `<li><button class="ledger__item" type="button" data-i="${i}">
      <span class="ledger__num">${it.num}</span>
      <span class="ledger__name">${it.name}</span>
      <span class="ledger__dots" aria-hidden="true"></span>
      <span class="ledger__price">${it.price}</span>
    </button></li>`,
  ).join("");
  const rows = [...ledger.querySelectorAll<HTMLButtonElement>(".ledger__item")];

  const field = (sel: string) => tag.querySelector<HTMLElement>(sel)!;
  const tNum = field(".tag__num");
  const tName = field(".tag__name");
  const tMeta = field(".tag__meta");
  const tDesc = field(".tag__desc");
  const tPrice = field(".tag__price");

  let active = -1;

  const place = () => {
    if (active < 0 || !desktop.matches) {
      tag.style.removeProperty("--tx");
      tag.style.removeProperty("--ty");
      return;
    }
    const spot = spots[active];
    const x = parseFloat(spot.style.getPropertyValue("--x")) / 100;
    const y = parseFloat(spot.style.getPropertyValue("--y")) / 100;
    const pw = plate.clientWidth;
    const ph = plate.clientHeight;
    const th = tag.offsetHeight;
    const ty = clamp(y * ph, th / 2 + 12, ph - th / 2 - 12);
    tag.classList.toggle("is-left", x > 0.55);
    tag.style.setProperty("--tx", `${x * pw}px`);
    tag.style.setProperty("--ty", `${ty}px`);
  };

  const activate = (i: number, scrollIntoView = false) => {
    if (i === active) return;
    active = i;
    const it = ITEMS[i];
    tNum.textContent = `Nº ${it.num} / VII`;
    tName.textContent = it.name;
    tMeta.textContent = it.meta;
    tDesc.textContent = it.desc;
    tPrice.textContent = it.price;
    spots.forEach((s, k) => s.classList.toggle("is-active", k === i));
    rows.forEach((r, k) => r.classList.toggle("is-active", k === i));
    tag.classList.remove("is-shown");
    void tag.offsetWidth;
    place();
    tag.classList.add("is-shown");

    if (scrollIntoView && !desktop.matches) {
      const x = parseFloat(spots[i].style.getPropertyValue("--x")) / 100;
      scroller.scrollTo({ left: x * plate.clientWidth - scroller.clientWidth / 2, behavior: "smooth" });
    }
  };

  spots.forEach((s, i) => {
    s.style.setProperty("--i", String(i));
    s.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && activate(i));
    s.addEventListener("focus", () => activate(i));
    s.addEventListener("click", () => activate(i, true));
  });
  rows.forEach((r, i) => {
    r.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && activate(i));
    r.addEventListener("focus", () => activate(i));
    r.addEventListener("click", () => {
      activate(i, true);
      if (!desktop.matches) vitrine.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });

  window.addEventListener("resize", place);

  const centerScroller = () => {
    if (!desktop.matches) scroller.scrollLeft = (plate.clientWidth - scroller.clientWidth) * 0.42;
  };
  centerScroller();
  desktop.addEventListener("change", () => {
    centerScroller();
    place();
  });

  new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && active < 0) activate(4);
    },
    { threshold: 0.35 },
  ).observe(vitrine);

  if (!finePointer) return;

  const ZOOM = 2.6;
  const lens = { x: 0, y: 0, tx: 0, ty: 0, on: false, o: 0 };
  const ptr = { x: -1, y: -1, present: false };
  const hiRes = "/img/still-life-2400.webp";
  const box = trackBox(vitrine);
  let primed = false;

  // Tracked in viewport space: the plate scrolls under a resting mouse without any pointer events firing.
  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.present = true;
    },
    { passive: true },
  );
  document.documentElement.addEventListener("pointerleave", () => (ptr.present = false));

  onTick((_, dt) => {
    let inside = false;
    if (ptr.present && inView(box)) {
      const r = plate.getBoundingClientRect();
      const s = scroller.getBoundingClientRect();
      inside =
        ptr.x >= Math.max(r.left, s.left) &&
        ptr.x <= Math.min(r.right, s.right) &&
        ptr.y >= r.top &&
        ptr.y <= r.bottom;
      if (inside) {
        lens.tx = ptr.x - r.left;
        lens.ty = ptr.y - r.top;
        if (lens.o < 0.01) {
          lens.x = lens.tx;
          lens.y = lens.ty;
        }
      }
    }
    if (inside && !primed) {
      loupe.style.backgroundImage = `url(${hiRes})`;
      primed = true;
    }
    lens.on = inside;
    lens.o = lerp(lens.o, lens.on ? 1 : 0, damp(0.15, dt));
    if (lens.o < 0.005 && !lens.on) {
      loupe.style.opacity = "0";
      return;
    }
    const k = damp(0.22, dt);
    lens.x = lerp(lens.x, lens.tx, k);
    lens.y = lerp(lens.y, lens.ty, k);
    const pw = plate.clientWidth;
    const ph = plate.clientHeight;
    const L = loupe.offsetWidth;
    loupe.style.opacity = lens.o.toFixed(3);
    loupe.style.transform = `translate3d(${lens.x - L / 2}px, ${lens.y - L / 2}px, 0) scale(${(0.6 + lens.o * 0.4).toFixed(3)})`;
    loupe.style.backgroundSize = `${pw * ZOOM}px ${ph * ZOOM}px`;
    loupe.style.backgroundPosition = `${-(lens.x * ZOOM - L / 2)}px ${-(lens.y * ZOOM - L / 2)}px`;
  });
}

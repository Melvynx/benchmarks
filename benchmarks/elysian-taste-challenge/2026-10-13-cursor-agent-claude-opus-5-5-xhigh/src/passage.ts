import { easeInOutSine, easeInQuad, easeOutCubic, inView, onTick, pinProgress, range, smoothstep, trackBox } from "./utils";

type Door = { appear: [number, number]; open: [number, number]; label: string };

const DOORS: Door[] = [
  { appear: [0.0, 0.04], open: [0.07, 0.23], label: "Door I — The Academy" },
  { appear: [0.26, 0.31], open: [0.34, 0.5], label: "Door II — The Valley" },
  { appear: [0.53, 0.58], open: [0.61, 0.77], label: "Door III — The Temple" },
];
const DIVE: [number, number] = [0.83, 0.985];
/** Where the temple's own dark doorway sits inside temple.webp (fractions of the image). */
const TEMPLE_DOOR = { x: 0.507, y: 0.745 };
const TEMPLE_ASPECT = 1456 / 816;

const arch = (x0: number, y0: number, x1: number, y1: number, closed = true) => {
  const r = (x1 - x0) / 2;
  const f = (v: number) => v.toFixed(1);
  return `M${f(x0)} ${f(y1)}L${f(x0)} ${f(y0 + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x1)} ${f(y0 + r)}L${f(x1)} ${f(y1)}${closed ? "Z" : ""}`;
};

export function initPassage(section: HTMLElement) {
  const stage = section.querySelector<HTMLElement>(".passage__stage")!;
  const intro = section.querySelector<HTMLElement>(".passage__intro")!;
  const realms = [...section.querySelectorAll<HTMLElement>(".realm")];
  const imgs = realms.map((r) => r.querySelector<HTMLElement>(".realm__img")!);
  const shades = realms.map((r) => r.querySelector<HTMLElement>(".realm__shade")!);
  const svg = section.querySelector<SVGSVGElement>(".passage__frame")!;
  const outer = svg.querySelector<SVGPathElement>(".pf--outer")!;
  const inner = svg.querySelector<SVGPathElement>(".pf--inner")!;
  const label = section.querySelector<HTMLElement>(".passage__doorlabel")!;
  const caps = [...section.querySelectorAll<HTMLElement>(".cap")];
  const marks = [...section.querySelectorAll<HTMLElement>(".rail__mark")];
  const railFill = section.querySelector<HTMLElement>(".rail__fill")!;
  const dark = section.querySelector<HTMLElement>(".passage__dark")!;
  const box = trackBox(section);

  const g = { W: 0, H: 0, w0: 0, h0: 0, ox: 0, oy: 0, lnEnd: 1, sEnd: 1, dive: { x: 0, y: 0 } };
  let lastP = -1;
  let activeCap = -2;

  const covers = (s: number) => {
    const { W, H, w0, h0, ox, oy } = g;
    const x0 = ox - (w0 * s) / 2;
    const x1 = ox + (w0 * s) / 2;
    const y0 = oy - (h0 * s) / 2;
    const y1 = oy + (h0 * s) / 2;
    if (x0 > 0 || x1 < W || y1 < H) return false;
    const r = (w0 * s) / 2;
    const cy = y0 + r;
    if (cy <= 0) return true;
    return Math.hypot(ox, cy) <= r && Math.hypot(W - ox, cy) <= r;
  };

  const measure = () => {
    g.W = stage.clientWidth;
    g.H = stage.clientHeight;
    const narrow = g.W < 700;
    g.w0 = Math.min(g.W * (narrow ? 0.44 : 0.19), g.H * 0.27);
    g.h0 = g.w0 * 1.62;
    g.ox = g.W / 2;
    g.oy = g.H * (narrow ? 0.5 : 0.53);
    let s = 1;
    while (!covers(s) && s < 400) s *= 1.04;
    g.sEnd = s * 1.06;
    g.lnEnd = Math.log(g.sEnd);

    const k = Math.max(g.W / TEMPLE_ASPECT, g.H) / g.H;
    const dispW = g.H * k * TEMPLE_ASPECT;
    const dispH = g.H * k;
    g.dive.x = (g.W - dispW) / 2 + TEMPLE_DOOR.x * dispW;
    g.dive.y = (g.H - dispH) / 2 + TEMPLE_DOOR.y * dispH;

    svg.setAttribute("viewBox", `0 0 ${g.W} ${g.H}`);
    stage.style.setProperty("--door-w", `${g.w0}px`);
    stage.style.setProperty("--door-top", `${g.oy - g.h0 / 2}px`);
    stage.style.setProperty("--door-bottom", `${g.oy + g.h0 / 2}px`);
    stage.style.setProperty("--door-oy", `${g.oy}px`);
    const origin = `${g.ox}px ${g.oy}px`;
    [intro, ...realms, ...imgs].forEach((el) => (el.style.transformOrigin = origin));
    lastP = -1;
  };
  measure();
  new ResizeObserver(measure).observe(stage);

  const render = (P: number) => {
    const { w0, h0, ox, oy, lnEnd, sEnd } = g;
    const narrow = g.W < 700;

    const state = DOORS.map((d) => {
      const a = easeOutCubic(range(P, d.appear[0], d.appear[1]));
      const o = range(P, d.open[0], d.open[1]);
      const s = o > 0 ? Math.exp(lnEnd * easeInOutSine(o)) : a;
      return { a, o, s };
    });

    // the world outside each door is coplanar with it, so it scales with the door
    intro.style.transform = `scale(${state[0].o > 0 ? state[0].s : 1})`;
    intro.style.visibility = state[0].o >= 1 ? "hidden" : "visible";

    const dive = easeInQuad(range(P, DIVE[0], DIVE[1]));

    realms.forEach((realm, k) => {
      const { a, o, s } = state[k];
      const next = state[k + 1];
      const visible = a > 0.001 && !(next && next.o >= 1);
      realm.style.visibility = visible ? "visible" : "hidden";
      if (!visible) return;

      realm.style.clipPath = o >= 1 ? "none" : `path("${arch(ox - (w0 * s) / 2, oy - (h0 * s) / 2, ox + (w0 * s) / 2, oy + (h0 * s) / 2)}")`;

      // the realm beyond the door is farther away: it scales slower than the door
      const sIn = Math.pow(Math.max(s, 1) / sEnd, 0.18);
      imgs[k].style.transform = `scale(${sIn.toFixed(4)})`;

      let outerScale = next && next.o > 0 ? next.s : 1;
      if (k === realms.length - 1 && dive > 0) {
        realm.style.transformOrigin = `${g.dive.x}px ${g.dive.y}px`;
        outerScale = Math.exp(Math.log(26) * dive);
        // the 1456px source has no detail left at 26x, so blur hides the upscale
        imgs[k].style.filter = `blur(${(dive * (narrow ? 6 : 3.5)).toFixed(2)}px)`;
      } else if (k === realms.length - 1) {
        realm.style.transformOrigin = `${ox}px ${oy}px`;
        imgs[k].style.filter = "";
      }
      realm.style.transform = `scale(${outerScale.toFixed(4)})`;

      const shadeIn = (1 - o) * 0.35;
      const shadeOut = next ? next.o * 0.55 : 0;
      shades[k].style.opacity = Math.max(shadeIn, shadeOut).toFixed(3);
    });

    // gilded frame follows whichever door is currently in play
    let cur = -1;
    for (let k = DOORS.length - 1; k >= 0; k--) {
      if (state[k].a > 0.001 && state[k].o < 1) {
        cur = k;
        break;
      }
    }
    if (cur >= 0) {
      const { a, o, s } = state[cur];
      const x0 = ox - (w0 * s) / 2;
      const x1 = ox + (w0 * s) / 2;
      const y0 = oy - (h0 * s) / 2;
      const y1 = oy + (h0 * s) / 2;
      const inset = 9 * Math.max(1, Math.sqrt(s));
      outer.setAttribute("d", arch(x0, y0, x1, y1));
      inner.setAttribute("d", arch(x0 + inset, y0 + inset, x1 - inset, y1, false));
      svg.style.opacity = (a * (1 - smoothstep(0.55, 0.95, o))).toFixed(3);
      label.textContent = DOORS[cur].label;
      label.style.transform = `translate(${ox}px, ${y0 - 26}px) translate(-50%, -100%)`;
      label.style.opacity = (a * (1 - range(o, 0, 0.12))).toFixed(3);
    } else {
      svg.style.opacity = "0";
      label.style.opacity = "0";
    }

    let capIndex = -1;
    if (P >= DOORS[0].open[1] - 0.03 && P < DOORS[1].open[0] + 0.01) capIndex = 0;
    else if (P >= DOORS[1].open[1] - 0.03 && P < DOORS[2].open[0] + 0.01) capIndex = 1;
    else if (P >= DOORS[2].open[1] - 0.03 && P < DIVE[0] + 0.03) capIndex = 2;
    if (capIndex !== activeCap) {
      activeCap = capIndex;
      caps.forEach((c, i) => c.classList.toggle("is-active", i === capIndex));
    }

    const reached = state.filter((s) => s.o >= 0.5).length - 1;
    marks.forEach((m, i) => m.classList.toggle("is-on", i <= reached));
    railFill.style.transform = `scaleY(${range(P, DOORS[0].open[0], DIVE[0]).toFixed(4)})`;

    dark.style.opacity = smoothstep(narrow ? 0.3 : 0.45, 0.95, dive).toFixed(3);
  };

  onTick(() => {
    if (!inView(box, 200)) return;
    const P = pinProgress(box);
    if (Math.abs(P - lastP) < 0.00005) return;
    lastP = P;
    render(P);
  });

  render(0);
}

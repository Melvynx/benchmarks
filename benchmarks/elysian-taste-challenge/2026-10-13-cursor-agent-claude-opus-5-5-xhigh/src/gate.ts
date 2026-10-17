import { damp, finePointer, inView, lerp, onTick, range, reducedMotion, trackBox } from "./utils";

type Star = { x: number; y: number; z: number; r: number; tw: number; sp: number; c: string };
type Comet = { x: number; y: number; vx: number; vy: number; life: number };

const TINTS = ["242,234,220", "242,234,220", "242,234,220", "244,166,58", "240,138,124", "168,191,196"];

function initStars(section: HTMLElement, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const box = trackBox(section);
  let W = 0;
  let H = 0;
  let dpr = 1;
  let stars: Star[] = [];
  const comets: Comet[] = [];
  let nextComet = 2;
  const mouse = { x: -9999, y: -9999, px: 0, py: 0, tx: 0, ty: 0 };

  const build = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = section.clientWidth;
    H = section.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const count = Math.min(900, Math.round((W * H) / 2600));
    stars = Array.from({ length: count }, () => {
      const z = Math.random();
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        z,
        r: 0.25 + Math.pow(Math.random(), 3) * 1.6 + z * 0.3,
        tw: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 2.2,
        c: TINTS[Math.floor(Math.random() * TINTS.length)],
      };
    });
  };
  build();
  new ResizeObserver(build).observe(section);

  if (finePointer) {
    section.addEventListener("pointermove", (e) => {
      const r = section.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    });
    section.addEventListener("pointerleave", () => {
      mouse.x = -9999;
      mouse.y = -9999;
    });
  }

  onTick((time, dt) => {
    if (!inView(box)) return;
    const t = time / 1000;
    const k = damp(0.05, dt);
    mouse.px = lerp(mouse.px, mouse.tx, k);
    mouse.py = lerp(mouse.py, mouse.ty, k);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const near: { x: number; y: number; d: number }[] = [];
    for (const s of stars) {
      const x = s.x - mouse.px * s.z * 18;
      const y = s.y - mouse.py * s.z * 12;
      const a = reducedMotion ? 0.7 : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.tw));
      ctx.fillStyle = `rgba(${s.c},${(a * (0.4 + s.z * 0.6)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
      const d = Math.hypot(x - mouse.x, y - mouse.y);
      if (d < 170 && s.r > 0.5) near.push({ x, y, d });
    }

    // constellations gather around the visitor's hand
    if (near.length > 1) {
      near.sort((a, b) => a.d - b.d);
      const pts = near.slice(0, 9).sort((a, b) => Math.atan2(a.y - mouse.y, a.x - mouse.x) - Math.atan2(b.y - mouse.y, b.x - mouse.x));
      ctx.lineWidth = 0.7;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const q = pts[(i + 1) % pts.length];
        const alpha = (1 - Math.max(p.d, q.d) / 170) * 0.55;
        ctx.strokeStyle = `rgba(244,166,58,${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }

    if (!reducedMotion) {
      nextComet -= dt;
      if (nextComet <= 0) {
        nextComet = 2.5 + Math.random() * 5;
        const speed = 700 + Math.random() * 500;
        const ang = Math.PI * (0.12 + Math.random() * 0.12);
        comets.push({ x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, life: 1 });
      }
      for (let i = comets.length - 1; i >= 0; i--) {
        const c = comets[i];
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.life -= dt * 0.9;
        if (c.life <= 0) {
          comets.splice(i, 1);
          continue;
        }
        const tail = 0.12;
        const g = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * tail, c.y - c.vy * tail);
        g.addColorStop(0, `rgba(255,236,200,${c.life.toFixed(3)})`);
        g.addColorStop(1, "rgba(244,166,58,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x - c.vx * tail, c.y - c.vy * tail);
        ctx.stroke();
      }
    }
  });
}

function initForm(section: HTMLElement) {
  const form = section.querySelector<HTMLFormElement>(".request")!;
  const error = section.querySelector<HTMLElement>(".request__error")!;
  const sealed = section.querySelector<HTMLElement>(".sealed")!;
  const sealedName = section.querySelector<HTMLElement>(".sealed__name")!;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const nameInput = form.elements.namedItem("name") as HTMLInputElement;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;
    nameInput.removeAttribute("aria-invalid");
    emailInput.removeAttribute("aria-invalid");

    if (!name) {
      error.textContent = "The stonemason needs a name to carve.";
      nameInput.setAttribute("aria-invalid", "true");
      nameInput.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = "The boat needs a real harbour — check that address.";
      emailInput.setAttribute("aria-invalid", "true");
      emailInput.focus();
      return;
    }
    error.textContent = "";
    form.classList.add("is-sealing");
    window.setTimeout(
      () => {
        sealedName.textContent = `, ${name.split(" ")[0]}`;
        form.hidden = true;
        sealed.hidden = false;
        requestAnimationFrame(() => sealed.classList.add("is-in"));
      },
      reducedMotion ? 0 : 900,
    );
  });
}

export function initGate(section: HTMLElement) {
  initStars(section, section.querySelector<HTMLCanvasElement>(".stars")!);
  initForm(section);

  const word = section.querySelector<HTMLElement>(".foot__word")!;
  const box = trackBox(word);
  onTick(() => {
    if (!inView(box)) return;
    const p = range(window.scrollY + window.innerHeight, box.top, box.top + box.height + window.innerHeight * 0.6);
    word.style.setProperty("--fx", `${(20 + p * 60).toFixed(2)}%`);
    word.style.setProperty("--fy", `${(30 + p * 40).toFixed(2)}%`);
  });
}

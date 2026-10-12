import { DYING_TIME, type Action, type Blob } from '../sim/engine';
import type { Camera } from './camera';
import { TAU, clamp, hsl, lerp, lerpAngle, smooth } from './util';

export interface Anim {
  init: boolean;
  gx: number;
  gy: number;
  heading: number;
  walk: number;
  stride: number;
  lean: number;
  blinkLeft: number;
  nextBlink: number;
  offset: number;
  scale: number;
  hop: number;
  depth: number;
  sx: number;
  sy: number;
  radius: number;
  alpha: number;
}

export function makeAnim(b: Blob): Anim {
  return {
    init: false,
    gx: b.x,
    gy: b.y,
    heading: b.heading,
    walk: b.personality * 10,
    stride: 0,
    lean: 0,
    blinkLeft: 0,
    nextBlink: 1 + b.personality * 4,
    offset: b.personality * TAU,
    scale: 1,
    hop: 0,
    depth: 0,
    sx: 0,
    sy: 0,
    radius: 10,
    alpha: 1,
  };
}

const BODY = { A: 1.28, B: 0.95, C: 0.9 };

const LOBES = [
  { o: [0.5, 0.1, 0.02], r: [0.62, 0.9, 0.92] },
  { o: [0.0, 0.0, 0.0], r: [0.78, 1.0, 1.0] },
  { o: [-0.5, 0.13, -0.02], r: [0.6, 0.86, 0.88] },
];

interface Frame {
  px: number;
  py: number;
  pz: number;
  fx: number;
  fy: number;
  fz: number;
  lx: number;
  ly: number;
  lz: number;
  ux: number;
  uy: number;
  uz: number;
  A: number;
  B: number;
  C: number;
}

const fr: Frame = { px: 0, py: 0, pz: 0, fx: 0, fy: 0, fz: 0, lx: 0, ly: 0, lz: 0, ux: 0, uy: 0, uz: 0, A: 1, B: 1, C: 1 };
const tmp = { x: 0, y: 0, z: 0 };
const sc = { x: 0, y: 0, d: 0 };
const va = { x: 0, y: 0 };
const vb = { x: 0, y: 0 };
const vc = { x: 0, y: 0 };

function at(fw: number, lw: number, uw: number) {
  const a = fw * fr.A;
  const b = lw * fr.B;
  const c = uw * fr.C;
  tmp.x = fr.px + fr.fx * a + fr.lx * b + fr.ux * c;
  tmp.y = fr.py + fr.fy * a + fr.ly * b + fr.uy * c;
  tmp.z = fr.pz + fr.fz * a + fr.lz * b + fr.uz * c;
  return tmp;
}

const ell = { rx: 1, ry: 1, th: 0 };

function ellipseOf(ax: { x: number; y: number }, ay: { x: number; y: number }, az: { x: number; y: number }) {
  const p = ax.x * ax.x + ay.x * ay.x + az.x * az.x;
  const r = ax.y * ax.y + ay.y * ay.y + az.y * az.y;
  const q = ax.x * ax.y + ay.x * ay.y + az.x * az.y;
  const m = (p + r) / 2;
  const dd = Math.sqrt(((p - r) / 2) ** 2 + q * q);
  ell.rx = Math.sqrt(m + dd);
  ell.ry = Math.sqrt(Math.max(m - dd, 0.04));
  ell.th = 0.5 * Math.atan2(2 * q, p - r);
}

export function updateAnim(b: Blob, a: Anim, dt: number, alpha: number) {
  const gx = lerp(b.px, b.x, alpha);
  const gy = lerp(b.py, b.y, alpha);
  const h = lerpAngle(b.pheading, b.heading, alpha);
  if (!a.init) {
    a.gx = gx;
    a.gy = gy;
    a.init = true;
  }
  const moved = Math.hypot(gx - a.gx, gy - a.gy);
  a.gx = gx;
  a.gy = gy;
  a.heading = h;
  const rate = dt > 1e-4 ? moved / dt : 0;
  const target = clamp(rate / 2.8, 0, 1.25);
  a.stride += (target - a.stride) * Math.min(1, dt * 9);
  a.walk += Math.min(moved / 1.6, 0.6) * Math.PI;
  a.hop = Math.abs(Math.sin(a.walk)) * 0.42 * Math.min(a.stride, 1);

  a.nextBlink -= dt;
  if (a.nextBlink <= 0 && a.blinkLeft <= 0) {
    a.blinkLeft = 0.14;
    a.nextBlink = 2 + Math.random() * 4.5;
  }
  if (a.blinkLeft > 0) a.blinkLeft -= dt;
}

export function drawShadow(ctx: CanvasRenderingContext2D, b: Blob, a: Anim, isBlue: boolean) {
  const k = b.dead ? clamp(b.dying / DYING_TIME, 0, 1) : 1;
  const air = clamp(a.hop / 0.5, 0, 1);
  const s = a.scale * (1 - air * 0.18) * (0.5 + 0.5 * k);
  const kind = isBlue ? 1 : 1.06;
  ctx.save();
  ctx.translate(a.gx + 0.3, a.gy - 0.15);
  ctx.rotate(a.heading);
  ctx.fillStyle = `rgba(30,60,20,${0.1 * k})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, BODY.A * 1.35 * s * kind, BODY.B * 1.3 * s * kind, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgba(30,60,20,${(0.2 - air * 0.07) * k})`;
  ctx.beginPath();
  ctx.ellipse(0, 0, BODY.A * 1.02 * s * kind, BODY.B * 0.95 * s * kind, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

interface Look {
  eyes: 'open' | 'happy' | 'squeeze' | 'wide';
  mouth: 'smile' | 'o' | 'chew' | 'flat' | 'grin' | 'sad' | 'smirk';
  brow: number;
  cheek: number;
  sweat: boolean;
}

const look: Look = { eyes: 'open', mouth: 'smile', brow: 0, cheek: 0.35, sweat: false };

function pose(b: Blob, clock: number, a: Anim, hungry: number) {
  const act: Action = b.action;
  const p = b.lockTotal > 0 ? clamp(1 - b.lock / b.lockTotal, 0, 1) : 0;
  const o = a.offset;
  let sq = Math.sin(clock * 2.3 + o) * 0.03;
  let lean = 0;
  let jump = 0;
  let glow = 0;
  let glowKind = 0;
  look.eyes = 'open';
  look.mouth = 'smile';
  look.brow = 0;
  look.cheek = 0.3;
  look.sweat = false;

  switch (act) {
    case 'eat': {
      const chew = Math.sin(clock * 14 + o);
      sq += chew * 0.1;
      lean = 0.42;
      const start = clamp(p / 0.22, 0, 1);
      jump = Math.sin(start * Math.PI) * 0.7 * (p < 0.22 ? 1 : 0);
      glow = 0.25 + 0.55 * p;
      glowKind = 1;
      look.mouth = 'chew';
      look.cheek = 1;
      look.eyes = chew > 0.4 ? 'happy' : 'open';
      break;
    }
    case 'bud': {
      sq += Math.sin(clock * 24) * 0.14 * p + (p > 0.86 ? 0.2 : 0);
      glow = p;
      glowKind = 2;
      look.eyes = 'squeeze';
      look.mouth = 'grin';
      look.cheek = 1;
      jump = p > 0.86 ? Math.sin(((p - 0.86) / 0.14) * Math.PI) * 0.6 : 0;
      break;
    }
    case 'nuzzle': {
      sq += Math.sin(clock * 20) * 0.06;
      lean = 0.5;
      jump = Math.abs(Math.sin(p * Math.PI * 2)) * 0.25;
      glow = 1 - p * 0.3;
      glowKind = 3;
      look.eyes = 'happy';
      look.mouth = 'grin';
      look.cheek = 1;
      break;
    }
    case 'pause': {
      sq = -0.1 + Math.sin(clock * 1.8 + o) * 0.03;
      glow = 0.5 * (1 - p);
      glowKind = 4;
      look.eyes = 'happy';
      look.cheek = 0.8;
      break;
    }
    case 'startled': {
      sq += 0.2 * (1 - p);
      jump = Math.sin(clamp(p * 1.6, 0, 1) * Math.PI) * 0.9;
      glow = 1 - p;
      glowKind = 5;
      look.eyes = 'wide';
      look.mouth = 'o';
      look.sweat = true;
      look.cheek = 0;
      break;
    }
    case 'flee': {
      lean = 0.32;
      look.eyes = 'wide';
      look.mouth = 'o';
      look.sweat = true;
      look.cheek = 0;
      break;
    }
    case 'hunt': {
      lean = 0.3;
      look.brow = 1;
      look.mouth = 'smirk';
      look.cheek = 0.1;
      break;
    }
    case 'seek': {
      lean = 0.12;
      look.mouth = 'smile';
      break;
    }
    case 'idle':
    case 'gather': {
      sq += Math.sin(clock * 1.7 + o) * 0.02;
      break;
    }
    default:
      break;
  }

  if (hungry > 0.55 && act !== 'eat' && act !== 'nuzzle' && act !== 'bud') {
    look.mouth = 'sad';
    look.cheek = 0;
  }
  return { sq, lean, jump, glow, glowKind };
}

export function drawBlob(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  b: Blob,
  a: Anim,
  clock: number,
  threshold: number,
  highlight: number,
) {
  const S = cam.scale;
  const isBlue = b.kind === 'blue';
  const dying = b.dead ? clamp(b.dying / DYING_TIME, 0, 1) : 1;
  const energyRatio = clamp(b.energy / threshold, 0, 1.3);
  const hungry = clamp(1 - b.energy / (threshold * 0.32), 0, 1);

  const pop = b.age < 0.8 && !b.dead ? 1 + Math.sin((b.age / 0.8) * Math.PI) * 0.18 - (1 - smooth(b.age / 0.8)) : 1;
  const grow = 0.64 + 0.36 * smooth(Math.min(1, b.age / 28));
  const plump = 0.93 + 0.13 * Math.min(energyRatio, 1.1);
  const dieScale = b.dead ? 0.15 + 0.85 * dying * dying : 1;
  a.scale = grow * plump * (isBlue ? 1 : 1.07) * Math.max(0.02, pop) * dieScale;
  const scale = a.scale;

  const ps = pose(b, clock, a, hungry);
  const hopNow = a.hop + ps.jump;
  a.lean += (Math.min(ps.lean + a.stride * 0.1, 0.6) - a.lean) * 0.2;

  let heading = a.heading;
  if (b.dead) heading += (1 - dying) * 7;
  const landing = Math.pow(1 - Math.abs(Math.sin(a.walk)), 5) * a.stride;
  const sq = ps.sq - landing * 0.11 + Math.abs(Math.sin(a.walk)) * 0.05 * a.stride;

  const Ax = BODY.A * scale * (1 - sq * 0.4);
  const Bx = BODY.B * scale * (1 - sq * 0.4);
  const Cx = BODY.C * scale * (1 + sq);

  // frame
  const ch = Math.cos(heading);
  const sh = Math.sin(heading);
  const lean = a.lean;
  const cl = Math.cos(lean);
  const sl = Math.sin(lean);
  const roll = Math.sin(a.walk) * 0.1 * Math.min(a.stride, 1);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  // forward and up after lean (rotation about the lateral axis)
  const ffx = ch * cl;
  const ffy = sh * cl;
  const ffz = -sl;
  const uux = ch * sl;
  const uuy = sh * sl;
  const uuz = cl;
  const llx = -sh;
  const lly = ch;
  // roll about forward axis
  fr.fx = ffx;
  fr.fy = ffy;
  fr.fz = ffz;
  fr.lx = llx * cr + uux * sr;
  fr.ly = lly * cr + uuy * sr;
  fr.lz = uuz * sr;
  fr.ux = uux * cr - llx * sr;
  fr.uy = uuy * cr - lly * sr;
  fr.uz = uuz * cr;
  fr.A = Ax;
  fr.B = Bx;
  fr.C = Cx;
  fr.px = a.gx;
  fr.py = a.gy;
  fr.pz = Cx * 0.98 + hopNow * scale;

  cam.project(fr.px, fr.py, fr.pz, sc);
  const cx = sc.x;
  const cy = sc.y;
  const Rs = Math.max(Ax, Bx, Cx) * S;
  a.sx = cx;
  a.sy = cy;
  a.radius = Math.max(Ax, Bx) * S * 1.1;
  a.alpha = dying;

  const sat = 1 - hungry * 0.38;
  const hueBase = isBlue ? 214 : 352;
  const hue = hueBase + b.hueShift * 6;
  const light = hsl(hue, 100 * sat, 86 - hungry * 4);
  const mid = hsl(hue, 92 * sat, 63 - hungry * 4);
  const dark = hsl(hue + (isBlue ? 10 : -8), 78 * sat, 40);
  const line = hsl(hue + (isBlue ? 10 : -8), 70 * sat, 27, 0.9);

  ctx.save();
  ctx.globalAlpha = dying;

  // halo for actions
  if (ps.glow > 0.02) {
    const gcol =
      ps.glowKind === 1
        ? '190,255,120'
        : ps.glowKind === 2
          ? '255,214,240'
          : ps.glowKind === 3
            ? '255,150,180'
            : ps.glowKind === 4
              ? '255,214,140'
              : '255,255,255';
    const gr = Rs * (2.1 + ps.glow * 0.5);
    const g = ctx.createRadialGradient(cx, cy, Rs * 0.3, cx, cy, gr);
    g.addColorStop(0, `rgba(${gcol},${0.75 * ps.glow})`);
    g.addColorStop(1, `rgba(${gcol},0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, gr, 0, TAU);
    ctx.fill();
  }

  // feet
  drawFeet(ctx, cam, a, scale, hue, sat, isBlue);

  // horns / tuft behind the head are drawn after the body; body path first
  ctx.beginPath();
  for (const lobe of LOBES) {
    const c = at(lobe.o[0], lobe.o[1], lobe.o[2]);
    const px = c.x;
    const py = c.y;
    const pz = c.z;
    cam.project(px, py, pz, sc);
    cam.dir(fr.fx * lobe.r[0] * Ax, fr.fy * lobe.r[0] * Ax, fr.fz * lobe.r[0] * Ax, va);
    cam.dir(fr.lx * lobe.r[1] * Bx, fr.ly * lobe.r[1] * Bx, fr.lz * lobe.r[1] * Bx, vb);
    cam.dir(fr.ux * lobe.r[2] * Cx, fr.uy * lobe.r[2] * Cx, fr.uz * lobe.r[2] * Cx, vc);
    ellipseOf(va, vb, vc);
    ctx.moveTo(sc.x + ell.rx * Math.cos(ell.th), sc.y + ell.rx * Math.sin(ell.th));
    ctx.ellipse(sc.x, sc.y, ell.rx, ell.ry, ell.th, 0, TAU);
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1.6, S * 0.1);
  ctx.stroke();

  const g = ctx.createRadialGradient(cx - Rs * 0.42, cy - Rs * 0.62, Rs * 0.08, cx - Rs * 0.05, cy - Rs * 0.1, Rs * 1.7);
  g.addColorStop(0, light);
  g.addColorStop(0.38, mid);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.fill();

  // belly tint (soft lighter underside gives volume)
  ctx.save();
  ctx.clip();
  const bel = ctx.createRadialGradient(cx + Rs * 0.25, cy + Rs * 0.95, Rs * 0.1, cx + Rs * 0.25, cy + Rs * 0.95, Rs * 1.3);
  bel.addColorStop(0, hsl(hue + 10, 90 * sat, 80, 0.32));
  bel.addColorStop(1, hsl(hue + 10, 90 * sat, 80, 0));
  ctx.fillStyle = bel;
  ctx.fillRect(cx - Rs * 3, cy - Rs * 3, Rs * 6, Rs * 6);
  ctx.restore();

  // gloss
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.beginPath();
  ctx.ellipse(cx - Rs * 0.32, cy - Rs * 0.5, Rs * 0.3, Rs * 0.15, -0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(cx - Rs * 0.62, cy - Rs * 0.2, Rs * 0.06, 0, TAU);
  ctx.fill();

  drawHeadGear(ctx, cam, isBlue, Rs, hue, sat);
  drawFace(ctx, cam, a, isBlue, hungry);

  if (highlight > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.9 * highlight})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Rs * 1.5, Rs * 1.2, 0, 0, TAU);
    ctx.stroke();
  }

  ctx.restore();
}

function drawFeet(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  a: Anim,
  scale: number,
  hue: number,
  sat: number,
  isBlue: boolean,
) {
  const S = cam.scale;
  const col = hsl(hue + (isBlue ? 12 : -10), 70 * sat, 34);
  ctx.fillStyle = col;
  const swing = Math.sin(a.walk) * 0.55 * Math.min(a.stride, 1) * scale;
  for (let side = -1; side <= 1; side += 2) {
    const ph = side * swing;
    const raise = Math.max(0, side * Math.cos(a.walk)) * 0.18 * Math.min(a.stride, 1) * scale;
    const base = at(0.1, side * 0.5, 0);
    const x = base.x + fr.fx * ph;
    const y = base.y + fr.fy * ph;
    const z = Math.max(0.05, raise + (fr.pz - fr.C * 0.98) * 0.35);
    cam.project(x, y, z, sc);
    ctx.beginPath();
    ctx.ellipse(sc.x, sc.y, S * 0.3 * scale, S * 0.19 * scale, 0, 0, TAU);
    ctx.fill();
  }
}

function drawHeadGear(ctx: CanvasRenderingContext2D, cam: Camera, isBlue: boolean, Rs: number, hue: number, sat: number) {
  const S = cam.scale;
  if (isBlue) {
    const t0 = at(0.62, 0.05, 0.98);
    cam.project(t0.x, t0.y, t0.z, sc);
    const x0 = sc.x;
    const y0 = sc.y;
    const t1 = at(0.62, 0.05, 1.5);
    cam.project(t1.x, t1.y, t1.z, sc);
    ctx.strokeStyle = '#4c9a3a';
    ctx.lineWidth = Math.max(1.4, S * 0.09);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 1);
    ctx.quadraticCurveTo(x0 + Rs * 0.12, (y0 + sc.y) / 2, sc.x + Rs * 0.05, sc.y);
    ctx.stroke();
    ctx.fillStyle = '#7bd35a';
    ctx.strokeStyle = 'rgba(40,110,40,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(sc.x + Rs * 0.22, sc.y - Rs * 0.04, Rs * 0.2, Rs * 0.1, -0.5, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    for (let side = -1; side <= 1; side += 2) {
      const t0 = at(0.6, 0.1 + side * 0.5, 0.86);
      const bx = t0.x;
      const by = t0.y;
      const bz = t0.z;
      cam.project(bx, by, bz, sc);
      const x0 = sc.x;
      const y0 = sc.y;
      const t1 = at(0.62, 0.1 + side * 0.6, 1.4);
      cam.project(t1.x, t1.y, t1.z, sc);
      ctx.fillStyle = hsl(hue + 30, 90 * sat, 90);
      ctx.strokeStyle = hsl(hue, 60 * sat, 32, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0 - Rs * 0.16, y0);
      ctx.lineTo(sc.x, sc.y);
      ctx.lineTo(x0 + Rs * 0.16, y0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

const nrm = { x: 0, y: 0, z: 0 };
const up = { x: 0, y: 0, z: 0 };
const side = { x: 0, y: 0, z: 0 };

/** Sets up a canvas transform whose local axes lie in the tangent plane of the body surface. */
function facePlane(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  nf: number,
  nl: number,
  nu: number,
  pf: number,
  pl: number,
  pu: number,
): number {
  nrm.x = fr.fx * nf + fr.lx * nl + fr.ux * nu;
  nrm.y = fr.fy * nf + fr.ly * nl + fr.uy * nu;
  nrm.z = fr.fz * nf + fr.lz * nl + fr.uz * nu;
  const nlen = Math.hypot(nrm.x, nrm.y, nrm.z) || 1;
  nrm.x /= nlen;
  nrm.y /= nlen;
  nrm.z /= nlen;
  const vis = nrm.x * cam.viewX + nrm.y * cam.viewY + nrm.z * cam.viewZ;
  if (vis < 0.06) return vis;
  const d = fr.ux * nrm.x + fr.uy * nrm.y + fr.uz * nrm.z;
  up.x = fr.ux - nrm.x * d;
  up.y = fr.uy - nrm.y * d;
  up.z = fr.uz - nrm.z * d;
  const ul = Math.hypot(up.x, up.y, up.z) || 1;
  up.x /= ul;
  up.y /= ul;
  up.z /= ul;
  side.x = nrm.y * up.z - nrm.z * up.y;
  side.y = nrm.z * up.x - nrm.x * up.z;
  side.z = nrm.x * up.y - nrm.y * up.x;
  // make "side" point along the blob's left so shapes have a stable handedness
  if (side.x * fr.lx + side.y * fr.ly + side.z * fr.lz < 0) {
    side.x = -side.x;
    side.y = -side.y;
    side.z = -side.z;
  }
  const p = at(pf, pl, pu);
  cam.project(p.x, p.y, p.z, sc);
  cam.dir(side.x, side.y, side.z, va);
  cam.dir(up.x, up.y, up.z, vb);
  ctx.save();
  ctx.translate(sc.x, sc.y);
  ctx.transform(va.x, va.y, vb.x, vb.y, 0, 0);
  return vis;
}

function drawFace(ctx: CanvasRenderingContext2D, cam: Camera, a: Anim, isBlue: boolean, hungry: number) {
  const blinking = a.blinkLeft > 0;
  const eyeR = 0.235;
  const ink = '#1c2340';

  // cheeks
  if (look.cheek > 0.05) {
    for (let s = -1; s <= 1; s += 2) {
      const vis = facePlane(ctx, cam, 0.7, s * 0.68, 0.28, 0.83, 0.1 + s * 0.68, 0.28);
      if (vis >= 0.06) {
        ctx.fillStyle = `rgba(255,105,140,${0.42 * look.cheek * Math.min(1, vis * 1.6)})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.19, 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // eyes
  for (let s = -1; s <= 1; s += 2) {
    const vis = facePlane(ctx, cam, 0.78, s * 0.37, 0.56, 0.884, 0.1 + s * 0.378, 0.63);
    if (vis < 0.06) continue;
    const fade = Math.min(1, vis * 2.2);
    ctx.globalAlpha *= fade;
    const mirror = s;
    const kind = blinking && look.eyes !== 'squeeze' ? 'happy' : look.eyes;
    if (kind === 'happy') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, -0.06, eyeR * 0.85, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (kind === 'squeeze') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.07;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeR * mirror * 0.8, eyeR * 0.6);
      ctx.lineTo(eyeR * mirror * 0.7, 0);
      ctx.lineTo(-eyeR * mirror * 0.8, -eyeR * 0.6);
      ctx.stroke();
    } else {
      const r = eyeR * (kind === 'wide' ? 1.22 : hungry > 0.55 ? 0.85 : 1);
      const ry = r * (look.brow > 0 ? 0.88 : 1) * (hungry > 0.55 ? 0.78 : 1);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.92, ry * 1.08, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(-r * 0.28, r * 0.34, r * 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(r * 0.3, -r * 0.3, r * 0.14, 0, TAU);
      ctx.fill();
      if (!isBlue) {
        ctx.fillStyle = 'rgba(255,90,120,0.18)';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.5, r * 0.9, r * 0.35, 0, 0, TAU);
        ctx.fill();
      }
    }
    if (look.brow > 0 && kind !== 'happy' && kind !== 'squeeze') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.075;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeR * 1.05, eyeR * 1.32 + mirror * 0.0);
      ctx.lineTo(eyeR * 1.1, eyeR * 1.02);
      ctx.stroke();
    }
    if (hungry > 0.55 && kind === 'open') {
      ctx.strokeStyle = ink;
      ctx.lineWidth = 0.06;
      ctx.beginPath();
      ctx.moveTo(-eyeR * 1.1, eyeR * 1.05);
      ctx.lineTo(eyeR * 1.1, eyeR * 1.3);
      ctx.stroke();
    }
    ctx.restore();
  }

  // mouth
  const vis = facePlane(ctx, cam, 0.92, 0, 0.32, 1.07, 0.1, 0.36);
  if (vis >= 0.06) {
    ctx.globalAlpha *= Math.min(1, vis * 2);
    ctx.strokeStyle = ink;
    ctx.fillStyle = '#5a1730';
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.06;
    switch (look.mouth) {
      case 'smile':
        ctx.beginPath();
        ctx.moveTo(-0.13, 0.01);
        ctx.quadraticCurveTo(0, -0.15, 0.13, 0.01);
        ctx.stroke();
        break;
      case 'grin':
        ctx.beginPath();
        ctx.moveTo(-0.17, 0.03);
        ctx.quadraticCurveTo(0, -0.24, 0.17, 0.03);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ff8fa6';
        ctx.beginPath();
        ctx.ellipse(0, -0.09, 0.07, 0.035, 0, 0, TAU);
        ctx.fill();
        break;
      case 'chew': {
        const open = 0.5 + 0.5 * Math.sin(a.walk * 0 + performance.now() * 0.014);
        ctx.beginPath();
        ctx.ellipse(0, -0.05, 0.1 + open * 0.04, 0.03 + open * 0.085, 0, 0, TAU);
        ctx.fill();
        break;
      }
      case 'o':
        ctx.beginPath();
        ctx.ellipse(0, -0.06, 0.07, 0.09, 0, 0, TAU);
        ctx.fill();
        break;
      case 'sad':
        ctx.beginPath();
        ctx.moveTo(-0.1, -0.06);
        ctx.quadraticCurveTo(0, 0.05, 0.1, -0.06);
        ctx.stroke();
        break;
      case 'smirk':
        ctx.beginPath();
        ctx.moveTo(-0.12, -0.03);
        ctx.quadraticCurveTo(0.02, -0.09, 0.14, 0.03);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.moveTo(-0.09, -0.03);
        ctx.lineTo(0.09, -0.03);
        ctx.stroke();
    }
    ctx.restore();
  }

  if (look.sweat) {
    const sv = facePlane(ctx, cam, 0.5, 0.9, 0.7, 0.75, 0.1 + 0.95, 0.75);
    if (sv >= 0.06) {
      ctx.fillStyle = 'rgba(150,215,255,0.95)';
      ctx.beginPath();
      ctx.moveTo(0, 0.2);
      ctx.quadraticCurveTo(0.14, -0.02, 0, -0.1);
      ctx.quadraticCurveTo(-0.14, -0.02, 0, 0.2);
      ctx.fill();
      ctx.restore();
    }
  }
}

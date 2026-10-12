import type { Sim, Blob, Tree } from "./sim.ts";

export type Camera = { yaw: number; tilt: number };
export type Marker = { id: number; x: number; y: number; r: number };

type Proj = { sx: number; sy: number; depth: number; k: number };

function resize(canvas: HTMLCanvasElement) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const W = Math.max(1, Math.floor(w * dpr));
  const H = Math.max(1, Math.floor(h * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function projector(w: number, h: number, radius: number, cam: Camera) {
  const cx = w / 2;
  const cy = h * 0.56;
  const px = (Math.min(w, h) * 0.36) / Math.max(6, radius);
  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const st = Math.sin(cam.tilt);
  const ct = Math.cos(cam.tilt);
  return {
    cx,
    cy,
    px,
    project(x: number, y: number, z: number): Proj {
      const xr = x * c - z * s;
      const zr = x * s + z * c;
      const persp = 1 / (1 + (radius - zr) * 0.012);
      const k = px * persp;
      return {
        sx: cx + xr * k,
        sy: cy + (zr * st - y * ct) * k,
        depth: zr - y * 0.2,
        k,
      };
    },
  };
}

function loop(project: (x: number, y: number, z: number) => Proj, R: number, y: number) {
  const pts: Proj[] = [];
  const n = 80;
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    pts.push(project(Math.cos(a) * R, y, Math.sin(a) * R));
  }
  return pts;
}

function trace(ctx: CanvasRenderingContext2D, pts: Proj[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].sx, pts[0].sy);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i].sx, pts[i].sy);
  ctx.closePath();
}

function blobPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-0.15, 0.42);
  ctx.bezierCurveTo(-0.78, 0.46, -0.86, -0.05, -0.42, -0.32);
  ctx.bezierCurveTo(-0.16, -0.62, 0.28, -0.58, 0.52, -0.22);
  ctx.bezierCurveTo(0.86, 0.12, 0.62, 0.5, 0.12, 0.44);
  ctx.bezierCurveTo(0.02, 0.4, -0.06, 0.42, -0.15, 0.42);
  ctx.closePath();
}

export function drawGarden(canvas: HTMLCanvasElement, sim: Sim, cam: Camera, selected: number | null): Marker[] {
  const box = resize(canvas);
  if (!box) return [];
  const { ctx, w, h } = box;
  ctx.clearRect(0, 0, w, h);
  const view = projector(w, h, sim.radius, cam);
  const { project } = view;
  const R = sim.radius;

  const base = loop(project, R + 0.15, 0);
  const lip = loop(project, R + 0.05, 0.46);
  const soil = loop(project, R - 0.35, 0.46);

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of base) {
    minX = Math.min(minX, p.sx);
    maxX = Math.max(maxX, p.sx);
    maxY = Math.max(maxY, p.sy);
  }
  ctx.fillStyle = "rgba(92, 52, 24, 0.18)";
  ctx.beginPath();
  ctx.ellipse((minX + maxX) / 2, maxY + 10, (maxX - minX) * 0.42, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#c9ae86";
  trace(ctx, base);
  ctx.fill();
  ctx.fillStyle = "#f3e6cf";
  trace(ctx, lip);
  ctx.fill();

  const soilCenter = project(0, 0.46, 0);
  const soilGrad = ctx.createRadialGradient(soilCenter.sx, soilCenter.sy - 20, 20, soilCenter.sx, soilCenter.sy, (maxX - minX) * 0.42);
  soilGrad.addColorStop(0, "#a3c36f");
  soilGrad.addColorStop(0.62, "#6f9448");
  soilGrad.addColorStop(1, "#4d7234");
  ctx.fillStyle = soilGrad;
  trace(ctx, soil);
  ctx.fill();

  ctx.save();
  trace(ctx, soil);
  ctx.clip();

  for (const bit of sim.decor) {
    const p = project(bit.x, 0.05, bit.z);
    if (bit.kind === "stone") {
      ctx.fillStyle = bit.hue > 0.5 ? "#d7d0c4" : "#b7b1a6";
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, 5 * bit.s * (p.k / view.px), 3.2 * bit.s * (p.k / view.px), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bit.kind === "flower") {
      ctx.fillStyle = bit.hue > 0.5 ? "#f3b7c8" : "#fff4cf";
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 3.1 * (p.k / view.px), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = "#3f6d34";
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      const tip = project(bit.x + 0.04, 0.18 * bit.s, bit.z);
      ctx.beginPath();
      ctx.moveTo(p.sx, p.sy);
      ctx.lineTo(tip.sx, tip.sy);
      ctx.stroke();
    }
  }

  if (selected != null) {
    const blob = sim.blobs.find((b) => b.id === selected);
    if (blob) {
      const sense = (blob.group === "blue" ? sim.params.blueVision : sim.params.redVision) * blob.visionTrait;
      const ring = loop((x, y, z) => project(blob.x + x, y, blob.z + z), sense, 0.08);
      ctx.save();
      ctx.setLineDash([5, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = blob.group === "blue" ? "rgba(42, 116, 214, 0.7)" : "rgba(210, 75, 67, 0.7)";
      trace(ctx, ring);
      ctx.stroke();
      ctx.restore();
    }
  }

  const markers: Marker[] = [];
  type Draw = { depth: number; paint: () => void };
  const queue: Draw[] = [];

  for (const tree of sim.trees) queue.push({ depth: project(tree.x, 0, tree.z).depth, paint: () => drawTree(ctx, project, cam, tree) });
  for (const blob of sim.blobs) {
    const ground = project(blob.x, 0, blob.z);
    const body = project(blob.x, 0.42, blob.z);
    queue.push({
      depth: ground.depth,
      paint: () => {
        drawShadow(ctx, ground, body.k);
        drawBlob(ctx, sim, blob, body, selected);
        markers.push({ id: blob.id, x: body.sx, y: body.sy, r: Math.max(18, body.k * 1.05) });
      },
    });
  }

  queue.sort((a, b) => a.depth - b.depth);
  for (const item of queue) item.paint();

  for (const spark of sim.sparks) {
    const p = project(spark.x, spark.y, spark.z);
    const alpha = Math.max(0, spark.life / spark.max);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = spark.color;
    star(ctx, p.sx, p.sy, Math.max(2, spark.size * p.k * 8));
    ctx.globalAlpha = 1;
  }

  ctx.restore();

  ctx.save();
  trace(ctx, lip);
  ctx.clip();
  ctx.strokeStyle = "rgba(255, 252, 245, 0.55)";
  ctx.lineWidth = 8;
  trace(ctx, soil);
  ctx.stroke();
  ctx.restore();

  return markers;
}

function drawShadow(ctx: CanvasRenderingContext2D, ground: Proj, k: number) {
  ctx.fillStyle = "rgba(48, 36, 18, 0.22)";
  ctx.beginPath();
  ctx.ellipse(ground.sx, ground.sy, k * 0.46, k * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  project: (x: number, y: number, z: number) => Proj,
  cam: Camera,
  tree: Tree,
) {
  const sway = Math.sin(tree.spin + tree.nibble * 8) * 0.04;
  const root = project(tree.x, 0, tree.z);
  const top = project(tree.x + sway, 0.72, tree.z);
  ctx.strokeStyle = "#8a5a32";
  ctx.lineWidth = Math.max(3, root.k * 0.16);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(root.sx, root.sy);
  ctx.lineTo(top.sx, top.sy);
  ctx.stroke();

  const c = Math.cos(cam.yaw);
  const s = Math.sin(cam.yaw);
  const fruits: { front: boolean; paint: () => void; depth: number }[] = [];
  const shown = tree.fruit;
  const full = Math.floor(shown);
  const frac = shown - full;
  const total = full + (frac > 0.08 ? 1 : 0);
  for (let i = 0; i < total; i += 1) {
    const ang = tree.spin + i * 2.399963;
    const rad = 0.58 + (i % 3) * 0.08;
    const fx = tree.x + Math.cos(ang) * rad;
    const fz = tree.z + Math.sin(ang) * rad;
    const fy = 1.05 + ((i * 17) % 5) * 0.06;
    let scale = i === full ? frac : 1;
    if (tree.sprout > 0 && i === Math.max(0, full - 1)) scale *= 1 - tree.sprout / 0.4;
    const p = project(fx, fy, fz);
    const zr = fx * s + fz * c;
    const tz = tree.x * s + tree.z * c;
    fruits.push({
      front: zr >= tz,
      depth: p.depth,
      paint: () => drawFruit(ctx, p.sx, p.sy, Math.max(4.5, p.k * 0.28 * scale), scale),
    });
  }

  const squash = 1 - tree.nibble * 0.18;
  const puffs = [
    { x: 0, y: 1.05, z: 0, rad: 0.78, color: "#2f7d45" },
    { x: -0.28, y: 1.28, z: 0.1, rad: 0.58, color: "#3e9a52" },
    { x: 0.32, y: 1.34, z: -0.05, rad: 0.52, color: "#67b86a" },
  ];
  for (const fruit of fruits.filter((f) => !f.front)) fruit.paint();
  for (const puff of puffs) {
    const p = project(tree.x + puff.x + sway, puff.y, tree.z + puff.z);
    const rad = Math.max(11, p.k * puff.rad * 1.35 * squash);
    const g = ctx.createRadialGradient(p.sx - rad * 0.3, p.sy - rad * 0.35, rad * 0.1, p.sx, p.sy, rad);
    g.addColorStop(0, "#d7f5b0");
    g.addColorStop(0.35, puff.color);
    g.addColorStop(1, "#1e4e2c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, rad, rad * squash, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const fruit of fruits.filter((f) => f.front)) fruit.paint();
}

function drawFruit(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alphaScale: number) {
  if (alphaScale <= 0.04) return;
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, "#f4ffd2");
  g.addColorStop(0.45, "#8ed14f");
  g.addColorStop(1, "#4f8f22");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1.5, r), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.32, Math.max(1, r * 0.22), 0, Math.PI * 2);
  ctx.fill();
}

function drawBlob(ctx: CanvasRenderingContext2D, sim: Sim, blob: Blob, body: Proj, selected: number | null) {
  const threshold = blob.group === "blue" ? sim.params.blueCopy : sim.params.redCopy;
  const vigor = Math.max(0.35, Math.min(1.15, blob.energy / Math.max(1, threshold)));
  const moving = Math.hypot(blob.vx, blob.vz);
  const hop = Math.abs(Math.sin(sim.time * (moving > 0.25 ? 9 : 2.2) + blob.phase));
  const bob = moving > 0.25 ? hop * 0.12 * vigor : Math.sin(sim.time * 2 + blob.phase) * 0.03;
  const lift = (moving > 0.25 ? hop * body.k * 0.18 * vigor : 0) + (blob.action === "pause" ? Math.sin(sim.time * 14) * 3 : 0);
  const lean = Math.max(-0.4, Math.min(0.4, blob.vx * 0.12 - blob.vz * 0.04));
  const chew = blob.action === "eat" ? (Math.sin(sim.time * 16) + 1) / 2 : 0;
  const wide = blob.group === "blue" ? 1.08 : 0.9;
  const tall = blob.group === "blue" ? 0.92 : 1.12;

  ctx.save();
  ctx.translate(body.sx, body.sy - lift);
  ctx.rotate(lean);
  const actor = 1.7;
  ctx.scale(body.k * wide * actor * (1 + bob), body.k * tall * actor * (1 - bob));

  const grad = ctx.createRadialGradient(-0.18, -0.22, 0.08, 0.05, 0.05, 0.75);
  if (blob.group === "blue") {
    grad.addColorStop(0, "#e7f4ff");
    grad.addColorStop(0.42, "#5aa2ef");
    grad.addColorStop(1, "#1f5eae");
  } else {
    grad.addColorStop(0, "#ffe8e4");
    grad.addColorStop(0.42, "#ef6d64");
    grad.addColorStop(1, "#b4332e");
  }
  ctx.fillStyle = grad;
  blobPath(ctx);
  ctx.fill();

  if (blob.flash > 0) {
    ctx.globalAlpha = Math.min(0.45, blob.flash);
    ctx.fillStyle = "#fff6c8";
    blobPath(ctx);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(-0.18, -0.18, 0.16, 0.09, -0.5, 0, Math.PI * 2);
  ctx.fill();

  const eye = blob.blinking > 0 ? 0.08 : blob.action === "flee" ? 0.16 : 0.11 * (0.7 + vigor * 0.4);
  ctx.fillStyle = "#241c16";
  for (const ex of [-0.18, 0.16]) {
    ctx.beginPath();
    ctx.ellipse(ex, -0.02, 0.07, eye, 0, 0, Math.PI * 2);
    ctx.fill();
    if (blob.blinking <= 0) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ex - 0.02, -0.05, 0.025, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#241c16";
    }
  }

  ctx.strokeStyle = "#241c16";
  ctx.lineWidth = 0.035;
  ctx.lineCap = "round";
  ctx.beginPath();
  if (chew > 0.45) {
    ctx.ellipse(0.02, 0.16, 0.08, 0.06 * chew, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3a241c";
    ctx.fill();
  } else {
    ctx.moveTo(-0.08, 0.16);
    ctx.quadraticCurveTo(0.02, 0.24, 0.12, 0.15);
    ctx.stroke();
  }

  ctx.fillStyle = blob.group === "blue" ? "rgba(255, 170, 190, 0.45)" : "rgba(255, 210, 190, 0.35)";
  ctx.beginPath();
  ctx.ellipse(-0.28, 0.12, 0.07, 0.045, 0, 0, Math.PI * 2);
  ctx.ellipse(0.3, 0.12, 0.07, 0.045, 0, 0, Math.PI * 2);
  ctx.fill();

  if (blob.action === "eat") {
    drawFruit(ctx, 0.22, 0.18, 0.1 * (0.4 + chew), 1);
  }

  ctx.restore();

  if (selected === blob.id) {
    ctx.strokeStyle = "#2a241c";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(body.sx, body.sy - lift + body.k * 0.05, body.k * 0.62, body.k * 0.72, lean, 0, Math.PI * 2);
    ctx.stroke();
    const e = Math.max(0, Math.min(1, blob.energy / Math.max(1, threshold)));
    ctx.fillStyle = "rgba(255, 248, 236, 0.9)";
    ctx.fillRect(body.sx - 16, body.sy - lift - body.k * 0.85, 32, 5);
    ctx.fillStyle = blob.group === "blue" ? "#2a74d6" : "#d24b43";
    ctx.fillRect(body.sx - 16, body.sy - lift - body.k * 0.85, 32 * e, 5);
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
}

import { seededRandom } from './simulation.js';
const TAU = Math.PI * 2;
function ellipse(ctx, x, y, rx, ry, fill, rotation = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), rotation, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
function gradient(ctx, x, y, r, light, dark) { const g = ctx.createRadialGradient(x - r * .36, y - r * .45, 1, x, y, r * 1.12); g.addColorStop(0, light); g.addColorStop(1, dark); return g; }
export class WorldRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.rotation = -.16; this.selected = null; this.hitTargets = [];
    const rng = seededRandom(561);
    this.decor = Array.from({ length: 230 }, (_, i) => { const a = rng() * TAU, r = Math.sqrt(rng()) * .94; return { x: Math.cos(a) * r, y: Math.sin(a) * r, size: rng(), type: i % 11, angle: rng() * TAU }; });
    this.clouds = Array.from({ length: 7 }, () => ({ x: rng(), y: rng(), phase: rng() * TAU }));
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(canvas); this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width; this.height = rect.height;
    this.canvas.width = rect.width * dpr; this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  projection(x, y, height = 0) {
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    return { x: this.cx + (x * cos - y * sin) * this.scale, y: this.cy + (x * sin + y * cos) * this.scale * .48 - height * this.unit };
  }
  draw(garden, now, reducedMotion = false) {
    const ctx = this.ctx, w = this.width, h = this.height;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    const rx = Math.min(w * (w < 500 ? .43 : .365), h * .735), ry = rx * .48;
    this.cx = w * .52; this.cy = h * .61; this.scale = rx / garden.config.worldSize; this.unit = Math.min(1.2, Math.max(.68, rx / 285));
    const u = this.unit;
    // The meadow is a raised dish with a soft tabletop shadow.
    ctx.save(); ctx.filter = 'blur(15px)'; ellipse(ctx, this.cx + 6, this.cy + 25 * u, rx * .97, ry * .99, '#83925e22'); ctx.restore();
    const side = ctx.createLinearGradient(0, this.cy, 0, this.cy + ry + 19 * u); side.addColorStop(0, '#c6dba1'); side.addColorStop(.8, '#b6cf8f'); side.addColorStop(1, '#a9c17f');
    ctx.beginPath(); ctx.ellipse(this.cx, this.cy + 19 * u, rx, ry, 0, 0, Math.PI); ctx.lineTo(this.cx - rx, this.cy); ctx.ellipse(this.cx, this.cy, rx, ry, 0, Math.PI, TAU); ctx.closePath(); ctx.fillStyle = side; ctx.fill();
    ellipse(ctx, this.cx, this.cy + 13 * u, rx, ry, '#b9cf94');
    const turf = ctx.createRadialGradient(this.cx - rx * .23, this.cy - ry * .42, 0, this.cx, this.cy, rx); turf.addColorStop(0, '#deebba'); turf.addColorStop(.7, '#d2e4aa'); turf.addColorStop(1, '#bed591');
    ellipse(ctx, this.cx, this.cy, rx, ry, turf);
    ctx.strokeStyle = '#edf3d3a6'; ctx.lineWidth = 2 * u; ctx.stroke();
    ctx.save(); ellipse(ctx, this.cx, this.cy, rx - 2, ry - 1); ctx.clip();
    for (const d of this.decor) {
      const p = this.projection(d.x * garden.config.worldSize, d.y * garden.config.worldSize);
      if (d.type < 2) { ellipse(ctx, p.x, p.y, (12 + d.size * 25) * u, (4 + d.size * 6) * u, d.type ? '#afcc7919' : '#eef4d62b'); }
      else if (d.type < 8) {
        ctx.strokeStyle = d.size > .6 ? '#99b76c65' : '#b2c68285'; ctx.lineWidth = .8 * u; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x - 2 * u, p.y); ctx.quadraticCurveTo(p.x - 3 * u, p.y - 2 * u, p.x - 5 * u, p.y - 4 * u); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - u, p.y - 5 * u); ctx.moveTo(p.x + u, p.y); ctx.quadraticCurveTo(p.x + 3 * u, p.y - 2 * u, p.x + 4 * u, p.y - 4 * u); ctx.stroke();
      } else if (d.type === 8 && d.size > .6) { this.flower(p.x, p.y, u, '#fbf6cf'); }
      else if (d.type === 9 && d.size > .65) { ellipse(ctx, p.x, p.y, 4 * u, 2.2 * u, '#9fb38d30'); ellipse(ctx, p.x, p.y - u, 3.8 * u, 2.5 * u, '#dce0c4', -.2); ellipse(ctx, p.x - u, p.y - 1.5 * u, 2 * u, u, '#f3f1dba6'); }
    }
    ctx.restore();
    // Ground-level shadows precede all foliage and characters.
    for (const tree of garden.trees) { const p = this.projection(tree.x, tree.y); ctx.save(); ctx.filter = 'blur(3px)'; ellipse(ctx, p.x + 10 * u, p.y + 2 * u, 19 * u, 6 * u, '#67814921'); ctx.restore(); }
    for (const b of garden.blobs) { const p = this.projection(b.x, b.y); ellipse(ctx, p.x + 3 * u, p.y + 2 * u, 10 * u, 3.5 * u, '#69895327'); }
    const entities = [...garden.trees.map(tree => ({ kind: 'tree', object: tree, p: this.projection(tree.x, tree.y) })), ...garden.blobs.map(blob => ({ kind: 'blob', object: blob, p: this.projection(blob.x, blob.y) }))].sort((a, b) => a.p.y - b.p.y);
    this.hitTargets = [];
    for (const e of entities) {
      if (e.kind === 'tree') this.tree(e.object, e.p, garden.config, now, reducedMotion);
      else this.blob(e.object, e.p, now, reducedMotion);
    }
    for (const particle of garden.particles) {
      const p = this.projection(particle.x, particle.y);
      const spread = (1 - particle.life) * 22 * u;
      ctx.save(); ctx.globalAlpha = particle.life * .75;
      for (let i = 0; i < 4; i++) { const a = i * 1.8 + particle.id; const px = p.x + Math.cos(a) * spread, py = p.y - 20 * u + Math.sin(a) * spread * .5 - spread * .3; ctx.strokeStyle = particle.group === 'blue' ? '#83bdd8' : '#eca58a'; ctx.lineWidth = 1.4 * u; ctx.beginPath(); ctx.moveTo(px - 2 * u, py); ctx.lineTo(px + 2 * u, py); ctx.moveTo(px, py - 2 * u); ctx.lineTo(px, py + 2 * u); ctx.stroke(); }
      ctx.restore();
    }
    // A few drifting pollen motes make even a paused garden feel soft and alive.
    if (!reducedMotion) for (const d of this.clouds) { const x = this.cx + Math.sin(now * .1 + d.phase) * rx * .95, y = this.cy - 30 * u + Math.sin(now * .18 + d.phase * 2) * ry * .7; ellipse(ctx, x, y, 1.2 * u, 1.2 * u, '#fffde1b0'); }
  }
  flower(x, y, u, color) {
    const ctx = this.ctx; ctx.strokeStyle = '#8eac64'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 6 * u); ctx.stroke();
    for (let i = 0; i < 5; i++) ellipse(ctx, x + Math.cos(i * TAU / 5) * 2.2 * u, y - 6 * u + Math.sin(i * TAU / 5) * 2.2 * u, 1.9 * u, 1.5 * u, color);
    ellipse(ctx, x, y - 6 * u, 1.3 * u, 1.3 * u, '#e0bd66');
  }
  tree(tree, p, config, now, reduced) {
    const ctx = this.ctx, u = this.unit, x = p.x;
    const sway = reduced ? 0 : Math.sin(now * .7 + tree.variant * 20) * 1.1 * u;
    const height = (40 + tree.variant * 13) * u;
    const y = p.y - height;
    // Branches peek out below the rounded crowns.
    ctx.strokeStyle = '#9b8c57'; ctx.lineWidth = 5 * u; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, p.y); ctx.quadraticCurveTo(x - u, p.y - 12 * u, x + sway, y + 5 * u); ctx.stroke();
    ctx.strokeStyle = '#b9a673'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(x - u, p.y - 2 * u); ctx.lineTo(x - u + sway, y + 8 * u); ctx.stroke();
    ctx.strokeStyle = '#9b8c57'; ctx.lineWidth = 3 * u; ctx.beginPath(); ctx.moveTo(x, p.y - 16 * u); ctx.lineTo(x - 10 * u + sway, y + 10 * u); ctx.moveTo(x, p.y - 18 * u); ctx.lineTo(x + 10 * u + sway, y + 4 * u); ctx.stroke();
    const crownX = x + sway;
    const colors = tree.variant < .5 ? ['#aaca74', '#638b43'] : ['#b1cd7c', '#72954e'];
    ellipse(ctx, crownX + 3 * u, y + 7 * u, 21 * u, 18 * u, gradient(ctx, crownX + 3 * u, y + 7 * u, 22 * u, colors[0], colors[1]));
    ellipse(ctx, crownX - 14 * u, y + 4 * u, 15 * u, 16 * u, gradient(ctx, crownX - 14 * u, y + 4 * u, 17 * u, '#aecf7c', '#779d4e'));
    ellipse(ctx, crownX + 14 * u, y + 1 * u, 15 * u, 17 * u, gradient(ctx, crownX + 14 * u, y + 1 * u, 18 * u, '#b4d482', '#709548'));
    ellipse(ctx, crownX - 1 * u, y - 10 * u, 19 * u, 17 * u, gradient(ctx, crownX - u, y - 10 * u, 20 * u, '#bddb8f', '#82a857'));
    ellipse(ctx, crownX - 9 * u, y - 15 * u, 9 * u, 5 * u, '#d0e7a43a', -.35);
    const fruitPositions = [[-14, 5], [11, 9], [1, -7], [-6, 13], [18, -4], [-14, -9], [7, -17], [0, 18], [22, 6], [-23, 2], [13, -10], [-4, 1]];
    const visible = Math.min(12, Math.ceil(tree.fruit));
    for (let i = 0; i < visible; i++) {
      const a = fruitPositions[i], growth = Math.min(1, tree.fruit - i);
      const r = (3.7 + tree.variant * .65) * u * Math.max(.3, growth);
      const fx = crownX + a[0] * u, fy = y + a[1] * u;
      ctx.strokeStyle = '#688843'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(fx, fy - r); ctx.lineTo(fx + u, fy - r - 3 * u); ctx.stroke();
      ellipse(ctx, fx + 1.3 * u, fy + 1.5 * u, r, r, '#587c423d');
      ellipse(ctx, fx, fy, r, r, gradient(ctx, fx, fy, r, '#ddea87', '#9db94f'));
      ellipse(ctx, fx - r * .3, fy - r * .35, r * .28, r * .2, '#f6f3ac9e', -.3);
      ellipse(ctx, fx + 2 * u, fy - r - 1.5 * u, 2.5 * u, 1.1 * u, '#749845', -.6);
    }
    if (tree.pulse > 0) { ctx.save(); ctx.globalAlpha = tree.pulse * .25; ellipse(ctx, crownX, y + 5 * u, 30 * u, 22 * u, '#e2efa2'); ctx.restore(); }
  }
  blob(b, p, now, reduced) {
    const ctx = this.ctx, u = this.unit;
    const phase = reduced ? 0 : now * (b.pause ? 6 : b.moving ? 9 : 2.4) + b.phase;
    const bounce = reduced ? 0 : Math.max(0, Math.sin(phase)) * (b.moving ? 3 : b.pause ? 1.5 : .5) * u;
    const size = (b.age < 5 ? .72 + b.age * .056 : 1) * u;
    const x = p.x, baseY = p.y - bounce;
    const energyScale = .9 + Math.min(1, b.energy / 80) * .12;
    const width = 11 * size * energyScale, height = 28 * size;
    const lean = reduced ? 0 : (b.moving ? Math.cos(b.angle + this.rotation) * .14 : Math.sin(phase) * .045);
    if (this.selected === b.id) { ellipse(ctx, x, p.y + u, 17 * size, 7 * size); ctx.strokeStyle = b.group === 'blue' ? '#5b9fbcb5' : '#d3826fb5'; ctx.lineWidth = 1.6; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]); }
    if (b.pulse > 0) { ctx.save(); ctx.globalAlpha = b.pulse * .28; const glow = gradient(ctx, x, baseY - 12 * size, 25 * size, b.group === 'blue' ? '#bce9ef' : '#f9d6ab', '#e8efcf00'); ellipse(ctx, x, baseY - 12 * size, 25 * size, 25 * size, glow); ctx.restore(); }
    ctx.save(); ctx.translate(x, baseY); ctx.rotate(lean);
    const c = b.group === 'blue' ? ['#bee6ed', '#74b9d4', '#5295b4'] : ['#facbb3', '#ed9b83', '#d0806e'];
    const body = ctx.createLinearGradient(-width, -height, width, 1); body.addColorStop(0, c[0]); body.addColorStop(.45, c[1]); body.addColorStop(1, c[2]);
    // A bean silhouette, slightly pinched on one side rather than a perfect sphere.
    ctx.beginPath(); ctx.moveTo(-width * .65, -2 * size); ctx.bezierCurveTo(-width * 1.17, -7 * size, -width * 1.02, -height * .8, -width * .28, -height * .98); ctx.bezierCurveTo(width * .57, -height * 1.17, width * 1.22, -height * .7, width * .94, -height * .32); ctx.bezierCurveTo(width * 1.08, -3 * size, width * .47, 2 * size, -width * .65, -2 * size); ctx.closePath(); ctx.fillStyle = body; ctx.fill();
    ctx.strokeStyle = b.group === 'blue' ? '#7ebbd080' : '#e5a38a80'; ctx.lineWidth = .5 * size; ctx.stroke();
    ellipse(ctx, -4 * size, -height * .73, 3.5 * size, 5.5 * size, '#ffffff45', .42);
    ellipse(ctx, -5 * size, -height * .85, 1.5 * size, 2 * size, '#ffffff6b', .3);
    const faceY = -height * .4;
    const blink = !reduced && Math.sin(now * 1.3 + b.phase * 8) > .996;
    const face = b.group === 'blue' ? '#365f73' : '#884a41';
    ctx.fillStyle = face;
    if (blink) { ctx.strokeStyle = face; ctx.lineWidth = 1.2 * size; ctx.beginPath(); ctx.moveTo(-4 * size, faceY); ctx.lineTo(-1.8 * size, faceY); ctx.moveTo(2.2 * size, faceY); ctx.lineTo(4.5 * size, faceY); ctx.stroke(); }
    else { ellipse(ctx, -3 * size, faceY, 1.25 * size, 1.65 * size, face); ellipse(ctx, 3.6 * size, faceY, 1.25 * size, 1.65 * size, face); }
    ellipse(ctx, -5.8 * size, faceY + 3.1 * size, 2.1 * size, 1.1 * size, b.group === 'blue' ? '#d1d6d852' : '#df756b4d'); ellipse(ctx, 6.5 * size, faceY + 3.1 * size, 2.1 * size, 1.1 * size, b.group === 'blue' ? '#d1d6d852' : '#df756b4d');
    ctx.strokeStyle = face; ctx.lineWidth = .9 * size; ctx.beginPath();
    if (b.pause && b.group === 'blue') { ellipse(ctx, .4 * size, faceY + 4.3 * size, (1.1 + Math.sin(phase) * .3) * size, 1.1 * size, face); }
    else { ctx.moveTo(-1 * size, faceY + 4 * size); ctx.quadraticCurveTo(.7 * size, faceY + 6 * size, 2.2 * size, faceY + 3.9 * size); ctx.stroke(); }
    ctx.restore();
    this.hitTargets.push({ id: b.id, x, y: baseY - height * .45, radius: Math.max(14, height * .6) });
    if (b.pause && b.group === 'blue') { const fx = x + 8 * size, fy = baseY - 13 * size; ellipse(ctx, fx, fy, 3 * size, 3 * size, '#d1df77'); ellipse(ctx, fx - size, fy - size, size, size, '#f2f0a5'); }
  }
  pick(x, y) { return [...this.hitTargets].reverse().find(t => Math.hypot(t.x - x, t.y - y) < t.radius)?.id ?? null; }
}

import { seededRandom } from './simulation.js';

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
}

function roundRect(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill; ctx.fill();
}

export class WorldRenderer {
  constructor(canvas, garden, onSelect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.garden = garden;
    this.onSelect = onSelect;
    this.rotation = -0.2;
    this.zoom = 1;
    this.selected = null;
    this.hitAreas = [];
    this.drag = null;
    this.width = 800;
    this.height = 440;
    this.seed = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    canvas.addEventListener('pointerdown', e => {
      this.drag = { x: e.clientX, y: e.clientY, angle: this.rotation, moved: false };
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', e => {
      if (this.drag) {
        if (Math.abs(e.clientX - this.drag.x) + Math.abs(e.clientY - this.drag.y) > 5) this.drag.moved = true;
        if (this.drag.moved) this.rotation = this.drag.angle + (e.clientX - this.drag.x) * 0.008;
      } else {
        const rect = canvas.getBoundingClientRect();
        const hit = this.findHit(e.clientX - rect.left, e.clientY - rect.top);
        canvas.style.cursor = hit ? 'pointer' : 'grab';
      }
    });
    canvas.addEventListener('pointerup', e => {
      if (this.drag && !this.drag.moved) {
        const rect = canvas.getBoundingClientRect();
        const hit = this.findHit(e.clientX - rect.left, e.clientY - rect.top);
        if (hit) this.onSelect(hit.id);
      }
      this.drag = null;
      canvas.classList.remove('dragging');
    });
    canvas.addEventListener('pointercancel', () => { this.drag = null; canvas.classList.remove('dragging'); });
    canvas.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') this.rotation -= 0.15;
      if (e.key === 'ArrowRight') this.rotation += 0.15;
      if (e.key === '+' || e.key === '=') this.setZoom(this.zoom + 0.1);
      if (e.key === '-') this.setZoom(this.zoom - 0.1);
      if (e.key === 'Enter' && this.garden.blobs.length) {
        const current = this.garden.blobs.findIndex(b => b.id === this.selected);
        this.onSelect(this.garden.blobs[(current + 1) % this.garden.blobs.length].id);
      }
      if (['ArrowLeft', 'ArrowRight', '+', '=', '-', 'Enter'].includes(e.key)) e.preventDefault();
    });
  }

  resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.width = width; this.height = height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setZoom(value) { this.zoom = Math.max(0.75, Math.min(1.3, value)); }

  findHit(x, y) {
    return [...this.hitAreas].reverse().find(h => Math.hypot((h.x - x) / 1.1, h.y - y) < h.radius);
  }

  project(x, z, height = 0) {
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    return { x: this.centerX + (x * cos - z * sin) * this.scale, y: this.centerY + (x * sin + z * cos) * this.scale * 0.42 - height * this.scale, depth: x * sin + z * cos };
  }

  regenerateDetails() {
    this.seed = this.garden.settings.seed;
    const random = seededRandom(this.seed + 981);
    this.details = Array.from({ length: 135 }, (_, i) => {
      const angle = random() * TAU;
      const radius = Math.sqrt(random()) * this.garden.settings.worldSize * 0.96;
      return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, size: 0.5 + random(), type: i < 12 ? 'flower' : i < 23 ? 'stone' : 'grass', shade: random(), phase: random() * TAU };
    });
  }

  draw() {
    const ctx = this.ctx;
    const width = this.width, height = this.height;
    if (!width || !height) return;
    if (this.seed !== this.garden.settings.seed) this.regenerateDetails();
    ctx.clearRect(0, 0, width, height);
    const radius = Math.min(width * 0.41, height * 0.83) * this.zoom;
    this.scale = radius / this.garden.settings.worldSize;
    this.centerX = width * 0.5;
    this.centerY = height * 0.47;
    this.hitAreas = [];
    this.drawIsland(radius);

    // Every object is depth-sorted after rotating the world.
    const objects = [
      ...this.details.map(detail => ({ ...detail, drawType: 'detail' })),
      ...this.garden.plants.map(plant => ({ ...plant, drawType: 'plant' })),
      ...this.garden.blobs.map(blob => ({ ...blob, drawType: 'blob' })),
    ].sort((a, b) => this.project(a.x, a.z).depth - this.project(b.x, b.z).depth);

    for (const obj of objects) {
      const p = this.project(obj.x, obj.z);
      const scale = this.scale * (1 + p.depth / this.garden.settings.worldSize * 0.035);
      if (obj.drawType === 'detail') this.drawDetail(obj, p, scale);
      if (obj.drawType === 'plant') this.drawPlant(obj, p, scale);
      if (obj.drawType === 'blob') this.drawBlob(obj, p, scale);
    }
    for (const particle of this.garden.particles) this.drawParticle(particle);
  }

  drawIsland(radius) {
    const ctx = this.ctx;
    const x = this.centerX, y = this.centerY, ry = radius * 0.42;
    ctx.save();
    // Broad ambient occlusion grounds the raised garden dish.
    const shadow = ctx.createRadialGradient(x, y + 55, radius * 0.15, x, y + 55, radius * 1.12);
    shadow.addColorStop(0, '#5c694934'); shadow.addColorStop(0.65, '#73835a20'); shadow.addColorStop(1, '#73835a00');
    ctx.save(); ctx.translate(x, y + 57); ctx.scale(1, 0.42);
    ellipse(ctx, 0, 0, radius * 1.16, radius * 1.16, shadow);
    ctx.restore();
    for (let i = 16; i >= 1; i--) ellipse(ctx, x, y + 37 + i * 0.5, radius * 0.96 + i, ry + i * 0.16, `rgba(75,91,51,${0.0035})`);

    const depth = Math.max(28, radius * 0.11);
    const earth = ctx.createLinearGradient(x - radius, y, x + radius, y + depth);
    earth.addColorStop(0, '#c3b187'); earth.addColorStop(0.24, '#e1d2a9'); earth.addColorStop(0.6, '#d3c092'); earth.addColorStop(1, '#aa9b72');
    ctx.beginPath();
    ctx.ellipse(x, y + depth, radius, ry, 0, 0, Math.PI);
    ctx.lineTo(x - radius, y);
    ctx.ellipse(x, y, radius, ry, 0, Math.PI, 0, true);
    ctx.closePath(); ctx.fillStyle = earth; ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + depth - 2, radius - 1, ry, 0, 0, Math.PI);
    ctx.strokeStyle = '#e4d4ac'; ctx.lineWidth = 3; ctx.stroke();
    ellipse(ctx, x, y + 3, radius, ry, '#9dad69');
    const turf = ctx.createRadialGradient(x - radius * 0.35, y - ry * 0.55, 2, x, y, radius * 1.1);
    turf.addColorStop(0, '#e0eabb'); turf.addColorStop(0.5, '#cedda0'); turf.addColorStop(1, '#a9c17c');
    ellipse(ctx, x, y - 3, radius, ry, turf);
    ctx.beginPath(); ctx.ellipse(x, y - 4, radius - 2, ry - 1, 0, Math.PI, TAU);
    ctx.strokeStyle = '#e6edca'; ctx.lineWidth = 3; ctx.stroke();

    // Meandering subtle paths suggest a tiny well-loved garden.
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y - 3, radius - 3, ry - 3, 0, 0, TAU); ctx.clip();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      for (let j = 0; j <= 45; j++) {
        const a = j / 45 * TAU;
        const r = this.garden.settings.worldSize * (0.28 + i * 0.26) + Math.sin(a * 3 + i) * 0.4;
        const p = this.project(Math.cos(a) * r, Math.sin(a) * r);
        if (j === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.strokeStyle = i === 0 ? '#b1c58726' : '#b0c28625'; ctx.lineWidth = 8; ctx.stroke();
    }
    ctx.restore();
    ctx.restore();
  }

  drawDetail(detail, p, s) {
    const ctx = this.ctx;
    ctx.save(); ctx.translate(p.x, p.y);
    if (detail.type === 'grass') {
      ctx.strokeStyle = detail.shade > 0.5 ? '#83a25d72' : '#98b17080';
      ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      const size = s * 0.13 * detail.size;
      ctx.beginPath(); ctx.moveTo(-size * 0.6, 0); ctx.quadraticCurveTo(-size * 0.6, -size * 0.8, -size, -size);
      ctx.moveTo(0, 0); ctx.lineTo(0.15 * size, -size * 1.3);
      ctx.moveTo(size * 0.35, 0); ctx.quadraticCurveTo(size * 0.4, -size * 0.5, size, -size * 0.7); ctx.stroke();
    } else if (detail.type === 'stone') {
      ellipse(ctx, s * 0.035, 1, s * 0.14, s * 0.065, '#71815c20');
      const gradient = ctx.createLinearGradient(-4, -5, 4, 2);
      gradient.addColorStop(0, '#ede9d8'); gradient.addColorStop(1, '#b0b4a0');
      ellipse(ctx, 0, -s * 0.06, s * 0.12 * detail.size, s * 0.09 * detail.size, gradient);
    } else {
      const color = detail.shade > 0.65 ? '#f0e6a0' : detail.shade > 0.3 ? '#d9c8e1' : '#f9f8e8';
      for (let i = 0; i < 3; i++) {
        const fx = (i - 1) * s * 0.13;
        const fy = -s * (0.16 + Math.sin(i + detail.phase) * 0.06);
        ctx.strokeStyle = '#849966'; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(fx, 0); ctx.lineTo(fx, fy); ctx.stroke();
        for (let j = 0; j < 5; j++) ellipse(ctx, fx + Math.cos(j * TAU / 5) * 2, fy + Math.sin(j * TAU / 5) * 2, 1.8, 1.6, color);
        ellipse(ctx, fx, fy, 1.3, 1.3, '#dabb68');
      }
    }
    ctx.restore();
  }

  drawPlant(plant, p, s) {
    const ctx = this.ctx;
    const t = this.garden.time;
    const variation = plant.variation;
    const size = 0.86 + variation * 0.25;
    ctx.save(); ctx.translate(p.x, p.y);
    ellipse(ctx, s * 0.15, 2, s * 0.65 * size, s * 0.21, '#53653f1c');
    ellipse(ctx, 0, 0, s * 0.29, s * 0.1, '#5a713224');
    ctx.scale(size, size);
    const sway = Math.sin(t * 0.6 + variation * 6) * 0.022;
    ctx.rotate(sway);
    // A branching trunk remains visible beneath the round canopy.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = '#8c8056'; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.moveTo(0, -2); ctx.bezierCurveTo(-s * 0.07, -s * 0.35, s * 0.03, -s * 0.54, 0, -s * 0.9); ctx.stroke();
    ctx.strokeStyle = '#b2a276'; ctx.lineWidth = s * 0.052;
    ctx.beginPath(); ctx.moveTo(-s * 0.04, -3); ctx.lineTo(-s * 0.04, -s * 0.7); ctx.stroke();
    ctx.strokeStyle = '#8e845a'; ctx.lineWidth = s * 0.085;
    ctx.beginPath(); ctx.moveTo(0, -s * 0.48); ctx.lineTo(-s * 0.32, -s * 0.92); ctx.moveTo(0, -s * 0.5); ctx.lineTo(s * 0.32, -s * 0.9); ctx.stroke();

    const canopy = [
      [-0.39, -0.91, 0.43, '#9ebc79', '#658b4f'],
      [0.36, -0.94, 0.44, '#9fbc78', '#557d43'],
      [0.04, -1.38, 0.48, '#b2cd8a', '#709650'],
      [-0.21, -1.15, 0.47, '#b4ce8e', '#739b53'],
      [0.25, -1.20, 0.43, '#acc780', '#648b49'],
      [0.02, -0.93, 0.45, '#a7c47d', '#6e9650'],
    ];
    for (const [cx, cy, r, light, dark] of canopy) {
      const gradient = ctx.createRadialGradient((cx - r * 0.37) * s, (cy - r * 0.4) * s, r * s * 0.1, cx * s, cy * s, r * s);
      gradient.addColorStop(0, light); gradient.addColorStop(0.68, light); gradient.addColorStop(1, dark);
      ellipse(ctx, cx * s, cy * s, r * s, r * s * 0.91, gradient);
    }
    const positions = [[-0.37, -1.1], [0.30, -0.87], [0.08, -1.46], [-0.05, -0.94], [0.45, -1.19], [-0.43, -1.41], [0.15, -1.13], [-0.15, -1.65], [0.47, -0.74], [-0.28, -0.77], [0.3, -1.56], [-0.54, -0.88]];
    const fruits = Math.min(plant.fruit, positions.length);
    for (let i = 0; i < fruits; i++) {
      const [fx, fy] = positions[i];
      const r = s * 0.116;
      ellipse(ctx, fx * s + 1, fy * s + 2, r * 1.08, r, '#45632c30');
      ctx.strokeStyle = '#59763e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx * s, fy * s - r * 0.7); ctx.lineTo(fx * s + r * 0.2, fy * s - r * 1.5); ctx.stroke();
      const fruit = ctx.createRadialGradient(fx * s - r * 0.3, fy * s - r * 0.4, r * 0.1, fx * s, fy * s, r);
      fruit.addColorStop(0, '#e8eead'); fruit.addColorStop(0.45, '#c8dc73'); fruit.addColorStop(1, '#8fad47');
      ellipse(ctx, fx * s, fy * s, r, r * 1.06, fruit);
      ellipse(ctx, fx * s - r * 0.28, fy * s - r * 0.32, r * 0.21, r * 0.15, '#f9ffd6aa');
    }
    if (plant.pulse > 0) {
      ctx.globalAlpha = plant.pulse * 0.5;
      ellipse(ctx, 0, -s, s * 0.5 * (1.2 - plant.pulse), s * 0.5 * (1.2 - plant.pulse), '#eafbb94a');
    }
    ctx.restore();
  }

  drawBlob(blob, p, s) {
    const ctx = this.ctx;
    const time = this.garden.time;
    const moving = blob.timer === 0;
    const bounce = moving ? Math.abs(Math.sin(time * 6 + blob.phase)) * s * 0.075 : Math.sin(time * 8 + blob.phase) * s * 0.02;
    const isBlue = blob.kind === 'blue';
    const size = blob.age < 6 && blob.parent ? 0.65 + Math.min(1, blob.age / 6) * 0.35 : 1;
    const w = s * (isBlue ? 0.31 : 0.34) * size;
    const h = s * (isBlue ? 0.75 : 0.68) * size;
    const dir = Math.cos(blob.angle + this.rotation);
    ctx.save(); ctx.translate(p.x, p.y);
    ellipse(ctx, 2, 1, w * 1.03, w * 0.39, '#4d664427');
    if (blob.id === this.selected) {
      ctx.beginPath(); ctx.ellipse(0, 1, w * 1.65, w * 0.66, 0, 0, TAU);
      ctx.strokeStyle = isBlue ? '#3487b9' : '#d4795e'; ctx.lineWidth = 1.7; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.translate(0, -bounce - 1);
    const tilt = moving ? Math.sin(time * 6 + blob.phase) * 0.07 : Math.sin(time * 4 + blob.phase) * 0.035;
    ctx.rotate(tilt + dir * 0.045);
    if (blob.energy < 10) ctx.globalAlpha = 0.5 + blob.energy * 0.05;
    const gradient = ctx.createRadialGradient(-w * 0.45, -h * 0.8, 0, w * 0.1, -h * 0.4, h * 0.72);
    if (isBlue) {
      gradient.addColorStop(0, '#a4dffa'); gradient.addColorStop(0.38, '#72bfee'); gradient.addColorStop(0.74, '#439bd7'); gradient.addColorStop(1, '#2682bd');
    } else {
      gradient.addColorStop(0, '#ffc4a4'); gradient.addColorStop(0.38, '#fba180'); gradient.addColorStop(0.77, '#e97960'); gradient.addColorStop(1, '#d25e49');
    }
    ctx.beginPath();
    ctx.moveTo(-w * 0.9, -h * 0.18);
    ctx.bezierCurveTo(-w * 1.15, -h * 0.48, -w * 0.85, -h * 1.06, -w * 0.04, -h * 1.02);
    ctx.bezierCurveTo(w * 0.78, -h * 1.04, w * 1.12, -h * 0.59, w * 1.02, -h * 0.3);
    ctx.bezierCurveTo(w * 0.96, -h * 0.04, w * 0.48, 0, 0, 0);
    ctx.bezierCurveTo(-w * 0.5, 0, -w * 0.78, -h * 0.01, -w * 0.9, -h * 0.18);
    ctx.fillStyle = gradient; ctx.fill();
    // Gloss catches the light on the round little bean.
    ctx.save(); ctx.rotate(-0.25);
    ellipse(ctx, -w * 0.28, -h * 0.84, w * 0.18, h * 0.08, '#ffffff68'); ctx.restore();
    const faceX = dir * w * 0.14;
    const eyeY = -h * 0.53;
    const blinking = Math.sin(time * 1.1 + blob.phase * 11) > 0.992;
    for (const side of [-1, 1]) {
      if (blinking) {
        ctx.strokeStyle = '#2b494c'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(faceX + side * w * 0.32 - 1.1, eyeY); ctx.lineTo(faceX + side * w * 0.32 + 1.1, eyeY); ctx.stroke();
      } else {
        ellipse(ctx, faceX + side * w * 0.33, eyeY, s * 0.043 * size, s * 0.062 * size, '#29464b');
        ellipse(ctx, faceX + side * w * 0.33 - 0.2, eyeY - 0.55, 0.48, 0.5, '#ffffffd0');
      }
    }
    ctx.strokeStyle = isBlue ? '#315365' : '#904e44'; ctx.lineWidth = Math.max(0.8, s * 0.03); ctx.lineCap = 'round';
    ctx.beginPath();
    const mouth = -h * 0.38;
    if (blob.timer > 0 && isBlue) {
      ellipse(ctx, faceX, mouth, s * 0.045, s * 0.025 + Math.abs(Math.sin(time * 10)) * s * 0.023, '#315365');
    } else {
      ctx.moveTo(faceX - w * 0.15, mouth); ctx.quadraticCurveTo(faceX, mouth + w * 0.18, faceX + w * 0.15, mouth); ctx.stroke();
    }
    ellipse(ctx, faceX - w * 0.64, mouth - 1, w * 0.17, w * 0.10, isBlue ? '#daeff62d' : '#ef756060');
    ellipse(ctx, faceX + w * 0.64, mouth - 1, w * 0.17, w * 0.10, isBlue ? '#daeff62d' : '#ef756060');
    ctx.restore();
    this.hitAreas.push({ id: blob.id, x: p.x, y: p.y - h * 0.5 - bounce, radius: Math.max(13, h * 0.66) });
    if (blob.id === this.selected) {
      const label = `${isBlue ? 'Blue' : 'Red'} #${String(blob.id).padStart(2, '0')}`;
      ctx.font = '600 10px "Garden Sans", Arial, sans-serif';
      const tw = ctx.measureText(label).width;
      roundRect(ctx, p.x - tw / 2 - 8, p.y - h - 24, tw + 16, 19, 7, '#ffffffef');
      ctx.fillStyle = isBlue ? '#39749a' : '#b66953'; ctx.textAlign = 'center';
      ctx.fillText(label, p.x, p.y - h - 11);
    }
  }

  drawParticle(particle) {
    const ctx = this.ctx;
    const p = this.project(particle.x, particle.z, 0.8 + particle.age * 0.6);
    const opacity = Math.max(0, 1 - particle.age / 1.8);
    ctx.save(); ctx.globalAlpha = opacity;
    if (particle.type === 'fade') {
      for (let i = 0; i < 4; i++) ellipse(ctx, p.x + Math.cos(i * 1.6) * particle.age * 13, p.y + Math.sin(i * 1.6) * particle.age * 10, 2, 2, particle.kind === 'blue' ? '#8cc7e7' : '#eba68d');
    } else {
      const color = particle.type === 'contact' ? '#eaa384' : particle.type === 'birth' ? '#ffffff' : '#a8c56b';
      for (let i = 0; i < 3; i++) {
        const x = p.x + Math.sin(i * 2.4) * (6 + particle.age * 12);
        const y = p.y + Math.cos(i * 2.4) * 5;
        const size = (1 - particle.age / 2) * 3;
        ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y); ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
        ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.stroke();
      }
    }
    ctx.restore();
  }
}

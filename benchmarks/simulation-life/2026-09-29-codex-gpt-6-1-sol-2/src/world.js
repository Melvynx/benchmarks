import { seededRandom } from './simulation.js';

const TAU = Math.PI * 2;

export class World {
  constructor(canvas, getGarden, onInspect) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getGarden = getGarden;
    this.onInspect = onInspect;
    this.rotation = -0.18;
    this.zoom = 1;
    this.selected = null;
    this.hitTargets = [];
    this.decorations = [];
    const random = seededRandom(701);
    for (let index = 0; index < 330; index++) {
      const angle = random() * TAU;
      const radius = Math.sqrt(random()) * 0.97;
      this.decorations.push({ x: Math.cos(angle) * radius, z: Math.sin(angle) * radius, kind: random(), size: 0.7 + random(), angle: random() * TAU });
    }
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    let drag;
    canvas.addEventListener('pointerdown', event => {
      canvas.setPointerCapture(event.pointerId);
      drag = { x: event.clientX, y: event.clientY, rotation: this.rotation, moved: false };
    });
    canvas.addEventListener('pointermove', event => {
      if (drag) {
        if (Math.abs(event.clientX - drag.x) > 4) drag.moved = true;
        if (drag.moved) { this.rotation = drag.rotation + (event.clientX - drag.x) * 0.007; canvas.style.cursor = 'grabbing'; }
      } else {
        const bounds = canvas.getBoundingClientRect();
        const target = this.hitTargets.find(item => Math.hypot((event.clientX - bounds.left - item.x) / item.rx, (event.clientY - bounds.top - item.y) / item.ry) < 1);
        canvas.style.cursor = target ? 'pointer' : 'grab';
      }
    });
    canvas.addEventListener('pointerup', event => {
      if (drag && !drag.moved) {
        const bounds = canvas.getBoundingClientRect();
        const target = this.hitTargets.find(item => Math.hypot((event.clientX - bounds.left - item.x) / item.rx, (event.clientY - bounds.top - item.y) / item.ry) < 1.25);
        if (target) { this.selected = target.id; onInspect(target.id); }
      }
      drag = null;
      canvas.style.cursor = 'grab';
    });
    canvas.addEventListener('pointercancel', () => { drag = null; });
    canvas.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) { event.preventDefault(); this.zoom = Math.max(0.75, Math.min(1.35, this.zoom - event.deltaY * 0.001)); }
    }, { passive: false });
    this.resize();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width;
    this.height = bounds.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * ratio;
    this.canvas.height = this.height * ratio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  project(worldX, worldZ, elevation = 0) {
    const rotatedX = worldX * Math.cos(this.rotation) - worldZ * Math.sin(this.rotation);
    const rotatedZ = worldX * Math.sin(this.rotation) + worldZ * Math.cos(this.rotation);
    return { x: this.width / 2 + rotatedX * this.scale, y: this.centerY + rotatedZ * this.scale * 0.49 - elevation * this.scale, depth: rotatedZ };
  }

  ellipse(x, y, radiusX, radiusY, fill, rotation = 0) {
    const context = this.ctx;
    context.beginPath();
    context.ellipse(x, y, Math.max(0.001, radiusX), Math.max(0.001, radiusY), rotation, 0, TAU);
    context.fillStyle = fill;
    context.fill();
  }

  draw(now, playing) {
    const garden = this.getGarden();
    const context = this.ctx;
    const radius = garden.settings.worldSize;
    this.scale = Math.min(this.width * 0.39 / radius, this.height * 0.64 / radius) * this.zoom;
    this.centerY = this.height * 0.58;
    const dishRadius = radius * this.scale;
    context.clearRect(0, 0, this.width, this.height);
    context.save();
    context.filter = 'blur(18px)';
    this.ellipse(this.width / 2 + 9, this.centerY + 42, dishRadius * 0.9, dishRadius * 0.42, 'rgba(74,72,36,0.14)');
    context.restore();
    const rim = context.createLinearGradient(0, this.centerY, 0, this.centerY + dishRadius * 0.5 + 24);
    rim.addColorStop(0, '#ece8cf'); rim.addColorStop(0.75, '#d3cbb0'); rim.addColorStop(1, '#ece5d0');
    this.ellipse(this.width / 2, this.centerY + 17, dishRadius + 7, dishRadius * 0.49 + 5, rim);
    this.ellipse(this.width / 2, this.centerY + 3, dishRadius + 7, dishRadius * 0.49 + 5, '#e9e6d3');
    const grass = context.createLinearGradient(this.width / 2 - dishRadius, this.centerY - dishRadius * 0.5, this.width / 2 + dishRadius, this.centerY + dishRadius * 0.5);
    grass.addColorStop(0, '#c9d9a5'); grass.addColorStop(0.4, '#d4dfb6'); grass.addColorStop(1, '#b9ce94');
    this.ellipse(this.width / 2, this.centerY, dishRadius, dishRadius * 0.49, grass);
    context.save();
    context.beginPath(); context.ellipse(this.width / 2, this.centerY, dishRadius - 2, dishRadius * 0.49 - 1, 0, 0, TAU); context.clip();
    for (const decoration of this.decorations) {
      const point = this.project(decoration.x * radius, decoration.z * radius);
      const size = this.scale * 0.08 * decoration.size;
      if (decoration.kind < 0.52) {
        context.strokeStyle = decoration.kind < 0.3 ? '#a8bf87' : '#b1c995';
        context.lineWidth = 1.1;
        context.beginPath(); context.moveTo(point.x - size, point.y); context.quadraticCurveTo(point.x - size * 1.2, point.y - size * 1.4, point.x - size * 1.8, point.y - size * 2);
        context.moveTo(point.x, point.y); context.quadraticCurveTo(point.x, point.y - size * 1.5, point.x + size * 0.7, point.y - size * 2.3); context.stroke();
      } else if (decoration.kind < 0.76) {
        this.ellipse(point.x, point.y, size * 1.7, size * 0.8, 'rgba(234,231,206,0.52)', decoration.angle);
      } else if (decoration.kind > 0.9) {
        for (let petal = 0; petal < 5; petal++) {
          this.ellipse(point.x + Math.cos(petal * TAU / 5) * size, point.y + Math.sin(petal * TAU / 5) * size * 0.65, size * 0.7, size * 0.65, decoration.kind > 0.96 ? '#eee2b7' : '#f7f5df');
        }
        this.ellipse(point.x, point.y, size * 0.45, size * 0.4, '#d7bf65');
      }
    }
    context.restore();
    const objects = [...garden.trees.map(tree => ({ ...tree, type: 'tree', depth: this.project(tree.x, tree.z).depth })),
      ...garden.blobs.map(blob => ({ ...blob, type: 'blob', depth: this.project(blob.x, blob.z).depth }))].sort((first, second) => first.depth - second.depth);
    this.hitTargets = [];
    for (const object of objects) {
      if (object.type === 'tree') this.drawTree(object, now);
      else this.drawBlob(object, now, playing);
    }
    this.hitTargets.reverse();
  }

  drawTree(tree, now) {
    const context = this.ctx;
    const point = this.project(tree.x, tree.z);
    const size = this.scale;
    const sway = Math.sin(now * 0.0008 + tree.id * 3) * 0.7;
    this.ellipse(point.x + 8, point.y + 3, size * 0.78, size * 0.24, 'rgba(59,85,40,0.12)', -0.2);
    const trunk = context.createLinearGradient(point.x - 4, 0, point.x + 6, 0);
    trunk.addColorStop(0, '#a58b58'); trunk.addColorStop(0.4, '#c5ae74'); trunk.addColorStop(1, '#8f7c4e');
    context.strokeStyle = trunk; context.lineWidth = size * 0.13; context.lineCap = 'round';
    context.beginPath(); context.moveTo(point.x, point.y); context.lineTo(point.x + sway, point.y - size * 0.65); context.stroke();
    context.lineWidth = size * 0.07;
    context.beginPath(); context.moveTo(point.x, point.y - size * 0.23); context.lineTo(point.x - size * 0.26, point.y - size * 0.61);
    context.moveTo(point.x, point.y - size * 0.33); context.lineTo(point.x + size * 0.3, point.y - size * 0.75); context.stroke();
    const clusters = [ [-0.37,0.77,0.38,'#6e9751'], [0.36,0.83,0.4,'#79a459'], [0,1.08,0.48,'#83ab60'], [-0.28,1.08,0.36,'#8db668'], [0.15,1.29,0.36,'#98be72'], [0.16,0.85,0.36,'#7da557'] ];
    for (const [offsetX, offsetY, radius, color] of clusters) {
      const centerX = point.x + offsetX * size + sway;
      const centerY = point.y - offsetY * size;
      const gradient = context.createRadialGradient(centerX - size * 0.15, centerY - size * 0.15, 0, centerX, centerY, size * radius);
      gradient.addColorStop(0, color); gradient.addColorStop(0.7, color); gradient.addColorStop(1, '#668d49');
      this.ellipse(centerX, centerY, size * radius, size * radius * 0.89, gradient);
    }
    for (let index = 0; index < tree.fruit.length; index++) {
      const amount = tree.fruit[index];
      if (amount < 0.05) continue;
      const angle = index * 2.399 + tree.id * 0.75;
      const centerX = point.x + Math.cos(angle) * size * 0.39 + sway;
      const centerY = point.y - size * 0.91 + Math.sin(angle) * size * 0.28;
      const fruitSize = size * 0.105 * (0.2 + amount * 0.8);
      context.strokeStyle = '#61823b'; context.lineWidth = 1.5;
      context.beginPath(); context.moveTo(centerX, centerY); context.lineTo(centerX + 1, centerY - fruitSize * 1.6); context.stroke();
      const fruitGradient = context.createRadialGradient(centerX - fruitSize * 0.3, centerY - fruitSize * 0.4, 0, centerX, centerY, fruitSize);
      fruitGradient.addColorStop(0, amount < 1 ? '#c4d79a' : '#e0ee8d'); fruitGradient.addColorStop(0.45, '#c5db74'); fruitGradient.addColorStop(1, '#91b548');
      this.ellipse(centerX, centerY, fruitSize, fruitSize * 1.06, fruitGradient);
      this.ellipse(centerX - fruitSize * 0.3, centerY - fruitSize * 0.38, fruitSize * 0.2, fruitSize * 0.14, '#ecf4b0');
    }
  }

  drawBlob(blob, now, playing) {
    const context = this.ctx;
    const point = this.project(blob.x, blob.z);
    const size = this.scale * 0.46 * Math.min(1, 0.65 + blob.age / 8);
    const isBlue = blob.species === 'blue';
    const phase = now * 0.006 + blob.id * 1.8;
    const bob = blob.pause > 0 ? Math.sin(phase * 1.5) * size * 0.055 : playing ? Math.abs(Math.sin(phase)) * size * 0.12 : Math.sin(phase * 0.5) * size * 0.025;
    const lean = blob.pause > 0 ? Math.sin(phase) * 0.035 : playing ? Math.sin(phase) * 0.05 : 0;
    this.ellipse(point.x + 3, point.y + 1, size * 0.8, size * 0.27, 'rgba(48,64,51,0.17)');
    if (this.selected === blob.id) {
      context.strokeStyle = isBlue ? '#629fb2' : '#c27b70'; context.lineWidth = 1.7;
      context.setLineDash([3, 3]); context.beginPath(); context.ellipse(point.x, point.y, size * 1.05, size * 0.4, 0, 0, TAU); context.stroke(); context.setLineDash([]);
    }
    const centerY = point.y - size * 0.73 - bob;
    context.save(); context.translate(point.x, centerY); context.rotate(lean);
    const gradient = context.createRadialGradient(-size * 0.3, -size * 0.5, size * 0.03, size * 0.05, size * 0.05, size * 1.17);
    gradient.addColorStop(0, isBlue ? '#a5daeb' : '#f5b8a8'); gradient.addColorStop(0.32, isBlue ? '#69b3ce' : '#e88879');
    gradient.addColorStop(0.73, isBlue ? '#4394b8' : '#d46f61'); gradient.addColorStop(1, isBlue ? '#347a9b' : '#b5574a');
    context.beginPath(); context.moveTo(-size * 0.67, size * 0.26);
    context.bezierCurveTo(-size * 0.83, -size * 0.15, -size * 0.55, -size * 0.93, -size * 0.02, -size * 0.95);
    context.bezierCurveTo(size * 0.64, -size * 0.99, size * 0.79, -size * 0.28, size * 0.72, size * 0.24);
    context.bezierCurveTo(size * 0.63, size * 0.73, -size * 0.45, size * 0.85, -size * 0.67, size * 0.26);
    context.fillStyle = gradient; context.fill();
    this.ellipse(-size * 0.27, -size * 0.53, size * 0.15, size * 0.28, isBlue ? 'rgba(222,248,255,0.42)' : 'rgba(255,238,219,0.45)', 0.5);
    const faceX = Math.cos(blob.heading + this.rotation) * size * 0.12;
    const blink = Math.sin(now * 0.0012 + blob.id * 3.7) > 0.996;
    for (const offset of [-0.22, 0.22]) {
      this.ellipse(faceX + size * offset, size * 0.01, size * 0.07, size * (blink ? 0.018 : 0.10), '#263c3a');
      if (!blink) this.ellipse(faceX + size * offset - size * 0.014, -size * 0.027, size * 0.021, size * 0.028, '#f2f8f3');
    }
    this.ellipse(faceX - size * 0.37, size * 0.16, size * 0.115, size * 0.055, isBlue ? 'rgba(219,229,226,0.35)' : 'rgba(241,173,147,0.6)');
    this.ellipse(faceX + size * 0.37, size * 0.16, size * 0.115, size * 0.055, isBlue ? 'rgba(219,229,226,0.35)' : 'rgba(241,173,147,0.6)');
    context.strokeStyle = '#31433b'; context.lineWidth = Math.max(1, size * 0.045);
    context.beginPath(); context.arc(faceX, size * 0.14, size * 0.105, 0.15, Math.PI - 0.15); context.stroke();
    context.restore();
    if (blob.pulse > 0) {
      context.globalAlpha = blob.pulse;
      context.fillStyle = isBlue ? '#f8f5bb' : '#f3d6a2';
      for (let index = 0; index < 3; index++) {
        const sparkX = point.x + Math.cos(index * 2.1 + phase) * size * 1.25;
        const sparkY = centerY - size * 0.5 + Math.sin(index * 2.1 + phase) * size * 0.8;
        context.beginPath(); context.moveTo(sparkX, sparkY - 3); context.lineTo(sparkX + 1, sparkY - 1); context.lineTo(sparkX + 3, sparkY); context.lineTo(sparkX + 1, sparkY + 1); context.lineTo(sparkX, sparkY + 3); context.lineTo(sparkX - 1, sparkY + 1); context.lineTo(sparkX - 3, sparkY); context.lineTo(sparkX - 1, sparkY - 1); context.closePath(); context.fill();
      }
      context.globalAlpha = 1;
    }
    this.hitTargets.push({ id: blob.id, x: point.x, y: centerY, rx: size * 0.8, ry: size });
  }
}

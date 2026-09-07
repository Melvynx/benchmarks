export class GardenView {
  constructor(canvas, garden, inspect) {
    this.canvas = canvas; this.context = canvas.getContext('2d'); this.garden = garden; this.rotation = -0.2; this.zoom = 1; this.hits = []; this.selected = null;
    let pointer = null;
    canvas.addEventListener('pointerdown', event => { pointer = { x: event.clientX, start: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', event => { if (!pointer) return; this.rotation += (event.clientX - pointer.x) * 0.008; pointer.x = event.clientX; });
    canvas.addEventListener('pointerup', event => {
      if (pointer && Math.abs(event.clientX - pointer.start) < 5 && Math.abs(event.clientY - pointer.y) < 5) {
        const rect = canvas.getBoundingClientRect(); const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
        const hit = [...this.hits].reverse().find(item => Math.hypot(item.x - point.x, item.y - point.y) < item.radius);
        this.selected = hit?.id ?? null; inspect(this.selected);
      }
      pointer = null;
    });
    canvas.addEventListener('pointercancel', () => { pointer = null; });
  }
  project(x, y, height = 0) {
    const rotatedX = x * Math.cos(this.rotation) - y * Math.sin(this.rotation);
    const rotatedY = x * Math.sin(this.rotation) + y * Math.cos(this.rotation);
    return { x: this.width / 2 + rotatedX * this.scale, y: this.height * 0.51 + rotatedY * this.scale * 0.53 - height * this.scale, depth: rotatedY };
  }
  ellipse(x, y, radiusX, radiusY, color) { const ctx = this.context; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, radiusX), Math.max(0.1, radiusY), 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  sphere(x, y, radius, colors, ratio = 1) {
    const gradient = this.context.createRadialGradient(x - radius * 0.35, y - radius * 0.42, radius * 0.05, x, y, radius);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.6, colors[1]); gradient.addColorStop(1, colors[2]);
    this.ellipse(x, y, radius, radius * ratio, gradient);
  }
  draw(timestamp, running) {
    const rect = this.canvas.getBoundingClientRect(); const ratio = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(rect.width * ratio) || this.canvas.height !== Math.round(rect.height * ratio)) { this.canvas.width = Math.round(rect.width * ratio); this.canvas.height = Math.round(rect.height * ratio); }
    this.width = rect.width; this.height = rect.height;
    const ctx = this.context; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, this.width, this.height);
    this.scale = Math.min(this.width / 465, this.height / 287) * this.zoom * 180 / this.garden.settings.size;
    const radius = this.garden.settings.size * this.scale; const centerX = this.width / 2; const centerY = this.height * .51;
    ctx.save(); ctx.filter = 'blur(15px)'; this.ellipse(centerX + 8, centerY + 36, radius * .97, radius * .51, '#3d4c2630'); ctx.restore();
    const side = ctx.createLinearGradient(0, centerY, 0, centerY + radius * .6 + 22); side.addColorStop(0, '#c7c2a2'); side.addColorStop(.8, '#bcb694'); side.addColorStop(1, '#999579');
    this.ellipse(centerX, centerY + 20, radius + 5, radius * .535, side);
    ctx.fillStyle = side; ctx.fillRect(centerX - radius - 5, centerY, (radius + 5) * 2, 20);
    this.ellipse(centerX, centerY, radius + 5, radius * .535, '#e4e1c8');
    const grass = ctx.createLinearGradient(0, centerY - radius * .5, 0, centerY + radius * .5); grass.addColorStop(0, '#c0d893'); grass.addColorStop(.5, '#c8dc9e'); grass.addColorStop(1, '#b1ca83');
    this.ellipse(centerX, centerY - 2, radius, radius * .52, grass);
    ctx.save(); ctx.beginPath(); ctx.ellipse(centerX, centerY - 2, radius, radius * .52, 0, 0, Math.PI * 2); ctx.clip();
    for (let index = 0; index < 450; index++) {
      const angle = index * 2.399963; const distance = Math.sqrt((index * .61803) % 1) * this.garden.settings.size;
      const point = this.project(Math.cos(angle) * distance, Math.sin(angle) * distance);
      this.ellipse(point.x, point.y, 1 + index % 3 * .4, .6, index % 3 ? '#789c5230' : '#f1f1be65');
      if (index % 13 === 0) { ctx.strokeStyle = '#88a86066'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(point.x - 2, point.y); ctx.lineTo(point.x - 3, point.y - 3); ctx.moveTo(point.x, point.y); ctx.lineTo(point.x + 1, point.y - 4); ctx.stroke(); }
    }
    ctx.restore();
    this.hits = [];
    const objects = [...this.garden.plants.map(plant => ({ type: 'tree', item: plant, ...this.project(plant.x, plant.y) })), ...this.garden.blobs.map(blob => ({ type: 'blob', item: blob, ...this.project(blob.x, blob.y) }))].sort((first, second) => first.depth - second.depth);
    for (const object of objects) { if (object.type === 'tree') this.tree(object); else this.blob(object, timestamp, running); }
    for (let index = 0; index < 9; index++) {
      const point = this.project(Math.cos(index * 2.4) * this.garden.settings.size * .92, Math.sin(index * 2.4) * this.garden.settings.size * .92);
      this.ellipse(point.x, point.y, 3.8 * this.scale, 1.8 * this.scale, '#97a77a55');
      if (index % 2) this.sphere(point.x, point.y - 1.5 * this.scale, 2.5 * this.scale, ['#f1eddc', '#d0d1b6', '#a8ae8d'], .6);
      else { for (let petal = 0; petal < 5; petal++) this.ellipse(point.x + Math.cos(petal * 1.26) * 2.1, point.y - 3 + Math.sin(petal * 1.26) * 1.5, 1.6, 1.2, '#fffde4'); this.ellipse(point.x, point.y - 3, 1.2, 1, '#dec56b'); }
    }
  }
  tree(object) {
    const ctx = this.context; const scale = this.scale; const { x, y, item } = object; const tall = 26 + item.id % 4 * 3;
    this.ellipse(x + 6 * scale, y + 3 * scale, 18 * scale, 7 * scale, '#49672c25');
    ctx.strokeStyle = '#897149'; ctx.lineWidth = 4.5 * scale; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - scale, y - tall * scale); ctx.stroke();
    ctx.strokeStyle = '#a48c60'; ctx.lineWidth = 1.3 * scale; ctx.beginPath(); ctx.moveTo(x - scale, y - 2 * scale); ctx.lineTo(x - 2 * scale, y - tall * scale); ctx.stroke();
    const leaves = [[-9, -tall + 2, 12], [10, -tall, 13], [0, -tall - 10, 15], [-3, -tall + 5, 12]];
    for (const [offsetX, offsetY, size] of leaves) this.sphere(x + offsetX * scale, y + offsetY * scale, size * scale, ['#96bb60', '#719d43', '#527d35'], .91);
    for (let index = 0; index < Math.ceil(item.fruit); index++) {
      const amount = Math.min(1, item.fruit - index); const angle = index * 2.4 + item.id; const offsetX = Math.cos(angle) * (8 + index % 2 * 6); const offsetY = Math.sin(angle) * 9;
      const fruitX = x + offsetX * scale; const fruitY = y + (-tall - 3 + offsetY) * scale;
      ctx.strokeStyle = '#446831'; ctx.lineWidth = scale; ctx.beginPath(); ctx.moveTo(fruitX, fruitY); ctx.lineTo(fruitX + scale, fruitY - 6 * scale); ctx.stroke();
      this.sphere(fruitX, fruitY, 3.8 * scale * amount, ['#e0f38a', '#afce55', '#7fa334']);
      this.ellipse(fruitX - scale, fruitY - 1.3 * scale, .8 * scale, 1.2 * scale, '#f8ffc280');
    }
  }
  blob(object, timestamp, running) {
    const ctx = this.context; const scale = this.scale; const { x, y, item } = object;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const bounce = running && !reduced ? Math.sin(timestamp * .006 + item.id * 2) * (item.timer ? .8 : 1.8) : 0;
    const size = (item.age < 5 && item.generation > 1 ? 6 : 8) * scale; const bodyY = y - size * 1.05 - Math.abs(bounce) * scale;
    this.ellipse(x + size * .3, y + 1, size * 1.02, size * .38, '#344d352d');
    if (this.selected === item.id) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, size * 1.6, size * .65, 0, 0, Math.PI * 2); ctx.stroke(); }
    ctx.save(); ctx.translate(x, bodyY); ctx.rotate(running && !reduced ? Math.sin(timestamp * .006 + item.id * 2) * .08 : -.07);
    this.sphere(0, 0, size, item.group === 'blue' ? ['#a3e3fb', '#5aaedb', '#2a77ad'] : ['#ffb1a0', '#ef7966', '#c84b3d'], 1.25);
    this.ellipse(-size * .35, -size * .61, size * .23, size * .39, '#ffffff40');
    const blink = !reduced && Math.sin(timestamp * .001 + item.id * 4) > .993;
    for (const offset of [-.29, .29]) { this.ellipse(size * offset + 1, size * .03, size * .105, size * (blink ? .035 : .16), '#253b3b'); if (!blink) this.ellipse(size * offset + 1.3, -size * .015, size * .027, size * .04, '#fff'); }
    ctx.strokeStyle = '#344c46'; ctx.lineWidth = Math.max(.7, scale * .7); ctx.beginPath(); ctx.arc(size * .07, size * .2, size * .16, .1, Math.PI - .1); ctx.stroke();
    ctx.restore();
    if (item.pulse > 0) { ctx.fillStyle = item.group === 'blue' ? '#719b40' : '#df7466'; ctx.font = `${10 * scale}px sans-serif`; ctx.fillText(item.action === 'Munching fruit' ? '✦' : '♡', x + size, bodyY - size * 1.3 - (2 - item.pulse) * 4); }
    this.hits.push({ x, y: bodyY, radius: Math.max(13, size * 1.3), id: item.id });
  }
}

const TAU = Math.PI * 2;

function ellipse(ctx, x, y, rx, ry, fill) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

function line(ctx, points, color, width = 1) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawTree(ctx, tree, p, scale, time) {
  const size = Math.max(0.83, Math.min(1.15, scale / 5.5)) * tree.height;
  const x = p.x, y = p.y;
  const sway = Math.sin(time * 0.65 + tree.id * 2.2) * 1.2;
  ellipse(ctx, x + 3, y + 5, 17 * size, 5 * size, 'rgba(54, 72, 38, .16)');
  line(ctx, [[x, y], [x + 2 + sway, y - 29 * size]], '#745a36', 7 * size);
  line(ctx, [[x, y - 8 * size], [x + 3 + sway, y - 30 * size]], '#aa7d44', 2 * size);

  const cy = y - 35 * size;
  const leaves = [
    [-14, 2, 15, '#478f53'], [12, 1, 16, '#4a9c5a'],
    [-5, -13, 17, '#59a966'], [6, -13, 16, '#65b66a'],
    [-17, -8, 11, '#6ab66c'], [19, -7, 11, '#64aa5e'],
    [0, 7, 17, '#459656'],
  ];
  leaves.forEach(([dx, dy, r, color], i) => {
    const g = ctx.createRadialGradient(x + (dx - 4) * size + sway, cy + (dy - 5) * size, 1, x + dx * size + sway, cy + dy * size, r * size);
    g.addColorStop(0, i % 2 ? '#86ca7e' : '#75bd73');
    g.addColorStop(1, color);
    ellipse(ctx, x + dx * size + sway, cy + dy * size, r * size, r * 0.82 * size, g);
  });
  const positions = [[-17, 5], [8, 8], [18, -7], [-4, -17], [-18, -11], [3, -4], [14, -17], [-4, 13], [22, 2], [-10, -2]];
  tree.fruits.forEach((fruit, i) => {
    if (fruit.ripe < 0.12) return;
    const [dx, dy] = positions[i % positions.length];
    const fx = x + dx * size + sway;
    const fy = cy + dy * size;
    const r = 5.2 * size * Math.min(1, fruit.ripe / 0.72);
    line(ctx, [[fx, fy - 3 * size], [fx + 1, fy - r - 2]], '#39794c', 1.4 * size);
    const fruitGrad = ctx.createRadialGradient(fx - r * .35, fy - r * .42, 0, fx, fy, r);
    fruitGrad.addColorStop(0, '#f1f89c');
    fruitGrad.addColorStop(.5, fruit.ripe > .72 ? '#b8de55' : '#9fce70');
    fruitGrad.addColorStop(1, '#75aa43');
    ellipse(ctx, fx, fy, r, r * .93, fruitGrad);
    ellipse(ctx, fx - r * .3, fy - r * .38, r * .22, r * .15, 'rgba(255,255,255,.64)');
  });
}

function drawBlob(ctx, blob, p, time, selected) {
  const active = Math.hypot(blob.vx, blob.vy) > 2 && blob.timer <= 0;
  const bounce = active ? Math.abs(Math.sin(time * 7 + blob.bounceOffset)) * 3.2 : Math.sin(time * 2 + blob.bounceOffset) * .7;
  const x = p.x, y = p.y - bounce;
  const size = .88 + Math.min(blob.energy, 140) / 700;
  const w = 15.4 * size, h = 19 * size;
  ellipse(ctx, x + 2, p.y + 5, w * 1.02, 5.1, 'rgba(44, 52, 54, .18)');
  if (selected) {
    ctx.beginPath(); ctx.ellipse(x, p.y + 3, w + 7, 8, 0, 0, TAU);
    ctx.strokeStyle = '#fffef5'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, p.y + 3, w + 9, 10, 0, 0, TAU);
    ctx.strokeStyle = blob.group === 'blue' ? '#536ee0' : '#e76e64'; ctx.lineWidth = 2; ctx.stroke();
  }
  ctx.save();
  ctx.translate(x, y - h * .55);
  ctx.rotate(active ? Math.sin(time * 7 + blob.bounceOffset) * .08 + Math.sin(blob.heading) * .06 : Math.sin(time * 2 + blob.bounceOffset) * .035);
  const gradient = ctx.createRadialGradient(-w * .45, -h * .5, 1, 0, 1, h * 1.35);
  if (blob.group === 'blue') {
    gradient.addColorStop(0, '#a5dcff'); gradient.addColorStop(.48, '#5f98ed'); gradient.addColorStop(1, '#4366c9');
  } else {
    gradient.addColorStop(0, '#ffc5ae'); gradient.addColorStop(.48, '#ee827b'); gradient.addColorStop(1, '#cf575f');
  }
  ctx.beginPath();
  ctx.moveTo(-w * .93, h * .36);
  ctx.bezierCurveTo(-w * 1.1, -h * .22, -w * .48, -h * .95, 0, -h * .88);
  ctx.bezierCurveTo(w * .65, -h * .91, w * 1.1, -h * .18, w * .91, h * .39);
  ctx.bezierCurveTo(w * .79, h * .9, -w * .72, h * .84, -w * .93, h * .36);
  ctx.fillStyle = gradient; ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = blob.group === 'blue' ? '#4c79cf' : '#d76c69'; ctx.stroke();
  ellipse(ctx, -w * .4, -h * .53, w * .34, h * .18, 'rgba(255,255,255,.35)');
  if (blob.timer > 0) {
    ellipse(ctx, -w * .98, h * .19, 3.7, 2.7, blob.group === 'blue' ? '#7faaf1' : '#ee9690');
    ellipse(ctx, w * .98, h * .19, 3.7, 2.7, blob.group === 'blue' ? '#7faaf1' : '#ee9690');
  }
  const blink = Math.sin(time * 1.25 + blob.blinkOffset) > .993;
  for (const eyeX of [-w * .31, w * .31]) {
    if (blink) line(ctx, [[eyeX - 2.1, -h * .1], [eyeX + 2.1, -h * .1]], '#26384d', 1.5);
    else {
      ellipse(ctx, eyeX, -h * .1, 2.35, 3.2, '#26384d');
      ellipse(ctx, eyeX - .65, -h * .1 - 1, .7, .8, '#fff');
    }
  }
  ctx.beginPath(); ctx.arc(0, h * .2, 3.1, .1, Math.PI - .1); ctx.strokeStyle = '#354354'; ctx.lineWidth = 1.25; ctx.stroke();
  if (blob.action === 'Eating fruit') ellipse(ctx, w * .75, h * .06, 2.8, 2.8, '#c9e875');
  ctx.restore();
}

export function renderWorld(canvas, garden, rotation, time, selectedId) {
  if (!canvas || !garden) return [];
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return [];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  const radius = garden.config.worldSize;
  const scale = Math.min(w * .415 / radius, h * .355 / (radius * .62));
  const rx = radius * scale, ry = rx * .62;
  const cx = w / 2, cy = h * .51;
  const c = Math.cos(rotation), s = Math.sin(rotation);
  const project = point => ({ x: cx + (point.x * c - point.y * s) * scale, y: cy + (point.x * s + point.y * c) * scale * .62 });

  const ambient = ctx.createRadialGradient(cx, cy, rx * .28, cx, cy, rx * 1.55);
  ambient.addColorStop(0, 'rgba(216, 234, 196, .26)'); ambient.addColorStop(1, 'rgba(216, 234, 196, 0)');
  ellipse(ctx, cx, cy + 18, rx * 1.32, ry * 1.56, ambient);
  ellipse(ctx, cx + 5, cy + 35, rx * 1.035, ry * 1.12, 'rgba(74, 80, 57, .14)');

  const side = ctx.createLinearGradient(cx, cy + ry - 14, cx, cy + ry + 40);
  side.addColorStop(0, '#b9a376'); side.addColorStop(.5, '#9e896a'); side.addColorStop(1, '#766b58');
  ctx.beginPath();
  ctx.ellipse(cx, cy + 26, rx, ry, 0, 0, Math.PI);
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath(); ctx.fillStyle = side; ctx.fill();
  ellipse(ctx, cx, cy + 20, rx, ry, '#a79876');
  ellipse(ctx, cx, cy + 3, rx, ry, '#d2c39a');
  const ground = ctx.createRadialGradient(cx - rx * .25, cy - ry * .25, 2, cx, cy, rx);
  ground.addColorStop(0, '#dbe9ae'); ground.addColorStop(.62, '#bed98e'); ground.addColorStop(1, '#a5c77f');
  ellipse(ctx, cx, cy, rx - 7, ry - 5, ground);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx - 6, ry - 4, 0, 0, TAU);
  ctx.strokeStyle = 'rgba(255,255,240,.6)'; ctx.lineWidth = 4; ctx.stroke();

  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, cy, rx - 9, ry - 7, 0, 0, TAU); ctx.clip();
  for (let i = 0; i < 145; i++) {
    const angle = i * 2.39996, rr = Math.sqrt(((i * 43) % 151) / 151) * radius * .94;
    const p = project({ x: Math.cos(angle) * rr, y: Math.sin(angle) * rr });
    const shade = i % 5 === 0 ? 'rgba(245,251,207,.72)' : i % 3 === 0 ? 'rgba(84,143,72,.3)' : 'rgba(138,176,79,.32)';
    ellipse(ctx, p.x, p.y, i % 9 === 0 ? 2.2 : 1.25, i % 9 === 0 ? 1.5 : .85, shade);
  }
  for (let i = 0; i < 11; i++) {
    const angle = i * 2.43 + .8, rr = radius * (.38 + ((i * 7) % 9) / 20);
    const p = project({ x: Math.cos(angle) * rr, y: Math.sin(angle) * rr });
    if (i % 3 === 0) {
      ellipse(ctx, p.x, p.y, 5, 2.8, '#f9f0d2');
      ellipse(ctx, p.x + 2, p.y + 1, 2.6, 1.6, '#d2c9a2');
    } else {
      ellipse(ctx, p.x - 3, p.y, 2.5, 2.3, '#f7f6d6');
      ellipse(ctx, p.x + 2.5, p.y - 1, 2.5, 2.3, '#f7f6d6');
      ellipse(ctx, p.x, p.y + 2, 2.5, 2.3, '#f7f6d6');
      ellipse(ctx, p.x, p.y, 2, 2, '#e4b86f');
    }
  }

  const objects = [
    ...garden.trees.map(tree => ({ type: 'tree', item: tree, p: project(tree) })),
    ...garden.blobs.map(blob => ({ type: 'blob', item: blob, p: project(blob) })),
  ].sort((a, b) => a.p.y - b.p.y);
  const hits = [];
  for (const object of objects) {
    if (object.type === 'tree') drawTree(ctx, object.item, object.p, scale, time);
    else {
      drawBlob(ctx, object.item, object.p, time, object.item.id === selectedId);
      hits.push({ id: object.item.id, x: object.p.x, y: object.p.y - 8, r: 19 });
    }
  }
  for (const effect of garden.effects) {
    const p = project(effect), progress = effect.age / 1.1;
    ctx.globalAlpha = 1 - progress;
    if (effect.kind === 'birth') {
      ctx.beginPath(); ctx.arc(p.x, p.y - 12, 11 + progress * 18, 0, TAU); ctx.strokeStyle = '#fff7ca'; ctx.lineWidth = 3 - progress * 2; ctx.stroke();
    } else {
      const color = effect.group === 'fruit' ? '#f4e87d' : '#ffe2b9';
      for (let i = 0; i < 5; i++) {
        const a = i * TAU / 5 + effect.x;
        const r = 4 + progress * 19;
        ellipse(ctx, p.x + Math.cos(a) * r, p.y - 13 + Math.sin(a) * r * .75, 3.3 * (1 - progress * .55), 3.3 * (1 - progress * .55), color);
      }
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  return hits;
}

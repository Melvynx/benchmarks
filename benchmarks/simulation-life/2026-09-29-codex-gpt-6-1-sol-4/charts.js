const COLORS = { fruit: '#9cb779', blue: '#7fb6d0', red: '#e39987' };
const text = (x, y, value, options = '') => `<text x="${x}" y="${y}" fill="#a5ae96" font-family="DM Sans, sans-serif" font-size="8" ${options}>${value}</text>`;
export function historyChart(el, history, mode = 'count') {
  const W = 600, H = 140, left = 29, right = 8, top = 8, bottom = 23;
  const maxTime = Math.max(60, history.at(-1).time), x = t => left + t / maxTime * (W - left - right);
  const keys = ['fruit', 'blue', 'red'];
  const value = (h, key) => mode === 'index' ? h[key] / Math.max(1, history[0][key]) * 100 : h[key];
  const actualMax = Math.max(20, ...history.flatMap(h => keys.map(k => value(h, k))));
  const maxY = Math.ceil(actualMax / (mode === 'index' ? 50 : 25)) * (mode === 'index' ? 50 : 25);
  const y = v => H - bottom - v / maxY * (H - bottom - top);
  let svg = '';
  for (let i = 0; i <= 4; i++) { const val = maxY / 4 * i; const py = y(val); svg += `<path d="M${left},${py}H${W - right}" stroke="#e8ecdf" stroke-width=".7" ${i ? 'stroke-dasharray="3 4"' : ''}/>`; svg += text(left - 9, py + 3, Math.round(val) + (mode === 'index' ? '%' : ''), 'text-anchor="end"'); }
  for (let i = 0; i <= 5; i++) { const t = maxTime / 5 * i; svg += text(x(t), H - 6, Math.round(t / 10), 'text-anchor="middle"'); }
  const sampled = history.filter((_, i) => i % Math.max(1, Math.floor(history.length / 550)) === 0 || i === history.length - 1);
  for (const key of keys) {
    const d = sampled.map((h, i) => `${i ? 'L' : 'M'}${x(h.time).toFixed(2)},${y(value(h, key)).toFixed(2)}`).join(' ');
    const last = history.at(-1);
    svg += `<path d="${d}L${x(last.time)},${H - bottom}L${left},${H - bottom}Z" fill="${COLORS[key]}" opacity=".045"/>`;
    svg += `<path d="${d}" stroke="${COLORS[key]}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
    svg += `<circle cx="${x(last.time)}" cy="${y(value(last, key))}" r="3" fill="${COLORS[key]}" stroke="#fffefa" stroke-width="1.5"/>`;
  }
  el.innerHTML = svg;
  return { maxTime, left, width: W - left - right, W };
}
export function phaseChart(el, history) {
  const W = 280, H = 155, left = 32, right = 11, top = 7, bottom = 29;
  const maxBlue = Math.ceil(Math.max(20, ...history.map(h => h.blue)) / 20) * 20;
  const maxRed = Math.ceil(Math.max(20, ...history.map(h => h.red)) / 10) * 10;
  const x = b => left + b / maxBlue * (W - left - right), y = r => H - bottom - r / maxRed * (H - bottom - top);
  let svg = '';
  for (let i = 0; i <= 4; i++) { const py = y(maxRed * i / 4), px = x(maxBlue * i / 4); svg += `<path d="M${left},${py}H${W - right}M${px},${top}V${H - bottom}" stroke="#ebeee1" stroke-width=".7" ${i ? 'stroke-dasharray="2 4"' : ''}/>`; if (i % 2 === 0) { svg += text(left - 7, py + 3, Math.round(maxRed * i / 4), 'text-anchor="end"'); svg += text(px, H - bottom + 13, Math.round(maxBlue * i / 4), 'text-anchor="middle"'); } }
  svg += text(156, H - 1, 'Blue blobs →', 'text-anchor="middle" fill="#88a9b2"');
  svg += `<text transform="translate(7,66) rotate(-90)" fill="#bf9c8b" font-size="8" font-family="DM Sans, sans-serif" text-anchor="middle">Red blobs →</text>`;
  const sample = history.filter((_, i) => i % Math.max(1, Math.floor(history.length / 240)) === 0 || i === history.length - 1);
  for (let i = 1; i < sample.length; i++) { const a = sample[i - 1], b = sample[i]; const opacity = .16 + i / sample.length * .54; svg += `<path d="M${x(a.blue)},${y(a.red)}L${x(b.blue)},${y(b.red)}" fill="none" stroke="#b1ad91" stroke-width="1.8" stroke-linecap="round" opacity="${opacity}"/>`; }
  const first = history[0], last = history.at(-1);
  svg += `<circle cx="${x(first.blue)}" cy="${y(first.red)}" r="2.6" fill="#fffefa" stroke="#c9c8ae" stroke-width="1.3"/>`;
  svg += `<circle cx="${x(last.blue)}" cy="${y(last.red)}" r="6" fill="#e5917130"/><circle cx="${x(last.blue)}" cy="${y(last.red)}" r="3" fill="#e59171" stroke="#fffefa" stroke-width="1"/>`;
  el.innerHTML = svg;
}

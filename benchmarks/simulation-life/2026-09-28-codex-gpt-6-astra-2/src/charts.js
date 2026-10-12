export const COLORS = { fruit: '#94ad6c', blue: '#75b7df', red: '#e3957c' };

export function timeline(history, visible = { fruit: true, blue: true, red: true }) {
  const w = 850, h = 170, left = 34, top = 12, right = 15, bottom = 30;
  const data = history.length > 600 ? history.filter((_, i) => i % Math.ceil(history.length / 600) === 0 || i === history.length - 1) : history;
  const endTime = Math.max(60, history.at(-1)?.time ?? 0);
  const all = data.flatMap(d => Object.keys(visible).filter(key => visible[key]).map(k => d[k]));
  const maximum = Math.max(20, Math.ceil(Math.max(0, ...all) / 20) * 20);
  const x = t => left + t / endTime * (w - left - right);
  const y = v => h - bottom - v / maximum * (h - top - bottom);
  let svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Recorded populations over time: fruit, blue blobs, and red blobs"><defs><linearGradient id="fruit-area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#aac284" stop-opacity=".12"/><stop offset="1" stop-color="#aac284" stop-opacity=".01"/></linearGradient></defs>`;
  for (let i = 0; i < 4; i++) {
    const v = maximum * i / 3;
    svg += `<line x1="${left}" x2="${w - right}" y1="${y(v)}" y2="${y(v)}" stroke="#ecede6" stroke-dasharray="3 5"/><text x="${left - 12}" y="${y(v) + 4}" text-anchor="end">${Math.round(v)}</text>`;
  }
  for (let i = 0; i <= 5; i++) {
    const t = endTime * i / 5;
    svg += `<text x="${x(t)}" y="${h - 8}" text-anchor="middle">${t >= 120 ? `${(t / 60).toFixed(1)}m` : `${Math.round(t)}s`}</text>`;
  }
  for (const kind of ['fruit', 'blue', 'red']) {
    if (!visible[kind] || !data.length) continue;
    const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.time).toFixed(2)},${y(d[kind]).toFixed(2)}`).join(' ');
    if (kind === 'fruit') svg += `<path d="${path} L${x(data.at(-1).time)},${y(0)} L${x(data[0].time)},${y(0)}Z" fill="url(#fruit-area)"/>`;
    svg += `<path d="${path}" fill="none" stroke="${COLORS[kind]}" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>`;
    svg += `<circle cx="${x(data.at(-1).time)}" cy="${y(data.at(-1)[kind])}" r="3.2" fill="${COLORS[kind]}" stroke="white" stroke-width="1.5"/>`;
  }
  return svg + '</svg>';
}

export function phasePlot(history) {
  const w = 850, h = 170, left = 40, top = 12, right = 20, bottom = 30;
  const maxBlue = Math.max(20, ...history.map(d => d.blue)) * 1.1;
  const maxRed = Math.max(10, ...history.map(d => d.red)) * 1.1;
  const x = v => left + v / maxBlue * (w - left - right);
  const y = v => h - bottom - v / maxRed * (h - top - bottom);
  let svg = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Phase plot: blue population on the horizontal axis, red population on the vertical axis">`;
  for (let i = 0; i < 5; i++) {
    const vx = maxBlue * i / 4, vy = maxRed * i / 4;
    svg += `<line x1="${x(vx)}" x2="${x(vx)}" y1="${top}" y2="${h - bottom}" stroke="#ecede6" stroke-dasharray="3 5"/><line x1="${left}" x2="${w - right}" y1="${y(vy)}" y2="${y(vy)}" stroke="#ecede6" stroke-dasharray="3 5"/><text x="${x(vx)}" y="${h - 15}" text-anchor="middle">${Math.round(vx)}</text><text x="${left - 12}" y="${y(vy) + 3}" text-anchor="end">${Math.round(vy)}</text>`;
  }
  svg += `<text x="${w / 2}" y="${h - 1}" text-anchor="middle" fill="${COLORS.blue}">Blue population →</text><text x="${left}" y="10" fill="${COLORS.red}">Red population</text>`;
  const path = history.map((d, i) => `${i ? 'L' : 'M'}${x(d.blue).toFixed(2)},${y(d.red).toFixed(2)}`).join(' ');
  svg += `<path d="${path}" fill="none" stroke="#b0b7a5" stroke-width="1.6" stroke-linejoin="round" opacity=".75"/>`;
  if (history.length) {
    const first = history[0], last = history.at(-1);
    svg += `<circle cx="${x(first.blue)}" cy="${y(first.red)}" r="4" fill="white" stroke="#b0b7a5"/><circle cx="${x(last.blue)}" cy="${y(last.red)}" r="5" fill="#729665" stroke="white" stroke-width="2"/>`;
  }
  return svg + '</svg>';
}

const colors = { fruit: '#94ae68', blue: '#5e9fb9', red: '#d18275' };

export class Charts {
  constructor(container, getGarden) {
    this.container = container;
    this.getGarden = getGarden;
    this.view = 'population';
    this.visible = { fruit: true, blue: true, red: true };
    container.addEventListener('pointermove', event => {
      const plot = container.querySelector('.plot');
      if (!plot || this.view !== 'population') return;
      const bounds = plot.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, ((event.clientX - bounds.left) / bounds.width * 800 - 37) / 747));
      const garden = getGarden();
      const history = garden.history;
      const time = history[0].time + fraction * (history.at(-1).time - history[0].time);
      const sample = history.reduce((nearest, item) => Math.abs(item.time - time) < Math.abs(nearest.time - time) ? item : nearest, history[0]);
      const tooltip = container.querySelector('.chart-tooltip');
      tooltip.hidden = false;
      tooltip.style.left = `${Math.min(bounds.width - 145, Math.max(0, event.clientX - bounds.left))}px`;
      tooltip.innerHTML = `<b>Day ${(sample.time / 12).toFixed(1)}</b><span><i class="dot fruit"></i>${sample.fruit} fruit</span><span><i class="dot blue"></i>${sample.blue} blue</span><span><i class="dot red"></i>${sample.red} red</span>`;
    });
    container.addEventListener('pointerleave', () => { const tooltip = container.querySelector('.chart-tooltip'); if (tooltip) tooltip.hidden = true; });
  }

  draw() {
    const garden = this.getGarden();
    const history = garden.history;
    const latest = history.at(-1);
    const chartHeight = 160;
    const top = 10;
    const bottom = 130;
    const left = 37;
    const right = 784;
    let markup = '';
    if (this.view === 'population') {
      const maximum = Math.max(20, ...history.flatMap(sample => Object.keys(this.visible).filter(key => this.visible[key]).map(key => sample[key])));
      const ceiling = Math.ceil(maximum / 20) * 20;
      const duration = Math.max(12, latest.time - history[0].time);
      const mapX = sample => left + (sample.time - history[0].time) / duration * (right - left);
      const mapY = value => bottom - value / ceiling * (bottom - top);
      for (let index = 0; index <= 4; index++) {
        const height = top + index * (bottom - top) / 4;
        markup += `<line x1="${left}" x2="${right}" y1="${height}" y2="${height}" stroke="#eeeee6" stroke-dasharray="3 4"/><text x="25" y="${height + 4}" text-anchor="end">${Math.round(ceiling * (1 - index / 4))}</text>`;
      }
      for (let index = 0; index <= 6; index++) {
        const position = left + index * (right - left) / 6;
        markup += `<text x="${position}" y="151" text-anchor="middle">${((history[0].time + duration * index / 6) / 12).toFixed(duration > 120 ? 0 : 1)}</text>`;
      }
      markup += '<defs><linearGradient id="fruit-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#aabd80" stop-opacity=".18"/><stop offset="100%" stop-color="#aabd80" stop-opacity=".01"/></linearGradient></defs>';
      for (const key of ['fruit', 'blue', 'red']) {
        if (!this.visible[key]) continue;
        const points = history.map(sample => `${mapX(sample).toFixed(2)},${mapY(sample[key]).toFixed(2)}`).join(' ');
        if (key === 'fruit' && history.length > 1) markup += `<polygon points="${left},${bottom} ${points} ${mapX(latest)},${bottom}" fill="url(#fruit-fill)"/>`;
        markup += `<polyline points="${points}" fill="none" stroke="${colors[key]}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${mapX(latest)}" cy="${mapY(latest[key])}" r="3.5" fill="${colors[key]}" stroke="white" stroke-width="1.5"/>`;
      }
    } else {
      const maxBlue = Math.max(10, ...history.map(sample => sample.blue)) * 1.12;
      const maxRed = Math.max(10, ...history.map(sample => sample.red)) * 1.12;
      for (let index = 0; index <= 4; index++) {
        const height = bottom - index * (bottom - top) / 4;
        const position = left + index * (right - left) / 4;
        markup += `<line x1="${left}" x2="${right}" y1="${height}" y2="${height}" stroke="#eeeee6" stroke-dasharray="3 4"/><text x="25" y="${height + 4}" text-anchor="end">${Math.round(maxRed * index / 4)}</text><text x="${position}" y="151" text-anchor="middle">${Math.round(maxBlue * index / 4)}</text>`;
      }
      const points = history.map(sample => `${left + sample.blue / maxBlue * (right - left)},${bottom - sample.red / maxRed * (bottom - top)}`).join(' ');
      markup += `<polyline points="${points}" fill="none" stroke="#82a696" stroke-width="2.2" opacity=".7"/><circle cx="${left + latest.blue / maxBlue * (right - left)}" cy="${bottom - latest.red / maxRed * (bottom - top)}" r="5" fill="#ce8378" stroke="white" stroke-width="2"/>`;
    }
    this.container.innerHTML = `<svg class="plot" viewBox="0 0 800 ${chartHeight}" role="img" aria-label="${this.view === 'population' ? 'Recorded fruit, blue and red populations over simulation days' : 'Blue population versus red population'}" preserveAspectRatio="none">${markup}</svg><div class="chart-tooltip" hidden></div>`;
  }
}

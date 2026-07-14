/*
 * charts.js — reads recorded history and tells the story.
 *
 *  • Main timeline: fruit, blue, red on ONE 0–100% axis, each indexed to its
 *    own peak (the honest way to show different units together — no dual axis).
 *    Fruit is an area, blue/red are lines: shape/texture carries identity too,
 *    not colour alone, so it survives colour-blind viewing.
 *  • Phase orbit: blue vs red, a fading trail that spirals as the cycle turns.
 *  • Story: a plain-language read of what actually happened.
 */
(function (global) {
  'use strict';
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  let C = { blue: '#4288e0', red: '#e85a54', green: '#20a869', ink: '#c9c7b6', ink3: '#8f8d7c', grid: '#34362a', surface: '#191a13' };
  function setTheme() {
    const s = getComputedStyle(document.documentElement);
    const g = (k, d) => (s.getPropertyValue(k).trim() || d);
    C = {
      blue: g('--c-blue', '#4288e0'), red: g('--c-red', '#e85a54'), green: g('--c-green', '#20a869'),
      ink: g('--ink-2', '#c9c7b6'), ink3: g('--ink-3', '#8f8d7c'),
      grid: g('--line', '#34362a'), surface: g('--chart-surface', '#191a13'),
    };
  }

  function fit(canvas) {
    const dpr = Math.min(2, global.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function niceMax(v) { return Math.max(1, v); }

  /* -------------------------------------------------- main timeline */
  function drawMain(canvas, hist, opts) {
    opts = opts || {};
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const n = hist.t.length;
    const padL = 30, padR = 52, padT = 8, padB = 18;
    const x0 = padL, x1 = w - padR, y0 = padT, y1 = h - padB;
    const plotW = x1 - x0, plotH = y1 - y0;

    // grid + % axis
    ctx.strokeStyle = C.grid; ctx.fillStyle = C.ink3; ctx.lineWidth = 1;
    ctx.font = '9px ui-monospace, monospace'; ctx.textBaseline = 'middle';
    for (const pc of [0, 50, 100]) {
      const y = y1 - (pc / 100) * plotH;
      ctx.globalAlpha = pc === 0 ? 0.9 : 0.5;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.textAlign = 'right';
      ctx.fillText(pc + '', x0 - 5, y);
    }

    canvas._layout = null;
    if (n < 2) return;

    const maxF = niceMax(Math.max(...hist.fruit));
    const maxB = niceMax(Math.max(...hist.blue));
    const maxR = niceMax(Math.max(...hist.red));
    const t0 = hist.t[0], tN = hist.t[n - 1], span = Math.max(1e-6, tN - t0);
    const sx = (i) => x0 + ((hist.t[i] - t0) / span) * plotW;
    const sy = (v, mx) => y1 - (v / mx) * plotH;

    // time ticks
    ctx.fillStyle = C.ink3; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const ticks = 4;
    for (let k = 0; k <= ticks; k++) {
      const tt = t0 + (span * k) / ticks;
      const x = x0 + (plotW * k) / ticks;
      ctx.fillText(Math.round(tt) + 's', x, y1 + 4);
    }

    // fruit as filled area (secondary encoding: area, not line)
    ctx.beginPath();
    ctx.moveTo(sx(0), y1);
    for (let i = 0; i < n; i++) ctx.lineTo(sx(i), sy(hist.fruit[i], maxF));
    ctx.lineTo(sx(n - 1), y1); ctx.closePath();
    const fg = ctx.createLinearGradient(0, y0, 0, y1);
    fg.addColorStop(0, hexA(C.green, 0.28)); fg.addColorStop(1, hexA(C.green, 0.02));
    ctx.fillStyle = fg; ctx.fill();
    line(ctx, hist.fruit, sx, sy, maxF, n, C.green, 1.6, 0.85);

    // blue + red as lines
    line(ctx, hist.blue, sx, sy, maxB, n, C.blue, 2.1, 1);
    line(ctx, hist.red, sx, sy, maxR, n, C.red, 2.1, 1);

    // end dots + direct labels
    endTag(ctx, sx(n-1), sy(hist.blue[n-1], maxB), C.blue, x1);
    endTag(ctx, sx(n-1), sy(hist.red[n-1], maxR), C.red, x1);
    endTag(ctx, sx(n-1), sy(hist.fruit[n-1], maxF), C.green, x1);

    // crosshair on hover
    if (opts.hoverIndex != null && opts.hoverIndex >= 0 && opts.hoverIndex < n) {
      const i = opts.hoverIndex, hx = sx(i);
      ctx.strokeStyle = hexA(C.ink, 0.4); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(hx, y0); ctx.lineTo(hx, y1); ctx.stroke(); ctx.setLineDash([]);
      dot(ctx, hx, sy(hist.fruit[i], maxF), C.green);
      dot(ctx, hx, sy(hist.blue[i], maxB), C.blue);
      dot(ctx, hx, sy(hist.red[i], maxR), C.red);
    }

    canvas._layout = { x0, x1, t0, span, plotW, n, maxF, maxB, maxR };
  }
  function line(ctx, arr, sx, sy, mx, n, color, lw, alpha) {
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = sx(i), y = sy(arr[i], mx); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.globalAlpha = alpha; ctx.lineJoin = 'round';
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  function endTag(ctx, x, y, color, x1) {
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.2832); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
    ctx.moveTo(x + 3, y); ctx.lineTo(x1 + 4, y); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function dot(ctx, x, y, c) { ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 6.2832); ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.stroke(); }

  function mainLegend(el, hist) {
    const n = hist.t.length; if (!n) { el.innerHTML = ''; return; }
    const cur = (a) => a[n - 1];
    const peak = (a) => Math.max(...a);
    el.innerHTML = [
      ['Fruit', C.green, Math.round(cur(hist.fruit)), Math.round(peak(hist.fruit))],
      ['Blue', C.blue, cur(hist.blue), peak(hist.blue)],
      ['Red', C.red, cur(hist.red), peak(hist.red)],
    ].map(([nm, c, v, pk]) =>
      `<span class="cl"><span class="ln" style="background:${c}"></span>${nm} <b>${v}</b> <span style="color:var(--ink-3)">/ ${pk}</span></span>`
    ).join('');
  }

  /* -------------------------------------------------- phase orbit */
  function drawPhase(canvas, hist) {
    const { ctx, w, h } = fit(canvas);
    ctx.clearRect(0, 0, w, h);
    const pad = 26, x0 = pad, x1 = w - 10, y0 = 8, y1 = h - pad;
    const n = hist.t.length;
    const maxB = niceMax(Math.max(...hist.blue) * 1.05);
    const maxR = niceMax(Math.max(...hist.red) * 1.05);
    // axes
    ctx.strokeStyle = C.grid; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.fillStyle = C.ink3; ctx.font = '9px ui-monospace, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = C.blue; ctx.fillText('blue →', (x0 + x1) / 2, y1 + 8);
    ctx.save(); ctx.translate(x0 - 18, (y0 + y1) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.red; ctx.textBaseline = 'middle'; ctx.fillText('red →', 0, 0); ctx.restore();
    if (n < 2) return;
    const px = (b) => x0 + (b / maxB) * (x1 - x0);
    const py = (r) => y1 - (r / maxR) * (y1 - y0);
    // trail with fading alpha (recent brighter)
    const start = Math.max(0, n - 600);
    for (let i = start + 1; i < n; i++) {
      const a = (i - start) / (n - start);
      ctx.strokeStyle = hexA(C.ink, 0.08 + a * 0.5);
      ctx.lineWidth = 0.6 + a * 1.6;
      ctx.beginPath(); ctx.moveTo(px(hist.blue[i-1]), py(hist.red[i-1])); ctx.lineTo(px(hist.blue[i]), py(hist.red[i])); ctx.stroke();
    }
    // current point
    const cxp = px(hist.blue[n-1]), cyp = py(hist.red[n-1]);
    const g = ctx.createRadialGradient(cxp, cyp, 0, cxp, cyp, 10);
    g.addColorStop(0, hexA(C.ink, 0.5)); g.addColorStop(1, hexA(C.ink, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cxp, cyp, 10, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cxp, cyp, 3.4, 0, 6.2832); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.4; ctx.stroke();
  }

  /* -------------------------------------------------- story */
  function analyze(hist) {
    const n = hist.t.length;
    if (n < 3) return { headline: 'A fresh garden', icon: '🌱', bullets: ['Press play to let it live.'], stats: [] };
    const cur = (a) => a[n - 1];
    const peak = (a) => Math.max(...a);
    const blueNow = cur(hist.blue), redNow = cur(hist.red), fruitNow = cur(hist.fruit);
    const bp = peaks(hist.blue), rp = peaks(hist.red);
    const lag = leadLag(hist.blue, hist.red);
    const totB = sum(hist.births), totD = sum(hist.deaths);

    let headline, icon;
    const bullets = [];
    if (blueNow === 0 && redNow === 0) {
      headline = 'The dish fell quiet'; icon = '🍂';
      bullets.push('Both groups have died out and fruit is reclaiming the world.');
      bullets.push('Reset, or nudge fruit growth up before pressing play again.');
    } else if (redNow === 0 && blueNow > 0) {
      headline = 'The red blobs faded'; icon = '🔵';
      bullets.push('With too few blue blobs to tag, the red blobs ran out of energy.');
      bullets.push('The garden settled into a simpler world of blobs and fruit.');
    } else if (blueNow === 0 && redNow > 0) {
      headline = 'The blue blobs crashed'; icon = '🔴';
      bullets.push('Red blobs over-hunted the blue — now they have nothing left to tag.');
      bullets.push('Watch the red blobs fade next unless blue recovers.');
    } else if (peak(hist.fruit) < 30 && peak(hist.blue) < 26) {
      headline = 'A small, sparse garden'; icon = '🌾';
      bullets.push('Low fruit keeps the whole garden small — few blobs, gentle numbers.');
      bullets.push(`Fruit is hovering near ${Math.round(avgTail(hist.fruit))}.`);
    } else if (bp >= 3 && rp >= 2) {
      headline = 'Rising and falling in waves'; icon = '🌊';
      if (lag > 1) bullets.push(`Blue blobs peak first; red blobs follow about ${(lag).toFixed(0)}s later.`);
      else bullets.push('Blue and red are trading the lead as the cycle turns.');
      bullets.push('More fruit feeds blue, more blue feeds red, and round it goes.');
    } else {
      headline = 'Finding its rhythm'; icon = '🌿';
      bullets.push('The three groups are settling into their push-and-pull.');
    }

    // trait note
    const spTrendB = trend(hist.blueSpeed), spTrendR = trend(hist.redSpeed);
    if (Math.abs(spTrendB) > 0.03) bullets.push(`Blue blobs are evolving ${spTrendB > 0 ? 'faster' : 'more sluggish'} over generations.`);
    else if (Math.abs(spTrendR) > 0.03) bullets.push(`Red blobs are evolving ${spTrendR > 0 ? 'faster' : 'more sluggish'} over generations.`);

    const stats = [
      ['peak blue', peak(hist.blue)], ['peak red', peak(hist.red)],
      ['peak fruit', Math.round(peak(hist.fruit))],
      ['blue waves', bp], ['red waves', rp],
      ['births', totB], ['deaths', totD],
    ];
    return { headline, icon, bullets, stats };
  }

  function renderSummary(el, hist) {
    const a = analyze(hist);
    const stat = a.stats.map(([k, v]) => `<span class="mini">${k} <b>${v}</b></span>`).join('');
    el.innerHTML =
      `<div class="headline"><span class="ic">${a.icon}</span> ${a.headline}</div>` +
      `<ul>${a.bullets.map((b) => `<li>${b}</li>`).join('')}</ul>` +
      `<div class="stat-row">${stat}</div>`;
  }

  /* -------------------------------------------------- analysis helpers */
  function peaks(arr, mp) {
    if (arr.length < 5) return 0;
    mp = mp || Math.max(3, Math.max(...arr) * 0.14);
    const s = arr.map((_, i) => { let x = 0, c = 0; for (let k = -2; k <= 2; k++) { const j = i + k; if (j >= 0 && j < arr.length) { x += arr[j]; c++; } } return x / c; });
    let p = 0, lm = s[0], ri = true;
    for (let i = 1; i < s.length; i++) {
      if (ri) { if (s[i] < s[i-1]) { if (s[i-1] - lm > mp) p++; ri = false; lm = s[i-1]; } }
      else { if (s[i] < lm) lm = s[i]; if (s[i] > s[i-1]) ri = true; }
    }
    return p;
  }
  function leadLag(a, b) {
    const n = a.length, half = Math.floor(n / 2);
    const A = a.slice(half), B = b.slice(half);
    const norm = (x) => { const m = x.reduce((s, v) => s + v, 0) / x.length; return x.map((v) => v - m); };
    const na = norm(A), nb = norm(B);
    let best = 0, bc = -Infinity;
    for (let lag = 0; lag <= 40; lag++) {
      let c = 0, cnt = 0;
      for (let i = 0; i < na.length; i++) { const j = i + lag; if (j < nb.length) { c += na[i] * nb[j]; cnt++; } }
      c /= (cnt || 1); if (c > bc) { bc = c; best = lag; }
    }
    return best * 0.5; // samples -> seconds
  }
  function sum(a) { let s = 0; for (const v of a) s += v; return s; }
  function avgTail(a) { const t = a.slice(-20); return t.reduce((s, v) => s + v, 0) / (t.length || 1); }
  function trend(a) { if (a.length < 20) return 0; const t = a.slice(-Math.min(120, a.length)); return (t[t.length-1] - t[0]); }

  function hexA(hexColor, a) {
    let s = hexColor.trim();
    if (s.startsWith('rgb')) return s.replace(')', `, ${a})`).replace('rgb', 'rgba');
    if (s[0] === '#') { const n = parseInt(s.slice(1), 16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }
    return s;
  }

  global.GardenCharts = { setTheme, drawMain, drawPhase, mainLegend, renderSummary, analyze };
})(typeof window !== 'undefined' ? window : globalThis);

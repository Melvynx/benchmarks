/*
 * app.js — wires the simulation, the dish renderer and the charts together,
 * and hands the controls to the user.
 */
(function () {
  'use strict';
  const { createSimulation, PRESETS, PARAM_META, DEFAULTS } = window.GardenSim;
  const $ = (s) => document.querySelector(s);
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

  const sim = createSimulation({});
  const canvas = $('#world');
  const renderer = window.GardenRenderer.createRenderer(canvas, sim);
  window.GardenCharts.setTheme();

  let playing = false;
  let currentPreset = 'balanced';
  let lastNow = performance.now() / 1000;
  let chartAccum = 0, sumAccum = 0;
  let hoverIndex = null;

  /* ---------------------------------------------------------- controls */
  const GROUPS = { Fruit: 'grp-fruit', Blue: 'grp-blue', Red: 'grp-red', World: 'grp-world' };
  const GROUP_DOT = { Fruit: 'var(--green)', Blue: 'var(--blue)', Red: 'var(--red)', World: 'var(--ink-3)' };
  const inputs = {};

  function fmt(p, v) {
    if (p.key === 'simSpeed') return v + '×';
    if (p.step >= 1) return String(Math.round(v));
    return (Math.round(v / p.step) * p.step).toFixed(String(p.step).split('.')[1]?.length || 1);
  }

  function buildControls() {
    const host = $('#controlGroups');
    host.innerHTML = '';
    for (const gName of Object.keys(GROUPS)) {
      const items = PARAM_META.filter((p) => p.group === gName);
      const sec = document.createElement('div');
      sec.className = 'side-section';
      sec.innerHTML = `<h2><span class="gdot" style="background:${GROUP_DOT[gName]}"></span>${gName}</h2>`;
      for (const p of items) {
        const wrap = document.createElement('div');
        wrap.className = 'ctrl ' + GROUPS[gName] + (p.live ? '' : ' structural');
        wrap.innerHTML =
          `<div class="crow"><label data-hint="${p.hint}">${p.label}</label>` +
          `<span class="cval"><span class="v">${fmt(p, sim.config[p.key])}</span><span class="u">${p.unit}</span></span></div>` +
          `<input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${sim.config[p.key]}">`;
        const input = wrap.querySelector('input');
        const valEl = wrap.querySelector('.v');
        inputs[p.key] = { input, valEl, p };
        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          valEl.textContent = fmt(p, v);
          if (p.live) { sim.config[p.key] = v; markCustom(); if (!playing) softRedraw(); }
          else { markCustom(); }
        });
        input.addEventListener('change', () => {
          const v = parseFloat(input.value);
          if (!p.live) { sim.config[p.key] = v; doReset(); }
        });
        // tooltip
        const label = wrap.querySelector('label');
        label.addEventListener('mouseenter', (e) => showTip(e, p.hint));
        label.addEventListener('mousemove', moveTip);
        label.addEventListener('mouseleave', hideTip);
        sec.appendChild(wrap);
      }
      host.appendChild(sec);
    }
  }

  function syncControls() {
    for (const key in inputs) {
      const { input, valEl, p } = inputs[key];
      input.value = sim.config[key];
      valEl.textContent = fmt(p, sim.config[key]);
    }
  }

  /* ---------------------------------------------------------- presets */
  function buildPresets() {
    const bar = $('#presetBar'), list = $('#presetList');
    bar.innerHTML = ''; list.innerHTML = '';
    for (const key of Object.keys(PRESETS)) {
      const pr = PRESETS[key];
      const b = document.createElement('button');
      b.className = 'pbtn'; b.textContent = pr.label; b.dataset.key = key;
      b.addEventListener('click', () => applyPreset(key));
      bar.appendChild(b);

      const c = document.createElement('button');
      c.className = 'pl'; c.dataset.key = key;
      c.innerHTML = `<div class="nm">${pr.label}</div><div class="bl">${pr.blurb}</div>`;
      c.addEventListener('click', () => applyPreset(key));
      list.appendChild(c);
    }
  }

  function applyPreset(key) {
    const pr = PRESETS[key];
    Object.assign(sim.config, DEFAULTS, pr.config);
    currentPreset = key;
    syncControls();
    doReset();
    highlightPreset();
  }
  function highlightPreset() {
    document.querySelectorAll('.pbtn, .pl').forEach((b) => {
      b.classList.toggle('active', b.dataset.key === currentPreset);
    });
  }
  function markCustom() {
    if (currentPreset !== null) { currentPreset = null; highlightPreset(); }
  }

  /* ---------------------------------------------------------- transport */
  function setPlaying(v) {
    playing = v;
    renderer.state.playing = v;
    $('#playLbl').textContent = v ? 'Pause' : 'Play';
    $('#playIcon').innerHTML = v
      ? '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'
      : '<path d="M8 5v14l11-7z"/>';
    $('#pausedTag').style.display = v ? 'none' : '';
    lastNow = performance.now() / 1000;
  }
  function doReset() {
    sim.reset();
    renderer.recomputeScale();
    renderer.state.selectedId = null;
    hideInspect();
    hoverIndex = null;
    updateHud();
    drawCharts(true);
    softRedraw();
  }
  function doStep() {
    sim.stepOnce();
    renderer.spawnParticles(sim.drainEvents());
    updateHud(); drawCharts(true); softRedraw();
  }
  function randomize() {
    sim.config.seed = 1 + Math.floor(Math.random() * 99998);
    if (inputs.seed) { inputs.seed.input.value = sim.config.seed; inputs.seed.valEl.textContent = sim.config.seed; }
    markCustom();
    doReset();
  }
  function softRedraw() { renderer.draw(performance.now() / 1000, 0); }

  /* ---------------------------------------------------------- HUD + charts */
  function updateHud() {
    const c = sim.counts;
    $('#cFruit').textContent = Math.round(c.fruit);
    $('#cBlue').textContent = c.blue;
    $('#cRed').textContent = c.red;
    $('#clock').textContent = sim.time.toFixed(1) + ' s';
  }
  function drawCharts(force) {
    window.GardenCharts.drawMain($('#chartMain'), sim.history, { hoverIndex });
    window.GardenCharts.drawPhase($('#chartPhase'), sim.history);
    window.GardenCharts.mainLegend($('#mainLegend'), sim.history);
    if (force) window.GardenCharts.renderSummary($('#summary'), sim.history);
  }

  /* ---------------------------------------------------------- inspect */
  const ACTION = {
    seek: 'looking for fruit', wander: 'wandering', flee: 'fleeing a red!',
    eat: 'eating fruit', chase: 'chasing a blue', rest: 'resting after a tag', stun: 'startled',
  };
  function updateInspect() {
    const id = renderer.state.selectedId;
    if (id == null) return;
    const b = sim.findById(id);
    const el = $('#inspect');
    if (!b) { hideInspect(); return; }
    el.classList.add('show');
    const isBlue = b.kind === 'blue';
    const col = isBlue ? 'radial-gradient(circle at 35% 30%, #cfe7ff, #4aa3ff 60%, #2f6fc8)' : 'radial-gradient(circle at 35% 30%, #ffd6cd, #ff6f6a 60%, #df4d47)';
    $('#insBadge').style.background = col;
    $('#insTitle').textContent = isBlue ? 'Blue blob' : 'Red blob';
    $('#insSub').textContent = `#${b.id} · generation ${b.gen}` + (b.parentId ? ` · child of #${b.parentId}` : ' · founder');
    const age = sim.time - b.bornAt;
    const spd = (isBlue ? sim.config.blueSpeed : sim.config.redSpeed) * b.traits.speed;
    const vis = (isBlue ? sim.config.blueVision : sim.config.redVision) * b.traits.vision;
    const busy = (b.state === 'eat' || b.state === 'rest') ? b.stateTimer : 0;
    const eBar = clamp(b.energy / 100, 0, 1) * 100;
    const eCol = b.energy > 55 ? 'var(--green)' : b.energy > 25 ? '#e8b74a' : 'var(--red)';
    $('#insGrid').innerHTML = [
      cell('Energy', `${Math.round(b.energy)}`, `<div class="ins-bar"><span style="width:${eBar}%;background:${eCol}"></span></div>`),
      cell('Age', `${age.toFixed(0)}s`),
      cell('Speed', `${spd.toFixed(1)} u/s`),
      cell('Vision', `${vis.toFixed(1)} u`),
      cell('Trait · speed', `${b.traits.speed.toFixed(2)}×`),
      cell('Trait · ' + (isBlue ? 'vision' : 'strength'), `${(isBlue ? b.traits.vision : b.traits.str).toFixed(2)}×`),
    ].join('');
    const at = $('#insActionText');
    at.textContent = ACTION[b.state] || b.state;
    if (busy > 0.05) at.textContent += ` · ${busy.toFixed(1)}s left`;
  }
  function cell(k, v, extra) {
    return `<div class="ins-cell"><div class="k">${k}</div><div class="v">${v}</div>${extra || ''}</div>`;
  }
  function hideInspect() { $('#inspect').classList.remove('show'); renderer.state.selectedId = null; }
  $('#insClose').addEventListener('click', hideInspect);

  /* ---------------------------------------------------------- world interaction */
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, moved: false, yaw: renderer.cam.yaw, flat: renderer.cam.flatten };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      renderer.cam.yaw = drag.yaw + dx * 0.007;
      renderer.cam.flatten = clamp(drag.flat - dy * 0.0026, 0.4, 0.9);
      renderer.recomputeScale();
      canvas.classList.add('dragging');
      if (!playing) softRedraw();
    } else {
      const id = renderer.hitTest(e.clientX - r.left, e.clientY - r.top);
      renderer.state.hoverId = id;
      canvas.style.cursor = id != null ? 'pointer' : 'grab';
    }
  });
  canvas.addEventListener('pointerup', (e) => {
    canvas.classList.remove('dragging');
    if (drag && !drag.moved) {
      const r = canvas.getBoundingClientRect();
      const id = renderer.hitTest(e.clientX - r.left, e.clientY - r.top);
      renderer.state.selectedId = id;
      if (id == null) hideInspect(); else updateInspect();
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; canvas.classList.remove('dragging'); });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    renderer.cam.zoom = clamp(renderer.cam.zoom * (e.deltaY < 0 ? 1.08 : 0.925), 0.55, 2.4);
    renderer.recomputeScale();
    if (!playing) softRedraw();
  }, { passive: false });

  /* ---------------------------------------------------------- chart hover */
  const chartMain = $('#chartMain');
  chartMain.addEventListener('mousemove', (e) => {
    const lay = chartMain._layout; if (!lay) return;
    const r = chartMain.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const frac = clamp((mx - lay.x0) / (lay.x1 - lay.x0), 0, 1);
    const i = Math.round(frac * (lay.n - 1));
    hoverIndex = i;
    const h = sim.history;
    const tip = $('#mainTip');
    tip.innerHTML =
      `<div style="color:var(--ink-3);margin-bottom:3px">t = ${Math.round(h.t[i])}s</div>` +
      `<div class="cr"><span class="d" style="background:var(--c-green)"></span>fruit ${Math.round(h.fruit[i])}</div>` +
      `<div class="cr"><span class="d" style="background:var(--c-blue)"></span>blue ${h.blue[i]}</div>` +
      `<div class="cr"><span class="d" style="background:var(--c-red)"></span>red ${h.red[i]}</div>`;
    tip.classList.add('show');
    const wrapR = chartMain.parentElement.getBoundingClientRect();
    let tx = e.clientX - wrapR.left + 12;
    if (tx > wrapR.width - 96) tx = e.clientX - wrapR.left - 92;
    tip.style.left = tx + 'px';
    tip.style.top = (e.clientY - wrapR.top + 8) + 'px';
    if (!playing) drawCharts(false);
  });
  chartMain.addEventListener('mouseleave', () => { hoverIndex = null; $('#mainTip').classList.remove('show'); if (!playing) drawCharts(false); });

  /* ---------------------------------------------------------- tooltips */
  const tip = $('#tooltip');
  function showTip(e, text) { tip.textContent = text; tip.classList.add('show'); moveTip(e); }
  function moveTip(e) {
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x > innerWidth - 230) x = e.clientX - 226;
    tip.style.left = x + 'px'; tip.style.top = y + 'px';
  }
  function hideTip() { tip.classList.remove('show'); }

  /* ---------------------------------------------------------- theme */
  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    renderer.setTheme(next);
    window.GardenCharts.setTheme();
    $('#themeIcon').innerHTML = next === 'dark'
      ? '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
      : '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
    drawCharts(true); softRedraw();
  }

  /* ---------------------------------------------------------- buttons + keys */
  $('#btnPlay').addEventListener('click', () => setPlaying(!playing));
  $('#btnStep').addEventListener('click', () => { if (playing) setPlaying(false); doStep(); });
  $('#btnReset').addEventListener('click', doReset);
  $('#btnRandom').addEventListener('click', randomize);
  $('#btnTheme').addEventListener('click', toggleTheme);
  $('#speed').addEventListener('input', (e) => {
    sim.config.simSpeed = parseFloat(e.target.value);
    $('#speedVal').textContent = sim.config.simSpeed + '×';
    if (inputs.simSpeed) { inputs.simSpeed.input.value = sim.config.simSpeed; inputs.simSpeed.valEl.textContent = sim.config.simSpeed + '×'; }
  });
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'number') return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'r' || e.key === 'R') doReset();
    else if (e.key === 'd' || e.key === 'D') randomize();
    else if (e.key === 'ArrowRight') { if (playing) setPlaying(false); doStep(); }
    else if (e.key === 'Escape') hideInspect();
  });

  window.addEventListener('resize', () => { renderer.resize(); drawCharts(true); softRedraw(); });

  /* ---------------------------------------------------------- main loop */
  function frame() {
    const now = performance.now() / 1000;
    let dt = now - lastNow; lastNow = now;
    dt = clamp(dt, 0, 0.05);
    if (playing) {
      sim.advance(dt);
      renderer.spawnParticles(sim.drainEvents());
    }
    renderer.draw(now, dt);
    if (renderer.state.selectedId != null) updateInspect();

    chartAccum += dt; sumAccum += dt;
    if (playing && chartAccum > 0.12) { chartAccum = 0; updateHud(); drawCharts(false); }
    if (playing && sumAccum > 0.7) { sumAccum = 0; window.GardenCharts.renderSummary($('#summary'), sim.history); }
    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------------- boot */
  buildControls();
  buildPresets();
  highlightPreset();
  renderer.resize();
  updateHud();
  drawCharts(true);
  $('#speedVal').textContent = sim.config.simSpeed + '×';
  requestAnimationFrame(frame);
  // gentle auto-start so the garden is alive on arrival
  setTimeout(() => setPlaying(true), 400);

  // handle for debugging / automated checks
  window.__garden = { sim, renderer, applyPreset, doReset, setPlaying, get playing() { return playing; } };
})();

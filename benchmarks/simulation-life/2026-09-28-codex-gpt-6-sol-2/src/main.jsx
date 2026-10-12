import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { defaults, Garden, presets } from './simulation.js';
import { renderWorld } from './renderWorld.js';
import './styles.css';

const groups = {
  fruit: { color: '#91b956', label: 'Fruit' },
  blue: { color: '#648ee9', label: 'Blue blobs' },
  red: { color: '#e77975', label: 'Red blobs' },
};

const controls = [
  { title: 'The garden', icon: '✿', items: [
    ['fruitGrowth', 'Fruit growth speed', .2, 2.5, .05, '×'],
    ['fruitLimit', 'Fruit limit per tree', 1, 9, 1, ''],
    ['fruitDelay', 'Fruit return delay', 2, 26, 1, 's'],
  ] },
  { title: 'Blue blobs', icon: '●', tone: 'blue', items: [
    ['blueUse', 'Energy use', .8, 5, .05, '/s'],
    ['blueSpeed', 'Move speed', 5, 24, .5, ''],
    ['blueVision', 'Sensing range', 10, 48, 1, ''],
    ['blueCopy', 'Copy threshold', 80, 150, 1, ''],
    ['blueEatTime', 'Eating time', .3, 4, .05, 's'],
  ] },
  { title: 'Red blobs', icon: '●', tone: 'red', items: [
    ['redUse', 'Energy use', 1, 5.5, .05, '/s'],
    ['redSpeed', 'Move speed', 5, 25, .5, ''],
    ['redVision', 'Sensing range', 10, 52, 1, ''],
    ['redStrength', 'Contact strength', 12, 46, 1, ''],
    ['redCopy', 'Copy threshold', 82, 150, 1, ''],
    ['redPause', 'Pause after contact', .5, 6, .1, 's'],
  ] },
  { title: 'Starting world', icon: '◇', items: [
    ['startTrees', 'Fruit trees', 3, 26, 1, ''],
    ['startBlue', 'Blue blobs', 2, 35, 1, ''],
    ['startRed', 'Red blobs', 0, 20, 1, ''],
    ['worldSize', 'World size', 35, 75, 1, ''],
  ] },
];

function Icon({ name, size = 18 }) {
  const paths = {
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    pause: <><path d="M8 5v14M16 5v14" /></>,
    step: <><path d="m5 5 9 7-9 7V5ZM18 5v14" /></>,
    reset: <><path d="M4 11a8 8 0 1 1 2.4 6M4 5v6h6" /></>,
    shuffle: <><path d="M3 6h2c5 0 7 12 12 12h4M18 15l3 3-3 3M3 18h2c2.3 0 4-2.5 5.3-5M14 8c.9-1.2 1.9-2 3-2h4M18 3l3 3-3 3" /></>,
    rotate: <><path d="M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M18 3v4h-4M6 21v-4h4" /></>,
    close: <path d="M5 5 19 19M19 5 5 19" />,
    spark: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2ZM19 17l.7 1.3L21 19l-1.3.7L19 21l-.7-1.3L17 19l1.3-.7L19 17Z" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function formatValue(value, suffix) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return `${rounded}${suffix}`;
}

function Slider({ item, value, onChange }) {
  const [key, label, min, max, step, suffix] = item;
  const progress = (value - min) / (max - min) * 100;
  return <label className="slider-row">
    <span className="slider-top"><span>{label}</span><strong>{formatValue(value, suffix)}</strong></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(key, Number(event.target.value))} style={{ '--progress': `${progress}%` }} />
  </label>;
}

function Chart({ history, counts }) {
  const [hover, setHover] = useState(null);
  const data = history.length > 1 ? history : [history[0], { time: history[0].time + 1, ...counts }];
  const width = 880, height = 225, left = 44, right = 42, top = 18, bottom = 29;
  const plotW = width - left - right, plotH = height - top - bottom;
  const start = data[0].time, end = Math.max(start + 1, data[data.length - 1].time);
  const popMax = Math.max(10, ...data.map(d => Math.max(d.blue, d.red)));
  const fruitMax = Math.max(10, ...data.map(d => d.fruit));
  const populationCeiling = Math.ceil(popMax / 5) * 5;
  const fruitCeiling = Math.ceil(fruitMax / 10) * 10;
  const px = time => left + (time - start) / (end - start) * plotW;
  const py = (value, ceiling) => top + plotH - value / ceiling * plotH;
  const path = (key, ceiling) => data.map((d, i) => `${i ? 'L' : 'M'}${px(d.time).toFixed(1)},${py(d[key], ceiling).toFixed(1)}`).join(' ');
  const hoverIndex = hover == null ? null : Math.max(0, Math.min(data.length - 1, Math.round(hover * (data.length - 1))));
  const hovered = hoverIndex == null ? null : data[hoverIndex];
  return <div className="chart-wrap">
    <div className="chart-legend">
      {Object.entries(groups).map(([key, group]) => <div className="legend-item" key={key}><i style={{ background: group.color }} /><span>{group.label}</span><strong>{counts[key]}</strong></div>)}
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} className="timeline-chart" role="img" aria-label="Fruit, blue blob, and red blob populations over simulation time">
      {[0, .25, .5, .75, 1].map(n => <g key={n}>
        <line x1={left} x2={width - right} y1={top + plotH * n} y2={top + plotH * n} className="grid-line" />
        <text x={left - 10} y={top + plotH * n + 4} textAnchor="end" className="axis-text">{Math.round(populationCeiling * (1 - n))}</text>
        <text x={width - right + 9} y={top + plotH * n + 4} className="axis-text fruit-axis">{Math.round(fruitCeiling * (1 - n))}</text>
      </g>)}
      {[0, .25, .5, .75, 1].map(n => <text key={n} x={left + plotW * n} y={height - 6} textAnchor={n === 0 ? 'start' : n === 1 ? 'end' : 'middle'} className="axis-text">{Math.round(start + (end - start) * n)}s</text>)}
      <path d={path('fruit', fruitCeiling)} fill="none" stroke={groups.fruit.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path('blue', populationCeiling)} fill="none" stroke={groups.blue.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={path('red', populationCeiling)} fill="none" stroke={groups.red.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      {hovered && <g>
        <line x1={px(hovered.time)} x2={px(hovered.time)} y1={top} y2={top + plotH} stroke="#9ca797" strokeDasharray="4 4" />
        {Object.entries(groups).map(([key, group]) => <circle key={key} cx={px(hovered.time)} cy={py(hovered[key], key === 'fruit' ? fruitCeiling : populationCeiling)} r="5" fill={group.color} stroke="white" strokeWidth="2" />)}
      </g>}
      <rect x={left} y={top} width={plotW} height={plotH} fill="transparent" onPointerMove={event => {
        const box = event.currentTarget.getBoundingClientRect();
        setHover(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)));
      }} onPointerLeave={() => setHover(null)} />
    </svg>
    <div className="chart-foot"><span>Blue + red use the left scale · Fruit uses the right scale</span>{hovered && <strong>{Math.round(hovered.time)}s · {hovered.fruit} fruit · {hovered.blue} blue · {hovered.red} red</strong>}</div>
  </div>;
}

function PhasePlot({ history }) {
  const data = history.length > 1 ? history : [history[0]];
  const maxBlue = Math.max(8, ...data.map(d => d.blue));
  const maxRed = Math.max(5, ...data.map(d => d.red));
  const x = d => 25 + d.blue / maxBlue * 205;
  const y = d => 136 - d.red / maxRed * 112;
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(d).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  return <svg className="phase-chart" viewBox="0 0 255 158" role="img" aria-label="Blue versus red blob phase plot">
    {[0, 1, 2, 3].map(i => <g key={i}><line x1={25 + i * 205 / 3} x2={25 + i * 205 / 3} y1="20" y2="136" className="grid-line" /><line x1="25" x2="230" y1={24 + i * 112 / 3} y2={24 + i * 112 / 3} className="grid-line" /></g>)}
    <path d={path} fill="none" stroke="#9089b9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity=".7" />
    <circle cx={x(last)} cy={y(last)} r="5.5" fill="#e77c76" stroke="white" strokeWidth="2" />
    <text x="128" y="155" textAnchor="middle" className="axis-text">Blue blobs →</text>
    <text x="6" y="84" transform="rotate(-90 6 84)" textAnchor="middle" className="axis-text">Red blobs →</text>
  </svg>;
}

function getStory(garden) {
  const data = garden.history;
  const now = garden.counts();
  if (garden.time < 12) return { title: 'The story is just beginning', body: 'Press play and watch fruit draw the blue blobs around the trees. Red blobs follow wherever blue blobs gather.' };
  if (!now.blue && !now.red) return { title: 'The garden is quiet now', body: 'Both blob groups faded away. Fruit keeps growing on the trees; try a gentler preset and start again.' };
  if (!now.blue) return { title: 'Blue blobs faded first', body: 'With no blue blobs to meet, the red group is living on its stored energy. It will fade unless the garden starts anew.' };
  if (!now.red) return { title: 'A blue garden remains', body: 'The red group faded. Blue blobs and fruit are finding their own rhythm around the trees.' };
  const half = data[Math.floor(data.length / 2)];
  const firstPeakBlue = data.reduce((best, d) => d.blue > best.blue ? d : best, data[0]);
  const firstPeakRed = data.reduce((best, d) => d.red > best.red ? d : best, data[0]);
  if (firstPeakRed.time > firstPeakBlue.time + 4 && firstPeakRed.red >= 4) return { title: 'Blue grew, then red followed', body: 'Fruit fed a blue rise. The red group followed later, drawing energy from close encounters.' };
  if (now.fruit < garden.trees.length && now.blue < garden.config.startBlue) return { title: 'Food is keeping things small', body: 'Ripe fruit is scarce, so blue growth is limited. Red blobs feel that shortage soon after.' };
  if (now.blue > half.blue * 1.25) return { title: 'Blue blobs are blooming', body: 'The trees are feeding new blue blobs. Watch whether red blobs catch up as encounters become more common.' };
  return { title: 'A lively little balance', body: 'Fruit, blue blobs, and red blobs are trading momentum. Their next turn depends on food and stored energy.' };
}

function App() {
  const [config, setConfig] = useState({ ...defaults });
  const [preset, setPreset] = useState('Balanced');
  const [playing, setPlaying] = useState(false);
  const [rotation, setRotation] = useState(-.22);
  const [selectedId, setSelectedId] = useState(null);
  const [version, setVersion] = useState(0);
  const canvasRef = useRef(null);
  const gardenRef = useRef(new Garden(defaults));
  const playingRef = useRef(false);
  const rotationRef = useRef(rotation);
  const selectedRef = useRef(null);
  const hitsRef = useRef([]);
  const pointerRef = useRef(null);
  const lastRef = useRef(0);
  const accumulatorRef = useRef(0);
  const updateRef = useRef(0);

  const garden = gardenRef.current;
  const counts = garden.counts();
  const selected = garden.blobs.find(blob => blob.id === selectedId);
  const story = getStory(garden);

  useEffect(() => {
    let frame;
    const loop = timestamp => {
      const dt = lastRef.current ? Math.min(.1, (timestamp - lastRef.current) / 1000) : 0;
      lastRef.current = timestamp;
      if (playingRef.current) {
        accumulatorRef.current += dt * gardenRef.current.config.speed;
        let steps = 0;
        while (accumulatorRef.current >= .08 && steps < 14) {
          gardenRef.current.step(.08);
          accumulatorRef.current -= .08;
          steps++;
        }
      }
      hitsRef.current = renderWorld(canvasRef.current, gardenRef.current, rotationRef.current, timestamp / 1000, selectedRef.current);
      if (timestamp - updateRef.current > 240) {
        updateRef.current = timestamp;
        setVersion(value => value + 1);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const change = (key, value) => {
    const next = { ...config, [key]: value };
    setConfig(next);
    gardenRef.current.setConfig(next);
    setPreset('Custom');
  };

  const restart = (next = config) => {
    gardenRef.current = new Garden(next);
    accumulatorRef.current = 0;
    playingRef.current = false;
    setPlaying(false);
    selectedRef.current = null;
    setSelectedId(null);
    setVersion(value => value + 1);
  };

  const choosePreset = name => {
    const next = { ...presets[name], seed: config.seed };
    setConfig(next);
    setPreset(name);
    restart(next);
  };

  const randomize = () => {
    const seed = Math.floor(Math.random() * 900000) + 100000;
    const next = { ...config, seed };
    setConfig(next);
    restart(next);
  };

  const togglePlay = () => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  };

  const step = () => {
    if (playingRef.current) { playingRef.current = false; setPlaying(false); }
    for (let i = 0; i < 13; i++) gardenRef.current.step(.08);
    gardenRef.current.record();
    setVersion(value => value + 1);
  };

  const pointerDown = event => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointerRef.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, moved: false };
  };
  const pointerMove = event => {
    if (!pointerRef.current) return;
    const pointer = pointerRef.current;
    if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > 4) pointer.moved = true;
    if (pointer.moved) {
      rotationRef.current += (event.clientX - pointer.lastX) * .009;
      setRotation(rotationRef.current);
    }
    pointer.lastX = event.clientX;
  };
  const pointerUp = event => {
    const pointer = pointerRef.current;
    pointerRef.current = null;
    if (!pointer || pointer.moved) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const hit = [...hitsRef.current].reverse().find(item => Math.hypot(item.x - x, item.y - y) < item.r);
    selectedRef.current = hit?.id ?? null;
    setSelectedId(selectedRef.current);
  };

  return <div className="app-shell">
    <header className="site-header">
      <div className="brand"><div className="brand-mark"><span className="brand-sprout">✿</span></div><div><h1>GPT-6</h1><p>A living little garden</p></div></div>
      <div className="header-right"><span className="header-dot" /><span>ECOSYSTEM PLAYGROUND</span><span className="header-divider" /><span>EST. RIGHT NOW</span></div>
    </header>

    <main>
      <section className="intro"><div><div className="eyebrow"><span>✦</span> GROW • WANDER • REPEAT</div><h2>Life finds a <em>little</em> way.</h2><p>Give the garden a nudge, then watch its tiny residents make the rest of the story.</p></div><div className="intro-sticker"><span>✿</span><strong>100%<br />living</strong><small>no scripted waves</small></div></section>

      <div className="main-grid">
        <section className="world-card card">
          <div className="world-heading"><div><div className="section-kicker"><span className="status-light" /> THE TABLETOP WORLD</div><h3>Garden view <span className="world-subtitle">/ drag to spin</span></h3></div><div className="world-clock"><span className="clock-orbit">◌</span><strong>{Math.floor(garden.time / 60).toString().padStart(2, '0')}:{Math.floor(garden.time % 60).toString().padStart(2, '0')}</strong><small>garden time</small></div></div>
          <div className="world-stage">
            <canvas ref={canvasRef} aria-label="Interactive round garden. Drag to rotate; click a blob to inspect it." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { pointerRef.current = null; }} />
            <div className="stage-label stage-label-left"><Icon name="rotate" size={14} /> DRAG TO ROTATE</div>
            <div className="stage-label stage-label-right"><span className="tiny-click">↖</span> TAP A BLOB</div>
            {selected && <div className="inspect-card">
              <button className="inspect-close" onClick={() => { selectedRef.current = null; setSelectedId(null); }} aria-label="Close inspection"><Icon name="close" size={16} /></button>
              <div className="inspect-top"><span className={`inspect-avatar ${selected.group}`}>●</span><div><small>RESIDENT #{selected.id}</small><strong>{selected.group === 'blue' ? 'Blue blob' : 'Red blob'}</strong></div></div>
              <div className="energy-line"><span>Energy</span><strong>{Math.max(0, Math.round(selected.energy))} / 155</strong></div>
              <div className="energy-track"><i style={{ width: `${Math.max(0, selected.energy / 155 * 100)}%`, background: selected.group === 'blue' ? '#6c91e8' : '#e87e78' }} /></div>
              <dl><div><dt>Age</dt><dd>{Math.round(selected.age)}s</dd></div><div><dt>Doing</dt><dd>{selected.action}</dd></div><div><dt>Speed</dt><dd>{((selected.group === 'blue' ? config.blueSpeed : config.redSpeed) * selected.speedTrait).toFixed(1)}</dd></div><div><dt>Sensing</dt><dd>{Math.round((selected.group === 'blue' ? config.blueVision : config.redVision) * selected.visionTrait)}</dd></div><div><dt>Action left</dt><dd>{selected.timer > 0 ? `${selected.timer.toFixed(1)}s` : '—'}</dd></div><div><dt>Family</dt><dd>Gen {selected.generation}{selected.parentId ? ` · #${selected.parentId}` : ''}</dd></div></dl>
            </div>}
          </div>
          <div className="world-footer"><div className="live-pill"><span className={playing ? 'pulse-dot' : 'sleep-dot'} />{playing ? 'GARDEN IS GROWING' : 'GARDEN IS PAUSED'}</div><span>Every fruit, move, and encounter changes the numbers.</span></div>
        </section>

        <aside className="control-card card"><div className="control-head"><div><div className="section-kicker">YOUR GARDEN, YOUR RULES</div><h3>Tune the world <span>✳</span></h3></div><div className="control-head-icon">⚙</div></div>
          <div className="control-scroll">
            <div className="control-section first-control"><div className="control-section-title"><span className="control-icon">✦</span><strong>Choose a starting mood</strong></div><div className="preset-wrap"><select aria-label="Garden preset" value={preset} onChange={event => choosePreset(event.target.value)}>{Object.keys(presets).map(name => <option key={name}>{name}</option>)}{preset === 'Custom' && <option>Custom</option>}</select><span>⌄</span></div><p className="preset-note">Presets begin a fresh world. Sliders change the world as it runs.</p></div>
            <div className="control-section transport-section"><div className="transport"><button className="primary-button" onClick={togglePlay}><Icon name={playing ? 'pause' : 'play'} size={18} />{playing ? 'Pause' : 'Play'}</button><button onClick={step} title="Advance one garden second" aria-label="Step one garden second"><Icon name="step" /></button><button onClick={() => restart()} title="Reset world" aria-label="Reset world"><Icon name="reset" /></button><button onClick={randomize} title="New random seed" aria-label="Randomize world"><Icon name="shuffle" /></button></div><div className="speed-row"><span>Simulation speed</span><div className="speed-buttons">{[.5, 1, 2, 4].map(value => <button key={value} className={config.speed === value ? 'active' : ''} onClick={() => change('speed', value)}>{value}×</button>)}</div></div></div>
            {controls.map(section => <div className={`control-section ${section.tone || ''}`} key={section.title}><div className="control-section-title"><span className="control-icon">{section.icon}</span><strong>{section.title}</strong></div>{section.items.map(item => <Slider key={item[0]} item={item} value={config[item[0]]} onChange={change} />)}</div>)}
            <div className="control-section seed-section"><div className="control-section-title"><span className="control-icon">#</span><strong>Random seed</strong></div><div className="seed-input-wrap"><input type="number" value={config.seed} onChange={event => change('seed', Number(event.target.value))} aria-label="Random seed" /><button onClick={() => restart()} title="Apply seed with a fresh world">Apply seed</button></div><p className="preset-note">Same seed + settings, same tiny beginning.</p></div>
          </div>
        </aside>
      </div>

      <section className="story-grid">
        <div className="history-card card"><div className="card-heading"><div><div className="section-kicker">THE STORY SO FAR</div><h3>Life in motion <span className="heading-flourish">〰</span></h3></div><span className="subtle-badge">LIVE HISTORY</span></div><Chart history={garden.history} counts={counts} /></div>
        <div className="insights-column"><div className="summary-card card"><div className="section-kicker">FIELD NOTES <span>✎</span></div><h3>{story.title}</h3><p>{story.body}</p><div className="summary-stats"><div><strong>{garden.events.fruitEaten}</strong><span>fruit eaten</span></div><div><strong>{garden.events.contacts}</strong><span>gentle contacts</span></div><div><strong>{garden.events.blueBorn + garden.events.redBorn}</strong><span>new little lives</span></div></div></div><div className="phase-card card"><div><div className="section-kicker">A DIFFERENT VIEW</div><h3>Their little dance</h3><p>Each turn traces blue against red.</p></div><PhasePlot history={garden.history} /></div></div>
      </section>
      <footer className="site-footer"><span>✿ &nbsp; Made for curious gardeners</span><span>A small world with real consequences.</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);

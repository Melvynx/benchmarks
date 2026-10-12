const canvas = document.querySelector('#pet-scene');
const ui = {
  bubble: document.querySelector('#pet-bubble'), bubbleText: document.querySelector('#bubble-text'),
  caption: document.querySelector('#pet-caption'), moodFace: document.querySelector('#mood-face'),
  moodTitle: document.querySelector('#mood-title'), moodSubtitle: document.querySelector('#mood-subtitle'),
  note: document.querySelector('#pet-note'), hunger: document.querySelector('#hunger-meter'),
  joy: document.querySelector('#joy-meter'), energy: document.querySelector('#energy-meter'),
  hungerScore: document.querySelector('#hunger-score'), joyScore: document.querySelector('#joy-score'), energyScore: document.querySelector('#energy-score'),
  hungerWord: document.querySelector('#hunger-word'), joyWord: document.querySelector('#joy-word'), energyWord: document.querySelector('#energy-word'),
  snackCount: document.querySelector('#snack-count'), feedButton: document.querySelector('#feed-button'),
  feedButtonText: document.querySelector('#feed-button-text'), bondLevel: document.querySelector('#bond-level'),
  bondNote: document.querySelector('#bond-note'), toast: document.querySelector('#toast'), sound: document.querySelector('#sound-toggle'),
};

const today = new Date().toLocaleDateString('en-CA');
const saved = JSON.parse(localStorage.getItem('cowdie-save') || 'null');
const state = saved?.date === today ? saved : {
  date: today, hunger: 46, joy: 78, energy: 84, snacks: 4, moments: 0,
  started: Date.now(), lastUpdated: Date.now(), sound: false,
};
if (saved?.date !== today && saved) state.started = saved.started || Date.now();
state.sound = false;
let selectedFood = 'clover';
let chewingUntil = 0;
let feedMotion = null;
let clickToastTimer;
let yaw = 0;
let yawTarget = 0;
let drag = null;
let tapCandidate = null;
let mouthOpen = 0;
let pettingUntil = 0;
let level = 2;
let lastTime = performance.now();

function saveState() {
  state.lastUpdated = Date.now();
  localStorage.setItem('cowdie-save', JSON.stringify(state));
}

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, Math.round(value)));
const moodWords = (value, words) => words.find(([limit]) => value < limit)?.[1] || words.at(-1)[1];
function updateUI() {
  state.hunger = clamp(state.hunger); state.joy = clamp(state.joy); state.energy = clamp(state.energy);
  const stats = [
    [state.hunger, ui.hunger, ui.hungerScore, ui.hungerWord, [[25, 'Very hungry'], [55, 'A little peckish'], [80, 'Nice and full'], [101, 'Tummy is happy']]],
    [state.joy, ui.joy, ui.joyScore, ui.joyWord, [[30, 'Could use a cuddle'], [55, 'A little quiet'], [80, 'Feeling pretty good'], [101, 'Over the moon']]],
    [state.energy, ui.energy, ui.energyScore, ui.energyWord, [[25, 'Ready for a nap'], [55, 'A bit sleepy'], [80, 'Ready to mosey'], [101, 'Bouncy & bright']]],
  ];
  for (const [value, meter, score, word, labels] of stats) {
    meter.style.width = `${value}%`; score.textContent = value; word.textContent = moodWords(value, labels);
  }
  ui.snackCount.textContent = state.snacks;
  ui.feedButton.disabled = state.snacks <= 0 || Boolean(feedMotion);
  ui.feedButtonText.textContent = state.snacks <= 0 ? 'All snacks enjoyed' : feedMotion ? 'On its way…' : 'Feed Cowdie';
  const derivedLevel = Math.min(5, 2 + Math.floor(state.moments / 4));
  if (derivedLevel > level) {
    level = derivedLevel;
    showToast(`A new little bond level! You’re Meadow friends, Lv. ${level} ✿`);
  } else level = derivedLevel;
  const title = ['New friend', 'Meadow friend', 'Clover pal', 'Best buds', 'Forever friends'][level - 1] || 'Meadow friend';
  ui.bondLevel.innerHTML = `${title} <span>·</span> Lv. ${level}`;
  ui.bondNote.textContent = level >= 5 ? 'You and Cowdie are inseparable' : `${4 - (state.moments % 4)} more happy ${4 - (state.moments % 4) === 1 ? 'moment' : 'moments'} to level up`;
  const day = Math.max(1, Math.floor((Date.now() - state.started) / 86_400_000) + 1);
  document.querySelector('#day-count').textContent = String(day).padStart(2, '0');
  const overall = (state.hunger + state.joy + state.energy) / 3;
  if (state.hunger < 25) {
    setMood('A rumbling little tummy', 'Maybe it’s snack time?', '☹', 'Cowdie is thinking about the snack basket.');
  } else if (overall > 82) {
    setMood('Feeling like a superstar', 'A very good day, thanks to you', '✿', 'Cowdie has a happy little skip in every step.');
  } else if (state.joy < 48) {
    setMood('Could use some company', 'A hello would mean a lot', '◡', 'Cowdie is happiest when you are nearby.');
  } else if (state.energy < 30) {
    setMood('Ready for a meadow nap', 'The sun feels just right', '☾', 'A quiet rest under the warm sun sounds lovely.');
  } else {
    setMood('Feeling mellow', 'A little attention goes a long way', '☺', 'Cowdie loves the clover patch. Maybe bring a little treat?');
  }
  saveState();
}

function setMood(title, subtitle, face, note) {
  ui.moodTitle.textContent = title; ui.moodSubtitle.textContent = subtitle;
  ui.moodFace.textContent = face; ui.note.textContent = note;
}

function showBubble(text, caption = text) {
  ui.bubbleText.textContent = text; ui.caption.textContent = caption;
  ui.bubble.classList.remove('is-pop');
  requestAnimationFrame(() => ui.bubble.classList.add('is-pop'));
}

function showToast(message) {
  ui.toast.textContent = message; ui.toast.classList.add('show');
  clearTimeout(clickToastTimer);
  clickToastTimer = setTimeout(() => ui.toast.classList.remove('show'), 2300);
}

function chime() {
  if (!state.sound) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const now = context.currentTime;
  [523.25, 659.25].forEach((frequency, index) => {
    const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, now + index * .09);
    gain.gain.exponentialRampToValueAtTime(.07, now + index * .09 + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, now + index * .09 + .28);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now + index * .09); oscillator.stop(now + index * .09 + .3);
  });
  setTimeout(() => context.close(), 650);
}

document.querySelectorAll('.food-option').forEach(button => {
  button.addEventListener('click', () => {
    selectedFood = button.dataset.food;
    document.querySelectorAll('.food-option').forEach(option => {
      const selected = option === button;
      option.classList.toggle('is-selected', selected);
      option.setAttribute('aria-checked', String(selected));
    });
  });
});

ui.feedButton.addEventListener('click', () => {
  if (state.snacks <= 0 || feedMotion) return;
  const bonuses = {
    clover: { hunger: 22, joy: 7, energy: 3, label: 'a crisp clover sprig', phrase: 'Mmm, garden fresh!' },
    apple: { hunger: 18, joy: 10, energy: 2, label: 'a sweet apple bite', phrase: 'Sweet little crunch!' },
    carrot: { hunger: 20, joy: 7, energy: 6, label: 'a crunchy carrot', phrase: 'Crunch, crunch, hooray!' },
    hay: { hunger: 14, joy: 5, energy: 9, label: 'a cozy hay puff', phrase: 'Soft and snacky!' },
  };
  const snack = bonuses[selectedFood];
  state.hunger += snack.hunger; state.joy += snack.joy; state.energy += snack.energy;
  state.snacks -= 1; state.moments += 1;
  feedMotion = { food: selectedFood, start: performance.now(), duration: 850 };
  chewingUntil = performance.now() + 2350;
  updateUI(); showBubble(`You brought ${snack.label}!`, 'A little treat, a lot of love'); chime();
  setTimeout(() => {
    if (performance.now() < chewingUntil) {
      showBubble(snack.phrase, 'Cowdie says thank you!');
      ui.moodFace.textContent = '♥'; ui.moodTitle.textContent = 'Snack-time bliss';
      ui.moodSubtitle.textContent = 'That was just right';
    }
  }, 900);
  setTimeout(() => { if (performance.now() >= chewingUntil) updateUI(); }, 2450);
});

ui.sound.addEventListener('click', () => {
  state.sound = !state.sound;
  ui.sound.setAttribute('aria-pressed', String(state.sound));
  ui.sound.querySelector('span').textContent = state.sound ? 'Sound on' : 'Sound off';
  showToast(state.sound ? 'A tiny meadow chime will play for snacks ♫' : 'Meadow sounds are off');
  if (state.sound) chime();
});

setInterval(() => {
  if (document.hidden) return;
  state.hunger -= 1; state.energy -= Math.random() < .45 ? 1 : 0;
  if (state.hunger < 45 && Math.random() < .4) state.joy -= 1;
  updateUI();
}, 60_000);

// A compact WebGL scene built from lit, shaded 3D geometry. It keeps the pet
// self-contained and lets the snack travel all the way to its mouth.
const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true });
if (!gl) {
  canvas.insertAdjacentHTML('afterend', '<div class="webgl-fallback">A little meadow is waiting for a browser with 3D graphics.</div>');
} else {
  const vertexSource = `#version 300 es
    in vec3 aPosition;
    in vec3 aNormal;
    uniform mat4 uProjectionView;
    uniform mat4 uModel;
    out vec3 vNormal;
    out vec3 vWorld;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vWorld = world.xyz;
      vNormal = transpose(inverse(mat3(uModel))) * aNormal;
      gl_Position = uProjectionView * world;
    }`;
  const fragmentSource = `#version 300 es
    precision highp float;
    in vec3 vNormal;
    in vec3 vWorld;
    uniform vec3 uColor;
    out vec4 color;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(vec3(-0.38, 0.82, 0.76));
      float diffuse = max(dot(n, light), 0.0);
      float fill = max(dot(n, normalize(vec3(0.75, 0.22, -0.55))), 0.0);
      vec3 viewDir = normalize(vec3(0.0, 2.1, 8.0) - vWorld);
      vec3 halfDir = normalize(light + viewDir);
      float specular = pow(max(dot(n, halfDir), 0.0), 36.0) * 0.18;
      float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 2.0) * 0.08;
      vec3 lit = uColor * (0.64 + diffuse * 0.34 + fill * 0.08) + vec3(specular + rim);
      color = vec4(lit, 1.0);
    }`;
  function shader(type, source) {
    const item = gl.createShader(type); gl.shaderSource(item, source); gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(item));
    return item;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const loc = {
    position: gl.getAttribLocation(program, 'aPosition'), normal: gl.getAttribLocation(program, 'aNormal'),
    pv: gl.getUniformLocation(program, 'uProjectionView'), model: gl.getUniformLocation(program, 'uModel'),
    color: gl.getUniformLocation(program, 'uColor'),
  };

  function sphereGeometry(rows = 18, columns = 24) {
    const vertices = [], normals = [], indices = [];
    for (let row = 0; row <= rows; row++) {
      const v = row / rows, phi = v * Math.PI;
      for (let column = 0; column <= columns; column++) {
        const u = column / columns, theta = u * Math.PI * 2;
        const x = Math.sin(phi) * Math.cos(theta), y = Math.cos(phi), z = Math.sin(phi) * Math.sin(theta);
        vertices.push(x, y, z); normals.push(x, y, z);
        if (row < rows && column < columns) {
          const a = row * (columns + 1) + column, b = a + columns + 1;
          indices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
    return makeMesh(vertices, normals, indices);
  }
  function cylinderGeometry(segments = 24, topRadius = 1, bottomRadius = 1) {
    const vertices = [], normals = [], indices = [];
    for (let yIndex = 0; yIndex <= 1; yIndex++) {
      const y = yIndex - .5, radius = yIndex ? topRadius : bottomRadius;
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2, x = Math.cos(angle), z = Math.sin(angle);
        vertices.push(x * radius, y, z * radius); normals.push(x, 0.2, z);
      }
    }
    for (let i = 0; i < segments; i++) {
      const a = i, b = i + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const baseCenter = vertices.length / 3; vertices.push(0, -.5, 0); normals.push(0, -1, 0);
    const topCenter = vertices.length / 3; vertices.push(0, .5, 0); normals.push(0, 1, 0);
    for (let i = 0; i < segments; i++) {
      indices.push(baseCenter, i, i + 1);
      const topA = segments + 1 + i, topB = topA + 1;
      indices.push(topCenter, topB, topA);
    }
    return makeMesh(vertices, normals, indices);
  }
  function coneGeometry(segments = 24) {
    const vertices = [], normals = [], indices = [];
    for (let i = 0; i <= segments; i++) {
      const angle = i / segments * Math.PI * 2, x = Math.cos(angle), z = Math.sin(angle);
      vertices.push(x * .5, -.5, z * .5, 0, .5, 0);
      const nx = x * .72, ny = .48, nz = z * .72;
      normals.push(nx, ny, nz, nx, ny, nz);
      if (i < segments) {
        const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const center = vertices.length / 3; vertices.push(0, -.5, 0); normals.push(0, -1, 0);
    for (let i = 0; i < segments; i++) indices.push(center, i * 2, i * 2 + 2);
    return makeMesh(vertices, normals, indices);
  }
  function makeMesh(vertices, normals, indices) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const positions = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, positions); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.position); gl.vertexAttribPointer(loc.position, 3, gl.FLOAT, false, 0, 0);
    const normalBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc.normal); gl.vertexAttribPointer(loc.normal, 3, gl.FLOAT, false, 0, 0);
    const element = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, element); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, count: indices.length };
  }
  const meshes = { sphere: sphereGeometry(), cylinder: cylinderGeometry(), cone: coneGeometry() };

  const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  function multiply(a, b) {
    const out = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
      out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3];
    }
    return out;
  }
  const translate = (x, y, z) => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
  const scale = (x, y, z) => new Float32Array([x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]);
  function rotateY(angle) { const c = Math.cos(angle), s = Math.sin(angle); return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]); }
  function rotateZ(angle) { const c = Math.cos(angle), s = Math.sin(angle); return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]); }
  function rotateX(angle) { const c = Math.cos(angle), s = Math.sin(angle); return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]); }
  function perspective(fov, aspect, near, far) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (near - far);
    return new Float32Array([f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]);
  }
  function lookAt(eye, center, up) {
    const normalize = v => { const length = Math.hypot(...v) || 1; return v.map(value => value / length); };
    const cross = (a,b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
    const subtract = (a,b) => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
    const z = normalize(subtract(eye, center)), x = normalize(cross(up, z)), y = cross(z, x);
    return new Float32Array([x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0, -x[0]*eye[0]-x[1]*eye[1]-x[2]*eye[2], -y[0]*eye[0]-y[1]*eye[1]-y[2]*eye[2], -z[0]*eye[0]-z[1]*eye[1]-z[2]*eye[2],1]);
  }
  const camera = lookAt([0, 3.15, 8.2], [0, 1.05, 0], [0, 1, 0]);
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
  gl.clearColor(0, 0, 0, 0);

  function draw(mesh, color, position, size, rotation = [0,0,0]) {
    let model = translate(...position);
    model = multiply(model, rotateY(rotation[1])); model = multiply(model, rotateX(rotation[0])); model = multiply(model, rotateZ(rotation[2]));
    model = multiply(model, scale(...size));
    gl.uniformMatrix4fv(loc.model, false, model);
    gl.uniform3fv(loc.color, color);
    gl.bindVertexArray(mesh.vao); gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
  }
  const C = {
    white: [0.97,0.94,0.85], cream: [0.96,0.88,0.69], black: [0.17,0.19,0.16], spot: [0.20,0.23,0.19],
    pink: [0.86,0.54,0.53], pinkLight: [0.98,0.72,0.67], hoof: [0.39,0.43,0.36],
    grass: [0.40,0.61,0.34], grassLight: [0.53,0.71,0.42], grassSide: [0.34,0.51,0.30],
    flower: [0.99,0.95,0.79], yellow: [0.91,0.69,0.31], stem: [0.35,0.57,0.34],
    leaf: [0.38,0.65,0.38], apple: [0.83,0.30,0.24], appleLight: [0.93,0.42,0.29],
    carrot: [0.91,0.47,0.22], hay: [0.79,0.63,0.31], shadow: [0.32,0.48,0.29],
  };

  function flower(x, z, size = 1) {
    draw(meshes.cylinder, C.stem, [x, .47 * size, z], [.035 * size, .5 * size, .035 * size], [0,0,-.08]);
    draw(meshes.sphere, C.leaf, [x + .10 * size, .42 * size, z], [.14 * size, .055 * size, .055 * size], [0,0,.36]);
    draw(meshes.sphere, C.leaf, [x - .1 * size, .32 * size, z], [.12 * size, .05 * size, .05 * size], [0,0,-.4]);
    for (let i = 0; i < 7; i++) {
      const angle = i / 7 * Math.PI * 2;
      draw(meshes.sphere, C.flower, [x + Math.cos(angle) * .12 * size, .94 * size, z + Math.sin(angle) * .12 * size], [.09 * size, .055 * size, .08 * size], [0,-angle,0]);
    }
    draw(meshes.sphere, C.yellow, [x, .95 * size, z], [.083 * size,.075 * size,.08 * size]);
  }

  function render(now) {
    const seconds = now / 1000;
    const dt = Math.min(.05, (now - lastTime) / 1000); lastTime = now;
    yaw += (yawTarget - yaw) * Math.min(1, dt * 5);
    if (feedMotion && now - feedMotion.start >= feedMotion.duration) {
      feedMotion = null;
      ui.feedButton.disabled = state.snacks <= 0;
      ui.feedButtonText.textContent = state.snacks <= 0 ? 'All snacks enjoyed' : 'Feed Cowdie';
    }
    const chewing = now < chewingUntil;
    mouthOpen += ((chewing ? .11 + Math.abs(Math.sin(now / 85)) * .12 : 0) - mouthOpen) * .24;
    const bob = Math.sin(seconds * 2.1) * .045 + (chewing ? Math.abs(Math.sin(seconds * 11)) * .045 : 0);
    const nod = chewing ? Math.sin(seconds * 12) * .07 : Math.sin(seconds * .75) * .025;
    const blinkPhase = seconds % 4.4;
    const blink = (blinkPhase > 3.95 && blinkPhase < 4.08) || (pettingUntil > now && blinkPhase > 1.0 && blinkPhase < 1.15);
    const aspect = canvas.width / canvas.height;
    const projection = perspective(37 * Math.PI / 180, aspect, .1, 60);
    const view = multiply(camera, rotateY(yaw));
    const projectionView = multiply(projection, view);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(loc.pv, false, projectionView);

    // Soft grounding and the little floating island.
    draw(meshes.sphere, C.shadow, [0, .13, 0], [2.35,.17,1.62]);
    draw(meshes.cylinder, C.grassSide, [0,.14,0], [2.34,.35,1.66]);
    draw(meshes.cylinder, C.grass, [0,.32,0], [2.31,.12,1.64]);
    draw(meshes.sphere, C.grassLight, [0,.38,0], [2.25,.075,1.58]);
    // Little tufts and flowers frame the pet.
    for (const [x,z,h] of [[-1.58,.42,.65],[-1.87,-.35,.57],[1.7,.36,.67],[1.86,-.37,.55],[-1.18,1.05,.56],[1.2,1.03,.62]]) {
      draw(meshes.cone, C.grassLight, [x,.56,z], [.16,h,.14], [0,0,(x < 0 ? -1 : 1)*.15]);
    }
    flower(-1.76,.95,.71); flower(1.7,.85,.74); flower(-1.95,-.5,.53); flower(1.95,-.58,.54);
    flower(-1.12,1.38,.5); flower(1.13,1.36,.52);

    const bodyY = 1.36 + bob;
    // Tail swishes behind the soft round body.
    const tailWag = Math.sin(seconds * 3.3) * .15;
    draw(meshes.cylinder, C.white, [-.78,1.52 + bob,-.28], [.075,.43,.075], [0,0,1.15 + tailWag]);
    draw(meshes.sphere, C.spot, [-.98,1.26 + bob,-.37], [.12,.17,.12], [0,0,-.65 + tailWag]);
    // Four stubby legs, with a subtle happy shuffle.
    for (const [x,z,phase] of [[-.56,-.29,0],[.56,-.29,2],[ -.56,.37,2],[.56,.37,0]]) {
      const step = chewing ? Math.sin(seconds * 11 + phase) * .045 : Math.sin(seconds * 1.1 + phase) * .012;
      draw(meshes.cylinder, C.white, [x, .76 + bob + step, z], [.19,.54,.19], [step * 1.4,0,0]);
      draw(meshes.sphere, C.hoof, [x,.48 + bob + step,z + .025], [.20,.11,.2]);
    }
    draw(meshes.sphere, C.white, [0,bodyY,0], [.97,.72,.66]);
    // Irregular little cow patches.
    draw(meshes.sphere, C.spot, [.47,1.54 + bob,.52], [.30,.36,.11], [0,0,-.38]);
    draw(meshes.sphere, C.black, [-.42,1.61 + bob,.47], [.21,.30,.095], [0,0,.24]);
    draw(meshes.sphere, C.spot, [.48,1.48 + bob,-.12], [.28,.31,.23], [0,.2,-.3]);
    // Head and little ears.
    const headX = Math.sin(seconds * .8) * .025;
    const headY = 2.26 + bob * .7;
    draw(meshes.sphere, C.white, [headX,headY,.17], [.65,.59,.52], [0,0,nod]);
    draw(meshes.sphere, C.white, [-.70 + headX,2.43 + bob * .7,.13], [.27,.13,.35], [0,-.1,-.45]);
    draw(meshes.sphere, C.pinkLight, [-.71 + headX,2.44 + bob * .7,.29], [.15,.055,.23], [0,-.1,-.45]);
    draw(meshes.sphere, C.white, [.70 + headX,2.43 + bob * .7,.13], [.27,.13,.35], [0,.1,.45]);
    draw(meshes.sphere, C.pinkLight, [.71 + headX,2.44 + bob * .7,.29], [.15,.055,.23], [0,.1,.45]);
    // Two tiny rounded horns.
    draw(meshes.cone, C.cream, [-.39 + headX,2.83 + bob * .7,.12], [.17,.27,.17], [0,0,-.16]);
    draw(meshes.cone, C.cream, [.39 + headX,2.83 + bob * .7,.12], [.17,.27,.17], [0,0,.16]);
    // A forehead spot makes this little cow easy to recognize.
    draw(meshes.sphere, C.spot, [.39 + headX,2.60 + bob * .7,.545], [.18,.21,.07], [0,0,-.55]);
    // Eyes, glints, nose, and an animated mouth.
    for (const x of [-.245,.245]) {
      draw(meshes.sphere, C.white, [x + headX,2.38 + bob * .7,.624], [.098,blink ? .018 : .126,.045]);
      if (!blink) {
        draw(meshes.sphere, C.black, [x + headX,2.38 + bob * .7,.661], [.061,.084,.032]);
        draw(meshes.sphere, C.white, [x - .018 + headX,2.414 + bob * .7,.687], [.023,.026,.015]);
      }
    }
    draw(meshes.sphere, C.pink, [headX,2.105 + bob * .7,.655], [.38,.235,.19]);
    draw(meshes.sphere, C.pinkLight, [headX,2.16 + bob * .7,.778], [.25,.115,.075]);
    for (const x of [-.14,.14]) draw(meshes.sphere, C.spot, [x + headX,2.13 + bob * .7,.837], [.038,.047,.024]);
    draw(meshes.sphere, C.spot, [headX,1.89 + bob * .7,.723], [.085,.025 + mouthOpen,.045 + mouthOpen*.3]);
    if (mouthOpen > .06) draw(meshes.sphere, C.pinkLight, [headX,1.855 + bob * .7,.768], [.047,.024,.025]);

    // The selected treat arcs into view, settles at Cowdie's nose, then vanishes.
    if (feedMotion) {
      const progress = Math.min(1, (now - feedMotion.start) / feedMotion.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const x = -2.1 * (1 - eased), y = 1.05 + Math.sin(progress * Math.PI) * .78 + eased * .87, z = 1.25 + eased * .2;
      drawFood(feedMotion.food, [x,y,z], .16 + Math.sin(progress * Math.PI) * .04, seconds + progress * 8);
    }
    requestAnimationFrame(render);
  }

  function drawFood(type, position, size, rotation = 0) {
    if (type === 'apple') {
      draw(meshes.sphere,C.apple,position,[size,size*.95,size*.84],[0,rotation*.08,0]);
      draw(meshes.cylinder,C.hay,[position[0],position[1]+size*.82,position[2]],[size*.11,size*.44,size*.11]);
      draw(meshes.sphere,C.leaf,[position[0]+size*.23,position[1]+size*.96,position[2]],[size*.28,size*.09,size*.13],[0,0,.42]);
    } else if (type === 'carrot') {
      draw(meshes.cone,C.carrot,[...position],[size*.85,size*2.2,size*.8],[Math.PI,0,rotation]);
      draw(meshes.sphere,C.leaf,[position[0]-.08,position[1]+size,position[2]],[size*.17,size*.47,size*.12],[0,0,-.35]);
    } else if (type === 'hay') {
      for (let i=0;i<4;i++) draw(meshes.sphere,C.hay,[position[0]+Math.cos(i*1.57)*size*.45,position[1]+Math.sin(i*1.57)*size*.32,position[2]+Math.sin(i*1.8)*size*.3],[size*.55,size*.38,size*.32],[0,0,i*.4]);
    } else {
      for (let i=0;i<3;i++) draw(meshes.sphere,C.leaf,[position[0]+Math.cos(i*2.09)*size*.42,position[1]+Math.sin(i*2.09)*size*.42,position[2]],[size*.48,size*.33,size*.17],[0,rotation,i*1.2]);
      draw(meshes.sphere,C.stem,[position[0],position[1],position[2]+size*.16],[size*.08,size*.09,size*.08]);
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect(); const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.floor(rect.width * dpr)), height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }
  new ResizeObserver(resize).observe(canvas); resize();
  canvas.addEventListener('pointerdown', event => {
    tapCandidate = { x: event.clientX, y: event.clientY, moved: false };
    drag = { x: event.clientX, yaw: yawTarget, pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 4) tapCandidate.moved = true;
    yawTarget = Math.max(-.48, Math.min(.48, drag.yaw + dx * .008));
  });
  canvas.addEventListener('pointerup', event => {
    if (tapCandidate && !tapCandidate.moved) {
      pettingUntil = performance.now() + 1800;
      state.joy += 4; state.moments += 1; updateUI(); showBubble('A lovely little pat!', 'Cowdie leans into your hand'); chime();
    }
    drag = null; tapCandidate = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; tapCandidate = null; });
  requestAnimationFrame(render);
}

updateUI();

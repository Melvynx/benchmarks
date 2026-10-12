const canvas = document.querySelector('.pet-canvas')
const ctx = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'low-power' })

const initial = { hunger: 72, joy: 84, energy: 67, clean: 91 }
let care = { ...initial }
try { care = { ...care, ...JSON.parse(localStorage.getItem('cowdie-care') || '{}') } } catch { /* use the fresh meadow */ }
let snacks = Number(localStorage.getItem('cowdie-snacks') ?? 3)
if (!Number.isFinite(snacks)) snacks = 3
let action = null
let soundOn = true
let audioContext = null
let yawDrag = -0.1
let dragging = false
let dragX = 0
let toastTimer

const clamp = (value) => Math.max(0, Math.min(100, value))
const shader = (type, source) => {
  const result = ctx.createShader(type)
  ctx.shaderSource(result, source)
  ctx.compileShader(result)
  if (!ctx.getShaderParameter(result, ctx.COMPILE_STATUS)) throw new Error(ctx.getShaderInfoLog(result))
  return result
}

if (ctx) {
  const program = ctx.createProgram()
  ctx.attachShader(program, shader(ctx.VERTEX_SHADER, `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec4 world = uModel * vec4(aPosition, 1.0);
      vPosition = world.xyz;
      vNormal = normalize(mat3(uModel) * aNormal);
      gl_Position = uProjection * uView * world;
    }
  `))
  ctx.attachShader(program, shader(ctx.FRAGMENT_SHADER, `
    precision mediump float;
    uniform vec3 uColor;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 light = normalize(vec3(-0.42, 0.82, 0.48));
      float diffuse = max(dot(n, light), 0.0);
      float soft = 0.67 + diffuse * 0.38;
      float rim = pow(1.0 - max(dot(n, normalize(vec3(0.0, 2.2, 7.0) - vPosition)), 0.0), 3.0) * 0.055;
      gl_FragColor = vec4(uColor * soft + rim, 1.0);
    }
  `))
  ctx.linkProgram(program)
  if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) throw new Error(ctx.getProgramInfoLog(program))
  ctx.useProgram(program)
  ctx.enable(ctx.DEPTH_TEST)
  ctx.enable(ctx.BLEND)
  ctx.blendFunc(ctx.SRC_ALPHA, ctx.ONE_MINUS_SRC_ALPHA)

  const attributes = { position: ctx.getAttribLocation(program, 'aPosition'), normal: ctx.getAttribLocation(program, 'aNormal') }
  const uniforms = { projection: ctx.getUniformLocation(program, 'uProjection'), view: ctx.getUniformLocation(program, 'uView'), model: ctx.getUniformLocation(program, 'uModel'), color: ctx.getUniformLocation(program, 'uColor') }
  const multiply = (a, b) => {
    const out = new Float32Array(16)
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
      out[column * 4 + row] = a[row] * b[column * 4] + a[4 + row] * b[column * 4 + 1] + a[8 + row] * b[column * 4 + 2] + a[12 + row] * b[column * 4 + 3]
    }
    return out
  }
  const identity = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const translate = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1])
  const scale = (x, y, z) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1])
  const rotateX = (a) => new Float32Array([1, 0, 0, 0, 0, Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1])
  const rotateY = (a) => new Float32Array([Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1])
  const rotateZ = (a) => new Float32Array([Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
  const perspective = (fov, aspect, near, far) => {
    const f = 1 / Math.tan(fov / 2)
    const out = new Float32Array(16)
    out[0] = f / aspect; out[5] = f; out[10] = (far + near) / (near - far); out[11] = -1; out[14] = (2 * far * near) / (near - far)
    return out
  }
  const normalize = (v) => { const length = Math.hypot(...v) || 1; return v.map((n) => n / length) }
  const subtract = (a, b) => a.map((n, i) => n - b[i])
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0)
  const lookAt = (eye, center, up) => {
    const z = normalize(subtract(eye, center)); const x = normalize(cross(up, z)); const y = cross(z, x)
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1])
  }
  const color = (hex) => {
    const value = Number.parseInt(hex.slice(1), 16)
    return [(value >> 16 & 255) / 255, (value >> 8 & 255) / 255, (value & 255) / 255]
  }

  function geometry(positions, normals, indices) {
    const positionBuffer = ctx.createBuffer(); ctx.bindBuffer(ctx.ARRAY_BUFFER, positionBuffer); ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(positions), ctx.STATIC_DRAW)
    const normalBuffer = ctx.createBuffer(); ctx.bindBuffer(ctx.ARRAY_BUFFER, normalBuffer); ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(normals), ctx.STATIC_DRAW)
    const indexBuffer = ctx.createBuffer(); ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, indexBuffer); ctx.bufferData(ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), ctx.STATIC_DRAW)
    return { positionBuffer, normalBuffer, indexBuffer, count: indices.length }
  }
  function sphereGeometry(rows = 20, columns = 28) {
    const positions = []; const normals = []; const indices = []
    for (let row = 0; row <= rows; row++) {
      const theta = row * Math.PI / rows
      for (let column = 0; column <= columns; column++) {
        const phi = column * Math.PI * 2 / columns
        const x = Math.sin(theta) * Math.cos(phi); const y = Math.cos(theta); const z = Math.sin(theta) * Math.sin(phi)
        positions.push(x, y, z); normals.push(x, y, z)
        if (row < rows && column < columns) {
          const a = row * (columns + 1) + column; const b = a + columns + 1
          indices.push(a, b, a + 1, b, b + 1, a + 1)
        }
      }
    }
    return geometry(positions, normals, indices)
  }
  function cylinderGeometry(bottom = 0.12, top = 0.01, height = 0.32, segments = 14) {
    const positions = []; const normals = []; const indices = []
    for (let row = 0; row <= 1; row++) {
      const y = row ? height / 2 : -height / 2; const radius = row ? top : bottom
      for (let i = 0; i <= segments; i++) {
        const angle = i / segments * Math.PI * 2; const x = Math.cos(angle); const z = Math.sin(angle)
        positions.push(x * radius, y, z * radius); normals.push(x, 0.3, z)
      }
    }
    for (let i = 0; i < segments; i++) { const a = i; const b = i + segments + 1; indices.push(a, b, a + 1, b, b + 1, a + 1) }
    return geometry(positions, normals, indices)
  }
  function diskGeometry(segments = 64) {
    const positions = [0, 0, 0]; const normals = [0, 1, 0]; const indices = []
    for (let i = 0; i <= segments; i++) { const a = i * Math.PI * 2 / segments; positions.push(Math.cos(a), 0, Math.sin(a)); normals.push(0, 1, 0) }
    for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1)
    return geometry(positions, normals, indices)
  }

  const sphere = sphereGeometry()
  const horn = cylinderGeometry(0.13, 0.005, 0.34)
  const ground = diskGeometry()
  function draw(mesh, position, size, tint, parent, rotation = [0, 0, 0], geom = sphere) {
    let model = multiply(parent, translate(...position))
    model = multiply(model, rotateY(rotation[1])); model = multiply(model, rotateX(rotation[0])); model = multiply(model, rotateZ(rotation[2])); model = multiply(model, scale(...size))
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.positionBuffer); ctx.enableVertexAttribArray(attributes.position); ctx.vertexAttribPointer(attributes.position, 3, ctx.FLOAT, false, 0, 0)
    ctx.bindBuffer(ctx.ARRAY_BUFFER, mesh.normalBuffer); ctx.enableVertexAttribArray(attributes.normal); ctx.vertexAttribPointer(attributes.normal, 3, ctx.FLOAT, false, 0, 0)
    ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer)
    ctx.uniformMatrix4fv(uniforms.model, false, model); ctx.uniform3fv(uniforms.color, color(tint)); ctx.drawElements(ctx.TRIANGLES, mesh.count, ctx.UNSIGNED_SHORT, 0)
  }
  const white = '#fff9ed'; const brown = '#4b322a'; const nose = '#e6a095'; const rose = '#c77e77'; const dark = '#29211e'; const hornColor = '#e6d7b6'; const hoof = '#765648'
  const plants = [
    [-1.85, -0.2, '#e2bb65'], [1.84, -0.36, '#d58d89'], [-1.45, -1.18, '#d58d89'], [1.45, -1.32, '#e2bb65'],
    [-2.25, -1.12, '#e2bb65'], [2.3, -1.05, '#d58d89'], [-0.92, -1.65, '#e2bb65'], [0.92, -1.7, '#d58d89'],
  ]
  const meadowBits = Array.from({ length: 24 }, (_, index) => ({ x: Math.sin(index * 8.2) * 2.5, z: -0.5 - (index % 8) * 0.31, radius: 0.035 + (index % 3) * 0.014 }))
  const cameraPosition = [0, 2.9, 7.4]
  let animationFrame = 0
  let stopped = false
  const started = performance.now()

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.floor(canvas.clientWidth * ratio)); const height = Math.max(1, Math.floor(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
    ctx.viewport(0, 0, width, height)
  }

  function drawFlower(root, x, z, petalColor, scaleFactor = 1) {
    const center = [x, 0, z]
    draw(sphere, [center[0], 0.13 * scaleFactor, center[2]], [0.02, 0.14 * scaleFactor, 0.02], '#668451', root)
    draw(sphere, [x, 0.29 * scaleFactor, z], [0.055 * scaleFactor, 0.05 * scaleFactor, 0.055 * scaleFactor], '#e6c56f', root)
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5
      draw(sphere, [x + Math.cos(angle) * 0.084 * scaleFactor, 0.29 * scaleFactor, z + Math.sin(angle) * 0.084 * scaleFactor], [0.062 * scaleFactor, 0.043 * scaleFactor, 0.048 * scaleFactor], petalColor, root, [0, angle, 0])
    }
  }

  function frame(now) {
    if (stopped) return
    animationFrame = requestAnimationFrame(frame)
    resize()
    const elapsed = (now - started) / 1000
    const progress = action ? Math.min(1, (now - action.started) / 1850) : 0
    if (action && progress >= 1) action = null
    const kind = action?.kind
    const bounce = Math.sin(progress * Math.PI)
    const jump = kind === 'play' ? Math.max(0, Math.sin(progress * Math.PI * 4)) * bounce * 0.2 : 0
    const bob = Math.sin(elapsed * 2.05) * 0.045 + (kind === 'feed' ? bounce * 0.11 : 0) + jump - (kind === 'rest' ? bounce * 0.07 : 0)
    const sway = kind === 'play' ? Math.sin(progress * Math.PI * 4) * 0.16 * bounce : (kind === 'brush' ? Math.sin(progress * Math.PI * 5) * 0.07 * bounce : Math.sin(elapsed * 1.05) * 0.014)
    const root = multiply(translate(0, 0.035 + bob, 0.05), rotateY(yawDrag + sway))
    const headNod = kind === 'feed' ? Math.sin(progress * Math.PI * 8) * 0.095 * (1 - progress) : (kind === 'rest' ? bounce * 0.12 : 0)
    const headRoot = multiply(root, multiply(translate(0.39, 1.87, 0.08), multiply(rotateX(headNod), rotateZ(Math.sin(elapsed * 1.55) * 0.02))))
    const eyeBlink = Math.abs(Math.sin(elapsed * 0.47 + 1.2)) > 0.992 ? 0.15 : 1

    ctx.clearColor(0, 0, 0, 0); ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT)
    const projection = perspective(31 * Math.PI / 180, canvas.width / canvas.height, 0.1, 60)
    const view = lookAt(cameraPosition, [0, 1.14, 0], [0, 1, 0])
    ctx.uniformMatrix4fv(uniforms.projection, false, projection); ctx.uniformMatrix4fv(uniforms.view, false, view)
    draw(ground, [0, -0.035, 0], [7.2, 1, 6.8], '#9db681', identity(), [0, 0, 0], ground)

    // Rounded dairy-cow body and her dark, soft-edged patches.
    draw(sphere, [-0.08, 1.1, 0], [1.07, 0.67, 0.61], white, root)
    draw(sphere, [-0.62, 1.4, 0.38], [0.35, 0.34, 0.26], brown, root, [0.12, -0.2, -0.22])
    draw(sphere, [0.54, 1.35, -0.25], [0.33, 0.31, 0.32], brown, root, [0.2, 0.3, 0.28])
    draw(sphere, [-0.8, 0.95, 0.25], [0.19, 0.21, 0.33], brown, root, [0, 0, -0.18])
    draw(sphere, [0.25, 1.6, -0.51], [0.21, 0.3, 0.16], brown, root, [0, 0.2, 0.2])

    // Head, ears, and the little front fringe.
    draw(sphere, [0, 0, 0], [0.56, 0.57, 0.49], white, headRoot)
    draw(sphere, [0.22, 0.31, 0.03], [0.31, 0.25, 0.37], brown, headRoot, [0.1, 0.1, -0.14])
    draw(sphere, [-0.5, 0.22, 0], [0.3, 0.14, 0.2], white, headRoot, [0, 0, 0.23])
    draw(sphere, [-0.5, 0.23, 0.15], [0.2, 0.075, 0.085], nose, headRoot, [0, 0, 0.23])
    draw(sphere, [0.5, 0.22, 0], [0.3, 0.14, 0.2], white, headRoot, [0, 0, -0.23])
    draw(sphere, [0.5, 0.23, 0.15], [0.2, 0.075, 0.085], nose, headRoot, [0, 0, -0.23])
    draw(horn, [-0.31, 0.52, -0.02], [1, 1, 1], hornColor, headRoot, [0, 0, -0.25], horn)
    draw(horn, [0.31, 0.52, -0.02], [1, 1, 1], hornColor, headRoot, [0, 0, 0.25], horn)
    for (const x of [-0.23, 0.23]) {
      draw(sphere, [x, 0.02, 0.44], [0.068, 0.09 * eyeBlink, 0.047], dark, headRoot)
      draw(sphere, [x - 0.02, 0.055, 0.482], [0.019, 0.023, 0.014], '#fffdf6', headRoot)
    }
    draw(sphere, [0, -0.29, 0.42], [0.36, 0.22, 0.16], nose, headRoot)
    for (const x of [-0.14, 0.14]) draw(sphere, [x, -0.27, 0.565], [0.035, 0.046, 0.016], rose, headRoot)
    const eating = kind === 'feed' && Math.sin(progress * Math.PI * 8) > 0.2
    draw(sphere, [0, -0.45, eating ? 0.49 : 0.49], [0.105, eating ? 0.07 : 0.025, 0.022], '#8c5651', headRoot)
    if (eating) draw(sphere, [0, -0.49, 0.51], [0.046, 0.045, 0.018], '#e58285', headRoot)

    // Four tiny legs; a joyful little kick when it is play time.
    for (let i = 0; i < 4; i++) {
      const x = i % 2 ? 0.72 : -0.72; const z = i < 2 ? 0.31 : -0.31
      const kick = kind === 'play' ? Math.sin(progress * Math.PI * 7 + i * Math.PI) * 0.35 * bounce : Math.sin(elapsed * 2.1 + i) * 0.018
      const legRoot = multiply(root, multiply(translate(x, 0.59, z), rotateZ(kick)))
      draw(sphere, [0, -0.16, 0], [0.145, 0.3, 0.14], white, legRoot)
      draw(sphere, [0, -0.4, 0.018], [0.16, 0.12, 0.16], hoof, legRoot)
    }
    // A swishy brown-tipped tail at the back.
    const tail = multiply(root, multiply(translate(-1.02, 1.35, -0.1), rotateZ(Math.sin(elapsed * 3.5) * 0.27 + (kind === 'play' ? bounce * 0.32 : 0))))
    draw(sphere, [-0.19, -0.16, 0], [0.29, 0.07, 0.075], white, tail, [0, 0.15, -0.42])
    draw(sphere, [-0.39, -0.31, 0], [0.095, 0.16, 0.09], brown, tail, [0, 0, -0.55])

    for (const [x, z, petal] of plants) drawFlower(root, x, z, petal, x < -1.8 || x > 1.8 ? 0.82 : 1)
    for (const bit of meadowBits) {
      draw(sphere, [bit.x, 0.02, bit.z], [bit.radius * 1.4, 0.018, bit.radius], '#73965d', identity(), [0, elapsed * 0.05, 0])
    }
    if (kind === 'rest' && progress > 0.2) {
      const sleepy = ['z', '·', 'z']
      // The DOM layer provides the soft floating marks; this one tiny star catches the light.
      draw(sphere, [0.8 + Math.sin(elapsed) * 0.05, 2.6 + Math.sin(elapsed * 2) * 0.06, 0], [0.035, 0.035, 0.035], '#f4e2a4', root)
      canvas.dataset.sleepy = sleepy[0]
    } else canvas.dataset.sleepy = ''
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  window.addEventListener('resize', resize)
  resize()
  frame(performance.now())

  canvas.addEventListener('pointerdown', (event) => { dragging = false; dragX = event.clientX; canvas.setPointerCapture(event.pointerId) })
  canvas.addEventListener('pointermove', (event) => {
    if (!canvas.hasPointerCapture(event.pointerId)) return
    const delta = event.clientX - dragX
    if (Math.abs(delta) > 1) dragging = true
    yawDrag = Math.max(-0.7, Math.min(0.7, yawDrag + delta * 0.009))
    dragX = event.clientX
  })
  canvas.addEventListener('pointerup', () => {
    if (!dragging) { showToast('Cowdie gives you a tiny moo.'); floatEmotes(['♥', '✦']) }
  })
  window.addEventListener('beforeunload', () => { stopped = true; cancelAnimationFrame(animationFrame); observer.disconnect() })
} else {
  canvas.outerHTML = '<div class="webgl-fallback">Your browser could not open the meadow. Try a browser with WebGL enabled.</div>'
}

function renderCare() {
  for (const [key, value] of Object.entries(care)) {
    const row = document.querySelector(`[data-meter="${key}"]`)
    row.querySelector('.meter-value').textContent = `${Math.round(value)}%`
    row.querySelector('.meter-fill').style.width = `${value}%`
    row.setAttribute('aria-valuenow', String(Math.round(value)))
  }
  document.querySelector('.snack-count').textContent = snacks
  document.querySelector('.snack-feed').disabled = snacks <= 0
  const mood = care.joy > 72 ? 'feeling lovely' : care.joy > 42 ? 'a little mellow' : 'in need of a cuddle'
  document.querySelector('.mood-copy').textContent = mood
  localStorage.setItem('cowdie-care', JSON.stringify(care))
  localStorage.setItem('cowdie-snacks', String(snacks))
}

function showToast(message) {
  const toast = document.querySelector('.toast')
  document.querySelector('.toast-copy').textContent = message
  toast.classList.add('is-visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2100)
}

function floatEmotes(characters) {
  const container = document.querySelector('.floating-emotes')
  for (const [index, character] of characters.entries()) {
    const item = document.createElement('span')
    item.textContent = character
    item.style.left = `${47 + index * 6 + Math.random() * 4}%`
    item.style.animationDelay = `${index * 0.09}s`
    container.append(item)
    setTimeout(() => item.remove(), 1500)
  }
}

function playSound(kind) {
  if (!soundOn) return
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return
  audioContext ||= new AudioContextClass()
  if (audioContext.state === 'suspended') audioContext.resume()
  const notes = { feed: [659, 784], play: [523, 659, 784], brush: [587, 698], rest: [494, 392] }[kind] || [659]
  const start = audioContext.currentTime
  notes.forEach((frequency, index) => {
    const at = start + index * 0.09
    const tone = audioContext.createOscillator()
    const volume = audioContext.createGain()
    tone.type = 'sine'
    tone.frequency.setValueAtTime(frequency, at)
    volume.gain.setValueAtTime(0.0001, at)
    volume.gain.exponentialRampToValueAtTime(0.022, at + 0.018)
    volume.gain.exponentialRampToValueAtTime(0.0001, at + 0.25)
    tone.connect(volume); volume.connect(audioContext.destination)
    tone.start(at); tone.stop(at + 0.26)
  })
}

const gains = {
  feed: { hunger: 24, joy: 5 },
  play: { joy: 21, energy: -8 },
  brush: { clean: 24, joy: 4 },
  rest: { energy: 25 },
}
const messages = { feed: 'Yum! Cowdie loved that.', play: 'Best meadow game ever!', brush: 'So fresh and fluffy!', rest: 'Sweet dreams, Cowdie.' }
for (const button of document.querySelectorAll('[data-action]')) button.addEventListener('click', () => {
  const kind = button.dataset.action
  if (kind === 'feed' && snacks <= 0) { showToast('All out of snacks!'); return }
  if (kind === 'feed') snacks -= 1
  for (const [key, amount] of Object.entries(gains[kind])) care[key] = clamp(care[key] + amount)
  renderCare()
  action = { kind, started: performance.now() }
  playSound(kind)
  showToast(messages[kind])
  floatEmotes(kind === 'feed' ? ['🍎', '♥', '✦'] : kind === 'play' ? ['✧', '♥', '✧'] : kind === 'brush' ? ['✦', '✦'] : ['z', '✧'])
})

document.querySelector('.sound-toggle').addEventListener('click', (event) => {
  const button = event.currentTarget
  soundOn = !soundOn
  const muted = !soundOn
  button.classList.toggle('is-muted', muted)
  button.setAttribute('aria-label', muted ? 'Turn sound on' : 'Mute sound')
  showToast(muted ? 'A quiet little meadow.' : 'The meadow feels a little brighter.')
})

renderCare()
window.setInterval(() => { care.hunger = clamp(care.hunger - 1); renderCare() }, 60000)

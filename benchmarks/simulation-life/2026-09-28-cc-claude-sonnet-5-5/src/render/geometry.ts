import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const BODY = { ax: 0.4, ay: 0.42, az: 0.6, cy: 0.42 }

function paint(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const c = new THREE.Color(color)
  const n = geo.attributes.position.count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r
    arr[i * 3 + 1] = c.g
    arr[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(arr, 3))
  return geo
}

function stripToPosNormal(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo : geo
  g.deleteAttribute('uv')
  return g
}

function transformed(geo: THREE.BufferGeometry, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0) {
  geo.scale(sx, sy, sz)
  geo.translate(x, y, z)
  return stripToPosNormal(geo)
}

export function bodyPoint(dx: number, dy: number, dz: number): THREE.Vector3 {
  const { ax, ay, az, cy } = BODY
  let x = dx * ax
  const y = dy * ay
  const z = dz * az
  const t = z / az
  if (x > 0) x *= 1 - 0.16 * (1 - t * t)
  const lift = 0.05 * t * t
  return new THREE.Vector3(x, cy + y + lift, z)
}

export function makeBeanGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 44, 32)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    let ny = v.y
    if (ny < 0) ny *= 0.82
    const p = bodyPoint(v.x, ny, v.z)
    pos.setXYZ(i, p.x, p.y, p.z)
  }
  g.deleteAttribute('uv')
  const merged = mergeVertices(g, 1e-4)
  merged.computeVertexNormals()
  return merged
}

export const EYE_CENTER = new THREE.Vector3(0, 0.63, 0.45)
export const MOUTH_POS = new THREE.Vector3(0, 0.5, 0.585)
export const CHEEK_L = new THREE.Vector3(-0.28, 0.5, 0.4)
export const CHEEK_R = new THREE.Vector3(0.28, 0.5, 0.4)
export const BROW_CENTER = new THREE.Vector3(0, 0.79, 0.4)

export function makeEyesGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (const s of [-1, 1]) {
    const ex = s * 0.165
    parts.push(paint(transformed(new THREE.SphereGeometry(0.108, 20, 14), 1, 1.2, 0.62, ex, 0, 0), '#fbfdff'))
    parts.push(paint(transformed(new THREE.SphereGeometry(0.066, 16, 12), 1, 1.18, 0.55, ex, -0.004, 0.05), '#1a1b3a'))
    parts.push(paint(transformed(new THREE.SphereGeometry(0.026, 10, 8), 1, 1, 0.6, ex + 0.026, 0.034, 0.09), '#ffffff'))
    parts.push(paint(transformed(new THREE.SphereGeometry(0.012, 8, 6), 1, 1, 0.6, ex - 0.022, -0.03, 0.085), '#ffffff'))
  }
  return mergeGeometries(parts)!
}

export function makeBrowsGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (const s of [-1, 1]) {
    const g = new THREE.CapsuleGeometry(0.02, 0.1, 4, 8)
    g.rotateZ(Math.PI / 2)
    g.rotateZ(s * -0.42)
    g.translate(s * 0.165, 0, 0)
    g.deleteAttribute('uv')
    parts.push(paint(g, '#3a1620'))
  }
  return mergeGeometries(parts)!
}

export function makeSmileGeometry(): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(0.058, 0.0125, 6, 18, Math.PI)
  g.rotateZ(Math.PI)
  g.translate(0, 0.03, 0)
  g.deleteAttribute('uv')
  return paint(g, '#2a1420')
}

export function makeMouthOpenGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  parts.push(paint(transformed(new THREE.SphereGeometry(0.07, 16, 12), 1, 1, 0.5), '#3b1322'))
  parts.push(paint(transformed(new THREE.SphereGeometry(0.04, 12, 8), 1.1, 0.6, 0.5, 0, -0.035, 0.012), '#ff7f9e'))
  return mergeGeometries(parts)!
}

export function makeCheekGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(0.06, 12, 8)
  g.scale(1.2, 0.72, 0.28)
  g.deleteAttribute('uv')
  return g
}

export function makeFruitGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  parts.push(paint(transformed(new THREE.SphereGeometry(0.2, 18, 14), 1, 0.94, 1), '#b7ec48'))
  parts.push(paint(transformed(new THREE.CylinderGeometry(0.012, 0.016, 0.09, 5), 1, 1, 1, 0, 0.2, 0), '#6b4a2b'))
  const leaf = new THREE.SphereGeometry(0.06, 8, 6)
  leaf.scale(1.6, 0.35, 0.8)
  leaf.rotateZ(0.5)
  leaf.translate(0.06, 0.22, 0)
  leaf.deleteAttribute('uv')
  parts.push(paint(leaf, '#3d9a4d'))
  return mergeGeometries(parts)!
}

function hash3(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const zi = Math.floor(z)
  const xf = x - xi
  const yf = y - yi
  const zf = z - zi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const w = zf * zf * (3 - 2 * zf)
  let acc = 0
  for (let dz = 0; dz < 2; dz++)
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const wt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w)
        acc += hash3(xi + dx, yi + dy, zi + dz) * wt
      }
  return acc
}

export function makeCanopyGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 36, 26)
  g.deleteAttribute('uv')
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const n = noise3(v.x * 2.4 + 5, v.y * 2.4 + 5, v.z * 2.4 + 5) * 0.65 + noise3(v.x * 5.5, v.y * 5.5, v.z * 5.5) * 0.35
    const s = 0.9 + n * 0.2
    pos.setXYZ(i, v.x * s, v.y * s * 0.92, v.z * s)
  }
  const merged = mergeVertices(g, 1e-4)
  merged.computeVertexNormals()
  return merged
}

export function makeTrunkGeometry(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.2, 0.34, 1.9, 12, 1)
  g.translate(0, 0.95, 0)
  g.deleteAttribute('uv')
  return g
}

export function makeTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 3; i++) {
    const g = new THREE.ConeGeometry(0.07, 0.5, 4)
    g.translate(0, 0.25, 0)
    g.rotateZ((i - 1) * 0.35)
    g.rotateY(i * 2.1)
    g.deleteAttribute('uv')
    parts.push(g)
  }
  return mergeGeometries(parts)!
}

export function makeFlowerGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = []
  const stem = new THREE.CylinderGeometry(0.014, 0.014, 0.36, 5)
  stem.translate(0, 0.18, 0)
  stem.deleteAttribute('uv')
  parts.push(paint(stem, '#4b9c4b'))
  for (let i = 0; i < 5; i++) {
    const p = new THREE.SphereGeometry(0.07, 8, 6)
    const a = (i / 5) * Math.PI * 2
    p.scale(1, 0.5, 1)
    p.translate(Math.cos(a) * 0.09, 0.37, Math.sin(a) * 0.09)
    p.deleteAttribute('uv')
    parts.push(paint(p, '#ffffff'))
  }
  const c = new THREE.SphereGeometry(0.06, 8, 6)
  c.translate(0, 0.38, 0)
  c.deleteAttribute('uv')
  parts.push(paint(c, '#ffd54a'))
  return mergeGeometries(parts)!
}

export function makeRockGeometry(): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.28, 1)
  const pos = g.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const s = 0.85 + hash3(pos.getX(i) * 9, pos.getY(i) * 9, pos.getZ(i) * 9) * 0.3
    pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * s * 0.7, pos.getZ(i) * s)
  }
  g.deleteAttribute('uv')
  g.computeVertexNormals()
  return g
}

export function makeGrassTexture(): THREE.CanvasTexture {
  const size = 1024
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')!
  const grd = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.5)
  grd.addColorStop(0, '#a4dd6e')
  grd.addColorStop(0.7, '#8fd05f')
  grd.addColorStop(1, '#79c257')
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, size, size)

  ctx.globalAlpha = 0.16
  for (let i = 0; i < 14; i++) {
    const r = size * (0.04 + i * 0.033)
    ctx.strokeStyle = i % 2 ? '#c9f08f' : '#6bb84b'
    ctx.lineWidth = size * 0.017
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, r * 1.35, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  let seed = 12345
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size
    const y = rnd() * size
    const r = 6 + rnd() * 26
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(200,240,140,0.12)' : 'rgba(70,150,70,0.10)'
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 5000; i++) {
    const x = rnd() * size
    const y = rnd() * size
    ctx.strokeStyle = rnd() > 0.5 ? 'rgba(210,245,150,0.35)' : 'rgba(60,130,60,0.28)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + (rnd() - 0.5) * 6, y - 4 - rnd() * 6)
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

export function makeSoftDiscTexture(): THREE.CanvasTexture {
  const size = 128
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.42)')
  g.addColorStop(0.55, 'rgba(0,0,0,0.2)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeRingTexture(): THREE.CanvasTexture {
  const size = 128
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.28, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.55, 'rgba(255,255,255,0.9)')
  g.addColorStop(0.75, 'rgba(255,255,255,0.35)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function makeDishGeometry(radius: number): { body: THREE.BufferGeometry; lip: THREE.BufferGeometry } {
  const R = radius
  const pts = [
    new THREE.Vector2(0, -2.7),
    new THREE.Vector2(R * 0.55, -2.65),
    new THREE.Vector2(R + 0.75, -2.35),
    new THREE.Vector2(R + 1.25, -1.6),
    new THREE.Vector2(R + 1.42, -0.7),
    new THREE.Vector2(R + 1.32, -0.15),
    new THREE.Vector2(R + 1.05, 0.02),
    new THREE.Vector2(R - 0.02, 0.02),
  ]
  const curve = new THREE.SplineCurve(pts)
  const smooth = curve.getPoints(40)
  const body = new THREE.LatheGeometry(smooth, 128)
  const lip = new THREE.TorusGeometry(R + 0.05, 0.16, 10, 128)
  lip.rotateX(Math.PI / 2)
  lip.translate(0, 0.05, 0)
  return { body, lip }
}

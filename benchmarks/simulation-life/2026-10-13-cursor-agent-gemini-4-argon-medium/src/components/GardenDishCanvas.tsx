import React, { useEffect, useRef, useState } from 'react'
import { RotateCcw, Compass, Eye, Sparkles } from 'lucide-react'
import { GardenSimulation } from '../sim/engine'
import { BlobEntity, SimEffect, TreeEntity } from '../sim/types'

interface GardenDishCanvasProps {
  sim: GardenSimulation
  selectedBlobId: string | null
  onSelectBlob: (blobId: string | null) => void
  showVisionRings: boolean
  onToggleVisionRings: () => void
  tickVersion: number
}

interface ProjectedBlobHit {
  id: string
  screenX: number
  screenY: number
  radius: number
}

export const GardenDishCanvas: React.FC<GardenDishCanvasProps> = ({
  sim,
  selectedBlobId,
  onSelectBlob,
  showVisionRings,
  onToggleVisionRings,
  tickVersion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [rotation, setRotation] = useState<number>(0.42)
  const [pitch, setPitch] = useState<number>(0.64) // 0.48 to 0.82
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ x: number; y: number; rot: number; pitch: number; moved: boolean }>({
    x: 0,
    y: 0,
    rot: 0.42,
    pitch: 0.64,
    moved: false,
  })
  const hitTargetsRef = useRef<ProjectedBlobHit[]>([])
  const hoveredBlobIdRef = useRef<string | null>(null)
  const [hoveredBlobId, setHoveredBlobId] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = Math.max(320, rect.width)
    const height = Math.max(320, rect.height)

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const worldRadius = sim.config.worldSize
    const maxScreenRadius = Math.min(width * 0.44, height * 0.43)
    const scale = maxScreenRadius / worldRadius
    const centerX = width * 0.5
    const centerY = height * 0.51
    const cosR = Math.cos(rotation)
    const sinR = Math.sin(rotation)
    const tilt = pitch

    const project = (wx: number, wy: number, wz = 0) => {
      const rx = wx * cosR - wy * sinR
      const ry = wx * sinR + wy * cosR
      return {
        sx: centerX + rx * scale,
        sy: centerY + ry * scale * tilt - wz * scale,
        ry,
        rx,
      }
    }

    // 1. Ambient background glow under the dish
    const bgGlow = ctx.createRadialGradient(
      centerX,
      centerY + 14,
      maxScreenRadius * 0.2,
      centerX,
      centerY + 14,
      maxScreenRadius * 1.32
    )
    bgGlow.addColorStop(0, 'rgba(34, 87, 63, 0.22)')
    bgGlow.addColorStop(0.65, 'rgba(16, 36, 28, 0.12)')
    bgGlow.addColorStop(1, 'rgba(10, 16, 14, 0)')
    ctx.fillStyle = bgGlow
    ctx.fillRect(0, 0, width, height)

    // 2. Dish drop shadow on tabletop
    const dishRx = worldRadius * scale
    const dishRy = worldRadius * scale * tilt
    const dishDepth = 26 * scale * (1.15 - tilt * 0.45)

    ctx.save()
    ctx.beginPath()
    ctx.ellipse(centerX, centerY + dishDepth + 14, dishRx * 1.04, dishRy * 1.04, 0, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(3, 7, 6, 0.68)'
    ctx.fill()
    ctx.restore()

    // 3. 3D Raised Dish Ceramic/Terracotta Base Wall
    const wallGrad = ctx.createLinearGradient(centerX - dishRx, centerY, centerX + dishRx, centerY + dishDepth)
    wallGrad.addColorStop(0, '#5c4033')
    wallGrad.addColorStop(0.35, '#8c6249')
    wallGrad.addColorStop(0.7, '#644534')
    wallGrad.addColorStop(1, '#3d291f')

    ctx.beginPath()
    ctx.ellipse(centerX, centerY + dishDepth, dishRx * 1.035, dishRy * 1.035, 0, 0, Math.PI)
    ctx.lineTo(centerX - dishRx * 1.035, centerY)
    ctx.ellipse(centerX, centerY, dishRx * 1.035, dishRy * 1.035, 0, Math.PI, 0, true)
    ctx.closePath()
    ctx.fillStyle = wallGrad
    ctx.fill()

    // Outer ceramic rim lip
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, dishRx * 1.038, dishRy * 1.038, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#9e7356'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255, 228, 196, 0.25)'
    ctx.stroke()

    // 4. Lush Circular Garden Soil & Mossy Meadow Surface
    ctx.save()
    ctx.beginPath()
    ctx.ellipse(centerX, centerY, dishRx, dishRy, 0, 0, Math.PI * 2)
    ctx.clip()

    const meadowGrad = ctx.createRadialGradient(
      centerX - dishRx * 0.18,
      centerY - dishRy * 0.18,
      dishRx * 0.05,
      centerX,
      centerY,
      dishRx * 1.05
    )
    meadowGrad.addColorStop(0, '#366844')
    meadowGrad.addColorStop(0.55, '#295236')
    meadowGrad.addColorStop(0.88, '#1e3f29')
    meadowGrad.addColorStop(1, '#162f1f')
    ctx.fillStyle = meadowGrad
    ctx.fillRect(centerX - dishRx, centerY - dishRy, dishRx * 2, dishRy * 2)

    // Subtle concentric garden rings & rotating compass ticks on the turf
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.06)'
    ctx.lineWidth = 1.2
    for (const ringFrac of [0.33, 0.66, 0.88]) {
      ctx.beginPath()
      ctx.ellipse(centerX, centerY, dishRx * ringFrac, dishRy * ringFrac, 0, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Decorative rotating turf radial lines & tiny clover/pebble accents so rotation is immediately felt
    ctx.strokeStyle = 'rgba(167, 243, 208, 0.045)'
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const p1 = project(Math.cos(a) * worldRadius * 0.2, Math.sin(a) * worldRadius * 0.2, 0)
      const p2 = project(Math.cos(a) * worldRadius * 0.96, Math.sin(a) * worldRadius * 0.96, 0)
      ctx.beginPath()
      ctx.moveTo(p1.sx, p1.sy)
      ctx.lineTo(p2.sx, p2.sy)
      ctx.stroke()
    }

    // Soft inner bevel shadow along the top inside edge of the dish
    ctx.beginPath()
    ctx.ellipse(centerX, centerY + 3, dishRx * 0.995, dishRy * 0.995, 0, 0, Math.PI * 2)
    ctx.lineWidth = 6
    ctx.strokeStyle = 'rgba(8, 20, 14, 0.42)'
    ctx.stroke()
    ctx.restore()

    // 5. Vision rings & target connection lines on the ground plane
    const selectedBlob = sim.blobs.find((b) => b.id === selectedBlobId) || null
    if (selectedBlob || showVisionRings) {
      for (const blob of sim.blobs) {
        const isSelected = blob.id === selectedBlobId
        if (!isSelected && !showVisionRings) continue

        const baseVision =
          blob.species === 'blue' ? sim.config.blueVision : sim.config.redVision
        const effVision = baseVision * blob.traits.visionTrait
        const gp = project(blob.x, blob.y, 0)

        ctx.save()
        ctx.beginPath()
        ctx.ellipse(
          gp.sx,
          gp.sy,
          effVision * scale,
          effVision * scale * tilt,
          0,
          0,
          Math.PI * 2
        )
        if (isSelected) {
          ctx.strokeStyle =
            blob.species === 'blue' ? 'rgba(96, 165, 250, 0.65)' : 'rgba(251, 113, 133, 0.65)'
          ctx.lineWidth = 1.8
          ctx.setLineDash([5, 5])
          ctx.stroke()
          ctx.fillStyle =
            blob.species === 'blue' ? 'rgba(59, 130, 246, 0.06)' : 'rgba(244, 63, 94, 0.06)'
          ctx.fill()
        } else {
          ctx.strokeStyle =
            blob.species === 'blue' ? 'rgba(96, 165, 250, 0.16)' : 'rgba(251, 113, 133, 0.16)'
          ctx.lineWidth = 1
          ctx.stroke()
        }
        ctx.restore()

        // If selected blob has a target tree or blob, draw a subtle dotted trail
        if (isSelected && blob.targetId) {
          const targetTree = sim.trees.find((t) => t.id === blob.targetId || t.slots.some((s) => s.id === blob.targetId))
          const targetBlob = sim.blobs.find((b) => b.id === blob.targetId)
          const tx = targetTree ? targetTree.x : targetBlob ? targetBlob.x : null
          const ty = targetTree ? targetTree.y : targetBlob ? targetBlob.y : null
          if (tx !== null && ty !== null) {
            const tp = project(tx, ty, 2)
            ctx.save()
            ctx.beginPath()
            ctx.moveTo(gp.sx, gp.sy)
            ctx.lineTo(tp.sx, tp.sy)
            ctx.strokeStyle =
              blob.species === 'blue' ? 'rgba(147, 197, 253, 0.65)' : 'rgba(253, 164, 175, 0.65)'
            ctx.lineWidth = 1.8
            ctx.setLineDash([3, 4])
            ctx.stroke()
            ctx.restore()
          }
        }
      }
    }

    // 6. Build depth-sorted render list (trees, blobs, effects)
    type RenderItem =
      | { kind: 'tree'; depth: number; tree: TreeEntity }
      | { kind: 'blob'; depth: number; blob: BlobEntity }
      | { kind: 'effect'; depth: number; effect: SimEffect }

    const renderList: RenderItem[] = []
    for (const tree of sim.trees) {
      const p = project(tree.x, tree.y, 0)
      renderList.push({ kind: 'tree', depth: p.ry, tree })
    }
    for (const blob of sim.blobs) {
      const p = project(blob.x, blob.y, 0)
      renderList.push({ kind: 'blob', depth: p.ry, blob })
    }
    for (const effect of sim.effects) {
      const p = project(effect.x, effect.y, 0)
      renderList.push({ kind: 'effect', depth: p.ry + 4, effect })
    }

    renderList.sort((a, b) => a.depth - b.depth)

    const newHitTargets: ProjectedBlobHit[] = []

    for (const item of renderList) {
      if (item.kind === 'tree') {
        drawTree(ctx, item.tree, project, rotation, scale, tilt)
      } else if (item.kind === 'blob') {
        const hit = drawBlob(
          ctx,
          item.blob,
          project,
          rotation,
          scale,
          tilt,
          item.blob.id === selectedBlobId,
          item.blob.id === hoveredBlobId
        )
        newHitTargets.push(hit)
      } else {
        drawEffect(ctx, item.effect, project, scale)
      }
    }

    hitTargetsRef.current = newHitTargets
    ctx.restore()
  }, [sim, rotation, pitch, selectedBlobId, hoveredBlobId, showVisionRings, tickVersion])

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    isDraggingRef.current = true
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rot: rotation,
      pitch,
      moved: false,
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    if (isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      if (Math.hypot(dx, dy) > 4) {
        dragStartRef.current.moved = true
      }
      setRotation(dragStartRef.current.rot + dx * 0.0085)
      setPitch(Math.max(0.46, Math.min(0.82, dragStartRef.current.pitch + dy * 0.0022)))
      return
    }

    // Hover detection on blobs (reverse order so frontmost blob wins)
    const targets = hitTargetsRef.current
    let foundId: string | null = null
    for (let i = targets.length - 1; i >= 0; i--) {
      const t = targets[i]
      if (Math.hypot(mx - t.screenX, my - t.screenY) <= t.radius + 5) {
        foundId = t.id
        break
      }
    }
    if (foundId !== hoveredBlobIdRef.current) {
      hoveredBlobIdRef.current = foundId
      setHoveredBlobId(foundId)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)

    if (!dragStartRef.current.moved) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top

      const targets = hitTargetsRef.current
      let clickedId: string | null = null
      for (let i = targets.length - 1; i >= 0; i--) {
        const t = targets[i]
        if (Math.hypot(mx - t.screenX, my - t.screenY) <= t.radius + 7) {
          clickedId = t.id
          break
        }
      }
      onSelectBlob(clickedId)
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden rounded-2xl bg-[#111916] border border-emerald-950/70 shadow-2xl">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`w-full h-full block ${hoveredBlobId ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}`}
      />

      {/* Top-left floating dish legend */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2 bg-[#0d1512]/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-emerald-900/50 text-xs text-emerald-100/90 shadow-lg">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-[0_0_8px_#a3e635]" />
          <span>Ripe Fruit</span>
        </span>
        <span className="text-emerald-700">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
          <span>Blue Foragers</span>
        </span>
        <span className="text-emerald-700">•</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#fb7185]" />
          <span>Red Seekers</span>
        </span>
      </div>

      {/* Top-right camera & overlay controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleVisionRings}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
            showVisionRings
              ? 'bg-sky-500/20 border-sky-400/50 text-sky-200'
              : 'bg-[#0d1512]/85 border-emerald-900/50 text-emerald-200/80 hover:text-white hover:border-emerald-700'
          }`}
          title="Toggle sensing rings for all blobs"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Sensing Rings</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setRotation(0.42)
            setPitch(0.64)
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium bg-[#0d1512]/85 border border-emerald-900/50 text-emerald-200/80 hover:text-white hover:border-emerald-700 transition-colors"
          title="Reset dish rotation & tilt"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Angle</span>
        </button>
      </div>

      {/* Bottom interaction hint bar */}
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-emerald-200/70">
        <div className="flex items-center gap-1.5 bg-[#0d1512]/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-emerald-900/40">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span>Drag dish to rotate ({Math.round(((rotation * 180) / Math.PI) % 360)}°) & tilt</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0d1512]/80 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-emerald-900/40">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Click any blob to inspect its live state & traits</span>
        </div>
      </div>
    </div>
  )
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: TreeEntity,
  project: (wx: number, wy: number, wz?: number) => { sx: number; sy: number; ry: number; rx: number },
  rotation: number,
  scale: number,
  tilt: number
) {
  const base = project(tree.x, tree.y, 0)
  const top = project(tree.x, tree.y, tree.trunkHeight)
  const canopyR = tree.canopyRadius * scale

  // 1. Soft ground shadow under tree
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(base.sx + 4 * scale, base.sy + 2 * scale, canopyR * 0.95, canopyR * tilt * 0.9, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(6, 15, 10, 0.42)'
  ctx.fill()

  // 2. Wooden trunk
  const trunkW = Math.max(3.5, 5.2 * scale)
  const trunkGrad = ctx.createLinearGradient(base.sx - trunkW, base.sy, base.sx + trunkW, top.sy)
  trunkGrad.addColorStop(0, '#5c3a24')
  trunkGrad.addColorStop(0.5, '#7c5134')
  trunkGrad.addColorStop(1, '#432818')

  ctx.beginPath()
  ctx.moveTo(base.sx - trunkW * 0.85, base.sy)
  ctx.lineTo(top.sx - trunkW * 0.55, top.sy + 4)
  ctx.lineTo(top.sx + trunkW * 0.55, top.sy + 4)
  ctx.lineTo(base.sx + trunkW * 0.85, base.sy)
  ctx.closePath()
  ctx.fillStyle = trunkGrad
  ctx.fill()

  // 3. Multi-puff 3D leafy bush/tree canopy
  const drawCanopyPuff = (ox: number, oy: number, r: number, lightness: number) => {
    const grad = ctx.createRadialGradient(
      ox - r * 0.28,
      oy - r * 0.32,
      r * 0.1,
      ox,
      oy,
      r
    )
    grad.addColorStop(0, `hsl(${138 + tree.hueShift}, 54%, ${lightness + 12}%)`)
    grad.addColorStop(0.65, `hsl(${142 + tree.hueShift}, 50%, ${lightness}%)`)
    grad.addColorStop(1, `hsl(${148 + tree.hueShift}, 55%, ${lightness - 11}%)`)
    ctx.beginPath()
    ctx.arc(ox, oy, r, 0, Math.PI * 2)
    ctx.fillStyle = grad
    ctx.fill()
  }

  // Back/side puffs then main top dome
  drawCanopyPuff(top.sx - canopyR * 0.36, top.sy + canopyR * 0.08, canopyR * 0.62, 28)
  drawCanopyPuff(top.sx + canopyR * 0.36, top.sy + canopyR * 0.08, canopyR * 0.62, 27)
  drawCanopyPuff(top.sx, top.sy - canopyR * 0.12, canopyR * 0.78, 33)

  // 4. Attached Fruit Slots (sorted back-to-front on the canopy)
  const projectedSlots = tree.slots.map((slot) => {
    const worldAngle = slot.localAngle + rotation
    const sx = top.sx + Math.cos(worldAngle) * canopyR * slot.localRadius * 0.85
    const sy =
      top.sy -
      canopyR * 0.12 +
      Math.sin(worldAngle) * canopyR * slot.localRadius * 0.55 * tilt -
      (slot.localHeight - 0.5) * canopyR * 0.32
    return { slot, sx, sy, depth: Math.sin(worldAngle) }
  })

  projectedSlots.sort((a, b) => a.depth - b.depth)

  for (const { slot, sx, sy } of projectedSlots) {
    if (slot.state === 'cooldown') {
      // Bare stem node showing where fruit was picked
      ctx.beginPath()
      ctx.arc(sx, sy, Math.max(1.4, 1.8 * scale), 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(120, 88, 60, 0.65)'
      ctx.fill()
      continue
    }

    const baseFruitR = Math.max(3.2, 4.8 * scale)
    const r =
      slot.state === 'ripe'
        ? baseFruitR
        : slot.state === 'being_eaten'
        ? baseFruitR * Math.max(0.25, slot.growProgress)
        : baseFruitR * (0.28 + 0.65 * slot.growProgress)

    // Fruit drop shadow on leaves
    ctx.beginPath()
    ctx.arc(sx + 0.8, sy + 1.4, r * 0.95, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(8, 28, 15, 0.45)'
    ctx.fill()

    // Glossy green fruit body
    const fruitGrad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, r * 0.1, sx, sy, r)
    if (slot.state === 'ripe' || slot.state === 'being_eaten') {
      fruitGrad.addColorStop(0, '#ecfccb')
      fruitGrad.addColorStop(0.35, '#a3e635')
      fruitGrad.addColorStop(0.85, '#65a30d')
      fruitGrad.addColorStop(1, '#3f6212')
    } else {
      // Regrowing bud (softer translucent yellow-green)
      fruitGrad.addColorStop(0, 'rgba(217, 249, 157, 0.85)')
      fruitGrad.addColorStop(0.6, 'rgba(132, 204, 22, 0.7)')
      fruitGrad.addColorStop(1, 'rgba(77, 124, 15, 0.65)')
    }

    ctx.beginPath()
    ctx.arc(sx, sy, r, 0, Math.PI * 2)
    ctx.fillStyle = fruitGrad
    ctx.fill()

    // Specular highlight on ripe fruit
    if (slot.state === 'ripe') {
      ctx.beginPath()
      ctx.arc(sx - r * 0.32, sy - r * 0.32, r * 0.26, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)'
      ctx.fill()
    }
  }

  ctx.restore()
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  blob: BlobEntity,
  project: (wx: number, wy: number, wz?: number) => { sx: number; sy: number; ry: number; rx: number },
  rotation: number,
  scale: number,
  tilt: number,
  isSelected: boolean,
  isHovered: boolean
): ProjectedBlobHit {
  const ground = project(blob.x, blob.y, 0)

  // Hop & bounce physics
  const isActionPaused = blob.action === 'eating' || blob.action === 'pausing'
  const hopWave = Math.abs(Math.sin(blob.bouncePhase))
  const hopHeight = isActionPaused ? hopWave * 3.2 : hopWave * 5.8
  const bodyPos = project(blob.x, blob.y, hopHeight)

  const baseRadius = (blob.species === 'blue' ? 9.2 : 10.4) * blob.traits.sizeTrait * scale
  const squash = isActionPaused
    ? 1 + Math.sin(blob.bouncePhase * 2) * 0.12
    : 1 + (0.5 - hopWave) * 0.14
  const rx = baseRadius * squash
  const ry = baseRadius * (1.12 / squash)

  // Screen-space velocity for subtle leaning
  const screenAngle = blob.heading + rotation
  const speedMag = Math.hypot(blob.vx, blob.vy)
  const leanAngle = isActionPaused ? Math.sin(blob.bouncePhase) * 0.08 : Math.cos(screenAngle) * Math.min(0.22, speedMag * 0.0035)

  ctx.save()

  // 1. Ground shadow (shrinks slightly when blob hops high)
  const shadowScale = 1 - hopHeight * 0.04
  ctx.beginPath()
  ctx.ellipse(
    ground.sx,
    ground.sy,
    baseRadius * 0.95 * shadowScale,
    baseRadius * tilt * 0.78 * shadowScale,
    0,
    0,
    Math.PI * 2
  )
  ctx.fillStyle = 'rgba(4, 10, 8, 0.48)'
  ctx.fill()

  // 2. Selection or hover ground halo
  if (isSelected || isHovered) {
    ctx.beginPath()
    ctx.ellipse(
      ground.sx,
      ground.sy,
      baseRadius * 1.45,
      baseRadius * tilt * 1.25,
      0,
      0,
      Math.PI * 2
    )
    ctx.strokeStyle = isSelected ? '#fde047' : 'rgba(255, 255, 255, 0.55)'
    ctx.lineWidth = isSelected ? 2.2 : 1.4
    ctx.stroke()
  }

  // 3. Action pause progress ring (eating fruit or post-contact pause)
  if (isActionPaused && blob.actionDuration > 0 && blob.actionTimer > 0) {
    const progress = 1 - blob.actionTimer / blob.actionDuration
    ctx.beginPath()
    ctx.ellipse(
      ground.sx,
      ground.sy,
      baseRadius * 1.32,
      baseRadius * tilt * 1.12,
      0,
      -Math.PI / 2,
      -Math.PI / 2 + progress * Math.PI * 2
    )
    ctx.strokeStyle = blob.action === 'eating' ? '#a3e635' : '#fb7185'
    ctx.lineWidth = 2.4
    ctx.stroke()
  }

  // 4. Glossy Oval Bean Body
  ctx.translate(bodyPos.sx, bodyPos.sy - ry * 0.45)
  ctx.rotate(leanAngle)

  const bodyGrad = ctx.createRadialGradient(-rx * 0.28, -ry * 0.35, rx * 0.12, 0, 0, Math.max(rx, ry) * 1.1)
  if (blob.species === 'blue') {
    bodyGrad.addColorStop(0, '#bae6fd')
    bodyGrad.addColorStop(0.32, '#38bdf8')
    bodyGrad.addColorStop(0.78, '#0284c7')
    bodyGrad.addColorStop(1, '#0c4a6e')
  } else {
    bodyGrad.addColorStop(0, '#fecdd3')
    bodyGrad.addColorStop(0.32, '#fb7185')
    bodyGrad.addColorStop(0.78, '#e11d48')
    bodyGrad.addColorStop(1, '#881337')
  }

  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
  ctx.fillStyle = bodyGrad
  ctx.fill()

  // Subtle rim outline
  ctx.lineWidth = 1.2
  ctx.strokeStyle =
    blob.species === 'blue' ? 'rgba(186, 230, 253, 0.45)' : 'rgba(254, 205, 211, 0.45)'
  ctx.stroke()

  // Top glossy jelly highlight
  ctx.beginPath()
  ctx.ellipse(-rx * 0.26, -ry * 0.38, rx * 0.34, ry * 0.2, -0.45, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.68)'
  ctx.fill()

  // Secondary tiny specular dot
  ctx.beginPath()
  ctx.arc(-rx * 0.48, -ry * 0.14, rx * 0.09, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.fill()

  // 5. Simple Expressive Face (shifted slightly in facing direction)
  const lookX = Math.cos(screenAngle) * rx * 0.22
  const lookY = Math.sin(screenAngle) * ry * 0.14
  const eyeOffsetX = rx * 0.28
  const eyeY = -ry * 0.05 + lookY
  const eyeR = Math.max(1.5, rx * 0.14)

  // Rosy cheeks
  ctx.fillStyle = blob.species === 'blue' ? 'rgba(244, 114, 182, 0.42)' : 'rgba(253, 224, 71, 0.35)'
  ctx.beginPath()
  ctx.ellipse(lookX - eyeOffsetX * 1.35, eyeY + eyeR * 1.2, eyeR * 0.95, eyeR * 0.55, 0, 0, Math.PI * 2)
  ctx.ellipse(lookX + eyeOffsetX * 1.35, eyeY + eyeR * 1.2, eyeR * 0.95, eyeR * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()

  if (blob.isBlinking > 0 || isActionPaused) {
    // Happy curved eyes (^ ^) when blinking, eating, or pausing after contact
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = Math.max(1.3, rx * 0.1)
    ctx.lineCap = 'round'
    for (const dir of [-1, 1]) {
      const ex = lookX + dir * eyeOffsetX
      ctx.beginPath()
      ctx.arc(ex, eyeY + eyeR * 0.2, eyeR * 0.85, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
    }
  } else {
    // Open glossy eyes
    for (const dir of [-1, 1]) {
      const ex = lookX + dir * eyeOffsetX
      ctx.beginPath()
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2)
      ctx.fillStyle = '#0f172a'
      ctx.fill()

      // Eye catchlight
      ctx.beginPath()
      ctx.arc(ex - eyeR * 0.3, eyeY - eyeR * 0.3, eyeR * 0.36, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
    }
  }

  // Cute mouth
  ctx.strokeStyle = '#0f172a'
  ctx.lineWidth = Math.max(1.1, rx * 0.08)
  ctx.beginPath()
  if (blob.action === 'eating') {
    // Chewing 'o' mouth
    const chewR = eyeR * (0.55 + Math.abs(Math.sin(blob.bouncePhase * 2)) * 0.35)
    ctx.arc(lookX, eyeY + eyeR * 1.45, chewR, 0, Math.PI * 2)
    ctx.fillStyle = '#0f172a'
    ctx.fill()
  } else if (blob.action === 'fleeing') {
    // Startled wavy/open mouth
    ctx.arc(lookX, eyeY + eyeR * 1.65, eyeR * 0.6, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
  } else {
    // Gentle smile
    ctx.arc(lookX, eyeY + eyeR * 1.1, eyeR * 0.72, Math.PI * 0.18, Math.PI * 0.82)
    ctx.stroke()
  }

  ctx.restore()

  // 6. Floating badge when selected or eating/pausing
  if (isSelected) {
    ctx.save()
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif'
    const label = `${blob.name} • ${Math.round(blob.energy)}⚡`
    const textW = ctx.measureText(label).width
    const bx = bodyPos.sx - textW / 2 - 6
    const by = bodyPos.sy - ry * 2.1 - 18
    ctx.fillStyle = 'rgba(13, 21, 18, 0.88)'
    ctx.strokeStyle = blob.species === 'blue' ? '#38bdf8' : '#fb7185'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.roundRect(bx, by, textW + 12, 18, 6)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = '#f8fafc'
    ctx.fillText(label, bx + 6, by + 13)
    ctx.restore()
  }

  return {
    id: blob.id,
    screenX: bodyPos.sx,
    screenY: bodyPos.sy - ry * 0.45,
    radius: Math.max(rx, ry),
  }
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  effect: SimEffect,
  project: (wx: number, wy: number, wz?: number) => { sx: number; sy: number; ry: number; rx: number },
  scale: number
) {
  const progress = Math.min(1, effect.age / Math.max(0.1, effect.duration))
  const alpha = 1 - progress
  const p = project(effect.x, effect.y, 10 + progress * 14)

  ctx.save()
  if (effect.type === 'eat') {
    // Green & gold chew sparkles
    const r = (6 + progress * 14) * scale
    ctx.strokeStyle = `rgba(163, 230, 53, ${alpha * 0.85})`
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
    ctx.stroke()

    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + progress * 2.5
      const sx = p.sx + Math.cos(a) * r * 0.85
      const sy = p.sy + Math.sin(a) * r * 0.85
      ctx.beginPath()
      ctx.arc(sx, sy, 2.2 * scale, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`
      ctx.fill()
    }
  } else if (effect.type === 'contact') {
    // Warm pink/coral energy pulse rings on gentle contact
    const r = (8 + progress * 22) * scale
    ctx.strokeStyle = `rgba(251, 113, 133, ${alpha * 0.9})`
    ctx.lineWidth = 2.2
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
    ctx.stroke()

    ctx.strokeStyle = `rgba(253, 224, 71, ${alpha * 0.7})`
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r * 0.6, 0, Math.PI * 2)
    ctx.stroke()
  } else if (effect.type === 'birth_blue' || effect.type === 'birth_red') {
    const color =
      effect.type === 'birth_blue'
        ? `rgba(56, 189, 248, ${alpha})`
        : `rgba(251, 113, 133, ${alpha})`
    const r = (5 + progress * 18) * scale
    ctx.strokeStyle = color
    ctx.lineWidth = 2
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
    ctx.stroke()
  } else if (effect.type === 'fade') {
    const r = (8 * (1 - progress * 0.5)) * scale
    ctx.fillStyle = `rgba(226, 232, 240, ${alpha * 0.5})`
    ctx.beginPath()
    ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

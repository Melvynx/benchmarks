import { useEffect, useRef } from 'react'
import type { Engine } from '../sim/engine'
import { DT } from '../sim/engine'
import { drawGarden } from '../render/draw'
import { makeCamera, project } from '../render/camera'

type Props = {
  engine: Engine
  playing: boolean
  simSpeed: number
  selectedId: number | null
  onSelect: (id: number | null) => void
}

export function Garden({ engine, playing, simSpeed, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const yaw = useRef(0.35)
  const playingRef = useRef(playing)
  const speedRef = useRef(simSpeed)
  const selectedRef = useRef(selectedId)
  playingRef.current = playing
  speedRef.current = simSpeed
  selectedRef.current = selectedId

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    let acc = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000)
      last = now
      if (playingRef.current) {
        acc += dt * speedRef.current
        let steps = 0
        while (acc >= DT && steps < 48) {
          engine.stepOnce()
          acc -= DT
          steps++
        }
        if (steps >= 48) acc = 0
      }
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const width = Math.max(1, Math.floor(rect.width * dpr))
      const height = Math.max(1, Math.floor(rect.height * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const ctx = canvas.getContext('2d')
      if (ctx) drawGarden(ctx, engine.world, yaw.current, width, height, selectedRef.current)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [engine])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const drag = { active: false, x: 0, y: 0, moved: false }

    const pointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const dpr = canvas.width / rect.width
      return {
        sx: (event.clientX - rect.left) * dpr,
        sy: (event.clientY - rect.top) * dpr,
        cssX: event.clientX,
        cssY: event.clientY,
      }
    }

    const down = (event: PointerEvent) => {
      drag.active = true
      drag.moved = false
      drag.x = event.clientX
      drag.y = event.clientY
      canvas.setPointerCapture(event.pointerId)
    }
    const move = (event: PointerEvent) => {
      if (!drag.active) return
      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      if (Math.hypot(dx, dy) > 4) drag.moved = true
      if (drag.moved) yaw.current += dx * 0.008
      drag.x = event.clientX
      drag.y = event.clientY
    }
    const up = (event: PointerEvent) => {
      if (!drag.active) return
      drag.active = false
      if (drag.moved) return
      const point = pointer(event)
      const cam = makeCamera(canvas.width, canvas.height, engine.world.radius, yaw.current)
      let best: number | null = null
      let bestD = 28
      for (const blob of engine.world.blobs) {
        const projected = project(blob.x, blob.y, 8, cam)
        const d = Math.hypot(projected.sx - point.sx, projected.sy - point.sy)
        if (d < bestD) {
          bestD = d
          best = blob.id
        }
      }
      onSelect(best)
    }

    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
    }
  }, [engine, onSelect])

  return <canvas ref={canvasRef} data-testid="garden" aria-label="Living garden" />
}

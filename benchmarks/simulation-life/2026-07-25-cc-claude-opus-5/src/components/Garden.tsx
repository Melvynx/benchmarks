import { useEffect, useRef } from 'react'
import type { Engine } from '../sim/engine'
import { makeCamera } from '../render/camera'
import { drawScene, fitCamera, pickBlob } from '../render/scene'
import { gardenTheme, type Mode } from '../theme'

type Props = {
  engine: Engine
  mode: Mode
  /** Bumped by React whenever the UI changed something the canvas should see. */
  version: number
  onPick: (id: number | null) => void
}

export function Garden({ engine, mode, version, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const camRef = useRef(makeCamera())
  const modeRef = useRef(mode)
  modeRef.current = mode

  // One animation loop for the life of the canvas. It reads the engine directly
  // rather than through React, so the frame rate is never tied to renders.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const cam = camRef.current
    let raf = 0
    let last = performance.now()
    let alpha = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fitCamera(cam, rect.width, rect.height, engine.world.radius)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      alpha = engine.advance(dt)
      const rect = canvas.getBoundingClientRect()
      fitCamera(cam, rect.width, rect.height, engine.world.radius)
      drawScene(ctx, engine.world, cam, {
        theme: gardenTheme(modeRef.current),
        mode: modeRef.current,
        alpha,
        selectedId: engine.selectedId,
        clock: now / 1000,
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // Drag to spin the dish.
    let dragging = false
    let dragged = false
    let lastX = 0
    const down = (e: PointerEvent) => {
      dragging = true
      dragged = false
      lastX = e.clientX
      canvas.setPointerCapture(e.pointerId)
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      if (Math.abs(dx) > 1) dragged = true
      lastX = e.clientX
      cam.yaw += dx * 0.006
    }
    const up = (e: PointerEvent) => {
      if (dragging && !dragged) {
        const rect = canvas.getBoundingClientRect()
        const hit = pickBlob(engine.world, cam, e.clientX - rect.left, e.clientY - rect.top, alpha)
        onPick(hit ? hit.id : null)
      }
      dragging = false
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId)
    }
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
    }
  }, [engine, onPick])

  return (
    <canvas
      ref={canvasRef}
      className="garden-canvas"
      data-version={version}
      aria-label="The garden. Drag to turn it, click a blob to inspect it."
    />
  )
}

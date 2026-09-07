import { useEffect, useRef } from 'react'
import type { Engine } from '../sim/engine'
import { makeCamera, type Camera } from '../render/camera'
import { drawScene, fitCamera, pickBlob } from '../render/scene'

type Props = {
  engine: Engine
  onPick: (id: number | null) => void
}

export function Garden({ engine, onPick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const camRef = useRef<Camera>(makeCamera())
  const leftoverRef = useRef(0)
  const dragRef = useRef<{ x: number; yaw: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frame = 0
    let last = performance.now()

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const w = parent.clientWidth
      const h = parent.clientHeight
      canvas.width = Math.max(1, Math.floor(w * dpr))
      canvas.height = Math.max(1, Math.floor(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fitCamera(camRef.current, engine.world, w, h)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      leftoverRef.current = engine.advance(dt)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      fitCamera(camRef.current, engine.world, w, h)
      drawScene(ctx, engine.world, camRef.current, engine.selectedId, leftoverRef.current, now)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [engine])

  const localPoint = (e: React.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  return (
    <canvas
      ref={canvasRef}
      className="garden"
      aria-label="Living garden dish. Drag to rotate. Click a blob to inspect it."
      onPointerDown={(e) => {
        const p = localPoint(e)
        dragRef.current = { x: e.clientX, yaw: camRef.current.yaw }
        ;(e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId)
        const blob = pickBlob(camRef.current, engine.world, p.x, p.y, leftoverRef.current)
        onPick(blob ? blob.id : null)
      }}
      onPointerMove={(e) => {
        const drag = dragRef.current
        if (!drag) return
        camRef.current.yaw = drag.yaw + (e.clientX - drag.x) * 0.008
      }}
      onPointerUp={() => {
        dragRef.current = null
      }}
      onPointerCancel={() => {
        dragRef.current = null
      }}
    />
  )
}

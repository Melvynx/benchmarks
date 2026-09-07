import { useEffect, useRef } from 'react'
import { Engine } from '../sim/engine'
import { drawWorld, fitCamera, hitBlob } from '../render/draw'

type Props = {
  engine: Engine
}

export function Garden({ engine }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const yawRef = useRef(-0.55)
  const dragRef = useRef<{ x: number; yaw: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let lastNotify = 0
    let width = 0
    let height = 0

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      engine.advance(dt)
      if (now - lastNotify > 120) {
        lastNotify = now
        engine.notify()
      }
      const cam = fitCamera(engine.world, width, height, yawRef.current)
      drawWorld(ctx, engine.world, cam, engine.selectedId)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId)
      dragRef.current = { x: e.clientX, yaw: yawRef.current }
    }
    const onMove = (e: PointerEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.x
      yawRef.current = dragRef.current.yaw + dx * 0.008
    }
    const onUp = (e: PointerEvent) => {
      const drag = dragRef.current
      dragRef.current = null
      if (!drag) return
      if (Math.abs(e.clientX - drag.x) > 4) return
      const rect = canvas.getBoundingClientRect()
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top
      const cam = fitCamera(engine.world, width, height, yawRef.current)
      const id = hitBlob(engine.world, cam, sx, sy)
      engine.select(id)
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', () => {
      dragRef.current = null
    })

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
    }
  }, [engine])

  return (
    <div className="garden" ref={wrapRef}>
      <canvas ref={canvasRef} aria-label="Living garden dish" />
      <p className="garden-hint">Drag to turn the dish. Click a blob to inspect it.</p>
    </div>
  )
}

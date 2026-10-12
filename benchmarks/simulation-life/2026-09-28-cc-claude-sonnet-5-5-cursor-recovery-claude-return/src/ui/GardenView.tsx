import { useEffect, useRef } from 'react'
import { GardenScene } from '../render/scene'
import type { Runner } from '../sim/runner'

interface Props {
  runner: Runner
  selectedId: number | null
  follow: boolean
  onPick: (id: number | null) => void
  onFrame: () => void
  onScene?: (scene: GardenScene | null) => void
}

export function GardenView({ runner, selectedId, follow, onPick, onFrame, onScene }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const scene = useRef<GardenScene | null>(null)
  const cb = useRef({ onPick, onFrame })
  cb.current = { onPick, onFrame }

  useEffect(() => {
    const el = host.current
    if (!el) return
    const s = new GardenScene(el)
    scene.current = s
    onScene?.(s)
    s.onPick = (id) => cb.current.onPick(id)
    let raf = 0
    let last = performance.now()
    let uiClock = 0
    const loop = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000))
      last = now
      runner.frame(dt)
      s.update(runner.world, runner.alpha, dt, runner.frameSpeed)
      uiClock += dt
      if (uiClock >= 0.2) {
        uiClock = 0
        cb.current.onFrame()
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      onScene?.(null)
      s.dispose()
      scene.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runner])

  useEffect(() => {
    scene.current?.select(selectedId)
  }, [selectedId])

  useEffect(() => {
    scene.current?.setFollow(follow)
  }, [follow])

  return <div ref={host} className="garden-canvas" />
}

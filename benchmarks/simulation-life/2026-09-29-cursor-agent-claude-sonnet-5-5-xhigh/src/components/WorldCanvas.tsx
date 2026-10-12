import { useEffect, useRef } from 'react';
import type { Simulator } from '../sim/controller';
import type { WorldView } from '../render/worldView';

interface Props {
  sim: Simulator;
  view: WorldView;
  onPick: (id: number) => void;
}

interface Drag {
  active: boolean;
  moved: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  id: number;
}

export function WorldCanvas({ sim, view, onPick }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag>({ active: false, moved: 0, x: 0, y: 0, vx: 0, vy: 0, t: 0, id: -1 });

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(240, Math.round(r.width));
      const h = Math.max(240, Math.round(r.height));
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      view.resize(w, h, dpr, sim.world.radius);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      const d = drag.current;
      if (!d.active && (Math.abs(d.vx) > 4 || Math.abs(d.vy) > 4)) {
        view.cam.orbit(d.vx * dt, d.vy * dt);
        const k = Math.exp(-7 * dt);
        d.vx *= k;
        d.vy *= k;
      }
      sim.frame(dt);
      view.render(ctx, sim, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      view.cam.setZoom(view.cam.zoom * Math.exp(-e.deltaY * 0.01));
    };
    canvas.addEventListener('wheel', wheel, { passive: false });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('wheel', wheel);
    };
  }, [sim, view]);

  const local = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <canvas
      ref={ref}
      className="world-canvas"
      tabIndex={0}
      aria-label="Living garden. Drag to rotate, click a blob to inspect it."
      onPointerDown={(e) => {
        const p = local(e);
        const d = drag.current;
        d.active = true;
        d.moved = 0;
        d.x = p.x;
        d.y = p.y;
        d.vx = 0;
        d.vy = 0;
        d.t = performance.now();
        d.id = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.cursor = 'grabbing';
      }}
      onPointerMove={(e) => {
        const p = local(e);
        const d = drag.current;
        if (d.active && d.id === e.pointerId) {
          const dx = p.x - d.x;
          const dy = p.y - d.y;
          d.moved += Math.abs(dx) + Math.abs(dy);
          d.x = p.x;
          d.y = p.y;
          if (d.moved > 4) {
            view.cam.orbit(dx, dy);
            const now = performance.now();
            const gap = Math.max(8, now - d.t) / 1000;
            d.t = now;
            const cap = (v: number) => Math.max(-900, Math.min(900, v));
            d.vx = d.vx * 0.4 + cap(dx / gap) * 0.6;
            d.vy = d.vy * 0.4 + cap(dy / gap) * 0.6;
          }
        } else {
          const id = view.pick(p.x, p.y);
          view.hoverId = id;
          e.currentTarget.style.cursor = id ? 'pointer' : 'grab';
        }
      }}
      onPointerUp={(e) => {
        const p = local(e);
        const d = drag.current;
        if (d.id !== e.pointerId) return;
        d.active = false;
        d.id = -1;
        if (performance.now() - d.t > 90) {
          d.vx = 0;
          d.vy = 0;
        }
        if (d.moved <= 4) {
          d.vx = 0;
          d.vy = 0;
          const id = view.pick(p.x, p.y);
          view.selectedId = id;
          onPick(id);
        }
        e.currentTarget.style.cursor = view.hoverId ? 'pointer' : 'grab';
      }}
      onPointerCancel={() => {
        drag.current.active = false;
      }}
      onPointerLeave={() => {
        view.hoverId = 0;
      }}
      onKeyDown={(e) => {
        const step = 14;
        if (e.key === 'ArrowLeft') view.cam.orbit(-step, 0);
        else if (e.key === 'ArrowRight') view.cam.orbit(step, 0);
        else if (e.key === 'ArrowUp') view.cam.orbit(0, step);
        else if (e.key === 'ArrowDown') view.cam.orbit(0, -step);
        else if (e.key === '+' || e.key === '=') view.cam.setZoom(view.cam.zoom * 1.1);
        else if (e.key === '-') view.cam.setZoom(view.cam.zoom / 1.1);
        else return;
        e.preventDefault();
      }}
    />
  );
}

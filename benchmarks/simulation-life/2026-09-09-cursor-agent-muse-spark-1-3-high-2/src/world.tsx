import { useEffect, useRef } from 'react';
import type { Blob, Tree, World } from './sim';
import { radiusOf } from './sim';

interface Props {
  world: World;
  version: number;
  selectedId: number | null;
  onSelect: (b: Blob | null) => void;
  angle: number;
  onAngle: (a: number) => void;
}

interface P {
  sx: number;
  sy: number;
  depth: number;
  scale: number;
}

export default function WorldView({ world, selectedId, onSelect, angle, onAngle }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(angle);
  const worldRef = useRef(world);
  angleRef.current = angle;
  worldRef.current = world;
  const drag = useRef<{ x: number; a0: number; on: boolean }>({ x: 0, a0: 0, on: false });
  const projCache = useRef(new Map<number, P>());

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let tAnim = 0;

    const resize = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(320, r.width * dpr);
      cv.height = Math.max(320, r.height * dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const proj = (x: number, z: number, w: number, h: number, R: number): P => {
      const a = angleRef.current;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      const rx = x * ca - z * sa;
      const rz = x * sa + z * ca;
      const scale = Math.min(w, h) / (R * 2.5);
      const cx = w / 2;
      const cy = h / 2 + 8;
      return { sx: cx + rx * scale, sy: cy + rz * scale * 0.58, depth: rz, scale };
    };

    const draw = () => {
      tAnim += 1;
      const w = worldRef.current;
      const W = cv.width;
      const H = cv.height;
      const R = radiusOf(w.params);
      ctx.clearRect(0, 0, W, H);

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#fdf6ec');
      g.addColorStop(1, '#f3e7d3');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);

      const c = proj(0, 0, W, H, R);
      const rx = R * c.scale;
      const ry = R * c.scale * 0.58;

      ctx.save();
      ctx.shadowColor = 'rgba(120,80,30,0.35)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      ctx.fillStyle = '#e8b96f';
      ctx.beginPath();
      ctx.ellipse(c.sx, c.sy + 26, rx * 1.02, ry * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#d9a45b';
      ctx.beginPath();
      ctx.ellipse(c.sx, c.sy + 26, rx * 1.02, ry * 1.02, 0, 0, Math.PI);
      ctx.fill();

      const soil = ctx.createRadialGradient(c.sx, c.sy, 10, c.sx, c.sy, rx);
      soil.addColorStop(0, '#8fce6e');
      soil.addColorStop(0.65, '#6db95c');
      soil.addColorStop(1, '#4f9e52');
      ctx.fillStyle = soil;
      ctx.beginPath();
      ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.ellipse(c.sx, c.sy, (rx * i) / 4, (ry * i) / 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(c.sx - rx * 0.3, c.sy - ry * 0.35, rx * 0.22, ry * 0.14, -0.4, 0, Math.PI * 2);
      ctx.fill();

      const items: { d: number; kind: 'tree' | 'blob'; o: Tree | Blob }[] = [];
      for (const t of w.trees) {
        const pp = proj(t.x, t.z, W, H, R);
        items.push({ d: pp.depth, kind: 'tree', o: t });
      }
      for (const b of w.blobs) {
        const pp = proj(b.x, b.z, W, H, R);
        items.push({ d: pp.depth, kind: 'blob', o: b });
      }
      items.sort((a, b) => a.d - b.d);
      projCache.current.clear();

      for (const it of items) {
        if (it.kind === 'tree') {
          const t = it.o as Tree;
          const pp = proj(t.x, t.z, W, H, R);
          const s = pp.scale * 0.055 * t.size;
          ctx.fillStyle = 'rgba(40,60,30,0.25)';
          ctx.beginPath();
          ctx.ellipse(pp.sx, pp.sy, 26 * s * 2.2, 9 * s * 2.2, 0, 0, Math.PI * 2);
          ctx.fill();
          const sway = Math.sin(tAnim * 0.03 + t.phase) * 3;
          ctx.fillStyle = '#8a5a33';
          ctx.fillRect(pp.sx - 3.5 * s * 2, pp.sy - 34 * s * 2, 7 * s * 2, 34 * s * 2);
          const bob = Math.sin(tAnim * 0.04 + t.phase) * 1.5;
          const greens = ['#2f7d3b', '#3d9950', '#55b567'];
          greens.forEach((col, i) => {
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(pp.sx + sway * 0.4 + (i - 1) * 13 * s * 2, pp.sy - 44 * s * 2 + bob - i * 5, 15 * s * 2, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.beginPath();
          ctx.arc(pp.sx - 12 * s * 2 + sway * 0.4, pp.sy - 52 * s * 2, 8 * s * 2, 0, Math.PI * 2);
          ctx.fill();
          const n = Math.round(t.fruit);
          for (let i = 0; i < n; i++) {
            const fa = (i / Math.max(n, 1)) * Math.PI * 2 + t.phase;
            const fx = pp.sx + Math.cos(fa) * 17 * s * 2 + sway * 0.4;
            const fy = pp.sy - 44 * s * 2 + Math.sin(fa) * 10 * s * 2 + bob;
            const shrink = t.delay > 0 ? 0.7 : 1;
            ctx.fillStyle = '#ffdf6b';
            ctx.beginPath();
            ctx.arc(fx, fy, 4.6 * s * 2 * shrink, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#7ed957';
            ctx.beginPath();
            ctx.arc(fx - 1.4, fy - 1.4, 1.6 * s * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          if (t.delay > 0) {
            ctx.fillStyle = 'rgba(90,60,20,0.7)';
            ctx.font = `${Math.round(11 * (W / 600) + 8)}px system-ui`;
            ctx.fillText('…', pp.sx - 5, pp.sy - 12);
          }
        } else {
          const b = it.o as Blob;
          const pp = proj(b.x, b.z, W, H, R);
          projCache.current.set(b.id, pp);
          const blue = b.kind === 'blue';
          const bounce = Math.abs(Math.sin(b.wob)) * 5 * (W / 600);
          const sy = pp.sy - 12 - bounce;
          const lean = Math.max(-0.25, Math.min(0.25, b.vx * 0.12));
          const sel = b.id === selectedId;
          const sz = (blue ? 15 : 16) * (W / 620) * (0.85 + b.energy / 220);
          ctx.fillStyle = 'rgba(40,50,30,0.28)';
          ctx.beginPath();
          ctx.ellipse(pp.sx, pp.sy + 2, sz * 0.95, sz * 0.32, 0, 0, Math.PI * 2);
          ctx.fill();
          if (sel) {
            ctx.strokeStyle = '#7c5cff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(pp.sx, pp.sy + 2, sz * 1.35, sz * 0.62, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
          if (b.glow > 0) {
            ctx.fillStyle = blue ? 'rgba(160,220,255,0.5)' : 'rgba(255,150,160,0.5)';
            ctx.beginPath();
            ctx.arc(pp.sx, sy, sz * 1.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.save();
          ctx.translate(pp.sx, sy);
          ctx.rotate(lean);
          const bodyG = ctx.createLinearGradient(0, -sz, 0, sz);
          if (blue) {
            bodyG.addColorStop(0, '#bfe4ff');
            bodyG.addColorStop(0.45, '#5aa9ff');
            bodyG.addColorStop(1, '#2f6fe4');
          } else {
            bodyG.addColorStop(0, '#ffc9c9');
            bodyG.addColorStop(0.45, '#ff5d6c');
            bodyG.addColorStop(1, '#c81e3a');
          }
          ctx.fillStyle = bodyG;
          ctx.beginPath();
          ctx.ellipse(0, 0, sz, sz * 1.08, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.55)';
          ctx.beginPath();
          ctx.ellipse(-sz * 0.38, -sz * 0.45, sz * 0.28, sz * 0.16, -0.6, 0, Math.PI * 2);
          ctx.fill();
          const chew = b.action === 'eat' || b.action === 'pause' ? Math.abs(Math.sin(tAnim * 0.5)) * 2 : 0;
          const eyeY = -sz * 0.1;
          const blink = b.blinkT ? 0.12 : 1;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(-sz * 0.32, eyeY, sz * 0.22, sz * 0.26 * blink, 0, 0, Math.PI * 2);
          ctx.ellipse(sz * 0.32, eyeY, sz * 0.22, sz * 0.26 * blink, 0, 0, Math.PI * 2);
          ctx.fill();
          if (!b.blinkT) {
            ctx.fillStyle = '#243043';
            const look = Math.max(-2, Math.min(2, b.vx * 1.2));
            ctx.beginPath();
            ctx.arc(-sz * 0.32 + look, eyeY + 1, sz * 0.11, 0, Math.PI * 2);
            ctx.arc(sz * 0.32 + look, eyeY + 1, sz * 0.11, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(-sz * 0.32 + look + 1, eyeY, sz * 0.04, 0, Math.PI * 2);
            ctx.arc(sz * 0.32 + look + 1, eyeY, sz * 0.04, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = '#3a2b2b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (b.action === 'eat') ctx.arc(0, eyeY + sz * 0.35, 4 + chew, 0, Math.PI);
          else if (b.action === 'pause') ctx.arc(0, eyeY + sz * 0.42, 5, 0, Math.PI * 2);
          else ctx.arc(0, eyeY + sz * 0.3, 5, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.stroke();
          ctx.restore();
          if (b.energy < 25) {
            ctx.fillStyle = 'rgba(60,40,40,0.8)';
            ctx.font = `${Math.round(12 * (W / 600) + 6)}px system-ui`;
            ctx.fillText('~', pp.sx - 4, sy - sz - 6);
          }
        }
      }
      for (const s of w.sparks) {
        const pp = proj(s.x, s.z, W, H, R);
        const k = 1 - s.t / s.life;
        ctx.globalAlpha = k;
        ctx.fillStyle = s.color;
        const rise = s.t * 1.2;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + s.t * 0.1;
          ctx.beginPath();
          ctx.arc(pp.sx + Math.cos(a) * 12 * k, pp.sy - 18 - rise + Math.sin(a) * 8 * k, 3 * k + 1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(80,60,40,0.75)';
      ctx.font = '12px system-ui';
      ctx.fillText('drag dish to rotate · click a blob', 12, H - 14);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const down = (e: PointerEvent) => {
      drag.current = { x: e.clientX, a0: angleRef.current, on: true };
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag.current.on) return;
      const dx = e.clientX - drag.current.x;
      if (Math.abs(dx) > 3) {
        onAngle(drag.current.a0 + dx * 0.008);
        (drag as { moved?: boolean }).moved = true;
      }
    };
    const up = (e: PointerEvent) => {
      const wasDrag = (drag as { moved?: boolean }).moved;
      drag.current.on = false;
      (drag as { moved?: boolean }).moved = false;
      if (wasDrag) return;
      const rect = cv.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (cv.width / rect.width);
      const my = (e.clientY - rect.top) * (cv.height / rect.height);
      let best: Blob | null = null;
      let bd = 34 * (cv.width / 600);
      projCache.current.forEach((pp, id) => {
        const d = Math.hypot(pp.sx - mx, pp.sy - 14 - my);
        if (d < bd) {
          bd = d;
          best = worldRef.current.blobs.find((b) => b.id === id) ?? null;
        }
      });
      onSelect(best);
    };
    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
    };
  }, []);

  return <canvas ref={ref} className="worldCanvas" />;
}

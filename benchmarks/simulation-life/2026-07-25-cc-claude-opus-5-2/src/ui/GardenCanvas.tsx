import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { DT, type World } from "../sim/world";
import {
  drawScene,
  makeCamera,
  pick,
  spawnParticles,
  stepParticles,
  type Particle,
} from "./scene";

interface Props {
  worldRef: MutableRefObject<World>;
  running: boolean;
  speed: number;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  /** Called a few times a second so the panels can refresh without a re-render per frame. */
  onPulse: () => void;
}

export function GardenCanvas({
  worldRef,
  running,
  speed,
  selectedId,
  onSelect,
  onPulse,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const yaw = useRef(0.62);
  const particles = useRef<Particle[]>([]);
  const live = useRef({ running, speed, selectedId, onSelect, onPulse });
  live.current = { running, speed, selectedId, onSelect, onPulse };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let pulse = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      const world = worldRef.current;

      if (live.current.running) {
        carry += dt * live.current.speed;
        let steps = 0;
        // Cap the catch-up work so a slow frame can never spiral.
        const budget = Math.ceil((live.current.speed * 0.12) / DT) + 4;
        while (carry >= DT && steps < budget) {
          world.step();
          carry -= DT;
          steps++;
        }
        if (carry > DT * 8) carry = 0;
      }

      spawnParticles(world.drainEvents(), particles.current);
      stepParticles(particles.current, dt);

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cam = makeCamera(w, h, world.radius, yaw.current);
      drawScene(ctx, world, cam, particles.current, live.current.selectedId, w, h);

      pulse += dt;
      if (pulse > 0.2) {
        pulse = 0;
        live.current.onPulse();
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [worldRef]);

  // Drag to spin the dish; a click that barely moves selects a blob instead.
  useEffect(() => {
    const canvas = canvasRef.current!;
    let down = false;
    let moved = 0;
    let lastX = 0;

    const onDown = (e: PointerEvent) => {
      down = true;
      moved = 0;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
      canvas.classList.add("dragging");
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      yaw.current += dx * 0.0075;
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      down = false;
      canvas.classList.remove("dragging");
      if (moved < 4) {
        const rect = canvas.getBoundingClientRect();
        const cam = makeCamera(rect.width, rect.height, worldRef.current.radius, yaw.current);
        const hit = pick(worldRef.current, cam, e.clientX - rect.left, e.clientY - rect.top);
        live.current.onSelect(hit ? hit.id : null);
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, [worldRef]);

  return <canvas ref={canvasRef} />;
}

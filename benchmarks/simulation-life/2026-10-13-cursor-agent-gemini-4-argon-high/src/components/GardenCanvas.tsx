import React, { useEffect, useRef, useState } from 'react';
import {
  Compass,
  Eye,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { GardenSimulation } from '../simulation/engine.ts';
import type { BlobEntity, TreeEntity } from '../simulation/types.ts';

interface GardenCanvasProps {
  sim: GardenSimulation;
  selectedBlobId: number | null;
  onSelectBlob: (id: number | null) => void;
  renderTick: number;
}

interface ProjectedPoint {
  sx: number;
  sy: number;
  depth: number;
  scale: number;
}

export const GardenCanvas: React.FC<GardenCanvasProps> = ({
  sim,
  selectedBlobId,
  onSelectBlob,
  renderTick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [theta, setTheta] = useState<number>(0.62); // Horizontal rotation angle (radians)
  const [phi, setPhi] = useState<number>(0.76); // Vertical tilt angle (radians, 0.38 to 1.25)
  const [zoom, setZoom] = useState<number>(1.0);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showAllVision, setShowAllVision] = useState<boolean>(false);
  const [hoveredBlobId, setHoveredBlobId] = useState<number | null>(null);

  const dragState = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startTheta: number;
    startPhi: number;
    movedDistance: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startTheta: 0.62,
    startPhi: 0.76,
    movedDistance: 0,
  });

  // Cache projected blob positions for click/hover picking
  const projectedBlobsRef = useRef<
    Array<{ id: number; sx: number; sy: number; r: number; depth: number }>
  >([]);

  // Gentle auto-rotation when toggled
  useEffect(() => {
    if (!autoRotate) return;
    let animId = 0;
    const tick = () => {
      if (!dragState.current.isDragging) {
        setTheta((prev) => (prev + 0.0035) % (Math.PI * 2));
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(300, Math.floor(rect.height));

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.clearRect(0, 0, width, height);

    const worldSize = sim.config.worldSize;
    const baseScale =
      (Math.min(width, height) * 0.425) / Math.max(180, worldSize);
    const scale = baseScale * zoom;
    const centerX = width * 0.5;
    const centerY = height * 0.52;

    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);

    const project = (x: number, y: number, z: number): ProjectedPoint => {
      const rx = x * cosT - z * sinT;
      const rz = x * sinT + z * cosT;
      // Subtle perspective foreshortening for authentic 3D tabletop depth
      const perspective = 1 + (rz / (worldSize * 3.8)) * 0.14;
      const sx = centerX + rx * scale * perspective;
      const sy = centerY + (rz * sinP - y * cosP) * scale * perspective;
      return { sx, sy, depth: rz, scale: scale * perspective };
    };

    // 1. Draw Tabletop Drop Shadow under the 3D Dish
    const dishRadiusPx = worldSize * scale;
    const dishRadiusY = dishRadiusPx * sinP;
    const dishWallHeightPx = 28 * scale * cosP;

    ctx.save();
    const shadowGrad = ctx.createRadialGradient(
      centerX + 8,
      centerY + dishWallHeightPx + 14,
      dishRadiusPx * 0.2,
      centerX + 8,
      centerY + dishWallHeightPx + 14,
      dishRadiusPx * 1.14
    );
    shadowGrad.addColorStop(0, 'rgba(30, 41, 35, 0.26)');
    shadowGrad.addColorStop(0.75, 'rgba(30, 41, 35, 0.12)');
    shadowGrad.addColorStop(1, 'rgba(30, 41, 35, 0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(
      centerX + 8,
      centerY + dishWallHeightPx + 14,
      dishRadiusPx * 1.08,
      dishRadiusY * 1.08 + 10,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // 2. Draw 3D Raised Dish Wall (Terracotta / Warm Ceramic Planter Base)
    const rimOuterR = worldSize * 1.045 * scale;
    const rimOuterRY = rimOuterR * sinP;

    // Lower soil/ceramic cylinder wall
    ctx.save();
    const wallGrad = ctx.createLinearGradient(
      centerX - rimOuterR,
      centerY,
      centerX + rimOuterR,
      centerY
    );
    wallGrad.addColorStop(0, '#9E583B');
    wallGrad.addColorStop(0.28, '#C87A55');
    wallGrad.addColorStop(0.55, '#B56745');
    wallGrad.addColorStop(0.85, '#8A492F');
    wallGrad.addColorStop(1, '#6E3822');

    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, rimOuterR, rimOuterRY, 0, 0, Math.PI, false);
    ctx.lineTo(centerX - rimOuterR, centerY + dishWallHeightPx);
    ctx.ellipse(
      centerX,
      centerY + dishWallHeightPx,
      rimOuterR * 0.97,
      rimOuterRY * 0.97,
      0,
      Math.PI,
      0,
      true
    );
    ctx.closePath();
    ctx.fill();

    // Subtle decorative band on the planter dish wall
    ctx.strokeStyle = 'rgba(255, 237, 213, 0.25)';
    ctx.lineWidth = Math.max(1.5, 2.5 * zoom);
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY + dishWallHeightPx * 0.48,
      rimOuterR * 0.99,
      rimOuterRY * 0.99,
      0,
      0.08,
      Math.PI - 0.08,
      false
    );
    ctx.stroke();
    ctx.restore();

    // 3. Draw Dish Rim Top Lip
    ctx.save();
    const lipGrad = ctx.createLinearGradient(
      centerX - rimOuterR,
      centerY - rimOuterRY,
      centerX + rimOuterR,
      centerY + rimOuterRY
    );
    lipGrad.addColorStop(0, '#E29B76');
    lipGrad.addColorStop(0.5, '#C97B56');
    lipGrad.addColorStop(1, '#9A5437');
    ctx.fillStyle = lipGrad;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, rimOuterR, rimOuterRY, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7C3F25';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // 4. Draw Lush Circular Meadow Surface
    ctx.save();
    const grassGrad = ctx.createRadialGradient(
      centerX - dishRadiusPx * 0.18,
      centerY - dishRadiusY * 0.18,
      dishRadiusPx * 0.05,
      centerX,
      centerY,
      dishRadiusPx
    );
    grassGrad.addColorStop(0, '#8AD879');
    grassGrad.addColorStop(0.55, '#68BE62');
    grassGrad.addColorStop(0.88, '#4FA350');
    grassGrad.addColorStop(1, '#3B843F');

    ctx.fillStyle = grassGrad;
    ctx.beginPath();
    ctx.ellipse(
      centerX,
      centerY,
      dishRadiusPx,
      dishRadiusY,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Inner soil/lip shadow ring
    ctx.strokeStyle = 'rgba(28, 64, 32, 0.35)';
    ctx.lineWidth = Math.max(2, 3.5 * zoom);
    ctx.stroke();

    // Concentric subtle garden contour rings & rotating compass ticks so rotation is super tactile
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1.2;
    for (const ringFrac of [0.35, 0.68]) {
      ctx.beginPath();
      ctx.ellipse(
        centerX,
        centerY,
        dishRadiusPx * ringFrac,
        dishRadiusY * ringFrac,
        0,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // Draw 12 rotating rim ticks on the planter lip so dragging to rotate feels immediately physical
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const p1 = project(
        Math.cos(a) * worldSize * 0.99,
        0,
        Math.sin(a) * worldSize * 0.99
      );
      const p2 = project(
        Math.cos(a) * worldSize * 1.04,
        0,
        Math.sin(a) * worldSize * 1.04
      );
      ctx.strokeStyle =
        i % 3 === 0 ? 'rgba(255, 247, 237, 0.55)' : 'rgba(255, 247, 237, 0.25)';
      ctx.lineWidth = i % 3 === 0 ? 2.2 : 1.2;
      ctx.beginPath();
      ctx.moveTo(p1.sx, p1.sy);
      ctx.lineTo(p2.sx, p2.sy);
      ctx.stroke();
    }
    ctx.restore();

    // 5. Draw Ground Decor (Clover patches, pebbles, grass tufts, tiny flowers)
    for (const decor of sim.groundDecor) {
      if (Math.hypot(decor.x, decor.z) > worldSize * 0.93) continue;
      const pt = project(decor.x, 0, decor.z);
      const s = pt.scale * decor.scale;
      if (decor.type === 'cloverPatch') {
        ctx.fillStyle = 'rgba(54, 132, 59, 0.28)';
        ctx.beginPath();
        ctx.ellipse(pt.sx, pt.sy, 11 * s, 11 * s * sinP, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (decor.type === 'pebble') {
        ctx.fillStyle = decor.colorVariant % 2 === 0 ? '#D6D3C9' : '#B8B4A9';
        ctx.beginPath();
        ctx.ellipse(pt.sx, pt.sy, 3.8 * s, 2.6 * s, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (decor.type === 'grass_tuft') {
        ctx.strokeStyle = '#2F7A38';
        ctx.lineWidth = Math.max(1, 1.3 * s);
        ctx.beginPath();
        ctx.moveTo(pt.sx, pt.sy);
        ctx.lineTo(pt.sx - 2.5 * s, pt.sy - 5 * s);
        ctx.moveTo(pt.sx, pt.sy);
        ctx.lineTo(pt.sx + 2 * s, pt.sy - 5.5 * s);
        ctx.stroke();
      } else if (decor.type === 'flower') {
        ctx.fillStyle =
          decor.colorVariant === 0
            ? '#FEF08A'
            : decor.colorVariant === 1
              ? '#FDE047'
              : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy - 1.5 * s, 2.3 * s, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 6. Draw Sensing Range Ring & Target Line for Selected / Hovered Blob (or all if toggled)
    const drawBlobVisionRing = (blob: BlobEntity, isPrimary: boolean) => {
      const visionRadius =
        (blob.group === 'blue'
          ? sim.config.blueVision
          : sim.config.redVision) * blob.traits.visionTrait;

      ctx.save();
      ctx.beginPath();
      const segments = 48;
      for (let i = 0; i <= segments; i++) {
        const ang = (i / segments) * Math.PI * 2;
        const vx = blob.x + Math.cos(ang) * visionRadius;
        const vz = blob.z + Math.sin(ang) * visionRadius;
        const p = project(vx, 0.5, vz);
        if (i === 0) ctx.moveTo(p.sx, p.sy);
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.strokeStyle =
        blob.group === 'blue'
          ? isPrimary
            ? 'rgba(37, 99, 235, 0.65)'
            : 'rgba(37, 99, 235, 0.22)'
          : isPrimary
            ? 'rgba(225, 29, 72, 0.65)'
            : 'rgba(225, 29, 72, 0.22)';
      ctx.lineWidth = isPrimary ? 2 : 1;
      ctx.setLineDash([5, 5]);
      ctx.stroke();

      if (isPrimary) {
        ctx.fillStyle =
          blob.group === 'blue'
            ? 'rgba(59, 130, 246, 0.08)'
            : 'rgba(244, 63, 94, 0.08)';
        ctx.fill();
      }
      ctx.restore();

      // If primary selected blob has a target tree or target blob, draw a cute dotted line to it
      if (isPrimary) {
        const bPt = project(blob.x, 4, blob.z);
        if (blob.targetTreeId !== null) {
          const t = sim.trees.find((tr) => tr.id === blob.targetTreeId);
          if (t) {
            const tPt = project(t.x, 8, t.z);
            ctx.save();
            ctx.strokeStyle = 'rgba(22, 163, 74, 0.7)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(bPt.sx, bPt.sy);
            ctx.lineTo(tPt.sx, tPt.sy);
            ctx.stroke();
            ctx.restore();
          }
        } else if (blob.targetBlobId !== null) {
          const targetB = sim.blobs.find((b) => b.id === blob.targetBlobId);
          if (targetB) {
            const tPt = project(targetB.x, 6, targetB.z);
            ctx.save();
            ctx.strokeStyle =
              blob.group === 'red'
                ? 'rgba(225, 29, 72, 0.65)'
                : 'rgba(245, 158, 11, 0.65)';
            ctx.lineWidth = 1.8;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(bPt.sx, bPt.sy);
            ctx.lineTo(tPt.sx, tPt.sy);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    };

    if (showAllVision) {
      for (const b of sim.blobs) {
        drawBlobVisionRing(b, b.id === selectedBlobId);
      }
    } else {
      const sel = sim.blobs.find((b) => b.id === selectedBlobId);
      if (sel) drawBlobVisionRing(sel, true);
      const hov =
        hoveredBlobId && hoveredBlobId !== selectedBlobId
          ? sim.blobs.find((b) => b.id === hoveredBlobId)
          : undefined;
      if (hov) drawBlobVisionRing(hov, false);
    }

    // 7. Build depth-sorted render list of Trees, Blobs, and Effects
    type RenderItem =
      | { kind: 'tree'; depth: number; tree: TreeEntity }
      | { kind: 'blob'; depth: number; blob: BlobEntity }
      | {
          kind: 'effect';
          depth: number;
          fx: (typeof sim.effects)[number];
        };

    const renderList: RenderItem[] = [];
    for (const tree of sim.trees) {
      const p = project(tree.x, 0, tree.z);
      renderList.push({ kind: 'tree', depth: p.depth, tree });
    }
    for (const blob of sim.blobs) {
      const p = project(blob.x, 0, blob.z);
      renderList.push({ kind: 'blob', depth: p.depth, blob });
    }
    for (const fx of sim.effects) {
      const p = project(fx.x, fx.y, fx.z);
      renderList.push({ kind: 'effect', depth: p.depth + 6, fx });
    }

    renderList.sort((a, b) => a.depth - b.depth);

    const newProjectedBlobs: Array<{
      id: number;
      sx: number;
      sy: number;
      r: number;
      depth: number;
    }> = [];

    // 8. Render sorted 3D items
    for (const item of renderList) {
      if (item.kind === 'tree') {
        drawTree(ctx, item.tree, project, sinP, sim.time);
      } else if (item.kind === 'blob') {
        const hit = drawBlob(
          ctx,
          item.blob,
          project,
          sinP,
          theta,
          item.blob.id === selectedBlobId,
          item.blob.id === hoveredBlobId
        );
        newProjectedBlobs.push(hit);
      } else {
        drawEffect(ctx, item.fx, project, sinP);
      }
    }

    projectedBlobsRef.current = newProjectedBlobs;
    ctx.restore();
  }, [
    sim,
    sim.time,
    renderTick,
    theta,
    phi,
    zoom,
    selectedBlobId,
    hoveredBlobId,
    showAllVision,
  ]);

  const findBlobAtPoint = (
    clientX: number,
    clientY: number
  ): number | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Pick closest frontmost blob within generous hit radius
    let bestId: number | null = null;
    let bestDist = Infinity;
    for (const b of projectedBlobsRef.current) {
      const d = Math.hypot(x - b.sx, y - b.sy);
      const hitRadius = Math.max(20, b.r * 1.45);
      if (d <= hitRadius && d < bestDist) {
        bestDist = d;
        bestId = b.id;
      }
    }
    return bestId;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      startTheta: theta,
      startPhi: phi,
      movedDistance: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragState.current.isDragging) {
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      dragState.current.movedDistance = Math.hypot(dx, dy);

      setTheta(dragState.current.startTheta - dx * 0.0085);
      setPhi(
        Math.max(
          0.38,
          Math.min(1.22, dragState.current.startPhi + dy * 0.0065)
        )
      );
    } else {
      const hitId = findBlobAtPoint(e.clientX, e.clientY);
      setHoveredBlobId(hitId);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragState.current.isDragging) {
      const moved = dragState.current.movedDistance;
      dragState.current.isDragging = false;
      e.currentTarget.releasePointerCapture(e.pointerId);

      // If it was a click (not a drag), inspect the clicked blob
      if (moved < 7) {
        const hitId = findBlobAtPoint(e.clientX, e.clientY);
        onSelectBlob(hitId);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.max(0.68, Math.min(1.75, Number((z + delta).toFixed(2)))));
  };

  return (
    <div className="relative w-full h-full flex flex-col select-none">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className={`w-full h-full block touch-none ${
          hoveredBlobId !== null ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Top-Left Legend & Dish Hint Pill */}
      <div className="pointer-events-none absolute top-3 left-3 flex flex-wrap items-center gap-2">
        <div className="bg-white/90 backdrop-blur-md border border-[#E5DEC9] rounded-full px-3 py-1.5 shadow-sm flex items-center gap-3 text-xs font-medium text-[#334139]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] ring-2 ring-emerald-200 inline-block" />
            Green Fruit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB] ring-2 ring-blue-200 inline-block" />
            Blue Blobs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48] ring-2 ring-rose-200 inline-block" />
            Red Blobs
          </span>
        </div>

        <div className="bg-white/80 backdrop-blur-sm border border-[#E5DEC9] rounded-full px-2.5 py-1 text-[11px] text-[#5C6B62] hidden sm:flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-emerald-700" />
          Drag dish to rotate 3D • Click any blob to inspect
        </div>
      </div>

      {/* Bottom-Right Camera & Overlay Controls */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-[#E5DEC9] rounded-full p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setShowAllVision((v) => !v)}
          title="Toggle sensing range rings for all blobs"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
            showAllVision
              ? 'bg-emerald-600 text-white'
              : 'text-[#334139] hover:bg-[#F2EDE2]'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Vision Rings</span>
        </button>

        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          title="Auto-rotate tabletop dish"
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition ${
            autoRotate
              ? 'bg-amber-600 text-white'
              : 'text-[#334139] hover:bg-[#F2EDE2]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Spin Dish</span>
        </button>

        <div className="h-4 w-[1px] bg-[#E5DEC9]" />

        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(1.75, Number((z + 0.15).toFixed(2))))}
          title="Zoom in"
          className="p-1.5 rounded-full text-[#334139] hover:bg-[#F2EDE2] transition"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.68, Number((z - 0.15).toFixed(2))))}
          title="Zoom out"
          className="p-1.5 rounded-full text-[#334139] hover:bg-[#F2EDE2] transition"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setTheta(0.62);
            setPhi(0.76);
            setZoom(1.0);
          }}
          title="Reset camera angle"
          className="p-1.5 rounded-full text-[#334139] hover:bg-[#F2EDE2] transition"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: TreeEntity,
  project: (x: number, y: number, z: number) => ProjectedPoint,
  sinP: number,
  simTime: number
) {
  const basePt = project(tree.x, 0, tree.z);
  const s = basePt.scale;
  const sway = Math.sin(simTime * 1.8 + tree.swayOffset) * 1.8;

  // 1. Soft tree ground shadow
  ctx.save();
  ctx.fillStyle = 'rgba(20, 50, 26, 0.24)';
  ctx.beginPath();
  ctx.ellipse(
    basePt.sx + 4 * s,
    basePt.sy + 2 * s,
    tree.canopyRadius * 1.05 * s,
    tree.canopyRadius * 1.05 * s * sinP,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 2. Wooden trunk
  const topTrunkPt = project(tree.x + sway * 0.3, tree.trunkHeight, tree.z);
  const trunkW = 5.2 * tree.scale * s;
  const trunkGrad = ctx.createLinearGradient(
    basePt.sx - trunkW,
    basePt.sy,
    basePt.sx + trunkW,
    basePt.sy
  );
  trunkGrad.addColorStop(0, '#5C3A21');
  trunkGrad.addColorStop(0.4, '#8B5A2B');
  trunkGrad.addColorStop(1, '#4A2E19');

  ctx.fillStyle = trunkGrad;
  ctx.beginPath();
  ctx.moveTo(basePt.sx - trunkW * 1.15, basePt.sy);
  ctx.lineTo(topTrunkPt.sx - trunkW * 0.75, topTrunkPt.sy);
  ctx.lineTo(topTrunkPt.sx + trunkW * 0.75, topTrunkPt.sy);
  ctx.lineTo(basePt.sx + trunkW * 1.15, basePt.sy);
  ctx.closePath();
  ctx.fill();

  // 3. Multi-sphere lush tree canopy
  const canopyCenterPt = project(
    tree.x + sway,
    tree.trunkHeight + tree.canopyRadius * 0.55,
    tree.z
  );
  const rMain = tree.canopyRadius * s;

  const lobes = [
    { dx: -rMain * 0.42, dy: rMain * 0.12, r: rMain * 0.72, dark: true },
    { dx: rMain * 0.42, dy: rMain * 0.14, r: rMain * 0.7, dark: true },
    { dx: 0, dy: -rMain * 0.18, r: rMain * 0.88, dark: false },
  ];

  for (const lobe of lobes) {
    const lx = canopyCenterPt.sx + lobe.dx;
    const ly = canopyCenterPt.sy + lobe.dy;
    const grad = ctx.createRadialGradient(
      lx - lobe.r * 0.3,
      ly - lobe.r * 0.35,
      lobe.r * 0.1,
      lx,
      ly,
      lobe.r
    );
    if (lobe.dark) {
      grad.addColorStop(0, '#34A853');
      grad.addColorStop(0.7, '#217A3B');
      grad.addColorStop(1, '#165B2B');
    } else {
      grad.addColorStop(0, '#5CE07A');
      grad.addColorStop(0.55, '#2E9E4B');
      grad.addColorStop(1, '#1B6B31');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, lobe.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Draw Attached Green Fruits on the Canopy!
  // Sort slots back-to-front so front fruits sit crisply on top
  const projectedSlots = tree.slots.map((slot) => {
    const pt = project(
      tree.x + slot.localX + sway * 0.8,
      slot.localY,
      tree.z + slot.localZ
    );
    return { slot, pt };
  });
  projectedSlots.sort((a, b) => a.pt.depth - b.pt.depth);

  for (const { slot, pt } of projectedSlots) {
    if (slot.state === 'cooldown') {
      // Draw tiny empty stem node on branch so user sees where fruit was picked
      ctx.fillStyle = 'rgba(92, 58, 33, 0.6)';
      ctx.beginPath();
      ctx.arc(pt.sx, pt.sy, Math.max(1.2, 1.8 * s), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    const prog = Math.max(0.15, slot.growthProgress);
    const fruitR = (slot.state === 'ripe' ? 5.6 : 4.8 * prog) * s;

    // Stem
    ctx.strokeStyle = '#5C3A21';
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.beginPath();
    ctx.moveTo(pt.sx, pt.sy - fruitR * 0.8);
    ctx.lineTo(pt.sx + 1.5 * s, pt.sy - fruitR * 1.55);
    ctx.stroke();

    // Glossy green fruit body
    const fGrad = ctx.createRadialGradient(
      pt.sx - fruitR * 0.35,
      pt.sy - fruitR * 0.35,
      fruitR * 0.1,
      pt.sx,
      pt.sy,
      fruitR
    );
    if (slot.state === 'ripe') {
      fGrad.addColorStop(0, '#BEF264');
      fGrad.addColorStop(0.45, '#4ADE80');
      fGrad.addColorStop(1, '#15803D');
    } else if (slot.state === 'being_eaten') {
      fGrad.addColorStop(0, '#FEF08A');
      fGrad.addColorStop(0.5, '#4ADE80');
      fGrad.addColorStop(1, '#16A34A');
    } else {
      // Regrowing bud
      fGrad.addColorStop(0, '#D9F99D');
      fGrad.addColorStop(1, '#65A30D');
    }

    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy, fruitR, 0, Math.PI * 2);
    ctx.fill();

    // Outer crisp contour for ripe fruit
    ctx.strokeStyle = slot.state === 'ripe' ? '#14532D' : 'rgba(20, 83, 45, 0.5)';
    ctx.lineWidth = Math.max(0.8, 1.1 * s);
    ctx.stroke();

    // Specular shine dot on fruit
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(
      pt.sx - fruitR * 0.32,
      pt.sy - fruitR * 0.32,
      fruitR * 0.28,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

function drawBlob(
  ctx: CanvasRenderingContext2D,
  blob: BlobEntity,
  project: (x: number, y: number, z: number) => ProjectedPoint,
  sinP: number,
  cameraTheta: number,
  isSelected: boolean,
  isHovered: boolean
): { id: number; sx: number; sy: number; r: number; depth: number } {
  const groundPt = project(blob.x, 0, blob.z);
  const bodyPt = project(blob.x, blob.bounceHeight, blob.z);
  const s = bodyPt.scale * blob.traits.sizeTrait;

  const baseRadius = (blob.group === 'blue' ? 9.8 : 10.8) * s;
  const rx = baseRadius * blob.squish;
  const ry = baseRadius * (2 - blob.squish) * 0.94;

  ctx.save();

  // 1. Soft ground shadow (scales slightly smaller when jumping higher)
  const shadowScale = Math.max(0.65, 1 - blob.bounceHeight * 0.045);
  ctx.fillStyle = 'rgba(20, 35, 24, 0.28)';
  ctx.beginPath();
  ctx.ellipse(
    groundPt.sx,
    groundPt.sy,
    baseRadius * 1.05 * shadowScale,
    baseRadius * 1.05 * shadowScale * sinP,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 2. Selection / Hover ground ring
  if (isSelected || isHovered) {
    ctx.strokeStyle = isSelected ? '#F59E0B' : 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = isSelected ? 2.6 : 1.8;
    ctx.beginPath();
    ctx.ellipse(
      groundPt.sx,
      groundPt.sy,
      baseRadius * 1.55,
      baseRadius * 1.55 * sinP,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  // 3. Glow aura when eating fruit, pausing after contact, or newly born
  if (blob.glowIntensity > 0.05) {
    const auraR = baseRadius * (1.7 + blob.glowIntensity * 0.45);
    const auraGrad = ctx.createRadialGradient(
      bodyPt.sx,
      bodyPt.sy - ry * 0.5,
      baseRadius * 0.3,
      bodyPt.sx,
      bodyPt.sy - ry * 0.5,
      auraR
    );
    if (blob.action === 'eating_fruit') {
      auraGrad.addColorStop(0, `rgba(74, 222, 128, ${0.48 * blob.glowIntensity})`);
      auraGrad.addColorStop(1, 'rgba(74, 222, 128, 0)');
    } else if (blob.action === 'contact_pause') {
      auraGrad.addColorStop(0, `rgba(251, 113, 133, ${0.52 * blob.glowIntensity})`);
      auraGrad.addColorStop(1, 'rgba(251, 113, 133, 0)');
    } else {
      auraGrad.addColorStop(0, `rgba(250, 204, 21, ${0.45 * blob.glowIntensity})`);
      auraGrad.addColorStop(1, 'rgba(250, 204, 21, 0)');
    }
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(bodyPt.sx, bodyPt.sy - ry * 0.5, auraR, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Bean / Oval Glossy Body with Lean
  const centerX = bodyPt.sx;
  const centerY = bodyPt.sy - ry * 0.72;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(blob.leanAngle);

  const bodyGrad = ctx.createRadialGradient(
    -rx * 0.32,
    -ry * 0.35,
    rx * 0.12,
    0,
    0,
    Math.max(rx, ry) * 1.1
  );

  if (blob.group === 'blue') {
    bodyGrad.addColorStop(0, '#93C5FD');
    bodyGrad.addColorStop(0.38, '#3B82F6');
    bodyGrad.addColorStop(0.82, '#1D4ED8');
    bodyGrad.addColorStop(1, '#1E3A8A');
  } else {
    bodyGrad.addColorStop(0, '#FDA4AF');
    bodyGrad.addColorStop(0.38, '#F43F5E');
    bodyGrad.addColorStop(0.82, '#BE123C');
    bodyGrad.addColorStop(1, '#881337');
  }

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle dark outline so blobs pop crisply against grass & trees
  ctx.strokeStyle = blob.group === 'blue' ? '#172554' : '#4C0519';
  ctx.lineWidth = Math.max(1, 1.35 * bodyPt.scale);
  ctx.stroke();

  // Glossy jelly highlight pill on top-left
  ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
  ctx.beginPath();
  ctx.ellipse(
    -rx * 0.34,
    -ry * 0.38,
    rx * 0.28,
    ry * 0.17,
    -0.45,
    0,
    Math.PI * 2
  );
  ctx.fill();

  // 5. Simple Expressive Face!
  // Compute look direction in screen space from blob.heading + cameraTheta
  const screenHeading = blob.heading + cameraTheta;
  const faceShiftX = Math.cos(screenHeading) * rx * 0.22;
  const faceShiftY = Math.sin(screenHeading) * ry * 0.1;

  const eyeOffsetX = rx * 0.31;
  const eyeY = -ry * 0.04 + faceShiftY;
  const leftEyeX = -eyeOffsetX + faceShiftX;
  const rightEyeX = eyeOffsetX + faceShiftX;
  const eyeR = Math.max(1.5, rx * 0.16);

  // Rosy cheeks
  ctx.fillStyle =
    blob.group === 'blue'
      ? 'rgba(244, 114, 182, 0.55)'
      : 'rgba(253, 224, 71, 0.45)';
  ctx.beginPath();
  ctx.arc(leftEyeX - eyeR * 0.9, eyeY + eyeR * 1.1, eyeR * 0.75, 0, Math.PI * 2);
  ctx.arc(rightEyeX + eyeR * 0.9, eyeY + eyeR * 1.1, eyeR * 0.75, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (blinking, happy ^ ^ when eating/pausing, or wide alert)
  if (
    blob.blinkDuration > 0 ||
    blob.expression === 'chewing' ||
    blob.expression === 'proud'
  ) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = Math.max(1.3, eyeR * 0.75);
    ctx.lineCap = 'round';
    // Happy curved arc eyes ^ ^
    for (const ex of [leftEyeX, rightEyeX]) {
      ctx.beginPath();
      ctx.arc(ex, eyeY + eyeR * 0.2, eyeR * 0.85, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  } else {
    // White sclera + dark pupil
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, eyeR * 1.15, 0, Math.PI * 2);
    ctx.arc(rightEyeX, eyeY, eyeR * 1.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    const pupilShiftX = Math.cos(screenHeading) * eyeR * 0.32;
    const pupilShiftY = Math.sin(screenHeading) * eyeR * 0.25;
    ctx.beginPath();
    ctx.arc(
      leftEyeX + pupilShiftX,
      eyeY + pupilShiftY,
      eyeR * 0.68,
      0,
      Math.PI * 2
    );
    ctx.arc(
      rightEyeX + pupilShiftX,
      eyeY + pupilShiftY,
      eyeR * 0.68,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Red blobs have subtle mischievous brow tilt when seeking blue
    if (blob.group === 'red' && blob.action === 'seeking_blue') {
      ctx.strokeStyle = '#4C0519';
      ctx.lineWidth = Math.max(1.1, eyeR * 0.55);
      ctx.beginPath();
      ctx.moveTo(leftEyeX - eyeR, eyeY - eyeR * 1.35);
      ctx.lineTo(leftEyeX + eyeR * 0.8, eyeY - eyeR * 0.85);
      ctx.moveTo(rightEyeX + eyeR, eyeY - eyeR * 1.35);
      ctx.lineTo(rightEyeX - eyeR * 0.8, eyeY - eyeR * 0.85);
      ctx.stroke();
    }
  }

  // Cute Mouth
  const mouthX = faceShiftX;
  const mouthY = eyeY + eyeR * 1.45;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(1.1, eyeR * 0.55);
  if (blob.action === 'eating_fruit') {
    // Chewing mouth that opens and closes
    const chewOpen = (Math.sin(blob.bouncePhase * 2) + 1) * 0.5;
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, eyeR * (0.45 + chewOpen * 0.45), 0, Math.PI * 2);
    ctx.fill();
  } else if (blob.action === 'fleeing_red') {
    // Startled little 'o' mouth + sweat drop
    ctx.beginPath();
    ctx.arc(mouthX, mouthY, eyeR * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Cute sweat drop
    ctx.fillStyle = '#BAE6FD';
    ctx.beginPath();
    ctx.arc(rightEyeX + eyeR * 1.4, eyeY - eyeR * 1.2, eyeR * 0.6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Simple smile arc
    ctx.beginPath();
    ctx.arc(mouthX, mouthY - eyeR * 0.2, eyeR * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  ctx.restore(); // End body lean transform

  // 6. Action progress mini-pill above blob when eating fruit or in contact pause
  if (
    (blob.action === 'eating_fruit' || blob.action === 'contact_pause') &&
    blob.actionDuration > 0
  ) {
    const progress =
      1 - Math.max(0, blob.actionTimer) / Math.max(0.1, blob.actionDuration);
    const barW = 22 * bodyPt.scale;
    const barH = 4 * bodyPt.scale;
    const bx = centerX - barW * 0.5;
    const by = centerY - ry - 9 * bodyPt.scale;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, barH, 3);
    ctx.fill();

    ctx.fillStyle = blob.action === 'eating_fruit' ? '#4ADE80' : '#FB7185';
    ctx.beginPath();
    ctx.roundRect(bx, by, barW * Math.min(1, progress), barH, 3);
    ctx.fill();
  }

  // 7. Selected blob floating name tag
  if (isSelected) {
    const tagY = centerY - ry - 16 * bodyPt.scale;
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    const textW = ctx.measureText(blob.name).width;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.beginPath();
    ctx.roundRect(centerX - textW * 0.5 - 7, tagY - 11, textW + 14, 17, 8);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.fillText(blob.name, centerX, tagY + 1);
  }

  ctx.restore();

  return {
    id: blob.id,
    sx: centerX,
    sy: centerY,
    r: Math.max(rx, ry),
    depth: bodyPt.depth,
  };
}

function drawEffect(
  ctx: CanvasRenderingContext2D,
  fx: {
    type: string;
    x: number;
    y: number;
    z: number;
    color: string;
    secondaryColor?: string;
    age: number;
    duration: number;
    radius: number;
  },
  project: (x: number, y: number, z: number) => ProjectedPoint,
  sinP: number
) {
  const prog = Math.min(1, fx.age / Math.max(0.05, fx.duration));
  const alpha = 1 - prog;
  const pt = project(fx.x, fx.y + prog * 12, fx.z);
  const s = pt.scale;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (fx.type === 'contact_ring') {
    const groundPt = project(fx.x, 2, fx.z);
    const r = fx.radius * (0.4 + prog * 1.1) * s;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = Math.max(1.5, 3 * (1 - prog) * s);
    ctx.beginPath();
    ctx.ellipse(groundPt.sx, groundPt.sy, r, r * sinP, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Floating heart/energy sparkle
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy, 3.5 * s * (1 - prog * 0.4), 0, Math.PI * 2);
    ctx.fill();
  } else if (fx.type === 'eat_sparkle' || fx.type === 'fruit_pop') {
    ctx.fillStyle = fx.color;
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy, fx.radius * 0.55 * s * (1 - prog * 0.5), 0, Math.PI * 2);
    ctx.fill();
  } else if (fx.type === 'birth_burst') {
    const r = fx.radius * (0.3 + prog * 0.9) * s;
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 2 * s;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + prog;
      ctx.beginPath();
      ctx.moveTo(pt.sx + Math.cos(a) * r * 0.4, pt.sy + Math.sin(a) * r * 0.4);
      ctx.lineTo(pt.sx + Math.cos(a) * r, pt.sy + Math.sin(a) * r);
      ctx.stroke();
    }
  } else if (fx.type === 'fade_puff') {
    ctx.fillStyle = fx.color;
    const r = fx.radius * (0.5 + prog * 0.6) * s;
    ctx.beginPath();
    ctx.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

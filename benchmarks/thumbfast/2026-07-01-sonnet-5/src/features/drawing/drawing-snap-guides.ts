import { Line, type Canvas, type FabricObject } from "fabric";

const SNAP_THRESHOLD_PX = 8;
const GUIDE_COLOR = "#22c55e";

type Guide = { type: "vertical" | "horizontal"; position: number };

type Box = { left: number; top: number; width: number; height: number };

function snapPoints(box: Box) {
  return {
    xs: [box.left, box.left + box.width / 2, box.left + box.width],
    ys: [box.top, box.top + box.height / 2, box.top + box.height],
  };
}

function closest(
  candidates: number[],
  targets: number[],
  threshold: number,
): { position: number; delta: number } | null {
  let best: { position: number; delta: number } | null = null;
  for (const target of targets) {
    for (const candidate of candidates) {
      const delta = candidate - target;
      if (
        Math.abs(delta) <= threshold &&
        (!best || Math.abs(delta) < Math.abs(best.delta))
      ) {
        best = { position: candidate, delta };
      }
    }
  }
  return best;
}

/** Computes alignment guides + the offset to snap `target` against the canvas center and sibling objects. */
export function computeSnapGuides(
  canvas: Canvas,
  target: FabricObject,
): { guides: Guide[]; deltaX: number; deltaY: number } {
  const threshold = SNAP_THRESHOLD_PX / canvas.getZoom();
  const targetPoints = snapPoints(target.getBoundingRect());

  const referenceBoxes: Box[] = [
    { left: 0, top: 0, width: canvas.width, height: canvas.height },
    ...canvas
      .getObjects()
      .filter(
        (object) => object !== target && object.excludeFromExport !== true,
      )
      .map((object) => object.getBoundingRect()),
  ];

  const referenceXs = referenceBoxes.flatMap((box) => snapPoints(box).xs);
  const referenceYs = referenceBoxes.flatMap((box) => snapPoints(box).ys);

  const bestX = closest(referenceXs, targetPoints.xs, threshold);
  const bestY = closest(referenceYs, targetPoints.ys, threshold);

  const guides: Guide[] = [];
  if (bestX) guides.push({ type: "vertical", position: bestX.position });
  if (bestY) guides.push({ type: "horizontal", position: bestY.position });

  return { guides, deltaX: bestX?.delta ?? 0, deltaY: bestY?.delta ?? 0 };
}

export function renderGuides(canvas: Canvas, guides: Guide[]): Line[] {
  return guides.map((guide) => {
    const line =
      guide.type === "vertical"
        ? new Line([guide.position, 0, guide.position, canvas.height], {
            stroke: GUIDE_COLOR,
            strokeWidth: 1,
          })
        : new Line([0, guide.position, canvas.width, guide.position], {
            stroke: GUIDE_COLOR,
            strokeWidth: 1,
          });
    line.set({
      selectable: false,
      evented: false,
      excludeFromExport: true,
    });
    canvas.add(line);
    canvas.bringObjectToFront(line);
    return line;
  });
}

export function clearGuides(canvas: Canvas, guides: Line[]) {
  guides.forEach((line) => canvas.remove(line));
}

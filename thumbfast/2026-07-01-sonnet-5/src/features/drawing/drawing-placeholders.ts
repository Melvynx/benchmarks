import {
  Circle,
  type FabricObject,
  Group,
  Path,
  Polygon,
  Rect,
  Textbox,
} from "fabric";
import { tagObject } from "./drawing-object-factory";

/**
 * A flat, neutral-grey person silhouette — deliberately styled like the
 * "wireframe mannequin" placeholders the existing anonymization pipeline
 * already knows to replace with a real person at generation time (see
 * hasPlaceholderMannequin in convex/editor.ts / src/lib/ai/images.ts).
 */
export function createPlaceholderPerson(centerX: number, centerY: number) {
  const head = new Circle({
    radius: 42,
    left: -42,
    top: -130,
    fill: "#6b7280",
  });
  const body = new Path("M -78 210 Q -78 40 0 40 Q 78 40 78 210 Z", {
    fill: "#6b7280",
    top: -170,
    left: -78,
  });

  const group = new Group([body, head], {
    left: centerX - 78,
    top: centerY - 170,
  });
  return tagObject(group, { kind: "placeholder-person" });
}

/** Circular badge with a short label, e.g. "NEW" or "1". */
export function createBadge(centerX: number, centerY: number, label = "NEW") {
  const circle = new Circle({
    radius: 48,
    left: -48,
    top: -48,
    fill: "#f59e0b",
    stroke: "#111111",
    strokeWidth: 3,
  });
  const text = new Textbox(label, {
    left: -40,
    top: -16,
    width: 80,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Arial",
    fill: "#111111",
    textAlign: "center",
  });
  const group = new Group([circle, text], {
    left: centerX - 48,
    top: centerY - 48,
  });
  return tagObject(group, { kind: "badge" });
}

function starPoints(spikes: number, outerRadius: number, innerRadius: number) {
  const points: { x: number; y: number }[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return points;
}

/** Jagged comic-style explosion/burst shape. */
export function createExplosion(centerX: number, centerY: number, label = "") {
  const burst = new Polygon(starPoints(10, 110, 70), {
    left: -110,
    top: -110,
    fill: "#facc15",
    stroke: "#111111",
    strokeWidth: 4,
    strokeLineJoin: "round",
  });
  const objects: FabricObject[] = [burst];
  if (label) {
    objects.push(
      new Textbox(label, {
        left: -70,
        top: -20,
        width: 140,
        fontSize: 24,
        fontWeight: "800",
        fontFamily: "Arial",
        fill: "#111111",
        textAlign: "center",
      }),
    );
  }
  const group = new Group(objects, {
    left: centerX - 110,
    top: centerY - 110,
  });
  return tagObject(group, { kind: "explosion" });
}

/** Rounded speech-bubble callout with a tail and short text. */
export function createCallout(
  centerX: number,
  centerY: number,
  text = "Callout",
) {
  const bubble = new Rect({
    left: -110,
    top: -60,
    width: 220,
    height: 100,
    rx: 20,
    ry: 20,
    fill: "#ffffff",
    stroke: "#111111",
    strokeWidth: 3,
  });
  const tail = new Polygon(
    [
      { x: -20, y: 38 },
      { x: 10, y: 38 },
      { x: -10, y: 78 },
    ],
    { left: 0, top: 0, fill: "#ffffff", stroke: "#111111", strokeWidth: 3 },
  );
  const label = new Textbox(text, {
    left: -95,
    top: -30,
    width: 190,
    fontSize: 18,
    fontWeight: "600",
    fontFamily: "Arial",
    fill: "#111111",
    textAlign: "center",
  });
  const group = new Group([bubble, tail, label], {
    left: centerX - 110,
    top: centerY - 60,
  });
  return tagObject(group, { kind: "callout" });
}

import { Group, Line, Polygon, type Group as FabricGroup } from "fabric";

const ARROWHEAD_LENGTH = 18;
const ARROWHEAD_WIDTH = 14;

export const DEFAULT_SHAPE_STYLE = {
  fill: "#f97316",
  stroke: "#111111",
  strokeWidth: 3,
};

export const DEFAULT_LINE_STYLE = {
  stroke: "#111111",
  strokeWidth: 6,
};

/** Builds an arrow as a Line shaft + Polygon head grouped together. */
export function createArrowObject(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: { stroke?: string; strokeWidth?: number } = {},
): FabricGroup {
  const stroke = options.stroke ?? DEFAULT_LINE_STYLE.stroke;
  const strokeWidth = options.strokeWidth ?? DEFAULT_LINE_STYLE.strokeWidth;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  const shaft = new Line([x1, y1, x2, y2], {
    stroke,
    strokeWidth,
    strokeLineCap: "round",
    selectable: false,
    evented: false,
  });

  const headBackX = x2 - ARROWHEAD_LENGTH * Math.cos(angle);
  const headBackY = y2 - ARROWHEAD_LENGTH * Math.sin(angle);
  const perpX = Math.cos(angle + Math.PI / 2) * (ARROWHEAD_WIDTH / 2);
  const perpY = Math.sin(angle + Math.PI / 2) * (ARROWHEAD_WIDTH / 2);

  const head = new Polygon(
    [
      { x: x2, y: y2 },
      { x: headBackX + perpX, y: headBackY + perpY },
      { x: headBackX - perpX, y: headBackY - perpY },
    ],
    { fill: stroke, selectable: false, evented: false },
  );

  return new Group([shaft, head], { selectable: true, evented: true });
}

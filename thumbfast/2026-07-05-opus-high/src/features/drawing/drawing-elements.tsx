// Pure SVG rendering of a single drawing element. Elements are visual only —
// they do not handle pointer events; the canvas root does all hit testing
// geometrically so rotation and marquee selection behave consistently.

import {
  DRAWING_FONT_STACKS,
  type ArrowElement,
  type DrawingElement,
  type FreedrawElement,
  type ImageElement,
  type PlaceholderElement,
  type RectangleElement,
  type EllipseElement,
  type TextElement,
} from "./drawing-document";

function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

function boxTransform(element: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}): string | undefined {
  if (!element.rotation) return undefined;
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  return `rotate(${radToDeg(element.rotation)} ${cx} ${cy})`;
}

export function ElementView({
  element,
  isEditing,
}: {
  element: DrawingElement;
  isEditing: boolean;
}) {
  switch (element.type) {
    case "rectangle":
      return <RectangleView element={element} />;
    case "ellipse":
      return <EllipseView element={element} />;
    case "arrow":
      return <ArrowView element={element} />;
    case "freedraw":
      return <FreedrawView element={element} />;
    case "image":
      return <ImageView element={element} />;
    case "placeholder":
      return <PlaceholderView element={element} />;
    case "text":
      return <TextView element={element} isEditing={isEditing} />;
    default:
      return null;
  }
}

function RectangleView({ element }: { element: RectangleElement }) {
  return (
    <rect
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rx={element.cornerRadius}
      ry={element.cornerRadius}
      fill={element.fill}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      strokeLinejoin="round"
      opacity={element.opacity}
      transform={boxTransform(element)}
    />
  );
}

function EllipseView({ element }: { element: EllipseElement }) {
  return (
    <ellipse
      cx={element.x + element.width / 2}
      cy={element.y + element.height / 2}
      rx={element.width / 2}
      ry={element.height / 2}
      fill={element.fill}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      opacity={element.opacity}
      transform={boxTransform(element)}
    />
  );
}

function ArrowView({ element }: { element: ArrowElement }) {
  const { start, end } = element;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(14, element.strokeWidth * 3.2);
  const p1 = {
    x: end.x - headLength * Math.cos(angle - Math.PI / 6),
    y: end.y - headLength * Math.sin(angle - Math.PI / 6),
  };
  const p2 = {
    x: end.x - headLength * Math.cos(angle + Math.PI / 6),
    y: end.y - headLength * Math.sin(angle + Math.PI / 6),
  };
  return (
    <g opacity={element.opacity}>
      <line
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
        strokeLinecap="round"
      />
      <polygon
        points={`${end.x},${end.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`}
        fill={element.stroke}
      />
    </g>
  );
}

function FreedrawView({ element }: { element: FreedrawElement }) {
  const points = element.points
    .map(
      (point) =>
        `${element.x + point.x * element.width},${element.y + point.y * element.height}`,
    )
    .join(" ");
  return (
    <polyline
      points={points}
      fill="none"
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={element.opacity}
      transform={boxTransform(element)}
    />
  );
}

function ImageView({ element }: { element: ImageElement }) {
  return (
    <image
      href={element.url}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      preserveAspectRatio="none"
      opacity={element.opacity}
      transform={boxTransform(element)}
      crossOrigin="anonymous"
    />
  );
}

function PlaceholderView({ element }: { element: PlaceholderElement }) {
  const headRadius = Math.min(element.width, element.height) * 0.22;
  const centerX = element.x + element.width / 2;
  const headY = element.y + element.height * 0.26;
  const bodyTop = headY + headRadius * 1.1;
  const bodyWidth = element.width * 0.72;
  const bodyHeight = (element.height - (bodyTop - element.y)) * 1.4;
  return (
    <g opacity={element.opacity} transform={boxTransform(element)}>
      <circle cx={centerX} cy={headY} r={headRadius} fill={element.color} />
      <rect
        x={centerX - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        rx={bodyWidth / 2}
        ry={bodyWidth / 2}
        fill={element.color}
      />
    </g>
  );
}

function TextView({
  element,
  isEditing,
}: {
  element: TextElement;
  isEditing: boolean;
}) {
  // While editing, the HTML textarea overlay renders the text instead.
  if (isEditing) return null;
  const justify =
    element.align === "left"
      ? "flex-start"
      : element.align === "right"
        ? "flex-end"
        : "center";
  return (
    <foreignObject
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      opacity={element.opacity}
      transform={boxTransform(element)}
      style={{ overflow: "visible" }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: justify,
          textAlign: element.align,
          color: element.color,
          fontSize: `${element.fontSize}px`,
          fontFamily: DRAWING_FONT_STACKS[element.fontFamily],
          fontWeight: element.fontWeight,
          lineHeight: 1.2,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          userSelect: "none",
        }}
      >
        {element.text || " "}
      </div>
    </foreignObject>
  );
}

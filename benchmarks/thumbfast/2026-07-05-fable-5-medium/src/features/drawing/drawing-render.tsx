import type {
  ArrowElement,
  DrawingDocument,
  DrawingElement,
  FreedrawElement,
  PersonElement,
  TextElement,
} from "./drawing.schema";
import { DRAWING_FONT_FAMILY, DRAWING_LINE_HEIGHT } from "./drawing.schema";
import { getElementBounds, getElementCenter } from "./drawing-geometry";

function svgFill(fill: string) {
  return fill === "transparent" ? "none" : fill;
}

function elementTransform(element: DrawingElement) {
  if (!element.angle) return undefined;
  const center = getElementCenter(element);
  return `rotate(${(element.angle * 180) / Math.PI} ${center.x} ${center.y})`;
}

function ArrowNode({ element }: { element: ArrowElement }) {
  const start = { x: element.x, y: element.y };
  const end = { x: element.x + element.width, y: element.y + element.height };
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(12, element.strokeWidth * 4);
  const headAngle = Math.PI / 7;
  const head1 = {
    x: end.x - headLength * Math.cos(angle - headAngle),
    y: end.y - headLength * Math.sin(angle - headAngle),
  };
  const head2 = {
    x: end.x - headLength * Math.cos(angle + headAngle),
    y: end.y - headLength * Math.sin(angle + headAngle),
  };
  return (
    <g
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      transform={elementTransform(element)}
    >
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
      <polyline
        points={`${head1.x},${head1.y} ${end.x},${end.y} ${head2.x},${head2.y}`}
      />
    </g>
  );
}

function freedrawPath(element: FreedrawElement) {
  if (element.points.length === 0) return "";
  const [first, ...rest] = element.points;
  const move = `M ${element.x + first[0]} ${element.y + first[1]}`;
  if (rest.length === 0) return `${move} l 0.01 0`;
  return `${move} L ${rest
    .map(([px, py]) => `${element.x + px} ${element.y + py}`)
    .join(" L ")}`;
}

function FreedrawNode({ element }: { element: FreedrawElement }) {
  return (
    <path
      d={freedrawPath(element)}
      stroke={element.stroke}
      strokeWidth={element.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      transform={elementTransform(element)}
    />
  );
}

function TextNode({ element }: { element: TextElement }) {
  const lines = element.text.split("\n");
  const lineHeight = element.fontSize * DRAWING_LINE_HEIGHT;
  return (
    <text
      x={element.x}
      y={element.y}
      fill={element.stroke}
      fontFamily={DRAWING_FONT_FAMILY}
      fontWeight={700}
      fontSize={element.fontSize}
      transform={elementTransform(element)}
      style={{ userSelect: "none", whiteSpace: "pre" }}
    >
      {lines.map((line, index) => (
        <tspan
          key={index}
          x={element.x}
          y={element.y + index * lineHeight + element.fontSize * 0.92}
        >
          {line}
        </tspan>
      ))}
    </text>
  );
}

function PersonNode({ element }: { element: PersonElement }) {
  const bounds = getElementBounds(element);
  const { x, y, width, height } = bounds;
  const headRadiusX = width * 0.17;
  const headRadiusY = height * 0.17;
  const headCenterY = y + height * 0.24;
  const torsoTop = y + height * 0.46;
  const torso = [
    `M ${x + width * 0.14} ${y + height}`,
    `C ${x + width * 0.14} ${torsoTop + height * 0.12} ${x + width * 0.28} ${torsoTop} ${x + width * 0.5} ${torsoTop}`,
    `C ${x + width * 0.72} ${torsoTop} ${x + width * 0.86} ${torsoTop + height * 0.12} ${x + width * 0.86} ${y + height}`,
    "Z",
  ].join(" ");
  return (
    <g transform={elementTransform(element)}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={Math.min(12, width / 8, height / 8)}
        fill="none"
        stroke={element.stroke}
        strokeWidth={Math.max(1.5, element.strokeWidth / 2)}
        strokeDasharray="8 6"
        opacity={0.6}
      />
      <ellipse
        cx={x + width / 2}
        cy={headCenterY}
        rx={headRadiusX}
        ry={headRadiusY}
        fill={svgFill(element.fill)}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
      />
      <path
        d={torso}
        fill={svgFill(element.fill)}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth}
      />
    </g>
  );
}

export function DrawingElementNode({
  element,
  imageHrefs,
}: {
  element: DrawingElement;
  /** Optional url -> data-url map used when exporting (avoids canvas taint). */
  imageHrefs?: Map<string, string>;
}) {
  const bounds = getElementBounds(element);

  switch (element.type) {
    case "rectangle":
      return (
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          rx={Math.min(8, bounds.width / 6, bounds.height / 6)}
          fill={svgFill(element.fill)}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          transform={elementTransform(element)}
        />
      );
    case "ellipse":
      return (
        <ellipse
          cx={bounds.x + bounds.width / 2}
          cy={bounds.y + bounds.height / 2}
          rx={bounds.width / 2}
          ry={bounds.height / 2}
          fill={svgFill(element.fill)}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          transform={elementTransform(element)}
        />
      );
    case "arrow":
      return <ArrowNode element={element} />;
    case "freedraw":
      return <FreedrawNode element={element} />;
    case "text":
      return <TextNode element={element} />;
    case "image":
      return (
        <image
          href={imageHrefs?.get(element.url) ?? element.url}
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          preserveAspectRatio="none"
          transform={elementTransform(element)}
        />
      );
    case "person":
      return <PersonNode element={element} />;
  }
}

export function DrawingScene({
  doc,
  imageHrefs,
}: {
  doc: DrawingDocument;
  imageHrefs?: Map<string, string>;
}) {
  return (
    <>
      <rect
        x={0}
        y={0}
        width={doc.width}
        height={doc.height}
        fill={doc.background}
      />
      {doc.elements.map((element) => (
        <DrawingElementNode
          key={element.id}
          element={element}
          imageHrefs={imageHrefs}
        />
      ))}
    </>
  );
}

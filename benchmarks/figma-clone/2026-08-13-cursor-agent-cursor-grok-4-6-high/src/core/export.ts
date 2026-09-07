import { colorToCss, colorToHex } from "./color";
import { nodeLocalMatrix } from "./geometry";
import { isParent } from "./factories";
import { activePage, worldAABB } from "./scene";
import { fontCss, lineOffsetX, wrapLines } from "./text-layout";
import type { Document, NodeId, Paint, SceneNode, Stroke } from "./types";

function svgTransform(node: SceneNode): string {
  const m = nodeLocalMatrix(node);
  return `matrix(${m[0]} ${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]})`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function nodeToSvg(doc: Document, node: SceneNode, measure: (font: string, text: string) => number): string {
  const opacity = node.opacity;
  const fill = node.fills[0] ? paintToSvg(node.fills[0], node.id) : "none";
  const stroke = strokeToSvg(node.strokes[0]);
  const kids =
    isParent(node)
      ? node.children
          .map((id) => doc.nodes[id])
          .filter((n): n is SceneNode => n !== undefined && n.visible)
          .map((n) => nodeToSvg(doc, n, measure))
          .join("")
      : "";

  const clip =
    (node.type === "frame" || node.type === "component") && node.clipContent
      ? ` clip-path="url(#clip-${node.id})"`
      : "";

  const defs: string[] = [];
  if ((node.type === "frame" || node.type === "component") && node.clipContent) {
    defs.push(
      `<clipPath id="clip-${node.id}"><rect width="${node.width}" height="${node.height}" rx="${node.cornerRadius.tl}"/></clipPath>`,
    );
  }
  for (const p of node.fills) {
    if (p.type !== "solid") defs.push(gradientDef(p, node.id));
  }

  let shape = "";
  switch (node.type) {
    case "ellipse":
      shape = `<ellipse cx="${node.width / 2}" cy="${node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${fill}" ${stroke}/>`;
      break;
    case "line":
      shape = `<line x1="0" y1="${node.height / 2}" x2="${node.width}" y2="${node.height / 2}" ${stroke} fill="none"/>`;
      break;
    case "text": {
      const font = fontCss(node.text);
      const lines = wrapLines(node.characters, node.width, node.text.letterSpacing, (s) => measure(font, s));
      const lh = node.text.fontSize * node.text.lineHeight;
      shape = lines
        .map((line, i) => {
          const x = lineOffsetX(node.text.align, line.width, node.width);
          const y = (i + 0.8) * lh;
          return `<text x="${x}" y="${y}" font-family="${escapeXml(node.text.fontFamily)}" font-size="${node.text.fontSize}" font-weight="${node.text.fontWeight}" fill="${colorToHex(node.text.color)}" letter-spacing="${node.text.letterSpacing}">${escapeXml(line.text)}</text>`;
        })
        .join("");
      break;
    }
    case "image":
      shape = `<image href="${escapeXml(node.src)}" width="${node.width}" height="${node.height}" preserveAspectRatio="${node.fit === "fit" ? "xMidYMid meet" : "xMidYMid slice"}"/>`;
      break;
    case "path": {
      const d = pathD(node);
      shape = `<path d="${d}" fill="${node.closed ? fill : "none"}" ${stroke}/>`;
      break;
    }
    default: {
      shape = `<rect width="${node.width}" height="${node.height}" rx="0" fill="${fill}" ${stroke}/>`;
    }
  }

  return `<g id="${node.id}" data-name="${escapeXml(node.name)}" transform="${svgTransform(node)}" opacity="${opacity}"${clip}>${defs.join("")}${shape}${kids}</g>`;
}

function pathD(node: Extract<SceneNode, { type: "path" }>): string {
  if (node.points.length === 0) return "";
  const first = node.points[0];
  if (!first) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < node.points.length; i++) {
    const prev = node.points[i - 1];
    const cur = node.points[i];
    if (!prev || !cur) continue;
    d += ` C ${prev.x + prev.handleOut.x} ${prev.y + prev.handleOut.y}, ${cur.x + cur.handleIn.x} ${cur.y + cur.handleIn.y}, ${cur.x} ${cur.y}`;
  }
  if (node.closed) {
    const last = node.points[node.points.length - 1];
    if (last && first) {
      d += ` C ${last.x + last.handleOut.x} ${last.y + last.handleOut.y}, ${first.x + first.handleIn.x} ${first.y + first.handleIn.y}, ${first.x} ${first.y} Z`;
    }
  }
  return d;
}

function paintToSvg(p: Paint, id: string): string {
  if (p.type === "solid") return colorToCss({ ...p.color, a: p.color.a * p.opacity });
  return `url(#grad-${id})`;
}

function gradientDef(p: Paint, id: string): string {
  if (p.type === "solid") return "";
  const stops = p.stops
    .map((s) => `<stop offset="${s.offset}" stop-color="${colorToCss(s.color)}"/>`)
    .join("");
  if (p.type === "linear") {
    return `<linearGradient id="grad-${id}" x1="${p.start.x}" y1="${p.start.y}" x2="${p.end.x}" y2="${p.end.y}">${stops}</linearGradient>`;
  }
  return `<radialGradient id="grad-${id}" cx="${p.center.x}" cy="${p.center.y}" r="${p.radius}">${stops}</radialGradient>`;
}

function strokeToSvg(s: Stroke | undefined): string {
  if (!s) return "";
  const dash = s.dash.length ? ` stroke-dasharray="${s.dash.join(" ")}"` : "";
  return `stroke="${paintToSvg(s.paint, "s")}" stroke-width="${s.thickness}"${dash}`;
}

export function exportSvg(doc: Document, ids: NodeId[] | null, measure: (font: string, text: string) => number): string {
  const page = activePage(doc);
  const targets = ids && ids.length > 0 ? ids : page.children;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const id of targets) {
    const b = worldAABB(doc, id);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const body = targets
    .map((id) => doc.nodes[id])
    .filter((n): n is SceneNode => n !== undefined && n.visible)
    .map((n) => nodeToSvg(doc, n, measure))
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">${body}</svg>`;
}

export function exportJson(doc: Document): string {
  return JSON.stringify(doc, null, 2);
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

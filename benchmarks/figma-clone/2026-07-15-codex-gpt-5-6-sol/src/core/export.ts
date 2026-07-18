import { nodeWorldBounds, unionBounds } from "./geometry";
import type { DesignDocument, NodeId, Paint, RGBA, SceneNode } from "./types";

export function rgbaToCss(color: RGBA): string {
  return `rgba(${color[0]},${color[1]},${color[2]},${color[3]})`;
}

export function rgbaToHex(color: RGBA, includeAlpha = false): string {
  const values = color.slice(0, includeAlpha ? 4 : 3).map((value, index) => Math.round(index === 3 ? value * 255 : value).toString(16).padStart(2, "0"));
  return `#${values.join("").toUpperCase()}`;
}

export function hexToRgba(value: string, alpha = 1): RGBA | null {
  const normalized = value.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  return [Number.parseInt(normalized.slice(0, 2), 16), Number.parseInt(normalized.slice(2, 4), 16), Number.parseInt(normalized.slice(4, 6), 16), alpha];
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function paintFill(paint: Paint | undefined, id: string): { fill: string; definition: string } {
  if (!paint || !paint.visible) return { fill: "none", definition: "" };
  if (paint.type === "solid") return { fill: rgbaToCss(paint.color), definition: "" };
  const gradientId = `gradient-${id}`;
  const tag = paint.type === "linear" ? "linearGradient" : "radialGradient";
  const stops = paint.stops.map((stop) => `<stop offset="${stop.offset * 100}%" stop-color="${rgbaToCss(stop.color)}"/>`).join("");
  return { fill: `url(#${gradientId})`, definition: `<${tag} id="${gradientId}" x1="0" y1="0" x2="1" y2="1">${stops}</${tag}>` };
}

function nodeSvg(node: SceneNode, document: DesignDocument, definitions: string[]): string {
  if (!node.visible) return "";
  const paint = paintFill(node.fills.find((fill) => fill.visible), node.id);
  if (paint.definition) definitions.push(paint.definition);
  const transform = `translate(${node.x} ${node.y}) rotate(${node.rotation} ${node.width / 2} ${node.height / 2})`;
  const stroke = node.stroke.visible ? `stroke="${rgbaToCss(node.stroke.color)}" stroke-width="${node.stroke.width}" stroke-dasharray="${node.stroke.dash.join(" ")}"` : "";
  const common = `transform="${transform}" opacity="${node.opacity}" fill="${paint.fill}" ${stroke}`;
  if (node.type === "ellipse") return `<ellipse ${common} cx="${node.width / 2}" cy="${node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}"/>`;
  if (node.type === "line") return `<line ${common} x1="0" y1="0" x2="${node.width}" y2="${node.height}"/>`;
  if (node.type === "star") {
    const points = Array.from({ length: node.points * 2 }, (_, index) => {
      const radius = index % 2 === 0 ? Math.min(node.width, node.height) / 2 : Math.min(node.width, node.height) * node.innerRatio / 2;
      const angle = -Math.PI / 2 + index * Math.PI / node.points;
      return `${node.width / 2 + Math.cos(angle) * radius},${node.height / 2 + Math.sin(angle) * radius}`;
    }).join(" ");
    return `<polygon ${common} points="${points}"/>`;
  }
  if (node.type === "text") {
    const lines = node.text.split("\n");
    return `<text ${common} font-family="${escapeXml(node.fontFamily)}" font-size="${node.fontSize}" font-weight="${node.fontWeight}" letter-spacing="${node.letterSpacing}">${lines.map((line, index) => `<tspan x="0" y="${node.fontSize + index * node.fontSize * node.lineHeight}">${escapeXml(line)}</tspan>`).join("")}</text>`;
  }
  if (node.type === "image") return `<image ${common} href="${escapeXml(node.src)}" width="${node.width}" height="${node.height}" preserveAspectRatio="xMidYMid slice"/>`;
  const radius = node.cornerRadius[0];
  const body = `<rect ${common} width="${node.width}" height="${node.height}" rx="${radius}"/>`;
  if (!("children" in node)) return body;
  const clipId = `clip-${node.id}`;
  if (node.type !== "group" && node.clipContent) definitions.push(`<clipPath id="${clipId}"><rect width="${node.width}" height="${node.height}" rx="${radius}"/></clipPath>`);
  const children = node.children.map((id) => document.nodes[id]).filter((child): child is SceneNode => Boolean(child)).map((child) => nodeSvg(child, document, definitions)).join("");
  const childTransform = `transform="${transform}"${node.type !== "group" && node.clipContent ? ` clip-path="url(#${clipId})"` : ""}`;
  return `${body}<g ${childTransform}>${children}</g>`;
}

export function documentToSvg(document: DesignDocument, ids: readonly NodeId[] = document.rootIds): string {
  const selectedNodes = ids.flatMap((id) => document.nodes[id] ? [document.nodes[id]] : []);
  const bounds = unionBounds(selectedNodes.map((node) => nodeWorldBounds(node, document.nodes))) ?? { x: 0, y: 0, width: 1, height: 1 };
  const definitions: string[] = [];
  const content = selectedNodes.map((node) => nodeSvg({ ...node, x: node.x - bounds.x, y: node.y - bounds.y }, document, definitions)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}"><defs>${definitions.join("")}</defs>${content}</svg>`;
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJson(designDocument: DesignDocument): void {
  downloadBlob(new Blob([JSON.stringify(designDocument, null, 2)], { type: "application/json" }), `${designDocument.name.replaceAll(/\s+/g, "-").toLowerCase()}.json`);
}

export function exportSvg(designDocument: DesignDocument, ids?: readonly NodeId[]): void {
  downloadBlob(new Blob([documentToSvg(designDocument, ids)], { type: "image/svg+xml" }), "selection.svg");
}

export async function exportPng(designDocument: DesignDocument, ids?: readonly NodeId[], scale = 2): Promise<void> {
  const svg = documentToSvg(designDocument, ids);
  const image = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to render PNG"));
    image.src = url;
  });
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.max(1, image.naturalWidth * scale);
  canvas.height = Math.max(1, image.naturalHeight * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas rendering is unavailable");
  context.scale(scale, scale);
  context.drawImage(image, 0, 0);
  URL.revokeObjectURL(url);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to encode PNG")), "image/png"));
  downloadBlob(blob, "selection@2x.png");
}

export function readDocumentFile(file: File): Promise<DesignDocument> {
  return file.text().then((text) => {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || !("nodes" in parsed) || !("rootIds" in parsed)) throw new Error("This is not a valid design document");
    return parsed as DesignDocument;
  });
}

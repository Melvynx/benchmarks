import { nodeBounds, unionBounds } from "../geometry/bounds";
import { renderSelectionToCanvas } from "../scene/render";
import type { EditorDocument, Fill, SceneNode } from "../types/nodes";
import { downloadText } from "../persistence/storage";

export function exportJson(document: EditorDocument): void {
  downloadText(`${slug(document.name)}.atelier.json`, JSON.stringify({ version: 1, document }, null, 2));
}

export function downloadSelectionPng(editorDocument: EditorDocument): void {
  const bounds = selectionBounds(editorDocument);
  if (!bounds) return;
  const scale = 2;
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.ceil(bounds.width * scale);
  canvas.height = Math.ceil(bounds.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  renderSelectionToCanvas(ctx, editorDocument, bounds, scale);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = `${slug(editorDocument.name)}.png`;
    link.click();
    URL.revokeObjectURL(url);
  });
}

export function downloadSelectionSvg(document: EditorDocument): void {
  const bounds = selectionBounds(document);
  if (!bounds) return;
  const selected = Object.values(document.nodes).filter((node) => document.selection.includes(node.id));
  const body = selected.map(svgNode).join("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}">\n${body}\n</svg>`;
  downloadText(`${slug(document.name)}.svg`, svg, "image/svg+xml");
}

function svgNode(node: SceneNode): string {
  const transform = `rotate(${node.rotation} ${node.x + node.width / 2} ${node.y + node.height / 2})`;
  const fill = svgFill(node.fills[0]);
  const stroke = node.strokes[0] ? `stroke="${color(node.strokes[0].color)}" stroke-width="${node.strokes[0].width}"` : "";
  switch (node.type) {
    case "ellipse":
      return `<ellipse cx="${node.x + node.width / 2}" cy="${node.y + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${fill}" ${stroke} transform="${transform}" />`;
    case "text":
      return `<text x="${node.x}" y="${node.y + node.fontSize}" font-family="${node.fontFamily}" font-size="${node.fontSize}" font-weight="${node.fontWeight}" fill="${fill}" transform="${transform}">${escapeXml(node.text)}</text>`;
    case "line":
      return `<line x1="${node.x}" y1="${node.y}" x2="${node.x + node.width}" y2="${node.y + node.height}" ${stroke} transform="${transform}" />`;
    default:
      return `<rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="${"cornerRadius" in node && typeof node.cornerRadius === "number" ? node.cornerRadius : 0}" fill="${fill}" ${stroke} transform="${transform}" />`;
  }
}

function selectionBounds(document: EditorDocument) {
  return unionBounds(document.selection.map((id) => document.nodes[id]).filter((node): node is SceneNode => Boolean(node)).map(nodeBounds));
}

function svgFill(fill: Fill | undefined): string {
  return fill?.kind === "solid" ? color(fill.color) : "none";
}

function color(rgba: { r: number; g: number; b: number; a: number }): string {
  return `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" })[char] ?? char);
}

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "export";
}

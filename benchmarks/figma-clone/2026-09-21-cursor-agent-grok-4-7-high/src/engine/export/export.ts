import type { Editor } from "../editor";
import type { SceneSnapshot } from "../render/paint";
import { paintScene } from "../render/paint";
import { isGeometric } from "../types";
import { rgbaCss } from "../color";

export function sceneSnapshot(editor: Editor): SceneSnapshot {
  return {
    page: editor.page(),
    geom: editor.geom,
    world: editor.world,
    subtree: editor.subtree,
    camera: editor.camera,
    dpr: editor.dpr,
  };
}

export async function exportPNG(editor: Editor): Promise<void> {
  const ids = editor.selection.length ? editor.selection : editor.order;
  const boxes = ids.map((id) => editor.subtree.get(id) ?? editor.aabb.get(id)).filter((box): box is NonNullable<typeof box> => !!box);
  if (!boxes.length) {
    editor.notify("Nothing to export.");
    return;
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  const pad = 16;
  const scale = 2;
  const width = Math.max(1, Math.ceil((maxX - minX + pad * 2) * scale));
  const height = Math.max(1, Math.ceil((maxY - minY + pad * 2) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const snap = sceneSnapshot(editor);
  snap.camera = { x: (-minX + pad) * scale, y: (-minY + pad) * scale, zoom: scale };
  snap.dpr = 1;
  paintScene(ctx, snap, width, height, { grid: false });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;
  downloadBlob(blob, `${editor.doc.name}.png`);
}

export function exportSVG(editor: Editor): void {
  const ids = editor.selection.length ? editor.selection : editor.page().nodes[editor.page().rootId]?.childIds ?? [];
  const parts: string[] = [];
  const walk = (id: string) => {
    const node = editor.node(id);
    const geom = editor.geomOf(id);
    const world = editor.world.get(id);
    if (!node || !geom || !world || !isGeometric(node) || !node.visible) return;
    const matrix = `matrix(${world.a} ${world.b} ${world.c} ${world.d} ${world.e} ${world.f})`;
    const fill = node.fills.find((item) => item.visible);
    const fillAttr = fill?.type === "solid" ? rgbaCss(fill.color, fill.opacity) : "none";
    const stroke = node.strokes.find((item) => item.visible);
    const common = `transform="${matrix}" fill="${node.type === "line" ? "none" : fillAttr}" stroke="${stroke ? rgbaCss(stroke.color, stroke.opacity) : "none"}" stroke-width="${stroke?.width ?? 0}" opacity="${node.opacity}"`;
    if (node.type === "ellipse") parts.push(`<ellipse cx="${geom.width / 2}" cy="${geom.height / 2}" rx="${geom.width / 2}" ry="${geom.height / 2}" ${common} />`);
    else if (node.type === "line") parts.push(`<line x1="0" y1="${geom.height / 2}" x2="${geom.width}" y2="${geom.height / 2}" ${common} />`);
    else if (node.type === "text") {
      parts.push(`<text x="0" y="${node.fontSize}" ${common} font-family="${node.fontFamily}" font-size="${node.fontSize}" font-weight="${node.fontWeight}">${escapeXml(node.text)}</text>`);
    } else if (node.type === "image") parts.push(`<image href="${node.src}" width="${geom.width}" height="${geom.height}" ${common} />`);
    else if (node.type !== "group") parts.push(`<rect x="0" y="0" width="${geom.width}" height="${geom.height}" rx="${node.cornerRadius[0]}" ${common} />`);
    node.childIds.forEach(walk);
  };
  ids.forEach(walk);
  const bounds = ids.map((id) => editor.aabb.get(id)).filter((box): box is NonNullable<typeof box> => !!box);
  const minX = Math.min(...bounds.map((box) => box.x), 0);
  const minY = Math.min(...bounds.map((box) => box.y), 0);
  const maxX = Math.max(...bounds.map((box) => box.x + box.width), 100);
  const maxY = Math.max(...bounds.map((box) => box.y + box.height), 100);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}">${parts.join("")}</svg>`;
  downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${editor.doc.name}.svg`);
}

function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

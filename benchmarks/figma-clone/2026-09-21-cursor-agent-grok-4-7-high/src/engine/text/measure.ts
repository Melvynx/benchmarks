import type { TextNode } from "../types";

let measureCtx: CanvasRenderingContext2D | null = null;

function context(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  measureCtx = canvas.getContext("2d");
  return measureCtx;
}

export function fontCss(node: Pick<TextNode, "fontWeight" | "fontSize" | "fontFamily">): string {
  return `${node.fontWeight} ${node.fontSize}px "${node.fontFamily}"`;
}

export function ensureFont(node: Pick<TextNode, "fontWeight" | "fontSize" | "fontFamily">): void {
  if (typeof document === "undefined" || !document.fonts) return;
  void document.fonts.load(fontCss(node));
}

export function measureText(node: TextNode, maxWidth: number | null): { width: number; height: number } {
  const lines = wrapText(node, maxWidth);
  let width = 0;
  for (const line of lines) width = Math.max(width, measureLine(node, line));
  const height = Math.max(node.lineHeight, lines.length * node.lineHeight);
  return { width: Math.max(1, width), height };
}

export function wrapText(node: TextNode, maxWidth: number | null): string[] {
  const paragraphs = node.text.split("\n");
  if (maxWidth === null) return paragraphs.length ? paragraphs : [""];
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const words = paragraph.split(/(\s+)/);
    let current = "";
    for (const word of words) {
      const next = current + word;
      if (current && measureLine(node, next) > maxWidth) {
        lines.push(current.replace(/\s+$/, ""));
        current = word.trimStart();
      } else {
        current = next;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [""];
}

export function measureLine(node: TextNode, line: string): number {
  const ctx = context();
  if (!ctx) return estimate(node, line);
  ctx.font = fontCss(node);
  if (node.letterSpacing === 0) return ctx.measureText(line).width;
  let width = 0;
  for (const ch of line) width += ctx.measureText(ch).width + node.letterSpacing;
  return Math.max(0, width - (line.length ? node.letterSpacing : 0));
}

function estimate(node: TextNode, line: string): number {
  const factor = node.fontFamily.includes("Mono") ? 0.62 : 0.52;
  return line.length * node.fontSize * factor + Math.max(0, line.length - 1) * node.letterSpacing;
}

export function preloadCanvasFonts(): void {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = ["Inter", "Roboto", "Poppins", "Playfair Display", "JetBrains Mono", "Space Grotesk"];
  for (const family of families) {
    for (const weight of [400, 500, 700]) {
      void document.fonts.load(`${weight} 16px "${family}"`);
    }
  }
}

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { DrawingDocument } from "./drawing.schema";
import { DrawingScene } from "./drawing-render";

async function fetchImageAsDataUrl(url: string): Promise<string> {
  const response = await fetch(
    `/api/proxy-image?url=${encodeURIComponent(url)}`,
  );
  if (!response.ok) throw new Error("Failed to load drawing image");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read drawing image"));
    reader.readAsDataURL(blob);
  });
}

async function collectImageHrefs(doc: DrawingDocument) {
  const urls = new Set<string>();
  for (const element of doc.elements) {
    if (element.type === "image") urls.add(element.url);
  }
  const entries = await Promise.all(
    [...urls].map(
      async (url) => [url, await fetchImageAsDataUrl(url)] as const,
    ),
  );
  return new Map(entries);
}

/**
 * Rasterize a drawing document to a PNG data URL. Renders the exact same SVG
 * scene as the editor, with remote images inlined as data URLs so the canvas
 * is not tainted.
 */
export async function exportDrawingToPng(
  doc: DrawingDocument,
): Promise<string> {
  const imageHrefs = await collectImageHrefs(doc);
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        width: doc.width,
        height: doc.height,
        viewBox: `0 0 ${doc.width} ${doc.height}`,
      },
      createElement(DrawingScene, { doc, imageHrefs }),
    ),
  );

  const svgBlob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to render drawing"));
      img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = doc.width;
    canvas.height = doc.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported in this browser");
    context.drawImage(image, 0, 0, doc.width, doc.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

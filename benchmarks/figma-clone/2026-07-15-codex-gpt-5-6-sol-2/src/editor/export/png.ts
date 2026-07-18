import type { SceneDocument } from '@/core/model/types';

import { downloadBlob, sanitizeDownloadFilename } from './download';
import { DocumentExportError, exportFailure, exportSuccess } from './errors';
import type { ExportOperationResult } from './errors';
import { serializeSceneDocumentSvg } from './svg';
import type { SvgExportOptions } from './svg';

export interface PngExportOptions extends SvgExportOptions {
  readonly scale?: number;
  readonly maxDimension?: number;
  readonly maxPixels?: number;
}

export interface PngExportResult {
  readonly blob: Blob;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly warnings: readonly string[];
}

const DEFAULT_MAX_DIMENSION = 16_384;
const DEFAULT_MAX_PIXELS = 67_108_864;

/**
 * Rasterizes the camera-independent SVG scene into an offscreen canvas. Data URL images
 * are portable; cross-origin remote images may be rejected by browser canvas security.
 */
export async function exportSceneDocumentPng(
  document: SceneDocument,
  options: PngExportOptions = {},
): Promise<ExportOperationResult<PngExportResult>> {
  if (
    typeof window === 'undefined' ||
    typeof Image === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return exportFailure(
      new DocumentExportError(
        'unsupported-environment',
        'PNG export requires browser Canvas, Image, and object URL support.',
      ),
    );
  }

  const svgResult = serializeSceneDocumentSvg(document, options);
  if (!svgResult.ok) return svgResult;

  const scale = Math.max(0.01, options.scale ?? 1);
  const pixelWidth = Math.max(1, Math.ceil(svgResult.value.width * scale));
  const pixelHeight = Math.max(1, Math.ceil(svgResult.value.height * scale));
  const maximumDimension = Math.max(1, options.maxDimension ?? DEFAULT_MAX_DIMENSION);
  const maximumPixels = Math.max(1, options.maxPixels ?? DEFAULT_MAX_PIXELS);
  if (
    pixelWidth > maximumDimension ||
    pixelHeight > maximumDimension ||
    pixelWidth * pixelHeight > maximumPixels
  ) {
    return exportFailure(
      new DocumentExportError(
        'rasterization-failed',
        `The requested ${pixelWidth}×${pixelHeight} PNG exceeds the safe canvas limit.`,
      ),
    );
  }

  const canvas = window.document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    return exportFailure(
      new DocumentExportError('unsupported-environment', 'Canvas 2D is unavailable.'),
    );
  }

  const svgBlob = new Blob([svgResult.value.svg], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);
  try {
    const image = await loadSvgImage(objectUrl);
    context.clearRect(0, 0, pixelWidth, pixelHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
    const blob = await canvasToPngBlob(canvas);
    return exportSuccess({
      blob,
      pixelWidth,
      pixelHeight,
      warnings: svgResult.value.warnings,
    });
  } catch (error) {
    return exportFailure(
      new DocumentExportError(
        'rasterization-failed',
        'The SVG could not be rasterized. Remote images may be blocked by canvas security.',
        error,
      ),
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export const exportDocumentToPng = exportSceneDocumentPng;

export async function downloadSceneDocumentPng(
  document: SceneDocument,
  options: PngExportOptions = {},
  filename = `${document.name}.png`,
): Promise<ExportOperationResult<void>> {
  const exported = await exportSceneDocumentPng(document, options);
  return exported.ok
    ? downloadBlob(exported.value.blob, sanitizeDownloadFilename(filename, 'document.png'))
    : exported;
}

function loadSvgImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('The browser failed to decode the generated SVG.'));
    image.src = source;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas returned an empty PNG blob.'));
      }, 'image/png');
    } catch (error) {
      reject(
        error instanceof Error
          ? error
          : new Error('Canvas failed while encoding the PNG.', { cause: error }),
      );
    }
  });
}

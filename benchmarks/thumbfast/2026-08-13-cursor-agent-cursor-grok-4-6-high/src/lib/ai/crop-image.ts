import sharp from "sharp";

import { ASPECT_RATIO_CONFIG, type AspectRatio } from "./aspect-ratio";

const TARGET_RATIO: Record<AspectRatio, number> = {
  "16:9": 16 / 9,
  "9:16": 9 / 16,
  "1:1": 1,
};

const RATIO_TOLERANCE = 0.01;

export type CropResult = {
  buffer: Buffer;
  mediaType: string;
  width?: number;
  height?: number;
};

export async function cropToAspectRatio(
  buffer: Buffer,
  mediaType: string,
  aspectRatio: AspectRatio,
): Promise<CropResult> {
  const targetRatio = TARGET_RATIO[aspectRatio];
  const targetSize = ASPECT_RATIO_CONFIG[aspectRatio];
  const image = sharp(buffer);
  const { width, height } = await image.metadata();

  if (!width || !height) {
    return { buffer, mediaType };
  }

  const currentRatio = width / height;
  if (
    Math.abs(currentRatio - targetRatio) < RATIO_TOLERANCE &&
    width === targetSize.width &&
    height === targetSize.height
  ) {
    return { buffer, mediaType, width, height };
  }

  let cropWidth: number;
  let cropHeight: number;

  if (currentRatio > targetRatio) {
    cropHeight = height;
    cropWidth = Math.round(height * targetRatio);
  } else {
    cropWidth = width;
    cropHeight = Math.round(width / targetRatio);
  }

  const left = Math.round((width - cropWidth) / 2);
  const top = Math.round((height - cropHeight) / 2);

  const cropped = await image
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize(targetSize.width, targetSize.height, { fit: "fill" })
    .toBuffer();

  return {
    buffer: cropped,
    mediaType,
    width: targetSize.width,
    height: targetSize.height,
  };
}

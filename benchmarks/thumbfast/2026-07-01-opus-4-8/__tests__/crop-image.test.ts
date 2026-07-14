import { cropToAspectRatio } from "@/lib/ai/crop-image";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

async function makeBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
}

async function dimensionsOf(buffer: Buffer) {
  const { width, height } = await sharp(buffer).metadata();
  return { width, height };
}

describe("cropToAspectRatio", () => {
  it("crops 1536x1024 to exact 1280x720 for 16:9", async () => {
    const input = await makeBuffer(1536, 1024);
    const result = await cropToAspectRatio(input, "image/png", "16:9");
    const { width, height } = await dimensionsOf(result.buffer);

    expect(width).toBe(1280);
    expect(height).toBe(720);
    expect(result.mediaType).toBe("image/png");
  });

  it("crops 1024x1536 to exact 720x1280 for 9:16", async () => {
    const input = await makeBuffer(1024, 1536);
    const result = await cropToAspectRatio(input, "image/png", "9:16");
    const { width, height } = await dimensionsOf(result.buffer);

    expect(width).toBe(720);
    expect(height).toBe(1280);
  });

  it("does not crop 1024x1024 for 1:1 (fast-path)", async () => {
    const input = await makeBuffer(1024, 1024);
    const result = await cropToAspectRatio(input, "image/png", "1:1");

    expect(result.buffer).toBe(input);
  });

  it("resizes matching-ratio sources to exact target dimensions", async () => {
    const input = await makeBuffer(1920, 1080);
    const result = await cropToAspectRatio(input, "image/png", "16:9");
    const { width, height } = await dimensionsOf(result.buffer);

    expect(width).toBe(1280);
    expect(height).toBe(720);
  });

  it("crops taller-than-target canvas to 16:9 by removing top/bottom", async () => {
    const input = await makeBuffer(1000, 1000);
    const result = await cropToAspectRatio(input, "image/png", "16:9");
    const { width, height } = await dimensionsOf(result.buffer);

    expect(width).toBe(1280);
    expect(height).toBe(720);
  });

  it("preserves mediaType through the crop", async () => {
    const input = await makeBuffer(1536, 1024);
    const result = await cropToAspectRatio(input, "image/jpeg", "16:9");

    expect(result.mediaType).toBe("image/jpeg");
  });
});

/** Draws a small warning-triangle icon on an offscreen canvas for use as a MapLibre image (no external asset/network needed). */
export function createTsunamiIcon(size = 22): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.moveTo(size / 2, size * 0.08);
  ctx.lineTo(size * 0.94, size * 0.92);
  ctx.lineTo(size * 0.06, size * 0.92);
  ctx.closePath();
  ctx.fillStyle = "#e4e6ec";
  ctx.strokeStyle = "#0c0d10";
  ctx.lineWidth = 1.6;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0c0d10";
  ctx.font = `bold ${Math.round(size * 0.46)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("!", size / 2, size * 0.66);

  return ctx.getImageData(0, 0, size, size);
}

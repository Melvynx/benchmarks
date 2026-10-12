import {
  CanvasTexture,
  ExtrudeGeometry,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type BufferGeometry,
} from "three";

let heart: BufferGeometry | null = null;
export function heartGeometry() {
  if (heart) return heart;
  const s = new Shape();
  s.moveTo(5, 5);
  s.bezierCurveTo(5, 5, 4, 0, 0, 0);
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7);
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19);
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7);
  s.bezierCurveTo(16, 7, 16, 0, 10, 0);
  s.bezierCurveTo(7, 0, 5, 5, 5, 5);
  const g = new ExtrudeGeometry(s, {
    depth: 3,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 1.5,
    bevelThickness: 1.5,
    curveSegments: 10,
  });
  g.center();
  g.rotateZ(Math.PI);
  g.scale(1 / 22, 1 / 22, 1 / 22);
  heart = g;
  return g;
}

let star: BufferGeometry | null = null;
export function starGeometry() {
  if (star) return star;
  const s = new Shape();
  const pts = 4;
  for (let i = 0; i <= pts * 2; i++) {
    const a = (i / (pts * 2)) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 0.5 : 0.14;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  star = new ShapeGeometry(s);
  return star;
}

const FONT = '"Fredoka Variable", "Fredoka", ui-rounded, system-ui, sans-serif';

export function textTexture(
  text: string,
  opts: { width?: number; height?: number; color?: string; stroke?: string; size?: number; bg?: string } = {},
) {
  const { width = 256, height = 128, color = "#fff", stroke, size = 90, bg } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const draw = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.font = `700 ${size}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fs = size;
    while (ctx.measureText(text).width > width * 0.86 && fs > 10) {
      fs -= 4;
      ctx.font = `700 ${fs}px ${FONT}`;
    }
    if (stroke) {
      ctx.lineWidth = fs * 0.14;
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, width / 2, height / 2 + fs * 0.04);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, width / 2, height / 2 + fs * 0.04);
    tex.needsUpdate = true;
  };
  draw();
  if (document.fonts?.ready) void document.fonts.ready.then(draw);
  return tex;
}

export function radialTexture(inner: string, outer: string, size = 128) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

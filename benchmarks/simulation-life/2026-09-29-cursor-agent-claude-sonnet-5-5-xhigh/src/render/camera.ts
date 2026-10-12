export interface Pt {
  x: number;
  y: number;
  d: number;
}

export class Camera {
  yaw = 0.7;
  pitch = 0.92;
  zoom = 1;
  width = 800;
  height = 600;
  cx = 400;
  cy = 300;
  scale = 10;
  radius = 24;

  private c = 1;
  private s = 0;
  private cp = 0;
  private sp = 1;

  viewX = 0;
  viewY = 0;
  viewZ = 1;

  setViewport(width: number, height: number, radius: number) {
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.update();
  }

  update() {
    this.c = Math.cos(this.yaw);
    this.s = Math.sin(this.yaw);
    this.cp = Math.cos(this.pitch);
    this.sp = Math.sin(this.pitch);
    const R = this.radius;
    const wallDepth = 3.2;
    const treeRise = 5.2;
    const fitW = (this.width * 0.94) / (2 * R + 2);
    const fitH = (this.height * 0.94) / (2 * R * this.sp + (wallDepth + treeRise) * this.cp + 2);
    this.scale = Math.min(fitW, fitH) * this.zoom;
    this.cx = this.width / 2;
    this.cy = this.height / 2 + ((treeRise - wallDepth) / 2) * this.cp * this.scale;
    this.viewX = -this.cp * this.s;
    this.viewY = -this.cp * this.c;
    this.viewZ = this.sp;
  }

  project(x: number, y: number, z: number, out: Pt) {
    const rx = x * this.c - y * this.s;
    const ry = x * this.s + y * this.c;
    out.x = this.cx + rx * this.scale;
    out.y = this.cy - (ry * this.sp + z * this.cp) * this.scale;
    out.d = ry * this.cp - z * this.sp;
    return out;
  }

  /** Screen-space direction of a world-space vector (no translation). */
  dir(nx: number, ny: number, nz: number, out: { x: number; y: number }) {
    const rx = nx * this.c - ny * this.s;
    const ry = nx * this.s + ny * this.c;
    out.x = rx * this.scale;
    out.y = -(ry * this.sp + nz * this.cp) * this.scale;
    return out;
  }

  depthOf(x: number, y: number) {
    return (x * this.s + y * this.c) * this.cp;
  }

  /** Affine matrix that maps ground (x, y) to screen pixels. */
  groundMatrix(): [number, number, number, number, number, number] {
    return [this.scale * this.c, -this.scale * this.sp * this.s, -this.scale * this.s, -this.scale * this.sp * this.c, this.cx, this.cy];
  }

  /** Approximate inverse for ground plane picking. */
  unproject(sx: number, sy: number) {
    const rx = (sx - this.cx) / this.scale;
    const ry = -(sy - this.cy) / (this.scale * this.sp);
    return { x: rx * this.c + ry * this.s, y: -rx * this.s + ry * this.c };
  }

  setZoom(z: number) {
    this.zoom = Math.max(0.6, Math.min(2.6, z));
    this.update();
  }

  resetView() {
    this.yaw = 0.7;
    this.pitch = 0.92;
    this.zoom = 1;
    this.update();
  }

  orbit(dx: number, dy: number) {
    this.yaw += dx * 0.0085;
    this.pitch = Math.max(0.42, Math.min(1.32, this.pitch + dy * 0.006));
    this.update();
  }
}

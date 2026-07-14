export class Camera {
  rotX = 0.55;
  rotZ = 0.35;
  zoom = 1;
  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  project(x: number, y: number, z = 0): { x: number; y: number; depth: number } {
    const cosZ = Math.cos(this.rotZ);
    const sinZ = Math.sin(this.rotZ);
    const rx = x * cosZ - y * sinZ;
    const ry = x * sinZ + y * cosZ;

    const cosX = Math.cos(this.rotX);
    const sinX = Math.sin(this.rotX);
    const ry2 = ry * cosX - z * sinX;
    const rz = ry * sinX + z * cosX;

    const scale = this.zoom * (1.05 - rz * 0.00055);
    return {
      x: rx * scale,
      y: ry2 * scale * 0.72,
      depth: rz,
    };
  }

  bind(el: HTMLElement): () => void {
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest("button, input, select, label, a")) return;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!this.dragging) return;
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.rotZ += dx * 0.008;
      this.rotX = Math.max(0.25, Math.min(1.15, this.rotX + dy * 0.006));
    };
    const onUp = () => {
      this.dragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.zoom = Math.max(0.55, Math.min(1.8, this.zoom * (e.deltaY > 0 ? 0.94 : 1.06)));
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
    };
  }
}

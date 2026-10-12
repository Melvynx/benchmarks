import type { PointerEvent as ReactPointerEvent } from "react";
import type { Editor } from "../engine/editor";

export function NumField({
  label,
  value,
  onChange,
  editor,
}: {
  label: string;
  value: number | "mixed" | null;
  onChange: (value: number) => void;
  editor: Editor;
}) {
  const shown = value === "mixed" ? "Mixed" : value === null ? "" : trimNum(value);
  return (
    <label className="num">
      <span
        onPointerDown={(event) => {
          if (value === "mixed" || value === null) return;
          scrub(event, value, onChange, editor);
        }}
      >
        {label}
      </span>
      <input
        value={shown}
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next)) onChange(next);
        }}
      />
    </label>
  );
}

function scrub(
  event: ReactPointerEvent<HTMLSpanElement>,
  start: number,
  onChange: (value: number) => void,
  _editor: Editor,
): void {
  event.preventDefault();
  const originX = event.clientX;
  const pointerId = event.pointerId;
  event.currentTarget.setPointerCapture(pointerId);
  const move = (ev: PointerEvent) => {
    const scale = ev.shiftKey ? 10 : ev.altKey ? 0.1 : 1;
    onChange(Math.round((start + (ev.clientX - originX) * scale) * 100) / 100);
  };
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

export function trimNum(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function shared<T>(values: T[]): { mixed: true } | { mixed: false; value: T } {
  const first = values[0];
  if (first === undefined) return { mixed: true };
  for (const value of values) {
    if (!same(value, first)) return { mixed: true };
  }
  return { mixed: false, value: first };
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

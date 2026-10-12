import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { hexToRgba, hslToRgb, rgbToHsl, rgbaToHex } from "../engine/color";
import type { RGBA } from "../engine/types";

const RECENT_KEY = "grok47.design.recents";

export function ColorPicker({ color, onChange }: { color: RGBA; onChange: (color: RGBA) => void }) {
  const hsl = rgbToHsl(color);
  const [recent, setRecent] = useState<string[]>(() => readRecent());
  const commit = (next: RGBA) => {
    onChange(next);
    const hex = rgbaToHex(next);
    const stored = [hex, ...recent.filter((item) => item !== hex)].slice(0, 8);
    setRecent(stored);
    localStorage.setItem(RECENT_KEY, JSON.stringify(stored));
  };
  return (
    <div className="picker" onPointerDown={(event) => event.stopPropagation()}>
      <div
        className="sv"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsl.h}, 100%, 50%))` }}
        onPointerDown={(event) => dragSV(event, hsl.h, color.a, commit)}
      >
        <i style={{ left: `${hsl.s * 100}%`, top: `${(1 - hsl.l) * 100}%` }} />
      </div>
      <input
        className="hue"
        type="range"
        min={0}
        max={360}
        value={hsl.h}
        onChange={(event) => commit(hslToRgb(Number(event.target.value), hsl.s, hsl.l, color.a))}
      />
      <input
        className="alpha"
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={color.a}
        onChange={(event) => commit({ ...color, a: Number(event.target.value) })}
      />
      <div className="picker-row">
        <input
          value={rgbaToHex(color)}
          onChange={(event) => {
            const next = hexToRgba(event.target.value, color.a);
            if (next) commit(next);
          }}
        />
        <button type="button" onClick={() => eyedrop(color.a, commit)}>Pick</button>
      </div>
      <div className="recents">
        {recent.map((hex) => (
          <button key={hex} type="button" style={{ background: hex }} onClick={() => {
            const next = hexToRgba(hex, color.a);
            if (next) onChange(next);
          }} />
        ))}
      </div>
    </div>
  );
}

function dragSV(event: ReactPointerEvent<HTMLDivElement>, hue: number, alpha: number, commit: (color: RGBA) => void): void {
  const el = event.currentTarget;
  const update = (ev: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    const s = clamp((ev.clientX - rect.left) / rect.width);
    const v = 1 - clamp((ev.clientY - rect.top) / rect.height);
    const l = v * (1 - s / 2);
    const sat = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
    commit(hslToRgb(hue, Number.isFinite(sat) ? sat : 0, l, alpha));
  };
  update(event.nativeEvent);
  const move = (ev: PointerEvent) => update(ev);
  const up = () => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
  };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
}

async function eyedrop(alpha: number, commit: (color: RGBA) => void): Promise<void> {
  if (!window.EyeDropper) return;
  try {
    const result = await new window.EyeDropper().open();
    const next = hexToRgba(result.sRGBHex, alpha);
    if (next) commit(next);
  } catch {
    /* dismissed */
  }
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : ["#4c7dff", "#16161a", "#ffffff"];
  } catch {
    return ["#4c7dff"];
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}

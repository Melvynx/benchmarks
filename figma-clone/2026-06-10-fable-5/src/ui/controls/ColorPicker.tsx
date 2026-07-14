import { useCallback, useEffect, useRef, useState, type JSX } from 'react';
import type { GradientPaint, Paint, SolidPaint } from '../../scene/types';
import {
  hsvaToRgba,
  parseHex,
  rgbaToCss,
  rgbaToHex,
  rgbaToHsva,
  type HSVA,
  type RGBA,
} from '../../utils/color';
import { addRecentColor, useEditor } from '../../store/store';
import { paintToCss } from '../../render/paints';
import { NumberInput } from './NumberInput';
import { IEyedropper, IMinus, IPlus } from '../icons';

interface EyeDropperResult {
  sRGBHex: string;
}
interface EyeDropperApi {
  open(): Promise<EyeDropperResult>;
}
declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperApi;
  }
}

export interface ColorPickerProps {
  paint: Paint;
  onChange: (paint: Paint, commit: boolean) => void;
  /** Allow switching between solid and gradient modes. */
  allowGradients?: boolean;
}

type Mode = 'solid' | 'gradient-linear' | 'gradient-radial';

/** Full paint editor: solid color (SV square + hue + alpha) and gradients. */
export function ColorPicker({ paint, onChange, allowGradients = true }: ColorPickerProps): JSX.Element {
  const mode: Mode = paint.type === 'image' ? 'solid' : paint.type;
  const [stopIndex, setStopIndex] = useState(0);

  const activeColor: RGBA =
    paint.type === 'solid'
      ? paint.color
      : paint.type === 'image'
        ? { r: 128, g: 128, b: 128, a: 1 }
        : (paint.stops[Math.min(stopIndex, paint.stops.length - 1)]?.color ?? { r: 0, g: 0, b: 0, a: 1 });

  const applyColor = (color: RGBA, commit: boolean): void => {
    if (paint.type === 'solid') {
      onChange({ ...paint, color }, commit);
    } else if (paint.type !== 'image') {
      const stops = paint.stops.map((s, i) => (i === stopIndex ? { ...s, color } : s));
      onChange({ ...paint, stops }, commit);
    }
    if (commit) addRecentColor(rgbaToHex(color, true));
  };

  const switchMode = (next: Mode): void => {
    if (next === mode) return;
    if (next === 'solid') {
      const color = paint.type !== 'solid' && paint.type !== 'image' ? (paint.stops[0]?.color ?? activeColor) : activeColor;
      const solid: SolidPaint = { type: 'solid', enabled: paint.enabled, opacity: paint.opacity, color };
      onChange(solid, true);
    } else {
      const base = activeColor;
      const gradient: GradientPaint =
        paint.type === 'gradient-linear' || paint.type === 'gradient-radial'
          ? { ...paint, type: next }
          : {
              type: next,
              enabled: paint.enabled,
              opacity: paint.opacity,
              angle: 90,
              stops: [
                { position: 0, color: base },
                { position: 1, color: { ...base, a: 0 } },
              ],
            };
      onChange(gradient, true);
      setStopIndex(0);
    }
  };

  return (
    <div className="color-picker">
      {allowGradients && (
        <div className="color-picker__modes">
          {(
            [
              ['solid', 'Solid'],
              ['gradient-linear', 'Linear'],
              ['gradient-radial', 'Radial'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              className={`seg-btn${mode === value ? ' is-active' : ''}`}
              onClick={() => switchMode(value)}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {(paint.type === 'gradient-linear' || paint.type === 'gradient-radial') && (
        <GradientStopsEditor
          paint={paint}
          stopIndex={stopIndex}
          onSelectStop={setStopIndex}
          onChange={onChange}
        />
      )}

      <SolidColorEditor color={activeColor} onChange={applyColor} />
      <RecentColors onPick={(c) => applyColor(c, true)} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Solid editor
// ---------------------------------------------------------------------------

function SolidColorEditor({
  color,
  onChange,
}: {
  color: RGBA;
  onChange: (c: RGBA, commit: boolean) => void;
}): JSX.Element {
  const [hsva, setHsva] = useState<HSVA>(() => rgbaToHsva(color));
  const editing = useRef(false);

  // Sync from outside (undo, other stop selected) unless mid-drag.
  useEffect(() => {
    if (editing.current) return;
    const current = hsvaToRgba(hsva);
    if (rgbaToHex(current, true) !== rgbaToHex(color, true)) setHsva(rgbaToHsva(color));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const update = (next: HSVA, commit: boolean): void => {
    setHsva(next);
    onChange(hsvaToRgba(next), commit);
  };

  const dragSlider = useCallback(
    (
      e: React.PointerEvent<HTMLDivElement>,
      apply: (fx: number, fy: number, commit: boolean) => void,
    ): void => {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);
      editing.current = true;
      const rect = el.getBoundingClientRect();
      const sample = (ev: { clientX: number; clientY: number }, commit: boolean): void => {
        const fx = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
        const fy = Math.min(1, Math.max(0, (ev.clientY - rect.top) / rect.height));
        apply(fx, fy, commit);
      };
      sample(e, false);
      const move = (ev: PointerEvent): void => sample(ev, false);
      const up = (ev: PointerEvent): void => {
        sample(ev, true);
        editing.current = false;
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [],
  );

  const hueColor = rgbaToCss(hsvaToRgba({ h: hsva.h, s: 1, v: 1, a: 1 }));
  const opaque = rgbaToCss({ ...hsvaToRgba(hsva), a: 1 });

  const pickWithEyedropper = async (): Promise<void> => {
    const Ctor = window.EyeDropper;
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      const parsed = parseHex(result.sRGBHex);
      if (parsed) update({ ...rgbaToHsva({ ...parsed, a: hsva.a }) }, true);
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="solid-editor">
      <div
        className="sv-square"
        style={{ backgroundColor: hueColor }}
        onPointerDown={(e) => dragSlider(e, (fx, fy, commit) => update({ ...hsva, s: fx, v: 1 - fy }, commit))}
      >
        <div className="sv-square__white" />
        <div className="sv-square__black" />
        <div
          className="sv-square__thumb"
          style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, backgroundColor: opaque }}
        />
      </div>

      <div className="picker-sliders-row">
        {window.EyeDropper && (
          <button className="icon-btn" title="Pick color from screen" onClick={() => void pickWithEyedropper()}>
            <IEyedropper />
          </button>
        )}
        <div className="picker-sliders">
          <div className="hue-slider" onPointerDown={(e) => dragSlider(e, (fx, _fy, commit) => update({ ...hsva, h: fx * 360 }, commit))}>
            <div className="slider-thumb" style={{ left: `${(hsva.h / 360) * 100}%`, backgroundColor: hueColor }} />
          </div>
          <div className="alpha-slider" onPointerDown={(e) => dragSlider(e, (fx, _fy, commit) => update({ ...hsva, a: fx }, commit))}>
            <div className="alpha-slider__fill" style={{ background: `linear-gradient(90deg, transparent, ${opaque})` }} />
            <div className="slider-thumb" style={{ left: `${hsva.a * 100}%`, backgroundColor: rgbaToCss(hsvaToRgba(hsva)) }} />
          </div>
        </div>
      </div>

      <div className="hex-row">
        <HexInput color={hsvaToRgba(hsva)} onCommit={(c) => update(rgbaToHsva(c), true)} />
        <NumberInput
          value={Math.round(hsva.a * 100)}
          min={0}
          max={100}
          suffix="%"
          onChange={(v, commit) => update({ ...hsva, a: v / 100 }, commit)}
        />
      </div>
    </div>
  );
}

function HexInput({ color, onCommit }: { color: RGBA; onCommit: (c: RGBA) => void }): JSX.Element {
  const [text, setText] = useState<string | null>(null);
  const display = rgbaToHex(color);
  return (
    <input
      className="hex-input"
      spellCheck={false}
      value={text ?? display}
      onFocus={(e) => {
        setText(display);
        requestAnimationFrame(() => e.target.select());
      }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setText(null);
          (e.target as HTMLInputElement).blur();
        }
      }}
      onBlur={() => {
        if (text !== null) {
          const parsed = parseHex(text);
          if (parsed) onCommit({ ...parsed, a: parsed.a < 1 ? parsed.a : color.a });
        }
        setText(null);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Gradient stops
// ---------------------------------------------------------------------------

function GradientStopsEditor({
  paint,
  stopIndex,
  onSelectStop,
  onChange,
}: {
  paint: GradientPaint;
  stopIndex: number;
  onSelectStop: (i: number) => void;
  onChange: (paint: Paint, commit: boolean) => void;
}): JSX.Element {
  const barRef = useRef<HTMLDivElement>(null);

  const setStops = (stops: GradientPaint['stops'], commit: boolean): void => {
    onChange({ ...paint, stops }, commit);
  };

  const addStopAt = (position: number): void => {
    const sorted = [...paint.stops].sort((a, b) => a.position - b.position);
    const before = sorted.filter((s) => s.position <= position).pop() ?? sorted[0];
    const color = before?.color ?? { r: 255, g: 255, b: 255, a: 1 };
    const stops = [...paint.stops, { position, color }];
    setStops(stops, true);
    onSelectStop(stops.length - 1);
  };

  const dragStop = (e: React.PointerEvent, index: number): void => {
    e.stopPropagation();
    onSelectStop(index);
    const bar = barRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const move = (ev: PointerEvent): void => {
      const f = Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width));
      setStops(
        paint.stops.map((s, i) => (i === index ? { ...s, position: Math.round(f * 100) / 100 } : s)),
        false,
      );
    };
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onChange({ ...paint }, true);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="gradient-editor">
      <div
        ref={barRef}
        className="gradient-bar"
        style={{ background: paintToCss({ ...paint, type: 'gradient-linear', angle: 0 }) }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          addStopAt(Math.round(((e.clientX - rect.left) / rect.width) * 100) / 100);
        }}
      >
        {paint.stops.map((stop, i) => (
          <div
            key={i}
            className={`gradient-stop${i === stopIndex ? ' is-active' : ''}`}
            style={{ left: `${stop.position * 100}%`, backgroundColor: rgbaToCss({ ...stop.color, a: 1 }) }}
            onPointerDown={(e) => dragStop(e, i)}
          />
        ))}
      </div>
      <div className="gradient-controls">
        {paint.type === 'gradient-linear' && (
          <NumberInput
            value={paint.angle}
            label="∠"
            suffix="°"
            onChange={(v, commit) => onChange({ ...paint, angle: v }, commit)}
          />
        )}
        <button
          className="icon-btn"
          title="Add stop"
          onClick={() => addStopAt(0.5)}
        >
          <IPlus />
        </button>
        <button
          className="icon-btn"
          title="Remove stop"
          disabled={paint.stops.length <= 2}
          onClick={() => {
            if (paint.stops.length <= 2) return;
            const stops = paint.stops.filter((_, i) => i !== stopIndex);
            onSelectStop(Math.max(0, stopIndex - 1));
            setStops(stops, true);
          }}
        >
          <IMinus />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recents
// ---------------------------------------------------------------------------

function RecentColors({ onPick }: { onPick: (c: RGBA) => void }): JSX.Element | null {
  const recents = useEditor((s) => s.recentColors);
  if (recents.length === 0) return null;
  return (
    <div className="recent-colors">
      {recents.map((hex) => {
        const color = parseHex(hex);
        if (!color) return null;
        return (
          <button
            key={hex}
            className="recent-swatch"
            style={{ backgroundColor: rgbaToCss(color) }}
            title={`#${hex}`}
            onClick={() => onPick(color)}
          />
        );
      })}
    </div>
  );
}

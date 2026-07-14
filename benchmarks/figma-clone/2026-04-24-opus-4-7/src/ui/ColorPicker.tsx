import { useEffect, useRef, useState } from 'react';

interface Props {
  color: string; // #rrggbb
  opacity: number; // 0..1
  onChange: (color: string, opacity: number) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

const rgbToHex = (r: number, g: number, b: number): string =>
  '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('');

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const v = hex.replace('#', '');
  if (v.length === 3) {
    return {
      r: parseInt(v[0]! + v[0]!, 16),
      g: parseInt(v[1]! + v[1]!, 16),
      b: parseInt(v[2]! + v[2]!, 16),
    };
  }
  return {
    r: parseInt(v.slice(0, 2), 16) || 0,
    g: parseInt(v.slice(2, 4), 16) || 0,
    b: parseInt(v.slice(4, 6), 16) || 0,
  };
};

const rgbToHsv = (r: number, g: number, b: number): HSV => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
};

const hsvToRgb = (h: number, s: number, v: number): { r: number; g: number; b: number } => {
  const c = v * s;
  const hh = h / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hh < 1) {
    r = c;
    g = x;
  } else if (hh < 2) {
    r = x;
    g = c;
  } else if (hh < 3) {
    g = c;
    b = x;
  } else if (hh < 4) {
    g = x;
    b = c;
  } else if (hh < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = v - c;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
};

const RECENT_KEY = 'vector.colors.recent';
const loadRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
};
const saveRecent = (cols: string[]): void => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(cols.slice(0, 16)));
  } catch {
    /* ignore */
  }
};

export const ColorPicker = ({ color, opacity, onChange, onClose, anchorRect }: Props): JSX.Element => {
  const rgb = hexToRgb(color);
  const initialHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const [hsv, setHsv] = useState<HSV>(initialHsv);
  const [alpha, setAlpha] = useState(opacity);
  const [hexInput, setHexInput] = useState(color);
  const [recent] = useState<string[]>(loadRecent());

  const panelRef = useRef<HTMLDivElement | null>(null);

  const emitChange = (h = hsv) => {
    const { r, g, b } = hsvToRgb(h.h, h.s, h.v);
    onChange(rgbToHex(r, g, b), alpha);
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onClose]);

  // On unmount, save recent
  useEffect(() => {
    return () => {
      const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
      const hex = rgbToHex(r, g, b);
      const next = [hex, ...recent.filter((c) => c !== hex)].slice(0, 16);
      saveRecent(next);
    };
  }, [hsv, recent]);

  const rect = anchorRect;
  const left = rect ? rect.right - 240 : 100;
  const top = rect ? rect.bottom + 8 : 100;

  const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const solidHex = rgbToHex(r, g, b);

  return (
    <div
      ref={panelRef}
      className="fixed z-50 w-60 bg-panel-bg border border-panel-divider rounded-md shadow-2xl slide-in-top"
      style={{ left, top }}
    >
      <SaturationValuePad
        hsv={hsv}
        onChange={(h) => {
          setHsv(h);
          emitChange(h);
        }}
      />
      <div className="px-3 pt-3 pb-2 space-y-2">
        <HueSlider
          h={hsv.h}
          onChange={(h) => {
            const next = { ...hsv, h };
            setHsv(next);
            emitChange(next);
          }}
        />
        <AlphaSlider
          color={solidHex}
          alpha={alpha}
          onChange={(a) => {
            setAlpha(a);
            const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
            onChange(rgbToHex(r, g, b), a);
          }}
        />
        <div className="flex gap-1.5 items-center">
          <input
            type="text"
            value={hexInput.toUpperCase()}
            onFocus={() => setHexInput(solidHex)}
            onChange={(e) => {
              const v = e.target.value;
              setHexInput(v);
              const rgb = hexToRgb(v);
              if (
                Number.isFinite(rgb.r) &&
                Number.isFinite(rgb.g) &&
                Number.isFinite(rgb.b) &&
                /^#?[0-9a-f]{6}$/i.test(v.startsWith('#') ? v : '#' + v)
              ) {
                const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
                setHsv(next);
                onChange(rgbToHex(rgb.r, rgb.g, rgb.b), alpha);
              }
            }}
            className="flex-1 num-input uppercase font-mono"
          />
          <div className="w-12">
            <input
              type="number"
              min={0}
              max={100}
              value={Math.round(alpha * 100)}
              onChange={(e) => {
                const a = Math.max(0, Math.min(100, Number(e.target.value))) / 100;
                setAlpha(a);
                const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
                onChange(rgbToHex(r, g, b), a);
              }}
              className="num-input text-right"
            />
          </div>
        </div>
        {/* RGB */}
        <div className="grid grid-cols-3 gap-1.5">
          {(['r', 'g', 'b'] as const).map((ch) => {
            const v = ch === 'r' ? r : ch === 'g' ? g : b;
            return (
              <input
                key={ch}
                type="number"
                min={0}
                max={255}
                value={Math.round(v)}
                onChange={(e) => {
                  const vv = Math.max(0, Math.min(255, Number(e.target.value)));
                  const cur = { r, g, b, [ch]: vv } as { r: number; g: number; b: number };
                  const next = rgbToHsv(cur.r, cur.g, cur.b);
                  setHsv(next);
                  onChange(rgbToHex(cur.r, cur.g, cur.b), alpha);
                }}
                className="num-input text-right"
              />
            );
          })}
        </div>
        {/* Recent */}
        {recent.length > 0 && (
          <div>
            <div className="panel-section-title mt-1.5">Recent</div>
            <div className="flex flex-wrap gap-1">
              {recent.map((c) => (
                <button
                  key={c}
                  className="w-5 h-5 rounded border border-panel-divider"
                  style={{ background: c }}
                  onClick={() => {
                    const rgb = hexToRgb(c);
                    const next = rgbToHsv(rgb.r, rgb.g, rgb.b);
                    setHsv(next);
                    onChange(c, alpha);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SaturationValuePad = ({ hsv, onChange }: { hsv: HSV; onChange: (h: HSV) => void }): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null);
  const down = useRef(false);

  const onPos = (e: React.MouseEvent | MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onChange({ ...hsv, s, v });
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (down.current) onPos(e);
    };
    const up = () => {
      down.current = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hsv]);

  const bg = `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h},100%,50%))`;

  return (
    <div
      ref={ref}
      className="w-full h-36 relative cursor-crosshair"
      style={{ background: bg }}
      onMouseDown={(e) => {
        down.current = true;
        onPos(e);
      }}
    >
      <div
        className="absolute w-3 h-3 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
      />
    </div>
  );
};

const HueSlider = ({ h, onChange }: { h: number; onChange: (h: number) => void }): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null);
  const down = useRef(false);
  const onPos = (e: React.MouseEvent | MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(t * 360);
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (down.current) onPos(e);
    };
    const up = () => {
      down.current = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      className="w-full h-3 rounded cursor-pointer relative"
      style={{
        background:
          'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
      }}
      onMouseDown={(e) => {
        down.current = true;
        onPos(e);
      }}
    >
      <div
        className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${(h / 360) * 100}%` }}
      />
    </div>
  );
};

const AlphaSlider = ({
  color,
  alpha,
  onChange,
}: {
  color: string;
  alpha: number;
  onChange: (a: number) => void;
}): JSX.Element => {
  const ref = useRef<HTMLDivElement | null>(null);
  const down = useRef(false);
  const onPos = (e: React.MouseEvent | MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onChange(t);
  };
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (down.current) onPos(e);
    };
    const up = () => {
      down.current = false;
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div
      ref={ref}
      className="w-full h-3 rounded cursor-pointer relative color-swatch-bg"
      onMouseDown={(e) => {
        down.current = true;
        onPos(e);
      }}
    >
      <div
        className="absolute inset-0 rounded"
        style={{ background: `linear-gradient(to right, rgba(0,0,0,0), ${color})` }}
      />
      <div
        className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ left: `${alpha * 100}%` }}
      />
    </div>
  );
};

import { Pipette } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';

import { cx } from './internal';
import { Popover } from './Popover';

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface EyeDropperResult {
  sRGBHex: string;
}

interface EyeDropperInstance {
  open: () => Promise<EyeDropperResult>;
}

type EyeDropperConstructor = new () => EyeDropperInstance;

type WindowWithEyeDropper = Window & { EyeDropper?: EyeDropperConstructor };

export function parseHexColor(input: string): RgbaColor | null {
  const source = input.trim().replace(/^#/, '');
  if (!/^(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(source)) return null;
  const expanded =
    source.length === 3 || source.length === 4
      ? source.replace(/[\da-f]/gi, (character) => `${character}${character}`)
      : source;
  const hasAlpha = expanded.length === 8;
  const red = Number.parseInt(expanded.slice(0, 2), 16);
  const green = Number.parseInt(expanded.slice(2, 4), 16);
  const blue = Number.parseInt(expanded.slice(4, 6), 16);
  const alpha = hasAlpha ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
  return { r: red, g: green, b: blue, a: alpha };
}

function channelToHex(channel: number): string {
  return Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
}

export function rgbaToHex(color: RgbaColor, includeAlpha: boolean): string {
  const base = `#${channelToHex(color.r)}${channelToHex(color.g)}${channelToHex(color.b)}`;
  return includeAlpha ? `${base}${channelToHex(color.a * 255)}` : base;
}

export function normalizeHexColor(input: string, includeAlpha = false): string | null {
  const color = parseHexColor(input);
  return color ? rgbaToHex(color, includeAlpha) : null;
}

export interface ColorInputProps {
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel: string;
  label?: string;
  showAlpha?: boolean;
  disabled?: boolean;
  recentColors?: readonly string[];
  className?: string;
}

export function ColorInput({
  value,
  onValueChange,
  ariaLabel,
  label,
  showAlpha = true,
  disabled = false,
  recentColors = [],
  className,
}: ColorInputProps) {
  const errorId = useId();
  const cancelBlurCommitRef = useRef(false);
  const parsedValue = parseHexColor(value) ?? { r: 0, g: 0, b: 0, a: 1 };
  const normalizedValue = rgbaToHex(parsedValue, showAlpha);
  const [draft, setDraft] = useState(normalizedValue);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const eyeDropperAvailable =
    typeof window !== 'undefined' && Boolean((window as WindowWithEyeDropper).EyeDropper);

  const validRecentColors = useMemo(
    () =>
      recentColors
        .map((color) => normalizeHexColor(color, showAlpha))
        .filter((color): color is string => color !== null)
        .filter((color, index, colors) => colors.indexOf(color) === index)
        .slice(0, 10),
    [recentColors, showAlpha],
  );

  useEffect(() => {
    if (!editing && !error) setDraft(normalizedValue);
  }, [editing, error, normalizedValue]);

  const applyColor = (color: RgbaColor) => {
    const nextValue = rgbaToHex(color, showAlpha);
    setDraft(nextValue);
    setError(null);
    onValueChange(nextValue);
  };

  const commitDraft = () => {
    const parsedDraft = parseHexColor(draft);
    if (!parsedDraft) {
      setError('Enter a 3, 4, 6, or 8 digit hex color.');
      return false;
    }
    applyColor(parsedDraft);
    return true;
  };

  const handleNativeColor = (event: ChangeEvent<HTMLInputElement>) => {
    const color = parseHexColor(event.currentTarget.value);
    if (color) applyColor({ ...color, a: parsedValue.a });
  };

  const pickFromScreen = async () => {
    const EyeDropper = (window as WindowWithEyeDropper).EyeDropper;
    if (!EyeDropper) return;
    setPicking(true);
    try {
      const result = await new EyeDropper().open();
      const color = parseHexColor(result.sRGBHex);
      if (color) applyColor({ ...color, a: parsedValue.a });
    } catch {
      // Canceling the platform picker is an expected, non-error outcome.
    } finally {
      setPicking(false);
    }
  };

  const solidHex = rgbaToHex(parsedValue, false);
  const alphaPercent = Math.round(parsedValue.a * 100);

  return (
    <div
      className={cx(
        'ui-color-input',
        error && 'ui-color-input--invalid',
        disabled && 'ui-color-input--disabled',
        className,
      )}
    >
      {label ? <span className="ui-color-input__label">{label}</span> : null}
      <Popover
        trigger={
          <span className="ui-color-input__swatch" style={{ background: normalizedValue }} />
        }
        triggerLabel={`Choose ${ariaLabel}`}
        disabled={disabled}
        placement="bottom-start"
        triggerClassName="ui-color-input__swatch-trigger"
        contentClassName="ui-color-picker"
        contentLabel={`${ariaLabel} color picker`}
      >
        <div className="ui-color-picker__native-wrap">
          <input
            type="color"
            className="ui-color-picker__native"
            value={solidHex}
            onChange={handleNativeColor}
            aria-label={`${ariaLabel} visual color picker`}
          />
          <span className="ui-color-picker__native-value">{solidHex}</span>
          {eyeDropperAvailable ? (
            <button
              type="button"
              className="ui-color-picker__eyedropper"
              onClick={() => void pickFromScreen()}
              disabled={picking}
              aria-label={picking ? 'Picking color from screen' : 'Pick color from screen'}
            >
              <Pipette size={15} aria-hidden="true" />
            </button>
          ) : null}
        </div>
        {showAlpha ? (
          <label className="ui-color-picker__alpha">
            <span>Alpha</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={alphaPercent}
              onChange={(event) =>
                applyColor({ ...parsedValue, a: Number(event.currentTarget.value) / 100 })
              }
            />
            <output>{alphaPercent}%</output>
          </label>
        ) : null}
        {validRecentColors.length > 0 ? (
          <div className="ui-color-picker__recent" aria-label="Recent colors">
            <span>Recent</span>
            <div className="ui-color-picker__recent-grid">
              {validRecentColors.map((color) => {
                const parsedColor = parseHexColor(color);
                return (
                  <button
                    key={color}
                    type="button"
                    className="ui-color-picker__recent-button"
                    aria-label={`Use ${color}`}
                    onClick={() => {
                      if (parsedColor) applyColor(parsedColor);
                    }}
                  >
                    <span style={{ background: color }} />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </Popover>
      <input
        type="text"
        className="ui-color-input__text"
        value={draft}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        aria-errormessage={error ? errorId : undefined}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
          setError(null);
        }}
        onFocus={(event) => {
          setEditing(true);
          event.currentTarget.select();
        }}
        onBlur={() => {
          setEditing(false);
          if (cancelBlurCommitRef.current) {
            cancelBlurCommitRef.current = false;
            return;
          }
          commitDraft();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commitDraft();
            event.currentTarget.select();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancelBlurCommitRef.current = true;
            setDraft(normalizedValue);
            setError(null);
            event.currentTarget.blur();
          }
        }}
      />
      <span id={errorId} className="ui-visually-hidden" role="alert">
        {error}
      </span>
    </div>
  );
}

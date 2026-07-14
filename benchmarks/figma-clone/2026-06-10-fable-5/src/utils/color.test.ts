import { describe, expect, it } from 'vitest';
import { hsvaToRgba, parseHex, rgba, rgbaToHex, rgbaToHsva, rgbaToHsla, hslaToRgba } from './color';

describe('color conversions', () => {
  it('parses 3/6/8-digit hex', () => {
    expect(parseHex('#F80')).toEqual(rgba(255, 136, 0, 1));
    expect(parseHex('ff8800')).toEqual(rgba(255, 136, 0, 1));
    expect(parseHex('#FF880080')?.a).toBeCloseTo(0.502, 2);
    expect(parseHex('nope')).toBeNull();
  });

  it('formats hex', () => {
    expect(rgbaToHex(rgba(255, 136, 0, 1))).toBe('FF8800');
    expect(rgbaToHex(rgba(255, 136, 0, 0.5), true)).toBe('FF880080');
  });

  it('round-trips rgb ↔ hsv', () => {
    const original = rgba(120, 200, 64, 0.8);
    const back = hsvaToRgba(rgbaToHsva(original));
    expect(Math.round(back.r)).toBe(120);
    expect(Math.round(back.g)).toBe(200);
    expect(Math.round(back.b)).toBe(64);
    expect(back.a).toBeCloseTo(0.8);
  });

  it('round-trips rgb ↔ hsl', () => {
    const original = rgba(13, 153, 255, 1);
    const back = hslaToRgba(rgbaToHsla(original));
    expect(Math.round(back.r)).toBe(13);
    expect(Math.round(back.g)).toBe(153);
    expect(Math.round(back.b)).toBe(255);
  });
});

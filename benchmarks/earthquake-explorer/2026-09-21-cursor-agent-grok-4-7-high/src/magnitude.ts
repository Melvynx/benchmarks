import type { ExpressionSpecification } from 'maplibre-gl';

export type MagStop = {
  id: string;
  label: string;
  min: number;
  max: number;
  color: string;
  hint: string;
};

export const MAG_STOPS: readonly MagStop[] = [
  { id: 'micro', label: 'Micro', min: 0, max: 2.5, color: '#9fd7e8', hint: 'Under 2.5' },
  { id: 'light', label: 'Light', min: 2.5, max: 4, color: '#3cb89a', hint: '2.5 up to 4' },
  { id: 'moderate', label: 'Moderate', min: 4, max: 5, color: '#e6c15a', hint: '4 up to 5' },
  { id: 'strong', label: 'Strong', min: 5, max: 6, color: '#f08a3e', hint: '5 up to 6' },
  { id: 'major', label: 'Major', min: 6, max: 7, color: '#e24b4b', hint: '6 up to 7' },
  { id: 'great', label: 'Great', min: 7, max: Number.POSITIVE_INFINITY, color: '#f4efe4', hint: '7 and over' },
];

export function magBand(mag: number): MagStop {
  for (let index = MAG_STOPS.length - 1; index >= 0; index -= 1) {
    if (mag >= MAG_STOPS[index].min) return MAG_STOPS[index];
  }
  return MAG_STOPS[0];
}

export function magColor(mag: number): string {
  return magBand(mag).color;
}

export function magColorExpression(): ExpressionSpecification {
  const expression: unknown[] = ['step', ['get', 'mag'], MAG_STOPS[0].color];
  for (const stop of MAG_STOPS.slice(1)) {
    expression.push(stop.min, stop.color);
  }
  return expression as ExpressionSpecification;
}

export function inBand(mag: number, stop: MagStop): boolean {
  if (mag < stop.min) return false;
  if (Number.isFinite(stop.max) && mag >= stop.max) return false;
  return true;
}

import type { CircleLayerSpecification, LineLayerSpecification } from 'maplibre-gl'
import type { ColorMode } from './color'
import { colorExpression } from './color'

export const QUAKE_SOURCE = 'quakes'
export const PLATE_SOURCE = 'plates'
export const PULSE_SOURCE = 'pulse'

export const LAYER_IDS = {
  plateGlow: 'plate-glow',
  plateLine: 'plate-line',
  glow: 'quake-glow',
  dot: 'quake-dot',
  hover: 'quake-hover',
  select: 'quake-select',
  selectInner: 'quake-select-inner',
  pulse: 'quake-pulse',
} as const

/**
 * Point radius as a function of magnitude, then scaled by zoom.
 *
 * Magnitude is logarithmic in energy, so the ramp is deliberately super-linear:
 * an M6 has to read as an order of magnitude more than an M3, not twice as big.
 */
function magnitudeRadius(scale: number, offset = 0): unknown {
  const base: unknown[] = [
    'interpolate',
    ['exponential', 1.28],
    ['coalesce', ['get', 'mag'], 0],
    -1,
    1.8,
    1,
    2.6,
    2,
    3.4,
    3,
    4.8,
    4,
    7,
    5,
    10.5,
    6,
    15,
    7,
    21,
    9,
    32,
  ]
  // `zoom` has to stay the direct input of a top-level interpolate, so the
  // per-zoom factor and any ring offset are folded into each stop instead.
  const at = (factor: number) => {
    const scaled = ['*', base, scale * factor]
    return offset === 0 ? scaled : ['+', scaled, offset]
  }
  return ['interpolate', ['linear'], ['zoom'], 0, at(0.68), 3, at(1), 7, at(1.7), 12, at(2.5)]
}

export function quakeGlowLayer(mode: ColorMode, now: number): CircleLayerSpecification {
  return {
    id: LAYER_IDS.glow,
    type: 'circle',
    source: QUAKE_SOURCE,
    paint: {
      'circle-radius': magnitudeRadius(2.1) as number,
      'circle-color': colorExpression(mode, now) as string,
      'circle-blur': 1,
      'circle-opacity': [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'mag'], 0],
        1,
        0.12,
        4,
        0.28,
        7,
        0.45,
      ] as unknown as number,
    },
  }
}

export function quakeDotLayer(
  mode: ColorMode,
  now: number,
  onDarkBasemap: boolean,
): CircleLayerSpecification {
  return {
    id: LAYER_IDS.dot,
    type: 'circle',
    source: QUAKE_SOURCE,
    layout: {
      // Bigger events paint last so they are never buried by a swarm of micro quakes.
      'circle-sort-key': ['coalesce', ['get', 'mag'], 0] as unknown as number,
    },
    paint: {
      'circle-radius': magnitudeRadius(1) as number,
      'circle-color': colorExpression(mode, now) as string,
      'circle-opacity': 0.88,
      'circle-stroke-width': [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'mag'], 0],
        2,
        0.6,
        6,
        1.6,
      ] as unknown as number,
      'circle-stroke-color': onDarkBasemap ? '#ffffff' : '#0b0d13',
      'circle-stroke-opacity': onDarkBasemap ? 0.45 : 0.35,
    },
  }
}

export function hoverLayer(onDarkBasemap: boolean): CircleLayerSpecification {
  return {
    id: LAYER_IDS.hover,
    type: 'circle',
    source: QUAKE_SOURCE,
    filter: ['==', ['get', 'id'], ''],
    paint: {
      'circle-radius': magnitudeRadius(1, 5) as number,
      'circle-color': 'transparent',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': onDarkBasemap ? '#ffffff' : '#0b0d13',
      'circle-stroke-opacity': 0.8,
    },
  }
}

export function selectLayers(onDarkBasemap: boolean): CircleLayerSpecification[] {
  const ring = onDarkBasemap ? '#ffffff' : '#0b0d13'
  return [
    {
      id: LAYER_IDS.select,
      type: 'circle',
      source: QUAKE_SOURCE,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-radius': magnitudeRadius(1, 13) as number,
        'circle-color': 'transparent',
        'circle-stroke-width': 1,
        'circle-stroke-color': ring,
        'circle-stroke-opacity': 0.4,
      },
    },
    {
      id: LAYER_IDS.selectInner,
      type: 'circle',
      source: QUAKE_SOURCE,
      filter: ['==', ['get', 'id'], ''],
      paint: {
        'circle-radius': magnitudeRadius(1, 6) as number,
        'circle-color': 'transparent',
        'circle-stroke-width': 2.5,
        'circle-stroke-color': ring,
        'circle-stroke-opacity': 0.95,
      },
    },
  ]
}

/** Expanding ring drawn on the single newest event in the current selection. */
export function pulseLayer(onDarkBasemap: boolean): CircleLayerSpecification {
  return {
    id: LAYER_IDS.pulse,
    type: 'circle',
    source: PULSE_SOURCE,
    paint: {
      'circle-radius': 8,
      'circle-color': 'transparent',
      'circle-stroke-width': 1.5,
      'circle-stroke-color': onDarkBasemap ? '#ffffff' : '#111827',
      'circle-stroke-opacity': 0.6,
    },
  }
}

export function plateLayers(
  onDarkBasemap: boolean,
  overImagery = false,
): LineLayerSpecification[] {
  const color = onDarkBasemap ? '#5eead4' : '#0f766e'
  // Photographic tiles are visually noisy, so the boundaries need more weight
  // and opacity there than they do over a flat cartographic basemap.
  const width = overImagery ? [1, 1.3, 6, 2.4] : [1, 0.7, 6, 1.6]
  return [
    {
      id: LAYER_IDS.plateGlow,
      type: 'line',
      source: PLATE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color,
        'line-width': ['interpolate', ['linear'], ['zoom'], 1, 3, 6, 8] as unknown as number,
        'line-blur': 6,
        'line-opacity': overImagery ? 0.3 : onDarkBasemap ? 0.16 : 0.1,
      },
    },
    {
      id: LAYER_IDS.plateLine,
      type: 'line',
      source: PLATE_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': color,
        'line-width': ['interpolate', ['linear'], ['zoom'], ...width] as unknown as number,
        'line-opacity': overImagery ? 0.85 : onDarkBasemap ? 0.55 : 0.6,
        'line-dasharray': [3, 2.5],
      },
    },
  ]
}

import type { StyleSpecification } from 'maplibre-gl'

export type BasemapId = 'dark' | 'light' | 'satellite' | 'ocean'

interface Basemap {
  id: BasemapId
  label: string
  /** A vector style URL, or a locally built raster style. */
  style: string | StyleSpecification
  /** Whether the basemap is dark, so overlays can pick a readable contrast. */
  dark: boolean
  /** Photographic/bathymetric tiles, which need heavier overlay strokes to read. */
  imagery?: boolean
}

function rasterStyle(
  tiles: string[],
  attribution: string,
  maxzoom: number,
  background: string,
): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles,
        tileSize: 256,
        maxzoom,
        attribution,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': background } },
      { id: 'basemap', type: 'raster', source: 'basemap' },
    ],
  }
}

export const BASEMAPS: Basemap[] = [
  {
    id: 'dark',
    label: 'Dark',
    style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    dark: true,
  },
  {
    id: 'light',
    label: 'Light',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: false,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    style: rasterStyle(
      [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      'Imagery &copy; Esri, Maxar, Earthstar Geographics',
      19,
      '#0b1220',
    ),
    dark: true,
    imagery: true,
  },
  {
    id: 'ocean',
    label: 'Seafloor',
    style: rasterStyle(
      [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      'Ocean basemap &copy; Esri, GEBCO, NOAA',
      13,
      '#0a1a2a',
    ),
    dark: false,
    imagery: true,
  },
]

export function getBasemap(id: BasemapId): Basemap {
  return BASEMAPS.find((b) => b.id === id) ?? BASEMAPS[0]
}

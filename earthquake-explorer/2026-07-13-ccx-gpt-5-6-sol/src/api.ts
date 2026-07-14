import type { Earthquake, TimeRange, UsgsFeatureCollection } from './types'

const FEEDS: Record<TimeRange, string> = {
  hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
  day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
  week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
  month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson',
}

export const feedUrl = (range: TimeRange) => FEEDS[range]

export function normalizeFeatureCollection(data: UsgsFeatureCollection): Earthquake[] {
  return data.features.flatMap((feature) => {
    const coordinates = feature.geometry?.coordinates
    if (!coordinates || coordinates.length < 2) return []
    const [longitude, latitude, rawDepth] = coordinates
    const properties = feature.properties
    return [{
      id: feature.id,
      magnitude: Number.isFinite(properties.mag) ? properties.mag : null,
      place: properties.place?.trim() || 'Location unavailable',
      time: properties.time,
      updated: properties.updated,
      longitude,
      latitude,
      depth: Number.isFinite(rawDepth) ? Number(rawDepth) : null,
      felt: Number.isFinite(properties.felt) ? properties.felt : null,
      significance: Number.isFinite(properties.sig) ? properties.sig : null,
      alert: properties.alert,
      tsunami: properties.tsunami === 1,
      status: properties.status,
      type: properties.type,
      url: properties.url,
      detailUrl: properties.detail,
      title: properties.title || properties.place || 'Earthquake',
    }]
  })
}

export async function fetchEarthquakes(range: TimeRange, signal?: AbortSignal) {
  const response = await fetch(FEEDS[range], { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`USGS returned ${response.status}`)
  const data = await response.json() as UsgsFeatureCollection
  if (!Array.isArray(data.features) || !data.metadata) throw new Error('USGS returned an unexpected response')
  return {
    events: normalizeFeatureCollection(data),
    generatedAt: data.metadata.generated,
  }
}

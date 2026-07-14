export interface GeocodeResult {
  label: string;
  lat: number;
  lon: number;
}

/** Free-text place lookup via OpenStreetMap Nominatim (no API key required). */
export async function geocodePlace(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "0");

  const response = await fetch(url.toString(), { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Place search failed (${response.status})`);
  const data: Array<{ display_name: string; lat: string; lon: string }> = await response.json();
  return data.map((d) => ({ label: d.display_name, lat: Number(d.lat), lon: Number(d.lon) }));
}

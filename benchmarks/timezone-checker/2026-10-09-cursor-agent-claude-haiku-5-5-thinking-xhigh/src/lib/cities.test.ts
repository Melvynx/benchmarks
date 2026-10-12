import { describe, expect, it } from "vitest";
import { CITIES, getCityById, searchCities } from "./cities";

describe("city catalog", () => {
  it("has 34 cities with unique ids", () => {
    expect(CITIES).toHaveLength(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(CITIES.length);
  });

  it("uses only valid IANA zones", () => {
    for (const city of CITIES) {
      expect(() => new Intl.DateTimeFormat("en", { timeZone: city.timeZone })).not.toThrow();
    }
  });

  it("does not repeat a timezone, so every row is distinct", () => {
    const zones = CITIES.map((city) => city.timeZone);
    expect(new Set(zones).size).toBe(zones.length);
  });

  it("contains the default cities", () => {
    expect(getCityById("san-francisco")?.name).toBe("San Francisco");
    expect(getCityById("denpasar")?.name).toBe("Denpasar");
    expect(getCityById("geneva")?.name).toBe("Geneva");
  });
});

describe("searchCities", () => {
  it("returns everything alphabetically for an empty query", () => {
    const results = searchCities(CITIES, "  ");
    expect(results).toHaveLength(CITIES.length);
    expect(results[0].name).toBe("Adelaide");
  });

  it("matches city names, countries and aliases", () => {
    expect(searchCities(CITIES, "sf")[0].id).toBe("san-francisco");
    expect(searchCities(CITIES, "bali")[0].id).toBe("denpasar");
    expect(searchCities(CITIES, "nyc")[0].id).toBe("new-york");
    expect(searchCities(CITIES, "japan")[0].id).toBe("tokyo");
  });

  it("ignores accents and case", () => {
    expect(searchCities(CITIES, "sao")[0].id).toBe("sao-paulo");
    expect(searchCities(CITIES, "BOGOTA")[0].id).toBe("bogota");
  });

  it("ranks name prefixes above substrings", () => {
    const results = searchCities(CITIES, "new");
    expect(results[0].id).toBe("new-york");
  });

  it("returns nothing for unmatched queries", () => {
    expect(searchCities(CITIES, "atlantis")).toEqual([]);
  });
});

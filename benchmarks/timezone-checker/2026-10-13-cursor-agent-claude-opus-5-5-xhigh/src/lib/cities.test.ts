import { describe, expect, it } from "vitest";
import { CITIES, DEFAULT_CITY_IDS, REGIONS, searchCities } from "./cities";

describe("catalog", () => {
  it("has ~34 unique cities covering every region", () => {
    expect(CITIES).toHaveLength(34);
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(CITIES.length);
    for (const region of REGIONS) expect(CITIES.some((city) => city.region === region), region).toBe(true);
    for (const id of DEFAULT_CITY_IDS) expect(CITIES.some((city) => city.id === id)).toBe(true);
  });
});

describe("searchCities", () => {
  it("matches by city name, ignoring accents and case", () => {
    expect(searchCities("sao")[0]?.id).toBe("sao-paulo");
    expect(searchCities("BOGOTA")[0]?.id).toBe("bogota");
  });

  it("matches by country", () => {
    expect(searchCities("switzerland").map((city) => city.id)).toEqual(["geneva"]);
    expect(searchCities("united states").length).toBeGreaterThan(3);
  });

  it("ranks name prefixes ahead of other matches", () => {
    expect(searchCities("san")[0]?.id).toBe("san-francisco");
  });

  it("finds common aliases", () => {
    expect(searchCities("bali")[0]?.id).toBe("denpasar");
  });

  it("returns everything for an empty query and nothing for nonsense", () => {
    expect(searchCities("  ")).toHaveLength(CITIES.length);
    expect(searchCities("zzzz")).toEqual([]);
  });
});

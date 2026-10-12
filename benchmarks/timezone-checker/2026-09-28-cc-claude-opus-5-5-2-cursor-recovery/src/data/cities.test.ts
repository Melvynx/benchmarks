import { describe, expect, it } from "vitest";
import { CITIES, REGIONS, searchCities } from "@/data/cities";

describe("city catalog", () => {
  it("has unique ids and valid time zones across every region", () => {
    expect(new Set(CITIES.map((city) => city.id)).size).toBe(CITIES.length);
    expect(CITIES.length).toBeGreaterThanOrEqual(30);
    for (const region of REGIONS) expect(CITIES.some((city) => city.region === region)).toBe(true);
    for (const city of CITIES) expect(() => new Intl.DateTimeFormat("en-US", { timeZone: city.timeZone })).not.toThrow();
  });

  it("searches by name, country, and without accents", () => {
    expect(searchCities("gen")[0]?.id).toBe("geneva");
    expect(searchCities("japan").map((city) => city.id)).toEqual(["tokyo"]);
    expect(searchCities("sao paulo")[0]?.id).toBe("sao-paulo");
    expect(searchCities("bali")[0]?.id).toBe("denpasar");
    expect(searchCities("united states").length).toBeGreaterThan(1);
    expect(searchCities("zzzz")).toEqual([]);
  });
});

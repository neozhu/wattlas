import { describe, expect, it } from "vitest";

import { buildSearchIndex, searchEntities } from "@/lib/search";
import type { AssetFeature, CityCollection, GeneratorFeature, GeographyFeature } from "@/lib/snapshot/types";

const india = {
  type: "Feature",
  id: "IN",
  geometry: { type: "Polygon", coordinates: [] },
  properties: { id: "IN", name: "India", country: "IN", level: "country" },
} as unknown as GeographyFeature;

const assam = {
  type: "Feature",
  id: "IN-ASSAM",
  geometry: { type: "Polygon", coordinates: [] },
  properties: { id: "IN-ASSAM", name: "Assam", country: "IN", level: "admin_1" },
} as unknown as GeographyFeature;

const singapore = {
  type: "Feature",
  id: "SG",
  geometry: { type: "Polygon", coordinates: [] },
  properties: { id: "SG", name: "Singapore", country: "SG", level: "country" },
} as unknown as GeographyFeature;

const dataCentre = {
  type: "Feature",
  id: "asset-1",
  geometry: { type: "Point", coordinates: [77, 28] },
  properties: { id: "asset-1", name: "India AI Campus", country: "IN", category: "data_centre" },
} as unknown as AssetFeature;

const windFarm = {
  type: "Feature",
  id: "generator-1",
  geometry: { type: "Point", coordinates: [-100, 32] },
  properties: { id: "generator-1", name: "Young Wind Farm", country: "US", category: "power_generation", technologies: ["wind"] },
} as unknown as GeneratorFeature;
const jamshedpur = { type: "Feature", id: "natural-earth-jamshedpur", geometry: { type: "Point", coordinates: [86.195573, 22.789481] }, properties: { id: "natural-earth-jamshedpur", name: "Jamshedpur", country: "IN", population: 1300000, populationYear: 2025, populationDefinition: "urban_centre", classes: ["million_plus"], sourceId: "natural-earth", observedAt: "2026-07-12T00:00:00Z" } } as CityCollection["features"][number];

describe("searchEntities", () => {
  it("ranks exact and prefix place matches before broad contains matches", () => {
    const index = buildSearchIndex({ geographies: [india, assam, singapore], assets: [dataCentre], generators: [windFarm] });

    expect(searchEntities(index, "in").map((result) => result.label)).toEqual([
      "India",
      "India AI Campus",
      "Singapore",
      "Young Wind Farm",
    ]);
  });

  it("groups countries, states, assets, and power generators with selectable ids", () => {
    const index = buildSearchIndex({ geographies: [india, assam], assets: [dataCentre], generators: [windFarm] });

    expect(searchEntities(index, "assam")[0]).toMatchObject({ id: "IN-ASSAM", group: "Places", entityType: "state" });
    expect(searchEntities(index, "campus")[0]).toMatchObject({ id: "asset-1", group: "Data centres", entityType: "data_centre" });
    expect(searchEntities(index, "young")[0]).toMatchObject({ id: "generator-1", group: "Power generators", entityType: "generator" });
  });

  it("returns no results for blank or tiny whitespace-only queries", () => {
    const index = buildSearchIndex({ geographies: [india], assets: [dataCentre], generators: [windFarm] });

    expect(searchEntities(index, "")).toEqual([]);
    expect(searchEntities(index, "  ")).toEqual([]);
  });

  it("indexes million-plus cities as coordinate search targets", () => {
    const index = buildSearchIndex({ geographies: [], assets: [], generators: [], cities: [jamshedpur] });
    expect(searchEntities(index, "jamshedpur")[0]).toMatchObject({ entityType: "city", coordinates: [86.195573, 22.789481] });
  });
});

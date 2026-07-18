import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { cityFeatureCollectionSchema, manifestSchema } from "@/lib/snapshot/schema";

describe("published city layer", () => {
  it("publishes the curated major-city collection in the active snapshot", async () => {
    const dataRoot = path.join(process.cwd(), "public", "data");
    const manifest = manifestSchema.parse(JSON.parse(await readFile(path.join(dataRoot, "latest.json"), "utf8")));

    expect(manifest.artifacts.cities).toBe(`snapshots/${manifest.snapshotId}/cities.geojson`);
    expect(manifest.coverage.cities).toBe(575);

    const cities = cityFeatureCollectionSchema.parse(JSON.parse(await readFile(path.join(dataRoot, manifest.artifacts.cities!), "utf8")));
    expect(cities.features.filter((city) => city.properties.classes.includes("million_plus"))).toHaveLength(499);
    expect(cities.features.filter((city) => city.properties.classes.includes("german_large_city"))).toHaveLength(80);
  });
});

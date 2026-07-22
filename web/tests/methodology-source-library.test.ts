import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildMethodologySourceLibrary, filterSources } from "@/lib/methodology";
import type { EvidenceSource, SnapshotManifest, SourceCatalog } from "@/lib/snapshot/types";

function currentSourceInputs() {
  const publicData = join(process.cwd(), "public", "data");
  const manifest = JSON.parse(readFileSync(join(publicData, "latest.json"), "utf8")) as SnapshotManifest;
  const catalog = JSON.parse(readFileSync(join(publicData, manifest.artifacts.sourceCatalog!), "utf8")) as SourceCatalog;
  const evidence = JSON.parse(readFileSync(join(publicData, manifest.artifacts.evidence), "utf8")) as { sources: EvidenceSource[] };
  return { catalog, evidence, sourceCoverage: manifest.sourceCoverage ?? null };
}

describe("methodology source library", () => {
  it("merges the current snapshot and requested official references into 68 source families", () => {
    const { catalog, evidence, sourceCoverage } = currentSourceInputs();
    const sources = buildMethodologySourceLibrary({
      catalogSources: catalog.sources,
      evidenceSources: evidence.sources,
      publishedRecordsBySource: sourceCoverage?.publishedRecordsBySource ?? {},
    });

    expect(sources).toHaveLength(68);
    expect(sources.filter((source) => source.id === "gem-global-integrated-power-tracker")).toHaveLength(1);
    expect(sources.some((source) => source.id === "gem-gipt")).toBe(false);
    expect(sources.filter((source) => source.id === "worldpop-global2")).toHaveLength(1);
    expect(sources.some((source) => source.id.startsWith("worldpop-global2-r"))).toBe(false);
    expect(sources.filter((source) => source.id === "openstreetmap")).toHaveLength(1);
    expect(sources.some((source) => source.id === "openstreetmap-power")).toBe(false);
    expect(sources.some((source) => source.id === "openstreetmap-infrastructure")).toBe(false);
    for (const id of ["eia-861", "ferc-714", "statistics-canada-electricity", "cer-energy-future-2026", "cea-lgbr-2026-27", "entsoe-tyndp-2024", "aemo-operational-demand", "occto-demand-forecasts", "iea-building-demand-model"]) {
      expect(sources.some((source) => source.id === id)).toBe(true);
    }
  });

  it("prefers governed fields and makes global source families discoverable in Europe", () => {
    const { catalog, evidence, sourceCoverage } = currentSourceInputs();
    const sources = buildMethodologySourceLibrary({
      catalogSources: catalog.sources,
      evidenceSources: evidence.sources,
      publishedRecordsBySource: sourceCoverage?.publishedRecordsBySource ?? {},
    });
    const gem = sources.find((source) => source.id === "gem-global-integrated-power-tracker");
    const hydrogen = sources.find((source) => source.id === "iea-hydrogen-production-2026");
    const worldPop = sources.find((source) => source.id === "worldpop-global2");

    expect(gem).toMatchObject({ publisher: "Global Energy Monitor", publicationState: "publishable" });
    expect(gem?.continents).toContain("Europe");
    expect(hydrogen?.continents).toContain("Europe");
    expect(worldPop?.continents).toContain("Europe");
    expect(worldPop?.role).toBe("foundation");
  });

  it("filters the unified library by geography, category, state, and role", () => {
    const { catalog, evidence, sourceCoverage } = currentSourceInputs();
    const sources = buildMethodologySourceLibrary({
      catalogSources: catalog.sources,
      evidenceSources: evidence.sources,
      publishedRecordsBySource: sourceCoverage?.publishedRecordsBySource ?? {},
    });

    expect(filterSources(sources, { continent: "Europe", country: "", category: "", publicationState: "", role: "" }).length).toBeGreaterThan(2);
    expect(filterSources(sources, { continent: "", country: "BR", category: "", publicationState: "", role: "" }).some((source) => source.id === "scala-ai-city-2025")).toBe(true);
    expect(filterSources(sources, { continent: "", country: "", category: "demand", publicationState: "", role: "demand" }).length).toBeGreaterThan(0);
    expect(filterSources(sources, { continent: "", country: "", category: "", publicationState: "quarantined", role: "" }).length).toBeGreaterThan(0);
  });
});

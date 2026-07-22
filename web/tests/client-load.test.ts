import { afterEach, describe, expect, it, vi } from "vitest";

import { loadMethodologyFromStaticAssets } from "@/lib/snapshot/client-load";

const snapshotId = "2026-07-22T00-00-00Z";
const manifest = {
  snapshotId,
  generatedAt: "2026-07-22T00:00:00Z",
  modelVersion: "3.0.0",
  activeYears: [2026, 2027, 2028, 2029, 2030, 2031],
  artifacts: {
    countries: `snapshots/${snapshotId}/countries.geojson`,
    admin1: `snapshots/${snapshotId}/admin1.geojson`,
    regions: `snapshots/${snapshotId}/regions.geojson`,
    assets: `snapshots/${snapshotId}/assets.geojson`,
    evidence: `snapshots/${snapshotId}/evidence.json`,
    sourceCatalog: `snapshots/${snapshotId}/source-catalog.json`,
  },
  coverage: { countries: 1, regions: 1, admin1Regions: 1, countriesWithAdmin1: 1, assets: 1, dataCentres: 1, waterInfrastructure: 0 },
  boundaryDisclaimer: null,
  connectors: [],
};
const catalog = {
  schemaVersion: "1.0",
  sources: [{
    id: "governed", name: "Governed source", publisher: "Publisher", url: "https://example.com/governed",
    categories: ["generation"], continents: ["Europe"], countries: [], accessMode: "automatic",
    publicationState: "publishable", refreshCadence: "monthly", licence: "CC BY 4.0",
    licenceUrl: "https://creativecommons.org/licenses/by/4.0/", licenceDecidedAt: "2026-07-22",
    requiredEnv: [], manualPathEnv: null, notes: null,
  }],
};
const evidence = {
  sources: [{ id: "evidence", name: "Evidence source", tier: "A", url: "https://example.com/evidence", publishedAt: "2026-07-01T00:00:00Z" }],
  claims: [],
};

afterEach(() => vi.unstubAllGlobals());

function response(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { "content-type": "application/json" } });
}

describe("methodology static loader", () => {
  it("loads governed and evidence sources from the same snapshot", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => {
      const path = String(input);
      if (path.endsWith("latest.json")) return response(manifest);
      if (path.endsWith("source-catalog.json")) return response(catalog);
      if (path.endsWith("evidence.json")) return response(evidence);
      return new Response(null, { status: 404 });
    }));

    const result = await loadMethodologyFromStaticAssets();

    expect(result.catalog.sources[0].id).toBe("governed");
    expect(result.evidenceSources).toEqual(evidence.sources);
  });

  it("rejects methodology evidence outside the active snapshot", async () => {
    const unsafe = { ...manifest, artifacts: { ...manifest.artifacts, evidence: "snapshots/another/evidence.json" } };
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => String(input).endsWith("latest.json") ? response(unsafe) : response(catalog)));

    await expect(loadMethodologyFromStaticAssets()).rejects.toThrow(`Snapshot artifact path must be snapshots/${snapshotId}/evidence.json`);
  });
});

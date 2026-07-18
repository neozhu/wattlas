"use client";

import {
  assetFeatureCollectionSchema,
  evidenceSchema,
  geographyFeatureCollectionSchema,
  manifestSchema,
  sourceCatalogSchema,
} from "@/lib/snapshot/schema";
import type { SnapshotData, SnapshotManifest, SourceCatalog, SourceCoverage } from "@/lib/snapshot/types";
import { migrateLegacyContributions } from "@/lib/snapshot/legacy";

async function fetchJson<T>(artifactPath: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/data/${artifactPath}`, { signal });
  if (!response.ok) {
    throw new Error(`Snapshot request failed for ${artifactPath}: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

function assertStaticArtifactPaths(manifest: SnapshotManifest) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(manifest.snapshotId) || manifest.snapshotId === "." || manifest.snapshotId === "..") {
    throw new Error("Snapshot ID is not a safe path segment");
  }
  const artifacts = {
    countries: manifest.artifacts.countries,
    regions: manifest.artifacts.regions,
    assets: manifest.artifacts.assets,
    evidence: manifest.artifacts.evidence,
    admin1: manifest.artifacts.admin1,
  } as const;
  for (const [name, artifactPath] of Object.entries(artifacts)) {
    const extension = name === "evidence" ? "json" : "geojson";
    const expected = `snapshots/${manifest.snapshotId}/${name}.${extension}`;
    if (artifactPath !== expected) throw new Error(`Snapshot artifact path must be ${expected}`);
  }
  return artifacts;
}

export async function loadSnapshotFromStaticAssets(signal?: AbortSignal): Promise<SnapshotData> {
  const manifest = manifestSchema.parse(await fetchJson<unknown>("latest.json", signal));
  const artifacts = assertStaticArtifactPaths(manifest);
  const [countriesRaw, regionsRaw, assetsRaw, evidenceRaw] = await Promise.all([
    fetchJson<unknown>(artifacts.countries, signal),
    fetchJson<unknown>(artifacts.regions, signal),
    fetchJson<unknown>(artifacts.assets, signal),
    fetchJson<unknown>(artifacts.evidence, signal),
  ]);

  const legacyContributions = manifest.modelVersion === "2.1.0" && manifest.artifacts.regionalEnergy === undefined;
  return {
    manifest,
    countries: geographyFeatureCollectionSchema.parse(migrateLegacyContributions(countriesRaw, manifest.modelVersion, legacyContributions)),
    admin1: { type: "FeatureCollection", features: [] },
    regions: geographyFeatureCollectionSchema.parse(migrateLegacyContributions(regionsRaw, manifest.modelVersion, legacyContributions)),
    assets: assetFeatureCollectionSchema.parse(assetsRaw),
    evidence: evidenceSchema.parse(evidenceRaw),
  } as SnapshotData;
}

export async function loadSourceCatalog(
  manifest: SnapshotManifest, signal?: AbortSignal,
): Promise<SourceCatalog | null> {
  const artifactPath = manifest.artifacts.sourceCatalog;
  if (!artifactPath) return null;
  const expected = `snapshots/${manifest.snapshotId}/source-catalog.json`;
  if (artifactPath !== expected) throw new Error(`Snapshot artifact path must be ${expected}`);
  return sourceCatalogSchema.parse(await fetchJson<unknown>(artifactPath, signal));
}

export async function loadMethodologyFromStaticAssets(signal?: AbortSignal): Promise<{
  catalog: SourceCatalog;
  generatedAt: string | null;
  sourceCoverage: SourceCoverage | null;
}> {
  const manifest = manifestSchema.parse(await fetchJson<unknown>("latest.json", signal));
  const catalog = await loadSourceCatalog(manifest, signal);
  return {
    catalog: catalog ?? { schemaVersion: "1.0", sources: [] },
    generatedAt: manifest.generatedAt,
    sourceCoverage: manifest.sourceCoverage ?? null,
  };
}

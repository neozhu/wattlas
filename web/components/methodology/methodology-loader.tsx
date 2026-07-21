"use client";

import { useEffect, useState } from "react";

import { MethodologyPage } from "@/components/methodology/methodology-page";
import { loadMethodologyFromStaticAssets } from "@/lib/snapshot/client-load";
import type { SnapshotManifest, SourceCatalog, SourceCoverage } from "@/lib/snapshot/types";

type MethodologyData = {
  catalog: SourceCatalog;
  generatedAt: string | null;
  sourceCoverage: SourceCoverage | null;
  assetCoverage: Pick<SnapshotManifest["coverage"], "industrialLoads" | "hydrogenInfrastructure" | "forecastIndustrialLoads">;
};

export function MethodologyLoader() {
  const [data, setData] = useState<MethodologyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void loadMethodologyFromStaticAssets(controller.signal)
      .then(setData)
      .catch((loadError: unknown) => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load the source catalogue.");
      });
    return () => controller.abort();
  }, []);

  if (data) return <MethodologyPage {...data} />;

  return (
    <main className="snapshot-loader" aria-busy={!error} aria-live="polite">
      <section className="snapshot-loader-card">
        <p className="eyebrow">WATTLAS</p>
        <h1>{error ? "Methodology data unavailable" : "Loading methodology and sources"}</h1>
        <p>
          {error
            ? "The page loaded, but the latest public source catalogue could not be read."
            : "Fetching the source catalogue attached to the current published snapshot."}
        </p>
        {error ? <pre>{error}</pre> : <div className="snapshot-loader-bar" aria-hidden="true" />}
      </section>
    </main>
  );
}

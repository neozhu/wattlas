import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MethodologyPage } from "@/components/methodology/methodology-page";
import type { EvidenceSource, SnapshotManifest, SourceCatalog, SourceCoverage } from "@/lib/snapshot/types";

const catalog: SourceCatalog = {
  schemaVersion: "1.0",
  sources: [
    {
      id: "brazil-aneel-siga", name: "SIGA", publisher: "ANEEL",
      url: "https://example.com/siga", categories: ["generation"],
      continents: ["South America"], countries: ["BR"], accessMode: "automatic",
      publicationState: "publishable", refreshCadence: "monthly", licence: "ODbL 1.0",
      licenceUrl: "https://example.com/licence", licenceDecidedAt: "2026-07-17",
      requiredEnv: [], manualPathEnv: null, notes: "Official registry.",
    },
    {
      id: "sapp", name: "SAPP data", publisher: "SAPP",
      url: "https://example.com/sapp", categories: ["demand"], continents: ["Africa"],
      countries: [], accessMode: "manual_snapshot", publicationState: "quarantined",
      refreshCadence: "manual", licence: null, licenceUrl: null,
      licenceDecidedAt: "2026-07-17", requiredEnv: [], manualPathEnv: "SAPP_DATA_PATH",
      notes: "Reuse rights require confirmation.",
    },
  ],
};
const evidenceSources: EvidenceSource[] = [{ id: "meta-richland-parish-2024", name: "Meta Richland Parish data center", tier: "B", url: "https://example.com/meta", publishedAt: "2025-12-04T00:00:00Z" }];
const sourceCoverage: SourceCoverage = {
  sourceCount: 24,
  sourcesByPublicationState: { publishable: 3, quarantined: 21 },
  sourcesByAccessMode: { automatic: 12, credentialled: 2, manual_snapshot: 8, metadata_only: 2 },
  connectorStates: { current: 10, failed: 1, not_configured: 7 },
  publishedRecords: 55_967,
  publishedRecordsBySource: { "brazil-aneel-siga": 55_967 },
};

function currentInputs() {
  const root = join(process.cwd(), "public", "data");
  const manifest = JSON.parse(readFileSync(join(root, "latest.json"), "utf8")) as SnapshotManifest;
  const currentCatalog = JSON.parse(readFileSync(join(root, manifest.artifacts.sourceCatalog!), "utf8")) as SourceCatalog;
  const evidence = JSON.parse(readFileSync(join(root, manifest.artifacts.evidence), "utf8")) as { sources: EvidenceSource[] };
  return { manifest, currentCatalog, evidenceSources: evidence.sources };
}

afterEach(cleanup);

describe("methodology and sources", () => {
  it("marks the page as a normally scrollable document", () => {
    const { container } = render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" />);
    expect(container.querySelector("main")).toHaveClass("methodology-page");
  });

  it("tells the human story without a separate company disclaimer box", () => {
    render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" />);

    expect(screen.queryByText(/PUBLIC DATA · EXPLAINABLE METHODS/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Why I built Wattlas" })).toBeInTheDocument();
    expect(screen.getByText(/market intelligence for a predictive maintenance product at Siemens Energy/i)).toBeInTheDocument();
    expect(screen.queryByText(/Independent project/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not an official Siemens Energy product/i)).not.toBeInTheDocument();
  });

  it("explains the regional expansion and industrial demand process in plain language", () => {
    render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" />);

    expect(screen.getByRole("heading", { name: "Adding more depth to regional data" })).toBeInTheDocument();
    expect(screen.getByText(/Africa and South America/i)).toBeInTheDocument();
    expect(screen.getByText(/Europe, North America, and Asia/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How planned projects become future electricity demand" })).toBeInTheDocument();
    expect(screen.getByText(/Read the reported project information/i)).toBeInTheDocument();
    expect(screen.getByText(/Publish a low, central, and high estimate/i)).toBeInTheDocument();
  });

  it("keeps detailed methods, releases, limitations, and ENTSO E evidence", () => {
    render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" assetCoverage={{ industrialLoads: 4220, hydrogenInfrastructure: 808, forecastIndustrialLoads: 118 }} />);
    for (const text of [
      /IEA Hydrogen Production Projects Database · June 2026/i,
      /IEA Hydrogen Infrastructure Projects Database · June 2026/i,
      /GEM Global Iron and Steel Tracker · June 2026/i,
      /GEM Global Cement and Concrete Tracker · July 2025/i,
      /CC BY 4.0/i,
      /capacity in MWel × 8.76 GWh per MW per year × capacity factor × grid share/i,
      /capacity in kt per year × electricity intensity in MWh per tonne/i,
      /capacity in Mt per year × 1,000 × electricity intensity in MWh per tonne/i,
      /Pipelines, storage, blending, and terminals do not create an electricity demand increase by themselves/i,
      /Operating, Under construction, Pre construction, Announced, and Retired/i,
      /previous complete UTC calendar month/i,
      /MW readings into GWh/i,
      /bidding zone boundaries do not always match countries/i,
      /does not alter annual forecasts or Opportunity Radar scores/i,
      /last successful monthly result/i,
    ]) expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.getByText("4,220")).toBeInTheDocument();
    expect(screen.getByText("808")).toBeInTheDocument();
    expect(screen.getByText("118")).toBeInTheDocument();
  });

  it("distinguishes live records from registered and reference sources", () => {
    render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" sourceCoverage={sourceCoverage} />);
    expect(screen.getByText("55,967")).toBeInTheDocument();
    expect(screen.getByText(/records currently published on the map/i)).toBeInTheDocument();
    expect(screen.getByText(/source catalogue is only one part/i)).toBeInTheDocument();
    expect(screen.getByText("SIGA")).toBeInTheDocument();
    expect(screen.getByText("Meta Richland Parish data center")).toBeInTheDocument();
  });

  it("shows the current source library with the requested official demand references", () => {
    const current = currentInputs();
    render(<MethodologyPage catalog={current.currentCatalog} evidenceSources={current.evidenceSources} generatedAt={current.manifest.generatedAt} sourceCoverage={current.manifest.sourceCoverage ?? null} />);
    expect(screen.getByRole("heading", { name: /68 source families/i })).toBeInTheDocument();
    expect(screen.getByText("EIA Form 861")).toBeInTheDocument();
    expect(screen.getByText("FERC Form 714")).toBeInTheDocument();
    expect(screen.getByText("OCCTO demand forecasts")).toBeInTheDocument();
  });

  it("filters the complete source library by continent, role, and state", () => {
    render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" />);
    fireEvent.change(screen.getByLabelText("Continent"), { target: { value: "Africa" } });
    expect(screen.queryByText("SIGA")).not.toBeInTheDocument();
    expect(screen.getByText("SAPP data")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Source role"), { target: { value: "supply" } });
    expect(screen.getByText(/No sources match/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Source role"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Publication state"), { target: { value: "publishable" } });
    expect(screen.getByText(/No sources match/i)).toBeInTheDocument();
  });

  it("does not use em dash or en dash punctuation in authored page text", () => {
    const { container } = render(<MethodologyPage catalog={catalog} evidenceSources={evidenceSources} generatedAt="2026-07-17T00:00:00Z" />);
    expect(container.textContent).not.toMatch(/[—–]/);
  });
});

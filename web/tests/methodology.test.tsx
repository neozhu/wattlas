import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MethodologyPage } from "@/components/methodology/methodology-page";
import type { SourceCatalog, SourceCoverage } from "@/lib/snapshot/types";


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

const sourceCoverage: SourceCoverage = {
  sourceCount: 24,
  sourcesByPublicationState: { publishable: 3, quarantined: 21 },
  sourcesByAccessMode: { automatic: 12, credentialled: 2, manual_snapshot: 8, metadata_only: 2 },
  connectorStates: { current: 10, failed: 1, not_configured: 7 },
  publishedRecords: 55_967,
  publishedRecordsBySource: { osm_power: 55_967, "brazil-aneel-siga": 0, gem_power: 0 },
};

afterEach(cleanup);


describe("methodology and sources", () => {
  it("marks the page as a normally scrollable document", () => {
    const { container } = render(<MethodologyPage catalog={catalog} generatedAt="2026-07-17T00:00:00Z" />);
    expect(container.querySelector("main")).toHaveClass("methodology-page");
  });

  it("distinguishes records on the map from registered and quarantined sources", () => {
    render(<MethodologyPage catalog={catalog} generatedAt="2026-07-17T00:00:00Z" sourceCoverage={sourceCoverage} />);
    expect(screen.getByText("55,967")).toBeInTheDocument();
    expect(screen.getByText(/records currently published on the map/i)).toBeInTheDocument();
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(screen.getByText(/sources quarantined/i)).toBeInTheDocument();
    expect(screen.getAllByText(/eligible for publication/i).length).toBeGreaterThan(0);
  });

  it("explains units, hierarchy, forecasts, and quarantine", () => {
    render(<MethodologyPage catalog={catalog} generatedAt="2026-07-17T00:00:00Z" />);
    expect(screen.getByText(/Demand is measured in GWh/i)).toBeInTheDocument();
    expect(screen.getByText(/official observed measurements/i)).toBeInTheDocument();
    expect(screen.getByText(/retirements reduce future supply/i)).toBeInTheDocument();
    expect(screen.getByText(/Global Energy Monitor’s March 2026 integrated tracker/i)).toBeInTheDocument();
    expect(screen.getByText(/Official EPE monthly state consumption/i)).toBeInTheDocument();
    expect(screen.getByText(/62,001 existing and planned line features/i)).toBeInTheDocument();
    expect(screen.getByText(/Source status from snapshot 17 Jul 2026, 00:00 UTC/i)).toBeInTheDocument();
    expect(screen.getByText("SIGA")).toBeInTheDocument();
    expect(screen.getByText("SAPP data")).toBeInTheDocument();
  });

  it("discloses industrial demand releases, formulas, lifecycle mapping, and credential limits", () => {
    render(<MethodologyPage catalog={catalog} generatedAt="2026-07-17T00:00:00Z" assetCoverage={{ industrialLoads: 4220, hydrogenInfrastructure: 808, forecastIndustrialLoads: 118 }} />);
    for (const text of [
      /IEA Hydrogen Production Projects Database · June 2026/i,
      /IEA Hydrogen Infrastructure Projects Database · June 2026/i,
      /GEM Global Iron and Steel Tracker · June 2026/i,
      /GEM Global Cement and Concrete Tracker · July 2025/i,
      /CC BY 4.0/i,
      /capacity MWel × 8.76 GWh\/MW-year × capacity factor × grid share/i,
      /capacity kt\/year × electricity intensity MWh\/tonne/i,
      /capacity Mt\/year × 1,000 × electricity intensity MWh\/tonne/i,
      /Pipelines, storage, blending, and terminals never create an electricity-demand increment/i,
      /Operating, Under construction, Pre-construction, Announced, and Retired/i,
      /ENTSOE_SECURITY_TOKEN/i,
    ]) expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.getByText("4,220")).toBeInTheDocument();
    expect(screen.getByText("808")).toBeInTheDocument();
    expect(screen.getByText("118")).toBeInTheDocument();
  });

  it("filters sources by continent and publication state", () => {
    render(<MethodologyPage catalog={catalog} generatedAt="2026-07-17T00:00:00Z" />);
    fireEvent.change(screen.getByLabelText("Continent"), { target: { value: "Africa" } });
    expect(screen.queryByText("SIGA")).not.toBeInTheDocument();
    expect(screen.getByText("SAPP data")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Publication state"), { target: { value: "publishable" } });
    expect(screen.getByText(/No sources match/i)).toBeInTheDocument();
  });
});

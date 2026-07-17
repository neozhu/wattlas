import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MethodologyPage } from "@/components/methodology/methodology-page";
import type { SourceCatalog } from "@/lib/snapshot/types";


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

afterEach(cleanup);


describe("methodology and sources", () => {
  it("explains units, hierarchy, forecasts, and quarantine", () => {
    render(<MethodologyPage catalog={catalog} generatedAt="2026-07-17T00:00:00Z" />);
    expect(screen.getByText(/Demand is measured in GWh/i)).toBeInTheDocument();
    expect(screen.getByText(/official observed measurements/i)).toBeInTheDocument();
    expect(screen.getByText(/retirements reduce future supply/i)).toBeInTheDocument();
    expect(screen.getByText(/Source status from snapshot 17 Jul 2026, 00:00 UTC/i)).toBeInTheDocument();
    expect(screen.getByText("SIGA")).toBeInTheDocument();
    expect(screen.getByText("SAPP data")).toBeInTheDocument();
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

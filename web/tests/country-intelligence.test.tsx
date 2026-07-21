import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CountryIntelligence } from "@/components/intelligence/country-intelligence";
import type { GeneratorOverviewCollection, GeographyFeature, RegionalEnergyData } from "@/lib/snapshot/types";

const country = { type: "Feature", id: "DE", geometry: { type: "Polygon", coordinates: [] }, properties: { id: "DE", name: "Germany", country: "DE", level: "country", confidence: 82, coverage: 91, sourceIds: ["ember"], assetSummary: { total: 40, operational: 25, planned: 15, dataCentres: 10, waterInfrastructure: 3, industrialLoads: 20, hydrogenInfrastructure: 7, officialVerified: 30, communityMapped: 10 } } } as unknown as GeographyFeature;
const state = { type: "Feature", id: "DE-BY", geometry: { type: "Polygon", coordinates: [] }, properties: { id: "DE-BY", name: "Bavaria", country: "DE", level: "admin_1" } } as unknown as GeographyFeature;
const row = (year: number) => ({ geographyId: "DE-BY", year, metrics: { demandGwh: { low: 90, central: 100 + year - 2026, high: 120 }, localGenerationGwh: { low: 75, central: 80, high: 90 }, localGenerationGapGwh: { low: 10, central: 20, high: 30 }, netBalanceGwh: null, observedUnmetDemandGwh: null, installedCapacityMw: 50, dependableCapacityMw: { low: 30, central: 35, high: 40 }, peakDemandMw: { low: 20, central: 25, high: 30 } }, methodId: "m1", sourceIds: ["ember"], confidence: 80, coverage: 90, valueKind: "estimated", appliedIncrementIds: [], metricLineage: {} }) as const;
const energy = { "DE-BY": Array.from({ length: 6 }, (_, index) => row(2026 + index)) } as unknown as RegionalEnergyData;
const generators = { type: "FeatureCollection", features: [{ type: "Feature", id: "DE-BY", geometry: { type: "Point", coordinates: [11, 49] }, properties: { geographyId: "DE-BY", country: "DE", count: 12, capacityMw: 5000, operatingCapacityMw: 4000, plannedCapacityMw: 1000, technologyMixMw: { solar: 2000, wind: 1500, coal: 1500 }, dominantTechnology: "solar", lifecycleCounts: { operational: 8, announced: 2, retired: 2 } } }] } as GeneratorOverviewCollection;

describe("CountryIntelligence", () => {
  it("aggregates only published state forecasts and generation records", () => {
    render(<CountryIntelligence country={country} regions={[state]} regionalEnergy={energy} generatorOverview={generators} year={2030} onClose={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Germany intelligence" })).toBeInTheDocument();
    expect(screen.getByText("104 GWh")).toBeInTheDocument();
    expect(screen.getByText("80 GWh")).toBeInTheDocument();
    expect(screen.getByText("+24 GWh")).toBeInTheDocument();
    expect(screen.getByText("1,000 MW")).toBeInTheDocument();
    expect(screen.getByText(/Solar 40%/)).toBeInTheDocument();
    expect(screen.getByText(/2 retired/)).toBeInTheDocument();
    expect(screen.getByText(/Source IDs: ember/)).toBeInTheDocument();
  });
});

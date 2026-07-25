import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OpportunityRadar } from "@/components/opportunity-radar";
import type { SnapshotData } from "@/lib/snapshot/types";

const mockLoadRegionalEnergy = vi.hoisted(() => vi.fn());
const mockTrackWattlasAction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/snapshot/generators", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/snapshot/generators")>()),
  loadRegionalEnergy: mockLoadRegionalEnergy,
}));
vi.mock("@/lib/analytics", () => ({
  trackWattlasAction: mockTrackWattlasAction,
  geographyEntityType: (properties: { level?: string }) => properties.level === "country" ? "country" : properties.level === "admin_1" ? "state" : "region",
}));

afterEach(() => { cleanup(); localStorage.clear(); sessionStorage.clear(); mockTrackWattlasAction.mockClear(); });

vi.mock("@/components/map/global-map", () => ({
  GlobalMap: ({ lens, year, capacityRange, focusTarget, onSelect, onSelectCity, onSelectGenerator, onVisibleGeneratorsChange }: { lens: string; year: number; capacityRange?: { minMw: number; maxMw: number | null }; focusTarget?: unknown; onSelect: (id: string, shouldFocus?: boolean) => void; onSelectCity?: (city: { id: string; name: string; country: string; coordinates: [number, number] }) => void; onSelectGenerator: (feature: import("@/lib/snapshot/types").GeneratorFeature) => void; onVisibleGeneratorsChange: (ids: ReadonlySet<string>) => void }) => <div data-testid="global-map">Map lens: {lens} · year {year} · capacity {capacityRange?.minMw ?? 0}–{capacityRange?.maxMw ?? "unlimited"}<span data-testid="map-focus-state">{focusTarget ? "focused" : "unchanged"}</span><button type="button" onClick={() => onSelect("osm-node-101")}>Select facility</button><button type="button" onClick={() => onSelect("IN-ASSAM", false)}>Select Assam</button><button type="button" onClick={() => onSelectCity?.({ id: "city-hamburg", name: "Hamburg", country: "DE", coordinates: [9.99, 53.55] })}>Select city</button><button type="button" onClick={() => onSelectGenerator(generator)}>Select generator</button><button type="button" onClick={() => onVisibleGeneratorsChange(new Set())}>Move away</button></div>,
}));

const generator = { type: "Feature", id: "generator-1", geometry: { type: "Point", coordinates: [8, 50] }, properties: { id: "generator-1", name: "Rhine Solar", category: "power_generation", country: "DE", geographyId: "DE-X", lifecycle: "operational", technologies: ["solar"], capacityMw: 80, operatingCapacityMw: 80, plannedCapacityMw: 0, technologyMixMw: { solar: 80 }, sourceIds: ["registry"], gemWikiUrl: "https://www.gem.wiki/Rhine_Solar" } } as import("@/lib/snapshot/types").GeneratorFeature;

const connectors: SnapshotData["manifest"]["connectors"] = [
  { id: "gisco", state: "current", checkedAt: "2026-06-27T04:12:00Z", lastSuccessAt: "2026-06-27T04:12:00Z", message: null },
  { id: "entsoe", state: "not_configured", checkedAt: "2026-06-27T04:12:00Z", lastSuccessAt: null, message: "Token missing" },
];

const snapshot: SnapshotData = {
  manifest: {
    snapshotId: "2026-06-27T04-12-00Z",
    generatedAt: "2026-06-27T04:12:00Z",
    modelVersion: "1.0.0",
    activeYears: [2026, 2027, 2028, 2029, 2030, 2031],
    artifacts: { countries: "countries.geojson", admin1: "admin1.geojson", regions: "regions.geojson", assets: "assets.geojson", evidence: "evidence.json" },
    coverage: { countries: 246, regions: 334, admin1Regions: 3229, countriesWithAdmin1: 197, assets: 14, dataCentres: 8, waterInfrastructure: 6 },
    boundaryDisclaimer: "UN boundary disclaimer",
    connectors,
  },
  admin1: { type: "FeatureCollection", features: [{
    type: "Feature", id: "IN-ASSAM", geometry: { type: "Polygon", coordinates: [] },
    properties: {
      id: "IN-ASSAM", name: "Assam", country: "IN", level: "admin_1", parentId: "IN", peerLevel: "admin_1",
      scoreYear: 2030, scores: { infrastructureDemand: null, siteAttractiveness: null, systemRisk: null },
      scoresByYear: { "2030": { infrastructureDemand: null, siteAttractiveness: null, systemRisk: null } },
      categoryScoresByYear: {}, demandMwByYear: {}, confidence: 0, coverage: 0, valueKind: "unavailable", updatedAt: "2026-06-28T00:00:00Z",
      contributions: [], contributionsByYear: { "2030": [] }, sourceIds: [], assetCount: 1,
      assetSummary: { total: 1, operational: 1, planned: 0, dataCentres: 1, waterInfrastructure: 0, officialVerified: 0, communityMapped: 1 },
    },
  }] } as SnapshotData["admin1"],
  countries: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "DE71",
        geometry: { type: "Polygon", coordinates: [] },
        properties: {
          id: "DE71", name: "Darmstadt", country: "DE", scoreYear: 2030,
          level: "country", parentId: null, peerLevel: "country",
          scores: { infrastructureDemand: 78, siteAttractiveness: 54, systemRisk: 68 },
          scoresByYear: { "2030": { infrastructureDemand: 78, siteAttractiveness: 54, systemRisk: 68 } },
          categoryScoresByYear: {}, demandMwByYear: {}, assetCount: 0,
          assetSummary: { total: 0, operational: 0, planned: 0, dataCentres: 0, waterInfrastructure: 0, officialVerified: 0, communityMapped: 0 },
          confidence: 72, coverage: 100, valueKind: "estimated", updatedAt: "2026-06-27T04:12:00Z",
          contributions: [], contributionsByYear: { "2030": [] }, sourceIds: ["source-1"], population: 4_100_000, clusterId: "frankfurt",
        },
      },
    ],
  },
  regions: { type: "FeatureCollection", features: [] },
  assets: { type: "FeatureCollection", features: [{
    type: "Feature", id: "osm-node-101", geometry: { type: "Point", coordinates: [-77.1, 38.9] },
    properties: {
      id: "osm-node-101", name: "Alpha DC", operator: "Alpha Cloud", geographyId: "US", country: "US",
      category: "data_centre", subtype: "other_data_centre", lifecycle: "operational", demandMw: null,
      locationPrecision: "exact", valueKind: "observed", sourceIds: ["openstreetmap-infrastructure"],
      sourceType: "community_mapped", sourceUrl: "https://www.openstreetmap.org/node/101", externalIds: { osm: "node/101" },
      lastObservedAt: "2026-06-27T12:00:00Z", confidence: 86,
    },
  }] } as SnapshotData["assets"],
  evidence: { sources: [], claims: [] },
} as unknown as SnapshotData;

describe("OpportunityRadar", () => {
  it("selects Germany on first load when Germany and India are available", () => {
    const globalSnapshot = structuredClone(snapshot);
    globalSnapshot.countries.features.push({
      ...globalSnapshot.countries.features[0],
      id: "IN",
      properties: { ...globalSnapshot.countries.features[0].properties, id: "IN", name: "India", country: "IN" },
    });
    globalSnapshot.countries.features.push({
      ...globalSnapshot.countries.features[0],
      id: "DE",
      properties: { ...globalSnapshot.countries.features[0].properties, id: "DE", name: "Germany", country: "DE" },
    });
    render(<OpportunityRadar snapshot={globalSnapshot} />);
    expect(screen.getByRole("heading", { name: "Germany" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "India" })).not.toBeInTheDocument();
  });

  it("provides full generator technology names as hover labels", () => {
    render(<OpportunityRadar snapshot={snapshot} />);

    expect(screen.getByRole("switch", { name: "Nuclear" })).toHaveAttribute("title", "Nuclear");
    expect(screen.getByRole("switch", { name: "Biomass" })).toHaveAttribute("title", "Biomass");
    expect(screen.getByRole("switch", { name: "Geothermal" })).toHaveAttribute("title", "Geothermal");
  });

  it("preserves production controls without redundant active-view or grid sections", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(screen.getByRole("combobox", { name: "Search Wattlas" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Map controls" }).querySelector('[aria-label="Search Wattlas"]')).toBeNull();
    expect(screen.getByRole("link", { name: "Methodology and sources" })).toHaveAttribute("href", "/methodology");
    expect(screen.queryByText("Global")).not.toBeInTheDocument();
    expect(screen.queryByText(/sources? need attention/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Active filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Grid intelligence" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Cities · 1M+" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "German Großstädte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Bavaria official map" })).not.toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "TenneT network" })).not.toBeInTheDocument();
  });
  it("renders monthly freshness, lenses, year, and source truth", () => {
    render(<OpportunityRadar snapshot={snapshot} />);

    expect(screen.getByText("WATTLAS")).toBeInTheDocument();
    expect(screen.getByText(/Monthly refreshed/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Infrastructure Demand" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Site Attractiveness" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "System Risk" })).toBeInTheDocument();
    const powerBalance = screen.getByRole("button", { name: "Power Balance" });
    expect(powerBalance).toHaveTextContent("04");
    fireEvent.click(powerBalance);
    expect(screen.getByTestId("global-map")).toHaveTextContent("powerBalance");
    expect(screen.getByText("Comfortable margin")).toBeInTheDocument();
    expect(screen.getByText("Severe pressure")).toBeInTheDocument();
    expect(screen.getByTestId("global-map")).toHaveTextContent("year 2026");
    expect(screen.getAllByText("2026").length).toBeGreaterThan(0);
    expect(screen.queryByText(/^LIVE$/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open source project by Aditya Gupta" })).toHaveAttribute("href", "https://github.com/ad1tyagupta/wattlas");
  });

  it("resizes the inspector with an accessible persisted desktop separator", async () => {
    localStorage.setItem("wattlas:inspector-width", "520");
    render(<OpportunityRadar snapshot={snapshot} />);
    const separator = screen.getByRole("separator", { name: "Resize details panel" });
    await waitFor(() => expect(separator).toHaveAttribute("aria-valuenow", "520"));
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(separator).toHaveAttribute("aria-valuenow", "536");
    expect(localStorage.getItem("wattlas:inspector-width")).toBe("536");
    expect(separator.closest("main")).toHaveStyle({ "--inspector": "536px" });
    fireEvent.pointerDown(separator, { clientX: 800, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 500, pointerId: 1 });
    fireEvent.pointerUp(window, { pointerId: 1 });
    expect(separator).toHaveAttribute("aria-valuenow", "600");
    expect(localStorage.getItem("wattlas:inspector-width")).toBe("600");
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("inspector_resized", { panel_width: 600 });
  });

  it("hides and restores the filter rail without resetting active filters", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    const solar = screen.getByRole("switch", { name: "Solar" });
    fireEvent.click(solar);
    expect(solar).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Hide filters" }));
    expect(screen.queryByRole("complementary", { name: "Map controls" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search Wattlas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show filters" }));
    expect(screen.getByRole("complementary", { name: "Map controls" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Solar" })).toHaveAttribute("aria-checked", "true");
  });

  it("keeps the details panel hidden across selections and restores it from the summary", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.queryByRole("heading", { name: "Darmstadt" })).not.toBeInTheDocument();
    expect(sessionStorage.getItem("wattlas:details-visible")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Select facility" }));
    expect(screen.queryByRole("heading", { name: "Alpha DC" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Selected project summary" })).toHaveTextContent("Alpha DC");

    fireEvent.click(screen.getByRole("button", { name: "More details" }));
    expect(screen.getByRole("heading", { name: "Alpha DC" })).toBeInTheDocument();
    expect(sessionStorage.getItem("wattlas:details-visible")).toBe("true");
  });

  it("searches places and facilities, then opens the matching inspector", async () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    const search = screen.getByRole("combobox", { name: "Search Wattlas" });

    fireEvent.change(search, { target: { value: "ass" } });
    fireEvent.click(await screen.findByRole("option", { name: /Assam/i }));
    expect(screen.getByRole("heading", { name: "Assam" })).toBeInTheDocument();
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("search_result_selected", {
      entity_name: "Assam",
      entity_type: "state",
      country: "IN",
    });

    fireEvent.change(search, { target: { value: "alpha" } });
    fireEvent.click(await screen.findByRole("option", { name: /Alpha DC/i }));
    expect(screen.getByRole("heading", { name: "Alpha DC" })).toBeInTheDocument();
  });

  it("distinguishes source observation time from check time and states unavailable observations plainly", () => {
    render(<OpportunityRadar snapshot={snapshot} />);

    fireEvent.click(screen.getByRole("button", { name: /Monthly refreshed/i }));

    expect(screen.getByText("Observed 27 Jun, 04:12 UTC")).toBeInTheDocument();
    expect(screen.getAllByText("Checked 27 Jun, 04:12 UTC")).toHaveLength(2);
    expect(screen.getByText("Observation unavailable")).toBeInTheDocument();
    expect(screen.getByText("Token missing")).toBeInTheDocument();
  });

  it("tracks meaningful control, selection, evidence, and comparison actions", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(mockTrackWattlasAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Site Attractiveness" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("lens_changed", { lens: "siteAttractiveness" });

    fireEvent.click(screen.getByRole("switch", { name: "Data centres" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("filter_changed", { filter_name: "dataCentres", filter_value: "disabled" });
    fireEvent.click(screen.getByRole("switch", { name: "Solar" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("filter_changed", { filter_name: "generator_technology", filter_value: "solar:enabled" });
    fireEvent.click(screen.getByRole("button", { name: /Advanced power filters/i }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("advanced_filters_opened");

    fireEvent.click(screen.getByRole("button", { name: "Hide filters" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("filters_hidden");
    fireEvent.click(screen.getByRole("button", { name: "Show filters" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("filters_shown");

    fireEvent.click(screen.getByRole("button", { name: "2031" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("year_changed", { year: 2031 });
    fireEvent.click(screen.getByRole("button", { name: /Monthly refreshed/i }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("data_status_opened");

    fireEvent.click(screen.getByRole("button", { name: "Select facility" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("entity_selected", { entity_type: "data_centre", entity_name: "Alpha DC", country: "US" });
    fireEvent.click(screen.getByRole("button", { name: "Select Assam" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("entity_selected", { entity_type: "state", entity_name: "Assam", country: "IN" });
    fireEvent.click(screen.getByRole("button", { name: "Open evidence dossier" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("evidence_opened", { entity_name: "Assam", entity_type: "state" });
    fireEvent.click(screen.getByRole("button", { name: "Add to comparison" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("comparison_added", { entity_name: "Assam", entity_type: "state" });

    fireEvent.click(screen.getByRole("button", { name: "Select generator" }));
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("entity_selected", { entity_type: "generator", entity_name: "Rhine Solar", country: "DE", technology: "solar" });
  });

  it("selects and inspects an individual facility", () => {
    render(<OpportunityRadar snapshot={snapshot} />);

    fireEvent.click(screen.getByRole("button", { name: "Select facility" }));

    expect(screen.getByRole("heading", { name: "Alpha DC" })).toBeInTheDocument();
    expect(screen.getByText("Community mapped")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Selected project summary" })).toHaveTextContent("Alpha DC");
    expect(screen.getByRole("link", { name: "Open full dossier" })).toHaveAttribute("href", "https://www.openstreetmap.org/node/101");
    expect(screen.getByRole("link", { name: "Open full dossier" })).toHaveAttribute("target", "_blank");
  });

  it("preserves the map camera when a facility marker is selected", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");

    fireEvent.click(screen.getByRole("button", { name: "Select facility" }));

    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");
  });

  it("preserves the map camera when a generator marker is selected", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");

    fireEvent.click(screen.getByRole("button", { name: "Select generator" }));

    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");
  });

  it("preserves the map camera when a geography on the map is selected", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");

    fireEvent.click(screen.getByRole("button", { name: "Select Assam" }));

    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");
  });

  it("preserves the map camera when a city label is selected", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");

    fireEvent.click(screen.getByRole("button", { name: "Select city" }));

    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("unchanged");
  });

  it("still moves the map when navigation is triggered from search", async () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    const search = screen.getByRole("combobox", { name: "Search Wattlas" });
    fireEvent.change(search, { target: { value: "alpha" } });
    fireEvent.click(await screen.findByRole("option", { name: /Alpha DC/i }));

    expect(screen.getByTestId("map-focus-state")).toHaveTextContent("focused");
  });

  it("selects and inspects a global first-level region", () => {
    render(<OpportunityRadar snapshot={snapshot} />);

    fireEvent.click(screen.getByRole("button", { name: "Select Assam" }));

    expect(screen.getByRole("heading", { name: "Assam" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Facilities" }));
    expect(screen.getByText("1 facilities")).toBeInTheDocument();
  });

  it("preserves a typed generator selection at the app boundary and shows an action", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Select generator" }));
    expect(screen.getByRole("heading", { name: "Rhine Solar" })).toBeInTheDocument();
    expect(screen.getAllByText("80 MW").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Open full dossier" })).toHaveAttribute("href", "https://www.gem.wiki/Rhine_Solar");
    expect(screen.getByRole("link", { name: "Open full dossier" })).toHaveAttribute("target", "_blank");
  });

  it("clears a stale generator inspector when its layer, filter, or visible shard excludes it", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    const select = () => fireEvent.click(screen.getByRole("button", { name: "Select generator" }));
    fireEvent.click(screen.getByRole("switch", { name: "Power generators" }));
    select(); fireEvent.click(screen.getByRole("switch", { name: "Power generators" }));
    expect(screen.queryByRole("heading", { name: "Rhine Solar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Power generators" }));
    select(); fireEvent.click(screen.getByRole("switch", { name: "Solar" }));
    expect(screen.queryByRole("heading", { name: "Rhine Solar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", { name: "Solar" }));
    select(); fireEvent.click(screen.getByRole("button", { name: "Move away" }));
    expect(screen.queryByRole("heading", { name: "Rhine Solar" })).not.toBeInTheDocument();
  });

  it("commits an exact generator capacity, clears excluded selections, and preserves the range across layer toggles", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("switch", { name: "Power generators" }));
    fireEvent.click(screen.getByRole("button", { name: "Select generator" }));
    expect(screen.getByRole("heading", { name: "Rhine Solar" })).toBeInTheDocument();

    const minimumCapacity = screen.getByRole("spinbutton", { name: "Minimum capacity (MW)" });
    fireEvent.change(minimumCapacity, { target: { value: "100" } });
    fireEvent.blur(minimumCapacity);

    expect(screen.queryByRole("heading", { name: "Rhine Solar" })).not.toBeInTheDocument();
    expect(screen.getByTestId("global-map")).toHaveTextContent("capacity 100–unlimited");
    expect(screen.getByLabelText("Active generator capacity range")).toHaveTextContent("100 MW+");
    expect(mockTrackWattlasAction).toHaveBeenCalledWith("filter_changed", { filter_name: "generator_capacity", filter_value: "100:unlimited" });

    fireEvent.click(screen.getByRole("switch", { name: "Power generators" }));
    fireEvent.click(screen.getByRole("switch", { name: "Power generators" }));
    expect(screen.getByLabelText("Active generator capacity range")).toHaveTextContent("100 MW+");
  });

  it("lets a capacity choice activate power generators from the clean default map", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    expect(screen.getByRole("switch", { name: "Power generators" })).toHaveAttribute("aria-checked", "false");
    const minimumCapacity = screen.getByRole("spinbutton", { name: "Minimum capacity (MW)" });
    expect(minimumCapacity).toBeEnabled();

    fireEvent.change(minimumCapacity, { target: { value: "100" } });
    fireEvent.blur(minimumCapacity);

    expect(screen.getByRole("switch", { name: "Power generators" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Solar" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Active generator capacity range")).toHaveTextContent("100 MW+");
  });

  it("offers independent infrastructure layers and accessible generator filters", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    for (const name of ["Data centres", "Water infrastructure", "Industrial demand", "Hydrogen network"]) {
      const toggle = screen.getByRole("switch", { name });
      expect(toggle).toHaveAttribute("aria-checked", "true");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "false");
    }
    expect(screen.getByRole("switch", { name: "Power generators" })).toHaveAttribute("aria-checked", "false");
    // Power technologies start off but remain visible for one-click activation.
    const solar = screen.getByRole("switch", { name: "Solar" });
    expect(solar).toHaveAttribute("aria-checked", "false");
    fireEvent.click(solar);
    expect(solar).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Power generators" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch", { name: "Wind" })).toHaveAttribute("aria-checked", "false");
    fireEvent.click(screen.getByRole("button", { name: /Project status/i }));
    for (const lifecycle of ["Operating", "Under construction", "Pre-construction", "Announced", "Retired", "Other / unknown"]) {
      expect(screen.getByRole("switch", { name: lifecycle })).toHaveAttribute("aria-checked", "true");
    }
  });

  it("switches between Opportunity Radar and Asset Explorer without losing the selected year", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "2031" }));
    fireEvent.click(screen.getByRole("button", { name: "Asset Explorer" }));
    expect(screen.getByRole("button", { name: "Asset Explorer" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("global-map")).toHaveTextContent("year 2031");
    expect(screen.getByText(/published facilities/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Opportunity Radar" }));
    expect(screen.getByRole("button", { name: "2031" })).toHaveAttribute("aria-pressed", "true");
  });

  it("opens Country Intelligence as a drill-down and returns to the selected country", () => {
    render(<OpportunityRadar snapshot={snapshot} />);
    fireEvent.click(screen.getByRole("button", { name: "Open country intelligence" }));
    expect(screen.getByRole("heading", { name: "Darmstadt intelligence" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to region" }));
    expect(screen.getByRole("heading", { name: "Darmstadt" })).toBeInTheDocument();
  });

  it("clears stale regional energy on snapshot path change and exposes a recoverable error", async () => {
    const forecast = Array.from({ length: 6 }, (_, index) => ({ geographyId: "DE71", year: 2026 + index, metrics: { demandGwh: { low: 90, central: 100, high: 110 }, localGenerationGwh: { low: 80, central: 90, high: 100 }, localGenerationGapGwh: { low: -10, central: 10, high: 30 }, netBalanceGwh: null, observedUnmetDemandGwh: null, installedCapacityMw: 50, dependableCapacityMw: { low: 30, central: 35, high: 40 }, peakDemandMw: { low: 20, central: 25, high: 30 } }, methodId: "m1", sourceIds: ["s1"], confidence: 70, coverage: 80, valueKind: "estimated", appliedIncrementIds: [], metricLineage: {} }));
    mockLoadRegionalEnergy.mockResolvedValueOnce({ ok: true, data: { DE71: forecast } }).mockResolvedValue({ ok: false, error: { kind: "network", message: "Network unavailable", recoverable: true, path: "snapshots/new/regional-energy.json" } });
    const first = { ...snapshot, manifest: { ...snapshot.manifest, snapshotId: "old", artifacts: { ...snapshot.manifest.artifacts, regionalEnergy: "snapshots/old/regional-energy.json" } } };
    const next = { ...snapshot, manifest: { ...snapshot.manifest, snapshotId: "new", artifacts: { ...snapshot.manifest.artifacts, regionalEnergy: "snapshots/new/regional-energy.json" } } };
    const { rerender } = render(<OpportunityRadar snapshot={first} />);
    fireEvent.click(screen.getByRole("button", { name: "Power Balance" }));
    fireEvent.click(screen.getByRole("tab", { name: "Energy" }));
    expect((await screen.findAllByText("100 GWh")).length).toBeGreaterThan(0);
    rerender(<OpportunityRadar snapshot={next} />);
    await waitFor(() => expect(screen.queryAllByText("100 GWh")).toHaveLength(0));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not load regional energy/i);
    expect(screen.getByRole("button", { name: /retry regional energy/i })).toBeInTheDocument();
  });
});

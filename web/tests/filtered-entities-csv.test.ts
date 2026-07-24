import { describe, expect, it } from "vitest";

import {
  filteredEntityFilename,
  selectFilteredEntities,
  serializeFilteredEntities,
} from "@/lib/export/filtered-entities-csv";
import { filterInfrastructureAssets } from "@/lib/map/asset-filters";
import type {
  AssetCollection,
  AssetFeature,
  AssetProperties,
  GeneratorFeature,
} from "@/lib/snapshot/types";

function asset(
  id: string,
  category: AssetProperties["category"],
  lifecycle: AssetProperties["lifecycle"],
): AssetFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [8, 50] },
    properties: {
      id,
      name: id,
      geographyId: "DE-HE",
      category,
      lifecycle,
      demandMw: null,
      locationPrecision: "exact",
      valueKind: "reported",
      sourceIds: ["registry"],
      country: "DE",
      confidence: 90,
      sourceType: "official_verified",
      externalIds: {},
    },
  };
}

function generator(
  id: string,
  technology: "hydro" | "solar",
  capacityMw: number,
  lifecycle = "operational",
): GeneratorFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [9, 51] },
    properties: {
      id,
      name: id,
      category: "power_generation",
      country: "DE",
      geographyId: "DE-HE",
      lifecycle,
      technologies: [technology],
      capacityMw,
      operatingCapacityMw: capacityMw,
      plannedCapacityMw: 0,
      technologyMixMw: { [technology]: capacityMw },
      sourceIds: ["registry"],
    },
  };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\"") {
      if (quoted && line[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells;
}

describe("filterInfrastructureAssets", () => {
  it("keeps only enabled categories with selected lifecycles", () => {
    const assets: AssetCollection = {
      type: "FeatureCollection",
      features: [
        asset("data-centre-1", "data_centre", "operational"),
        asset("data-centre-planned", "data_centre", "announced"),
        asset("water-1", "water_infrastructure", "operational"),
        asset("industrial-1", "industrial_load", "operational"),
      ],
    };

    const result = filterInfrastructureAssets(
      assets,
      {
        dataCentres: true,
        water: false,
        industrial: false,
        hydrogen: false,
        generators: false,
      },
      new Set(["operational"]),
    );

    expect(result.features.map(({ properties }) => properties.id)).toEqual([
      "data-centre-1",
    ]);
  });
});

describe("serializeFilteredEntities", () => {
  it("writes the stable schema and flattens asset and generator fields", () => {
    const infrastructureAsset = asset(
      "asset-1",
      "data_centre",
      "operational",
    );
    infrastructureAsset.properties = {
      ...infrastructureAsset.properties,
      name: "Alpha, \"North\" DC",
      subtype: "hyperscale",
      demandMw: { low: 10, central: 20, high: 30 },
      annualDemandGwh: { low: 100, central: 200, high: 300 },
      operator: "Alpha Cloud",
      address: { street: "1 Main St", city: "Frankfurt", country: "DE" },
      sourceIds: ["registry", "official"],
      sourceUrl: "https://example.com/asset-1",
      lastObservedAt: "2026-07-01T00:00:00Z",
    };
    const hydro = generator("generator-1", "hydro", 120);
    hydro.properties = {
      ...hydro.properties,
      name: "Rhine Hydro",
      annualGenerationGwh: { low: -12.5, central: 400, high: 450 },
      operator: "Rhine Power",
      sourceUrl: "https://example.com/generator-1",
    };

    const csv = serializeFilteredEntities({
      entities: { assets: [infrastructureAsset], generators: [hydro] },
      exportedAt: "2026-07-24T10:00:00.000Z",
      snapshotId: "snapshot-1",
      selectedYear: 2031,
    });
    const [header, assetLine, generatorLine] = csv
      .slice(1)
      .split("\r\n");
    const columns = header.split(",");
    const assetCells = parseCsvLine(assetLine);
    const generatorCells = parseCsvLine(generatorLine);
    const value = (cells: string[], column: string) =>
      cells[columns.indexOf(column)];

    expect(csv.startsWith("\uFEFFexported_at,snapshot_id,selected_year")).toBe(
      true,
    );
    expect(columns).toEqual([
      "exported_at", "snapshot_id", "selected_year", "id", "name",
      "entity_type", "category", "subtype", "country", "region_id",
      "latitude", "longitude", "location_precision", "lifecycle",
      "commissioning_year", "retirement_year", "target_year", "technology",
      "primary_fuel", "secondary_fuel", "total_capacity_mw",
      "operating_capacity_mw", "planned_capacity_mw", "demand_low_mw",
      "demand_central_mw", "demand_high_mw", "annual_energy_low_gwh",
      "annual_energy_central_gwh", "annual_energy_high_gwh", "operator",
      "owner", "address", "website", "value_kind", "confidence",
      "source_type", "source_ids", "source_url", "last_observed_at",
    ]);
    expect(value(assetCells, "name")).toBe("Alpha, \"North\" DC");
    expect(value(assetCells, "entity_type")).toBe("asset");
    expect(value(assetCells, "latitude")).toBe("50");
    expect(value(assetCells, "longitude")).toBe("8");
    expect(value(assetCells, "total_capacity_mw")).toBe("");
    expect(value(assetCells, "demand_central_mw")).toBe("20");
    expect(value(assetCells, "annual_energy_high_gwh")).toBe("300");
    expect(value(assetCells, "address")).toBe("1 Main St, Frankfurt, DE");
    expect(value(assetCells, "source_ids")).toBe("registry;official");
    expect(value(generatorCells, "entity_type")).toBe("generator");
    expect(value(generatorCells, "category")).toBe("power_generation");
    expect(value(generatorCells, "technology")).toBe("hydro");
    expect(value(generatorCells, "total_capacity_mw")).toBe("120");
    expect(value(generatorCells, "annual_energy_low_gwh")).toBe("-12.5");
  });

  it("protects formula-like text after whitespace and control characters", () => {
    const unsafe = asset("asset-1", "data_centre", "operational");
    unsafe.properties.name = " \t=SUM(1,1)";

    const csv = serializeFilteredEntities({
      entities: { assets: [unsafe], generators: [] },
      exportedAt: "2026-07-24T10:00:00.000Z",
      snapshotId: "snapshot-1",
      selectedYear: 2026,
    });
    const [, row] = csv.slice(1).split("\r\n");

    expect(parseCsvLine(row)[4]).toBe("' \t=SUM(1,1)");
  });

  it("builds a local-date filename", () => {
    expect(filteredEntityFilename(new Date(2026, 6, 4))).toBe(
      "wattlas-filtered-entities-2026-07-04.csv",
    );
  });
});

describe("selectFilteredEntities", () => {
  it("applies layer, technology, lifecycle, and capacity filters", () => {
    const result = selectFilteredEntities({
      assets: {
        type: "FeatureCollection",
        features: [asset("data-centre-1", "data_centre", "operational")],
      },
      generators: [
        generator("hydro-1", "hydro", 120),
        generator("hydro-small", "hydro", 80),
        generator("hydro-planned", "hydro", 200, "announced"),
        generator("solar-1", "solar", 200),
      ],
      infrastructure: {
        dataCentres: true,
        water: false,
        industrial: false,
        hydrogen: false,
        generators: true,
      },
      technologies: new Set(["hydro"]),
      lifecycles: new Set(["operational"]),
      capacityRange: { minMw: 100, maxMw: null },
    });

    expect(result.assets.map(({ properties }) => properties.id)).toEqual([
      "data-centre-1",
    ]);
    expect(result.generators.map(({ properties }) => properties.id)).toEqual([
      "hydro-1",
    ]);
  });

  it("omits generators when their layer is disabled", () => {
    const result = selectFilteredEntities({
      assets: {
        type: "FeatureCollection",
        features: [asset("data-centre-1", "data_centre", "operational")],
      },
      generators: [generator("hydro-1", "hydro", 120)],
      infrastructure: {
        dataCentres: true,
        water: false,
        industrial: false,
        hydrogen: false,
        generators: false,
      },
      technologies: new Set(["hydro"]),
      lifecycles: new Set(["operational"]),
      capacityRange: { minMw: 0, maxMw: null },
    });

    expect(result.assets).toHaveLength(1);
    expect(result.generators).toHaveLength(0);
  });
});

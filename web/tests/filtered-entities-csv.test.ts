import { describe, expect, it } from "vitest";

import { filterInfrastructureAssets } from "@/lib/map/asset-filters";
import type { AssetCollection, AssetFeature, AssetProperties } from "@/lib/snapshot/types";

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

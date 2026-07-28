import type { AssetCollection } from "@/lib/snapshot/types";

export type InfrastructureVisibility = {
  dataCentres: boolean;
  water: boolean;
  industrial: boolean;
  hydrogen: boolean;
  generators: boolean;
};

export function filterInfrastructureAssets(
  assets: AssetCollection,
  infrastructure: InfrastructureVisibility,
  lifecycles: ReadonlySet<string>,
): AssetCollection {
  return {
    ...assets,
    features: assets.features.filter(({ properties }) => {
      const categoryVisible = properties.category === "data_centre"
        ? infrastructure.dataCentres
        : properties.category === "water_infrastructure"
          ? infrastructure.water
          : properties.category === "industrial_load"
            ? infrastructure.industrial
            : properties.category === "hydrogen_infrastructure"
              ? infrastructure.hydrogen
              : false;
      return categoryVisible && lifecycles.has(properties.lifecycle ?? "unknown");
    }),
  };
}

import type { AssetFeature, CityCollection, GeneratorFeature, GeographyFeature, RegionFeature } from "@/lib/snapshot/types";

export type SearchEntityType = "country" | "state" | "region" | "city" | "data_centre" | "water_infrastructure" | "industrial_load" | "hydrogen_infrastructure" | "generator";
export type SearchGroup = "Places" | "Power generators" | "Data centres" | "Water infrastructure" | "Industrial demand" | "Hydrogen network";

export type SearchResult = {
  id: string;
  label: string;
  detail: string;
  group: SearchGroup;
  entityType: SearchEntityType;
  country?: string;
  coordinates?: [number, number];
  bbox?: [number, number, number, number];
  generator?: GeneratorFeature;
  score: number;
};

type SearchIndexInput = {
  geographies: Array<GeographyFeature | RegionFeature>;
  assets: AssetFeature[];
  generators: GeneratorFeature[];
  cities?: CityCollection["features"];
};

type SearchIndexItem = SearchResult & { normalized: string; aliases: string[] };

export type SearchIndex = SearchIndexItem[];

function normalize(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim();
}

function visitCoordinates(coordinates: unknown, visitor: (point: [number, number]) => void): void {
  if (!Array.isArray(coordinates)) return;
  if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
    visitor([coordinates[0], coordinates[1]]);
    return;
  }
  for (const child of coordinates) visitCoordinates(child, visitor);
}

function geometryBbox(geometry: GeoJSON.Geometry | null): [number, number, number, number] | undefined {
  if (!geometry) return undefined;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  visitCoordinates("coordinates" in geometry ? geometry.coordinates : null, ([lng, lat]) => {
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  });
  return Number.isFinite(west) && Number.isFinite(south) && Number.isFinite(east) && Number.isFinite(north) ? [west, south, east, north] : undefined;
}

function pointCoordinates(feature: AssetFeature | GeneratorFeature): [number, number] {
  return [feature.geometry.coordinates[0], feature.geometry.coordinates[1]];
}

function geographyEntityType(feature: GeographyFeature | RegionFeature): SearchEntityType {
  const level = "level" in feature.properties ? feature.properties.level : undefined;
  if (level === "country") return "country";
  if (level === "admin_1") return "state";
  return "region";
}

function geographyDetail(feature: GeographyFeature | RegionFeature): string {
  const entityType = geographyEntityType(feature);
  if (entityType === "country") return "Country";
  if (entityType === "state") return `State / province · ${feature.properties.country}`;
  return `Region · ${feature.properties.country}`;
}

function assetGroup(feature: AssetFeature): SearchGroup {
  if (feature.properties.category === "data_centre") return "Data centres";
  if (feature.properties.category === "water_infrastructure") return "Water infrastructure";
  if (feature.properties.category === "industrial_load") return "Industrial demand";
  return "Hydrogen network";
}

function assetEntityType(feature: AssetFeature): SearchEntityType {
  if (feature.properties.category === "data_centre") return "data_centre";
  if (feature.properties.category === "water_infrastructure") return "water_infrastructure";
  if (feature.properties.category === "industrial_load") return "industrial_load";
  return "hydrogen_infrastructure";
}

function assetTypeLabel(feature: AssetFeature): string {
  if (feature.properties.category === "data_centre") return "Data centre";
  if (feature.properties.category === "water_infrastructure") return "Water infrastructure";
  if (feature.properties.category === "industrial_load") return "Industrial demand project";
  return "Hydrogen network project";
}

export function buildSearchIndex({ geographies, assets, generators, cities = [] }: SearchIndexInput): SearchIndex {
  const geographyItems = geographies.map((feature): SearchIndexItem => ({
    id: feature.properties.id,
    label: feature.properties.name,
    detail: geographyDetail(feature),
    group: "Places",
    entityType: geographyEntityType(feature),
    country: feature.properties.country,
    bbox: geometryBbox(feature.geometry),
    score: 0,
    normalized: normalize(feature.properties.name),
    aliases: [normalize(feature.properties.country), normalize(feature.properties.id)],
  }));

  const assetItems = assets.map((feature): SearchIndexItem => ({
    id: feature.properties.id,
    label: feature.properties.name,
    detail: `${assetTypeLabel(feature)} · ${feature.properties.country}`,
    group: assetGroup(feature),
    entityType: assetEntityType(feature),
    country: feature.properties.country,
    coordinates: pointCoordinates(feature),
    score: 0,
    normalized: normalize(feature.properties.name),
    aliases: [normalize(feature.properties.operator), normalize(feature.properties.owner), normalize(feature.properties.country), normalize(feature.properties.address?.city)],
  }));

  const generatorItems = generators
    .filter((feature) => feature.properties.name)
    .map((feature): SearchIndexItem => ({
      id: feature.properties.id,
      label: feature.properties.name ?? feature.properties.id,
      detail: `Power generator · ${feature.properties.country}`,
      group: "Power generators",
      entityType: "generator",
      country: feature.properties.country,
      coordinates: pointCoordinates(feature),
      generator: feature,
      score: 0,
      normalized: normalize(feature.properties.name),
      aliases: [normalize(feature.properties.country), normalize(feature.properties.operator), normalize(feature.properties.owner), ...feature.properties.technologies.map(normalize)],
    }));

  const cityItems = cities.map((feature): SearchIndexItem => ({
    id: feature.properties.id,
    label: feature.properties.name,
    detail: `${feature.properties.population >= 1_000_000 ? "Million-plus city" : "German Großstadt"} · ${feature.properties.country}`,
    group: "Places",
    entityType: "city",
    country: feature.properties.country,
    coordinates: [feature.geometry.coordinates[0], feature.geometry.coordinates[1]],
    score: 0,
    normalized: normalize(feature.properties.name),
    aliases: [normalize(feature.properties.country), String(feature.properties.population)],
  }));

  return [...geographyItems, ...cityItems, ...assetItems, ...generatorItems];
}

function matchScore(item: SearchIndexItem, query: string): number {
  if (item.normalized === query) return 1000;
  if (item.normalized.startsWith(query)) return 800;
  if (item.normalized.includes(query)) return 500;
  if (query.length < 3) return 0;
  const aliasScore = item.aliases.some((alias) => alias === query) ? 350 : item.aliases.some((alias) => alias.startsWith(query)) ? 250 : item.aliases.some((alias) => alias.includes(query)) ? 150 : 0;
  return aliasScore;
}

function typePriority(entityType: SearchEntityType): number {
  if (entityType === "country") return 40;
  if (entityType === "state") return 35;
  if (entityType === "region") return 30;
  if (entityType === "city") return 28;
  if (entityType === "data_centre") return 20;
  if (entityType === "water_infrastructure") return 15;
  if (entityType === "industrial_load") return 18;
  if (entityType === "hydrogen_infrastructure") return 16;
  return 10;
}

export function searchEntities(index: SearchIndex, rawQuery: string, limit = 8): SearchResult[] {
  const query = normalize(rawQuery);
  if (!query) return [];
  return index
    .map((item) => ({ item, match: matchScore(item, query) }))
    .filter(({ match }) => match > 0)
    .map(({ item, match }) => ({ ...item, score: match + typePriority(item.entityType) }))
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.detail,
      group: item.group,
      entityType: item.entityType,
      country: item.country,
      coordinates: item.coordinates,
      bbox: item.bbox,
      generator: item.generator,
      score: item.score,
    }));
}

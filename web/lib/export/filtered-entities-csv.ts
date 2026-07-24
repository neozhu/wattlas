import { filterInfrastructureAssets, type InfrastructureVisibility } from "@/lib/map/asset-filters";
import type { GeneratorCapacityRange } from "@/lib/map/generator-capacity";
import { filterGenerators } from "@/lib/map/generator-shards";
import type {
  AssetCollection,
  AssetFeature,
  GenerationTechnology,
  GeneratorFeature,
} from "@/lib/snapshot/types";

export type FilteredEntities = {
  assets: AssetFeature[];
  generators: GeneratorFeature[];
};

type FilteredEntitySelectionInput = {
  assets: AssetCollection;
  generators: GeneratorFeature[];
  infrastructure: InfrastructureVisibility;
  technologies: ReadonlySet<GenerationTechnology>;
  lifecycles: ReadonlySet<string>;
  capacityRange: GeneratorCapacityRange;
};

export function selectFilteredEntities({
  assets,
  generators,
  infrastructure,
  technologies,
  lifecycles,
  capacityRange,
}: FilteredEntitySelectionInput): FilteredEntities {
  const filteredAssets = filterInfrastructureAssets(
    assets,
    infrastructure,
    lifecycles,
  ).features as AssetFeature[];
  if (!infrastructure.generators) {
    return { assets: filteredAssets, generators: [] };
  }
  const filteredGenerators = filterGenerators(
    { type: "FeatureCollection", features: generators },
    technologies,
    lifecycles,
    capacityRange,
  ).features as GeneratorFeature[];
  return { assets: filteredAssets, generators: filteredGenerators };
}

const CSV_COLUMNS = [
  "exported_at",
  "snapshot_id",
  "selected_year",
  "id",
  "name",
  "entity_type",
  "category",
  "subtype",
  "country",
  "region_id",
  "latitude",
  "longitude",
  "location_precision",
  "lifecycle",
  "commissioning_year",
  "retirement_year",
  "target_year",
  "technology",
  "primary_fuel",
  "secondary_fuel",
  "total_capacity_mw",
  "operating_capacity_mw",
  "planned_capacity_mw",
  "demand_low_mw",
  "demand_central_mw",
  "demand_high_mw",
  "annual_energy_low_gwh",
  "annual_energy_central_gwh",
  "annual_energy_high_gwh",
  "operator",
  "owner",
  "address",
  "website",
  "value_kind",
  "confidence",
  "source_type",
  "source_ids",
  "source_url",
  "last_observed_at",
] as const;

type CsvColumn = typeof CSV_COLUMNS[number];
type CsvValue = string | number | null | undefined;
type CsvRow = Record<CsvColumn, CsvValue>;

type FilteredEntityCsvInput = {
  entities: FilteredEntities;
  exportedAt: string;
  snapshotId: string;
  selectedYear: number;
};

function baseRow(
  exportedAt: string,
  snapshotId: string,
  selectedYear: number,
): Pick<CsvRow, "exported_at" | "snapshot_id" | "selected_year"> {
  return {
    exported_at: exportedAt,
    snapshot_id: snapshotId,
    selected_year: selectedYear,
  };
}

function assetRow(
  feature: AssetFeature,
  context: ReturnType<typeof baseRow>,
): CsvRow {
  const { properties } = feature;
  const [longitude, latitude] = feature.geometry.coordinates;
  const address = properties.address
    ? [
        [properties.address.houseNumber, properties.address.street].filter(Boolean).join(" "),
        properties.address.city,
        properties.address.state,
        properties.address.postcode,
        properties.address.country,
      ].filter(Boolean).join(", ")
    : undefined;
  return {
    ...context,
    id: properties.id,
    name: properties.name,
    entity_type: "asset",
    category: properties.category,
    subtype: properties.subtype,
    country: properties.country,
    region_id: properties.geographyId,
    latitude,
    longitude,
    location_precision: properties.locationPrecision,
    lifecycle: properties.lifecycle,
    commissioning_year: properties.commissioningYear,
    retirement_year: properties.retirementYear,
    target_year: properties.targetYear,
    technology: properties.technology,
    primary_fuel: properties.technology,
    secondary_fuel: properties.secondaryFuel,
    total_capacity_mw: properties.capacityMw?.central,
    operating_capacity_mw: undefined,
    planned_capacity_mw: undefined,
    demand_low_mw: properties.demandMw?.low,
    demand_central_mw: properties.demandMw?.central,
    demand_high_mw: properties.demandMw?.high,
    annual_energy_low_gwh: properties.annualDemandGwh?.low,
    annual_energy_central_gwh: properties.annualDemandGwh?.central,
    annual_energy_high_gwh: properties.annualDemandGwh?.high,
    operator: properties.operator,
    owner: properties.owner,
    address,
    website: properties.website,
    value_kind: properties.valueKind,
    confidence: properties.confidence,
    source_type: properties.sourceType,
    source_ids: properties.sourceIds.join(";"),
    source_url: properties.sourceUrl,
    last_observed_at: properties.lastObservedAt,
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function generatorRow(
  feature: GeneratorFeature,
  context: ReturnType<typeof baseRow>,
): CsvRow {
  const { properties } = feature;
  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    ...context,
    id: properties.id,
    name: properties.name,
    entity_type: "generator",
    category: "power_generation",
    subtype: undefined,
    country: properties.country,
    region_id: properties.geographyId,
    latitude,
    longitude,
    location_precision: optionalString(properties.locationPrecision),
    lifecycle: properties.lifecycle,
    commissioning_year: properties.commissioningYear,
    retirement_year: properties.retirementYear,
    target_year: properties.targetYear,
    technology: properties.technologies.join(";"),
    primary_fuel: properties.primaryFuel,
    secondary_fuel: properties.secondaryFuel,
    total_capacity_mw: properties.capacityMw,
    operating_capacity_mw: properties.operatingCapacityMw,
    planned_capacity_mw: properties.plannedCapacityMw,
    demand_low_mw: undefined,
    demand_central_mw: undefined,
    demand_high_mw: undefined,
    annual_energy_low_gwh: properties.annualGenerationGwh?.low,
    annual_energy_central_gwh: properties.annualGenerationGwh?.central,
    annual_energy_high_gwh: properties.annualGenerationGwh?.high,
    operator: properties.operator,
    owner: properties.owner,
    address: undefined,
    website: undefined,
    value_kind: optionalString(properties.valueKind),
    confidence: properties.confidence,
    source_type: optionalString(properties.sourceType),
    source_ids: properties.sourceIds.join(";"),
    source_url: properties.sourceUrl,
    last_observed_at: optionalString(properties.lastObservedAt),
  };
}

function serializeCell(value: CsvValue): string {
  if (value == null) return "";
  const text = typeof value === "number" ? String(value) : value;
  const safe = typeof value === "string"
    && /^[\s\u0000-\u001f]*[=+\-@]/u.test(value)
    ? `'${text}`
    : text;
  return /[",\r\n]/u.test(safe) ? `"${safe.replaceAll("\"", "\"\"")}"` : safe;
}

export function serializeFilteredEntities({
  entities,
  exportedAt,
  snapshotId,
  selectedYear,
}: FilteredEntityCsvInput): string {
  const context = baseRow(exportedAt, snapshotId, selectedYear);
  const rows = [
    ...entities.assets.map((feature) => assetRow(feature, context)),
    ...entities.generators.map((feature) => generatorRow(feature, context)),
  ];
  const lines = [
    CSV_COLUMNS.join(","),
    ...rows.map((row) => CSV_COLUMNS.map((column) => serializeCell(row[column])).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}`;
}

export function filteredEntityFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `wattlas-filtered-entities-${year}-${month}-${day}.csv`;
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  try {
    anchor.click();
  } finally {
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

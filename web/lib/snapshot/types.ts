export type LensKey =
  | "infrastructureDemand"
  | "siteAttractiveness"
  | "systemRisk"
  | "powerBalance";

export type LensScores = {
  infrastructureDemand: number | null;
  siteAttractiveness: number | null;
  systemRisk: number | null;
  powerBalance?: number | null;
};

export type InfrastructureCategory = "combined" | "data_centre" | "water_infrastructure";
export type AssetCategory = Exclude<InfrastructureCategory, "combined"> | "power_generation" | "industrial_load" | "hydrogen_infrastructure";
export type GenerationTechnology = "solar" | "wind" | "hydro" | "nuclear" | "gas" | "coal" | "oil" | "biomass" | "geothermal" | "other";
export type GeographyLevel = "country" | "admin_1" | "admin_2";
export type DemandRange = { low: number; central: number; high: number };

export type ScoreContribution = {
  id: string;
  label: string;
  rawValue: number | null;
  unit: string | null;
  points: number | null;
  maxPoints: number;
  valueKind: "observed" | "reported" | "estimated" | "inherited" | "unavailable";
  sourceIds: string[];
  normalization: string;
  methodVersion: string;
};

export type RegionProperties = {
  id: string;
  name: string;
  country: string;
  scoreYear: number;
  scores: LensScores;
  scoresByYear: Record<string, LensScores>;
  confidence: number;
  coverage: number;
  valueKind: "observed" | "reported" | "estimated" | "inherited" | "unavailable";
  updatedAt: string;
  contributions: ScoreContribution[];
  contributionsByYear: Record<string, ScoreContribution[]>;
  sourceIds: string[];
  population?: number | null;
  populationYear?: number;
  populationSourceYear?: number | null;
  populationValueKind?: RegionProperties["valueKind"];
  populationConfidence?: number;
  powerBalanceYear?: number;
  powerBalanceCoverage?: number | null;
  powerBalanceValueKind?: RegionProperties["valueKind"];
  clusterId?: string | null;
};

export type RegionFeature = GeoJSON.Feature<GeoJSON.Geometry, RegionProperties> & {
  id: string;
};

export type RegionCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, RegionProperties>;

export type GeographyProperties = RegionProperties & {
  level: GeographyLevel;
  parentId: string | null;
  peerLevel: GeographyLevel;
  categoryScoresByYear: Record<string, Record<InfrastructureCategory, LensScores>>;
  demandMwByYear: Record<string, Record<InfrastructureCategory, DemandRange | null>>;
  assetCount: number;
  assetSummary: AssetSummary;
};
export type AssetSummary = {
  total: number;
  operational: number;
  planned: number;
  dataCentres: number;
  waterInfrastructure: number;
  industrialLoads: number;
  hydrogenInfrastructure: number;
  officialVerified: number;
  communityMapped: number;
};
export type GeographyFeature = GeoJSON.Feature<GeoJSON.Geometry, GeographyProperties> & { id: string };
export type GeographyCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, GeographyProperties>;

export type AssetProperties = {
  id: string;
  name: string;
  geographyId: string;
  category: AssetCategory;
  subtype?: "hyperscale" | "colocation" | "cloud" | "ai_hpc" | "other_data_centre" | "desalination" | "wastewater" | "water_reuse" | "pipeline_pumping" | "reservoir" | "hydrogen_production" | "steel_plant" | "cement_plant" | "hydrogen_pipeline" | "hydrogen_blending" | "hydrogen_storage" | "hydrogen_import_terminal" | "hydrogen_export_terminal" | null;
  lifecycle: "announced" | "planning_filed" | "permitted" | "under_construction" | "pre_construction" | "operational" | "paused" | "cancelled" | "retired" | "decommissioned" | "shelved" | "unknown";
  demandMw: DemandRange | null;
  annualDemandGwh?: DemandRange | null;
  reportedCapacity?: number | null;
  reportedCapacityUnit?: string | null;
  gridConnectionType?: "grid" | "grid_plus_renewables" | "dedicated_renewable" | "nuclear" | "other_or_unknown" | null;
  gridDemandContribution?: boolean;
  technologyDetail?: string | null;
  rawStatus?: string | null;
  sourceRecordIds?: string[];
  projectUrl?: string | null;
  demandMethodId?: string | null;
  technology?: GenerationTechnology | null;
  secondaryFuel?: string | null;
  capacityMw?: DemandRange | null;
  dependableCapacityMw?: DemandRange | null;
  annualGenerationGwh?: DemandRange | null;
  commissioningYear?: number | null;
  retirementYear?: number | null;
  plantId?: string | null;
  unitId?: string | null;
  targetYear?: number | null;
  locationPrecision: "exact" | "city_centroid" | "region_centroid";
  valueKind: "observed" | "reported" | "estimated" | "inherited" | "unavailable";
  sourceIds: string[];
  operator?: string | null;
  owner?: string | null;
  website?: string | null;
  facilityRef?: string | null;
  address?: {
    street?: string | null;
    houseNumber?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null;
  startDate?: string | null;
  openingDate?: string | null;
  reportedPower?: string | null;
  admin1Id?: string | null;
  country: string;
  confidence: number;
  assumptionId?: string;
  sourceType: "community_mapped" | "official_verified" | "research_verified" | "modelled";
  sourceUrl?: string | null;
  externalIds: Record<string, string>;
  lastObservedAt?: string | null;
};
export type AssetFeature = GeoJSON.Feature<GeoJSON.Point, AssetProperties> & { id: string };
export type AssetCollection = GeoJSON.FeatureCollection<GeoJSON.Point, AssetProperties>;

export type CityProperties = { id: string; name: string; country: string; population: number; populationYear: number; populationDefinition: "urban_centre" | "municipality"; classes: Array<"million_plus" | "german_large_city">; sourceId: string; observedAt: string };
export type CityCollection = GeoJSON.FeatureCollection<GeoJSON.Point, CityProperties>;
export type GridProperties = { id?: string; sourceOperator?: string; sourceRecordId: string; recordType: "connection_queue" | "congestion" | "outage" | "transfer_capacity" | "redispatch" | "topology"; market: string; capacityValue?: number | null; capacityUnit?: string | null; status?: string | null; voltageKv?: number | null; evidenceClass?: "reported" | "derived" | "modelled"; confidence?: number; licence?: string; observedAt?: string; qualityFlags: string[]; native: Record<string, unknown> };
export type GridCollection = GeoJSON.FeatureCollection<GeoJSON.Point | GeoJSON.LineString | GeoJSON.MultiLineString | null, GridProperties> & { metadata?: Record<string, unknown> & { africaGrid?: Partial<GridProperties> & { sourceId?: string; nativePropertiesRetainedInManualSnapshot?: boolean } } };
export type CoolingEvidence = { id: string; scope: "facility_fact" | "regional_metric" | "model_input"; metric: string; value: number | string; valueKind: "reported" | "derived" | "modelled"; confidence: number; sourceIds: string[]; observedAt: string; modelVersion?: string | null; reasons: string[] };

export type ProjectProperties = {
  id: string;
  name: string;
  regionId: string;
  entityType: "cluster";
  valueKind: "estimated";
  sourceIds: string[];
  confidence: number;
};

export type ProjectCollection = GeoJSON.FeatureCollection<GeoJSON.Point, ProjectProperties>;

export type ConnectorStatus = {
  id: string;
  state: "current" | "cached" | "stale" | "failed" | "not_configured";
  checkedAt: string;
  lastSuccessAt: string | null;
  observationDate?: string | null;
  message: string | null;
  publicationState?: "publishable" | "quarantined" | "rejected" | "superseded";
};

export type SourceDescriptor = {
  id: string; name: string; publisher: string; url: string;
  categories: Array<"generation" | "demand" | "grid_context" | "digital_infrastructure" | "projects" | "national_control" | "electrification" | "source_catalogue">;
  continents: string[]; countries: string[];
  accessMode: "automatic" | "credentialled" | "manual_snapshot" | "metadata_only";
  publicationState: "publishable" | "quarantined" | "rejected" | "superseded";
  refreshCadence: "monthly" | "manual" | "irregular" | "metadata_only";
  licence: string | null; licenceUrl: string | null; licenceDecidedAt: string;
  requiredEnv: string[]; manualPathEnv: string | null; notes: string | null;
};
export type SourceCatalog = { schemaVersion: string; sources: SourceDescriptor[] };
export type SourceCoverage = {
  sourceCount: number;
  sourcesByPublicationState: Record<string, number>;
  sourcesByAccessMode: Record<string, number>;
  connectorStates: Record<string, number>;
  publishedRecords: number;
  publishedRecordsBySource: Record<string, number>;
};

export type SnapshotManifest = {
  snapshotId: string;
  generatedAt: string;
  modelVersion: string;
  activeYears: number[];
  artifacts: {
    countries: string; admin1: string; regions: string; assets: string; evidence: string;
    regionalEnergy?: string; generatorOverview?: string; generatorIndex?: string;
    sourceCatalog?: string;
    cities?: string; grid?: string; cooling?: string;
  };
  coverage: {
    countries: number;
    regions: number;
    admin1Regions: number;
    countriesWithAdmin1: number;
    assets: number;
    dataCentres: number;
    waterInfrastructure: number;
    industrialLoads?: number;
    hydrogenInfrastructure?: number;
    forecastIndustrialLoads?: number;
    powerSourceRecords?: number;
    powerSourceRecordsBySource?: Record<string, number>;
    canonicalPowerPlants?: number;
    canonicalPowerUnits?: number;
    publishedPowerPlants?: number;
    generatorRegions?: number;
    regionalEnergyRegions?: number;
    cities?: number;
    gridRecords?: number;
    coolingRecords?: number;
  };
  quality?: {
    countryDemandReconciled: boolean;
    generatorArtifactsReconciled: boolean;
    populationBuildFingerprint: string | null;
    demandWeightsBuildFingerprint: string | null;
    cities?: number;
    gridRecords?: number;
    coolingRecords?: number;
  };
  boundaryDisclaimer: string | null;
  publication?: { quarantinedSourceIds: string[] };
  sourceCoverage?: SourceCoverage;
  connectors: ConnectorStatus[];
  checksums?: Record<string, string>;
};

export type MetricRange = { low: number; central: number; high: number };
export type RegionalEnergyForecast = {
  geographyId?: string; year: number;
  metrics: {
    demandGwh: MetricRange; localGenerationGwh: MetricRange | null;
    localGenerationGapGwh: MetricRange | null; netBalanceGwh: MetricRange | null;
    observedUnmetDemandGwh: number | null; installedCapacityMw: number | null;
    dependableCapacityMw: MetricRange | null; peakDemandMw: MetricRange;
  };
  powerBalance?: { score: number | null; coverage: number; status: "rankable" | "not_yet_rankable"; contributions: ScoreContribution[] };
  methodId: string; sourceIds: string[]; confidence: number; coverage: number;
  valueKind: RegionProperties["valueKind"]; appliedIncrementIds: string[];
  metricLineage: Record<string, { sourceIds: string[]; methodId: string; valueKind: RegionProperties["valueKind"]; [key: string]: unknown }>;
};
export type CountryLevelOnlyEnergyForecast = {
  geographyId?: string; countryIso3: string; year: number;
  availability: "country_level_only"; rankable: false; metrics: null; powerBalance: null;
  countryControl: { countryIso3: string; year: number; sourceYear: number; demandGwh: MetricRange; sourceIds: string[]; valueKind: RegionProperties["valueKind"]; methodId: string; confidence: number; coverage: number } | null;
  reason: "population_unavailable_for_active_adm1"; unavailableGeographyIds: string[];
  methodId: string; sourceIds: string[]; confidence: 0; coverage: 0; valueKind: "unavailable";
};
export type RegionalEnergyRow = RegionalEnergyForecast | CountryLevelOnlyEnergyForecast;
export type RegionalEnergyData = Record<string, RegionalEnergyRow[]>;

export type GeneratorProperties = {
  id: string; category: "power_generation"; country: string; geographyId: string;
  lifecycle?: string; technologies: GenerationTechnology[]; capacityMw: number;
  operatingCapacityMw: number; plannedCapacityMw: number;
  technologyMixMw: Partial<Record<GenerationTechnology, number>>; sourceIds: string[];
  commissioningYear?: number | null; retirementYear?: number | null; targetYear?: number | null;
  primaryFuel?: string | null; secondaryFuel?: string | null; annualGenerationGwh?: MetricRange | null;
  operator?: string | null; owner?: string | null; confidence?: number | null; sourceUrl?: string | null; gemWikiUrl?: string | null; name?: string | null;
  [key: string]: unknown;
};
export type GeneratorFeature = GeoJSON.Feature<GeoJSON.Point, GeneratorProperties> & { id: string };
export type GeneratorCollection = GeoJSON.FeatureCollection<GeoJSON.Point, GeneratorProperties>;
export type GeneratorOverviewCollection = GeoJSON.FeatureCollection<GeoJSON.Point, {
  geographyId: string; country: string; count: number; capacityMw: number;
  operatingCapacityMw: number; plannedCapacityMw: number;
  technologyMixMw: Partial<Record<GenerationTechnology, number>>; dominantTechnology: GenerationTechnology;
  lifecycleCounts?: Partial<Record<string, number>>;
  filteredCapacityMw?: number; displayTechnology?: GenerationTechnology | "mixed"; isMixed?: boolean;
  compositionLabel?: string; overviewLabel?: string; lifecycleFilterExact?: boolean; filterDisclosure?: string;
}>;
export type GeneratorIndex = {
  countries: Record<string, { bbox: [number, number, number, number]; path: string; featureCount: number; checksum: string; bytes: number; capacityMw: number }>;
  totals: { featureCount: number; capacityMw: number };
};

export type LayerError = { kind: "aborted" | "network" | "http" | "invalid" | "missing"; message: string; recoverable: true; path: string };
export type LayerResult<T> = { ok: true; data: T } | { ok: false; error: LayerError };

export type EvidenceSource = {
  id: string;
  name: string;
  tier: "A" | "B" | "C" | "D";
  url: string;
  publishedAt: string;
};

export type EvidenceData = {
  sources: EvidenceSource[];
  claims: Array<{
    id: string;
    entityId: string;
    summary: string;
    sourceIds: string[];
    valueKind: string;
    observedAt: string;
  }>;
};

export type SnapshotData = {
  manifest: SnapshotManifest;
  countries: GeographyCollection;
  admin1: GeographyCollection;
  regions: GeographyCollection;
  assets: AssetCollection;
  evidence: EvidenceData;
};

from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import Any, Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, HttpUrl, computed_field, model_validator
from pydantic.alias_generators import to_camel


class ContractModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        use_enum_values=True,
    )


class ConnectorState(StrEnum):
    CURRENT = "current"
    CACHED = "cached"
    STALE = "stale"
    FAILED = "failed"
    NOT_CONFIGURED = "not_configured"


class AccessMode(StrEnum):
    AUTOMATIC = "automatic"
    CREDENTIALLED = "credentialled"
    MANUAL_SNAPSHOT = "manual_snapshot"
    METADATA_ONLY = "metadata_only"


class PublicationState(StrEnum):
    PUBLISHABLE = "publishable"
    QUARANTINED = "quarantined"
    REJECTED = "rejected"
    SUPERSEDED = "superseded"


class SourceCategory(StrEnum):
    GENERATION = "generation"
    DEMAND = "demand"
    GRID_CONTEXT = "grid_context"
    DIGITAL_INFRASTRUCTURE = "digital_infrastructure"
    PROJECTS = "projects"
    NATIONAL_CONTROL = "national_control"
    ELECTRIFICATION = "electrification"
    SOURCE_CATALOGUE = "source_catalogue"


class RefreshCadence(StrEnum):
    MONTHLY = "monthly"
    MANUAL = "manual"
    IRREGULAR = "irregular"
    METADATA_ONLY = "metadata_only"


class ValueKind(StrEnum):
    OBSERVED = "observed"
    REPORTED = "reported"
    ESTIMATED = "estimated"
    INHERITED = "inherited"
    UNAVAILABLE = "unavailable"


class LifecycleState(StrEnum):
    ANNOUNCED = "announced"
    PLANNING_FILED = "planning_filed"
    PERMITTED = "permitted"
    UNDER_CONSTRUCTION = "under_construction"
    PRE_CONSTRUCTION = "pre_construction"
    OPERATIONAL = "operational"
    PAUSED = "paused"
    CANCELLED = "cancelled"
    RETIRED = "retired"
    DECOMMISSIONED = "decommissioned"
    SHELVED = "shelved"
    UNKNOWN = "unknown"


class GeographyLevel(StrEnum):
    COUNTRY = "country"
    ADMIN_1 = "admin_1"
    ADMIN_2 = "admin_2"


class AssetCategory(StrEnum):
    DATA_CENTRE = "data_centre"
    WATER_INFRASTRUCTURE = "water_infrastructure"
    POWER_GENERATION = "power_generation"
    INDUSTRIAL_LOAD = "industrial_load"
    HYDROGEN_INFRASTRUCTURE = "hydrogen_infrastructure"


class GenerationTechnology(StrEnum):
    SOLAR = "solar"
    WIND = "wind"
    HYDRO = "hydro"
    NUCLEAR = "nuclear"
    GAS = "gas"
    COAL = "coal"
    OIL = "oil"
    BIOMASS = "biomass"
    GEOTHERMAL = "geothermal"
    OTHER = "other"


class AssetSubtype(StrEnum):
    HYPERSCALE = "hyperscale"
    COLOCATION = "colocation"
    CLOUD = "cloud"
    AI_HPC = "ai_hpc"
    OTHER_DATA_CENTRE = "other_data_centre"
    DESALINATION = "desalination"
    WASTEWATER = "wastewater"
    WATER_REUSE = "water_reuse"
    PIPELINE_PUMPING = "pipeline_pumping"
    RESERVOIR = "reservoir"
    HYDROGEN_PRODUCTION = "hydrogen_production"
    STEEL_PLANT = "steel_plant"
    CEMENT_PLANT = "cement_plant"
    HYDROGEN_PIPELINE = "hydrogen_pipeline"
    HYDROGEN_BLENDING = "hydrogen_blending"
    HYDROGEN_STORAGE = "hydrogen_storage"
    HYDROGEN_IMPORT_TERMINAL = "hydrogen_import_terminal"
    HYDROGEN_EXPORT_TERMINAL = "hydrogen_export_terminal"


DATA_CENTRE_SUBTYPES = frozenset(
    {
        AssetSubtype.HYPERSCALE,
        AssetSubtype.COLOCATION,
        AssetSubtype.CLOUD,
        AssetSubtype.AI_HPC,
        AssetSubtype.OTHER_DATA_CENTRE,
    }
)

WATER_INFRASTRUCTURE_SUBTYPES = frozenset(
    {
        AssetSubtype.DESALINATION,
        AssetSubtype.WASTEWATER,
        AssetSubtype.WATER_REUSE,
        AssetSubtype.PIPELINE_PUMPING,
        AssetSubtype.RESERVOIR,
    }
)

INDUSTRIAL_LOAD_SUBTYPES = frozenset(
    {
        AssetSubtype.HYDROGEN_PRODUCTION,
        AssetSubtype.STEEL_PLANT,
        AssetSubtype.CEMENT_PLANT,
    }
)

HYDROGEN_INFRASTRUCTURE_SUBTYPES = frozenset(
    {
        AssetSubtype.HYDROGEN_PIPELINE,
        AssetSubtype.HYDROGEN_BLENDING,
        AssetSubtype.HYDROGEN_STORAGE,
        AssetSubtype.HYDROGEN_IMPORT_TERMINAL,
        AssetSubtype.HYDROGEN_EXPORT_TERMINAL,
    }
)


class GridConnectionType(StrEnum):
    GRID = "grid"
    GRID_PLUS_RENEWABLES = "grid_plus_renewables"
    DEDICATED_RENEWABLE = "dedicated_renewable"
    NUCLEAR = "nuclear"
    OTHER_OR_UNKNOWN = "other_or_unknown"


class LocationPrecision(StrEnum):
    EXACT = "exact"
    CITY_CENTROID = "city_centroid"
    REGION_CENTROID = "region_centroid"


class SourceType(StrEnum):
    COMMUNITY_MAPPED = "community_mapped"
    OFFICIAL_VERIFIED = "official_verified"
    RESEARCH_VERIFIED = "research_verified"
    MODELLED = "modelled"


class CityProperties(ContractModel):
    id: str
    name: str
    country: str = Field(min_length=2, max_length=2)
    population: int = Field(ge=100_000)
    population_year: int = Field(ge=1900, le=2100)
    population_definition: Literal["urban_centre", "municipality"]
    classes: list[Literal["million_plus", "german_large_city"]]
    source_id: str
    observed_at: AwareDatetime


class GridRecord(ContractModel):
    id: str
    source_operator: str
    source_record_id: str
    record_type: Literal["connection_queue", "congestion", "outage", "transfer_capacity", "redispatch", "topology"]
    market: str
    capacity_value: float | None = Field(default=None, ge=0)
    capacity_unit: str | None = None
    status: str | None = None
    voltage_kv: float | None = Field(default=None, ge=0)
    evidence_class: Literal["reported", "derived", "modelled"]
    confidence: float = Field(ge=0, le=100)
    licence: str
    observed_at: AwareDatetime
    quality_flags: list[str] = Field(default_factory=list)
    native: dict[str, Any] = Field(default_factory=dict)


class CoolingEvidence(ContractModel):
    id: str
    scope: Literal["facility_fact", "regional_metric", "model_input"]
    metric: str
    value: float | str
    value_kind: Literal["reported", "derived", "modelled"]
    confidence: float = Field(ge=0, le=100)
    source_ids: list[str] = Field(min_length=1)
    observed_at: AwareDatetime
    model_version: str | None = None
    reasons: list[str] = Field(default_factory=list)


Score = float | None


class DemandRange(ContractModel):
    low: float = Field(ge=0)
    central: float = Field(ge=0)
    high: float = Field(ge=0)

    @model_validator(mode="after")
    def bounds_are_ordered(self) -> "DemandRange":
        if not self.low <= self.central <= self.high:
            raise ValueError("demand range must satisfy low <= central <= high")
        return self


class MetricRange(ContractModel):
    low: float = Field(allow_inf_nan=False)
    central: float = Field(allow_inf_nan=False)
    high: float = Field(allow_inf_nan=False)

    @model_validator(mode="after")
    def bounds_are_ordered(self) -> "MetricRange":
        if not self.low <= self.central <= self.high:
            raise ValueError("metric range must satisfy low <= central <= high")
        return self


class PowerBalanceMetrics(ContractModel):
    demand_gwh: MetricRange
    local_generation_gwh: MetricRange | None = None
    local_generation_gap_gwh: MetricRange | None = None
    net_balance_gwh: MetricRange | None = None
    observed_unmet_demand_gwh: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    installed_capacity_mw: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    dependable_capacity_mw: MetricRange | None = None
    peak_demand_mw: MetricRange

    @model_validator(mode="after")
    def physical_inputs_are_non_negative(self) -> "PowerBalanceMetrics":
        non_negative_ranges = (
            self.demand_gwh,
            self.local_generation_gwh,
            self.dependable_capacity_mw,
            self.peak_demand_mw,
        )
        if any(metric is not None and metric.low < 0 for metric in non_negative_ranges):
            raise ValueError("demand, generation, and capacity values cannot be negative")
        if (self.local_generation_gwh is None) != (self.local_generation_gap_gwh is None):
            raise ValueError(
                "local generation and local gap supply metrics must be available together"
            )
        if self.net_balance_gwh is not None and self.local_generation_gwh is None:
            raise ValueError("net balance requires available local generation")
        return self


class RegionalEnergyForecast(ContractModel):
    year: int = Field(ge=2026, le=2031)
    metrics: PowerBalanceMetrics
    method_id: str
    source_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=100, allow_inf_nan=False)
    coverage: float = Field(ge=0, le=100, allow_inf_nan=False)
    value_kind: ValueKind

    @model_validator(mode="after")
    def provenance_is_present(self) -> "RegionalEnergyForecast":
        if not self.method_id.strip():
            raise ValueError("regional energy forecasts require a nonblank method ID")
        if not self.source_ids or any(not source_id.strip() for source_id in self.source_ids):
            raise ValueError("regional energy forecasts require nonblank source IDs")
        return self


class SourceRef(ContractModel):
    id: str
    name: str
    tier: str = Field(pattern=r"^[ABCD]$")
    url: HttpUrl
    published_at: AwareDatetime | None = None
    checksum_sha256: str | None = Field(default=None, pattern=r"^[0-9a-f]{64}$")
    licence: str | None = None
    licence_url: HttpUrl | None = None
    last_modified: AwareDatetime | None = None


class SourceDescriptor(ContractModel):
    id: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
    name: str = Field(min_length=1)
    publisher: str = Field(min_length=1)
    url: HttpUrl
    categories: list[SourceCategory] = Field(min_length=1)
    continents: list[str] = Field(default_factory=list)
    countries: list[str] = Field(default_factory=list)
    access_mode: AccessMode
    publication_state: PublicationState
    refresh_cadence: RefreshCadence
    licence: str | None = None
    licence_url: HttpUrl | None = None
    licence_decided_at: date
    required_env: list[str] = Field(default_factory=list)
    manual_path_env: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def governance_is_complete(self) -> "SourceDescriptor":
        from grid_scope.connectors.licensing import is_redistributable_licence

        text_fields = (self.name, self.publisher)
        if any(not value.strip() for value in text_fields):
            raise ValueError("source metadata must be nonblank")
        if len(self.categories) != len(set(self.categories)):
            raise ValueError("source categories must be unique")
        if any(not continent.strip() for continent in self.continents):
            raise ValueError("source continents must be nonblank")
        if len(self.continents) != len(set(self.continents)):
            raise ValueError("source continents must be unique")
        if any(len(country) != 2 or country != country.upper() for country in self.countries):
            raise ValueError("source countries must use uppercase ISO alpha-2 codes")
        if len(self.countries) != len(set(self.countries)):
            raise ValueError("source countries must be unique")
        env_names = [*self.required_env]
        if self.manual_path_env is not None:
            env_names.append(self.manual_path_env)
        if any(not value or not value.replace("_", "").isalnum() or value != value.upper() for value in env_names):
            raise ValueError("source environment variables must be uppercase names")
        if self.access_mode == AccessMode.CREDENTIALLED and not self.required_env:
            raise ValueError("credentialled sources require environment variable names")
        if self.access_mode == AccessMode.MANUAL_SNAPSHOT and not self.manual_path_env:
            raise ValueError("manual snapshot sources require a path environment variable")
        if self.publication_state == PublicationState.PUBLISHABLE:
            if (
                self.licence is None
                or self.licence_url is None
                or not is_redistributable_licence(self.licence)
            ):
                raise ValueError(
                    "publishable sources require reusable licence metadata"
                )
        return self


class ScoreContribution(ContractModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    raw_value: float | None = Field(allow_inf_nan=False)
    unit: str | None = Field(default=None, min_length=1)
    points: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)
    max_points: float = Field(gt=0, le=100, allow_inf_nan=False)
    value_kind: ValueKind
    source_ids: list[str] = Field(default_factory=list)
    normalization: str = Field(min_length=1)
    method_version: str = Field(min_length=1)

    @model_validator(mode="after")
    def metadata_is_valid(self) -> "ScoreContribution":
        text_fields = (self.id, self.label, self.normalization, self.method_version)
        if any(not value.strip() for value in text_fields):
            raise ValueError("score contribution metadata must be nonblank")
        if self.unit is not None and not self.unit.strip():
            raise ValueError("score contribution unit must be nonblank when present")
        if any(not source_id.strip() for source_id in self.source_ids):
            raise ValueError("score contribution source IDs must be nonblank")
        if len(self.source_ids) != len(set(self.source_ids)):
            raise ValueError("score contribution source IDs must be unique")
        if self.value_kind == ValueKind.UNAVAILABLE:
            if self.raw_value is not None or self.points is not None:
                raise ValueError("unavailable score contribution requires null raw value and points")
        elif self.raw_value is None or self.points is None:
            raise ValueError("available score contribution requires raw value and points")
        if self.points is not None and self.points > self.max_points:
            raise ValueError("score contribution points cannot exceed maximum points")
        return self


class LensScores(ContractModel):
    infrastructure_demand: Score = Field(default=None, ge=0, le=100)
    site_attractiveness: Score = Field(default=None, ge=0, le=100)
    system_risk: Score = Field(default=None, ge=0, le=100)
    power_balance: Score = Field(default=None, ge=0, le=100)


class RegionProperties(ContractModel):
    id: str
    name: str
    country: str = Field(min_length=2, max_length=2)
    score_year: int = Field(ge=2026, le=2031)
    scores: LensScores
    confidence: float = Field(ge=0, le=100)
    coverage: float = Field(ge=0, le=100)
    value_kind: ValueKind
    updated_at: AwareDatetime
    contributions: list[ScoreContribution] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    population: int | None = Field(default=None, ge=0)


class GeographyProperties(ContractModel):
    id: str
    name: str
    country: str = Field(min_length=2, max_length=2)
    level: GeographyLevel
    parent_id: str | None = None
    score_year: int = Field(ge=2026, le=2031)
    scores: LensScores
    confidence: float = Field(ge=0, le=100)
    coverage: float = Field(ge=0, le=100)
    value_kind: ValueKind
    updated_at: AwareDatetime
    contributions: list[ScoreContribution] = Field(default_factory=list)
    source_ids: list[str] = Field(default_factory=list)
    population: int | None = Field(default=None, ge=0)

    @computed_field
    @property
    def peer_level(self) -> str:
        return self.level


class AssetProperties(ContractModel):
    id: str
    name: str
    geography_id: str
    category: AssetCategory
    subtype: AssetSubtype | None = None
    lifecycle: LifecycleState
    demand_mw: DemandRange | None = None
    annual_demand_gwh: DemandRange | None = None
    reported_capacity: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    reported_capacity_unit: str | None = None
    grid_connection_type: GridConnectionType | None = None
    grid_demand_contribution: bool = False
    technology_detail: str | None = None
    raw_status: str | None = None
    source_record_ids: list[str] = Field(default_factory=list)
    project_url: HttpUrl | None = None
    demand_method_id: str | None = None
    technology: GenerationTechnology | None = None
    secondary_fuel: str | None = None
    capacity_mw: MetricRange | None = None
    dependable_capacity_mw: MetricRange | None = None
    annual_generation_gwh: MetricRange | None = None
    commissioning_year: int | None = Field(default=None, gt=0)
    retirement_year: int | None = Field(default=None, gt=0)
    plant_id: str | None = None
    unit_id: str | None = None
    target_year: int | None = Field(default=None, ge=2026, le=2031)
    location_precision: LocationPrecision
    value_kind: ValueKind
    source_ids: list[str] = Field(default_factory=list)
    operator: str | None = None
    source_type: SourceType = SourceType.OFFICIAL_VERIFIED
    source_url: HttpUrl | None = None
    external_ids: dict[str, str] = Field(default_factory=dict)
    last_observed_at: AwareDatetime | None = None

    @model_validator(mode="after")
    def generation_and_demand_are_valid(self) -> "AssetProperties":
        if (self.demand_mw is not None or self.annual_demand_gwh is not None) and not self.source_ids:
            raise ValueError("demand-contributing assets require at least one source")
        if any(not value.strip() for value in self.source_record_ids):
            raise ValueError("source record IDs must be nonblank")
        if len(self.source_record_ids) != len(set(self.source_record_ids)):
            raise ValueError("source record IDs must be unique")
        if self.reported_capacity is not None and not (self.reported_capacity_unit or "").strip():
            raise ValueError("reported capacity requires a unit")
        if self.demand_method_id is not None and not self.demand_method_id.strip():
            raise ValueError("demand method ID must be nonblank")
        generation_ranges = (
            self.capacity_mw,
            self.dependable_capacity_mw,
            self.annual_generation_gwh,
        )
        generation_fields = (
            self.technology,
            self.secondary_fuel,
            *generation_ranges,
            self.commissioning_year,
            self.retirement_year,
            self.plant_id,
            self.unit_id,
        )
        if self.category != AssetCategory.POWER_GENERATION:
            if self.subtype is None:
                raise ValueError("non-generation assets require a subtype")
            if self.category == AssetCategory.DATA_CENTRE and self.subtype not in DATA_CENTRE_SUBTYPES:
                raise ValueError("data-centre assets require a data-centre subtype")
            if (
                self.category == AssetCategory.WATER_INFRASTRUCTURE
                and self.subtype not in WATER_INFRASTRUCTURE_SUBTYPES
            ):
                raise ValueError("water-infrastructure assets require a water-infrastructure subtype")
            if (
                self.category == AssetCategory.INDUSTRIAL_LOAD
                and self.subtype not in INDUSTRIAL_LOAD_SUBTYPES
            ):
                raise ValueError("industrial-load assets require an industrial subtype")
            if (
                self.category == AssetCategory.HYDROGEN_INFRASTRUCTURE
                and self.subtype not in HYDROGEN_INFRASTRUCTURE_SUBTYPES
            ):
                raise ValueError("hydrogen-infrastructure assets require a network subtype")
            if any(value is not None for value in generation_fields):
                raise ValueError("non-generation assets cannot contain generation-only fields")
            if self.category == AssetCategory.HYDROGEN_INFRASTRUCTURE and (
                self.demand_mw is not None
                or self.annual_demand_gwh is not None
                or self.grid_demand_contribution
            ):
                raise ValueError("hydrogen infrastructure cannot contribute electricity demand")
            if self.annual_demand_gwh is not None:
                if self.category != AssetCategory.INDUSTRIAL_LOAD:
                    raise ValueError("annual industrial demand is only valid for industrial loads")
                if not self.grid_demand_contribution or not self.demand_method_id:
                    raise ValueError("annual industrial demand requires a grid contribution and demand method")
            return self
        if self.subtype is not None:
            raise ValueError("power-generation assets cannot contain an infrastructure subtype")
        if self.technology is None:
            raise ValueError("power-generation assets require a technology")
        if any(metric is not None and metric.low < 0 for metric in generation_ranges):
            raise ValueError("generation capacity and output cannot be negative")
        if (
            any(metric is not None for metric in generation_ranges)
            and self.value_kind in (ValueKind.REPORTED, ValueKind.ESTIMATED)
            and (not self.source_ids or any(not source_id.strip() for source_id in self.source_ids))
        ):
            raise ValueError("reported or estimated generation metrics require nonblank source IDs")
        if (
            self.commissioning_year is not None
            and self.retirement_year is not None
            and self.retirement_year < self.commissioning_year
        ):
            raise ValueError("retirement year cannot precede commissioning year")
        return self


class ProjectProperties(ContractModel):
    id: str
    name: str
    region_id: str
    lifecycle: LifecycleState
    capacity_mw: float | None = Field(default=None, ge=0)
    target_year: int | None = Field(default=None, ge=2026, le=2031)
    value_kind: ValueKind
    source_ids: list[str] = Field(default_factory=list)


class EvidenceClaim(ContractModel):
    id: str
    entity_id: str
    summary: str
    source_id: str
    value_kind: ValueKind
    observed_at: AwareDatetime


class ConnectorStatus(ContractModel):
    id: str
    state: ConnectorState
    checked_at: AwareDatetime
    last_success_at: AwareDatetime | None = None
    message: str | None = None


class ArtifactPaths(ContractModel):
    regions: str
    projects: str
    evidence: str


class SnapshotManifest(ContractModel):
    snapshot_id: str
    generated_at: AwareDatetime
    model_version: str
    active_years: list[int] = Field(min_length=6, max_length=6)
    artifacts: ArtifactPaths
    connectors: list[ConnectorStatus]

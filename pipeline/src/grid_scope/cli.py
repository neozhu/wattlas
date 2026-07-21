from __future__ import annotations

import argparse
from datetime import UTC, date, datetime
from hashlib import sha256
import json
import math
import os
from pathlib import Path
import re
from typing import Any, Callable, Iterable, Mapping
import unicodedata

import httpx

from grid_scope.config import (
    CURATED_PATH,
    BRAZIL_EPE_CONSUMPTION_PATH,
    AFRICA_GRID_PATH,
    EMBER_YEARLY_PATH,
    ENTSOE_AREAS_PATH,
    GLOBAL_ADMIN1_PATH,
    CITIES_PATH,
    GRID_INTELLIGENCE_PATH,
    COOLING_EVIDENCE_PATH,
    GLOBAL_ASSETS_PATH,
    MODEL_VERSION,
    PUBLISH_DIR,
    QUARANTINE_DIR,
    QUARANTINE_WAREHOUSE_PATH,
    QLEVER_OSM_URL,
    RAW_DIR,
    SOURCE_REGISTRY_PATH,
    SOURCE_CATALOG_PATH,
    UN_GEODATA_URL,
    WAREHOUSE_PATH,
)
from grid_scope.canonicalize import assign_asset_country, canonicalize_assets
from grid_scope.coverage_report import build_source_coverage_summary
from grid_scope.connectors.base import ConnectorResult, FetchPayload
from grid_scope.connectors.africa_grid import load_africa_grid
from grid_scope.connectors.brazil import AneelSigaConnector, load_epe_annual_observations
from grid_scope.connectors.curated import CuratedConnector
from grid_scope.connectors.entsoe import EntsoeConnector, load_entsoe_areas
from grid_scope.connectors.ember import normalize_ember_yearly_csv
from grid_scope.connectors.eia import (
    EiaV2Connector,
    build_eia_route_query,
    normalize_eia_state,
)
from grid_scope.connectors.eurostat import EurostatConnector, parse_population
from grid_scope.connectors.gisco import GiscoConnector
from grid_scope.connectors.global_assets import load_asset_registry
from grid_scope.connectors.gem_power import GemPowerConnector
from grid_scope.connectors.osm_infrastructure import OSM_SOURCE_ID, OsmInfrastructureConnector
from grid_scope.connectors.osm_power import (
    OSM_POWER_LICENCE,
    OSM_POWER_SOURCE_ID,
    OsmPowerConnector,
)
from grid_scope.connectors.regional_electricity import (
    load_curated_regional_observations,
    merge_regional_observations,
)
from grid_scope.connectors.un_geodata import UnGeodataConnector
from grid_scope.connectors.wri_power import WriPowerConnector
from grid_scope.models import ConnectorState, SourceRef
from grid_scope.manual_import import GovernedCaptureStores, import_source_snapshot
from grid_scope.industrial_demand import (
    GEM_CEMENT_SOURCE_ID,
    GEM_IRON_UNIT_SOURCE_ID,
    GEM_STEEL_PLANT_SOURCE_ID,
    GEM_STEEL_UNIT_SOURCE_ID,
    HYDROGEN_INFRASTRUCTURE_SOURCE_ID,
    HYDROGEN_PRODUCTION_SOURCE_ID,
    load_industrial_assets_from_paths,
    load_industrial_demand_assumptions,
    merge_industrial_assets,
)
from grid_scope.population import load_population_artifact
from grid_scope.power_balance import (
    build_regional_energy_forecasts,
    calculate_power_balance,
    derive_observed_capacity_factors,
    load_generation_assumptions,
)
from grid_scope.power_plants import canonicalize_power_plants
from grid_scope.regional_demand import (
    FORECAST_INCREMENT_METHOD_ID,
    allocate_country_demand,
    load_regional_demand_methods,
    validate_regional_demand_weights_artifact,
)
from grid_scope.scoring import score_power_balance
from grid_scope.publisher import SnapshotPublisher
from grid_scope.snapshot_builder import build_global_snapshot_artifacts, build_snapshot_artifacts
from grid_scope.storage import RawCaptureStore
from grid_scope.source_catalog import load_source_catalog


POWER_SOURCE_PRECEDENCE = (
    "official_power",
    "brazil-aneel-siga",
    "gem_power",
    "wri_power",
    "osm_power",
)
INDUSTRIAL_SOURCE_IDS = (
    HYDROGEN_PRODUCTION_SOURCE_ID,
    HYDROGEN_INFRASTRUCTURE_SOURCE_ID,
    GEM_CEMENT_SOURCE_ID,
    GEM_STEEL_PLANT_SOURCE_ID,
    GEM_STEEL_UNIT_SOURCE_ID,
    GEM_IRON_UNIT_SOURCE_ID,
)
PRESERVED_SOURCE_RECORD_IDS = INDUSTRIAL_SOURCE_IDS
PRESERVED_POWER_FACILITY_SOURCE_IDS = ("brazil-aneel-siga",)
REFRESH_STEPS = (
    "boundaries",
    "population",
    "plant_sources",
    "plant_canonicalization",
    "country_electricity_controls",
    "official_adm1_observations",
    "modelled_adm1_residual_demand",
    "supply_balance_forecast",
    "scores",
    "artifacts",
    "validation",
    "atomic_publish",
)
_FINGERPRINT_PATTERN = re.compile(r"^sha256:[0-9a-f]{64}$")
_QUALITY_COUNT_FIELDS = (
    "countries",
    "admin1Regions",
    "canonicalPowerPlants",
    "canonicalPowerUnits",
    "generatorRegions",
    "regionalEnergyRegions",
    "powerSourceRecords",
    "publishedPowerPlants",
)
_QUALITY_NONNEGATIVE_COUNT_FIELDS = ("canonicalPowerUnits",)
_QUALITY_REQUIRED_POSITIVE_COUNT_FIELDS = tuple(
    field for field in _QUALITY_COUNT_FIELDS
    if field not in _QUALITY_NONNEGATIVE_COUNT_FIELDS
)
_OPTIONAL_PRESERVED_COUNT_FIELDS = (
    "industrialLoads",
    "hydrogenInfrastructure",
    "forecastIndustrialLoads",
)

_US_STATE_CODES = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR",
    "California": "CA", "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE",
    "District of Columbia": "DC", "Florida": "FL", "Georgia": "GA", "Hawaii": "HI",
    "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA", "Kansas": "KS",
    "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS",
    "Missouri": "MO", "Montana": "MT", "Nebraska": "NE", "Nevada": "NV",
    "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY",
    "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH", "Oklahoma": "OK",
    "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI",
    "South Carolina": "SC", "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX",
    "Utah": "UT", "Vermont": "VT", "Virginia": "VA", "Washington": "WA",
    "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
}

_BRAZIL_STATE_CODES = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM",
    "bahia": "BA", "ceara": "CE", "distrito federal": "DF",
    "espirito santo": "ES", "goias": "GO", "maranhao": "MA",
    "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG",
    "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE",
    "piaui": "PI", "rio de janeiro": "RJ", "rio de jeneiro": "RJ",
    "rio grande do norte": "RN", "rio granda do norte": "RN",
    "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR",
    "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE",
    "tocantins": "TO",
}


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text())


def _validated_fingerprint(value: object, *, label: str) -> str:
    if value == "sha256:unbuilt":
        raise ValueError(f"{label} is unbuilt")
    if not isinstance(value, str) or _FINGERPRINT_PATTERN.fullmatch(value) is None:
        raise ValueError(f"{label} must be a versioned SHA-256 fingerprint")
    return value


def _content_fingerprint(value: object) -> str:
    canonical = json.dumps(
        value, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode()
    return f"sha256:{sha256(canonical).hexdigest()}"


def load_refresh_model_artifacts(
    population_path: Path,
    demand_weights_path: Path,
    *,
    validate_population: bool = True,
) -> dict[str, dict[str, Any]]:
    """Load compact, versioned model inputs; monthly refresh never opens a raster."""

    population = (
        load_population_artifact(population_path)
        if validate_population
        else _read_json(population_path)
    )
    weights = _read_json(demand_weights_path)
    if population.get("schemaVersion") != "wattlas-admin1-population-v1":
        raise ValueError("unsupported ADM1 population artifact")
    if weights.get("schemaVersion") != "wattlas-regional-demand-weights-v1":
        raise ValueError("unsupported regional demand weights artifact")
    _validated_fingerprint(population.get("buildFingerprint"), label="population artifact")
    _validated_fingerprint(weights.get("buildFingerprint"), label="demand weights artifact")
    _validated_fingerprint(
        weights.get("effectiveInputFingerprint"), label="demand weights effective inputs"
    )
    weight_inputs = weights.get("buildInputs")
    if not isinstance(weight_inputs, Mapping):
        raise ValueError("regional demand weights require versioned build inputs")
    if weights["effectiveInputFingerprint"] != _content_fingerprint(weight_inputs):
        raise ValueError("regional demand weights effective-input fingerprint integrity failed")
    weight_seal_payload = dict(weights)
    stored_weight_seal = weight_seal_payload.pop("buildFingerprint")
    if stored_weight_seal != _content_fingerprint(weight_seal_payload):
        raise ValueError("regional demand weights build fingerprint integrity failed")
    if weights.get("countryLevelOnly"):
        validate_regional_demand_weights_artifact(weights)
    population_fingerprint = _validated_fingerprint(
        weight_inputs.get("populationFingerprint"),
        label="demand weights population release",
    )
    if population_fingerprint != population.get("buildFingerprint"):
        raise ValueError("demand weights do not match the population release")
    records = weights.get("records")
    population_records = population.get("records")
    if not isinstance(population_records, list) or not population_records:
        raise ValueError("ADM1 population artifact requires non-empty records")
    if not isinstance(records, list) or not records:
        raise ValueError("regional demand weights require non-empty records")
    population_keys = {
        (str(row.get("geographyId") or "").strip(), row.get("year"))
        for row in population_records if isinstance(row, Mapping)
    }
    weight_keys = {
        (str(row.get("geographyId") or "").strip(), row.get("year"))
        for row in records if isinstance(row, Mapping)
    }
    if not weight_keys or not weight_keys.issubset(population_keys):
        raise ValueError("regional demand weights are not linked to population records")
    return {"population": population, "demandWeights": weights}


def _source_observation_date(
    body: bytes | None, *, allow_update_dates: bool = True
) -> str | None:
    if not body:
        return None
    try:
        payload = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    observation_candidates: list[str] = []
    update_candidates: list[str] = []

    def visit(value: object) -> None:
        if isinstance(value, Mapping):
            for key in ("observationDate", "updatedAt", "updated_at"):
                candidate = value.get(key)
                if isinstance(candidate, str) and candidate.strip():
                    raw = candidate.strip()
                    try:
                        parsed = date.fromisoformat(raw) if len(raw) == 10 else datetime.fromisoformat(
                            raw.replace("Z", "+00:00")
                        ).date()
                    except ValueError:
                        continue
                    target = observation_candidates if key == "observationDate" else update_candidates
                    target.append(parsed.isoformat())
            for nested in value.values():
                visit(nested)
        elif isinstance(value, list):
            for nested in value:
                visit(nested)

    visit(payload)
    candidates = observation_candidates or (update_candidates if allow_update_dates else [])
    return max(candidates) if candidates else None


def run_refresh_stage_sequence(
    callbacks: Mapping[str, Callable[[], None]],
) -> None:
    """Execute real refresh boundaries in the single approved dependency order."""

    missing = [step for step in REFRESH_STEPS if step not in callbacks]
    extras = sorted(set(callbacks) - set(REFRESH_STEPS))
    if missing or extras:
        raise ValueError(
            f"refresh stage callbacks mismatch; missing={missing}, extras={extras}"
        )
    for step in REFRESH_STEPS:
        callbacks[step]()


def _local_records_with_lkg(
    build_current: Callable[[], list[dict[str, Any]]],
    *,
    source_id: str,
    store: RawCaptureStore,
    now: datetime,
    configured: bool,
) -> tuple[list[dict[str, Any]], ConnectorResult]:
    """Persist normalized records and fall back only to this source's last good build."""

    def cached_records() -> list[dict[str, Any]] | None:
        previous = store.latest_capture(source_id)
        if previous is None:
            return None
        payload = json.loads(previous.path.read_bytes())
        rows = payload.get("records") if isinstance(payload, Mapping) else None
        if not isinstance(rows, list) or not rows or any(not isinstance(row, dict) for row in rows):
            raise ValueError(f"invalid cached {source_id} normalized release")
        return rows

    if not configured:
        previous_rows = cached_records()
        if previous_rows is None:
            return [], ConnectorResult(
                source_id=source_id, state=ConnectorState.NOT_CONFIGURED,
                payload=None, message=f"Optional {source_id} source is not configured.",
            )
        return previous_rows, ConnectorResult(
            source_id=source_id, state=ConnectorState.CACHED, payload=None,
            message="Using source-specific last successful normalized release.",
        )
    try:
        records = build_current()
        if not isinstance(records, list) or not records or any(not isinstance(row, dict) for row in records):
            raise ValueError(f"{source_id} normalization requires a non-empty records list")
        body = json.dumps({"records": records}, sort_keys=True, separators=(",", ":")).encode()
        store.save(source_id, body, "application/json")
        return records, ConnectorResult(
            source_id=source_id, state=ConnectorState.CURRENT,
            payload=FetchPayload(source_id, now, "application/json", body),
        )
    except Exception as error:
        previous_rows = cached_records()
        if previous_rows is None:
            raise
        return previous_rows, ConnectorResult(
            source_id=source_id, state=ConnectorState.CACHED, payload=None,
            message=f"Using source-specific last successful release: {error}",
        )


def _generator_artifacts_reconcile(
    artifacts: Mapping[str, bytes], *, expected_plants: int
) -> bool:
    """Reconcile published generator index, shards, and ADM1 overview from bytes."""

    try:
        index = json.loads(artifacts["generators/index.json"])
        overview = json.loads(artifacts["generator-overview.geojson"])
        countries = index["countries"]
        total = index["totals"]["featureCount"]
        if isinstance(total, bool) or total != expected_plants:
            return False
        shard_total = 0
        by_region: dict[str, int] = {}
        for entry in countries.values():
            shard = json.loads(artifacts[entry["path"]])
            features = shard.get("features")
            if not isinstance(features, list) or entry.get("featureCount") != len(features):
                return False
            shard_total += len(features)
            for feature in features:
                region_id = str((feature.get("properties") or {}).get("geographyId") or "")
                by_region[region_id] = by_region.get(region_id, 0) + 1
        overview_counts = {
            str((feature.get("properties") or {}).get("geographyId") or ""):
            (feature.get("properties") or {}).get("count")
            for feature in overview.get("features", [])
        }
        return shard_total == expected_plants and overview_counts == by_region
    except (KeyError, TypeError, ValueError, json.JSONDecodeError):
        return False


def build_forward_demand_increments(
    registry: Mapping[str, Any], *, active_admin1: set[str]
) -> list[dict[str, Any]]:
    """Convert sourced future ADM1 data/water loads from average MW to annual GWh."""

    increments: list[dict[str, Any]] = []
    for asset in registry.get("assets", []):
        region_id = str(asset.get("geographyId") or "").strip()
        year = asset.get("targetYear")
        demand = asset.get("demandMw")
        annual_demand = asset.get("annualDemandGwh")
        category = asset.get("category")
        is_industrial = category == "industrial_load"
        if (
            region_id not in active_admin1
            or category not in {"data_centre", "water_infrastructure", "industrial_load"}
            or asset.get("lifecycle") not in {
                "announced", "planning_filed", "permitted", "pre_construction", "under_construction"
            }
            or not isinstance(year, int) or not 2026 <= year <= 2031
            or (
                not isinstance(annual_demand, Mapping)
                if is_industrial
                else not isinstance(demand, Mapping)
            )
            or (is_industrial and not asset.get("gridDemandContribution"))
        ):
            continue
        source_ids = sorted({str(value).strip() for value in asset.get("sourceIds", []) if str(value).strip()})
        if not source_ids:
            continue
        increment_id = str(asset.get("id") or "").strip()
        if not increment_id:
            raise ValueError("forward demand asset requires an ID")
        increment = {
            "incrementId": f"{increment_id}:{year}",
            "geographyId": region_id,
            "targetYear": year,
            "demandGwh": {
                part: round(
                    float(annual_demand[part])
                    if is_industrial
                    else float(demand[part]) * 8.76,
                    6,
                )
                for part in ("low", "central", "high")
            },
            "sourceIds": source_ids,
        }
        if is_industrial:
            method_id = str(asset.get("demandMethodId") or "").strip()
            if not method_id:
                continue
            increment["methodId"] = method_id
            increment["sector"] = str(asset.get("subtype") or "industrial_load")
        increments.append(increment)
    return sorted(increments, key=lambda row: row["incrementId"])


def _eia_state_mapping(admin1_payload: Mapping[str, Any]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for feature in admin1_payload.get("features", []):
        properties = feature.get("properties") or {}
        if properties.get("country") != "US":
            continue
        code = _US_STATE_CODES.get(str(properties.get("name") or "").strip())
        region_id = str(properties.get("id") or feature.get("id") or "").strip()
        if code and region_id:
            mapping[code] = region_id
    return dict(sorted(mapping.items()))


def _brazil_state_mapping(
    admin1_payload: Mapping[str, Any], *, require_complete: bool = True
) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for feature in admin1_payload.get("features", []):
        properties = feature.get("properties") or {}
        if properties.get("country") != "BR":
            continue
        name = "".join(
            character
            for character in unicodedata.normalize(
                "NFKD", str(properties.get("name") or "")
            )
            if not unicodedata.combining(character)
        ).casefold().strip()
        code = _BRAZIL_STATE_CODES.get(name)
        region_id = str(properties.get("id") or feature.get("id") or "").strip()
        if code and region_id:
            mapping[code] = region_id
    if require_complete:
        missing = sorted(set(_BRAZIL_STATE_CODES.values()) - set(mapping))
        if missing:
            raise ValueError(f"Brazil ADM1 mapping is incomplete: {', '.join(missing)}")
    return dict(sorted(mapping.items()))


def _fetch_eia_observations(
    client: httpx.Client,
    *,
    now: datetime,
    store: RawCaptureStore,
    admin1_payload: Mapping[str, Any],
) -> tuple[list[dict[str, Any]], ConnectorResult]:
    """Fetch and merge the public EIA annual state routes when configured."""

    base_url = os.getenv("EIA_API_V2_URL") or None
    api_key = os.getenv("EIA_API_KEY") or None
    state_mapping = _eia_state_mapping(admin1_payload)
    configured = bool(base_url and state_mapping)

    def build() -> list[dict[str, Any]]:
        connector = EiaV2Connector(base_url=base_url, api_key=api_key)
        rows: list[dict[str, Any]] = []
        for route_id in ("sales", "generation", "capability"):
            query = build_eia_route_query(route_id, state_codes=state_mapping)
            query.update({"start": "2021", "end": str(now.year)})
            result = connector.fetch(
                route_id=route_id, params=query, now=now, client=client
            )
            if result.state != ConnectorState.CURRENT or result.payload is None:
                raise RuntimeError(result.message or f"EIA {route_id} fetch failed")
            payload = json.loads(result.payload.body)
            rows.extend(normalize_eia_state(
                payload,
                route_id=route_id,
                state_mapping=state_mapping,
                active_geography_ids=set(state_mapping.values()),
                retrieved_at=now.date().isoformat(),
            ))
        return merge_regional_observations(rows)

    return _local_records_with_lkg(
        build,
        source_id="eia_state_observations",
        store=store,
        now=now,
        configured=configured,
    )


def _official_observed_capacity_factors(
    observations: Iterable[Mapping[str, Any]],
    plants: Iterable[Mapping[str, Any]],
) -> dict[str, dict[str, Any]]:
    capacities: dict[tuple[str, str], dict[str, Any]] = {}
    for plant in plants:
        if plant.get("lifecycle") != "operational" or plant.get("capacityMw") is None:
            continue
        region_id = str(plant.get("geographyId") or "").strip()
        technology = str(plant.get("technology") or "").strip()
        raw_capacity = plant["capacityMw"]
        capacity = (
            float(raw_capacity.get("central"))
            if isinstance(raw_capacity, Mapping) else float(raw_capacity)
        )
        capacity_row = capacities.setdefault(
            (region_id, technology), {"capacityMw": 0.0, "sourceIds": set()}
        )
        capacity_row["capacityMw"] += capacity
        capacity_row["sourceIds"].update(plant.get("sourceIds") or [])
    grouped: dict[tuple[str, str, int], dict[str, Any]] = {}
    for observation in observations:
        mix = observation.get("generationMixGwh")
        if not isinstance(mix, Mapping):
            continue
        for technology, generation in mix.items():
            capacity_row = capacities.get(
                (str(observation.get("geographyId") or ""), str(technology))
            )
            if capacity_row is None:
                continue
            capacity = float(capacity_row["capacityMw"])
            if not capacity or float(generation) < 0 or float(generation) > capacity * 8.76:
                continue
            key = (
                str(observation.get("countryIso3") or "").upper(),
                str(technology), int(observation.get("year")),
            )
            row = grouped.setdefault(key, {
                "countryIso3": key[0], "technology": key[1], "year": key[2],
                "annualGenerationGwh": 0.0, "capacityMw": 0.0, "sourceIds": set(),
            })
            row["annualGenerationGwh"] += float(generation)
            row["capacityMw"] += capacity
            row["sourceIds"].update(capacity_row["sourceIds"])
            row["sourceIds"].update(
                _field_lineage(
                    observation, f"generationMixGwh.{technology}"
                )["sourceIds"]
            )
    inputs = [
        {**row, "sourceIds": sorted(row["sourceIds"])} for row in grouped.values()
    ]
    return derive_observed_capacity_factors(inputs) if inputs else {}


def build_connector_status(
    result: ConnectorResult,
    *,
    checked_at: str,
    observation_body: bytes | None = None,
    last_success_at: str | None = None,
) -> dict[str, object]:
    body = observation_body
    if body is None and result.payload is not None:
        body = result.payload.body
    return {
        "id": result.source_id,
        "state": result.state.value,
        "publicationState": result.publication_state.value,
        # A refresh records today's check. It never rewrites observation dates.
        "checkedAt": checked_at,
        "lastSuccessAt": (
            checked_at if result.state == ConnectorState.CURRENT else last_success_at
        ),
        "observationDate": _source_observation_date(
            body,
            allow_update_dates=result.source_id not in {"wri_power", "osm_power"},
        ),
        "message": result.message,
    }


def validate_refresh_quality(
    current_manifest: Mapping[str, Any],
    previous_manifest: Mapping[str, Any] | None = None,
) -> None:
    coverage = current_manifest.get("coverage")
    if not isinstance(coverage, Mapping):
        raise ValueError("refresh coverage report is missing")
    quality = current_manifest.get("quality")
    if not isinstance(quality, Mapping):
        raise ValueError("refresh quality report is missing")
    if not quality.get("countryDemandReconciled") or not quality.get(
        "generatorArtifactsReconciled"
    ):
        raise ValueError("refresh reconciliation failed")
    for field in _QUALITY_REQUIRED_POSITIVE_COUNT_FIELDS:
        value = coverage.get(field)
        if isinstance(value, bool) or not isinstance(value, int) or value <= 0:
            raise ValueError(f"invalid refresh coverage count: {field}")
    for field in _QUALITY_NONNEGATIVE_COUNT_FIELDS:
        value = coverage.get(field)
        if isinstance(value, bool) or not isinstance(value, int) or value < 0:
            raise ValueError(f"invalid refresh coverage count: {field}")
    if previous_manifest is None:
        return
    previous = previous_manifest.get("coverage")
    if not isinstance(previous, Mapping):
        return
    for field in (*_QUALITY_COUNT_FIELDS, *_OPTIONAL_PRESERVED_COUNT_FIELDS):
        old = previous.get(field)
        new = coverage.get(field)
        if (
            isinstance(old, int) and not isinstance(old, bool) and old > 0
            and isinstance(new, int) and not isinstance(new, bool) and new < old
        ):
            raise ValueError(f"coverage drop for {field}: {new} < {old}")
    previous_power_facilities = previous.get("publishedPowerPlantsBySource")
    current_power_facilities = coverage.get("publishedPowerPlantsBySource")
    if isinstance(previous_power_facilities, Mapping):
        if not isinstance(current_power_facilities, Mapping):
            raise ValueError("published power facility coverage report is missing")
        for source_id in PRESERVED_POWER_FACILITY_SOURCE_IDS:
            old = previous_power_facilities.get(source_id)
            new = current_power_facilities.get(source_id)
            if (
                isinstance(old, int) and not isinstance(old, bool) and old > 0
                and (not isinstance(new, int) or isinstance(new, bool) or new < old)
            ):
                raise ValueError(
                    f"published facility coverage drop for {source_id}: {new} < {old}"
                )
    previous_source_coverage = previous_manifest.get("sourceCoverage")
    current_source_coverage = current_manifest.get("sourceCoverage")
    if not isinstance(previous_source_coverage, Mapping):
        return
    if not isinstance(current_source_coverage, Mapping):
        raise ValueError("refresh source coverage report is missing")
    previous_records = previous_source_coverage.get("publishedRecordsBySource")
    current_records = current_source_coverage.get("publishedRecordsBySource")
    if not isinstance(previous_records, Mapping):
        return
    if not isinstance(current_records, Mapping):
        raise ValueError("refresh source-specific coverage report is missing")
    for source_id in PRESERVED_SOURCE_RECORD_IDS:
        old = previous_records.get(source_id)
        new = current_records.get(source_id)
        if (
            isinstance(old, int) and not isinstance(old, bool) and old > 0
            and (not isinstance(new, int) or isinstance(new, bool) or new < old)
        ):
            raise ValueError(f"source coverage drop for {source_id}: {new} < {old}")


def _validate_connector_identity(
    result: ConnectorResult, requested_source_id: str
) -> None:
    if result.source_id != requested_source_id:
        raise ValueError(
            f"connector result source ID {result.source_id!r} does not match "
            f"requested source ID {requested_source_id!r}"
        )
    if result.payload is not None and result.payload.source_id != requested_source_id:
        raise ValueError(
            f"connector payload source ID {result.payload.source_id!r} does not match "
            f"requested source ID {requested_source_id!r}"
        )


def _network_result(
    fetch: Callable[[], ConnectorResult],
    source_id: str,
    store: RawCaptureStore,
) -> tuple[bytes, ConnectorResult]:
    try:
        result = fetch()
        _validate_connector_identity(result, source_id)
        if result.payload:
            capture = store.save(
                result.source_id,
                result.payload.body,
                result.payload.media_type,
            )
            return capture.path.read_bytes(), result
        raise RuntimeError(result.message or f"{source_id} returned no payload")
    except Exception as error:
        previous = store.latest_capture(source_id)
        if previous:
            return previous.path.read_bytes(), ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=f"Using last successful capture: {error}",
            )
        raise


def _osm_infrastructure_result(
    fetch: Callable[[], ConnectorResult],
    store: RawCaptureStore,
    *,
    publish_dir: Path,
) -> tuple[bytes, ConnectorResult]:
    """Fall back to the governed published OSM assets when QLever blocks CI."""

    try:
        return _network_result(fetch, "osm_infrastructure", store)
    except Exception as network_error:
        try:
            latest = _read_json(publish_dir / "latest.json")
            snapshot_id = str(latest.get("snapshotId") or "")
            if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", snapshot_id):
                raise ValueError("published snapshot has an unsafe ID")
            artifact_path = ((latest.get("artifacts") or {}).get("assets"))
            expected = f"snapshots/{snapshot_id}/assets.geojson"
            if artifact_path != expected:
                raise ValueError("published snapshot has an unexpected assets path")
            collection = _read_json(publish_dir / expected)
            assets: list[dict[str, Any]] = []
            for feature in collection.get("features", []):
                properties = feature.get("properties") or {}
                source_ids = properties.get("sourceIds") or []
                if (
                    properties.get("sourceType") != "community_mapped"
                    or OSM_SOURCE_ID not in source_ids
                ):
                    continue
                geometry = feature.get("geometry") or {}
                coordinates = geometry.get("coordinates")
                if geometry.get("type") != "Point" or not isinstance(coordinates, list):
                    continue
                assets.append({**properties, "coordinates": coordinates})
            if not assets:
                raise ValueError("published snapshot contains no governed OSM assets")
            body = json.dumps(
                {
                    "source": OSM_SOURCE_ID,
                    "fallbackSnapshotId": snapshot_id,
                    "assets": sorted(assets, key=lambda asset: str(asset.get("id"))),
                },
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode()
            return body, ConnectorResult(
                source_id="osm_infrastructure",
                state=ConnectorState.CACHED,
                payload=None,
                message=(
                    "QLever was unavailable; reused governed OpenStreetMap "
                    f"facilities from snapshot {snapshot_id}."
                ),
            )
        except Exception as fallback_error:
            raise RuntimeError(
                "QLever failed and no governed published OSM fallback was available: "
                f"{fallback_error}"
            ) from network_error


def _published_industrial_assets(
    publish_dir: Path,
    *,
    source_ids: set[str],
) -> tuple[list[dict[str, Any]], dict[str, str]]:
    """Read governed industrial assets from the last atomically published snapshot.

    Manual releases are intentionally absent from a clean CI checkout. Reusing their
    already-published normalized records preserves coverage without bypassing source
    governance or reaching outside the declared snapshot artifact.
    """

    if not source_ids:
        return [], {}
    latest = _read_json(publish_dir / "latest.json")
    latest_snapshot_id = str(latest.get("snapshotId") or "")
    unresolved_source_ids = set(source_ids)
    recovered_snapshot_ids: dict[str, str] = {}
    recovered_assets: dict[str, dict[str, Any]] = {}

    def from_manifest(
        manifest: Mapping[str, Any], *, expected_snapshot_id: str | None = None
    ) -> tuple[list[dict[str, Any]], str]:
        snapshot_id = str(manifest.get("snapshotId") or "")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", snapshot_id):
            raise ValueError("published snapshot has an unsafe ID")
        if expected_snapshot_id is not None and snapshot_id != expected_snapshot_id:
            raise ValueError("published snapshot manifest ID does not match its directory")
        artifact_path = ((manifest.get("artifacts") or {}).get("assets"))
        expected = f"snapshots/{snapshot_id}/assets.geojson"
        if artifact_path != expected:
            raise ValueError("published snapshot has an unexpected assets path")
        collection = _read_json(publish_dir / expected)
        if collection.get("type") != "FeatureCollection":
            raise ValueError("published industrial fallback is not a FeatureCollection")
        assets: list[dict[str, Any]] = []
        for feature in collection.get("features", []):
            if not isinstance(feature, Mapping):
                continue
            properties = feature.get("properties")
            if not isinstance(properties, Mapping) or properties.get("category") not in {
                "industrial_load", "hydrogen_infrastructure"
            }:
                continue
            asset_source_ids = properties.get("sourceIds")
            if not isinstance(asset_source_ids, list) or not source_ids.intersection(
                str(source_id) for source_id in asset_source_ids
            ):
                continue
            geometry = feature.get("geometry")
            if not isinstance(geometry, Mapping) or geometry.get("type") != "Point":
                continue
            coordinates = geometry.get("coordinates")
            if (
                not isinstance(coordinates, list)
                or len(coordinates) != 2
                or any(
                    isinstance(value, bool)
                    or not isinstance(value, (int, float))
                    or not math.isfinite(float(value))
                    for value in coordinates
                )
            ):
                continue
            identifier = str(properties.get("id") or feature.get("id") or "").strip()
            if not identifier:
                continue
            assets.append({**properties, "id": identifier, "coordinates": coordinates})
        return sorted(assets, key=lambda asset: str(asset["id"])), snapshot_id

    def recover(assets: Iterable[Mapping[str, Any]], snapshot_id: str) -> None:
        wanted_source_ids = set(unresolved_source_ids)
        recovered_in_snapshot: set[str] = set()
        for asset in assets:
            recovered_for_asset = wanted_source_ids.intersection(
                str(source_id) for source_id in (asset.get("sourceIds") or [])
            )
            if not recovered_for_asset:
                continue
            recovered_assets[str(asset["id"])] = dict(asset)
            recovered_in_snapshot.update(recovered_for_asset)
        for source_id in recovered_in_snapshot:
            recovered_snapshot_ids[source_id] = snapshot_id
        unresolved_source_ids.difference_update(recovered_in_snapshot)

    assets, snapshot_id = from_manifest(latest)
    recover(assets, snapshot_id)
    if not unresolved_source_ids:
        return [recovered_assets[key] for key in sorted(recovered_assets)], recovered_snapshot_ids
    snapshot_root = publish_dir / "snapshots"
    for candidate in sorted(snapshot_root.iterdir(), key=lambda path: path.name, reverse=True):
        if not candidate.is_dir() or candidate.name == latest_snapshot_id:
            continue
        manifest_path = candidate / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            assets, snapshot_id = from_manifest(
                _read_json(manifest_path), expected_snapshot_id=candidate.name
            )
        except (OSError, ValueError, json.JSONDecodeError):
            continue
        recover(assets, snapshot_id)
        if not unresolved_source_ids:
            break
    return [recovered_assets[key] for key in sorted(recovered_assets)], recovered_snapshot_ids


def _osm_power_result(
    fetch: Callable[[], ConnectorResult],
    store: RawCaptureStore,
    *,
    publish_dir: Path,
) -> tuple[bytes, ConnectorResult]:
    """Rehydrate prior governed OSM plants when QLever is unavailable in CI."""

    failure: Exception | None = None
    try:
        body, result = _optional_network_result(fetch, "osm_power", store)
        payload = json.loads(body)
        if (
            result.state in {ConnectorState.CURRENT, ConnectorState.CACHED}
            and isinstance(payload.get("records"), list)
            and payload["records"]
        ):
            return body, result
    except Exception as error:
        failure = error

    try:
        latest = _read_json(publish_dir / "latest.json")
        snapshot_id = str(latest.get("snapshotId") or "")
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", snapshot_id):
            raise ValueError("published snapshot has an unsafe ID")
        index_path = ((latest.get("artifacts") or {}).get("generatorIndex"))
        expected_index = f"snapshots/{snapshot_id}/generators/index.json"
        if index_path != expected_index:
            raise ValueError("published snapshot has an unexpected generator index path")
        snapshot_dir = publish_dir / "snapshots" / snapshot_id
        index = _read_json(publish_dir / expected_index)
        records: list[dict[str, Any]] = []
        lifecycle_precedence = (
            "under_construction", "announced", "operational", "paused", "cancelled"
        )
        for country, entry in sorted((index.get("countries") or {}).items()):
            expected_shard = f"generators/{country}.geojson"
            if not isinstance(entry, dict) or entry.get("path") != expected_shard:
                raise ValueError("published generator index has an unexpected shard path")
            shard = _read_json(snapshot_dir / expected_shard)
            for feature in shard.get("features", []):
                properties = feature.get("properties") or {}
                if OSM_POWER_SOURCE_ID not in (properties.get("sourceIds") or []):
                    continue
                geometry = feature.get("geometry") or {}
                coordinates = geometry.get("coordinates")
                if geometry.get("type") != "Point" or not isinstance(coordinates, list):
                    continue
                mix = properties.get("technologyMixMw") or {}
                technologies = properties.get("technologies") or list(mix)
                technology = (
                    max(
                        (str(value) for value in technologies),
                        key=lambda value: (float(mix.get(value, 0)), value),
                    )
                    if technologies else "other"
                )
                lifecycle_counts = properties.get("lifecycleCounts") or {}
                lifecycle = next(
                    (
                        value for value in lifecycle_precedence
                        if float(lifecycle_counts.get(value, 0) or 0) > 0
                    ),
                    "operational",
                )
                capacity = float(properties.get("capacityMw", 0) or 0)
                capacity_range = (
                    {"low": capacity, "central": capacity, "high": capacity}
                    if capacity > 0 else None
                )
                identifier = f"osm-power-fallback-{feature.get('id')}"
                records.append({
                    "id": identifier,
                    "name": properties.get("name") or "Mapped power plant",
                    "category": "power_generation",
                    "technology": technology,
                    "primaryFuel": technology,
                    "secondaryFuel": None,
                    "lifecycle": lifecycle,
                    "capacityMw": capacity_range,
                    "capacityValueKind": "reported" if capacity_range else "unavailable",
                    "plantId": identifier,
                    "unitId": None,
                    "externalIds": properties.get("externalIds") or {},
                    "coordinates": coordinates,
                    "country": properties.get("country") or country,
                    "geographyId": properties.get("geographyId") or country,
                    "locationPrecision": properties.get("locationPrecision") or "exact",
                    "aliases": properties.get("aliases") or [],
                    "sourceRecordIds": properties.get("recordIds") or [],
                    "sourceIds": [OSM_POWER_SOURCE_ID],
                    "sourceType": "community_mapped",
                    "sourceUrl": properties.get("sourceUrl"),
                    "licence": OSM_POWER_LICENCE,
                    "valueKind": "reported" if capacity_range else "observed",
                })
        if not records:
            raise ValueError("published snapshot contains no governed OSM power plants")
        body = json.dumps(
            {
                "source": OSM_POWER_SOURCE_ID,
                "licence": OSM_POWER_LICENCE,
                "attribution": "© OpenStreetMap contributors",
                "fallbackSnapshotId": snapshot_id,
                "records": sorted(records, key=lambda record: record["id"]),
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        return body, ConnectorResult(
            source_id="osm_power",
            state=ConnectorState.CACHED,
            payload=None,
            message=(
                "QLever was unavailable; rehydrated governed OpenStreetMap "
                f"power plants from snapshot {snapshot_id}."
            ),
        )
    except Exception as fallback_error:
        raise RuntimeError(
            "OSM power failed and no governed published fallback was available: "
            f"{fallback_error}"
        ) from failure


def _published_power_source_result(
    publish_dir: Path,
    *,
    source_id: str,
    source_type: str,
) -> tuple[bytes, ConnectorResult]:
    """Rehydrate one governed source from canonical published generator shards."""

    latest = _read_json(publish_dir / "latest.json")
    lifecycle_precedence = (
        "under_construction", "pre_construction", "announced", "operational",
        "decommissioned", "paused", "cancelled",
    )
    latest_snapshot_id = str(latest.get("snapshotId") or "")
    candidates: list[tuple[Mapping[str, Any], str | None]] = [(latest, None)]
    snapshot_root = publish_dir / "snapshots"
    for candidate in sorted(snapshot_root.iterdir(), key=lambda path: path.name, reverse=True):
        if not candidate.is_dir() or candidate.name == latest_snapshot_id:
            continue
        manifest_path = candidate / "manifest.json"
        if not manifest_path.exists():
            continue
        try:
            candidates.append((_read_json(manifest_path), candidate.name))
        except (OSError, ValueError, json.JSONDecodeError):
            continue

    records: list[dict[str, Any]] = []
    snapshot_id = latest_snapshot_id
    for candidate_index, (manifest, expected_snapshot_id) in enumerate(candidates):
        try:
            snapshot_id = str(manifest.get("snapshotId") or "")
            if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", snapshot_id):
                raise ValueError("published snapshot has an unsafe ID")
            if expected_snapshot_id is not None and snapshot_id != expected_snapshot_id:
                raise ValueError("published snapshot manifest ID does not match its directory")
            index_path = ((manifest.get("artifacts") or {}).get("generatorIndex"))
            expected_index = f"snapshots/{snapshot_id}/generators/index.json"
            if index_path != expected_index:
                raise ValueError("published snapshot has an unexpected generator index path")
            snapshot_dir = publish_dir / "snapshots" / snapshot_id
            index = _read_json(publish_dir / expected_index)
            candidate_records: list[dict[str, Any]] = []
            for country, entry in sorted((index.get("countries") or {}).items()):
                expected_shard = f"generators/{country}.geojson"
                if not isinstance(entry, dict) or entry.get("path") != expected_shard:
                    raise ValueError("published generator index has an unexpected shard path")
                shard = _read_json(snapshot_dir / expected_shard)
                for feature in shard.get("features", []):
                    properties = feature.get("properties") or {}
                    if source_id not in (properties.get("sourceIds") or []):
                        continue
                    geometry = feature.get("geometry") or {}
                    coordinates = geometry.get("coordinates")
                    if geometry.get("type") != "Point" or not isinstance(coordinates, list) or len(coordinates) != 2:
                        continue
                    mix = properties.get("technologyMixMw") or {}
                    technologies = properties.get("technologies") or list(mix)
                    technology = max(
                        (str(value) for value in technologies),
                        key=lambda value: (float(mix.get(value, 0) or 0), value),
                    ) if technologies else "other"
                    lifecycle_counts = properties.get("lifecycleCounts") or {}
                    lifecycle = next((
                        value for value in lifecycle_precedence
                        if float(lifecycle_counts.get(value, 0) or 0) > 0
                    ), "operational")
                    capacity = float(properties.get("capacityMw", 0) or 0)
                    capacity_range = {"low": capacity, "central": capacity, "high": capacity} if capacity > 0 else None
                    feature_id = str(properties.get("id") or feature.get("id") or "").strip()
                    if not feature_id:
                        continue
                    candidate_records.append({
                        "id": f"published-{source_id}-{feature_id}",
                        "name": properties.get("name") or "Published power plant",
                        "category": "power_generation", "technology": technology,
                        "primaryFuel": technology, "secondaryFuel": None,
                        "lifecycle": lifecycle, "capacityMw": capacity_range,
                        "capacityValueKind": "reported" if capacity_range else "unavailable",
                        "plantId": feature_id, "unitId": None,
                        "externalIds": properties.get("externalIds") or {},
                        "coordinates": coordinates,
                        "country": properties.get("country") or country,
                        "geographyId": properties.get("geographyId") or country,
                        "locationPrecision": properties.get("locationPrecision") or "exact",
                        "aliases": properties.get("aliases") or [],
                        "sourceRecordIds": properties.get("recordIds") or [],
                        "sourceIds": [source_id], "sourceType": source_type,
                        "sourceUrl": properties.get("sourceUrl"),
                        "valueKind": "reported" if capacity_range else "observed",
                    })
            if candidate_records:
                records = candidate_records
                break
        except (OSError, ValueError, json.JSONDecodeError):
            if candidate_index == 0:
                raise
            continue
    if not records:
        raise ValueError(
            f"published snapshot contains no governed {source_id} power plants"
        )
    body = json.dumps(
        {
            "source": source_id,
            "fallbackSnapshotId": snapshot_id,
            "records": sorted(records, key=lambda record: str(record["id"])),
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode()
    return body, ConnectorResult(
        source_id=source_id,
        state=ConnectorState.CACHED,
        payload=None,
        message=(
            f"Public endpoint was unavailable; rehydrated governed {source_id} "
            f"plants from snapshot {snapshot_id}."
        ),
    )


def _optional_network_result(
    fetch: Callable[[], ConnectorResult],
    source_id: str,
    store: RawCaptureStore,
) -> tuple[bytes, ConnectorResult]:
    """Fetch one optional public source without borrowing another source's cache."""

    try:
        result = fetch()
        _validate_connector_identity(result, source_id)
        if result.payload is not None and result.payload.body:
            capture = store.save(
                result.source_id, result.payload.body, result.payload.media_type
            )
            return capture.path.read_bytes(), result
        previous = store.latest_capture(source_id)
        if previous is not None:
            return previous.path.read_bytes(), ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=(
                    f"Using last successful capture: {result.message or 'source returned no payload'}"
                ),
            )
        if result.state == ConnectorState.NOT_CONFIGURED:
            return b'{"records":[]}', result
        raise RuntimeError(result.message or f"{source_id} returned no payload")
    except ValueError:
        # Contract violations must fail loudly; they can otherwise poison a
        # source-specific last-known-good capture under the wrong identity.
        raise
    except Exception as error:
        previous = store.latest_capture(source_id)
        if previous is not None:
            return previous.path.read_bytes(), ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=f"Using last successful capture: {error}",
            )
        return b'{"records":[]}', ConnectorResult(
            source_id=source_id,
            state=ConnectorState.FAILED,
            payload=None,
            message=f"Optional source failed without a cached capture: {error}",
        )


def _entsoe_network_result(
    fetch: Callable[[], ConnectorResult],
    store: RawCaptureStore,
    *,
    publish_dir: Path | None = None,
) -> tuple[bytes, ConnectorResult]:
    """Publish partial ENTSO-E evidence without replacing a complete capture."""

    source_id = "entsoe"

    def published_fallback() -> tuple[bytes, ConnectorResult] | None:
        if publish_dir is None:
            return None
        try:
            latest = _read_json(publish_dir / "latest.json")
            snapshot_id = str(latest.get("snapshotId") or "")
            if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", snapshot_id):
                raise ValueError("published snapshot has an unsafe ID")
            artifact_path = ((latest.get("artifacts") or {}).get("entsoeMonthly"))
            expected = f"snapshots/{snapshot_id}/entsoe-monthly.json"
            if artifact_path != expected:
                raise ValueError("published snapshot has an unexpected ENTSO-E path")
            body = (publish_dir / expected).read_bytes()
            payload = json.loads(body)
            if (
                not isinstance(payload, Mapping)
                or payload.get("source") != source_id
                or payload.get("complete") is not True
                or not isinstance(payload.get("records"), list)
                or not payload["records"]
                or _contains_credential_material(payload)
            ):
                raise ValueError("published ENTSO-E artifact is not a complete safe capture")
            return body, ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=(
                    "API credentials were unavailable during refresh; reused the "
                    f"complete public ENTSO-E artifact from snapshot {snapshot_id}."
                ),
            )
        except (OSError, ValueError, json.JSONDecodeError):
            return None

    try:
        result = fetch()
        _validate_connector_identity(result, source_id)
        previous = store.latest_capture(source_id)
        if result.payload is not None and result.payload.body:
            if result.state == ConnectorState.CURRENT:
                capture = store.save(
                    source_id, result.payload.body, result.payload.media_type
                )
                return capture.path.read_bytes(), result
            if previous is not None:
                return previous.path.read_bytes(), ConnectorResult(
                    source_id=source_id,
                    state=ConnectorState.CACHED,
                    payload=None,
                    message=(
                        "Using last complete ENTSO-E capture because the current "
                        "month is incomplete."
                    ),
                )
            return result.payload.body, result
        if previous is not None:
            return previous.path.read_bytes(), ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=(
                    "Using last complete ENTSO-E capture: "
                    f"{result.message or 'source returned no payload'}"
                ),
            )
        if result.state == ConnectorState.NOT_CONFIGURED:
            return published_fallback() or (b'{"records":[]}', result)
        fallback = published_fallback()
        if fallback is not None:
            return fallback
        return b'{"records":[]}', result
    except ValueError:
        raise
    except Exception as error:
        previous = store.latest_capture(source_id)
        if previous is not None:
            return previous.path.read_bytes(), ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=f"Using last complete ENTSO-E capture: {error}",
            )
        fallback = published_fallback()
        if fallback is not None:
            return fallback
        return b'{"records":[]}', ConnectorResult(
            source_id=source_id,
            state=ConnectorState.FAILED,
            payload=None,
            message=f"ENTSO-E failed without a complete cached capture: {error}",
        )


def _contains_credential_material(value: object) -> bool:
    if isinstance(value, Mapping):
        return any(
            "securitytoken" in str(key).replace("_", "").casefold()
            or _contains_credential_material(child)
            for key, child in value.items()
        )
    if isinstance(value, list):
        return any(_contains_credential_material(child) for child in value)
    return False


def normalize_entsoe_publication(body: bytes) -> dict[str, Any]:
    """Normalize a source capture to the credential-free public envelope."""

    try:
        payload = json.loads(body)
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ValueError("ENTSO-E publication capture must be valid JSON") from error
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        raise ValueError("ENTSO-E publication capture requires a records array")
    if _contains_credential_material(payload):
        raise ValueError("ENTSO-E publication contains credential material")
    records = payload["records"]
    return {
        "schemaVersion": "1.0.0",
        "source": "entsoe",
        "retrievedAt": payload.get("retrievedAt"),
        "periodStart": payload.get("periodStart"),
        "periodEnd": payload.get("periodEnd"),
        "observationMonth": payload.get("observationMonth"),
        "complete": bool(payload.get("complete", False)) and bool(records),
        "areasRequested": int(payload.get("areasRequested", len(records))),
        "records": records,
    }


def collect_power_source_records(
    payloads: Mapping[str, bytes],
) -> tuple[list[dict[str, Any]], dict[str, int]]:
    """Materialize power records in explicit official/GEM/WRI/OSM precedence."""

    records: list[dict[str, Any]] = []
    counts: dict[str, int] = {}
    for source_id in POWER_SOURCE_PRECEDENCE:
        body = payloads.get(source_id, b'{"records":[]}')
        try:
            payload = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError(f"{source_id} capture is not valid JSON") from error
        source_records = payload.get("records") if isinstance(payload, dict) else None
        if not isinstance(source_records, list) or any(
            not isinstance(record, dict) for record in source_records
        ):
            raise ValueError(f"{source_id} capture requires a records array")
        counts[source_id] = len(source_records)
        records.extend(dict(record) for record in source_records)
    return records, counts


def _local_json_source(
    path: Path | None,
    *,
    source_id: str,
    now: datetime,
) -> ConnectorResult:
    if path is None:
        return ConnectorResult(
            source_id=source_id,
            state=ConnectorState.NOT_CONFIGURED,
            payload=None,
            message=f"Optional {source_id} public release is not configured.",
        )
    body = path.read_bytes()
    payload = json.loads(body)
    records = payload.get("records") if isinstance(payload, dict) else None
    if not isinstance(records, list):
        raise ValueError(f"{source_id} release requires a records array")
    return ConnectorResult(
        source_id=source_id,
        state=ConnectorState.CURRENT,
        payload=FetchPayload(
            source_id=source_id,
            retrieved_at=now,
            media_type="application/json",
            body=body,
        ),
    )


def _records_result(
    records: list[dict[str, Any]],
    *,
    source_id: str,
    now: datetime,
    configured: bool,
) -> ConnectorResult:
    if not configured:
        return ConnectorResult(
            source_id=source_id,
            state=ConnectorState.NOT_CONFIGURED,
            payload=None,
            message=f"Optional {source_id} public source is not configured.",
        )
    return ConnectorResult(
        source_id=source_id,
        state=ConnectorState.CURRENT,
        payload=FetchPayload(
            source_id=source_id,
            retrieved_at=now,
            media_type="application/json",
            body=json.dumps(
                {"records": records}, separators=(",", ":"), ensure_ascii=False
            ).encode(),
        ),
    )


def _clamp_index(value: float) -> float:
    return max(0.0, min(100.0, value))


def _field_lineage(
    observation: Mapping[str, Any], field: str
) -> dict[str, Any]:
    field_provenance = observation.get("fieldProvenance")
    if field_provenance is not None:
        if not isinstance(field_provenance, Mapping):
            raise ValueError("official fieldProvenance must be an object")
        raw = field_provenance.get(field)
        if not isinstance(raw, Mapping):
            raise ValueError(f"official {field} requires field-specific provenance")
    else:
        # Legacy unmerged inputs remain supported only when their top-level
        # lineage is itself complete and valid.
        raw = observation
    raw_source_ids = raw.get("sourceIds")
    if raw_source_ids is None and raw.get("sourceId") is not None:
        raw_source_ids = [raw.get("sourceId")]
    if (
        not isinstance(raw_source_ids, list)
        or not raw_source_ids
        or any(not isinstance(value, str) or not value.strip() for value in raw_source_ids)
    ):
        raise ValueError(f"official {field} provenance requires source IDs")
    method_id = raw.get("methodId")
    if not isinstance(method_id, str) or not method_id.strip():
        raise ValueError(f"official {field} provenance requires a method ID")
    value_kind = str(raw.get("valueKind") or "").strip()
    if value_kind not in {"observed", "reported", "estimated", "inherited"}:
        raise ValueError(f"official {field} provenance has an invalid value kind")
    return {
        "sourceIds": sorted({value.strip() for value in raw_source_ids}),
        "methodId": method_id.strip(),
        "valueKind": value_kind,
    }


def _attach_power_balance_scores(rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    first_demand = float(rows[0]["metrics"]["demandGwh"]["central"])
    for row in rows:
        metrics = row["metrics"]
        demand = float(metrics["demandGwh"]["central"])
        peak = float(metrics["peakDemandMw"]["central"])
        dependable = metrics.get("dependableCapacityMw")
        local_gap = metrics.get("localGenerationGapGwh")
        unmet = metrics.get("observedUnmetDemandGwh")
        capacity_pressure = (
            _clamp_index(100 - 100 * float(dependable["central"]) / peak)
            if dependable is not None and peak > 0 else None
        )
        local_pressure = (
            _clamp_index(100 * max(0.0, float(local_gap["central"])) / demand)
            if local_gap is not None and demand > 0 else None
        )
        unmet_pressure = (
            _clamp_index(100 * float(unmet) / demand)
            if unmet is not None and demand > 0 else None
        )
        growth_pressure = (
            _clamp_index(100 * max(0.0, demand - first_demand) / first_demand)
            if first_demand > 0 else None
        )
        # Delivery pressure stays unavailable unless the supply model publishes
        # a distinct delivery metric; absence must never be converted to zero.
        result = score_power_balance(
            capacity_margin_index=capacity_pressure,
            local_balance_index=local_pressure,
            observed_unmet_demand_index=unmet_pressure,
            demand_growth_index=growth_pressure,
            supply_delivery_index=None,
            source_ids=row["sourceIds"],
            value_kinds={
                "capacity_margin": "estimated" if capacity_pressure is not None else "unavailable",
                "annual_local_balance": "estimated" if local_pressure is not None else "unavailable",
                "observed_unmet_demand": "reported" if unmet_pressure is not None else "unavailable",
                "forecast_demand_growth": "estimated" if growth_pressure is not None else "unavailable",
                "supply_delivery_gap": "unavailable",
            },
        )
        contributions = [
            contribution.model_dump(by_alias=True, mode="json")
            for contribution in result.contributions
        ]
        metric_lineage = metrics.get("metricLineage") or {}

        def metric_sources(*fields: str) -> list[str]:
            sources = {
                source_id
                for field in fields
                for source_id in (metric_lineage.get(field) or {}).get("sourceIds", [])
            }
            return sorted(sources) if sources else list(row["sourceIds"])

        driver_fields = {
            "capacity_margin": ("dependableCapacityMw", "peakDemandMw"),
            "annual_local_balance": ("demandGwh", "localGenerationGwh"),
            "observed_unmet_demand": ("observedUnmetDemandGwh",),
            "forecast_demand_growth": ("demandGwh",),
            "supply_delivery_gap": (),
        }
        for contribution in contributions:
            if contribution["rawValue"] is not None:
                contribution["sourceIds"] = metric_sources(
                    *driver_fields[contribution["id"]]
                )
        row["powerBalance"] = {
            "score": result.score,
            "coverage": result.coverage,
            "status": result.status,
            "contributions": contributions,
        }


def _demand_weights_with_iso3(
    demand_weights: Mapping[str, Any],
    country_iso3_by_iso2: Mapping[str, str],
) -> dict[str, Any]:
    """Attach canonical ISO3 controls without mutating the sealed weight artifact."""

    result = dict(demand_weights)
    records: list[dict[str, Any]] = []
    for raw in demand_weights.get("records", []):
        row = dict(raw)
        iso2 = str(row.get("country") or "").strip().upper()
        iso3 = str(country_iso3_by_iso2.get(iso2) or "").strip().upper()
        if re.fullmatch(r"[A-Z]{3}", iso3) is None:
            raise ValueError(f"regional demand weight lacks ISO3 mapping: {iso2}")
        row["countryIso3"] = iso3
        records.append(row)
    result["records"] = records
    return result


def attach_population_evidence_sources(
    registry: dict[str, Any], population_artifact: Mapping[str, Any]
) -> None:
    """Expose every sealed WorldPop record source through snapshot evidence."""

    release = population_artifact.get("sourceRelease")
    if not isinstance(release, Mapping):
        raise ValueError("population evidence requires sealed source release")
    release_checksums = release.get("checksumsSha256")
    primary_checksum = None
    if isinstance(release_checksums, Mapping) and len(release_checksums) == 1:
        primary_checksum = next(iter(release_checksums.values()))
    candidates = [{
        "id": release.get("sourceId"),
        "name": str(release.get("id") or "WorldPop population release"),
        "tier": "B",
        "url": release.get("sourceUrl"),
        "publishedAt": "2025-09-01T00:00:00Z",
        "checksumSha256": primary_checksum,
        "licence": release.get("licence"),
        "licenceUrl": release.get("licenceUrl"),
    }]
    for source in release.get("fallbackSources", []):
        candidates.append({
            "id": source.get("sourceId"),
            "name": str(source.get("sourceRelease") or "WorldPop population fallback"),
            "tier": "B",
            "url": source.get("sourceUrl"),
            "publishedAt": "2025-09-01T00:00:00Z",
            "checksumSha256": source.get("checksumSha256"),
            "licence": source.get("licence"),
            "licenceUrl": source.get("licenceUrl"),
        })
    existing = {source["id"] for source in registry.get("sources", [])}
    for raw in candidates:
        source = SourceRef.model_validate(raw).model_dump(by_alias=True, mode="json")
        if source["id"] not in existing:
            registry.setdefault("sources", []).append(source)
            existing.add(source["id"])


def attach_evidence_sources(
    registry: dict[str, Any], sources: Iterable[Mapping[str, Any]]
) -> None:
    """Merge cited source definitions so every published source ID is resolvable."""

    existing = {source["id"] for source in registry.get("sources", [])}
    for raw in sources:
        source = SourceRef.model_validate(raw).model_dump(by_alias=True, mode="json")
        if source["id"] not in existing:
            registry.setdefault("sources", []).append(source)
            existing.add(source["id"])


def governed_evidence_sources(
    source_catalog: Any, generation_assumptions: Mapping[str, Any]
) -> list[dict[str, Any]]:
    """Convert governed data and modelling sources to public evidence references."""

    references: list[dict[str, Any]] = []
    for source in source_catalog.sources:
        state = getattr(source.publication_state, "value", source.publication_state)
        if state != "publishable":
            continue
        references.append({
            "id": source.id,
            "name": source.name,
            "tier": "B",
            "url": str(source.url),
            "licence": source.licence,
            "licenceUrl": str(source.licence_url) if source.licence_url else None,
        })
    for source in generation_assumptions.get("sources", []):
        source_id = str(source.get("id") or "").strip()
        if not source_id:
            continue
        references.append({
            "id": source_id,
            "name": str(source.get("name") or source_id.replace("-", " ").title()),
            "tier": "B",
            "url": source.get("url"),
            "licence": source.get("licence"),
            "licenceUrl": source.get("licenceUrl"),
            "checksumSha256": source.get("checksumSha256"),
            "lastModified": source.get("lastModified"),
        })
    return references


def _official_demand_rows_for_year(
    observations: Iterable[Mapping[str, Any]],
    *,
    country: str,
    year: int,
    active_ids: set[str],
    country_control: Mapping[str, Any],
) -> list[dict[str, Any]]:
    """Use exact ADM1 observations, or scale a complete latest baseline to control."""

    eligible = [
        dict(row) for row in observations
        if str(row.get("countryIso3") or "").upper() == country
        and row.get("geographyId") in active_ids
        and row.get("demandGwh") is not None
        and int(row.get("year", 0)) <= year
    ]
    exact = [row for row in eligible if int(row.get("year", 0)) == year]
    if exact:
        return exact
    latest: dict[str, dict[str, Any]] = {}
    for row in eligible:
        geography_id = str(row["geographyId"])
        if geography_id not in latest or int(row["year"]) > int(latest[geography_id]["year"]):
            latest[geography_id] = row
    if set(latest) != active_ids:
        return []

    def central(value: Any) -> float:
        return float(value["central"] if isinstance(value, Mapping) else value)

    observed_total = math.fsum(central(row["demandGwh"]) for row in latest.values())
    target_total = central(country_control["demandGwh"])
    if observed_total <= 0 or target_total < 0:
        return []
    factor = target_total / observed_total
    control_source_ids = {
        str(source_id).strip() for source_id in country_control.get("sourceIds", [])
        if str(source_id).strip()
    }
    projected: list[dict[str, Any]] = []
    for geography_id, row in sorted(latest.items()):
        source_ids = sorted(
            control_source_ids
            | {str(source_id).strip() for source_id in row.get("sourceIds", []) if str(source_id).strip()}
        )
        projected.append({
            **row,
            "year": year,
            "demandGwh": central(row["demandGwh"]) * factor,
            "sourceIds": source_ids,
            "valueKind": "estimated",
            "methodId": "country-control-scaled-official-adm1-shares-v1",
            "confidence": min(float(row.get("confidence", 90)), 85.0),
        })
    return projected


def build_regional_energy_model(
    *,
    demand_weights: Mapping[str, Any],
    country_controls: Iterable[Mapping[str, Any]],
    official_observations: Iterable[Mapping[str, Any]],
    power_records: Iterable[Mapping[str, Any]],
    assumptions: Mapping[str, Any],
    method_config: Mapping[str, Any],
    demand_increments: Iterable[Mapping[str, Any]] = (),
    attach_scores: bool = True,
    before_supply: Callable[[], None] | None = None,
    country_iso3_by_iso2: Mapping[str, str] | None = None,
) -> tuple[dict[str, list[dict[str, Any]]], bool]:
    """Build country-controlled ADM1 residual demand, then supply and balance."""

    weights = [dict(row) for row in demand_weights.get("records", [])]
    country_level_only = [dict(row) for row in demand_weights.get("countryLevelOnly", [])]
    controls = [dict(row) for row in country_controls if row.get("demandGwh") is not None]
    official = [dict(row) for row in official_observations]
    allocation_official: list[dict[str, Any]] = []
    for observation in official:
        if observation.get("demandGwh") is None:
            continue
        allocation_official.append({
            **observation,
            **_field_lineage(observation, "demandGwh"),
        })
    increments = [dict(row) for row in demand_increments]
    if not weights and not country_level_only:
        return {}, True
    latest_controls: dict[str, dict[str, Any]] = {}
    for control in controls:
        country = str(control.get("countryIso3") or "").strip().upper()
        if country and (
            country not in latest_controls
            or int(control["year"]) > int(latest_controls[country]["year"])
        ):
            latest_controls[country] = control
    demand_by_region: dict[str, list[dict[str, Any]]] = {}
    reconciled = True
    iso3_mapping = {
        str(iso2).strip().upper(): str(iso3).strip().upper()
        for iso2, iso3 in (country_iso3_by_iso2 or {}).items()
    }
    for exception in country_level_only:
        iso2 = str(exception.get("country") or "").strip().upper()
        iso3 = iso3_mapping.get(iso2)
        if not iso3 or re.fullmatch(r"[A-Z]{3}", iso3) is None:
            raise ValueError(f"country-level-only exception lacks ISO3 mapping: {iso2}")
        control = latest_controls.get(iso3)
        for geography_id in exception.get("activeGeographyIds", []):
            rows: list[dict[str, Any]] = []
            for year in range(2026, 2032):
                normalized_control = None
                if control:
                    raw_demand = control["demandGwh"]
                    demand_range = (
                        {
                            "low": float(raw_demand["low"]),
                            "central": float(raw_demand["central"]),
                            "high": float(raw_demand["high"]),
                        }
                        if isinstance(raw_demand, Mapping)
                        else {key: float(raw_demand) for key in ("low", "central", "high")}
                    )
                    normalized_control = {
                        "countryIso3": iso3,
                        "year": year,
                        "sourceYear": int(control["year"]),
                        "demandGwh": demand_range,
                        "sourceIds": sorted({str(value).strip() for value in control["sourceIds"]}),
                        "valueKind": (
                            str(control.get("valueKind") or "reported")
                            if int(control["year"]) == year else "inherited"
                        ),
                        "methodId": (
                            str(control.get("methodId") or "country-control")
                            if int(control["year"]) == year
                            else "latest-country-control-flat-baseline-v1"
                        ),
                        "confidence": float(control.get("confidence", 80)),
                        "coverage": float(control.get("coverage", 100)),
                    }
                source_ids = (
                    normalized_control["sourceIds"]
                    if normalized_control is not None
                    else list((exception.get("sourceCoverage") or {}).get("sourceIds") or [])
                )
                if not source_ids:
                    raise ValueError("country-level-only row lacks source lineage")
                rows.append({
                    "geographyId": geography_id,
                    "countryIso3": iso3,
                    "year": year,
                    "availability": "country_level_only",
                    "rankable": False,
                    "metrics": None,
                    "countryControl": normalized_control,
                    "reason": exception.get("reason"),
                    "unavailableGeographyIds": exception.get("unavailableGeographyIds", []),
                    "sourceIds": source_ids,
                    "methodId": "country-level-only-no-adm1-allocation-v1",
                    "valueKind": "unavailable",
                    "confidence": 0.0,
                    "coverage": 0.0,
                    "powerBalance": None,
                })
            demand_by_region[geography_id] = rows
    if not weights or not controls:
        if before_supply is not None:
            before_supply()
        return demand_by_region, reconciled
    for country, control in sorted(latest_controls.items()):
        for year in range(2026, 2032):
            year_weights = [
                row for row in weights
                if str(row.get("countryIso3") or "").upper() == country
                and int(row.get("year", 0)) == year
            ]
            if not year_weights:
                continue
            projected_control = {
                **control,
                "year": year,
                "valueKind": "inherited" if int(control["year"]) != year else control.get("valueKind", "reported"),
                "methodId": (
                    str(control.get("methodId") or "country-control")
                    if int(control["year"]) == year
                    else "latest-country-control-flat-baseline-v1"
                ),
            }
            active_year_ids = {str(item.get("geographyId")) for item in year_weights}
            allocated = allocate_country_demand(
                regions=year_weights,
                country_control=projected_control,
                official_observations=_official_demand_rows_for_year(
                    allocation_official,
                    country=country,
                    year=year,
                    active_ids=active_year_ids,
                    country_control=projected_control,
                ),
                as_of_year=year,
                covariate_year=year,
                method_config=method_config,
            )
            expected = float(projected_control["demandGwh"] if not isinstance(projected_control["demandGwh"], Mapping) else projected_control["demandGwh"]["central"])
            actual = sum(float(row["demandGwh"]["central"]) for row in allocated)
            reconciled = reconciled and abs(actual - expected) <= max(1e-6, abs(expected) * 1e-6)
            for row in allocated:
                matching = next((
                    observation for observation in official
                    if observation.get("geographyId") == row["geographyId"]
                    and int(observation.get("year", 0)) == year
                ), None)
                if matching is not None and matching.get("peakDemandMw") is not None:
                    row["peakDemandMw"] = matching["peakDemandMw"]
                demand_by_region.setdefault(row["geographyId"], []).append(row)
    if before_supply is not None:
        before_supply()
    plants = [dict(row) for row in power_records]
    observed_capacity_factors = _official_observed_capacity_factors(official, plants)
    forecasts: dict[str, list[dict[str, Any]]] = {}
    for region_id, rows in sorted(demand_by_region.items()):
        if [row["year"] for row in rows] != list(range(2026, 2032)):
            continue
        if all(row.get("availability") == "country_level_only" for row in rows):
            forecasts[region_id] = rows
            continue
        net_interchange: dict[int, object] = {}
        observed_unmet: dict[int, object] = {}
        for observation in official:
            if observation.get("geographyId") != region_id:
                continue
            year = int(observation["year"])
            if observation.get("netInterchangeGwh") is not None:
                net_interchange[year] = {
                    **_field_lineage(observation, "netInterchangeGwh"),
                    "netInterchangeGwh": observation["netInterchangeGwh"],
                }
            if observation.get("observedUnmetDemandGwh") is not None:
                observed_unmet[year] = {
                    **_field_lineage(observation, "observedUnmetDemandGwh"),
                    "observedUnmetDemandGwh": observation["observedUnmetDemandGwh"],
                }
        regional = build_regional_energy_forecasts(
            geography_id=region_id,
            demand_forecasts=rows,
            plants=plants,
            assumptions=assumptions,
            net_interchange_by_year=net_interchange,
            observed_unmet_by_year=observed_unmet,
            observed_capacity_factors=observed_capacity_factors,
            demand_increments=[
                row for row in increments if row.get("geographyId") == region_id
            ],
        )
        observations_by_year = {
            int(row["year"]): row for row in official
            if row.get("geographyId") == region_id
        }
        demand_rows_by_year = {int(row["year"]): row for row in rows}
        increments_by_id = {
            str(row.get("incrementId")): row
            for row in increments if row.get("geographyId") == region_id
        }
        for forecast in regional:
            demand_row = demand_rows_by_year[int(forecast["year"])]
            base_demand_lineage = _field_lineage(demand_row, "demandGwh")
            applied_ids = forecast.get("appliedIncrementIds") or []
            if applied_ids:
                base_demand_lineage = {
                    "sourceIds": sorted(
                        set(base_demand_lineage["sourceIds"])
                        | {
                            source_id
                            for increment_id in applied_ids
                            for source_id in increments_by_id[increment_id]["sourceIds"]
                        }
                    ),
                    "methodId": FORECAST_INCREMENT_METHOD_ID,
                    "valueKind": "estimated",
                }
            forecast["metrics"].setdefault("metricLineage", {})["demandGwh"] = (
                base_demand_lineage
            )
            forecast["metrics"]["metricLineage"]["peakDemandMw"] = {
                **base_demand_lineage,
                "methodId": "annual-demand-derived-peak-v1",
                "valueKind": "estimated",
            }
            observation = observations_by_year.get(int(forecast["year"]))
            if observation is None:
                continue
            metrics = forecast["metrics"]
            supply = {
                "localGenerationGwh": metrics.get("localGenerationGwh"),
                "installedCapacityMw": metrics.get("installedCapacityMw"),
                "dependableCapacityMw": metrics.get("dependableCapacityMw"),
            }
            if observation.get("localGenerationGwh") is not None:
                supply["localGenerationGwh"] = observation["localGenerationGwh"]
            if observation.get("installedCapacityMw") is not None:
                supply["installedCapacityMw"] = observation["installedCapacityMw"]
            if observation.get("dependableCapacityMw") is not None:
                supply["dependableCapacityMw"] = observation["dependableCapacityMw"]
            rebuilt = calculate_power_balance(
                demand_gwh=metrics["demandGwh"],
                supply=supply,
                peak_demand_mw=(
                    observation.get("peakDemandMw")
                    if observation.get("peakDemandMw") is not None
                    else metrics["peakDemandMw"]
                ),
                net_interchange_gwh=(
                    {
                        **_field_lineage(observation, "netInterchangeGwh"),
                        "netInterchangeGwh": observation["netInterchangeGwh"],
                    }
                    if observation.get("netInterchangeGwh") is not None else None
                ),
                observed_unmet_demand_gwh=(
                    {
                        **_field_lineage(observation, "observedUnmetDemandGwh"),
                        "observedUnmetDemandGwh": observation["observedUnmetDemandGwh"],
                    }
                    if observation.get("observedUnmetDemandGwh") is not None else None
                ),
            )
            if observation.get("generationMixGwh"):
                rebuilt["generationMixGwh"] = dict(observation["generationMixGwh"])
            official_fields = [
                field for field in (
                    "localGenerationGwh", "peakDemandMw", "installedCapacityMw",
                    "dependableCapacityMw",
                ) if observation.get(field) not in (None, {})
            ]
            lineage = rebuilt.setdefault("metricLineage", {})
            lineage["demandGwh"] = base_demand_lineage
            lineage["peakDemandMw"] = (
                _field_lineage(observation, "peakDemandMw")
                if observation.get("peakDemandMw") is not None
                else forecast["metrics"]["metricLineage"]["peakDemandMw"]
            )
            for field in official_fields:
                lineage[field] = _field_lineage(observation, field)
            for technology in sorted(observation.get("generationMixGwh") or {}):
                mix_field = f"generationMixGwh.{technology}"
                lineage[mix_field] = _field_lineage(observation, mix_field)
            forecast["metrics"] = rebuilt
            used_official_sources = {
                source_id
                for field_lineage in lineage.values()
                for source_id in field_lineage.get("sourceIds", [])
            }
            forecast["sourceIds"] = sorted(
                set(forecast["sourceIds"]) | used_official_sources
            )
        if attach_scores:
            _attach_power_balance_scores(regional)
        forecasts[region_id] = regional
    return forecasts, reconciled


def merge_asset_feeds(
    countries: dict,
    official_registry: dict,
    osm_payload: dict,
    *,
    observed_at: str,
) -> dict:
    country_features = countries.get("features", [])
    community_assets: list[dict] = []
    for source_asset in osm_payload.get("assets", []):
        asset = dict(source_asset)
        country = assign_asset_country(asset, country_features)
        if not country:
            continue
        asset["country"] = country
        if asset.get("geographyId") == "UNASSIGNED":
            asset["geographyId"] = country
        community_assets.append(asset)

    sources = list(official_registry.get("sources", []))
    if not any(source.get("id") == OSM_SOURCE_ID for source in sources):
        sources.append({
            "id": OSM_SOURCE_ID,
            "name": "OpenStreetMap infrastructure mapping",
            "tier": "C",
            "url": "https://www.openstreetmap.org/copyright",
            "publishedAt": observed_at,
        })
    return {
        **official_registry,
        "sources": sources,
        "assets": canonicalize_assets([
            *community_assets,
            *official_registry.get("assets", []),
        ]),
    }


def refresh() -> Path:
    now = datetime.now(UTC).replace(microsecond=0)
    generated_at = now.isoformat().replace("+00:00", "Z")
    snapshot_id = generated_at.replace(":", "-")
    store = RawCaptureStore(RAW_DIR, WAREHOUSE_PATH)
    source_catalog = load_source_catalog(SOURCE_CATALOG_PATH)
    source_bodies: dict[str, bytes] = {}
    completed_stages: list[str] = []

    def stage(name: str) -> None:
        expected = REFRESH_STEPS[len(completed_stages)]
        if name != expected:
            raise RuntimeError(f"refresh stage order violation: {name} before {expected}")
        completed_stages.append(name)
        print(f"refresh stage {len(completed_stages)}/{len(REFRESH_STEPS)}: {name}", flush=True)

    stage("boundaries")
    with httpx.Client(timeout=90, follow_redirects=True) as client:
        countries_body, countries_status = _network_result(
            lambda: UnGeodataConnector(UN_GEODATA_URL).fetch(client, now=now),
            "un_geodata",
            store,
        )
        gisco_body, gisco_status = _network_result(
            lambda: GiscoConnector().fetch(client, now=now), "gisco", store
        )

    global_admin1_result = CuratedConnector(
        GLOBAL_ADMIN1_PATH, source_id="geoboundaries_adm1"
    ).fetch(now=now)
    assert global_admin1_result.payload is not None
    store.save(
        global_admin1_result.source_id,
        global_admin1_result.payload.body,
        global_admin1_result.payload.media_type,
    )
    admin1_payload = json.loads(global_admin1_result.payload.body)
    grid_context = _read_json(GRID_INTELLIGENCE_PATH)
    africa_grid_path = AFRICA_GRID_PATH
    if africa_grid_path is not None and africa_grid_path.exists():
        africa_grid = load_africa_grid(africa_grid_path)
        features_by_id = {
            str(feature.get("id") or (feature.get("properties") or {}).get("id")): feature
            for feature in [
                *grid_context.get("features", []),
                *africa_grid.get("features", []),
            ]
        }
        grid_context = {
            "type": "FeatureCollection",
            "metadata": {
                **(grid_context.get("metadata") or {}),
                "africaGrid": africa_grid.get("metadata") or {},
            },
            "features": [features_by_id[key] for key in sorted(features_by_id)],
        }
    africa_grid_status = _records_result(
        [{
            "featureCount": len(africa_grid.get("features", []))
            if africa_grid_path is not None and africa_grid_path.exists()
            else 0,
            "sourceChecksum": (
                sha256(africa_grid_path.read_bytes()).hexdigest()
                if africa_grid_path is not None and africa_grid_path.exists()
                else None
            ),
        }],
        source_id="world-bank-africa-electricity-grid",
        now=now,
        configured=bool(africa_grid_path and africa_grid_path.exists()),
    )
    population_path = Path(os.getenv(
        "ADM1_POPULATION_ARTIFACT_PATH",
        str(CURATED_PATH.parent / "admin1-population.json"),
    ))
    weights_path = Path(os.getenv(
        "REGIONAL_DEMAND_WEIGHTS_PATH",
        str(CURATED_PATH.parent / "regional-demand-weights.json"),
    ))
    stage("population")
    model_artifacts = load_refresh_model_artifacts(population_path, weights_path)

    stage("plant_sources")
    country_ids = {
        str((feature.get("properties") or {}).get("id") or feature.get("id") or "")
        for feature in json.loads(countries_body).get("features", [])
    }
    entsoe_areas = load_entsoe_areas(
        ENTSOE_AREAS_PATH, valid_geography_ids=country_ids
    )
    with httpx.Client(timeout=90, follow_redirects=True) as client:
        eurostat_body, eurostat_status = _network_result(
            lambda: EurostatConnector().fetch(client, now=now), "eurostat", store
        )
        osm_body, osm_status = _osm_infrastructure_result(
            lambda: OsmInfrastructureConnector(QLEVER_OSM_URL).fetch(client, now=now),
            store,
            publish_dir=PUBLISH_DIR,
        )
        gem_body, gem_status = _optional_network_result(
            lambda: GemPowerConnector().fetch(client, now=now), "gem_power", store
        )
        aneel_body, aneel_status = _optional_network_result(
            lambda: AneelSigaConnector().fetch(client, now=now),
            "brazil-aneel-siga",
            store,
        )
        if not (json.loads(aneel_body).get("records") or []):
            try:
                aneel_body, aneel_status = _published_power_source_result(
                    PUBLISH_DIR,
                    source_id="brazil-aneel-siga",
                    source_type="official_verified",
                )
            except (OSError, ValueError, json.JSONDecodeError):
                # The coverage gate below will prevent a silent plant-count collapse.
                pass
        wri_body, wri_status = _optional_network_result(
            lambda: WriPowerConnector().fetch(client, now=now), "wri_power", store
        )
        osm_power_body, osm_power_status = _osm_power_result(
            lambda: OsmPowerConnector(QLEVER_OSM_URL).fetch(client, now=now),
            store,
            publish_dir=PUBLISH_DIR,
        )
        entsoe_body, entsoe_status = _entsoe_network_result(
            lambda: EntsoeConnector(os.getenv("ENTSOE_SECURITY_TOKEN")).fetch(
                client, now=now, areas=entsoe_areas
            ),
            store,
            publish_dir=PUBLISH_DIR,
        )
    entsoe_publication = normalize_entsoe_publication(entsoe_body)

    official_power_path_value = os.getenv("OFFICIAL_POWER_PATH")
    official_power_path = Path(official_power_path_value) if official_power_path_value else None
    official_power_body, official_power_status = _optional_network_result(
        lambda: _local_json_source(
            official_power_path, source_id="official_power", now=now
        ),
        "official_power",
        store,
    )
    source_bodies.update({
        "official_power": official_power_body,
        "brazil-aneel-siga": aneel_body,
        "gem_power": gem_body,
        "wri_power": wri_body,
        "osm_power": osm_power_body,
    })
    power_source_records, power_source_counts = collect_power_source_records(source_bodies)

    stage("plant_canonicalization")
    canonical_power = canonicalize_power_plants(
        power_source_records,
        geographies=admin1_payload.get("features", []),
    )

    curated_result = CuratedConnector(CURATED_PATH).fetch(now=now)
    assert curated_result.payload is not None
    store.save(
        curated_result.source_id,
        curated_result.payload.body,
        curated_result.payload.media_type,
    )
    global_assets_result = CuratedConnector(
        GLOBAL_ASSETS_PATH, source_id="global_assets"
    ).fetch(now=now)
    source_registry_result = CuratedConnector(
        SOURCE_REGISTRY_PATH, source_id="source_registry"
    ).fetch(now=now)
    for result in (global_assets_result, source_registry_result):
        assert result.payload is not None
        store.save(result.source_id, result.payload.body, result.payload.media_type)

    geometry = json.loads(gisco_body)
    population = parse_population(json.loads(eurostat_body))
    curated = json.loads(curated_result.payload.body)
    europe_artifacts = build_snapshot_artifacts(geometry, population, curated, generated_at)
    registry = load_asset_registry(GLOBAL_ASSETS_PATH, SOURCE_REGISTRY_PATH)
    generation_assumptions = load_generation_assumptions(
        CURATED_PATH.parent / "generation-assumptions.json"
    )
    attach_evidence_sources(registry, curated.get("sources", []))
    attach_evidence_sources(
        registry, governed_evidence_sources(source_catalog, generation_assumptions)
    )
    attach_population_evidence_sources(registry, model_artifacts["population"])
    countries = json.loads(countries_body)
    registry = merge_asset_feeds(
        countries,
        registry,
        json.loads(osm_body),
        observed_at=generated_at,
    )
    registry["modelNote"] = json.loads(GLOBAL_ASSETS_PATH.read_text()).get("modelNote")

    active_admin1 = {
        str((feature.get("properties") or {}).get("id") or feature.get("id") or "").strip()
        for feature in admin1_payload.get("features", [])
    }
    country_iso3 = {
        str((feature.get("properties") or {}).get("id") or feature.get("id") or "").strip():
        str((feature.get("properties") or {}).get("iso3") or "").strip().upper()
        for feature in countries.get("features", [])
    }
    admin1_country = {
        str((feature.get("properties") or {}).get("id") or feature.get("id") or "").strip():
        str((feature.get("properties") or {}).get("country") or "").strip().upper()
        for feature in admin1_payload.get("features", [])
    }
    industrial_captures = {
        source_id: capture
        for source_id in INDUSTRIAL_SOURCE_IDS
        if (capture := store.latest_capture(source_id)) is not None
    }
    industrial_assets, industrial_counts = load_industrial_assets_from_paths(
        {
            source_id: capture.path
            for source_id, capture in industrial_captures.items()
        },
        countries=countries,
        admin1=admin1_payload,
        cities=_read_json(CITIES_PATH),
        assumptions=load_industrial_demand_assumptions(
            CURATED_PATH.parent / "industrial-demand-assumptions.json"
        ),
    )
    steel_source_ids = {
        GEM_STEEL_PLANT_SOURCE_ID,
        GEM_STEEL_UNIT_SOURCE_ID,
        GEM_IRON_UNIT_SOURCE_ID,
    }
    industrial_fallback_source_ids = set(INDUSTRIAL_SOURCE_IDS).difference(
        industrial_captures
    )
    if not steel_source_ids.issubset(industrial_captures):
        # The three GEM steel workbooks form one normalized release.
        industrial_fallback_source_ids.update(steel_source_ids)
    fallback_industrial_assets: list[dict[str, Any]] = []
    fallback_snapshot_ids: dict[str, str] = {}
    if industrial_fallback_source_ids:
        fallback_industrial_assets, fallback_snapshot_ids = (
            _published_industrial_assets(
                PUBLISH_DIR, source_ids=industrial_fallback_source_ids
            )
        )
    industrial_assets_by_id = {
        str(asset["id"]): asset for asset in fallback_industrial_assets
    }
    # Fresh governed imports replace their prior normalized records by stable ID.
    industrial_assets_by_id.update({
        str(asset["id"]): asset for asset in industrial_assets
    })
    industrial_assets = [
        industrial_assets_by_id[identifier]
        for identifier in sorted(industrial_assets_by_id)
    ]
    industrial_counts = {
        "normalized": industrial_counts["normalized"] + len(fallback_industrial_assets),
        "mappable": len(industrial_assets),
        "forecastEligible": len({
            str(asset["id"])
            for asset in industrial_assets
            if bool(asset.get("gridDemandContribution"))
            and asset.get("lifecycle") in {
                "announced", "planning_filed", "permitted", "pre_construction",
                "under_construction",
            }
            and isinstance(asset.get("targetYear"), int)
            and 2026 <= asset["targetYear"] <= 2031
            and asset.get("geographyId") != asset.get("country")
        }),
    }
    registry = merge_industrial_assets(registry, industrial_assets)
    store.save_canonical_assets(registry["assets"])
    industrial_source_counts = {
        source_id: sum(
            source_id in asset.get("sourceIds", [])
            for asset in industrial_assets
        )
        for source_id in INDUSTRIAL_SOURCE_IDS
    }
    industrial_statuses: list[ConnectorResult] = []
    for source_id in INDUSTRIAL_SOURCE_IDS:
        status_records = [{
            "normalizedRecords": industrial_counts["normalized"],
            "publishedRecords": industrial_source_counts[source_id],
            "forecastEligibleRecords": industrial_counts["forecastEligible"],
        }]
        if (
            source_id in industrial_fallback_source_ids
            and industrial_source_counts[source_id] > 0
        ):
            industrial_statuses.append(ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CACHED,
                payload=None,
                message=(
                    "Manual release was unavailable during refresh; reused governed "
                    "normalized facilities from snapshot "
                    f"{fallback_snapshot_ids.get(source_id, 'unknown')}."
                ),
            ))
        else:
            industrial_statuses.append(_records_result(
                status_records,
                source_id=source_id,
                now=now,
                configured=source_id in industrial_captures,
            ))
    publishable_plants = [
        plant for plant in canonical_power["plants"]
        if plant.get("geographyId") in active_admin1
        and admin1_country.get(str(plant.get("geographyId"))) == str(plant.get("country") or "").upper()
        and plant.get("coordinates") is not None
    ]

    stage("country_electricity_controls")
    ember_path_value = EMBER_YEARLY_PATH
    country_controls, country_control_status = _local_records_with_lkg(
        lambda: normalize_ember_yearly_csv(ember_path_value or ""),
        source_id="country_electricity_controls", store=store, now=now,
        configured=bool(ember_path_value and ember_path_value.exists()),
    )
    stage("official_adm1_observations")
    official_observations: list[dict[str, Any]] = []
    observed_path_value = os.getenv(
        "REGIONAL_ELECTRICITY_OBSERVED_PATH",
        str(CURATED_PATH.parent / "regional-electricity-observed.csv"),
    )
    observed_path = Path(observed_path_value)
    has_records = False
    if observed_path.exists() and observed_path.stat().st_size > 0:
        with observed_path.open(encoding="utf-8-sig") as source:
            has_records = sum(1 for _ in source) > 1
    def load_curated_official() -> list[dict[str, Any]]:
        if has_records:
            identity_mapping = {region_id: region_id for region_id in active_admin1}
            return merge_regional_observations(
                load_curated_regional_observations(
                    observed_path,
                    region_mapping=identity_mapping,
                    active_geography_ids=active_admin1,
                    geography_country_iso3={
                        region_id: country_iso3.get(country, country)
                        for region_id, country in admin1_country.items()
                    },
                )
            )
        return []
    curated_official, curated_regional_status = _local_records_with_lkg(
        load_curated_official,
        source_id="official_adm1_electricity",
        store=store, now=now, configured=has_records,
    )
    with httpx.Client(timeout=90, follow_redirects=True) as eia_client:
        eia_observations, eia_status = _fetch_eia_observations(
            eia_client, now=now, store=store, admin1_payload=admin1_payload
        )
    epe_path = BRAZIL_EPE_CONSUMPTION_PATH
    epe_observations, epe_status = _local_records_with_lkg(
        lambda: load_epe_annual_observations(
            epe_path or "",
            region_mapping=_brazil_state_mapping(admin1_payload),
        ),
        source_id="brazil-epe-consumption",
        store=store,
        now=now,
        configured=bool(epe_path and epe_path.exists()),
    )
    official_observations = merge_regional_observations([
        *curated_official, *eia_observations, *epe_observations,
    ])
    official_regional_status = _records_result(
        official_observations, source_id="official_adm1_electricity_merged",
        now=now, configured=bool(official_observations),
    )
    stage("modelled_adm1_residual_demand")
    regional_energy: dict[str, list[dict[str, Any]]] = {}
    country_demand_reconciled = True
    forecast_power_records = [
            {
                **record,
                "targetYear": (
                    record.get("targetYear")
                    or record.get("expectedCommissioningYear")
                ),
            }
            for record in canonical_power["records"]
        ]
    demand_increments = build_forward_demand_increments(
        registry, active_admin1=active_admin1
    )
    regional_energy, country_demand_reconciled = build_regional_energy_model(
            demand_weights=_demand_weights_with_iso3(
                model_artifacts["demandWeights"], country_iso3
            ),
            country_controls=country_controls,
            official_observations=official_observations,
            power_records=forecast_power_records,
            demand_increments=demand_increments,
            attach_scores=False,
            before_supply=lambda: stage("supply_balance_forecast"),
            assumptions=generation_assumptions,
            method_config=load_regional_demand_methods(
                CURATED_PATH.parent / "regional-demand-methods.json"
            ),
            country_iso3_by_iso2=country_iso3,
    )
    stage("scores")
    for rows in regional_energy.values():
        if rows and rows[0].get("availability") != "country_level_only":
            _attach_power_balance_scores(rows)
    stage("artifacts")
    artifacts = build_global_snapshot_artifacts(
        countries=countries,
        admin1=admin1_payload,
        regions=json.loads(europe_artifacts["regions.geojson"]),
        registry=registry,
        generated_at=generated_at,
        regional_energy=regional_energy,
        power_plants=publishable_plants,
        population_records=(
            model_artifacts["population"].get("records", [])
        ),
        cities=_read_json(CITIES_PATH),
        grid=grid_context,
        cooling=_read_json(COOLING_EVIDENCE_PATH),
    )
    artifacts["source-catalog.json"] = json.dumps(
        {
            "schemaVersion": source_catalog.schema_version,
            "sources": [
                source.model_dump(by_alias=True, mode="json")
                for source in source_catalog.sources
            ],
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).encode()
    artifacts["entsoe-monthly.json"] = json.dumps(
        entsoe_publication, ensure_ascii=False, separators=(",", ":")
    ).encode()

    statuses = [
        countries_status,
        gisco_status,
        eurostat_status,
        osm_status,
        global_assets_result,
        source_registry_result,
        global_admin1_result,
        curated_result,
        entsoe_status,
        official_power_status,
        aneel_status,
        gem_status,
        wri_status,
        osm_power_status,
        country_control_status,
        curated_regional_status,
        eia_status,
        epe_status,
        africa_grid_status,
        official_regional_status,
        *industrial_statuses,
    ]
    country_count = len(json.loads(artifacts["countries.geojson"])["features"])
    asset_features = json.loads(artifacts["assets.geojson"])["features"]
    manifest = {
        "snapshotId": snapshot_id,
        "generatedAt": generated_at,
        "modelVersion": MODEL_VERSION,
        "activeYears": [2026, 2027, 2028, 2029, 2030, 2031],
        "artifacts": {
            "countries": f"snapshots/{snapshot_id}/countries.geojson",
            "admin1": f"snapshots/{snapshot_id}/admin1.geojson",
            "regions": f"snapshots/{snapshot_id}/regions.geojson",
            "assets": f"snapshots/{snapshot_id}/assets.geojson",
            "evidence": f"snapshots/{snapshot_id}/evidence.json",
            "regionalEnergy": f"snapshots/{snapshot_id}/regional-energy.json",
            "generatorOverview": f"snapshots/{snapshot_id}/generator-overview.geojson",
            "generatorIndex": f"snapshots/{snapshot_id}/generators/index.json",
            "cities": f"snapshots/{snapshot_id}/cities.geojson",
            "grid": f"snapshots/{snapshot_id}/grid.geojson",
            "cooling": f"snapshots/{snapshot_id}/cooling.json",
            "sourceCatalog": f"snapshots/{snapshot_id}/source-catalog.json",
            "entsoeMonthly": f"snapshots/{snapshot_id}/entsoe-monthly.json",
        },
        "coverage": {
            "countries": country_count,
            "regions": len(json.loads(artifacts["regions.geojson"])["features"]),
            "admin1Regions": len(json.loads(artifacts["admin1.geojson"])["features"]),
            "countriesWithAdmin1": len({
                feature["properties"]["country"]
                for feature in json.loads(artifacts["admin1.geojson"])["features"]
            }),
            "assets": len(asset_features),
            "dataCentres": sum(feature["properties"]["category"] == "data_centre" for feature in asset_features),
            "waterInfrastructure": sum(feature["properties"]["category"] == "water_infrastructure" for feature in asset_features),
            "industrialLoads": sum(feature["properties"]["category"] == "industrial_load" for feature in asset_features),
            "hydrogenInfrastructure": sum(feature["properties"]["category"] == "hydrogen_infrastructure" for feature in asset_features),
            "forecastIndustrialLoads": industrial_counts["forecastEligible"],
            "powerSourceRecords": len(power_source_records),
            "powerSourceRecordsBySource": power_source_counts,
            "canonicalPowerPlants": len(canonical_power["plants"]),
            "canonicalPowerUnits": len(canonical_power["units"]),
            "publishedPowerPlants": len(publishable_plants),
            "publishedPowerPlantsBySource": {
                source_id: sum(
                    source_id in (plant.get("sourceIds") or [])
                    for plant in publishable_plants
                )
                for source_id in POWER_SOURCE_PRECEDENCE
            },
            "generatorRegions": len(json.loads(artifacts["generator-overview.geojson"])["features"]),
            "regionalEnergyRegions": len(regional_energy),
            "cities": len(json.loads(artifacts["cities.geojson"])["features"]),
            "gridRecords": len(json.loads(artifacts["grid.geojson"])["features"]),
            "coolingRecords": len(json.loads(artifacts["cooling.json"])["records"]),
            "entsoeAreas": len(entsoe_publication["records"]),
            "entsoeDirectAreas": sum(
                record.get("mappingMode") == "direct"
                for record in entsoe_publication["records"]
            ),
        },
        "quality": {
            "countryDemandReconciled": country_demand_reconciled,
            "generatorArtifactsReconciled": _generator_artifacts_reconcile(
                artifacts, expected_plants=len(publishable_plants)
            ),
            "populationBuildFingerprint": (
                model_artifacts["population"].get("buildFingerprint")
            ),
            "demandWeightsBuildFingerprint": (
                model_artifacts["demandWeights"].get("buildFingerprint")
            ),
            "cities": len(_read_json(CITIES_PATH).get("features", [])),
            "gridRecords": len(grid_context.get("features", [])),
            "coolingRecords": len(_read_json(COOLING_EVIDENCE_PATH).get("records", [])),
        },
        "boundaryDisclaimer": json.loads(artifacts["countries.geojson"]).get("metadata", {}).get("disclaimer"),
        "publication": {
            "quarantinedSourceIds": sorted(
                source.id
                for source in source_catalog.sources
                if source.publication_state == "quarantined"
            ),
        },
        "connectors": [],
    }
    body_by_source = {
        "un_geodata": countries_body,
        "gisco": gisco_body,
        "eurostat": eurostat_body,
        "osm_infrastructure": osm_body,
        "entsoe": entsoe_body,
        **source_bodies,
        "country_electricity_controls": (
            country_control_status.payload.body
            if country_control_status.payload is not None else b""
        ),
        "official_adm1_electricity": (
            curated_regional_status.payload.body
            if curated_regional_status.payload is not None else b""
        ),
        "brazil-epe-consumption": (
            epe_status.payload.body if epe_status.payload is not None else b""
        ),
        "world-bank-africa-electricity-grid": (
            africa_grid_status.payload.body
            if africa_grid_status.payload is not None else b""
        ),
        "eia_state_observations": (
            eia_status.payload.body if eia_status.payload is not None else b""
        ),
        "official_adm1_electricity_merged": (
            official_regional_status.payload.body
            if official_regional_status.payload is not None else b""
        ),
        **{
            result.source_id: (
                result.payload.body if result.payload is not None else b""
            )
            for result in industrial_statuses
        },
    }
    for result in statuses:
        previous_capture = store.latest_capture(result.source_id)
        if not body_by_source.get(result.source_id) and previous_capture is not None:
            body_by_source[result.source_id] = previous_capture.path.read_bytes()
        last_success = (
            previous_capture.retrieved_at.astimezone(UTC).isoformat().replace("+00:00", "Z")
            if previous_capture is not None else None
        )
        manifest["connectors"].append(build_connector_status(
            result,
            checked_at=generated_at,
            observation_body=body_by_source.get(result.source_id),
            last_success_at=last_success,
        ))
    manifest["sourceCoverage"] = build_source_coverage_summary(
        source_catalog,
        connector_states={
            connector["id"]: connector["state"]
            for connector in manifest["connectors"]
        },
        published_records_by_source={
            **power_source_counts,
            **industrial_source_counts,
        },
    )
    latest_path = PUBLISH_DIR / "latest.json"
    previous_manifest = _read_json(latest_path) if latest_path.exists() else None
    stage("validation")
    validate_refresh_quality(manifest, previous_manifest)
    stage("atomic_publish")
    if tuple(completed_stages) != REFRESH_STEPS:
        raise RuntimeError("refresh did not execute every required stage")
    return SnapshotPublisher(PUBLISH_DIR).publish(snapshot_id, artifacts, manifest)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build the Wattlas monthly snapshot from public sources."
    )
    parser.add_argument(
        "command", nargs="?", choices=["refresh", "import-source"],
        default="refresh",
    )
    parser.add_argument("--source-id")
    parser.add_argument("--file", type=Path)
    parser.add_argument("--sha256")
    parser.add_argument("--observation-date", type=date.fromisoformat)
    parser.add_argument("--source-version")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    arguments = parser.parse_args(argv)
    if arguments.command == "import-source":
        missing = [
            flag
            for flag, value in (
                ("--source-id", arguments.source_id),
                ("--file", arguments.file),
                ("--sha256", arguments.sha256),
                ("--observation-date", arguments.observation_date),
                ("--source-version", arguments.source_version),
            )
            if value is None
        ]
        if missing:
            parser.error(
                "import-source requires " + ", ".join(missing)
            )
        result = import_source_snapshot(
            catalog=load_source_catalog(SOURCE_CATALOG_PATH),
            source_id=arguments.source_id,
            input_path=arguments.file,
            expected_checksum=arguments.sha256,
            observation_date=arguments.observation_date,
            stores=GovernedCaptureStores(
                public=RawCaptureStore(RAW_DIR, WAREHOUSE_PATH),
                quarantine=RawCaptureStore(
                    QUARANTINE_DIR, QUARANTINE_WAREHOUSE_PATH
                ),
            ),
            source_version=arguments.source_version,
        )
        print(
            f"Imported {result.source_id} {result.source_version} "
            f"as {result.publication_state.value} ({result.checksum})."
        )
        return 0
    path = refresh()
    print(f"Published monthly snapshot: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

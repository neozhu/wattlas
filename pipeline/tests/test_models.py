from datetime import UTC, datetime
from datetime import date

import pytest
from pydantic import ValidationError

from grid_scope.models import (
    AccessMode,
    AssetCategory,
    AssetProperties,
    ConnectorState,
    DemandRange,
    GenerationTechnology,
    GeographyProperties,
    LensScores,
    PowerBalanceMetrics,
    PublicationState,
    RegionalEnergyForecast,
    RegionProperties,
    SourceCategory,
    SourceDescriptor,
    ValueKind,
)


def test_city_grid_and_cooling_contracts_preserve_evidence() -> None:
    from grid_scope.models import CityProperties, CoolingEvidence, GridRecord

    city = CityProperties(
        id="ghsl-berlin", name="Berlin", country="DE", population=4_100_000,
        population_year=2025, population_definition="urban_centre",
        classes=["million_plus"], source_id="ghsl_ucdb", observed_at="2025-07-31T00:00:00Z",
    )
    grid = GridRecord(
        id="neso-tec-1", source_operator="NESO", source_record_id="TEC-1",
        record_type="connection_queue", market="GB", capacity_value=500,
        capacity_unit="MW", evidence_class="reported", confidence=90,
        licence="NESO Open Licence", observed_at="2026-07-12T00:00:00Z",
        native={"gate": "Gate 2"},
    )
    cooling = CoolingEvidence(
        id="eu-pue", scope="regional_metric", metric="PUE", value=1.42,
        value_kind="reported", confidence=80, source_ids=["eu_dc_reporting"],
        observed_at="2025-01-01T00:00:00Z",
    )

    assert city.population == 4_100_000
    assert grid.native == {"gate": "Gate 2"}
    assert cooling.value_kind == "reported"


def test_source_governance_contracts_are_stable() -> None:
    assert {mode.value for mode in AccessMode} == {
        "automatic",
        "credentialled",
        "manual_snapshot",
        "metadata_only",
    }
    assert {state.value for state in PublicationState} == {
        "publishable",
        "quarantined",
        "rejected",
        "superseded",
    }
    assert {category.value for category in SourceCategory} >= {
        "generation",
        "demand",
        "grid_context",
        "digital_infrastructure",
        "projects",
        "national_control",
    }


def test_publishable_source_requires_reusable_licence_metadata() -> None:
    with pytest.raises(ValidationError, match="reusable licence"):
        SourceDescriptor(
            id="example-source",
            name="Example source",
            publisher="Example publisher",
            url="https://example.com/data",
            categories=["generation"],
            continents=["Africa"],
            countries=[],
            access_mode="automatic",
            publication_state="publishable",
            refresh_cadence="monthly",
            licence=None,
            licence_url=None,
            licence_decided_at=date(2026, 7, 17),
        )


def test_quarantined_source_preserves_access_and_coverage_metadata() -> None:
    source = SourceDescriptor(
        id="regional-pool",
        name="Regional pool",
        publisher="Regional operator",
        url="https://example.com/pool",
        categories=["generation", "demand"],
        continents=["Africa"],
        countries=["ZA", "BW"],
        access_mode="manual_snapshot",
        publication_state="quarantined",
        refresh_cadence="irregular",
        licence=None,
        licence_url=None,
        licence_decided_at=date(2026, 7, 17),
        manual_path_env="REGIONAL_POOL_PATH",
        notes="Reuse terms require confirmation.",
    )

    assert source.publication_state == "quarantined"
    assert source.manual_path_env == "REGIONAL_POOL_PATH"
    assert source.countries == ["ZA", "BW"]


def test_region_rejects_score_outside_range() -> None:
    with pytest.raises(ValidationError):
        RegionProperties(
            id="DE71",
            name="Darmstadt",
            country="DE",
            score_year=2030,
            scores=LensScores(
                infrastructure_demand=101,
                site_attractiveness=60,
                system_risk=40,
            ),
            confidence=72,
            coverage=76,
            value_kind=ValueKind.ESTIMATED,
            updated_at=datetime.now(UTC),
        )


def test_connector_state_names_are_stable() -> None:
    assert {state.value for state in ConnectorState} == {
        "current",
        "cached",
        "stale",
        "failed",
        "not_configured",
    }


def test_region_rejects_naive_timestamp() -> None:
    with pytest.raises(ValidationError):
        RegionProperties(
            id="DE71",
            name="Darmstadt",
            country="DE",
            score_year=2030,
            scores=LensScores(
                infrastructure_demand=78,
                site_attractiveness=60,
                system_risk=40,
            ),
            confidence=72,
            coverage=76,
            value_kind=ValueKind.ESTIMATED,
            updated_at=datetime(2026, 6, 27, 4, 12),
        )


def test_asset_supports_water_infrastructure_subtypes() -> None:
    asset = AssetProperties(
        id="asset-ae-desal-1",
        name="Example plant",
        geography_id="AE",
        category="water_infrastructure",
        subtype="desalination",
        lifecycle="under_construction",
        demand_mw=DemandRange(low=42, central=50, high=61),
        location_precision="city_centroid",
        value_kind="estimated",
        source_ids=["source-1"],
    )

    assert asset.category == "water_infrastructure"
    assert asset.subtype == "desalination"


@pytest.mark.parametrize(
    ("category", "subtype"),
    [
        ("data_centre", "hyperscale"),
        ("data_centre", "colocation"),
        ("data_centre", "cloud"),
        ("data_centre", "ai_hpc"),
        ("data_centre", "other_data_centre"),
        ("water_infrastructure", "desalination"),
        ("water_infrastructure", "wastewater"),
        ("water_infrastructure", "water_reuse"),
        ("water_infrastructure", "pipeline_pumping"),
        ("water_infrastructure", "reservoir"),
    ],
)
def test_non_generation_assets_accept_only_their_valid_subtypes(category: str, subtype: str) -> None:
    asset = AssetProperties(
        id=f"valid-{category}-{subtype}",
        name="Valid infrastructure asset",
        geography_id="US",
        category=category,
        subtype=subtype,
        lifecycle="operational",
        location_precision="exact",
        value_kind="observed",
        source_ids=["source-1"],
    )

    assert asset.subtype == subtype


@pytest.mark.parametrize(
    ("category", "subtype"),
    [
        ("data_centre", "desalination"),
        ("data_centre", "wastewater"),
        ("data_centre", "water_reuse"),
        ("data_centre", "pipeline_pumping"),
        ("data_centre", "reservoir"),
        ("water_infrastructure", "hyperscale"),
        ("water_infrastructure", "colocation"),
        ("water_infrastructure", "cloud"),
        ("water_infrastructure", "ai_hpc"),
        ("water_infrastructure", "other_data_centre"),
    ],
)
def test_non_generation_assets_reject_cross_family_subtypes(category: str, subtype: str) -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id=f"invalid-{category}-{subtype}",
            name="Invalid infrastructure asset",
            geography_id="US",
            category=category,
            subtype=subtype,
            lifecycle="operational",
            location_precision="exact",
            value_kind="observed",
            source_ids=["source-1"],
        )


def test_asset_preserves_public_provenance_fields() -> None:
    asset = AssetProperties(
        id="osm-node-101",
        name="Alpha DC",
        operator="Alpha Cloud",
        geography_id="US",
        category="data_centre",
        subtype="other_data_centre",
        lifecycle="operational",
        location_precision="exact",
        value_kind="observed",
        source_ids=["openstreetmap-infrastructure"],
        source_type="community_mapped",
        source_url="https://www.openstreetmap.org/node/101",
        external_ids={"osm": "node/101"},
        last_observed_at=datetime(2026, 6, 27, tzinfo=UTC),
    )

    dumped = asset.model_dump(by_alias=True, mode="json")
    assert dumped["sourceType"] == "community_mapped"
    assert dumped["sourceUrl"] == "https://www.openstreetmap.org/node/101"
    assert dumped["externalIds"] == {"osm": "node/101"}


def test_asset_rejects_demand_without_sources() -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id="asset-us-dc-1",
            name="Uncited campus",
            geography_id="US",
            category="data_centre",
            subtype="hyperscale",
            lifecycle="announced",
            demand_mw=DemandRange(low=90, central=100, high=120),
            location_precision="region_centroid",
            value_kind="estimated",
            source_ids=[],
        )


def test_geography_has_country_peer_level() -> None:
    geography = GeographyProperties(
        id="AE",
        name="United Arab Emirates",
        country="AE",
        level="country",
        parent_id=None,
        score_year=2030,
        scores=LensScores(
            infrastructure_demand=72,
            site_attractiveness=68,
            system_risk=55,
        ),
        confidence=80,
        coverage=90,
        value_kind="reported",
        updated_at=datetime.now(UTC),
    )

    assert geography.peer_level == "country"


def test_power_generation_contract_keeps_reported_and_estimated_supply_separate() -> None:
    assert AssetCategory.POWER_GENERATION == "power_generation"
    assert {technology.value for technology in GenerationTechnology} == {
        "solar",
        "wind",
        "hydro",
        "nuclear",
        "gas",
        "coal",
        "oil",
        "biomass",
        "geothermal",
        "other",
    }

    metrics = PowerBalanceMetrics(
        demand_gwh={"low": 980, "central": 1000, "high": 1040},
        local_generation_gwh={"low": 760, "central": 820, "high": 890},
        local_generation_gap_gwh={"low": 90, "central": 180, "high": 280},
        net_balance_gwh=None,
        observed_unmet_demand_gwh=None,
        installed_capacity_mw=420,
        dependable_capacity_mw={"low": 210, "central": 275, "high": 330},
        peak_demand_mw={"low": 290, "central": 310, "high": 340},
    )

    assert metrics.local_generation_gap_gwh.central == 180
    assert metrics.net_balance_gwh is None


def test_power_balance_contract_allows_signed_balance() -> None:
    metrics = PowerBalanceMetrics(
        demand_gwh={"low": 980, "central": 1000, "high": 1040},
        local_generation_gwh={"low": 1020, "central": 1100, "high": 1180},
        local_generation_gap_gwh={"low": -200, "central": -100, "high": 20},
        net_balance_gwh={"low": -150, "central": -50, "high": 60},
        observed_unmet_demand_gwh=0,
        installed_capacity_mw=420,
        dependable_capacity_mw={"low": 210, "central": 275, "high": 330},
        peak_demand_mw={"low": 290, "central": 310, "high": 340},
    )

    assert metrics.net_balance_gwh is not None
    assert metrics.net_balance_gwh.low == -150


def test_power_balance_contract_preserves_unavailable_supply_without_false_zero() -> None:
    metrics = PowerBalanceMetrics(
        demand_gwh={"low": 980, "central": 1000, "high": 1040},
        local_generation_gwh=None,
        local_generation_gap_gwh=None,
        net_balance_gwh=None,
        observed_unmet_demand_gwh=None,
        installed_capacity_mw=None,
        dependable_capacity_mw=None,
        peak_demand_mw={"low": 290, "central": 310, "high": 340},
    )

    dumped = metrics.model_dump(by_alias=True)
    assert dumped["localGenerationGwh"] is None
    assert dumped["localGenerationGapGwh"] is None
    assert dumped["installedCapacityMw"] is None
    with pytest.raises(ValidationError, match="supply metrics"):
        PowerBalanceMetrics(
            demand_gwh={"low": 980, "central": 1000, "high": 1040},
            local_generation_gwh=None,
            local_generation_gap_gwh={"low": 0, "central": 0, "high": 0},
            installed_capacity_mw=None,
            dependable_capacity_mw=None,
            peak_demand_mw={"low": 290, "central": 310, "high": 340},
        )


def test_power_balance_contract_rejects_unordered_ranges() -> None:
    with pytest.raises(ValidationError):
        PowerBalanceMetrics(
            demand_gwh={"low": 1040, "central": 1000, "high": 980},
            local_generation_gwh={"low": 760, "central": 820, "high": 890},
            local_generation_gap_gwh={"low": 90, "central": 180, "high": 280},
            installed_capacity_mw=420,
            dependable_capacity_mw={"low": 210, "central": 275, "high": 330},
            peak_demand_mw={"low": 290, "central": 310, "high": 340},
        )


@pytest.mark.parametrize(
    ("field_name", "negative_value"),
    [
        ("demand_gwh", {"low": -1, "central": 1000, "high": 1040}),
        ("local_generation_gwh", {"low": -1, "central": 820, "high": 890}),
        ("installed_capacity_mw", -1),
        ("dependable_capacity_mw", {"low": -1, "central": 275, "high": 330}),
        ("peak_demand_mw", {"low": -1, "central": 310, "high": 340}),
        ("observed_unmet_demand_gwh", -1),
    ],
)
def test_power_balance_contract_rejects_negative_physical_inputs(
    field_name: str,
    negative_value: object,
) -> None:
    metrics = {
        "demand_gwh": {"low": 980, "central": 1000, "high": 1040},
        "local_generation_gwh": {"low": 760, "central": 820, "high": 890},
        "local_generation_gap_gwh": {"low": 90, "central": 180, "high": 280},
        "installed_capacity_mw": 420,
        "dependable_capacity_mw": {"low": 210, "central": 275, "high": 330},
        "peak_demand_mw": {"low": 290, "central": 310, "high": 340},
        field_name: negative_value,
    }

    with pytest.raises(ValidationError):
        PowerBalanceMetrics(**metrics)


def test_regional_energy_forecast_preserves_year_metrics_and_provenance() -> None:
    metrics = {
        "demandGwh": {"low": 980, "central": 1000, "high": 1040},
        "localGenerationGwh": {"low": 760, "central": 820, "high": 890},
        "localGenerationGapGwh": {"low": 90, "central": 180, "high": 280},
        "netBalanceGwh": None,
        "observedUnmetDemandGwh": None,
        "installedCapacityMw": 420,
        "dependableCapacityMw": {"low": 210, "central": 275, "high": 330},
        "peakDemandMw": {"low": 290, "central": 310, "high": 340},
    }

    for year in range(2026, 2032):
        forecast = RegionalEnergyForecast(
            year=year,
            metrics=metrics,
            method_id="regional-energy-v1",
            source_ids=["source-generation", "source-demand"],
            confidence=74,
            coverage=82,
            value_kind="estimated",
        )
        dumped = forecast.model_dump(by_alias=True, mode="json")
        assert dumped["year"] == year
        assert dumped["methodId"] == "regional-energy-v1"
        assert dumped["sourceIds"] == ["source-generation", "source-demand"]
        assert dumped["confidence"] == 74
        assert dumped["coverage"] == 82
        assert dumped["valueKind"] == "estimated"

    for invalid_year in (2025, 2032):
        with pytest.raises(ValidationError):
            RegionalEnergyForecast(
                year=invalid_year,
                metrics=metrics,
                method_id="regional-energy-v1",
                source_ids=["source-generation"],
                confidence=74,
                coverage=82,
                value_kind="estimated",
            )


def test_power_generation_asset_preserves_generation_fields_and_lineage() -> None:
    asset = AssetProperties(
        id="generator-de-solar-1-unit-a",
        name="Example Solar Unit A",
        geography_id="DE12",
        category="power_generation",
        lifecycle="operational",
        technology="solar",
        secondary_fuel="battery storage",
        capacity_mw={"low": 98, "central": 100, "high": 102},
        dependable_capacity_mw={"low": 8, "central": 12, "high": 16},
        annual_generation_gwh={"low": 90, "central": 105, "high": 120},
        commissioning_year=2020,
        retirement_year=2050,
        plant_id="generator-de-solar-1",
        unit_id="unit-a",
        location_precision="exact",
        value_kind="reported",
        source_ids=["official-generator-register"],
    )

    dumped = asset.model_dump(by_alias=True, mode="json")
    assert dumped["category"] == "power_generation"
    assert dumped["technology"] == "solar"
    assert dumped["secondaryFuel"] == "battery storage"
    assert dumped["capacityMw"]["central"] == 100
    assert dumped["dependableCapacityMw"]["central"] == 12
    assert dumped["annualGenerationGwh"]["central"] == 105
    assert dumped["commissioningYear"] == 2020
    assert dumped["retirementYear"] == 2050
    assert dumped["plantId"] == "generator-de-solar-1"
    assert dumped["unitId"] == "unit-a"
    assert dumped["sourceIds"] == ["official-generator-register"]
    assert dumped["lifecycle"] == "operational"
    assert dumped["valueKind"] == "reported"


def test_power_generation_asset_requires_technology() -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id="generator-without-technology",
            name="Unknown generator",
            geography_id="DE12",
            category="power_generation",
            lifecycle="operational",
            capacity_mw={"low": 98, "central": 100, "high": 102},
            location_precision="exact",
            value_kind="reported",
            source_ids=["official-generator-register"],
        )


def test_non_generation_asset_still_requires_subtype() -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id="asset-us-dc-without-subtype",
            name="Unclassified data centre",
            geography_id="US",
            category="data_centre",
            lifecycle="operational",
            location_precision="region_centroid",
            value_kind="observed",
            source_ids=["source-1"],
        )


@pytest.mark.parametrize("field_name", ["capacity_mw", "dependable_capacity_mw", "annual_generation_gwh"])
@pytest.mark.parametrize("value_kind", ["reported", "estimated"])
@pytest.mark.parametrize(
    "source_ids",
    [[], [""], ["   "], ["", "official-generator-register"], ["official-generator-register", "   "]],
)
def test_reported_or_estimated_generation_metrics_require_nonblank_evidence(
    field_name: str,
    value_kind: str,
    source_ids: list[str],
) -> None:
    generation_values = {
        field_name: {"low": 98, "central": 100, "high": 102},
    }

    with pytest.raises(ValidationError):
        AssetProperties(
            id=f"uncited-{value_kind}-generator",
            name="Uncited generator",
            geography_id="DE12",
            category="power_generation",
            lifecycle="operational",
            technology="gas",
            location_precision="exact",
            value_kind=value_kind,
            source_ids=source_ids,
            **generation_values,
        )


@pytest.mark.parametrize(
    "field_name",
    ["capacity_mw", "dependable_capacity_mw", "annual_generation_gwh"],
)
def test_power_generation_asset_rejects_negative_capacity_or_generation(field_name: str) -> None:
    generation_values = {
        field_name: {"low": -1, "central": 10, "high": 20},
    }

    with pytest.raises(ValidationError):
        AssetProperties(
            id=f"negative-{field_name}",
            name="Invalid generator",
            geography_id="DE12",
            category="power_generation",
            lifecycle="operational",
            technology="wind",
            location_precision="exact",
            value_kind="reported",
            source_ids=["official-generator-register"],
            **generation_values,
        )


@pytest.mark.parametrize("method_id", ["", "   "])
def test_regional_energy_forecast_requires_nonblank_method_id(method_id: str) -> None:
    with pytest.raises(ValidationError):
        RegionalEnergyForecast(
            year=2026,
            metrics={
                "demand_gwh": {"low": 980, "central": 1000, "high": 1040},
                "local_generation_gwh": {"low": 760, "central": 820, "high": 890},
                "local_generation_gap_gwh": {"low": 90, "central": 180, "high": 280},
                "installed_capacity_mw": 420,
                "dependable_capacity_mw": {"low": 210, "central": 275, "high": 330},
                "peak_demand_mw": {"low": 290, "central": 310, "high": 340},
            },
            method_id=method_id,
            source_ids=["source-generation"],
            confidence=74,
            coverage=82,
            value_kind="estimated",
        )


@pytest.mark.parametrize(
    "source_ids",
    [[], [""], ["   "], ["", "source-generation"], ["source-generation", "   "]],
)
def test_regional_energy_forecast_requires_nonblank_source_id(source_ids: list[str]) -> None:
    with pytest.raises(ValidationError):
        RegionalEnergyForecast(
            year=2026,
            metrics={
                "demand_gwh": {"low": 980, "central": 1000, "high": 1040},
                "local_generation_gwh": {"low": 760, "central": 820, "high": 890},
                "local_generation_gap_gwh": {"low": 90, "central": 180, "high": 280},
                "installed_capacity_mw": 420,
                "dependable_capacity_mw": {"low": 210, "central": 275, "high": 330},
                "peak_demand_mw": {"low": 290, "central": 310, "high": 340},
            },
            method_id="regional-energy-v1",
            source_ids=source_ids,
            confidence=74,
            coverage=82,
            value_kind="estimated",
        )


@pytest.mark.parametrize(
    ("field_name", "generation_value"),
    [
        ("technology", "solar"),
        ("secondary_fuel", "battery storage"),
        ("capacity_mw", {"low": 98, "central": 100, "high": 102}),
        ("dependable_capacity_mw", {"low": 8, "central": 12, "high": 16}),
        ("annual_generation_gwh", {"low": 90, "central": 105, "high": 120}),
        ("commissioning_year", 2020),
        ("retirement_year", 2050),
        ("plant_id", "plant-1"),
        ("unit_id", "unit-a"),
    ],
)
def test_non_generation_assets_reject_generation_only_fields(
    field_name: str,
    generation_value: object,
) -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id=f"asset-with-{field_name}",
            name="Invalid data centre",
            geography_id="US",
            category="data_centre",
            subtype="hyperscale",
            lifecycle="operational",
            location_precision="exact",
            value_kind="observed",
            source_ids=["source-1"],
            **{field_name: generation_value},
        )


def test_power_generation_asset_rejects_infrastructure_subtype() -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id="generator-with-infrastructure-subtype",
            name="Invalid generator",
            geography_id="DE12",
            category="power_generation",
            subtype="hyperscale",
            lifecycle="operational",
            technology="solar",
            location_precision="exact",
            value_kind="observed",
            source_ids=["source-1"],
        )


@pytest.mark.parametrize(
    "field_name",
    [
        "demand_gwh",
        "local_generation_gwh",
        "local_generation_gap_gwh",
        "net_balance_gwh",
        "dependable_capacity_mw",
        "peak_demand_mw",
    ],
)
@pytest.mark.parametrize("nonfinite", [float("nan"), float("inf"), float("-inf")])
def test_power_balance_rejects_nonfinite_ranges(field_name: str, nonfinite: float) -> None:
    metrics = {
        "demand_gwh": {"low": 980, "central": 1000, "high": 1040},
        "local_generation_gwh": {"low": 760, "central": 820, "high": 890},
        "local_generation_gap_gwh": {"low": 90, "central": 180, "high": 280},
        "net_balance_gwh": {"low": -20, "central": 0, "high": 20},
        "installed_capacity_mw": 420,
        "dependable_capacity_mw": {"low": 210, "central": 275, "high": 330},
        "peak_demand_mw": {"low": 290, "central": 310, "high": 340},
        field_name: {"low": nonfinite, "central": nonfinite, "high": nonfinite},
    }

    with pytest.raises(ValidationError):
        PowerBalanceMetrics(**metrics)


@pytest.mark.parametrize("field_name", ["installed_capacity_mw", "observed_unmet_demand_gwh"])
@pytest.mark.parametrize("nonfinite", [float("nan"), float("inf"), float("-inf")])
def test_power_balance_rejects_nonfinite_scalars(field_name: str, nonfinite: float) -> None:
    metrics = {
        "demand_gwh": {"low": 980, "central": 1000, "high": 1040},
        "local_generation_gwh": {"low": 760, "central": 820, "high": 890},
        "local_generation_gap_gwh": {"low": 90, "central": 180, "high": 280},
        "installed_capacity_mw": 420,
        "dependable_capacity_mw": {"low": 210, "central": 275, "high": 330},
        "peak_demand_mw": {"low": 290, "central": 310, "high": 340},
        field_name: nonfinite,
    }

    with pytest.raises(ValidationError):
        PowerBalanceMetrics(**metrics)


@pytest.mark.parametrize("field_name", ["capacity_mw", "dependable_capacity_mw", "annual_generation_gwh"])
@pytest.mark.parametrize("nonfinite", [float("nan"), float("inf"), float("-inf")])
def test_power_generation_asset_rejects_nonfinite_ranges(field_name: str, nonfinite: float) -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id=f"nonfinite-{field_name}",
            name="Invalid generator",
            geography_id="DE12",
            category="power_generation",
            lifecycle="operational",
            technology="wind",
            location_precision="exact",
            value_kind="reported",
            source_ids=["official-generator-register"],
            **{field_name: {"low": nonfinite, "central": nonfinite, "high": nonfinite}},
        )


@pytest.mark.parametrize("field_name", ["confidence", "coverage"])
@pytest.mark.parametrize("nonfinite", [float("nan"), float("inf"), float("-inf")])
def test_regional_energy_forecast_rejects_nonfinite_quality_metrics(
    field_name: str,
    nonfinite: float,
) -> None:
    forecast = {
        "year": 2026,
        "metrics": {
            "demand_gwh": {"low": 980, "central": 1000, "high": 1040},
            "local_generation_gwh": {"low": 760, "central": 820, "high": 890},
            "local_generation_gap_gwh": {"low": 90, "central": 180, "high": 280},
            "installed_capacity_mw": 420,
            "dependable_capacity_mw": {"low": 210, "central": 275, "high": 330},
            "peak_demand_mw": {"low": 290, "central": 310, "high": 340},
        },
        "method_id": "regional-energy-v1",
        "source_ids": ["source-generation"],
        "confidence": 74,
        "coverage": 82,
        "value_kind": "estimated",
        field_name: nonfinite,
    }

    with pytest.raises(ValidationError):
        RegionalEnergyForecast(**forecast)


@pytest.mark.parametrize("field_name", ["commissioning_year", "retirement_year"])
@pytest.mark.parametrize("invalid_year", [0, -1, float("nan"), float("inf"), float("-inf")])
def test_power_generation_asset_rejects_nonpositive_or_nonfinite_years(
    field_name: str,
    invalid_year: float,
) -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id=f"invalid-{field_name}",
            name="Invalid generator",
            geography_id="DE12",
            category="power_generation",
            lifecycle="operational",
            technology="wind",
            location_precision="exact",
            value_kind="observed",
            source_ids=["official-generator-register"],
            **{field_name: invalid_year},
        )


def test_power_generation_asset_rejects_retirement_before_commissioning() -> None:
    with pytest.raises(ValidationError):
        AssetProperties(
            id="generator-with-reversed-lifecycle-years",
            name="Invalid generator",
            geography_id="DE12",
            category="power_generation",
            lifecycle="operational",
            technology="wind",
            commissioning_year=2030,
            retirement_year=2029,
            location_precision="exact",
            value_kind="observed",
            source_ids=["official-generator-register"],
        )

from grid_scope.connectors.africa_grid import normalize_africa_grid
from grid_scope.connectors.dre_atlas import normalize_dre_regions
from grid_scope.connectors.iea_africa import aggregate_building_demand, normalize_iea_catalogue


def test_africa_grid_remains_context_not_connection_capacity() -> None:
    segments = normalize_africa_grid({"type": "FeatureCollection", "features": [{
        "id": "line-1",
        "geometry": {"type": "LineString", "coordinates": [[1, 2], [3, 4]]},
        "properties": {"country": "NG", "voltage_kv": 132, "status": "existing"},
    }]})

    assert segments[0]["voltageKv"] == 132
    assert segments[0]["publicationState"] == "quarantined"
    assert "availableCapacityMw" not in segments[0]


def test_dre_and_iea_inputs_remain_estimated_and_unit_safe() -> None:
    regions = normalize_dre_regions([{
        "admin1_id": "NG-LA",
        "electrification_rate": 0.91,
        "settlement_population": 1000000,
    }])
    demand = aggregate_building_demand([
        {"admin1_id": "NG-LA", "annual_demand_kwh": 1000000},
        {"admin1_id": "NG-LA", "annual_demand_kwh": 2000000},
    ])

    assert regions[0]["electrificationRate"] == 0.91
    assert demand[0]["demandGwh"] == 3.0
    assert demand[0]["valueKind"] == "estimated"
    assert demand[0]["methodId"] == "iea-building-demand-africa-v1"


def test_iea_catalogue_is_discovery_metadata_only() -> None:
    entries = normalize_iea_catalogue([{
        "title": "Example grid resource",
        "url": "https://example.org/grid",
        "country": "Kenya",
        "license": "Open Access",
    }])

    assert entries[0]["recordType"] == "source_discovery"
    assert "coordinates" not in entries[0]
    assert "sourceIds" not in entries[0]

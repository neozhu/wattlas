from grid_scope.connectors.south_america import (
    normalize_official_power_rows,
    normalize_olade_controls,
)


def test_official_south_america_rows_keep_units_and_quarantine() -> None:
    records = normalize_official_power_rows([{
        "id": "UY-1", "name": "Parque Eólico Este", "country": "UY",
        "technology": "wind", "status": "operational", "capacity_kw": 50000,
        "latitude": -34.2, "longitude": -54.3,
    }], source_id="uruguay-adme")
    assert records[0]["capacityMw"]["central"] == 50
    assert records[0]["publicationState"] == "quarantined"
    assert records[0]["sourceIds"] == ["uruguay-adme"]


def test_olade_controls_validate_countries_without_creating_facilities() -> None:
    controls = normalize_olade_controls([{
        "country_iso3": "PER", "year": 2025,
        "demand_gwh": 55000, "generation_gwh": 60000,
    }])
    assert controls[0]["countryIso3"] == "PER"
    assert controls[0]["demandGwh"] == 55000
    assert controls[0]["recordType"] == "national_control"
    assert "coordinates" not in controls[0]

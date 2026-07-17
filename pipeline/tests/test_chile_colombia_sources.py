from grid_scope.connectors.chile import normalize_chile_generators, normalize_sea_projects
from grid_scope.connectors.colombia import normalize_ipse_zones, normalize_xm_demand


def test_chile_generator_keeps_capacity_generation_and_lifecycle_separate() -> None:
    records = normalize_chile_generators([{
        "id": "CEN-1", "name": "Parque Eólico Sur", "technology": "Eolica",
        "status": "En Operación", "capacity_mw": 120,
        "annual_generation_gwh": 410, "commissioning_year": 2024,
        "latitude": -40.1, "longitude": -73.2,
    }])
    assert records[0]["capacityMw"]["central"] == 120
    assert records[0]["annualGenerationGwh"]["central"] == 410
    assert records[0]["lifecycle"] == "operational"


def test_chile_sea_approval_is_not_operational_status() -> None:
    projects = normalize_sea_projects([{
        "id": "SEA-1", "name": "Planta Desaladora Norte", "status": "Aprobado",
        "latitude": -23.5, "longitude": -70.4, "capacity_lps": 240,
    }])
    assert projects[0]["category"] == "water_infrastructure"
    assert projects[0]["lifecycle"] == "permitted"
    assert projects[0]["publicationState"] == "quarantined"


def test_colombia_demand_and_ipse_zone_units_are_explicit() -> None:
    demand = normalize_xm_demand([{
        "department": "Antioquia", "year": 2025, "demand_mwh": 1200000
    }])
    zones = normalize_ipse_zones([{
        "id": "ZNI-1", "name": "Amazonas ZNI", "department": "Amazonas",
        "installed_capacity_kw": 2500, "generation_mwh": 9000,
        "latitude": -1.2, "longitude": -71.9,
    }])
    assert demand[0]["demandGwh"] == 1200
    assert zones[0]["capacityMw"]["central"] == 2.5
    assert zones[0]["annualGenerationGwh"]["central"] == 9

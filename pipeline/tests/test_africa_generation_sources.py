from pathlib import Path

from grid_scope.connectors.afdb_mapafrica import normalize_mapafrica_projects
from grid_scope.connectors.gem_power import parse_gem_africa_energy_tracker


FIXTURES = Path(__file__).parent / "fixtures"


def test_gem_africa_release_uses_distinct_source_lineage() -> None:
    records = parse_gem_africa_energy_tracker(
        FIXTURES / "gem-power-sample.csv"
    )

    assert records
    assert all(record["sourceIds"] == ["gem-africa-energy-tracker"] for record in records)
    assert all(record["publicationState"] == "publishable" for record in records)


def test_mapafrica_does_not_convert_project_budget_to_capacity() -> None:
    records = normalize_mapafrica_projects({"features": [{
        "id": "P-1",
        "geometry": {"type": "Point", "coordinates": [3.4, 6.5]},
        "properties": {
            "name": "Lagos Solar Programme",
            "country": "NG",
            "sector": "Energy",
            "status": "ongoing",
            "approval_date": "2025-01-01",
            "completion_date": "2028-12-31",
            "budget_usd": 200000000,
        },
    }]})

    assert len(records) == 1
    assert records[0]["name"] == "Lagos Solar Programme"
    assert records[0]["publicationState"] == "quarantined"
    assert "capacityMw" not in records[0]
    assert records[0]["projectBudgetUsd"] == 200000000

from datetime import date
import json
from pathlib import Path

import pytest

from grid_scope.source_catalog import SourceCatalog, load_source_catalog


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = PROJECT_ROOT / "data" / "curated" / "source-catalog.json"

APPROVED_SOURCE_IDS = {
    "gem-global-integrated-power-tracker",
    "gem-africa-energy-tracker",
    "world-bank-dre-atlas",
    "world-bank-africa-electricity-grid",
    "iea-africa-gis-catalogue",
    "iea-building-demand-africa",
    "afdb-mapafrica",
    "peeringdb",
    "sapp",
    "eskom",
    "ecowas-waeis",
    "brazil-aneel-siga",
    "brazil-epe-webmap",
    "brazil-epe-consumption",
    "brazil-ons-load",
    "chile-coordinador",
    "chile-sea-projects",
    "colombia-xm-simem",
    "colombia-ipse",
    "peru-coes",
    "peru-minem",
    "ecuador-cenace",
    "uruguay-adme",
    "argentina-official-power",
    "olade-sielac",
    "iea-hydrogen-production-2026",
    "iea-hydrogen-infrastructure-2026",
    "gem-global-cement-concrete-2025",
    "gem-global-steel-plants-2026",
    "gem-global-steel-units-2026",
    "gem-global-iron-units-2026",
}


def test_curated_catalog_contains_every_approved_source() -> None:
    catalog = load_source_catalog(CATALOG_PATH)

    assert APPROVED_SOURCE_IDS <= set(catalog.by_id)
    assert catalog.by_id["sapp"].publication_state == "quarantined"
    assert catalog.by_id["ecowas-waeis"].publication_state == "quarantined"
    assert catalog.by_id["gem-africa-energy-tracker"].access_mode == "manual_snapshot"
    assert catalog.by_id["gem-global-integrated-power-tracker"].publication_state == "publishable"
    assert catalog.by_id["brazil-aneel-siga"].publication_state == "publishable"
    assert catalog.by_id["brazil-epe-consumption"].publication_state == "publishable"
    assert catalog.by_id["world-bank-africa-electricity-grid"].licence == "ODbL 1.0"


def test_catalog_rejects_duplicate_source_ids(tmp_path: Path) -> None:
    path = tmp_path / "sources.json"
    source = {
        "id": "duplicate",
        "name": "Duplicate",
        "publisher": "Publisher",
        "url": "https://example.com/data",
        "categories": ["generation"],
        "continents": ["Africa"],
        "countries": [],
        "accessMode": "automatic",
        "publicationState": "publishable",
        "refreshCadence": "monthly",
        "licence": "CC BY 4.0",
        "licenceUrl": "https://creativecommons.org/licenses/by/4.0/",
        "licenceDecidedAt": date(2026, 7, 17).isoformat(),
    }
    path.write_text(json.dumps({"schemaVersion": "1.0", "sources": [source, source]}))

    with pytest.raises(ValueError, match="duplicate source ID"):
        load_source_catalog(path)


def test_catalog_indexes_categories_and_geographies() -> None:
    catalog = load_source_catalog(CATALOG_PATH)

    assert "brazil-aneel-siga" in {
        source.id for source in catalog.for_country("BR")
    }
    assert "gem-africa-energy-tracker" in {
        source.id for source in catalog.for_continent("Africa")
    }
    assert "peeringdb" in {
        source.id for source in catalog.for_category("digital_infrastructure")
    }
    assert isinstance(catalog, SourceCatalog)


@pytest.mark.parametrize(
    ("source_id", "path_env"),
    [
        ("iea-hydrogen-production-2026", "IEA_HYDROGEN_PRODUCTION_PATH"),
        ("iea-hydrogen-infrastructure-2026", "IEA_HYDROGEN_INFRASTRUCTURE_PATH"),
        ("gem-global-cement-concrete-2025", "GEM_CEMENT_CONCRETE_PATH"),
        ("gem-global-steel-plants-2026", "GEM_STEEL_PLANTS_PATH"),
        ("gem-global-steel-units-2026", "GEM_STEEL_UNITS_PATH"),
        ("gem-global-iron-units-2026", "GEM_IRON_UNITS_PATH"),
    ],
)
def test_industrial_demand_sources_are_publishable_manual_snapshots(
    source_id: str, path_env: str
) -> None:
    source = load_source_catalog(CATALOG_PATH).by_id[source_id]

    assert source.access_mode == "manual_snapshot"
    assert source.publication_state == "publishable"
    assert source.refresh_cadence == "manual"
    assert source.licence == "CC BY 4.0"
    assert source.manual_path_env == path_env
    assert {"demand", "projects"} & set(source.categories)

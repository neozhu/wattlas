from datetime import date
import json
from pathlib import Path

import pytest

from grid_scope.source_catalog import SourceCatalog, load_source_catalog


PROJECT_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = PROJECT_ROOT / "data" / "curated" / "source-catalog.json"

APPROVED_SOURCE_IDS = {
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
}


def test_curated_catalog_contains_every_approved_source() -> None:
    catalog = load_source_catalog(CATALOG_PATH)

    assert APPROVED_SOURCE_IDS <= set(catalog.by_id)
    assert catalog.by_id["sapp"].publication_state == "quarantined"
    assert catalog.by_id["ecowas-waeis"].publication_state == "quarantined"
    assert catalog.by_id["gem-africa-energy-tracker"].access_mode == "manual_snapshot"
    assert catalog.by_id["brazil-aneel-siga"].publication_state == "publishable"


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

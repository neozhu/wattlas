from grid_scope.coverage_report import build_source_coverage_summary
from grid_scope.source_catalog import load_source_catalog
from grid_scope.config import SOURCE_CATALOG_PATH


def test_source_coverage_summary_counts_publication_and_access_states() -> None:
    catalog = load_source_catalog(SOURCE_CATALOG_PATH)
    summary = build_source_coverage_summary(
        catalog,
        connector_states={
            "brazil-aneel-siga": "current",
            "gem-africa-energy-tracker": "not_configured",
            "sapp": "not_configured",
        },
        published_records_by_source={"brazil-aneel-siga": 321},
    )

    assert summary["sourcesByPublicationState"]["publishable"] >= 3
    assert summary["sourcesByPublicationState"]["quarantined"] > 0
    assert summary["connectorStates"]["current"] == 1
    assert summary["publishedRecords"] == 321
    assert summary["publishedRecordsBySource"] == {"brazil-aneel-siga": 321}

from datetime import UTC, datetime

from grid_scope.models import ConnectorState
from grid_scope.source_batches import SOURCE_BATCHES, run_source_batch
from grid_scope.source_catalog import load_source_catalog
from grid_scope.config import SOURCE_CATALOG_PATH


def test_source_batches_preserve_approved_order() -> None:
    assert list(SOURCE_BATCHES) == ["batch_1", "batch_2", "batch_3", "batch_4", "batch_5"]
    assert "gem-africa-energy-tracker" in SOURCE_BATCHES["batch_1"]
    assert "brazil-aneel-siga" in SOURCE_BATCHES["batch_3"]
    assert "olade-sielac" in SOURCE_BATCHES["batch_5"]


def test_one_source_failure_does_not_discard_independent_records() -> None:
    catalog = load_source_catalog(SOURCE_CATALOG_PATH)

    outcome = run_source_batch(
        "batch_3",
        catalog=catalog,
        tasks={
            "brazil-aneel-siga": lambda: [{"id": "plant-1"}],
            "brazil-epe-webmap": lambda: (_ for _ in ()).throw(RuntimeError("offline")),
        },
        now=datetime(2026, 7, 17, tzinfo=UTC),
    )

    assert outcome.records == ({"id": "plant-1", "publicationState": "publishable"},)
    statuses = {result.source_id: result for result in outcome.connectors}
    assert statuses["brazil-aneel-siga"].state == ConnectorState.CURRENT
    assert statuses["brazil-epe-webmap"].state == ConnectorState.FAILED
    assert statuses["brazil-epe-consumption"].state == ConnectorState.NOT_CONFIGURED

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Mapping

from grid_scope.connectors.base import ConnectorResult
from grid_scope.models import ConnectorState, PublicationState
from grid_scope.source_catalog import SourceCatalog


SOURCE_BATCHES: dict[str, tuple[str, ...]] = {
    "batch_1": (
        "gem-africa-energy-tracker",
        "world-bank-dre-atlas",
        "world-bank-africa-electricity-grid",
        "iea-africa-gis-catalogue",
        "iea-building-demand-africa",
        "afdb-mapafrica",
        "peeringdb",
    ),
    "batch_2": ("sapp", "eskom", "ecowas-waeis"),
    "batch_3": (
        "brazil-aneel-siga",
        "brazil-epe-webmap",
        "brazil-epe-consumption",
        "brazil-ons-load",
    ),
    "batch_4": (
        "chile-coordinador",
        "chile-sea-projects",
        "colombia-xm-simem",
        "colombia-ipse",
    ),
    "batch_5": (
        "peru-coes",
        "peru-minem",
        "ecuador-cenace",
        "uruguay-adme",
        "argentina-official-power",
        "olade-sielac",
    ),
}


@dataclass(frozen=True)
class SourceBatchOutcome:
    batch_id: str
    records: tuple[dict[str, Any], ...]
    quarantined_records: tuple[dict[str, Any], ...]
    connectors: tuple[ConnectorResult, ...]


def run_source_batch(
    batch_id: str,
    *,
    catalog: SourceCatalog,
    tasks: Mapping[str, Callable[[], list[dict[str, Any]]]],
    now: datetime,
) -> SourceBatchOutcome:
    del now
    source_ids = SOURCE_BATCHES.get(batch_id)
    if source_ids is None:
        raise ValueError(f"unknown source batch: {batch_id}")
    public_records: list[dict[str, Any]] = []
    quarantined_records: list[dict[str, Any]] = []
    connectors: list[ConnectorResult] = []
    for source_id in source_ids:
        descriptor = catalog.by_id[source_id]
        publication_state = PublicationState(descriptor.publication_state)
        task = tasks.get(source_id)
        if task is None:
            connectors.append(ConnectorResult(
                source_id=source_id,
                state=ConnectorState.NOT_CONFIGURED,
                payload=None,
                publication_state=publication_state,
                message="No endpoint, credential, or manual capture is configured.",
            ))
            continue
        try:
            records = task()
            if any(not isinstance(record, dict) for record in records):
                raise ValueError("source task returned a non-object record")
            tagged = [
                {**record, "publicationState": publication_state.value}
                for record in records
            ]
            if publication_state == PublicationState.PUBLISHABLE:
                public_records.extend(tagged)
            else:
                quarantined_records.extend(tagged)
            connectors.append(ConnectorResult(
                source_id=source_id,
                state=ConnectorState.CURRENT,
                payload=None,
                publication_state=publication_state,
                message=f"Normalized {len(records)} records.",
            ))
        except Exception as error:
            connectors.append(ConnectorResult(
                source_id=source_id,
                state=ConnectorState.FAILED,
                payload=None,
                publication_state=publication_state,
                message=str(error),
            ))
    return SourceBatchOutcome(
        batch_id=batch_id,
        records=tuple(public_records),
        quarantined_records=tuple(quarantined_records),
        connectors=tuple(connectors),
    )


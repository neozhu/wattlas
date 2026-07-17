from __future__ import annotations

from collections import Counter
from typing import Mapping

from grid_scope.source_catalog import SourceCatalog


def build_source_coverage_summary(
    catalog: SourceCatalog,
    *,
    connector_states: Mapping[str, str],
    published_records_by_source: Mapping[str, int],
) -> dict[str, object]:
    publication_counts = Counter(
        str(source.publication_state) for source in catalog.sources
    )
    access_counts = Counter(str(source.access_mode) for source in catalog.sources)
    connector_counts = Counter(connector_states.values())
    published = {
        source_id: int(count)
        for source_id, count in sorted(published_records_by_source.items())
        if int(count) >= 0
    }
    return {
        "sourceCount": len(catalog.sources),
        "sourcesByPublicationState": dict(sorted(publication_counts.items())),
        "sourcesByAccessMode": dict(sorted(access_counts.items())),
        "connectorStates": dict(sorted(connector_counts.items())),
        "publishedRecords": sum(published.values()),
        "publishedRecordsBySource": published,
    }


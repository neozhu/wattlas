from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from pydantic import ValidationError

from grid_scope.models import SourceCategory, SourceDescriptor


@dataclass(frozen=True)
class SourceCatalog:
    schema_version: str
    sources: tuple[SourceDescriptor, ...]

    def __post_init__(self) -> None:
        identifiers = [source.id for source in self.sources]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("source catalogue contains a duplicate source ID")

    @property
    def by_id(self) -> dict[str, SourceDescriptor]:
        return {source.id: source for source in self.sources}

    def for_country(self, country: str) -> tuple[SourceDescriptor, ...]:
        normalized = country.strip().upper()
        return tuple(
            source for source in self.sources if normalized in source.countries
        )

    def for_continent(self, continent: str) -> tuple[SourceDescriptor, ...]:
        normalized = continent.strip().casefold()
        return tuple(
            source
            for source in self.sources
            if any(value.casefold() == normalized for value in source.continents)
        )

    def for_category(
        self, category: SourceCategory | str
    ) -> tuple[SourceDescriptor, ...]:
        normalized = SourceCategory(category)
        return tuple(
            source for source in self.sources if normalized in source.categories
        )


def load_source_catalog(path: Path) -> SourceCatalog:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("source catalogue must be a JSON object")
    schema_version = payload.get("schemaVersion")
    raw_sources = payload.get("sources")
    if not isinstance(schema_version, str) or not schema_version.strip():
        raise ValueError("source catalogue requires a schema version")
    if not isinstance(raw_sources, list):
        raise ValueError("source catalogue requires a sources array")
    try:
        sources = tuple(SourceDescriptor.model_validate(item) for item in raw_sources)
    except ValidationError as error:
        raise ValueError(f"invalid source catalogue: {error}") from error
    return SourceCatalog(schema_version=schema_version, sources=sources)


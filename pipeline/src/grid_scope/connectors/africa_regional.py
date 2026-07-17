from __future__ import annotations

import math
from typing import Any


def _nonnegative(value: Any, *, label: str) -> float | None:
    if value in (None, ""):
        return None
    parsed = float(value)
    if not math.isfinite(parsed) or parsed < 0:
        raise ValueError(f"{label} must be finite and non-negative")
    return parsed


def normalize_regional_electricity_rows(
    rows: list[dict[str, Any]],
    *,
    source_id: str,
    publication_state: str,
) -> list[dict[str, Any]]:
    normalized: list[dict[str, Any]] = []
    for row in rows:
        geography_id = str(row.get("region_id") or "").strip()
        if not geography_id:
            continue
        year = int(row["year"])
        if not 1900 <= year <= 2031:
            raise ValueError("regional electricity year is out of range")
        demand = _nonnegative(row.get("demand_gwh"), label="demand")
        generation = _nonnegative(row.get("generation_gwh"), label="generation")
        if demand is None and generation is None:
            continue
        normalized.append({
            "geographyId": geography_id,
            "year": year,
            "demandGwh": demand,
            "generationGwh": generation,
            "sourceIds": [source_id],
            "methodId": f"{source_id}-regional-observation-v1",
            "valueKind": "observed",
            "publicationState": publication_state,
        })
    return sorted(normalized, key=lambda row: (row["geographyId"], row["year"]))


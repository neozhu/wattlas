from __future__ import annotations

import math
from typing import Any


def normalize_dre_regions(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row in rows:
        geography_id = str(row.get("admin1_id") or "").strip()
        if not geography_id:
            continue
        rate = float(row["electrification_rate"])
        population = int(row["settlement_population"])
        if not math.isfinite(rate) or not 0 <= rate <= 1 or population < 0:
            raise ValueError("DRE regional values are out of range")
        records.append({
            "geographyId": geography_id,
            "electrificationRate": rate,
            "settlementPopulation": population,
            "sourceIds": ["world-bank-dre-atlas"],
            "methodId": "world-bank-dre-atlas-v1",
            "valueKind": "reported",
            "publicationState": "quarantined",
        })
    return sorted(records, key=lambda record: record["geographyId"])


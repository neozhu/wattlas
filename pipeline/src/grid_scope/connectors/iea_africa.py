from __future__ import annotations

import math
from typing import Any


def aggregate_building_demand(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    totals_kwh: dict[str, float] = {}
    counts: dict[str, int] = {}
    for row in rows:
        geography_id = str(row.get("admin1_id") or "").strip()
        if not geography_id:
            continue
        value = float(row["annual_demand_kwh"])
        if not math.isfinite(value) or value < 0:
            raise ValueError("IEA building demand must be finite and non-negative")
        totals_kwh[geography_id] = totals_kwh.get(geography_id, 0.0) + value
        counts[geography_id] = counts.get(geography_id, 0) + 1
    return [
        {
            "geographyId": geography_id,
            "demandGwh": round(total / 1_000_000, 9),
            "buildingCount": counts[geography_id],
            "sourceIds": ["iea-building-demand-africa"],
            "methodId": "iea-building-demand-africa-v1",
            "valueKind": "estimated",
            "publicationState": "publishable",
        }
        for geography_id, total in sorted(totals_kwh.items())
    ]


def normalize_iea_catalogue(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for position, row in enumerate(rows):
        title = str(row.get("title") or "").strip()
        url = str(row.get("url") or "").strip()
        if not title or not url:
            continue
        records.append({
            "id": f"iea-africa-catalogue-{position + 1}",
            "recordType": "source_discovery",
            "title": title,
            "url": url,
            "country": row.get("country"),
            "licenceLabel": row.get("license"),
            "catalogueSourceId": "iea-africa-gis-catalogue",
            "publicationState": "quarantined",
        })
    return records


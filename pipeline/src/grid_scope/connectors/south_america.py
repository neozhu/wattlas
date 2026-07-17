from __future__ import annotations

from typing import Any


def _range(value: float) -> dict[str, float]:
    if value < 0:
        raise ValueError("power value cannot be negative")
    return {"low": value, "central": value, "high": value}


def normalize_official_power_rows(
    rows: list[dict[str, Any]], *, source_id: str
) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        identifier = str(row.get("id") or "").strip()
        name = str(row.get("name") or "").strip()
        country = str(row.get("country") or "").strip().upper()
        if not identifier or not name or len(country) != 2:
            continue
        if row.get("capacity_mw") is not None:
            capacity_mw = float(row["capacity_mw"])
            history: list[str] = []
        else:
            capacity_mw = float(row["capacity_kw"]) / 1000
            history = ["capacity_kw_to_mw"]
        records.append({
            "id": f"{source_id}-{identifier}",
            "name": name,
            "category": "power_generation",
            "technology": str(row.get("technology") or "other").casefold(),
            "lifecycle": str(row.get("status") or "announced").casefold(),
            "capacityMw": _range(capacity_mw),
            "country": country,
            "geographyId": "UNASSIGNED",
            "coordinates": [float(row["longitude"]), float(row["latitude"])],
            "locationPrecision": "exact",
            "sourceIds": [source_id],
            "sourceType": "official_verified",
            "externalIds": {source_id: identifier},
            "valueKind": "reported",
            "publicationState": "quarantined",
            "transformationHistory": history,
        })
    return records


def normalize_olade_controls(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        country = str(row.get("country_iso3") or "").strip().upper()
        if len(country) != 3:
            continue
        demand = float(row["demand_gwh"])
        generation = float(row["generation_gwh"])
        if demand < 0 or generation < 0:
            raise ValueError("OLADE controls cannot be negative")
        records.append({
            "recordType": "national_control",
            "countryIso3": country,
            "year": int(row["year"]),
            "demandGwh": demand,
            "generationGwh": generation,
            "sourceIds": ["olade-sielac"],
            "valueKind": "reported",
            "publicationState": "quarantined",
        })
    return records


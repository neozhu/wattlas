from __future__ import annotations

from typing import Any


def _range(value: float) -> dict[str, float]:
    if value < 0:
        raise ValueError("electricity values cannot be negative")
    return {"low": value, "central": value, "high": value}


def normalize_xm_demand(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        department = str(row.get("department") or "").strip()
        if not department:
            continue
        records.append({
            "regionName": department,
            "year": int(row["year"]),
            "demandGwh": float(row["demand_mwh"]) / 1000,
            "sourceIds": ["colombia-xm-simem"],
            "methodId": "xm-department-demand-v1",
            "valueKind": "observed",
            "publicationState": "quarantined",
            "transformationHistory": ["demand_mwh_to_gwh"],
        })
    return records


def normalize_ipse_zones(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        identifier = str(row.get("id") or "").strip()
        name = str(row.get("name") or "").strip()
        if not identifier or not name:
            continue
        capacity_mw = float(row["installed_capacity_kw"]) / 1000
        generation_gwh = float(row["generation_mwh"]) / 1000
        records.append({
            "id": f"colombia-ipse-{identifier}",
            "name": name,
            "category": "power_generation",
            "technology": "other",
            "lifecycle": "operational",
            "capacityMw": _range(capacity_mw),
            "annualGenerationGwh": _range(generation_gwh),
            "country": "CO",
            "subnationalUnit": row.get("department"),
            "geographyId": "UNASSIGNED",
            "coordinates": [float(row["longitude"]), float(row["latitude"])],
            "locationPrecision": "exact",
            "sourceIds": ["colombia-ipse"],
            "sourceType": "official_verified",
            "externalIds": {"ipse": identifier},
            "valueKind": "reported",
            "publicationState": "quarantined",
            "transformationHistory": ["capacity_kw_to_mw", "generation_mwh_to_gwh"],
        })
    return records


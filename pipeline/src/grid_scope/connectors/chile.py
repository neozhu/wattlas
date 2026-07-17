from __future__ import annotations

from typing import Any
import unicodedata


def _fold(value: Any) -> str:
    return "".join(
        character for character in unicodedata.normalize("NFKD", str(value or ""))
        if not unicodedata.combining(character)
    ).casefold()


def _range(value: Any) -> dict[str, float]:
    parsed = float(value)
    if parsed < 0:
        raise ValueError("energy values cannot be negative")
    return {"low": parsed, "central": parsed, "high": parsed}


def normalize_chile_generators(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        identifier = str(row.get("id") or "").strip()
        name = str(row.get("name") or "").strip()
        if not identifier or not name:
            continue
        technology_text = _fold(row.get("technology"))
        technology = (
            "wind" if "eolic" in technology_text else
            "solar" if "solar" in technology_text else
            "hydro" if "hidro" in technology_text else
            "gas" if "gas" in technology_text else
            "coal" if "carbon" in technology_text else "other"
        )
        status = _fold(row.get("status"))
        lifecycle = (
            "operational" if "operacion" in status else
            "under_construction" if "construccion" in status else
            "cancelled" if "retir" in status or "cancel" in status else "announced"
        )
        records.append({
            "id": f"chile-coordinador-{identifier}",
            "name": name,
            "category": "power_generation",
            "technology": technology,
            "lifecycle": lifecycle,
            "capacityMw": _range(row["capacity_mw"]),
            "annualGenerationGwh": _range(row["annual_generation_gwh"]) if row.get("annual_generation_gwh") is not None else None,
            "commissioningYear": int(row["commissioning_year"]) if row.get("commissioning_year") else None,
            "country": "CL",
            "geographyId": "UNASSIGNED",
            "coordinates": [float(row["longitude"]), float(row["latitude"])],
            "locationPrecision": "exact",
            "sourceIds": ["chile-coordinador"],
            "sourceType": "official_verified",
            "externalIds": {"coordinador": identifier},
            "valueKind": "reported",
            "publicationState": "quarantined",
        })
    return records


def normalize_sea_projects(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        identifier = str(row.get("id") or "").strip()
        name = str(row.get("name") or "").strip()
        if not identifier or not name:
            continue
        status = _fold(row.get("status"))
        lifecycle = "permitted" if "aprobad" in status else "planning_filed"
        records.append({
            "id": f"chile-sea-{identifier}",
            "name": name,
            "category": "water_infrastructure",
            "subtype": "desalination",
            "lifecycle": lifecycle,
            "reportedWaterCapacityLps": float(row["capacity_lps"]) if row.get("capacity_lps") is not None else None,
            "country": "CL",
            "geographyId": "UNASSIGNED",
            "coordinates": [float(row["longitude"]), float(row["latitude"])],
            "locationPrecision": "exact",
            "sourceIds": ["chile-sea-projects"],
            "sourceType": "official_verified",
            "externalIds": {"sea": identifier},
            "valueKind": "reported",
            "publicationState": "quarantined",
        })
    return records


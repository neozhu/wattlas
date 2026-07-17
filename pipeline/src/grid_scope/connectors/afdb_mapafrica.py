from __future__ import annotations

from typing import Any


def normalize_mapafrica_projects(payload: dict[str, Any]) -> list[dict[str, Any]]:
    features = payload.get("features")
    if not isinstance(features, list):
        raise ValueError("MapAfrica payload requires features")
    records: list[dict[str, Any]] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        properties = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates")
        name = str(properties.get("name") or "").strip()
        country = str(properties.get("country") or "").strip().upper()
        if (
            not name
            or len(country) != 2
            or geometry.get("type") != "Point"
            or not isinstance(coordinates, list)
            or len(coordinates) != 2
        ):
            continue
        project_id = str(feature.get("id") or properties.get("id") or name).strip()
        status = str(properties.get("status") or "").strip().casefold()
        lifecycle = {
            "completed": "operational",
            "ongoing": "under_construction",
            "approved": "permitted",
            "planned": "announced",
            "cancelled": "cancelled",
        }.get(status, "announced")
        record = {
            "id": f"afdb-mapafrica-{project_id}",
            "name": name,
            "category": "power_generation",
            "technology": "other",
            "country": country,
            "geographyId": "UNASSIGNED",
            "coordinates": coordinates,
            "locationPrecision": "exact",
            "lifecycle": lifecycle,
            "rawStatus": properties.get("status"),
            "approvalDate": properties.get("approval_date"),
            "completionDate": properties.get("completion_date"),
            "projectBudgetUsd": properties.get("budget_usd"),
            "sourceIds": ["afdb-mapafrica"],
            "sourceType": "official_verified",
            "sourceUrl": "https://mapafrica.afdb.org/",
            "valueKind": "reported",
            "publicationState": "quarantined",
            "externalIds": {"afdbMapAfrica": project_id},
        }
        records.append(record)
    return sorted(records, key=lambda record: record["id"])

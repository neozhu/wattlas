from __future__ import annotations

from typing import Any


def normalize_africa_grid(payload: dict[str, Any]) -> list[dict[str, Any]]:
    features = payload.get("features")
    if not isinstance(features, list):
        raise ValueError("Africa grid payload requires features")
    records: list[dict[str, Any]] = []
    for feature in features:
        if not isinstance(feature, dict):
            continue
        geometry = feature.get("geometry") or {}
        properties = feature.get("properties") or {}
        if geometry.get("type") not in {"LineString", "MultiLineString"}:
            continue
        record_id = str(feature.get("id") or properties.get("id") or "").strip()
        if not record_id:
            continue
        voltage = properties.get("voltage_kv")
        records.append({
            "id": f"world-bank-africa-grid-{record_id}",
            "country": str(properties.get("country") or "").upper() or None,
            "geometry": geometry,
            "voltageKv": float(voltage) if voltage not in (None, "") else None,
            "status": properties.get("status"),
            "sourceId": "world-bank-africa-electricity-grid",
            "valueKind": "reported",
            "publicationState": "quarantined",
        })
    return sorted(records, key=lambda record: record["id"])


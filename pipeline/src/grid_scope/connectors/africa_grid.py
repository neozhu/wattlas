from __future__ import annotations

import gzip
from hashlib import sha256
import json
from pathlib import Path
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
        identity = json.dumps(
            {"geometry": geometry, "properties": properties},
            sort_keys=True,
            ensure_ascii=False,
            separators=(",", ":"),
        )
        record_id = str(feature.get("id") or properties.get("id") or "").strip()
        if not record_id:
            record_id = sha256(identity.encode()).hexdigest()[:16]
        voltage = properties.get("voltage_kV", properties.get("voltage_kv"))
        records.append({
            "id": f"world-bank-africa-grid-{record_id}",
            "geometry": geometry,
            "sourceOperator": "World Bank / EnergyData.info",
            "sourceRecordId": record_id,
            "recordType": "topology",
            "market": str(properties.get("country") or "Africa and MENA"),
            "voltageKv": float(voltage) if voltage not in (None, "") else None,
            "status": properties.get("status"),
            "sourceId": "world-bank-africa-electricity-grid",
            "evidenceClass": "reported",
            "confidence": 65,
            "licence": "ODbL 1.0",
            "observedAt": "2018-11-14",
            "qualityFlags": [
                "dated_grid_context",
                "line_presence_is_not_connection_headroom",
                "coverage_varies_by_country",
            ],
            "native": dict(properties),
            "valueKind": "reported",
            "publicationState": "publishable",
        })
    return sorted(records, key=lambda record: record["id"])


def load_africa_grid(path: Path | str) -> dict[str, Any]:
    source_path = Path(path)
    if source_path.suffix == ".gz":
        with gzip.open(source_path, "rt", encoding="utf-8-sig") as source:
            text = source.read()
    else:
        text = source_path.read_text(encoding="utf-8-sig")
    marker = "\nSystem.IO.MemoryStream"
    if marker in text:
        text = text.split(marker, 1)[0]
    payload = json.loads(text)
    records = normalize_africa_grid(payload)
    shared_quality_flags = [
        "dated_grid_context",
        "line_presence_is_not_connection_headroom",
        "coverage_varies_by_country",
    ]
    return {
        "type": "FeatureCollection",
        "metadata": {
            "sourceId": "world-bank-africa-electricity-grid",
            "sourceOperator": "World Bank / EnergyData.info",
            "evidenceClass": "reported",
            "confidence": 65,
            "licence": "ODbL 1.0",
            "observedAt": "2018-11-14",
            "qualityFlags": shared_quality_flags,
            "nativePropertiesRetainedInManualSnapshot": True,
        },
        "features": [
            {
                "type": "Feature",
                "id": record["id"],
                "geometry": record["geometry"],
                # Repeated collection-level lineage and full native properties are
                # intentionally not duplicated across 62k public features. The
                # governed manual snapshot remains the lossless source artifact.
                "properties": {
                    "sourceRecordId": record["sourceRecordId"],
                    "recordType": record["recordType"],
                    "market": record["market"],
                    "voltageKv": record["voltageKv"],
                    "status": record["status"],
                    "qualityFlags": [],
                    "native": {},
                },
            }
            for record in records
        ],
    }

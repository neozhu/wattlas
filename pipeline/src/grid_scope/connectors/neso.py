from __future__ import annotations

import csv
import io


def _feature(properties: dict, row: dict[str, str]) -> dict:
    geometry = None
    if row.get("lat") and row.get("lon"):
        geometry = {"type": "Point", "coordinates": [float(row["lon"]), float(row["lat"])]}
    return {"type": "Feature", "id": properties["id"], "geometry": geometry, "properties": properties}


def parse_neso_tec(body: bytes, *, observed_at: str) -> list[dict]:
    output = []
    for row in csv.DictReader(io.StringIO(body.decode("utf-8-sig"))):
        source_id = row["project_id"]
        props = {"id": f"neso-tec-{source_id.lower()}", "sourceOperator": "NESO", "sourceRecordId": source_id, "recordType": "connection_queue", "market": "GB", "capacityValue": float(row["connected_mw"]), "capacityUnit": "MW", "status": row.get("status"), "evidenceClass": "reported", "confidence": 92, "licence": "NESO Open Licence", "observedAt": observed_at, "qualityFlags": ["queue_capacity_is_not_grid_headroom"], "native": {"project": row.get("project"), "connectionSite": row.get("connection_site"), "gate": row.get("gate")}}
        output.append(_feature(props, row))
    return output


def parse_neso_congestion(body: bytes, *, observed_at: str) -> list[dict]:
    output = []
    for row in csv.DictReader(io.StringIO(body.decode("utf-8-sig"))):
        source_id = row["boundary_id"]
        props = {"id": f"neso-congestion-{source_id.lower()}", "sourceOperator": "NESO", "sourceRecordId": source_id, "recordType": "congestion", "market": "GB", "capacityValue": float(row["limit_mw"]), "capacityUnit": "MW", "evidenceClass": "reported", "confidence": 90, "licence": "NESO Open Licence", "observedAt": observed_at, "qualityFlags": [], "native": {"boundary": row.get("boundary")}}
        output.append(_feature(props, row))
    return output

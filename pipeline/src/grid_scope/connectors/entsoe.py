from __future__ import annotations

import xml.etree.ElementTree as ET

from datetime import datetime

from grid_scope.connectors.base import ConnectorResult
from grid_scope.models import ConnectorState


def parse_entsoe_periods(body: bytes, *, observed_at: str) -> list[dict]:
    root = ET.fromstring(body)
    def child_text(node: ET.Element, suffix: str) -> str | None:
        found = next((item for item in node.iter() if item.tag.endswith(suffix)), None)
        return found.text if found is not None else None
    records = []
    for series in (node for node in root.iter() if node.tag.endswith("TimeSeries")):
        series_id = child_text(series, "mRID") or "unknown"
        business_type = child_text(series, "businessType")
        unit = child_text(series, "quantity_Measure_Unit.name") or "MW"
        unit = "MW" if unit == "MAW" else unit
        for point in (node for node in series.iter() if node.tag.endswith("Point")):
            quantity = child_text(point, "quantity")
            if quantity is None:
                continue
            position = child_text(point, "position") or "0"
            record_type = "transfer_capacity" if business_type == "A53" else "congestion"
            props = {"id": f"entsoe-{series_id}-{position}", "sourceOperator": "ENTSO-E", "sourceRecordId": f"{series_id}:{position}", "recordType": record_type, "market": "EU", "capacityValue": float(quantity), "capacityUnit": unit, "evidenceClass": "reported", "confidence": 85, "licence": "Dataset-specific ENTSO-E terms; redistribution review required", "observedAt": observed_at, "qualityFlags": ["coordinates_unavailable"], "native": {"businessType": business_type, "position": position, "start": child_text(series, "start")}}
            records.append({"type": "Feature", "id": props["id"], "geometry": None, "properties": props})
    return records


class EntsoeConnector:
    source_id = "entsoe"

    def __init__(self, token: str | None) -> None:
        self.token = token.strip() if token else None

    def fetch(self, *, now: datetime) -> ConnectorResult:
        if not self.token:
            return ConnectorResult(
                source_id=self.source_id,
                state=ConnectorState.NOT_CONFIGURED,
                payload=None,
                message="ENTSO-E security token is not configured.",
            )
        return ConnectorResult(
            source_id=self.source_id,
            state=ConnectorState.CACHED,
            payload=None,
            message="Token configured; zone queries run during scheduled refresh.",
        )

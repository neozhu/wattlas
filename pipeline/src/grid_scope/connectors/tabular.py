from __future__ import annotations

import csv
from io import StringIO
import json
from typing import Any


def parse_tabular_bytes(body: bytes, *, media_type: str) -> list[dict[str, Any]]:
    normalized = media_type.split(";", 1)[0].strip().lower()
    if normalized in {"application/json", "application/geo+json"} or normalized.endswith("+json"):
        payload = json.loads(body)
        if isinstance(payload, dict):
            rows = payload.get("records", payload.get("features"))
        else:
            rows = payload
        if not isinstance(rows, list) or any(not isinstance(row, dict) for row in rows):
            raise ValueError("JSON tabular source must contain an object row array")
        return rows
    if normalized in {"text/csv", "application/csv", "application/vnd.ms-excel", "text/plain"}:
        text = body.decode("utf-8-sig")
        return [dict(row) for row in csv.DictReader(StringIO(text))]
    raise ValueError(f"unsupported tabular media type: {media_type}")

